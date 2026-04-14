// Scramble Score Repository - CRUD for team scramble scores (back 9)

import { getPool } from '../config/database';
import { Pool, PoolClient } from 'pg';

export interface ScrambleScore {
    id: string;
    eventId: string;
    flightId: string;
    team: 'red' | 'blue';
    holeNumber: number; // 10-18
    grossScore: number;
    mutationId: string;
    version: number;
    source: 'online' | 'offline';
    enteredByUserId: string;
    clientTimestamp: Date;
    serverTimestamp: Date;
}

export interface CreateScrambleScoreInput {
    eventId: string;
    flightId: string;
    team: 'red' | 'blue';
    holeNumber: number; // Must be 10-18
    grossScore: number;
    mutationId: string;
    enteredByUserId: string;
    source?: 'online' | 'offline';
    clientTimestamp?: Date;
}

const mapRowToScrambleScore = (row: any): ScrambleScore => ({
    id: row.id,
    eventId: row.event_id,
    flightId: row.flight_id,
    team: row.team,
    holeNumber: row.hole_number,
    grossScore: row.gross_score,
    mutationId: row.mutation_id,
    version: row.version,
    source: row.source,
    enteredByUserId: row.entered_by_user_id,
    clientTimestamp: row.client_timestamp,
    serverTimestamp: row.server_timestamp
});

/**
 * Upsert a scramble score with idempotency via ON CONFLICT.
 * Accepts optional PoolClient for transactional use.
 */
export const upsertScrambleScore = async (input: CreateScrambleScoreInput, client?: PoolClient): Promise<{ score: ScrambleScore; wasCreated: boolean; previousValue?: number }> => {
    if (input.holeNumber < 10 || input.holeNumber > 18) {
        throw new Error('Scramble scores must be for holes 10-18');
    }

    const db: Pool | PoolClient = client || getPool();
    const source = input.source || 'online';
    const clientTimestamp = input.clientTimestamp || new Date();

    // Check idempotency by mutation_id (replay-safe)
    const existingByMutation = await db.query(
        `SELECT * FROM scramble_team_scores WHERE mutation_id = $1`,
        [input.mutationId]
    );

    if (existingByMutation.rows.length > 0) {
        return { score: mapRowToScrambleScore(existingByMutation.rows[0]), wasCreated: false };
    }

    // Atomic upsert on unique constraint (event_id, flight_id, team, hole_number)
    const res = await db.query(
        `WITH prev AS (
            SELECT id, gross_score FROM scramble_team_scores
            WHERE event_id = $1 AND flight_id = $2 AND team = $3 AND hole_number = $4
        )
        INSERT INTO scramble_team_scores (event_id, flight_id, team, hole_number, gross_score, mutation_id, version, source, entered_by_user_id, client_timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9)
        ON CONFLICT (event_id, flight_id, team, hole_number)
        DO UPDATE SET
            gross_score = EXCLUDED.gross_score,
            mutation_id = EXCLUDED.mutation_id,
            version = scramble_team_scores.version + 1,
            source = EXCLUDED.source,
            entered_by_user_id = EXCLUDED.entered_by_user_id,
            client_timestamp = EXCLUDED.client_timestamp,
            server_timestamp = NOW()
        RETURNING *,
            (SELECT gross_score FROM prev) AS _previous_gross_score,
            (xmax = 0) AS _was_created`,
        [input.eventId, input.flightId, input.team, input.holeNumber, input.grossScore, input.mutationId, source, input.enteredByUserId, clientTimestamp]
    );

    const row = res.rows[0];
    const wasCreated = row._was_created;
    const previousValue = row._previous_gross_score != null ? Number(row._previous_gross_score) : undefined;

    return { score: mapRowToScrambleScore(row), wasCreated, previousValue };
};

/**
 * Batch upsert scramble scores. Accepts optional PoolClient for transactional use.
 */
export const upsertScrambleScoresBatch = async (inputs: CreateScrambleScoreInput[], client?: PoolClient): Promise<{ scores: ScrambleScore[]; created: number; updated: number }> => {
    const results: ScrambleScore[] = [];
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
        const result = await upsertScrambleScore(input, client);
        results.push(result.score);
        if (result.wasCreated) created++;
        else if (result.previousValue !== undefined) updated++;
    }

    return { scores: results, created, updated };
};

/**
 * Get all scramble scores for a flight.
 */
export const getFlightScrambleScores = async (flightId: string): Promise<ScrambleScore[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM scramble_team_scores WHERE flight_id = $1 ORDER BY team, hole_number`,
        [flightId]
    );
    return res.rows.map(mapRowToScrambleScore);
};

/**
 * Delete all scramble scores for a flight.
 */
export const deleteFlightScrambleScores = async (flightId: string): Promise<number> => {
    const pool = getPool();
    const res = await pool.query('DELETE FROM scramble_team_scores WHERE flight_id = $1', [flightId]);
    return res.rowCount || 0;
};

/**
 * Delete scramble scores for a specific hole in a flight.
 */
export const deleteScrambleScoresForHole = async (flightId: string, holeNumber: number): Promise<number> => {
    const pool = getPool();
    const res = await pool.query(
        'DELETE FROM scramble_team_scores WHERE flight_id = $1 AND hole_number = $2',
        [flightId, holeNumber]
    );
    return res.rowCount || 0;
};
