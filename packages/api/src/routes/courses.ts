import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import * as courseService from '../services/courseService';
import * as courseRepo from '../repositories/courseRepository';
import { invalidateLeaderboardCache } from '../services/leaderboardService';
import { CreateCourseRequest, Course, UpdateTeeRatingRequest } from '@ryder-cup/shared';

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

    // Get a single course (with tees incl. slope/rating + holes) by id.
    // Needed because an event can have multiple courses (one per round in La Romana),
    // and `GET /events/:id/course` only returns one.
    fastify.get<{
        Params: { eventId: string; courseId: string };
        Reply: { id: string; name: string; tees: Array<{ id: string; name: string; slopeRating: number | null; courseRating: number | null; par: number }> } | { error: string };
    }>(
        '/events/:eventId/courses/:courseId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId, courseId } = request.params;
            // Verify course belongs to event
            const { getPool } = await import('../config/database');
            const pool = getPool();
            const rs = await pool.query(
                `SELECT id, name FROM courses WHERE id = $1 AND event_id = $2`,
                [courseId, eventId]
            );
            if (rs.rowCount === 0) return reply.status(404).send({ error: 'Course not found' });
            const teesRes = await pool.query(
                `SELECT t.id, t.name, t.slope_rating, t.course_rating,
                        COALESCE(SUM(h.par), 0) AS par_total
                   FROM tees t
                   LEFT JOIN holes h ON h.tee_id = t.id
                  WHERE t.course_id = $1
                  GROUP BY t.id
                  ORDER BY t.created_at ASC`,
                [courseId]
            );
            return {
                id: rs.rows[0].id,
                name: rs.rows[0].name,
                tees: teesRes.rows.map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    slopeRating: t.slope_rating != null ? Number(t.slope_rating) : null,
                    courseRating: t.course_rating != null ? Number(t.course_rating) : null,
                    par: Number(t.par_total) || 0,
                })),
            };
        }
    );

    // Update slope_rating + course_rating for a single tee (Organizer Only).
    // These feed the USGA Course Handicap formula in the scoring engine.
    fastify.patch<{
        Params: { eventId: string; courseId: string; teeId: string };
        Body: UpdateTeeRatingRequest;
        Reply: { id: string; courseId: string; slopeRating: number | null; courseRating: number | null } | { error: string };
    }>(
        '/events/:eventId/courses/:courseId/tees/:teeId',
        { onRequest: [authenticate] },
        async (request, reply) => {
            const { eventId, courseId, teeId } = request.params;
            const user = request.user as { userId: string };
            if (!(await isOrganizer(eventId, user.userId))) {
                return reply.status(403).send({ error: 'Only organizers can update tees' });
            }
            const updated = await courseRepo.updateTeeRating(
                courseId,
                teeId,
                request.body.slopeRating,
                request.body.courseRating,
            );
            if (!updated) return reply.status(404).send({ error: 'Tee not found for that course' });
            invalidateLeaderboardCache(eventId);
            return updated;
        }
    );
};
