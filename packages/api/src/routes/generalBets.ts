import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth';
import {
    placeGeneralBet, getGeneralBetPools, getPersonalGeneralStats
} from '../services/generalBettingService';
import { getUserGeneralBets, VALID_BET_TYPES, GeneralBetType } from '../repositories/generalBetRepository';

export const generalBetRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

    // GET all general bet pools for an event
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/general-bets',
        async (request, reply) => {
            const { eventId } = request.params;
            const pools = await getGeneralBetPools(eventId);
            return reply.send(pools);
        }
    );

    // POST place a general bet
    fastify.post<{
        Params: { eventId: string },
        Body: {
            betType: string;
            pickedOutcome: string;
            flightId?: string;
            segmentType?: string;
            comment?: string;
        }
    }>(
        '/events/:eventId/general-bets',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const { betType, pickedOutcome, flightId, segmentType, comment } = request.body;
            const bettorId = (request as any).user.userId;

            if (!VALID_BET_TYPES.includes(betType as GeneralBetType)) {
                return reply.code(400).send({ error: `Invalid bet type: '${betType}'. Must be one of: ${VALID_BET_TYPES.join(', ')}` });
            }

            try {
                const bet = await placeGeneralBet({
                    eventId,
                    bettorId,
                    betType: betType as GeneralBetType,
                    pickedOutcome,
                    flightId,
                    segmentType,
                    comment
                });
                return reply.code(201).send(bet);
            } catch (error: any) {
                return reply.code(400).send({ error: error.message });
            }
        }
    );

    // GET user's general bets for an event
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/general-bets/my-bets',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const bettorId = (request as any).user.userId;
            const bets = await getUserGeneralBets(eventId, bettorId);
            return reply.send(bets);
        }
    );

    // GET personal general bet stats
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/general-bets/my-stats',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const bettorId = (request as any).user.userId;
            const stats = await getPersonalGeneralStats(eventId, bettorId);
            return reply.send(stats);
        }
    );
};
