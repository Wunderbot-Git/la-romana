// Hole Score Repository - CRUD operations for individual hole scores

import { getPool } from '../config/database';
import { Pool, PoolClient } from 'pg';

export interface HoleScore {
    id: string;
    eventId: string;
    flightId: string;
    playerId: string;
    holeNumber: number;
    grossScore: number;
    mutationId: string;
    version: number;
    source: 'online' | 'offline';
    enteredByUserId: string;
    clientTimestamp: Date;
    serverTimestamp: Date;
}

export interface CreateHoleScoreInput {
    eventId: string;
    flightId: string;
    playerId: string;
    holeNumber: number;
    grossScore: number;
    mutationId: string;
    enteredByUserId: string;
    source?: 'online' | 'offline';
    clientTimestamp?: Date;
}

const mapRowToHoleScore = (row: any): HoleScore => ({
    id: row.id,
    eventId: row.event_id,
    flightId: row.flight_id,
    playerId: row.player_id,
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
 * Upsert a single hole score with idempotency via ON CONFLICT.
 * Accepts optional PoolClient for transactional use.
 */
export const upsertHoleScore = async (input: CreateHoleScoreInput, client?: PoolClient): Promise<{ score: HoleScore; wasCreated: boolean; previousValue?: number }> => {
    const db: Pool | PoolClient = client || getPool();
    const source = input.source || 'online';
    const clientTimestamp = input.clientTimestamp || new Date();

    // Check for existing score by mutation_id first (idempotency replay)
    const existingByMutation = await db.query(
        `SELECT * FROM hole_scores WHERE mutation_id = $1`,
        [input.mutationId]
    );

    if (existingByMutation.rows.length > 0) {
        return { score: mapRowToHoleScore(existingByMutation.rows[0]), wasCreated: false };
    }

    // Atomic upsert: INSERT or UPDATE on conflict of (event_id, player_id, hole_number)
    // We capture the previous gross_score via a CTE for audit purposes
    const res = await db.query(
        `WITH prev AS (
            SELECT id, gross_score FROM hole_scores
            WHERE event_id = $1 AND player_id = $3 AND hole_number = $4
        )
        INSERT INTO hole_scores (event_id, flight_id, player_id, hole_number, gross_score, mutation_id, version, source, entered_by_user_id, client_timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9)
        ON CONFLICT (event_id, player_id, hole_number)
        DO UPDATE SET
            gross_score = EXCLUDED.gross_score,
            mutation_id = EXCLUDED.mutation_id,
            version = hole_scores.version + 1,
            source = EXCLUDED.source,
            entered_by_user_id = EXCLUDED.entered_by_user_id,
            client_timestamp = EXCLUDED.client_timestamp,
            server_timestamp = NOW()
        RETURNING *,
            (SELECT gross_score FROM prev) AS _previous_gross_score,
            (xmax = 0) AS _was_created`,
        [input.eventId, input.flightId, input.playerId, input.holeNumber, input.grossScore, input.mutationId, source, input.enteredByUserId, clientTimestamp]
    );

    const row = res.rows[0];
    const wasCreated = row._was_created;
    const previousValue = row._previous_gross_score != null ? Number(row._previous_gross_score) : undefined;

    return { score: mapRowToHoleScore(row), wasCreated, previousValue };
};

/**
 * Batch upsert hole scores. Accepts optional PoolClient for transactional use.
 */
export const upsertHoleScoresBatch = async (inputs: CreateHoleScoreInput[], client?: PoolClient): Promise<{ scores: HoleScore[]; created: number; updated: number }> => {
    const results: HoleScore[] = [];
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
        const result = await upsertHoleScore(input, client);
        results.push(result.score);
        if (result.wasCreated) created++;
        else if (result.previousValue !== undefined) updated++;
    }

    return { scores: results, created, updated };
};

/**
 * Get all hole scores for a flight.
 */
export const getFlightHoleScores = async (flightId: string): Promise<HoleScore[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM hole_scores WHERE flight_id = $1 ORDER BY player_id, hole_number`,
        [flightId]
    );
    return res.rows.map(mapRowToHoleScore);
};

/**
 * Get hole scores for a specific player.
 */
export const getPlayerHoleScores = async (playerId: string): Promise<HoleScore[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM hole_scores WHERE player_id = $1 ORDER BY hole_number`,
        [playerId]
    );
    return res.rows.map(mapRowToHoleScore);
};

/**
 * Delete all hole scores for a flight.
 */
export const deleteFlightHoleScores = async (flightId: string): Promise<number> => {
    const pool = getPool();
    const res = await pool.query('DELETE FROM hole_scores WHERE flight_id = $1', [flightId]);
    return res.rowCount || 0;
};

/**
 * Delete hole scores for a specific hole in a flight.
 */
export const deleteHoleScoresForHole = async (flightId: string, holeNumber: number): Promise<number> => {
    const pool = getPool();
    const res = await pool.query(
        'DELETE FROM hole_scores WHERE flight_id = $1 AND hole_number = $2',
        [flightId, holeNumber]
    );
    return res.rowCount || 0;
};
