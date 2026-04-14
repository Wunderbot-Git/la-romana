import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import * as courseService from '../services/courseService';
import { CreateCourseRequest, Course } from '@ryder-cup/shared';

// Helper to check for organizer role (to be moved to middleware later)
import { isOrganizer } from '../repositories/eventMemberRepository';

export const courseRoutes = async (fastify: FastifyInstance) => {

    // Create Course (Organizer Only)
    fastify.post<{ Params: { eventId: string }; Body: CreateCourseRequest; Reply: Course | { error: string } }>(
        '/events/:eventId/course',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const user = request.user as { userId: string };
            const { eventId } = request.params;

            // Simple authorization check
            const organizer = await isOrganizer(eventId, user.userId);
            if (!organizer) {
                return reply.status(403).send({ error: 'Only organizers can create courses' });
            }

            try {
                const course = await courseService.createCourseManually(eventId, request.body);
                return reply.status(201).send(course);
            } catch (err: any) {
                if (err.message === 'Event not found') return reply.status(404).send({ error: err.message });
                if (err.message === 'Event already has a course assigned') return reply.status(409).send({ error: err.message });
                // Validation errors
                return reply.status(400).send({ error: err.message });
            }
        }
    );

    // Get Course (Authenticated)
    fastify.get<{ Params: { eventId: string }; Reply: Course | { error: string } }>(
        '/events/:eventId/course',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId } = request.params;
            const course = await courseService.getCourse(eventId);

            if (!course) {
                return reply.status(404).send({ error: 'Course not found' });
            }

            return reply.send(course);
        }
    );
};
