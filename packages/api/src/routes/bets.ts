import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { authenticate } from '../middleware/auth';
import {
    placeBet,
    getMatchBets,
    getPersonalStats,
    getTournamentSettlement,
} from '../services/bettingService';

export const betRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    // Match bets distribution and pot
    fastify.get<{ Params: { eventId: string; roundId: string; flightId: string; segmentType: string } }>(
        '/events/:eventId/rounds/:roundId/flights/:flightId/segments/:segmentType/bets',
        async (request, reply) => {
            const { roundId, flightId, segmentType } = request.params;
            try {
                const data = await getMatchBets(roundId, flightId, segmentType);
                // Bets stay OPEN at all times for La Romana — surface
                // `locked: false` so the UI keeps the bet form active.
                return reply.send({ ...data, locked: false });
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        },
    );

    // Place a match bet
    fastify.post<{
        Params: { eventId: string; roundId: string; flightId: string; segmentType: 'singles1' | 'singles2' | 'fourball' };
        Body: { pickedOutcome: 'A' | 'B' | 'AS'; comment?: string };
    }>(
        '/events/:eventId/rounds/:roundId/flights/:flightId/segments/:segmentType/bets',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const { eventId, roundId, flightId, segmentType } = request.params;
            const { pickedOutcome, comment } = request.body;
            const bettorId = (request as any).user.userId;
            try {
                const bet = await placeBet({
                    eventId,
                    roundId,
                    flightId,
                    segmentType,
                    bettorId,
                    pickedOutcome,
                    comment,
                });
                return reply.code(201).send(bet);
            } catch (err: any) {
                return reply.status(400).send({ error: err.message });
            }
        },
    );

    // Personal stats for the logged-in user
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/bets/my-stats',
        { preHandler: [authenticate] },
        async (request, reply) => {
            const bettorId = (request as any).user.userId;
            try {
                const stats = await getPersonalStats(request.params.eventId, bettorId);
                return reply.send(stats);
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        },
    );

    // Tournament settlement (balances + suggested transfers)
    fastify.get<{ Params: { eventId: string } }>(
        '/events/:eventId/settlement',
        async (request, reply) => {
            try {
                const settlement = await getTournamentSettlement(request.params.eventId);
                // Drop the *aggregate* counters in personalStats (only used internally
                // by getPersonalStats), but expose the per-player bet list so the
                // Predicciones standings UI can show a per-player drilldown of how
                // each player's net came to be. Bets are public information in this
                // tournament's pari-mutuel model anyway.
                const { personalStats, ...rest } = settlement;
                return reply.send({
                    ...rest,
                    playerBets: personalStats?.playerBets ?? {},
                    playerGeneralBets: personalStats?.playerGeneralBets ?? {},
                });
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        },
    );
};

export default betRoutes;
