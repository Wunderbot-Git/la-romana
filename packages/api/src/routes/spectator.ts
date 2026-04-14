// Spectator Routes - Read-only access via token

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createSpectatorLink, validateSpectatorToken } from '../services/spectatorService';
import { getLeaderboard } from '../services/leaderboardService';
import { getFlightScoreboardData } from '../services/scoreService';
import { getTokensForEvent, revokeToken } from '../repositories/spectatorRepository';
import { authenticate } from '../middleware/auth';
import { requireOrganizer } from '../middleware/authExtensions';

interface CreateLinkParams {
    eventId: string;
}

interface SpectatorParams {
    token: string;
}

interface SpectatorFlightParams {
    token: string;
    flightId: string;
}

export default async function spectatorRoutes(fastify: FastifyInstance) {
    // Create spectator link (organizer only)
    fastify.post<{ Params: CreateLinkParams; Body: { expiresInDays?: number } }>(
        '/events/:eventId/spectator-link',
        { preHandler: [authenticate, requireOrganizer] },
        async (request: FastifyRequest<{ Params: CreateLinkParams; Body: { expiresInDays?: number } }>, reply: FastifyReply) => {
            try {
                const { eventId } = request.params;
                const userId = (request.user as any).userId;
                const { expiresInDays } = request.body || {};

                let expiresAt: Date | undefined;
                if (expiresInDays) {
                    expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
                }

                const link = await createSpectatorLink(eventId, userId, expiresAt);
                return reply.status(201).send(link);
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Get all spectator links for event (organizer only)
    fastify.get<{ Params: CreateLinkParams }>(
        '/events/:eventId/spectator-links',
        { preHandler: [authenticate, requireOrganizer] },
        async (request: FastifyRequest<{ Params: CreateLinkParams }>, reply: FastifyReply) => {
            try {
                const { eventId } = request.params;
                const tokens = await getTokensForEvent(eventId);
                return reply.send({ tokens });
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Revoke spectator link (organizer only)
    fastify.delete<{ Params: { eventId: string; tokenId: string } }>(
        '/events/:eventId/spectator-links/:tokenId',
        { preHandler: [authenticate, requireOrganizer] },
        async (request: FastifyRequest<{ Params: { eventId: string; tokenId: string } }>, reply: FastifyReply) => {
            try {
                const { tokenId } = request.params;
                await revokeToken(tokenId);
                return reply.status(204).send();
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Public: Get leaderboard via spectator token
    fastify.get<{ Params: SpectatorParams }>(
        '/spectate/:token/leaderboard',
        async (request: FastifyRequest<{ Params: SpectatorParams }>, reply: FastifyReply) => {
            try {
                const { token } = request.params;

                const spectatorToken = await validateSpectatorToken(token);
                if (!spectatorToken) {
                    return reply.status(404).send({ error: 'Invalid or expired spectator link' });
                }

                const leaderboard = await getLeaderboard(spectatorToken.eventId);
                return reply.send(leaderboard);
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Public: Get flight scoreboard via spectator token
    fastify.get<{ Params: SpectatorFlightParams }>(
        '/spectate/:token/flights/:flightId/scoreboard',
        async (request: FastifyRequest<{ Params: SpectatorFlightParams }>, reply: FastifyReply) => {
            try {
                const { token, flightId } = request.params;

                const spectatorToken = await validateSpectatorToken(token);
                if (!spectatorToken) {
                    return reply.status(404).send({ error: 'Invalid or expired spectator link' });
                }

                const data = await getFlightScoreboardData(flightId);
                return reply.send(data);
            } catch (error: any) {
                if (error.message === 'Flight not found') {
                    return reply.status(404).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );
}
