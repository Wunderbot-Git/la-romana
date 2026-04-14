// Hole Score Repository — CRUD for per-player 18-hole scores, scoped to a round.

import { getPool } from '../config/database';
import { Pool, PoolClient } from 'pg';

export interface HoleScore {
    id: string;
    eventId: string;
    roundId: string;
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
    roundId: string;
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
    roundId: row.round_id,
    flightId: row.flight_id,
    playerId: row.player_id,
    holeNumber: row.hole_number,
    grossScore: row.gross_score,
    mutationId: row.mutation_id,
    version: row.version,
    source: row.source,
    enteredByUserId: row.entered_by_user_id,
    clientTimestamp: row.client_timestamp,
    serverTimestamp: row.server_timestamp,
});

export const upsertHoleScore = async (
    input: CreateHoleScoreInput,
    client?: PoolClient
): Promise<{ score: HoleScore; wasCreated: boolean; previousValue?: number }> => {
    const db: Pool | PoolClient = client || getPool();
    const source = input.source || 'online';
    const clientTimestamp = input.clientTimestamp || new Date();

    // Idempotency: return existing row if mutation_id already seen
    const existingByMutation = await db.query(
        `SELECT * FROM hole_scores WHERE mutation_id = $1`,
        [input.mutationId]
    );
    if (existingByMutation.rows.length > 0) {
        return { score: mapRowToHoleScore(existingByMutation.rows[0]), wasCreated: false };
    }

    // Upsert on the round-scoped uniqueness (round_id, player_id, hole_number)
    const res = await db.query(
        `WITH prev AS (
            SELECT id, gross_score FROM hole_scores
            WHERE round_id = $1 AND player_id = $3 AND hole_number = $4
        )
        INSERT INTO hole_scores
            (event_id, round_id, flight_id, player_id, hole_number, gross_score,
             mutation_id, version, source, entered_by_user_id, client_timestamp)
        VALUES ($9, $1, $2, $3, $4, $5, $6, 1, $7, $8, $10)
        ON CONFLICT (round_id, player_id, hole_number)
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
        [
            input.roundId,      // $1
            input.flightId,     // $2
            input.playerId,     // $3
            input.holeNumber,   // $4
            input.grossScore,   // $5
            input.mutationId,   // $6
            source,             // $7
            input.enteredByUserId, // $8
            input.eventId,      // $9
            clientTimestamp,    // $10
        ]
    );

    const row = res.rows[0];
    const wasCreated = row._was_created;
    const previousValue = row._previous_gross_score != null ? Number(row._previous_gross_score) : undefined;

    return { score: mapRowToHoleScore(row), wasCreated, previousValue };
};

export const upsertHoleScoresBatch = async (
    inputs: CreateHoleScoreInput[],
    client?: PoolClient
): Promise<{ scores: HoleScore[]; created: number; updated: number }> => {
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

export const getFlightHoleScores = async (flightId: string): Promise<HoleScore[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM hole_scores WHERE flight_id = $1 ORDER BY player_id, hole_number`,
        [flightId]
    );
    return res.rows.map(mapRowToHoleScore);
};

export const getRoundHoleScores = async (roundId: string): Promise<HoleScore[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM hole_scores WHERE round_id = $1 ORDER BY flight_id, player_id, hole_number`,
        [roundId]
    );
    return res.rows.map(mapRowToHoleScore);
};

export const getPlayerHoleScores = async (playerId: string): Promise<HoleScore[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM hole_scores WHERE player_id = $1 ORDER BY round_id, hole_number`,
        [playerId]
    );
    return res.rows.map(mapRowToHoleScore);
};

export const getPlayerRoundHoleScores = async (
    playerId: string,
    roundId: string
): Promise<HoleScore[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM hole_scores WHERE player_id = $1 AND round_id = $2 ORDER BY hole_number`,
        [playerId, roundId]
    );
    return res.rows.map(mapRowToHoleScore);
};

export const deleteFlightHoleScores = async (flightId: string): Promise<number> => {
    const pool = getPool();
    const res = await pool.query('DELETE FROM hole_scores WHERE flight_id = $1', [flightId]);
    return res.rowCount || 0;
};

export const deleteHoleScoresForHole = async (
    flightId: string,
    holeNumber: number
): Promise<number> => {
    const pool = getPool();
    const res = await pool.query(
        'DELETE FROM hole_scores WHERE flight_id = $1 AND hole_number = $2',
        [flightId, holeNumber]
    );
    return res.rowCount || 0;
};
