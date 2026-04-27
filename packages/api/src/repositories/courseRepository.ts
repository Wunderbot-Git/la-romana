import { getPool } from '../config/database';
import { CreateCourseRequest, Course, Tee, Hole } from '@ryder-cup/shared';
import { PoolClient } from 'pg';

// Helper to transactional insert
export const createCourse = async (eventId: string, input: CreateCourseRequest): Promise<Course> => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create Course
        const courseRes = await client.query(
            'INSERT INTO courses (event_id, name, source) VALUES ($1, $2, $3) RETURNING *',
            [eventId, input.name, 'manual']
        );
        const courseId = courseRes.rows[0].id;

        // 2. Create Tees and Holes
        const createdTees: Tee[] = [];

        for (const tee of input.tees) {
            const teeRes = await client.query(
                'INSERT INTO tees (course_id, name, slope_rating, course_rating) VALUES ($1, $2, $3, $4) RETURNING *',
                [courseId, tee.name, tee.slopeRating ?? null, tee.courseRating ?? null]
            );
            const teeId = teeRes.rows[0].id;

            const createdHoles: Hole[] = [];
            for (const hole of tee.holes) {
                const holeRes = await client.query(
                    'INSERT INTO holes (tee_id, hole_number, par, stroke_index) VALUES ($1, $2, $3, $4) RETURNING *',
                    [teeId, hole.holeNumber, hole.par, hole.strokeIndex]
                );
                const h = holeRes.rows[0];
                createdHoles.push({
                    id: h.id,
                    holeNumber: h.hole_number,
                    par: h.par,
                    strokeIndex: h.stroke_index
                });
            }

            createdTees.push({
                id: teeId,
                name: tee.name,
                holes: createdHoles,
                slopeRating: tee.slopeRating ?? null,
                courseRating: tee.courseRating ?? null,
            });
        }

        await client.query('COMMIT');

        return {
            id: courseId,
            eventId: eventId,
            name: input.name,
            tees: createdTees
        };

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

export const getCourseByEventId = async (eventId: string): Promise<Course | null> => {
    const pool = getPool();

    // Fetch Course
    const courseRes = await pool.query('SELECT * FROM courses WHERE event_id = $1', [eventId]);
    if (courseRes.rows.length === 0) return null;

    const course = courseRes.rows[0];

    // Fetch Tees
    const teesRes = await pool.query('SELECT * FROM tees WHERE course_id = $1', [course.id]);
    const tees = teesRes.rows;

    // Fetch Holes for all tees
    const teeIds = tees.map(t => t.id);
    let holes: any[] = [];
    if (teeIds.length > 0) {
        // Safe to inject values length check passed
        const placeholders = teeIds.map((_, i) => `$${i + 1}`).join(',');
        const holesRes = await pool.query(
            `SELECT * FROM holes WHERE tee_id IN (${placeholders}) ORDER BY hole_number ASC`,
            teeIds
        );
        holes = holesRes.rows;
    }

    // Assemble structure
    const fullTees: Tee[] = tees.map(t => ({
        id: t.id,
        name: t.name,
        slopeRating: t.slope_rating != null ? Number(t.slope_rating) : null,
        courseRating: t.course_rating != null ? Number(t.course_rating) : null,
        holes: holes
            .filter(h => h.tee_id === t.id)
            .map(h => ({
                id: h.id,
                holeNumber: h.hole_number,
                par: h.par,
                strokeIndex: h.stroke_index
            }))
    }));

    return {
        id: course.id,
        eventId: course.event_id,
        name: course.name,
        tees: fullTees
    };
};

/**
 * Update slope_rating + course_rating for a single tee.
 * Both values may be null (e.g., to clear a tee's rating).
 * Verifies the tee belongs to the given course (security check at the route level
 * should also confirm the course belongs to the event).
 */
export const updateTeeRating = async (
    courseId: string,
    teeId: string,
    slopeRating: number | null,
    courseRating: number | null,
): Promise<{ id: string; courseId: string; slopeRating: number | null; courseRating: number | null } | null> => {
    const pool = getPool();
    const res = await pool.query(
        `UPDATE tees
            SET slope_rating = $1, course_rating = $2
          WHERE id = $3 AND course_id = $4
          RETURNING id, course_id, slope_rating, course_rating`,
        [slopeRating, courseRating, teeId, courseId]
    );
    if (res.rowCount === 0) return null;
    const r = res.rows[0];
    return {
        id: r.id,
        courseId: r.course_id,
        slopeRating: r.slope_rating != null ? Number(r.slope_rating) : null,
        courseRating: r.course_rating != null ? Number(r.course_rating) : null,
    };
};

/**
 * Fetch one tee with its slope/rating + holes (for handicap calc / admin display).
 * Returns null if the tee does not exist.
 */
export const getTeeById = async (teeId: string): Promise<Tee | null> => {
    const pool = getPool();
    const teeRes = await pool.query('SELECT * FROM tees WHERE id = $1', [teeId]);
    if (teeRes.rows.length === 0) return null;
    const t = teeRes.rows[0];
    const holesRes = await pool.query(
        'SELECT * FROM holes WHERE tee_id = $1 ORDER BY hole_number ASC',
        [teeId]
    );
    return {
        id: t.id,
        name: t.name,
        slopeRating: t.slope_rating != null ? Number(t.slope_rating) : null,
        courseRating: t.course_rating != null ? Number(t.course_rating) : null,
        holes: holesRes.rows.map((h: any) => ({
            id: h.id,
            holeNumber: h.hole_number,
            par: h.par,
            strokeIndex: h.stroke_index,
        })),
    };
};
