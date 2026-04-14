import { CreateFlightsRequest, AssignPlayerRequest, Flight, FlightWithPlayers } from '@ryder-cup/shared';
import * as flightRepository from '../repositories/flightRepository';
import * as eventRepository from '../repositories/eventRepository';
import * as playerRepository from '../repositories/playerRepository';

export const createFlights = async (eventId: string, input: CreateFlightsRequest): Promise<Flight[]> => {
    const event = await eventRepository.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const created: Flight[] = [];
    const currentFlights = await flightRepository.getFlightsByEventId(eventId);
    let nextNum = currentFlights.length + 1;

    for (let i = 0; i < input.count; i++) {
        created.push(await flightRepository.createFlight(eventId, nextNum++));
    }
    return created;
};

export const getEventFlightsDetails = async (eventId: string): Promise<FlightWithPlayers[]> => {
    const flights = await flightRepository.getFlightsByEventId(eventId);
    const players = await playerRepository.getPlayersByEventId(eventId);

    return flights.map(f => ({
        ...f,
        players: players.filter(p => p.flightId === f.id)
    }));
};

export const getFlightById = async (flightId: string): Promise<Flight | null> => {
    return flightRepository.getFlightById(flightId);
};

export const assignPlayer = async (eventId: string, flightId: string, input: AssignPlayerRequest): Promise<void> => {
    // 1. Verify Existence
    const event = await eventRepository.getEventById(eventId);
    if (!event) throw new Error('Event not found');

    const flight = await flightRepository.getFlightById(flightId);
    if (!flight || flight.eventId !== eventId) throw new Error('Flight not found in event');

    const player = await playerRepository.getPlayerById(input.playerId);
    if (!player || player.eventId !== eventId) throw new Error('Player not found in event');

    // 2. Validate Constraints
    // Check if position is taken in this flight
    // We need fresh data for the specific flight to check occupants
    const currentFlightPlayers = (await playerRepository.getPlayersByEventId(eventId))
        .filter(p => p.flightId === flightId);

    // Explicitly check properties. Note: mapped player object from repo contains team/position if they exist in DB
    // but Typescript might not show them on the base Player interface if not added.
    // However, at runtime, the repo 'SELECT *' returns them.
    // Let's rely on the fact that if a player is assigned, they have these fields.

    const isTaken = currentFlightPlayers.some((p: any) => p.team === input.team && p.position === input.position);
    if (isTaken) throw new Error(`Position ${input.team} #${input.position} is already occupied in this flight`);

    // Assign
    await playerRepository.assignPlayerToFlight(input.playerId, flightId, input.team, input.position);
};

export const unassignPlayer = async (eventId: string, flightId: string, playerId: string): Promise<void> => {
    // Verify ownership
    const player = await playerRepository.getPlayerById(playerId);
    if (!player) throw new Error('Player not found');
    if (player.flightId !== flightId) throw new Error('Player not in this flight');

    await playerRepository.unassignPlayerFromFlight(playerId);
};
