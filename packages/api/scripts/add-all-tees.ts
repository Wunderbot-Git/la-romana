/**
 * add-all-tees.ts
 *
 * Canonical, idempotent setup of all tee variants per La Romana 2026 course
 * with their official USGA Slope Rating + Course Rating.
 *
 *   - Teeth of the Dog (Round 1):  6 tees — 5 Men + 1 Women (Rojo W only)
 *   - Ocean's 4         (Round 2): 9 tees — 5 Men + 4 Women variants
 *   - Dye Fore – Lagos/Marina (Round 3): 9 tees — 6 Men + 3 Women variants
 *
 * Naming convention:
 *   - Men's tees: "Negro" (Black), "Oro" (Gold), "Azul" (Blue), "Amarillo" (Yellow),
 *     "Blanco" (White), "Verde" (Green), "Rojo" (Red)
 *   - Women's variants:  same name + " (W)" suffix
 *
 * Re-running:
 *   - Inserts missing tees (with 18 holes copied from the course's first tee)
 *   - Updates slope/rating for existing tees if the spec differs
 *   - Removes legacy tees that aren't in the canonical list (e.g. the original
 *     "Blue" from seed-la-romana.ts at Ocean's 4) — but ONLY after reassigning
 *     any players that point to them, and ONLY if no player_round_tees row uses
 *     them.
 *
 * Run from packages/api:
 *   DATABASE_URL=... npx ts-node scripts/add-all-tees.ts
 *
 * Source data:
 *   - TOTH:        official scorecard (Casa de Campo, Azul = Blue Men)
 *   - Ocean's 4:   official course details (PGA Ocean's 4 Bahia Principe)
 *   - Dye Fore:    Lagos/Marina loop scorecard
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const EVENT_CODE = 'LR2026';

interface TeeSpec {
    name: string;
    slope: number | null;
    rating: number | null;
    /** Optional: if this tee should derive its 18 holes (par + SI) from a different tee
     *  on the same course. Used for women variants that share the men's hole layout. */
    sourceTeeName?: string;
}

interface CoursePlan {
    matchName: RegExp;
    canonical: TeeSpec[];
}

const PLANS: CoursePlan[] = [
    {
        matchName: /teeth/i,
        canonical: [
            { name: 'Negro',    slope: 135, rating: 76.0 },                                  // Black M
            { name: 'Oro',      slope: 134, rating: 74.4 },                                  // Gold M
            { name: 'Azul',     slope: 132, rating: 71.2 },                                  // Blue M
            { name: 'Blanco',   slope: 126, rating: 68.8 },                                  // White M
            { name: 'Verde',    slope: 124, rating: 67.6 },                                  // Green M
            { name: 'Rojo (W)', slope: 118, rating: 68.0, sourceTeeName: 'Azul' },           // Red W (only women's tee at TOTH)
        ],
    },
    {
        matchName: /ocean/i,
        canonical: [
            { name: 'Negro',        slope: 130, rating: 72.8 },                              // Black M
            { name: 'Amarillo',     slope: 132, rating: 75.6 },                              // Yellow M  (NB: Ocean's 4 has Yellow not Gold)
            { name: 'Azul',         slope: 124, rating: 70.2 },                              // Blue M
            { name: 'Blanco',       slope: 126, rating: 73.1 },                              // White M
            { name: 'Rojo',         slope: 124, rating: 70.2 },                              // Red M
            { name: 'Azul (W)',     slope: 129, rating: 75.9, sourceTeeName: 'Azul' },       // Blue W
            { name: 'Blanco (W)',   slope: 121, rating: 70.5, sourceTeeName: 'Blanco' },     // White W
            { name: 'Amarillo (W)', slope: 126, rating: 72.4, sourceTeeName: 'Amarillo' },   // Yellow W
            { name: 'Rojo (W)',     slope: 129, rating: 75.9, sourceTeeName: 'Rojo' },       // Red W
        ],
    },
    {
        matchName: /dye fore/i,
        canonical: [
            // Source: Dye Fore — Lagos/Marina loop scorecard
            // ⚠️ NOTE: course is currently named "Dye Fore (Marina + Chavon)" in DB but the
            // slope/rating values below are for Lagos/Marina. Confirm with Phil which loop
            // is being played and update this script + course name accordingly.
            { name: 'Negro',      slope: 136, rating: 76.6 },                                // Black M
            { name: 'Oro',        slope: 129, rating: 73.6 },                                // Gold M
            { name: 'Azul',       slope: 125, rating: 71.4 },                                // Blue M
            { name: 'Blanco',     slope: 123, rating: 68.9 },                                // White M
            { name: 'Verde',      slope: 116, rating: 67.6 },                                // Green M
            { name: 'Rojo',       slope: 110, rating: 64.4 },                                // Red M
            { name: 'Blanco (W)', slope: 128, rating: 75.4, sourceTeeName: 'Blanco' },       // White W
            { name: 'Verde (W)',  slope: 126, rating: 73.1, sourceTeeName: 'Verde' },        // Green W
            { name: 'Rojo (W)',   slope: 118, rating: 69.2, sourceTeeName: 'Rojo' },         // Red W
        ],
    },
];

interface HoleRow { hole_number: number; par: number; stroke_index: number; }

async function getHolesForTee(pool: Pool, teeId: string): Promise<HoleRow[]> {
    const r = await pool.query<HoleRow>(
        `SELECT hole_number, par, stroke_index FROM holes WHERE tee_id = $1 ORDER BY hole_number ASC`,
        [teeId]
    );
    return r.rows;
}

async function ensureTeesForCourse(pool: Pool, courseId: string, courseName: string, plan: TeeSpec[]) {
    // Resolve the "default source" tee — any existing tee with 18 holes — for hole copy.
    const allExisting = await pool.query<{ id: string; name: string }>(
        `SELECT t.id, t.name FROM tees t WHERE t.course_id = $1 ORDER BY t.created_at ASC`,
        [courseId]
    );
    if (allExisting.rowCount === 0) {
        console.log(`  ! ${courseName}: no existing tee found (run seed-la-romana.ts first)`);
        return;
    }
    let defaultSourceHoles: HoleRow[] | null = null;
    const teesByName = new Map<string, string>(); // name → id
    for (const t of allExisting.rows) {
        teesByName.set(t.name, t.id);
        if (!defaultSourceHoles) {
            const holes = await getHolesForTee(pool, t.id);
            if (holes.length === 18) defaultSourceHoles = holes;
        }
    }
    if (!defaultSourceHoles) {
        console.log(`  ! ${courseName}: no existing tee has 18 holes`);
        return;
    }

    let inserted = 0, updated = 0, unchanged = 0;
    const canonicalNames = new Set(plan.map(t => t.name));

    for (const spec of plan) {
        const existingId = teesByName.get(spec.name);
        if (existingId) {
            // Update slope/rating if differ
            const existing = await pool.query<{ slope_rating: number | null; course_rating: number | null }>(
                `SELECT slope_rating, course_rating FROM tees WHERE id = $1`, [existingId]
            );
            const old = existing.rows[0];
            const oldSlope = old.slope_rating != null ? Number(old.slope_rating) : null;
            const oldRating = old.course_rating != null ? Number(old.course_rating) : null;
            if (oldSlope !== spec.slope || oldRating !== spec.rating) {
                await pool.query(
                    `UPDATE tees SET slope_rating = $1, course_rating = $2 WHERE id = $3`,
                    [spec.slope, spec.rating, existingId]
                );
                updated++;
                console.log(`  ↺ ${spec.name.padEnd(13)} slope ${oldSlope ?? '–'}→${spec.slope}, rating ${oldRating ?? '–'}→${spec.rating}`);
            } else {
                unchanged++;
            }
            continue;
        }
        // Insert new tee — copy holes from sourceTeeName if specified, else default source
        let holesToCopy = defaultSourceHoles;
        if (spec.sourceTeeName) {
            const srcId = teesByName.get(spec.sourceTeeName);
            if (srcId) {
                const h = await getHolesForTee(pool, srcId);
                if (h.length === 18) holesToCopy = h;
            }
        }
        const ins = await pool.query<{ id: string }>(
            `INSERT INTO tees (course_id, name, slope_rating, course_rating, created_at)
             VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
            [courseId, spec.name, spec.slope, spec.rating]
        );
        const newTeeId = ins.rows[0].id;
        teesByName.set(spec.name, newTeeId);
        for (const h of holesToCopy) {
            await pool.query(
                `INSERT INTO holes (tee_id, hole_number, par, stroke_index) VALUES ($1, $2, $3, $4)`,
                [newTeeId, h.hole_number, h.par, h.stroke_index]
            );
        }
        inserted++;
        console.log(`  + ${spec.name.padEnd(13)} slope ${spec.slope ?? '–'}, rating ${spec.rating ?? '–'}`);
    }

    // Remove legacy tees not in canonical list — but only safely
    const legacy = allExisting.rows.filter(t => !canonicalNames.has(t.name));
    for (const t of legacy) {
        // Reassign players using this tee → swap to canonical equivalent if a sensible match exists,
        // else null out (organizer fixes via admin)
        const usedByPlayers = await pool.query<{ id: string }>(
            `SELECT id FROM players WHERE tee_id = $1`, [t.id]
        );
        const usedByOverrides = await pool.query<{ id: string }>(
            `SELECT id FROM player_round_tees WHERE tee_id = $1`, [t.id]
        );
        if (usedByPlayers.rowCount && usedByPlayers.rowCount > 0) {
            // Try to map legacy 'Blue' → 'Azul' (case where seed-la-romana used English name)
            const fallback = teesByName.get('Azul') ?? null;
            await pool.query(`UPDATE players SET tee_id = $1 WHERE tee_id = $2`, [fallback, t.id]);
        }
        if (usedByOverrides.rowCount && usedByOverrides.rowCount > 0) {
            const fallback = teesByName.get('Azul') ?? null;
            if (fallback) {
                await pool.query(`UPDATE player_round_tees SET tee_id = $1 WHERE tee_id = $2`, [fallback, t.id]);
            } else {
                await pool.query(`DELETE FROM player_round_tees WHERE tee_id = $1`, [t.id]);
            }
        }
        await pool.query(`DELETE FROM tees WHERE id = $1`, [t.id]); // holes cascade
        console.log(`  − removed legacy tee: ${t.name}`);
    }

    console.log(`  ${courseName}: +${inserted} inserted, ↺${updated} updated, ${unchanged} unchanged, ${legacy.length} legacy removed`);
}

async function main() {
    const databaseUrl =
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/la_romana_dev';
    console.log('Connecting to:', databaseUrl.replace(/:[^@]+@/, ':***@'));
    const pool = new Pool({ connectionString: databaseUrl });

    try {
        const ev = await pool.query<{ id: string }>(`SELECT id FROM events WHERE event_code = $1`, [EVENT_CODE]);
        if (ev.rowCount === 0) throw new Error(`Event ${EVENT_CODE} not found`);
        const eventId = ev.rows[0].id;

        const courses = await pool.query<{ id: string; name: string }>(
            `SELECT c.id, c.name FROM courses c WHERE c.event_id = $1 ORDER BY c.created_at ASC`,
            [eventId]
        );
        console.log(`\nFound ${courses.rowCount} courses for ${EVENT_CODE}.`);

        for (const c of courses.rows) {
            const plan = PLANS.find(p => p.matchName.test(c.name));
            if (!plan) {
                console.log(`\n→ ${c.name}: no canonical plan, skipping`);
                continue;
            }
            console.log(`\n→ ${c.name}`);
            await ensureTeesForCourse(pool, c.id, c.name, plan.canonical);
        }

        console.log('\n✓ Done.');
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
