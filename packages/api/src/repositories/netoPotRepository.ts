import { getPool } from '../config/database';
import { NetoPot, NetoPotWinner } from '@ryder-cup/shared';

const mapPotRow = (row: any, winners: NetoPotWinner[]): NetoPot => ({
    id: row.id,
    roundId: row.round_id,
    flightId: row.flight_id,
    potAmountUsd: row.pot_amount_usd,
    createdAt: row.created_at.toISOString(),
    winners,
});

const mapWinnerRow = (row: any): NetoPotWinner => ({
    id: row.id,
    potId: row.pot_id,
    playerId: row.player_id,
    rank: row.rank as 1 | 2,
});

export const createPot = async (params: {
    roundId: string;
    flightId: string;
    potAmountUsd: number;
}): Promise<NetoPot> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO neto_pots (round_id, flight_id, pot_amount_usd)
         VALUES ($1, $2, $3)
         ON CONFLICT (round_id, flight_id) DO UPDATE SET pot_amount_usd = EXCLUDED.pot_amount_usd
         RETURNING *`,
        [params.roundId, params.flightId, params.potAmountUsd]
    );
    return mapPotRow(res.rows[0], []);
};

export const listPotsForRound = async (roundId: string): Promise<NetoPot[]> => {
    const pool = getPool();
    const potsRes = await pool.query(
        'SELECT * FROM neto_pots WHERE round_id = $1 ORDER BY created_at ASC',
        [roundId]
    );
    if (potsRes.rows.length === 0) return [];

    const potIds = potsRes.rows.map(r => r.id);
    const winnersRes = await pool.query(
        'SELECT * FROM neto_pot_winners WHERE pot_id = ANY($1::uuid[]) ORDER BY rank ASC',
        [potIds]
    );
    const winnersByPot = new Map<string, NetoPotWinner[]>();
    for (const row of winnersRes.rows) {
        const list = winnersByPot.get(row.pot_id) ?? [];
        list.push(mapWinnerRow(row));
        winnersByPot.set(row.pot_id, list);
    }

    return potsRes.rows.map(row => mapPotRow(row, winnersByPot.get(row.id) ?? []));
};

export const getPotById = async (potId: string): Promise<NetoPot | null> => {
    const pool = getPool();
    const potRes = await pool.query('SELECT * FROM neto_pots WHERE id = $1', [potId]);
    if (potRes.rows.length === 0) return null;
    const winnersRes = await pool.query(
        'SELECT * FROM neto_pot_winners WHERE pot_id = $1 ORDER BY rank ASC',
        [potId]
    );
    return mapPotRow(potRes.rows[0], winnersRes.rows.map(mapWinnerRow));
};

export const setPotWinners = async (
    potId: string,
    winners: { playerId: string; rank: 1 | 2 }[]
): Promise<NetoPotWinner[]> => {
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM neto_pot_winners WHERE pot_id = $1', [potId]);
        const inserted: NetoPotWinner[] = [];
        for (const w of winners) {
            const res = await client.query(
                `INSERT INTO neto_pot_winners (pot_id, player_id, rank) VALUES ($1, $2, $3) RETURNING *`,
                [potId, w.playerId, w.rank]
            );
            inserted.push(mapWinnerRow(res.rows[0]));
        }
        await client.query('COMMIT');
        return inserted;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};
