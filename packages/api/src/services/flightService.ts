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
    const pool = getPool();
    const flightIds = flights.map(f => f.id);
    if (flightIds.length === 0) return [];

    const playersRes = await pool.query(
        `SELECT * FROM players WHERE flight_id = ANY($1::uuid[])`,
        [flightIds]
    );
    const players = playersRes.rows;
    return flights.map(f => ({
        ...f,
        players: players.filter((p: any) => p.flight_id === f.id),
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
