/**
 * Per-round tee override per player (introduced in migration 026).
 *
 * `players.tee_id` remains a single FK (player's "default" tee). For multi-course
 * events, the per-round override lives in `player_round_tees`. Reads (leaderboard,
 * playing-handicaps) check this junction first, then fall back to `players.tee_id`.
 */

import { getPool } from '../config/database';

export interface PlayerRoundTee {
    id: string;
    playerId: string;
    roundId: string;
    teeId: string;
    createdAt: string;
}

const mapRow = (r: any): PlayerRoundTee => ({
    id: r.id,
    playerId: r.player_id,
    roundId: r.round_id,
    teeId: r.tee_id,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
});

/** Upsert (player, round) → tee override. */
export const setPlayerRoundTee = async (
    playerId: string,
    roundId: string,
    teeId: string,
): Promise<PlayerRoundTee> => {
    const pool = getPool();
    const res = await pool.query(
        `INSERT INTO player_round_tees (player_id, round_id, tee_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (player_id, round_id)
            DO UPDATE SET tee_id = EXCLUDED.tee_id
         RETURNING *`,
        [playerId, roundId, teeId]
    );
    return mapRow(res.rows[0]);
};

/** Remove the override; falls back to legacy `players.tee_id`. */
export const clearPlayerRoundTee = async (
    playerId: string,
    roundId: string,
): Promise<boolean> => {
    const pool = getPool();
    const res = await pool.query(
        `DELETE FROM player_round_tees WHERE player_id = $1 AND round_id = $2`,
        [playerId, roundId]
    );
    return (res.rowCount ?? 0) > 0;
};

/** Map of playerId → teeId for one round (used in leaderboard + admin UI). */
export const getRoundTeeMap = async (roundId: string): Promise<Map<string, string>> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT player_id, tee_id FROM player_round_tees WHERE round_id = $1`,
        [roundId]
    );
    const map = new Map<string, string>();
    for (const r of res.rows) map.set(r.player_id, r.tee_id);
    return map;
};
