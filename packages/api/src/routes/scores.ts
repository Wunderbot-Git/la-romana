// Score Routes — submit and retrieve hole scores (round-scoped).

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
    submitHoleScores,
    getFlightScoreboardData,
    adminDeleteFlightScores,
    adminDeleteHoleScores,
    adminDeleteRoundScores,
} from '../services/scoreService';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';

interface ScoreParams {
    eventId: string;
    flightId: string;
}

interface SubmitScoreBody {
    roundId: string;
    scores: {
        playerId: string;
        holeNumber: number;
        grossScore: number | null;
        mutationId: string;
    }[];
    source?: 'online' | 'offline';
}

export default async function scoreRoutes(fastify: FastifyInstance) {
    // Get scoreboard for a flight (includes per-player scores + match states)
    fastify.get<{ Params: ScoreParams }>(
        '/events/:eventId/flights/:flightId/scores',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: ScoreParams }>, reply: FastifyReply) => {
            try {
                const { flightId } = request.params;
                return reply.send(await getFlightScoreboardData(flightId));
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Submit hole scores — requires roundId in body
    fastify.put<{ Params: ScoreParams; Body: SubmitScoreBody }>(
        '/events/:eventId/flights/:flightId/scores',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: ScoreParams; Body: SubmitScoreBody }>, reply: FastifyReply) => {
            try {
                const { eventId, flightId } = request.params;
                const { roundId, scores, source } = request.body;
                const userId = (request.user as any).userId;

                if (!roundId) {
                    return reply.status(400).send({ error: 'roundId is required' });
                }
                if (!scores || !Array.isArray(scores) || scores.length === 0) {
                    return reply.status(400).send({ error: 'Scores array is required' });
                }

                const result = await submitHoleScores({
                    eventId,
                    roundId,
                    flightId,
                    userId,
                    scores,
                    source,
                });
                return reply.send(result);
            } catch (error: any) {
                if (error.message.includes('not live')) {
                    return reply.status(403).send({ error: error.message });
                }
                if (error.message.includes('Invalid') || error.message.includes('does not belong')) {
                    return reply.status(400).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Admin: delete *all* scores for a round (catches orphan rows without flight_id)
    fastify.delete<{ Params: { eventId: string; roundId: string } }>(
        '/events/:eventId/rounds/:roundId/scores',
        { preHandler: [authenticate] },
        async (
            request: FastifyRequest<{ Params: { eventId: string; roundId: string } }>,
            reply: FastifyReply
        ) => {
            try {
                const { eventId, roundId } = request.params;
                const user = request.user as any;
                const organizer = await isOrganizer(eventId, user.userId);
                if (!organizer) return reply.status(403).send({ error: 'Only organizers can delete scores' });

                const result = await adminDeleteRoundScores(eventId, roundId, user.userId);
                return reply.send({ message: 'Round scores deleted', ...result });
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Admin: delete all scores for a flight
    fastify.delete<{ Params: ScoreParams }>(
        '/events/:eventId/flights/:flightId/scores',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: ScoreParams }>, reply: FastifyReply) => {
            try {
                const { eventId, flightId } = request.params;
                const user = request.user as any;
                const organizer = await isOrganizer(eventId, user.userId);
                if (!organizer) return reply.status(403).send({ error: 'Only organizers can delete scores' });

                const result = await adminDeleteFlightScores(eventId, flightId, user.userId);
                return reply.send({ message: 'All scores deleted', ...result });
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Admin: delete scores for a specific hole in a flight
    fastify.delete<{ Params: ScoreParams & { holeNumber: string } }>(
        '/events/:eventId/flights/:flightId/scores/:holeNumber',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: ScoreParams & { holeNumber: string } }>, reply: FastifyReply) => {
            try {
                const { eventId, flightId } = request.params;
                const holeNumber = parseInt(request.params.holeNumber, 10);
                if (isNaN(holeNumber) || holeNumber < 1 || holeNumber > 18) {
                    return reply.status(400).send({ error: 'Hole number must be between 1 and 18' });
                }
                const user = request.user as any;
                const organizer = await isOrganizer(eventId, user.userId);
                if (!organizer) return reply.status(403).send({ error: 'Only organizers can delete scores' });

                const result = await adminDeleteHoleScores(eventId, flightId, holeNumber, user.userId);
                return reply.send({ message: `Hole ${holeNumber} scores deleted`, ...result });
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );
}
