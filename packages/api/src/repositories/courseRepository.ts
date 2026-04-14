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
                'INSERT INTO tees (course_id, name) VALUES ($1, $2) RETURNING *',
                [courseId, tee.name]
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
                holes: createdHoles
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
