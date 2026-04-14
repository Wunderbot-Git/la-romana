/**
 * seed-roster.ts
 *
 * Inserts the 5 real player groups into the production database.
 * Includes Fundadores course with real par/SI values and separate Men/Women tees.
 * Idempotent — safe to re-run, will replace existing flights/players for the event.
 *
 * Run (from repo root):
 *   DATABASE_URL="postgresql://..." npx ts-node seed-roster.ts
 *
 * HCPs are set per player in the GROUPS array below.
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

import 'dotenv/config';

// Strip accents: Vélez → Velez, Tomás → Tomas, Gaitán → Gaitan
const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ── COURSE DATA ─────────────────────────────────────────────────────────────
// Fundadores course — 18 holes with separate stroke indexes for Men and Women
const COURSE_HOLES = [
    { hole: 1,  par: 4, siMen: 3,  siWomen: 3 },
    { hole: 2,  par: 5, siMen: 9,  siWomen: 9 },
    { hole: 3,  par: 4, siMen: 17, siWomen: 17 },
    { hole: 4,  par: 4, siMen: 15, siWomen: 11 },
    { hole: 5,  par: 3, siMen: 7,  siWomen: 5 },
    { hole: 6,  par: 4, siMen: 5,  siWomen: 15 },
    { hole: 7,  par: 3, siMen: 13, siWomen: 13 },
    { hole: 8,  par: 5, siMen: 11, siWomen: 7 },
    { hole: 9,  par: 4, siMen: 1,  siWomen: 1 },
    { hole: 10, par: 5, siMen: 10, siWomen: 6 },
    { hole: 11, par: 4, siMen: 2,  siWomen: 2 },
    { hole: 12, par: 3, siMen: 4,  siWomen: 10 },
    { hole: 13, par: 4, siMen: 6,  siWomen: 4 },
    { hole: 14, par: 4, siMen: 16, siWomen: 12 },
    { hole: 15, par: 3, siMen: 18, siWomen: 18 },
    { hole: 16, par: 4, siMen: 14, siWomen: 14 },
    { hole: 17, par: 4, siMen: 8,  siWomen: 16 },
    { hole: 18, par: 5, siMen: 12, siWomen: 8 },
];

// Ventaja Mixta — mixed scramble stroke indexes for back 9 (holes 10-18)
// Used when teams have both men and women playing scramble together
const SCRAMBLE_MIXED_SI = [
    { hole: 10, si: 8 },
    { hole: 11, si: 2 },
    { hole: 12, si: 4 },
    { hole: 13, si: 5 },
    { hole: 14, si: 16 },
    { hole: 15, si: 18 },
    { hole: 16, si: 14 },
    { hole: 17, si: 12 },
    { hole: 18, si: 11 },
];

// ── ROSTER ────────────────────────────────────────────────────────────────────
// Each group: { blue: [Pos1, Pos2], red: [Pos1, Pos2] }
// blue = Pitufos (left side in cards, gold border)
// red  = Cariñositos (right side in cards, pink border)
// Each player: [name, handicap_index]
type PlayerEntry = [string, number];
const GROUPS: Array<{ blue: [PlayerEntry, PlayerEntry]; red: [PlayerEntry, PlayerEntry] }> = [
    { blue: [['Vélez', 16],  ['Rocha', 27]],    red: [['Adri', 13],      ['Camilo', 26]]   }, // Group 1
    { blue: [['Tomás', 11],  ['Burrowes', 11]], red: [['Fito', 8],       ['Herrera', 13]]  }, // Group 2
    { blue: [['Ana', 11],    ['Fercho', 14]],   red: [['Camacho', 11],   ['Manu', 15]]     }, // Group 3
    { blue: [['Pulido', 3],  ['Phil', 8]],      red: [['Pocho', 5],      ['Gaitán', 21]]   }, // Group 4
    { blue: [['Vargas', 11], ['Luca', 11]],      red: [['Sardi', 14],     ['Bernie', 18]]   }, // Group 5
];

// Women players use the "Mujeres" tee (different stroke indexes)
const WOMEN_PLAYERS = ['Ana', 'Adri', 'Manu', 'Rocha'];

const EVENT_CODE = 'PC2026';

async function main() {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ryder_cup_dev';
    console.log('Connecting to:', databaseUrl.replace(/:[^@]+@/, ':***@'));

    const pool = new Pool({ connectionString: databaseUrl });
    const playerPasswordHash = await bcrypt.hash('Par00', 10);
    const adminPasswordHash = await bcrypt.hash('Admin', 10);

    try {
        // ── Create admin user ───────────────────────────────────────────────
        await pool.query(
            `INSERT INTO users (email, password_hash, name, app_role, created_at)
             VALUES ($1, $2, 'Admin', 'admin', NOW())
             ON CONFLICT (email) DO UPDATE SET password_hash = $2, app_role = 'admin', name = 'Admin'
             RETURNING id`,
            ['admin@par00.com', adminPasswordHash]
        );
        console.log('Admin user: admin@par00.com / Admin');

        // ── Ensure organizer user ─────────────────────────────────────────────
        const orgRes = await pool.query(
            `INSERT INTO users (email, password_hash, name, app_role, created_at)
             VALUES ($1, $2, 'Organizer', 'admin', NOW())
             ON CONFLICT (email) DO UPDATE SET app_role = 'admin', name = 'Organizer'
             RETURNING id`,
            ['organizer@par00.com', playerPasswordHash]
        );
        const organizerId = orgRes.rows[0].id;

        // ── Ensure event ──────────────────────────────────────────────────────
        const eventRes = await pool.query(
            `INSERT INTO events (name, status, event_code, created_by_user_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             ON CONFLICT (event_code) DO UPDATE SET name = $1, updated_at = NOW()
             RETURNING id`,
            ['Pitufos Carinositos 2026', 'live', EVENT_CODE, organizerId]
        );
        const eventId = eventRes.rows[0].id;
        console.log(`Event: ${eventId} (code: ${EVENT_CODE})`);

        // ── Create course with two tees ─────────────────────────────────────
        const courseRes = await pool.query(
            `INSERT INTO courses (event_id, name, source, created_at)
             VALUES ($1, $2, 'manual', NOW())
             ON CONFLICT (event_id) DO UPDATE SET name = $2
             RETURNING id`,
            [eventId, 'Fundadores']
        );
        const courseId = courseRes.rows[0].id;

        // Delete existing tees/holes for clean re-seed
        const existingTees = await pool.query(`SELECT id FROM tees WHERE course_id = $1`, [courseId]);
        for (const t of existingTees.rows) {
            await pool.query(`DELETE FROM holes WHERE tee_id = $1`, [t.id]);
        }
        await pool.query(`DELETE FROM tees WHERE course_id = $1`, [courseId]);

        // Create "Hombres" tee (Men's stroke indexes)
        const menTeeRes = await pool.query(
            `INSERT INTO tees (course_id, name, created_at) VALUES ($1, 'Hombres', NOW()) RETURNING id`,
            [courseId]
        );
        const menTeeId = menTeeRes.rows[0].id;

        for (const h of COURSE_HOLES) {
            await pool.query(
                `INSERT INTO holes (tee_id, hole_number, par, stroke_index) VALUES ($1, $2, $3, $4)`,
                [menTeeId, h.hole, h.par, h.siMen]
            );
        }
        console.log(`Created "Hombres" tee: ${menTeeId} (18 holes)`);

        // Create "Mujeres" tee (Women's stroke indexes)
        const womenTeeRes = await pool.query(
            `INSERT INTO tees (course_id, name, created_at) VALUES ($1, 'Mujeres', NOW()) RETURNING id`,
            [courseId]
        );
        const womenTeeId = womenTeeRes.rows[0].id;

        for (const h of COURSE_HOLES) {
            await pool.query(
                `INSERT INTO holes (tee_id, hole_number, par, stroke_index) VALUES ($1, $2, $3, $4)`,
                [womenTeeId, h.hole, h.par, h.siWomen]
            );
        }
        console.log(`Created "Mujeres" tee: ${womenTeeId} (18 holes)`);

        // Clean slate for this event's flights/players/scores
        console.log('Clearing existing data...');
        await pool.query(`DELETE FROM scramble_team_scores WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM hole_scores WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM players WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM flights WHERE event_id = $1`, [eventId]);

        let totalPlayers = 0;

        for (let i = 0; i < GROUPS.length; i++) {
            const group = GROUPS[i];
            const flightNumber = i + 1;

            // Create flight (not_started state — scores will be entered during play)
            const flightRes = await pool.query(
                `INSERT INTO flights (event_id, flight_number, front_state, back_state, created_at)
                 VALUES ($1, $2, 'open', 'open', NOW())
                 RETURNING id`,
                [eventId, flightNumber]
            );
            const flightId = flightRes.rows[0].id;
            console.log(`  Flight ${flightNumber}: ${flightId}`);

            // Insert players: blue (Pitufos) positions 1 & 2, then red (Cariñositos) 1 & 2
            const insertPlayer = async ([name, hcp]: PlayerEntry, team: 'blue' | 'red', position: number) => {
                const [firstName, ...rest] = name.split(' ');
                const lastName = rest.join(' ') || '-';
                const email = `${stripAccents(name).toLowerCase().replace(/[^a-z0-9]/g, '.')}@par00.com`;
                const teeId = WOMEN_PLAYERS.includes(name) ? womenTeeId : menTeeId;

                const userRes = await pool.query(
                    `INSERT INTO users (email, password_hash, name, created_at)
                     VALUES ($1, $2, $3, NOW())
                     ON CONFLICT (email) DO UPDATE SET email = $1
                     RETURNING id`,
                    [email, playerPasswordHash, name]
                );
                const userId = userRes.rows[0].id;

                await pool.query(
                    `INSERT INTO players
                       (event_id, user_id, first_name, last_name, handicap_index, team, flight_id, position, tee_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                    [eventId, userId, firstName, lastName, hcp, team, flightId, position, teeId]
                );
                const teeLabel = WOMEN_PLAYERS.includes(name) ? 'Mujeres' : 'Hombres';
                console.log(`    ${team === 'blue' ? '🔵' : '🔴'} ${name} (HCP ${hcp}, ${teeLabel}) — Pos ${position}`);
                totalPlayers++;
            };

            await insertPlayer(group.blue[0], 'blue', 1);
            await insertPlayer(group.blue[1], 'blue', 2);
            await insertPlayer(group.red[0],  'red',  1);
            await insertPlayer(group.red[1],  'red',  2);
        }

        // ── Seed mixed scramble stroke indexes (Ventaja Mixta) ────────────
        await pool.query(`DELETE FROM mixed_scramble_stroke_index WHERE event_id = $1`, [eventId]);
        for (const { hole, si } of SCRAMBLE_MIXED_SI) {
            await pool.query(
                `INSERT INTO mixed_scramble_stroke_index (event_id, hole_number, stroke_index)
                 VALUES ($1, $2, $3)`,
                [eventId, hole, si]
            );
        }
        console.log(`Seeded ${SCRAMBLE_MIXED_SI.length} mixed scramble stroke indexes (Ventaja Mixta)`);

        console.log(`\n✅ Seeded ${GROUPS.length} flights and ${totalPlayers} players.`);
        console.log(`Event ID: ${eventId}`);
        console.log(`Course: Fundadores (${COURSE_HOLES.length} holes, 2 tees)`);
        console.log(`Admin: admin@par00.com / Admin`);

    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
