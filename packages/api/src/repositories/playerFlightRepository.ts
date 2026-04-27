/**
 * Per-round flight assignment (introduced in migration 025).
 *
 * Each player can be in a different flight per round; the junction table
 * `player_flights` keys on (round_id, player_id) and (flight_id, team, position).
 *
 * Reads in the leaderboard service must use these rows; writes from the admin
 * compose-flights UI go through `assignPlayer` / `unassignPlayer`.
 */

import { getPool } from '../config/database';
import { PlayerFlight } from '@ryder-cup/shared';

interface AssignInput {
    playerId: string;
    roundId: string;
    flightId: string;
    team: 'red' | 'blue';
    position: 1 | 2;
}

const mapRow = (r: any): PlayerFlight => ({
    id: r.id,
    playerId: r.player_id,
    roundId: r.round_id,
    flightId: r.flight_id,
    team: r.team,
    position: r.position,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at,
});

/**
 * Upsert a per-round flight assignment.
 *
 * Conflict resolution:
 *   - If THIS player already has an assignment in THIS round (different flight or slot),
 *     it is replaced (one player per round).
 *   - If the target (flight, team, position) slot is already filled by ANOTHER player,
 *     that other player's row in this round is removed first (slot is single-occupancy).
 */
export const assignPlayer = async (input: AssignInput): Promise<PlayerFlight> => {
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Free up the target slot if held by someone else
        await client.query(
            `DELETE FROM player_flights
              WHERE flight_id = $1 AND team = $2 AND position = $3 AND player_id <> $4`,
            [input.flightId, input.team, input.position, input.playerId]
        );

        // Remove any prior assignment THIS player had in this round (different slot)
        await client.query(
            `DELETE FROM player_flights WHERE round_id = $1 AND player_id = $2`,
            [input.roundId, input.playerId]
        );

        const ins = await client.query(
            `INSERT INTO player_flights (player_id, round_id, flight_id, team, position)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [input.playerId, input.roundId, input.flightId, input.team, input.position]
        );

        await client.query('COMMIT');
        return mapRow(ins.rows[0]);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/** Remove a player's assignment in a given round (no-op if none). */
export const unassignPlayer = async (
    playerId: string,
    roundId: string
): Promise<boolean> => {
    const pool = getPool();
    const res = await pool.query(
        `DELETE FROM player_flights WHERE round_id = $1 AND player_id = $2`,
        [roundId, playerId]
    );
    return (res.rowCount ?? 0) > 0;
};

/** All assignments for a single round (across all flights of that round). */
export const getRoundAssignments = async (roundId: string): Promise<PlayerFlight[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM player_flights WHERE round_id = $1`,
        [roundId]
    );
    return res.rows.map(mapRow);
};

/** All assignments for a single flight (typically 4 rows: 2 red + 2 blue). */
export const getFlightAssignments = async (flightId: string): Promise<PlayerFlight[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM player_flights WHERE flight_id = $1
         ORDER BY team ASC, position ASC`,
        [flightId]
    );
    return res.rows.map(mapRow);
};

/** Bulk fetch for an event: all assignments across all rounds of all the event's flights. */
export const getEventAssignments = async (eventId: string): Promise<PlayerFlight[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT pf.*
           FROM player_flights pf
           JOIN flights f ON f.id = pf.flight_id
          WHERE f.event_id = $1`,
        [eventId]
    );
    return res.rows.map(mapRow);
};
