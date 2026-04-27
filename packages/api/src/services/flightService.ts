import {
    CreateFlightsRequest,
    AssignPlayerRequest,
    Flight,
    FlightWithPlayers,
    RoundState,
} from '@ryder-cup/shared';
import * as flightRepository from '../repositories/flightRepository';
import * as eventRepository from '../repositories/eventRepository';
import * as playerRepository from '../repositories/playerRepository';
import { getPool } from '../config/database';
import { computePlayingHandicapFromIndex } from '../scoring/handicap';

export const createFlights = async (
    eventId: string,
    input: CreateFlightsRequest
): Promise<Flight[]> => {
    const event = await eventRepository.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    if (!input.roundId) throw new Error('roundId is required');
    // Verify round belongs to event
    const pool = getPool();
    const roundCheck = await pool.query(
        `SELECT id FROM rounds WHERE id = $1 AND event_id = $2`,
        [input.roundId, eventId]
    );
    if (roundCheck.rowCount === 0) throw new Error('Round not found for this event');

    const created: Flight[] = [];
    const currentFlights = await flightRepository.getFlightsByRoundId(input.roundId);
    let nextNum = currentFlights.length + 1;

    for (let i = 0; i < input.count; i++) {
        created.push(await flightRepository.createFlight(eventId, input.roundId, nextNum++));
    }
    return created;
};

export const getEventFlightsDetails = async (eventId: string): Promise<FlightWithPlayers[]> => {
    const flights = await flightRepository.getFlightsByEventId(eventId);
    const players = await playerRepository.getPlayersByEventId(eventId);

    return flights.map(f => ({
        ...f,
        players: players.filter(p => p.flightId === f.id),
    }));
};

export const getRoundFlightsDetails = async (roundId: string): Promise<FlightWithPlayers[]> => {
    const flights = await flightRepository.getFlightsByRoundId(roundId);
    const flightIds = flights.map(f => f.id);
    if (flightIds.length === 0) return [];

    const pool = getPool();

    // Round context for PH calc — allowance + which course the round is on.
    const roundRes = await pool.query(
        `SELECT id, course_id, hcp_singles_pct, hcp_fourball_pct
         FROM rounds WHERE id = $1`,
        [roundId],
    );
    const round = roundRes.rows[0];
    const singlesPct = round ? parseFloat(round.hcp_singles_pct) : 0.8;
    const fourballPct = round ? parseFloat(round.hcp_fourball_pct) : 0.8;
    const courseId = round?.course_id ?? null;

    // Course tee → slope/rating/par map for this round's course (used for USGA Course HCP).
    const teeRatings = new Map<string, { slope: number | null; rating: number | null; par: number | null }>();
    if (courseId) {
        const teesRes = await pool.query(
            `SELECT t.id, t.slope_rating, t.course_rating,
                    (SELECT SUM(par) FROM holes WHERE tee_id = t.id) AS par_total
             FROM tees t
             WHERE t.course_id = $1`,
            [courseId],
        );
        for (const t of teesRes.rows as { id: string; slope_rating: any; course_rating: any; par_total: any }[]) {
            teeRatings.set(t.id, {
                slope: t.slope_rating !== null ? parseFloat(t.slope_rating) : null,
                rating: t.course_rating !== null ? parseFloat(t.course_rating) : null,
                par: t.par_total !== null ? parseInt(t.par_total, 10) : null,
            });
        }
    }

    // Per-round tee overrides (migration 026).
    const teeOverrideRes = await pool.query(
        `SELECT player_id, tee_id FROM player_round_tees WHERE round_id = $1`,
        [roundId],
    );
    const teeByPlayer = new Map<string, string>();
    for (const r of teeOverrideRes.rows as { player_id: string; tee_id: string }[]) {
        teeByPlayer.set(r.player_id, r.tee_id);
    }

    // Per-round flight assignments (player_flights junction, migration 025).
    const playersRes = await pool.query(
        `SELECT
            p.*,
            pf.flight_id   AS pf_flight_id,
            pf.team        AS pf_team,
            pf.position    AS pf_position
         FROM player_flights pf
         JOIN players p ON p.id = pf.player_id
         WHERE pf.flight_id = ANY($1::uuid[])`,
        [flightIds],
    );
    const rows = playersRes.rows;

    return flights.map(f => ({
        ...f,
        players: rows
            .filter((p: any) => p.pf_flight_id === f.id)
            .map((p: any) => {
                const effectiveTeeId = teeByPlayer.get(p.id) ?? p.tee_id ?? null;
                const tee = effectiveTeeId ? teeRatings.get(effectiveTeeId) : null;
                const phSingles = computePlayingHandicapFromIndex({
                    handicapIndex: parseFloat(p.handicap_index),
                    slope: tee?.slope ?? null,
                    rating: tee?.rating ?? null,
                    par: tee?.par ?? null,
                    allowance: singlesPct,
                }).playingHandicap;
                const phFourball = computePlayingHandicapFromIndex({
                    handicapIndex: parseFloat(p.handicap_index),
                    slope: tee?.slope ?? null,
                    rating: tee?.rating ?? null,
                    par: tee?.par ?? null,
                    allowance: fourballPct,
                }).playingHandicap;
                return {
                    // camelCase mapping for frontend `FlightWithPlayers.players[]` type.
                    id: p.id,
                    eventId: p.event_id,
                    userId: p.user_id,
                    firstName: p.first_name,
                    lastName: p.last_name,
                    handicapIndex: parseFloat(p.handicap_index),
                    teeId: effectiveTeeId,
                    playingHcpSingles: phSingles,
                    playingHcpFourball: phFourball,
                    // Per-round assignment (overrides legacy single-flight columns).
                    flightId: p.pf_flight_id,
                    team: p.pf_team,
                    position: p.pf_position,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                };
            }),
    }));
};

export const getFlightById = async (flightId: string): Promise<Flight | null> => {
    return flightRepository.getFlightById(flightId);
};

export const setFlightState = async (
    flightId: string,
    state: RoundState
): Promise<Flight> => {
    const updated = await flightRepository.updateFlightState(flightId, state);
    if (!updated) throw new Error('Flight not found');
    return updated;
};

export const assignPlayer = async (
    eventId: string,
    flightId: string,
    input: AssignPlayerRequest
): Promise<void> => {
    const event = await eventRepository.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const flight = await flightRepository.getFlightById(flightId);
    if (!flight || flight.eventId !== eventId) throw new Error('Flight not found in event');

    const player = await playerRepository.getPlayerById(input.playerId);
    if (!player || player.eventId !== eventId) throw new Error('Player not found in event');

    const currentFlightPlayers = (await playerRepository.getPlayersByEventId(eventId)).filter(
        p => p.flightId === flightId
    );
    const isTaken = currentFlightPlayers.some(
        (p: any) => p.team === input.team && p.position === input.position
    );
    if (isTaken) {
        throw new Error(`Position ${input.team} #${input.position} is already occupied in this flight`);
    }

    await playerRepository.assignPlayerToFlight(input.playerId, flightId, input.team, input.position);
};

export const unassignPlayer = async (
    eventId: string,
    flightId: string,
    playerId: string
): Promise<void> => {
    const player = await playerRepository.getPlayerById(playerId);
    if (!player) throw new Error('Player not found');
    if (player.flightId !== flightId) throw new Error('Player not in this flight');

    await playerRepository.unassignPlayerFromFlight(playerId);
};
