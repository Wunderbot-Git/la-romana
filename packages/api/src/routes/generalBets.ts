import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth';
import { placeGeneralBet, getGeneralBetPools } from '../services/generalBettingService';
import { getUserGeneralBets } from '../repositories/generalBetRepository';
import type { GeneralBetType } from '../repositories/generalBetRepository';

export const generalBetRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    // List pools (one per active bet type)
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/general-bets',
        async (request, reply) => {
            try {
                const pools = await getGeneralBetPools(request.params.eventId);
                return reply.send(pools);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        },
    );

    // My general bets
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/general-bets/my-bets',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const bettorId = (request as any).user.userId;
            try {
                const bets = await getUserGeneralBets(request.params.eventId, bettorId);
                return reply.send(bets);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        },
    );

    // Place a general bet
    fastify.post<{
        Params: { eventId: string };
        Body: { betType: GeneralBetType; pickedOutcome: string; comment?: string };
    }>(
        '/events/:eventId/general-bets',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const bettorId = (request as any).user.userId;
            const { betType, pickedOutcome, comment } = request.body;
            try {
                const bet = await placeGeneralBet({
                    eventId: request.params.eventId,
                    bettorId,
                    betType,
                    pickedOutcome,
                    comment,
                });
                return reply.code(201).send(bet);
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        },
    );
};

export default generalBetRoutes;
