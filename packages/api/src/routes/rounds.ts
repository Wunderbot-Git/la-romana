import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import * as roundService from '../services/roundService';
import { CreateRoundRequest, UpdateRoundRequest, Round } from '@ryder-cup/shared';

export const roundRoutes = async (fastify: FastifyInstance) => {

    // List rounds for an event — public (spectators need round info)
    fastify.get<{ Params: { eventId: string }; Reply: Round[] | { error: string } }>(
        '/events/:eventId/rounds',
        async (request, reply) => {
            try {
                return await roundService.listRounds(request.params.eventId);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Get a single round by id — public
    fastify.get<{ Params: { eventId: string; roundId: string }; Reply: Round | { error: string } }>(
        '/events/:eventId/rounds/:roundId',
        async (request, reply) => {
            const round = await roundService.getRound(request.params.roundId);
            if (!round || round.eventId !== request.params.eventId) {
                return reply.status(404).send({ error: 'Round not found' });
            }
            return round;
        }
    );

    // Create round — organizer only
    fastify.post<{ Params: { eventId: string }; Body: CreateRoundRequest; Reply: Round | { error: string } }>(
        '/events/:eventId/rounds',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can create rounds' });
            }

            try {
                const round = await roundService.createRound(eventId, request.body);
                return reply.status(201).send(round);
            } catch (err: any) {
                if (err.message === 'Course not found for this event') {
                    return reply.status(404).send({ error: err.message });
                }
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Update round — organizer only
    fastify.patch<{ Params: { eventId: string; roundId: string }; Body: UpdateRoundRequest; Reply: Round | { error: string } }>(
        '/events/:eventId/rounds/:roundId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, roundId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can update rounds' });
            }

            try {
                return await roundService.updateRound(roundId, request.body);
            } catch (err: any) {
                if (err.message === 'Round not found') {
                    return reply.status(404).send({ error: err.message });
                }
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Delete round — organizer only
    fastify.delete<{ Params: { eventId: string; roundId: string }; Reply: { message: string } | { error: string } }>(
        '/events/:eventId/rounds/:roundId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId, roundId } = request.params;

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can delete rounds' });
            }

            try {
                await roundService.deleteRound(roundId);
                return reply.send({ message: 'Round deleted' });
            } catch (err: any) {
                if (err.message === 'Round not found') {
                    return reply.status(404).send({ error: err.message });
                }
                return reply.status(500).send({ error: err.message });
            }
        }
    );
};
