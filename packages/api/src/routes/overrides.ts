import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import * as overrideService from '../services/overrideService';
import { SetOverrideRequest, EffectiveHole } from '@ryder-cup/shared';

export const overrideRoutes = async (fastify: FastifyInstance) => {

    // Set Overrides (Organizer Only)
    fastify.put<{ Params: { eventId: string }; Body: SetOverrideRequest; Reply: { message: string } | { error: string } }>(
        '/events/:eventId/overrides',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const user = request.user as { userId: string };

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can set overrides' });
            }

            try {
                await overrideService.setEventStrokeIndexes(eventId, request.body);
                return { message: 'Stroke indexes updated successfully' };
            } catch (err: any) {
                if (err.message === 'Event not found') return reply.status(404).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Get Effective Holes (Authenticated)
    fastify.get<{ Params: { eventId: string }; Querystring: { teeId: string }; Reply: EffectiveHole[] | { error: string } }>(
        '/events/:eventId/overrides',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const { teeId } = request.query;

            if (!teeId) {
                return reply.status(400).send({ error: 'teeId query parameter is required' });
            }

            try {
                const holes = await overrideService.getEffectiveHoles(eventId, teeId);
                return holes;
            } catch (err: any) {
                if (err.message === 'Course not found for event' || err.message === 'Tee not found') {
                    return reply.status(404).send({ error: err.message });
                }
                return reply.status(500).send({ error: err.message });
            }
        }
    );
};
