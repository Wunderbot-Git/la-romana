import { getPool } from '../config/database';
import { MixedScrambleSI } from '@ryder-cup/shared';

// Uses mixed_scramble_stroke_index table:
// event_id, hole_number, stroke_index
// PK: (event_id, hole_number)

export const setScrambleSIBatch = async (eventId: string, indexes: { holeNumber: number; strokeIndex: number }[]): Promise<void> => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const idx of indexes) {
            await client.query(
                `INSERT INTO mixed_scramble_stroke_index (event_id, hole_number, stroke_index)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (event_id, hole_number)
                 DO UPDATE SET stroke_index = EXCLUDED.stroke_index`,
                [eventId, idx.holeNumber, idx.strokeIndex]
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

export const getScrambleSI = async (eventId: string): Promise<MixedScrambleSI[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM mixed_scramble_stroke_index WHERE event_id = $1 ORDER BY hole_number ASC',
        [eventId]
    );

    return res.rows.map(row => ({
        id: row.id,
        eventId: row.event_id,
        holeNumber: row.hole_number,
        strokeIndex: row.stroke_index
    }));
};
