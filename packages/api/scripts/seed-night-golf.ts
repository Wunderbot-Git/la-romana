/**
 * seed-night-golf.ts
 *
 * Creates a separate side-event for the 9-hole par-3 night-golf round at La Romana.
 * Independent of the main LR2026 event — its own course, round, players (linked to
 * the existing user accounts from LR2026) and rankings.
 *
 * Reuses every user already on LR2026 so the same login works for both events.
 * The new event shows up automatically in the EventSwitcher dropdown.
 *
 * Course data shared by Phil 2026-04-30:
 *   - 3 tees (Blue / White / Red), 9 holes, par 3 each (all yardages 91–218y)
 *   - SIs 1, 3, 5, 7, 9, 11, 13, 15, 17 across holes 1-9 (sequential mapping)
 *
 * Run (locally or against production via gcloud sql proxy):
 *   DATABASE_URL="postgresql://..." npx ts-node packages/api/scripts/seed-night-golf.ts
 *
 * Idempotent: re-running wipes only THIS event's course/round/players (event_code = 'LRNIGHT').
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

// =============================================
// Course data — par-3 9-hole night course
// =============================================

interface HoleData {
    hole: number;
    par: number;
    si: number;       // shares the 18-hole index space (odd values only on the 9 holes)
    blueYards: number;
    whiteYards: number;
    redYards: number;
}

// Sequential SI mapping (hole N → SI 2N-1). Admin can re-order via overrides
// once the official scorecard difficulty ranking is known.
const NIGHT_HOLES: HoleData[] = [
    { hole: 1, par: 3, si: 1,  blueYards: 116, whiteYards: 107, redYards: 98  },
    { hole: 2, par: 3, si: 3,  blueYards: 189, whiteYards: 176, redYards: 151 },
    { hole: 3, par: 3, si: 5,  blueYards: 120, whiteYards: 113, redYards: 105 },
    { hole: 4, par: 3, si: 7,  blueYards: 159, whiteYards: 144, redYards: 127 },
    { hole: 5, par: 3, si: 9,  blueYards: 139, whiteYards: 125, redYards: 106 },
    { hole: 6, par: 3, si: 11, blueYards: 115, whiteYards: 105, redYards: 91  },
    { hole: 7, par: 3, si: 13, blueYards: 155, whiteYards: 149, redYards: 139 },
    { hole: 8, par: 3, si: 15, blueYards: 152, whiteYards: 139, redYards: 120 },
    { hole: 9, par: 3, si: 17, blueYards: 218, whiteYards: 176, redYards: 147 },
];

// The schema doesn't carry per-hole yardages, so HoleData.*Yards is documentation
// only — the real yardages live in the comment block above each tee for the
// admin's reference.
interface TeeSpec {
    name: string;
    courseRating: number;
    slopeRating: number;
}

const TEES: TeeSpec[] = [
    { name: 'Blue',    courseRating: 54.6, slopeRating: 87 },   // 1,363y
    { name: 'White',   courseRating: 53.8, slopeRating: 86 },   // 1,234y
    { name: 'Red',     courseRating: 51.5, slopeRating: 83 },   // 1,084y (men)
    { name: 'Red (W)', courseRating: 57.0, slopeRating: 89 },   // 1,084y (women)
];

// =============================================
// Event config
// =============================================

const EVENT_CODE = 'LRNIGHT';
const EVENT_NAME = 'Night Golf 9H';
const COURSE_NAME = 'La Romana Par-3 (Night)';
const DEFAULT_TEE = 'Blue';
const SCHEDULED_AT = '2026-04-30T23:00:00Z';   // 19:00 DR local on Apr 30 (placeholder; admin edits in UI)
const SOURCE_EVENT_CODE = 'LR2026';            // pull players from here

// =============================================
// Main
// =============================================

async function main() {
    const databaseUrl =
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/la_romana_dev';
    console.log('Connecting to:', databaseUrl.replace(/:[^@]+@/, ':***@'));

    const pool = new Pool({ connectionString: databaseUrl });

    try {
        // ── Resolve source event (LR2026) — we copy its organizer + roster ─
        const srcEv = await pool.query(
            `SELECT id, created_by_user_id FROM events WHERE event_code = $1`,
            [SOURCE_EVENT_CODE],
        );
        if (srcEv.rows.length === 0) {
            throw new Error(`Source event '${SOURCE_EVENT_CODE}' not found — seed LR2026 first.`);
        }
        const sourceEventId: string = srcEv.rows[0].id;
        const organizerId: string = srcEv.rows[0].created_by_user_id;
        console.log(`Source event: ${SOURCE_EVENT_CODE} = ${sourceEventId}`);

        // ── Upsert night-event ─────────────────────────────────────────────
        const eventRes = await pool.query(
            `INSERT INTO events (name, status, event_code, created_by_user_id, created_at, updated_at)
             VALUES ($1, 'live', $2, $3, NOW(), NOW())
             ON CONFLICT (event_code) DO UPDATE SET name = $1, updated_at = NOW()
             RETURNING id`,
            [EVENT_NAME, EVENT_CODE, organizerId],
        );
        const eventId: string = eventRes.rows[0].id;
        console.log(`Night event: ${eventId} (code: ${EVENT_CODE})`);

        // ── Wipe THIS event's data for re-runs (LR2026 untouched) ──────────
        console.log('Wiping existing night-event data for re-run …');
        await pool.query(`DELETE FROM hole_scores WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM players WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM flights WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM rounds WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM courses WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM event_members WHERE event_id = $1 AND user_id != $2`, [eventId, organizerId]);

        // Organizer membership
        await pool.query(
            `INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'organizer')
             ON CONFLICT (event_id, user_id) DO UPDATE SET role = 'organizer'`,
            [eventId, organizerId],
        );

        // ── Course + tees + holes ──────────────────────────────────────────
        const courseRes = await pool.query(
            `INSERT INTO courses (event_id, name, source, created_at)
             VALUES ($1, $2, 'manual', NOW()) RETURNING id`,
            [eventId, COURSE_NAME],
        );
        const courseId: string = courseRes.rows[0].id;
        console.log(`Course: ${COURSE_NAME} = ${courseId}`);

        const teeIdByName: Record<string, string> = {};
        for (const tee of TEES) {
            const teeRes = await pool.query(
                `INSERT INTO tees (course_id, name, slope_rating, course_rating, created_at)
                 VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
                [courseId, tee.name, tee.slopeRating, tee.courseRating],
            );
            const teeId: string = teeRes.rows[0].id;
            teeIdByName[tee.name] = teeId;
            for (const h of NIGHT_HOLES) {
                await pool.query(
                    `INSERT INTO holes (tee_id, hole_number, par, stroke_index)
                     VALUES ($1, $2, $3, $4)`,
                    [teeId, h.hole, h.par, h.si],
                );
            }
            console.log(`  Tee ${tee.name}: rating ${tee.courseRating}/${tee.slopeRating}, ${NIGHT_HOLES.length} holes`);
        }

        // ── Round ──────────────────────────────────────────────────────────
        const roundRes = await pool.query(
            `INSERT INTO rounds
                (event_id, round_number, course_id, scheduled_at,
                 hcp_singles_pct, hcp_fourball_pct, holes_per_round, state, created_at)
             VALUES ($1, 1, $2, $3, 0.80, 0.80, 9, 'open', NOW())
             RETURNING id`,
            [eventId, courseId, SCHEDULED_AT],
        );
        const roundId: string = roundRes.rows[0].id;
        console.log(`Round 1: 9 holes, ${SCHEDULED_AT} = ${roundId}`);

        // ── Pull roster from LR2026 — same users, new players row per event ─
        const rosterRes = await pool.query(
            `SELECT user_id, first_name, last_name, handicap_index, team
             FROM players
             WHERE event_id = $1
             ORDER BY first_name`,
            [sourceEventId],
        );
        const defaultTeeId = teeIdByName[DEFAULT_TEE];
        let rosterCount = 0;
        for (const r of rosterRes.rows as { user_id: string | null; first_name: string; last_name: string; handicap_index: string | number; team: 'red' | 'blue' | null }[]) {
            await pool.query(
                `INSERT INTO players
                    (event_id, user_id, first_name, last_name, handicap_index, team, tee_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [eventId, r.user_id, r.first_name, r.last_name, r.handicap_index, r.team, defaultTeeId],
            );
            if (r.user_id) {
                await pool.query(
                    `INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'player')
                     ON CONFLICT (event_id, user_id) DO NOTHING`,
                    [eventId, r.user_id],
                );
            }
            rosterCount++;
        }
        console.log(`Roster: copied ${rosterCount} players from ${SOURCE_EVENT_CODE}`);

        console.log('\nNight-event seed complete.');
        console.log(`Event code: ${EVENT_CODE}`);
        console.log(`Event ID:   ${eventId}`);
        console.log(`Default tee: ${DEFAULT_TEE} (admin can change per player)`);
        console.log('\nFlights are NOT created here — assign in the admin UI ' +
            `(/admin/events/${eventId}/rounds/${roundId}/flights).`);
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
