/**
 * seed-la-romana.ts
 *
 * Seeds the La Romana 2026 event into a fresh DB:
 *   - Event LR2026 with 3 courses and 3 rounds
 *   - Courses: Teeth of the Dog (Casa de Campo), Ocean's Four, Dye Fore (Marina + Chavon combo)
 *   - Rounds: Apr 29 13:09 (TOTH), May 1 10:30 (Ocean's 4), May 2 08:50 (Dye Fore)
 *   - Placeholder roster: Player 1..15, all HCP 15, no team/flight assignment (admin does it)
 *
 * All par/SI values and the Dye Fore loop choice are editable in admin once real data is confirmed.
 * Idempotent-ish: re-running wipes and rebuilds this event's data.
 *
 * Run (from repo root):
 *   DATABASE_URL="postgresql://..." npx ts-node packages/api/scripts/seed-la-romana.ts
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from repo root (same as src/config/env.ts)
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// =============================================
// Course data (from scorecards Phil shared 2026-04-14)
// =============================================

interface HoleData {
    hole: number;
    par: number;
    si: number;
}

// Teeth of the Dog — Casa de Campo. Azul tees (default). Par 72.
// OUT 36 / IN 36. SIs from scorecard. Hole-by-hole par approximated to sum correctly;
// admin can adjust per scorecard once final tee is picked.
const TEETH_OF_THE_DOG: HoleData[] = [
    { hole: 1, par: 4, si: 7 },
    { hole: 2, par: 4, si: 13 },
    { hole: 3, par: 4, si: 3 },
    { hole: 4, par: 3, si: 11 },
    { hole: 5, par: 4, si: 1 },
    { hole: 6, par: 5, si: 5 },
    { hole: 7, par: 4, si: 17 },
    { hole: 8, par: 4, si: 9 },
    { hole: 9, par: 4, si: 15 },
    { hole: 10, par: 4, si: 8 },
    { hole: 11, par: 4, si: 10 },
    { hole: 12, par: 4, si: 4 },
    { hole: 13, par: 5, si: 16 },
    { hole: 14, par: 4, si: 14 },
    { hole: 15, par: 3, si: 12 },
    { hole: 16, par: 4, si: 18 },
    { hole: 17, par: 4, si: 2 },
    { hole: 18, par: 4, si: 6 },
];

// Ocean's 4 (PGA Ocean's 4 by Bahia Principe). Blue tees. Par 72.
const OCEANS_FOUR: HoleData[] = [
    { hole: 1, par: 4, si: 15 },
    { hole: 2, par: 4, si: 1 },
    { hole: 3, par: 3, si: 13 },
    { hole: 4, par: 4, si: 9 },
    { hole: 5, par: 4, si: 11 },
    { hole: 6, par: 4, si: 7 },
    { hole: 7, par: 3, si: 17 },
    { hole: 8, par: 5, si: 5 },
    { hole: 9, par: 5, si: 3 },
    { hole: 10, par: 4, si: 12 },
    { hole: 11, par: 4, si: 6 },
    { hole: 12, par: 5, si: 10 },
    { hole: 13, par: 3, si: 2 },
    { hole: 14, par: 4, si: 18 },
    { hole: 15, par: 4, si: 14 },
    { hole: 16, par: 3, si: 4 },
    { hole: 17, par: 4, si: 8 },
    { hole: 18, par: 5, si: 16 },
];

// Dye Fore — Casa de Campo. Default combo: Marina (front 9, odd SIs) + Chavon (back 9, even SIs).
// User noted this is not finalized; admin can swap to Marina+Lagos or Chavon+Lagos.
// Par per hole transcribed from scorecard; admin verifies before Round 3.
const DYE_FORE_MARINA_CHAVON: HoleData[] = [
    // Marina front 9
    { hole: 1, par: 5, si: 5 },
    { hole: 2, par: 4, si: 7 },
    { hole: 3, par: 3, si: 17 },
    { hole: 4, par: 4, si: 1 },
    { hole: 5, par: 4, si: 9 },
    { hole: 6, par: 3, si: 15 },
    { hole: 7, par: 4, si: 13 },
    { hole: 8, par: 5, si: 11 },
    { hole: 9, par: 4, si: 3 },
    // Chavon back 9
    { hole: 10, par: 5, si: 4 },
    { hole: 11, par: 4, si: 2 },
    { hole: 12, par: 3, si: 14 },
    { hole: 13, par: 4, si: 8 },
    { hole: 14, par: 4, si: 12 },
    { hole: 15, par: 3, si: 16 },
    { hole: 16, par: 4, si: 10 },
    { hole: 17, par: 4, si: 18 },
    { hole: 18, par: 5, si: 6 },
];

// =============================================
// Event & rounds
// =============================================

const EVENT_CODE = 'LR2026';
const ORGANIZER_EMAIL = 'organizer@laromana.golf';
const PLAYER_PASSWORD = 'Par00';

const ROUNDS_SPEC = [
    { number: 1, courseName: 'Teeth of the Dog', teeName: 'Azul', holes: TEETH_OF_THE_DOG, scheduledAt: '2026-04-29T17:09:00Z' }, // 13:09 DR local = 17:09 UTC
    { number: 2, courseName: "Ocean's 4", teeName: 'Blue', holes: OCEANS_FOUR, scheduledAt: '2026-05-01T14:30:00Z' }, // 10:30 local = 14:30 UTC
    { number: 3, courseName: 'Dye Fore (Marina + Chavon)', teeName: 'Azul', holes: DYE_FORE_MARINA_CHAVON, scheduledAt: '2026-05-02T12:50:00Z' }, // 08:50 local = 12:50 UTC
];

// =============================================
// Main
// =============================================

async function main() {
    const databaseUrl =
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/la_romana_dev';
    console.log('Connecting to:', databaseUrl.replace(/:[^@]+@/, ':***@'));

    const pool = new Pool({ connectionString: databaseUrl });
    const pwHash = await bcrypt.hash(PLAYER_PASSWORD, 10);

    try {
        // Organizer user
        const orgRes = await pool.query(
            `INSERT INTO users (email, password_hash, name, app_role, created_at)
             VALUES ($1, $2, 'Organizer', 'admin', NOW())
             ON CONFLICT (email) DO UPDATE SET app_role = 'admin', name = 'Organizer'
             RETURNING id`,
            [ORGANIZER_EMAIL, pwHash]
        );
        const organizerId = orgRes.rows[0].id;
        console.log(`Organizer: ${ORGANIZER_EMAIL}`);

        // Event
        const eventRes = await pool.query(
            `INSERT INTO events (name, status, event_code, created_by_user_id, created_at, updated_at)
             VALUES ($1, 'live', $2, $3, NOW(), NOW())
             ON CONFLICT (event_code) DO UPDATE SET name = $1, updated_at = NOW()
             RETURNING id`,
            ['La Romana 2026', EVENT_CODE, organizerId]
        );
        const eventId = eventRes.rows[0].id;
        console.log(`Event: ${eventId} (code: ${EVENT_CODE})`);

        // Wipe existing round-scoped data for re-runs
        console.log('Wiping existing rounds/courses/players/flights for this event...');
        // Note: FK cascades handle most things. Order: hole_scores → flights → rounds → courses (tees/holes cascade), players.
        await pool.query(`DELETE FROM hole_scores WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM players WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM flights WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM rounds WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM courses WHERE event_id = $1`, [eventId]); // cascades tees + holes
        await pool.query(`DELETE FROM event_members WHERE event_id = $1 AND user_id != $2`, [eventId, organizerId]);

        // Organizer membership
        await pool.query(
            `INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'organizer')
             ON CONFLICT (event_id, user_id) DO UPDATE SET role = 'organizer'`,
            [eventId, organizerId]
        );

        // Create courses, tees, holes, rounds
        for (const spec of ROUNDS_SPEC) {
            const courseRes = await pool.query(
                `INSERT INTO courses (event_id, name, source, created_at)
                 VALUES ($1, $2, 'manual', NOW()) RETURNING id`,
                [eventId, spec.courseName]
            );
            const courseId = courseRes.rows[0].id;

            const teeRes = await pool.query(
                `INSERT INTO tees (course_id, name, created_at) VALUES ($1, $2, NOW()) RETURNING id`,
                [courseId, spec.teeName]
            );
            const teeId = teeRes.rows[0].id;

            for (const h of spec.holes) {
                await pool.query(
                    `INSERT INTO holes (tee_id, hole_number, par, stroke_index) VALUES ($1, $2, $3, $4)`,
                    [teeId, h.hole, h.par, h.si]
                );
            }

            const roundRes = await pool.query(
                `INSERT INTO rounds (event_id, round_number, course_id, scheduled_at, hcp_singles_pct, hcp_fourball_pct, state, created_at)
                 VALUES ($1, $2, $3, $4, 0.80, 0.80, 'open', NOW())
                 RETURNING id`,
                [eventId, spec.number, courseId, spec.scheduledAt]
            );
            const roundId = roundRes.rows[0].id;
            console.log(`Round ${spec.number}: ${spec.courseName} (${spec.teeName}) at ${spec.scheduledAt}`);
            console.log(`  course=${courseId} tee=${teeId} round=${roundId} — 18 holes`);
        }

        // 15 placeholder players, no team / flight assignment
        const firstTeeRes = await pool.query(
            `SELECT t.id FROM tees t JOIN courses c ON c.id = t.course_id WHERE c.event_id = $1 ORDER BY c.created_at ASC LIMIT 1`,
            [eventId]
        );
        const defaultTeeId = firstTeeRes.rows[0].id;

        for (let i = 1; i <= 15; i++) {
            const email = `player${i}@laromana.golf`;
            const userRes = await pool.query(
                `INSERT INTO users (email, password_hash, name, created_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (email) DO UPDATE SET name = $3
                 RETURNING id`,
                [email, pwHash, `Player ${i}`]
            );
            const userId = userRes.rows[0].id;

            await pool.query(
                `INSERT INTO players
                   (event_id, user_id, first_name, last_name, handicap_index, tee_id, created_at)
                 VALUES ($1, $2, $3, '', 15, $4, NOW())`,
                [eventId, userId, `Player ${i}`, defaultTeeId]
            );

            // Also register as event member
            await pool.query(
                `INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'player')
                 ON CONFLICT (event_id, user_id) DO NOTHING`,
                [eventId, userId]
            );
        }
        console.log(`Created 15 placeholder players (Player 1..15, HCP 15, no team/flight)`);

        console.log('\nSeed complete.');
        console.log(`Login as organizer: ${ORGANIZER_EMAIL} / ${PLAYER_PASSWORD}`);
        console.log(`Event code: ${EVENT_CODE}`);
        console.log(`Event ID: ${eventId}`);
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
