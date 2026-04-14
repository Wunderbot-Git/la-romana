import { getPool } from '../config/database';
import { Round, RoundState } from '@ryder-cup/shared';

const mapRow = (row: any): Round => ({
    id: row.id,
    eventId: row.event_id,
    roundNumber: row.round_number,
    courseId: row.course_id,
    scheduledAt: row.scheduled_at ? row.scheduled_at.toISOString() : null,
    hcpSinglesPct: Number(row.hcp_singles_pct),
    hcpFourballPct: Number(row.hcp_fourball_pct),
    state: row.state as RoundState,
    createdAt: row.created_at.toISOString(),
});

export const createRound = async (params: {
    eventId: string;
    roundNumber: number;
    courseId: string;
    scheduledAt?: string | null;
    hcpSinglesPct?: number;
    hcpFourballPct?: number;
}): Promise<Round> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO rounds (event_id, round_number, course_id, scheduled_at, hcp_singles_pct, hcp_fourball_pct)
         VALUES ($1, $2, $3, $4, COALESCE($5, 0.80), COALESCE($6, 0.80))
         RETURNING *`,
        [
            params.eventId,
            params.roundNumber,
            params.courseId,
            params.scheduledAt ?? null,
            params.hcpSinglesPct ?? null,
            params.hcpFourballPct ?? null,
        ]
    );
    return mapRow(res.rows[0]);
};

export const listRoundsForEvent = async (eventId: string): Promise<Round[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM rounds WHERE event_id = $1 ORDER BY round_number ASC',
        [eventId]
    );
    return res.rows.map(mapRow);
};

export const getRoundById = async (roundId: string): Promise<Round | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM rounds WHERE id = $1', [roundId]);
    return res.rows[0] ? mapRow(res.rows[0]) : null;
};

export const updateRound = async (
    roundId: string,
    updates: {
        courseId?: string;
        scheduledAt?: string | null;
        hcpSinglesPct?: number;
        hcpFourballPct?: number;
        state?: RoundState;
    }
): Promise<Round | null> => {
    const pool = getPool();
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (updates.courseId !== undefined) {
        sets.push(`course_id = $${i++}`);
        values.push(updates.courseId);
    }
    if (updates.scheduledAt !== undefined) {
        sets.push(`scheduled_at = $${i++}`);
        values.push(updates.scheduledAt);
    }
    if (updates.hcpSinglesPct !== undefined) {
        sets.push(`hcp_singles_pct = $${i++}`);
        values.push(updates.hcpSinglesPct);
    }
    if (updates.hcpFourballPct !== undefined) {
        sets.push(`hcp_fourball_pct = $${i++}`);
        values.push(updates.hcpFourballPct);
    }
    if (updates.state !== undefined) {
        sets.push(`state = $${i++}`);
        values.push(updates.state);
    }
    if (sets.length === 0) return await getRoundById(roundId);

    values.push(roundId);
    const res = await pool.query(
        `UPDATE rounds SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        values
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
};

export const deleteRound = async (roundId: string): Promise<boolean> => {
    const pool = getPool();
    const res = await pool.query('DELETE FROM rounds WHERE id = $1', [roundId]);
    return (res.rowCount ?? 0) > 0;
};
