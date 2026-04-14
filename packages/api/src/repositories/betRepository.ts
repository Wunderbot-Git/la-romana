import { getPool } from '../config/database';

export interface Bet {
    id: string;
    eventId: string;
    flightId: string;
    segmentType: 'singles1' | 'singles2' | 'fourball' | 'scramble';
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
    createdAt: row.created_at
});

export const createBet = async (bet: Omit<Bet, 'id' | 'createdAt'>): Promise<Bet> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO bets (
            event_id, flight_id, segment_type, bettor_id, picked_outcome, 
            timing_factor, risk_factor, partes, amount, 
            score_at_bet, hole_at_bet, comment
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING *`,
        [
            bet.eventId, bet.flightId, bet.segmentType, bet.bettorId, bet.pickedOutcome,
            bet.timingFactor, bet.riskFactor, bet.partes, bet.amount,
            bet.scoreAtBet, bet.holeAtBet, bet.comment
        ]
    );
    return mapRowToBet(res.rows[0]);
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

export const getUserBetsForEvent = async (eventId: string, bettorId: string): Promise<Bet[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM bets WHERE event_id = $1 AND bettor_id = $2 ORDER BY created_at ASC`,
        [eventId, bettorId]
    );
    return res.rows.map(mapRowToBet);
};
