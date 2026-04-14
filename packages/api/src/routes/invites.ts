import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import * as inviteRepository from '../repositories/inviteRepository';

export const inviteRoutes = async (fastify: FastifyInstance) => {

    // Get invite details (public, so users know who they are claiming before logging in)
    fastify.get<{ Params: { inviteId: string } }>(
        '/invites/:inviteId',
        async (request, reply) => {
            const { inviteId } = request.params;
            const invite = await inviteRepository.getInvite(inviteId);

            // Generic 404 to avoid exposing whether tokens exist if they are expired
            if (!invite) {
                return reply.status(404).send({ error: 'Invite not found or invalid format' } as any);
            }
            if (invite.claimedByUserId) {
                return reply.status(400).send({ error: 'Invite already claimed' } as any);
            }
            if (new Date() > invite.expiresAt) {
                return reply.status(400).send({ error: 'Invite has expired' } as any);
            }

            return reply.send({
                inviteId: invite.id,
                eventId: invite.eventId,
                eventName: invite.eventName,
                playerId: invite.playerId,
                playerName: invite.playerName
            });
        }
    );

    // Claim invite
    fastify.post<{ Params: { inviteId: string } }>(
        '/invites/:inviteId/claim',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { inviteId } = request.params;
            const { userId } = request.user as { userId: string };

            const invite = await inviteRepository.getInvite(inviteId);

            if (!invite) return reply.status(404).send({ error: 'Invite not found' } as any);
            if (invite.claimedByUserId) return reply.status(400).send({ error: 'Invite already claimed' } as any);
            if (new Date() > invite.expiresAt) return reply.status(400).send({ error: 'Invite expired' } as any);

            try {
                await inviteRepository.claimInvite(inviteId, userId, invite.playerId);
                return reply.send({ message: 'Profile successfully claimed' });
            } catch (error) {
                request.log.error(error);
                return reply.status(500).send({ error: 'Failed to claim invite' } as any);
            }
        }
    );
};
