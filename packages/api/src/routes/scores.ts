// Score Routes - API endpoints for score submission and retrieval

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { submitHoleScores, submitScrambleScores, getHoleScoresForFlight, getScrambleScoresForFlight, getFlightScoreboardData, adminDeleteFlightScores, adminDeleteHoleScores } from '../services/scoreService';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';

interface ScoreParams {
    eventId: string;
    flightId: string;
}

interface SubmitScoreBody {
    scores: {
        playerId: string;
        holeNumber: number;
        grossScore: number | null;
        mutationId: string;
    }[];
    source?: 'online' | 'offline';
}

interface SubmitScrambleScoreBody {
    scores: {
        team: 'red' | 'blue';
        holeNumber: number;
        grossScore: number | null;
        mutationId: string;
    }[];
    source?: 'online' | 'offline';
}

export default async function scoreRoutes(fastify: FastifyInstance) {
    // Get hole scores for a flight (Detailed Scoreboard Data)
    fastify.get<{ Params: ScoreParams }>(
        '/events/:eventId/flights/:flightId/scores',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: ScoreParams }>, reply: FastifyReply) => {
            try {
                const { flightId } = request.params;
                const scoreData = await getFlightScoreboardData(flightId);
                return reply.send(scoreData);
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Submit hole scores for a flight
    fastify.put<{ Params: ScoreParams; Body: SubmitScoreBody }>(
        '/events/:eventId/flights/:flightId/scores',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: ScoreParams; Body: SubmitScoreBody }>, reply: FastifyReply) => {
            try {
                const { eventId, flightId } = request.params;
                const { scores, source } = request.body;
                const userId = (request.user as any).userId;

                if (!scores || !Array.isArray(scores) || scores.length === 0) {
                    return reply.status(400).send({ error: 'Scores array is required' });
                }

                const result = await submitHoleScores({
                    eventId,
                    flightId,
                    userId,
                    scores,
                    source
                });

                return reply.send(result);
            } catch (error: any) {
                if (error.message.includes('not live')) {
                    return reply.status(403).send({ error: error.message });
                }
                if (error.message.includes('Invalid')) {
                    return reply.status(400).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Get scramble scores for a flight
    fastify.get<{ Params: ScoreParams }>(
        '/events/:eventId/flights/:flightId/scramble-scores',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: ScoreParams }>, reply: FastifyReply) => {
            try {
                const { flightId } = request.params;
                const scores = await getScrambleScoresForFlight(flightId);
                return reply.send({ scores });
            } catch (error: any) {
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Admin: Delete all scores for a flight
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

    // Admin: Delete scores for a specific hole in a flight
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

    // Submit scramble scores for a flight
    fastify.put<{ Params: ScoreParams; Body: SubmitScrambleScoreBody }>(
        '/events/:eventId/flights/:flightId/scramble-scores',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: ScoreParams; Body: SubmitScrambleScoreBody }>, reply: FastifyReply) => {
            try {
                const { eventId, flightId } = request.params;
                const { scores, source } = request.body;
                const userId = (request.user as any).userId;

                if (!scores || !Array.isArray(scores) || scores.length === 0) {
                    return reply.status(400).send({ error: 'Scores array is required' });
                }

                const result = await submitScrambleScores({
                    eventId,
                    flightId,
                    userId,
                    scores,
                    source
                });

                return reply.send(result);
            } catch (error: any) {
                if (error.message.includes('not live')) {
                    return reply.status(403).send({ error: error.message });
                }
                if (error.message.includes('Invalid')) {
                    return reply.status(400).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );
}
