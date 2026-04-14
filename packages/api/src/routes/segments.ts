// Segment Routes - Manage segment completion and reopening

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSegmentStatus, completeSegment, reopenSegment, SegmentType } from '../services/segmentService';
import { authenticate } from '../middleware/auth';
import { requireOrganizer } from '../middleware/authExtensions';

interface SegmentParams {
    eventId: string;
    flightId: string;
    segment: string;
}

export default async function segmentRoutes(fastify: FastifyInstance) {
    // Get segment status
    fastify.get<{ Params: SegmentParams }>(
        '/events/:eventId/flights/:flightId/segment/:segment',
        { preHandler: [authenticate] },
        async (request: FastifyRequest<{ Params: SegmentParams }>, reply: FastifyReply) => {
            try {
                const { flightId, segment } = request.params;

                if (segment !== 'front' && segment !== 'back') {
                    return reply.status(400).send({ error: 'Segment must be "front" or "back"' });
                }

                const status = await getSegmentStatus(flightId, segment as SegmentType);
                return reply.send(status);
            } catch (error: any) {
                if (error.message === 'Flight not found') {
                    return reply.status(404).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Complete segment
    fastify.post<{ Params: SegmentParams }>(
        '/events/:eventId/flights/:flightId/segment/:segment/complete',
        { preHandler: [authenticate, requireOrganizer] },
        async (request: FastifyRequest<{ Params: SegmentParams }>, reply: FastifyReply) => {
            try {
                const { flightId, segment } = request.params;
                const userId = (request.user as any).userId;

                if (segment !== 'front' && segment !== 'back') {
                    return reply.status(400).send({ error: 'Segment must be "front" or "back"' });
                }

                const result = await completeSegment(flightId, segment as SegmentType, userId);
                return reply.send(result);
            } catch (error: any) {
                if (error.message === 'Flight not found') {
                    return reply.status(404).send({ error: error.message });
                }
                if (error.message.includes('already completed')) {
                    return reply.status(409).send({ error: error.message });
                }
                if (error.message.includes('missing scores')) {
                    return reply.status(400).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );

    // Reopen segment
    fastify.post<{ Params: SegmentParams }>(
        '/events/:eventId/flights/:flightId/segment/:segment/reopen',
        { preHandler: [authenticate, requireOrganizer] },
        async (request: FastifyRequest<{ Params: SegmentParams }>, reply: FastifyReply) => {
            try {
                const { flightId, segment } = request.params;
                const userId = (request.user as any).userId;

                if (segment !== 'front' && segment !== 'back') {
                    return reply.status(400).send({ error: 'Segment must be "front" or "back"' });
                }

                const result = await reopenSegment(flightId, segment as SegmentType, userId);
                return reply.send(result);
            } catch (error: any) {
                if (error.message === 'Flight not found') {
                    return reply.status(404).send({ error: error.message });
                }
                if (error.message.includes('not completed')) {
                    return reply.status(400).send({ error: error.message });
                }
                return reply.status(500).send({ error: error.message });
            }
        }
    );
}
