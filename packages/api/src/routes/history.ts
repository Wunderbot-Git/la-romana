// History Routes - Match history for flights

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getFlightMatchHistory } from '../services/leaderboardService';
import { authenticate } from '../middleware/auth';

interface HistoryParams {
    eventId: string;
    flightId: string;
}

export default async function historyRoutes(fastify: FastifyInstance) {
    // Get detailed match history for a flight
    fastify.get<{ Params: HistoryParams }>(
        '/events/:eventId/flights/:flightId/history',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: HistoryParams }>, reply: FastifyReply) => {
            try {
                const { flightId } = request.params;
                const history = await getFlightMatchHistory(flightId);

                if (!history) {
                    return reply.send({
                        message: 'Not enough players assigned to flight',
                        singles1: null,
                        singles2: null,
                        fourball: null,
                        scramble: null
                    });
                }

                return reply.send(history);
            } catch (error: any) {
                if (error.message === 'Flight not found') {
                    return reply.status(404).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );
}
