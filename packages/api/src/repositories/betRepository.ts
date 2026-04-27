import { getPool } from '../config/database';

/**
 * La Romana 2026 betting model.
 * One match bet per (round, flight, segment, bettor) — must be placed BEFORE
 * any hole is scored for that flight in that round.
 *
 * `timingFactor` / `riskFactor` / `partes` are kept in the schema (Bogotá
 * heritage) but always = 1 for La Romana — pots split equally among winners.
 * `scoreAtBet` / `holeAtBet` / `isAdditional` are unused and stored as
 * `null` / `false`.
 */
export interface Bet {
    id: string;
    eventId: string;
    roundId: string;
    flightId: string;
    segmentType: 'singles1' | 'singles2' | 'fourball';
    bettorId: string;
    pickedOutcome: 'A' | 'B' | 'AS';
    timingFactor: number;
    riskFactor: number;
    partes: number;
    amount: number;
    scoreAtBet: number | null;
    holeAtBet: number | null;
    comment: string | null;
    isAdditional: boolean;
    createdAt: Date;
}

const mapRowToBet = (row: any): Bet => ({
    id: row.id,
    eventId: row.event_id,
    roundId: row.round_id,
    flightId: row.flight_id,
    segmentType: row.segment_type,
    bettorId: row.bettor_id,
    pickedOutcome: row.picked_outcome,
    timingFactor: row.timing_factor,
    riskFactor: row.risk_factor,
    partes: row.partes,
    amount: parseFloat(row.amount),
    scoreAtBet: row.score_at_bet,
    holeAtBet: row.hole_at_bet,
    comment: row.comment,
    isAdditional: row.is_additional || false,
    createdAt: row.created_at,
});

export const createBet = async (bet: Omit<Bet, 'id' | 'createdAt'>): Promise<Bet> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO bets (
            event_id, round_id, flight_id, segment_type, bettor_id, picked_outcome,
            timing_factor, risk_factor, partes, amount,
            score_at_bet, hole_at_bet, comment
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *`,
        [
            bet.eventId, bet.roundId, bet.flightId, bet.segmentType, bet.bettorId, bet.pickedOutcome,
            bet.timingFactor, bet.riskFactor, bet.partes, bet.amount,
            bet.scoreAtBet, bet.holeAtBet, bet.comment,
        ]
    );
    return mapRowToBet(res.rows[0]);
};

export const deleteBet = async (id: string): Promise<void> => {
    const pool = getPool();
    await pool.query(`DELETE FROM bets WHERE id = $1`, [id]);
};

export const getBetsForFlight = async (flightId: string): Promise<Bet[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM bets WHERE flight_id = $1 ORDER BY created_at ASC`,
        [flightId]
    );
    return res.rows.map(mapRowToBet);
};

export const getBetsForEvent = async (eventId: string): Promise<Bet[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM bets WHERE event_id = $1 ORDER BY created_at ASC`,
        [eventId]
    );
    return res.rows.map(mapRowToBet);
};

export const getBetsForRound = async (roundId: string): Promise<Bet[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM bets WHERE round_id = $1 ORDER BY created_at ASC`,
        [roundId]
    );
    return res.rows.map(mapRowToBet);
};

export const getUserBetsForEvent = async (eventId: string, bettorId: string): Promise<Bet[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM bets WHERE event_id = $1 AND bettor_id = $2 ORDER BY created_at ASC`,
        [eventId, bettorId]
    );
    return res.rows.map(mapRowToBet);
};

/**
 * Returns the existing bet for this (round, flight, segment, bettor) tuple, or null.
 * Used to prevent duplicate bets and to support replacement before lock.
 */
export const getExistingMatchBet = async (
    roundId: string,
    flightId: string,
    segmentType: string,
    bettorId: string,
): Promise<Bet | null> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM bets
         WHERE round_id = $1 AND flight_id = $2 AND segment_type = $3 AND bettor_id = $4
         LIMIT 1`,
        [roundId, flightId, segmentType, bettorId]
    );
    return res.rows.length > 0 ? mapRowToBet(res.rows[0]) : null;
};
