import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth';
import { placeBet, getMatchBets, getPersonalStats, getTournamentSettlements, getMandatoryBetStatus } from '../services/bettingService';

export const betRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

    // GET match bets distribution and pot
    fastify.get<{ Params: { eventId: string; flightId: string; segmentType: string } }>(
        '/events/:eventId/flights/:flightId/segments/:segmentType/bets',
        async (request, reply) => {
            const { flightId, segmentType } = request.params;
            const data = await getMatchBets(flightId, segmentType);
            return reply.send(data);
        }
    );

    // POST place a bet (requires authentication)
    fastify.post<{ Params: { eventId: string; flightId: string; segmentType: 'singles1' | 'singles2' | 'fourball' | 'scramble' }, Body: { pickedOutcome: 'A' | 'B' | 'AS'; comment?: string; amount?: number } }>(
        '/events/:eventId/flights/:flightId/segments/:segmentType/bets',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { eventId, flightId, segmentType } = request.params;
            const { pickedOutcome, comment, amount } = request.body;
            const bettorId = (request as any).user.userId;

            try {
                const bet = await placeBet({
                    eventId,
                    flightId,
                    segmentType,
                    bettorId,
                    pickedOutcome,
                    comment,
                    customAmount: amount
                });
                return reply.code(201).send(bet);
            } catch (error: any) {
                return reply.code(400).send({ error: error.message });
            }
        }
    );

    // GET personal betting stats for an event (requires authentication)
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/bets/my-stats',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const bettorId = (request as any).user.userId;
            const stats = await getPersonalStats(eventId, bettorId);
            return reply.send(stats);
        }
    );

    // GET any user's betting stats (public within event members)
    fastify.get<{ Params: { eventId: string; userId: string } }>(
        '/events/:eventId/bets/user/:userId',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { eventId, userId } = request.params;
            const stats = await getPersonalStats(eventId, userId);
            return reply.send(stats);
        }
    );

    // GET mandatory bet status for current user
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/bets/mandatory-status',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const bettorId = (request as any).user.userId;
            const status = await getMandatoryBetStatus(eventId, bettorId);
            return reply.send(status);
        }
    );

    // GET full tournament settlement (can be authenticated or public, let's keep it public for now since leaderboards are public)
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/settlement',
        async (request, reply) => {
            const { eventId } = request.params;
            const settlement = await getTournamentSettlements(eventId);
            return reply.send(settlement);
        }
    );
};
