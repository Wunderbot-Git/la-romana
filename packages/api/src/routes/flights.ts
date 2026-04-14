import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import * as flightService from '../services/flightService';
import { CreateFlightsRequest, AssignPlayerRequest, FlightWithPlayers, Flight } from '@ryder-cup/shared';
import { requireFlightAccess } from '../middleware/authExtensions';

export const flightRoutes = async (fastify: FastifyInstance) => {

    // Create Flights (Organizer Only)
    fastify.post<{ Params: { eventId: string }; Body: CreateFlightsRequest; Reply: Flight[] | { error: string } }>(
        '/events/:eventId/flights',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const user = request.user as { userId: string };

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) return reply.status(403).send({ error: 'Only organizers can create flights' });

            try {
                return await flightService.createFlights(eventId, request.body);
            } catch (err: any) {
                if (err.message === 'Event not found') return reply.status(404).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Get Flights (Public) — all flights across all rounds for the event
    fastify.get<{ Params: { eventId: string }; Reply: FlightWithPlayers[] | { error: string } }>(
        '/events/:eventId/flights',
        async (request, reply) => {
            const { eventId } = request.params;
            try {
                return await flightService.getEventFlightsDetails(eventId);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Get Flights for a specific round (Public)
    fastify.get<{ Params: { eventId: string; roundId: string }; Reply: FlightWithPlayers[] | { error: string } }>(
        '/events/:eventId/rounds/:roundId/flights',
        async (request, reply) => {
            try {
                return await flightService.getRoundFlightsDetails(request.params.roundId);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Assign Player (Organizer Only)
    fastify.post<{ Params: { eventId: string; flightId: string }; Body: AssignPlayerRequest; Reply: { message: string } | { error: string } }>(
        '/events/:eventId/flights/:flightId/assign',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId, flightId } = request.params;
            const user = request.user as { userId: string };

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) return reply.status(403).send({ error: 'Only organizers can assign players' });

            try {
                await flightService.assignPlayer(eventId, flightId, request.body);
                return { message: 'Player assigned' };
            } catch (err: any) {
                if (err.message.includes('not found')) return reply.status(404).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Unassign Player (Organizer Only)
    // Using simple payload { playerId }
    fastify.post<{ Params: { eventId: string; flightId: string }; Body: { playerId: string }; Reply: { message: string } | { error: string } }>(
        '/events/:eventId/flights/:flightId/unassign',
        { onRequest: [authenticate] }, // Controller checks organizer, but we could use hook now.
        // Keeping as is for now to minimize refactor risk unless requested.
        // Actually, let's use the new middleware for the new endpoint below.
        async (request, reply) => {
            const { eventId, flightId } = request.params;
            const user = request.user as { userId: string };

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) return reply.status(403).send({ error: 'Only organizers can unassign players' });

            try {
                await flightService.unassignPlayer(eventId, flightId, request.body.playerId);
                return { message: 'Player unassigned' };
            } catch (err: any) {
                if (err.message.includes('not found')) return reply.status(404).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Get Single Flight (Restricted Access)
    // Only Organizer OR Member of Flight can view detailed specific flight (future-proof)
    fastify.get<{ Params: { eventId: string; flightId: string }; Reply: Flight | { error: string } }>(
        '/events/:eventId/flights/:flightId',
        { preHandler: [authenticate, requireFlightAccess] },
        async (request, reply) => {
            const { flightId } = request.params;
            const flight = await flightService.getFlightById(flightId);
            if (!flight) return reply.status(404).send({ error: 'Flight not found' });
            return flight;
        }
    );
};
