import { getPool } from '../config/database';
import { HoleOverride } from '@ryder-cup/shared';

// Uses hole_overrides table: 
// event_id, hole_id, new_stroke_index
// PK: (event_id, hole_id)

export const setOverride = async (eventId: string, holeId: string, newStrokeIndex: number): Promise<HoleOverride> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO hole_overrides (event_id, hole_id, new_stroke_index)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, hole_id)
         DO UPDATE SET new_stroke_index = EXCLUDED.new_stroke_index, updated_at = NOW()
         RETURNING *`,
        [eventId, holeId, newStrokeIndex]
    );

    const row = res.rows[0];
    return {
        id: row.id,
        eventId: row.event_id,
        holeId: row.hole_id,
        newStrokeIndex: row.new_stroke_index
    };
};

export const getOverridesForEvent = async (eventId: string): Promise<HoleOverride[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM hole_overrides WHERE event_id = $1',
        [eventId]
    );

    return res.rows.map(row => ({
        id: row.id,
        eventId: row.event_id,
        holeId: row.hole_id,
        newStrokeIndex: row.new_stroke_index
    }));
};

// Batch set for transaction efficiency
export const setOverridesBatch = async (eventId: string, overrides: { holeId: string; strokeIndex: number }[]): Promise<void> => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Potential optimization: Delete all for event and re-insert, or upsert loop.
        // Given typically 18 overrides, loop is fine.
        for (const o of overrides) {
            await client.query(
                `INSERT INTO hole_overrides (event_id, hole_id, new_stroke_index)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (event_id, hole_id)
                 DO UPDATE SET new_stroke_index = EXCLUDED.new_stroke_index, updated_at = NOW()`,
                [eventId, o.holeId, o.strokeIndex]
            );
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};
