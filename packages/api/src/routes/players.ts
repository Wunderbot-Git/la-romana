import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import * as playerService from '../services/playerService';
import { CreatePlayerRequest, UpdatePlayerRequest, Player } from '@ryder-cup/shared';

export const playerRoutes = async (fastify: FastifyInstance) => {

    // Add Player (Organizer Only)
    fastify.post<{ Params: { eventId: string }; Body: CreatePlayerRequest; Reply: Player | { error: string } }>(
        '/events/:eventId/players',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const user = request.user as { userId: string };

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can add players' });
            }

            try {
                const player = await playerService.addPlayer(eventId, request.body);
                return reply.status(201).send(player);
            } catch (err: any) {
                if (err.message === 'Event not found') return reply.status(404).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Get Plaintiffs (Authenticated)
    fastify.get<{ Params: { eventId: string }; Reply: Player[] | { error: string } }>(
        '/events/:eventId/players',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            try {
                return await playerService.getEventPlayers(eventId);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );

    // Update Player (Organizer Only)
    fastify.put<{ Params: { eventId: string; playerId: string }; Body: UpdatePlayerRequest; Reply: Player | { error: string } }>(
        '/events/:eventId/players/:playerId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId, playerId } = request.params;
            const user = request.user as { userId: string; appRole?: string };

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer && user.appRole !== 'admin') return reply.status(403).send({ error: 'Only organizers can update players' });

            try {
                return await playerService.updatePlayer(eventId, playerId, request.body);
            } catch (err: any) {
                if (err.message === 'Player not found') return reply.status(404).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Delete Player (Organizer Only)
    fastify.delete<{ Params: { eventId: string; playerId: string }; Reply: { message: string } | { error: string } }>(
        '/events/:eventId/players/:playerId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId, playerId } = request.params;
            const user = request.user as { userId: string };

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) return reply.status(403).send({ error: 'Only organizers can remove players' });

            try {
                await playerService.removePlayer(eventId, playerId);
                return { message: 'Player removed' };
            } catch (err: any) {
                if (err.message === 'Player not found') return reply.status(404).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );
};
