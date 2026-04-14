import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { isOrganizer } from '../repositories/eventMemberRepository';
import * as scrambleService from '../services/scrambleService';
import { SetScrambleSIRequest, MixedScrambleSI } from '@ryder-cup/shared';

export const scrambleRoutes = async (fastify: FastifyInstance) => {

    // Set Scramble SI (Organizer Only)
    fastify.put<{ Params: { eventId: string }; Body: SetScrambleSIRequest; Reply: { message: string } | { error: string } }>(
        '/events/:eventId/scramble-si',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const user = request.user as { userId: string };

            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can set scramble stroke indexes' });
            }

            try {
                await scrambleService.setMixedScrambleSI(eventId, request.body);
                return { message: 'Scramble stroke indexes updated successfully' };
            } catch (err: any) {
                if (err.message === 'Event not found') return reply.status(404).send({ error: err.message });
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Get Scramble SI (Public)
    fastify.get<{ Params: { eventId: string }; Reply: MixedScrambleSI[] | { error: string } }>(
        '/events/:eventId/scramble-si',
        async (request, reply) => {
            const { eventId } = request.params;

            try {
                const indexes = await scrambleService.getMixedScrambleSI(eventId);
                return indexes;
            } catch (err: any) {
                return reply.status(500).send({ error: err.message });
            }
        }
    );
};
