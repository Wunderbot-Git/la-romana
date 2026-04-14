import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import * as inviteRepository from '../repositories/inviteRepository';

export const adminRoutes = async (fastify: FastifyInstance) => {
    // Middleware to ensure user is app admin
    fastify.addHook('onRequest', async (request, reply) => {
        await authenticate(request, reply as any);
        const { appRole } = request.user as { appRole: string };
        if (appRole !== 'admin') {
            return reply.status(403).send({ error: 'Requires admin privileges' });
        }
    });

    // Generate Invite Link Token
    fastify.post<{ Params: { eventId: string; playerId: string }; Reply: { inviteId: string } | { error: string } }>(
        '/admin/events/:eventId/players/:playerId/invite',
        async (request, reply) => {
            const { eventId, playerId } = request.params;

            if (!eventId || !playerId) {
                return reply.status(400).send({ error: 'Missing parameters' });
            }

            try {
                const inviteId = await inviteRepository.createInvite(eventId, playerId);
                return reply.status(201).send({ inviteId });
            } catch (error: any) {
                request.log.error(error);
                return reply.status(500).send({ error: 'Failed to create invite' });
            }
        }
    );
};
