import { getPool } from '../config/database';
import { Pool, PoolClient } from 'pg';

export type GeneralBetType = 'tournament_winner' | 'flight_winner' | 'flight_sweep' | 'biggest_blowout' | 'any_halve' | 'early_close' | 'mvp' | 'worst_player' | 'exact_score';

export const VALID_BET_TYPES: GeneralBetType[] = [
    'tournament_winner', 'flight_winner', 'flight_sweep',
    'biggest_blowout', 'any_halve', 'early_close', 'mvp', 'worst_player', 'exact_score'
];

// Bet types no longer shown or accepted — kept in DB for historical data
export const REMOVED_BET_TYPES: GeneralBetType[] = [
    'flight_winner', 'flight_sweep', 'biggest_blowout', 'any_halve', 'early_close'
];

export interface GeneralBet {
    id: string;
    eventId: string;
    bettorId: string;
    betType: GeneralBetType;
    flightId: string | null;
    segmentType: string | null;
    pickedOutcome: string;
    timingFactor: number;
    partes: number;
    amount: number;
    comment: string | null;
    createdAt: Date;
}

const mapRow = (row: any): GeneralBet => ({
    id: row.id,
    eventId: row.event_id,
    bettorId: row.bettor_id,
    betType: row.bet_type,
    flightId: row.flight_id,
    segmentType: row.segment_type,
    pickedOutcome: row.picked_outcome,
    timingFactor: row.timing_factor,
    partes: row.partes,
    amount: parseFloat(row.amount),
    comment: row.comment,
    createdAt: row.created_at
});

export const createGeneralBet = async (bet: Omit<GeneralBet, 'id' | 'createdAt'>): Promise<GeneralBet> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO general_bets (
            event_id, bettor_id, bet_type, flight_id, segment_type,
            picked_outcome, timing_factor, partes, amount, comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
            bet.eventId, bet.bettorId, bet.betType, bet.flightId, bet.segmentType,
            bet.pickedOutcome, bet.timingFactor, bet.partes, bet.amount, bet.comment
        ]
    );
    return mapRow(res.rows[0]);
};

export const getGeneralBetsForEvent = async (eventId: string): Promise<GeneralBet[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM general_bets WHERE event_id = $1 ORDER BY bet_type, created_at ASC`,
        [eventId]
    );
    return res.rows.map(mapRow);
};

export const getUserGeneralBets = async (eventId: string, bettorId: string): Promise<GeneralBet[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM general_bets WHERE event_id = $1 AND bettor_id = $2 ORDER BY created_at ASC`,
        [eventId, bettorId]
    );
    return res.rows.map(mapRow);
};

export const getGeneralBetsByType = async (eventId: string, betType: GeneralBetType): Promise<GeneralBet[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM general_bets WHERE event_id = $1 AND bet_type = $2 ORDER BY created_at ASC`,
        [eventId, betType]
    );
    return res.rows.map(mapRow);
};

export const checkExistingBet = async (
    eventId: string, bettorId: string, betType: GeneralBetType,
    flightId: string | null, segmentType: string | null,
    client?: PoolClient
): Promise<GeneralBet | null> => {
    const db: Pool | PoolClient = client || getPool();
    const res = await db.query(
        `SELECT * FROM general_bets
         WHERE event_id = $1 AND bettor_id = $2 AND bet_type = $3
           AND COALESCE(flight_id, '00000000-0000-0000-0000-000000000000') = COALESCE($4::uuid, '00000000-0000-0000-0000-000000000000')
           AND COALESCE(segment_type, '__none__') = COALESCE($5, '__none__')
         FOR UPDATE`,
        [eventId, bettorId, betType, flightId, segmentType]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
};
