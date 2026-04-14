import { getPool } from '../config/database';
import { SidePot, SidePotType } from '@ryder-cup/shared';

const mapRow = (row: any): SidePot => ({
    id: row.id,
    roundId: row.round_id,
    type: row.type as SidePotType,
    holeNumber: row.hole_number,
    winningPlayerId: row.winning_player_id ?? null,
    createdAt: row.created_at.toISOString(),
});

export const createSidePot = async (params: {
    roundId: string;
    type: SidePotType;
    holeNumber: number;
}): Promise<SidePot> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO side_pots (round_id, type, hole_number) VALUES ($1, $2, $3) RETURNING *`,
        [params.roundId, params.type, params.holeNumber]
    );
    return mapRow(res.rows[0]);
};

export const listSidePotsForRound = async (roundId: string): Promise<SidePot[]> => {
    const pool = getPool();
    const res = await pool.query(
        'SELECT * FROM side_pots WHERE round_id = $1 ORDER BY type ASC, hole_number ASC',
        [roundId]
    );
    return res.rows.map(mapRow);
};

export const getSidePotById = async (id: string): Promise<SidePot | null> => {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM side_pots WHERE id = $1', [id]);
    return res.rows[0] ? mapRow(res.rows[0]) : null;
};

export const setSidePotWinner = async (
    id: string,
    winningPlayerId: string | null
): Promise<SidePot | null> => {
    const pool = getPool();
    const res = await pool.query(
        `UPDATE side_pots SET winning_player_id = $1 WHERE id = $2 RETURNING *`,
        [winningPlayerId, id]
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
};

export const deleteSidePot = async (id: string): Promise<boolean> => {
    const pool = getPool();
    const res = await pool.query('DELETE FROM side_pots WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
};
