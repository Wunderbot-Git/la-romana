// Leaderboard Routes - Tournament standings and summary

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLeaderboard } from '../services/leaderboardService';

interface LeaderboardParams {
    eventId: string;
}

export default async function leaderboardRoutes(fastify: FastifyInstance) {
    // Get tournament leaderboard
    fastify.get<{ Params: LeaderboardParams }>(
        '/events/:eventId/leaderboard',
        async (request: FastifyRequest<{ Params: LeaderboardParams }>, reply: FastifyReply) => {
            try {
                const { eventId } = request.params;
                const leaderboard = await getLeaderboard(eventId);
                return reply.send(leaderboard);
            } catch (error: any) {
                if (error.message === 'Event not found') {
                    return reply.status(404).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );
}
