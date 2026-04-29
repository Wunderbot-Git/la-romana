/**
 * seed-test-data.ts
 *
 * Test-data seed for visual verification of the leaderboard.
 *
 * Sets up:
 *   - Real La Romana 2026 roster: 15 real players + 1 phantom (Fantasmas team needs 8)
 *   - 4 flights in Round 1 (Teeth of the Dog), 2 red + 2 blue per flight
 *   - Realistic hole scores covering 4 match-status flavors:
 *       Flight 1: ALL 18 holes played → 2 finals (1 red win, 1 fourball A/S)
 *       Flight 2: ALL 18 holes played → 2 finals (mixed)
 *       Flight 3: holes 1-12 played   → live (Piratas leading)
 *       Flight 4: holes 1-4 played    → live (very early)
 *   - Round 2 + Round 3: no flights yet → "empty" round state
 *
 * Run from packages/api:
 *   DATABASE_URL=postgresql://... npx ts-node scripts/seed-test-data.ts
 *
 * Idempotent: re-running wipes flights + scores + player assignments for the event
 * and rebuilds them. Player rows are upserted by (event_id, first_name).
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const EVENT_CODE = 'LR2026';
const PLAYER_PASSWORD = 'Par00';

// La Romana roster (from WhatsApp + CLAUDE.md)
type Team = 'red' | 'blue';
interface RosterEntry {
    name: string;       // first_name
    team: Team;         // red = Piratas, blue = Fantasmas
    hcp: number;
    /** Default tee name (e.g. 'Azul', 'Rojo (W)'). Resolved per-round to the
     *  matching tee on each round's course. Default: 'Azul'. */
    defaultTeeName?: string;
    isPhantom?: boolean;
}

const ROSTER: RosterEntry[] = [
    // Piratas (red) — 8 real
    { name: 'Manuela',  team: 'red',  hcp: 8.1, defaultTeeName: 'Rojo (W)' },
    { name: 'Pocho',    team: 'red',  hcp: 5.9 },
    { name: 'Mon',      team: 'red',  hcp: 16.2 },
    { name: 'Camacho',  team: 'red',  hcp: 8.9 },
    { name: 'Fercho',   team: 'red',  hcp: 13.5 },
    { name: 'Diego M',  team: 'red',  hcp: 13.6 },
    { name: 'Matiz',    team: 'red',  hcp: 18 },
    { name: 'Jaramillo',team: 'red',  hcp: 33 },
    // Fantasmas (blue) — 7 real + 1 phantom
    { name: 'Philipp',  team: 'blue', hcp: 7.2 },
    { name: 'Rocha',    team: 'blue', hcp: 19.5, defaultTeeName: 'Rojo (W)' },
    { name: 'Sáenz',    team: 'blue', hcp: 8.4 },
    { name: 'Burrowes', team: 'blue', hcp: 11.7 },
    { name: 'Berries',  team: 'blue', hcp: 12.8 },
    { name: 'Zuluaga',  team: 'blue', hcp: 1.3 },
    { name: 'Forero',   team: 'blue', hcp: 3.7 },
    // Phantom rule: HCP 0 + always plays par on every hole (no good days, no bad days).
    // The seed writes par-as-gross for every hole in every round he's in (see scoring loop below).
    { name: 'Fantasma', team: 'blue', hcp: 0, isPhantom: true },
];

// Default tee name when a roster entry doesn't override (men play from "Azul")
const DEFAULT_TEE_NAME = 'Azul';

// Flight composition: each flight has 2 red + 2 blue. Players listed by NAME from ROSTER.
// Position 1 vs 2 within team determines singles pairings.
interface FlightSpec {
    flightNumber: number;
    red:  [string, string];  // [position 1, position 2]
    blue: [string, string];  // [position 1, position 2]
}
const FLIGHTS: FlightSpec[] = [
    { flightNumber: 1, red: ['Manuela',  'Pocho'],   blue: ['Philipp',  'Rocha']    },
    { flightNumber: 2, red: ['Mon',      'Camacho'], blue: ['Sáenz',    'Burrowes'] },
    { flightNumber: 3, red: ['Fercho',   'Diego M'], blue: ['Berries',  'Zuluaga']  },
    { flightNumber: 4, red: ['Matiz',    'Jaramillo'], blue: ['Forero', 'Fantasma'] },
];

// =============================================
// Score generators
// =============================================

// Pars + SI for Teeth of the Dog (mirrors seed-la-romana.ts)
// Pars confirmed against the official Casa de Campo scorecard 2026-04-29.
const TOTH_PARS: number[] = [4,4,5,4,3,4,3,4,5,4,5,4,3,5,4,3,4,4]; // 18 holes
const TOTH_SIS:  number[] = [7,13,11,3,15,1,17,5,9,8,10,4,16,14,12,18,2,6]; // AZUL men's row

// Realistic gross score generator: based on player HCP, generate plausible per-hole scores.
// Scratch (HCP 0) → mostly par/birdie; HCP 24 → mostly bogey/double.
// We use a deterministic seed per player so re-runs are stable.
function rand(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return (s & 0xffffffff) / 0x100000000;
    };
}

function generateRoundGross(playerHcp: number, pars: number[], seed: number): number[] {
    const rng = rand(seed);
    return pars.map((par) => {
        // Expected score above par for this hole, given HCP:
        //   HCP 0  → expected ~0.05 over par
        //   HCP 12 → expected ~0.6 over par
        //   HCP 24 → expected ~1.2 over par
        const expectedOver = playerHcp / 20;
        // Add normal-ish noise via 2 dice
        const noise = (rng() + rng() - 1) * 1.4; // ±1.4
        const overPar = Math.max(-1, Math.round(expectedOver + noise));
        return Math.max(2, par + overPar); // never below 2
    });
}

// =============================================

async function main() {
    const databaseUrl =
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/la_romana_dev';
    console.log('Connecting to:', databaseUrl.replace(/:[^@]+@/, ':***@'));
    const pool = new Pool({ connectionString: databaseUrl });
    const pwHash = await bcrypt.hash(PLAYER_PASSWORD, 10);

    try {
        // Lookup event + organizer + Round 1 + default tee
        const eventRow = await pool.query(
            `SELECT id, created_by_user_id FROM events WHERE event_code = $1`,
            [EVENT_CODE]
        );
        if (eventRow.rowCount === 0) {
            throw new Error(`Event ${EVENT_CODE} not found — run seed-la-romana.ts first.`);
        }
        const eventId: string = eventRow.rows[0].id;
        const organizerId: string = eventRow.rows[0].created_by_user_id;

        // Load all rounds (we'll write per-round tee assignments in player_round_tees)
        const roundsRes = await pool.query<{ id: string; round_number: number; course_id: string }>(
            `SELECT id, round_number, course_id FROM rounds WHERE event_id = $1 ORDER BY round_number ASC`,
            [eventId]
        );
        if (roundsRes.rowCount === 0) throw new Error(`No rounds for ${EVENT_CODE} — run seed-la-romana.ts first.`);
        const allRounds = roundsRes.rows;
        const round1Row = allRounds.find(r => r.round_number === 1);
        if (!round1Row) throw new Error(`Round 1 not found for ${EVENT_CODE}`);
        const round1Id: string = round1Row.id;
        const round1CourseId: string = round1Row.course_id;

        // Load all tees per course → name → tee_id lookup (used for resolving each
        // player's defaultTeeName per round, and for player_round_tees writes).
        const teesRes = await pool.query<{ id: string; course_id: string; name: string }>(
            `SELECT t.id, t.course_id, t.name FROM tees t WHERE t.course_id = ANY($1::uuid[])`,
            [allRounds.map(r => r.course_id)]
        );
        const teeByCourseAndName = new Map<string, Map<string, string>>(); // courseId → name → teeId
        for (const t of teesRes.rows) {
            const inner = teeByCourseAndName.get(t.course_id) ?? new Map<string, string>();
            inner.set(t.name, t.id);
            teeByCourseAndName.set(t.course_id, inner);
        }

        console.log(`Event:    ${eventId} (${EVENT_CODE})`);
        console.log(`Rounds:   ${allRounds.map(r => `R${r.round_number}=${r.id.slice(0,8)}`).join(', ')}`);

        // Wipe existing flights + scores + player assignments (start fresh)
        console.log('\nWiping existing flights, scores, player assignments...');
        await pool.query(`DELETE FROM hole_scores WHERE event_id = $1`, [eventId]);
        // Junction table: clear all per-round flight assignments for this event's rounds.
        await pool.query(
            `DELETE FROM player_flights
              WHERE round_id = ANY (SELECT id FROM rounds WHERE event_id = $1)`,
            [eventId]
        );
        // Per-round tee overrides (junction from migration 026) — clear too.
        await pool.query(
            `DELETE FROM player_round_tees
              WHERE round_id = ANY (SELECT id FROM rounds WHERE event_id = $1)`,
            [eventId]
        );
        // Legacy single-flight columns (kept for backward-compat) — clear too.
        await pool.query(`UPDATE players SET flight_id = NULL, team = NULL, position = NULL WHERE event_id = $1`, [eventId]);
        await pool.query(`DELETE FROM flights WHERE event_id = $1`, [eventId]);
        // Drop orphan players not in the current roster (e.g. old placeholders)
        const rosterNames = ROSTER.map(r => r.name);
        const orphanRes = await pool.query(
            `DELETE FROM players WHERE event_id = $1 AND first_name <> ALL($2::text[]) RETURNING first_name`,
            [eventId, rosterNames]
        );
        if (orphanRes.rowCount && orphanRes.rowCount > 0) {
            console.log(`  Removed ${orphanRes.rowCount} orphan player rows: ${orphanRes.rows.map(r => r.first_name).join(', ')}`);
        }

        // Upsert players (by event_id + first_name as identity for re-run safety)
        // Each player's `tee_id` is set to their default tee on Round 1's course.
        console.log('\nUpserting roster...');
        const playerIdByName = new Map<string, string>();
        const round1Tees = teeByCourseAndName.get(round1CourseId) ?? new Map<string, string>();

        for (const r of ROSTER) {
            const desiredTeeName = r.defaultTeeName ?? DEFAULT_TEE_NAME;
            const round1TeeId = round1Tees.get(desiredTeeName) ?? round1Tees.get(DEFAULT_TEE_NAME);
            if (!round1TeeId) throw new Error(`Round 1 has no '${desiredTeeName}' or '${DEFAULT_TEE_NAME}' tee`);

            let userId: string | null = null;
            if (!r.isPhantom) {
                const slug = r.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
                const email = `${slug}@laromana.golf`;
                const u = await pool.query(
                    `INSERT INTO users (email, password_hash, name, created_at)
                     VALUES ($1, $2, $3, NOW())
                     ON CONFLICT (email) DO UPDATE SET name = $3
                     RETURNING id`,
                    [email, pwHash, r.name]
                );
                userId = u.rows[0].id;
                await pool.query(
                    `INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'player')
                     ON CONFLICT (event_id, user_id) DO NOTHING`,
                    [eventId, userId]
                );
            }
            // Find existing player row by (event_id, first_name) — if not exists, insert
            const existing = await pool.query(
                `SELECT id FROM players WHERE event_id = $1 AND first_name = $2 LIMIT 1`,
                [eventId, r.name]
            );
            let playerId: string;
            if (existing.rowCount && existing.rowCount > 0) {
                playerId = existing.rows[0].id;
                await pool.query(
                    `UPDATE players SET handicap_index = $1, tee_id = $2, user_id = $3, last_name = '', updated_at = NOW() WHERE id = $4`,
                    [r.hcp, round1TeeId, userId, playerId]
                );
            } else {
                const insP = await pool.query(
                    `INSERT INTO players (event_id, user_id, first_name, last_name, handicap_index, tee_id, created_at)
                     VALUES ($1, $2, $3, '', $4, $5, NOW())
                     RETURNING id`,
                    [eventId, userId, r.name, r.hcp, round1TeeId]
                );
                playerId = insP.rows[0].id;
            }
            playerIdByName.set(r.name, playerId);

            // Per-round tee assignment (junction from migration 026): for each round, find a
            // tee on that round's course with the player's defaultTeeName (fallback DEFAULT_TEE_NAME).
            // This makes the leaderboard's Course HCP calc correct for ALL rounds without relying on
            // backfill timing relative to the migration apply.
            for (const round of allRounds) {
                const teesOnCourse = teeByCourseAndName.get(round.course_id) ?? new Map<string, string>();
                const teeId = teesOnCourse.get(desiredTeeName) ?? teesOnCourse.get(DEFAULT_TEE_NAME);
                if (!teeId) {
                    console.log(`    ! ${r.name} on R${round.round_number}: no '${desiredTeeName}' or '${DEFAULT_TEE_NAME}' tee on course ${round.course_id} — skipping override`);
                    continue;
                }
                await pool.query(
                    `INSERT INTO player_round_tees (player_id, round_id, tee_id)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (player_id, round_id) DO UPDATE SET tee_id = EXCLUDED.tee_id`,
                    [playerId, round.id, teeId]
                );
            }
        }
        console.log(`  ${ROSTER.length} players upserted, ${ROSTER.length * allRounds.length} per-round tee rows`);

        // Create 4 flights for Round 1
        console.log('\nCreating 4 flights for Round 1...');
        const flightIds = new Map<number, string>();
        for (const f of FLIGHTS) {
            const ins = await pool.query(
                `INSERT INTO flights (event_id, round_id, flight_number, state, created_at)
                 VALUES ($1, $2, $3, 'open', NOW())
                 RETURNING id`,
                [eventId, round1Id, f.flightNumber]
            );
            const flightId: string = ins.rows[0].id;
            flightIds.set(f.flightNumber, flightId);

            // Assign players via the per-round junction table (migration 025).
            // Position 1 vs 2 within each team determines singles pairings.
            for (let i = 0; i < 2; i++) {
                const redName = f.red[i];
                const blueName = f.blue[i];
                const redId = playerIdByName.get(redName);
                const blueId = playerIdByName.get(blueName);
                if (!redId || !blueId) throw new Error(`Missing player: ${redName} or ${blueName}`);
                await pool.query(
                    `INSERT INTO player_flights (player_id, round_id, flight_id, team, position)
                     VALUES ($1, $2, $3, 'red', $4)`,
                    [redId, round1Id, flightId, i + 1]
                );
                await pool.query(
                    `INSERT INTO player_flights (player_id, round_id, flight_id, team, position)
                     VALUES ($1, $2, $3, 'blue', $4)`,
                    [blueId, round1Id, flightId, i + 1]
                );
            }
            console.log(`  Flight ${f.flightNumber}: ${flightId}  (${f.red.join('+')} vs ${f.blue.join('+')})`);
        }

        // Mark Round 1 as live
        await pool.query(`UPDATE rounds SET state = 'open' WHERE id = $1`, [round1Id]);

        // Generate + insert scores per flight
        // Flight 1: full 18 holes, deterministic seed → "stable" demo
        // Flight 2: full 18 holes, different seed
        // Flight 3: holes 1-12
        // Flight 4: holes 1-4
        const FLIGHT_SCORE_PLAN: Record<number, { lastHole: number; seedBase: number }> = {
            1: { lastHole: 18, seedBase: 100 },
            2: { lastHole: 18, seedBase: 200 },
            3: { lastHole: 12, seedBase: 300 },
            4: { lastHole: 4,  seedBase: 400 },
        };

        console.log('\nInserting scores...');
        for (const f of FLIGHTS) {
            const flightId = flightIds.get(f.flightNumber)!;
            const plan = FLIGHT_SCORE_PLAN[f.flightNumber];
            const allFour = [...f.red, ...f.blue];
            for (let pi = 0; pi < allFour.length; pi++) {
                const playerName = allFour[pi];
                const playerId = playerIdByName.get(playerName)!;
                const player = ROSTER.find((p) => p.name === playerName)!;
                // Phantom rule: HCP 0, plays par on every hole — no good days, no bad days.
                // For real rounds in production this should be wired into the round-start flow
                // (auto-insert par-scores for every phantom in every flight). The seed mimics
                // that here so test data reflects the production behaviour.
                const seed = plan.seedBase + pi * 13 + player.hcp * 7;
                const grosses = player.isPhantom
                    ? TOTH_PARS                              // par on every hole
                    : generateRoundGross(player.hcp, TOTH_PARS, seed);

                for (let h = 0; h < plan.lastHole; h++) {
                    const gross = grosses[h];
                    await pool.query(
                        `INSERT INTO hole_scores
                            (event_id, round_id, flight_id, player_id, hole_number, gross_score,
                             mutation_id, version, source, entered_by_user_id, client_timestamp)
                         VALUES ($8, $1, $2, $3, $4, $5, gen_random_uuid(), 1, $6, $7, NOW())
                         ON CONFLICT (round_id, player_id, hole_number) DO UPDATE
                            SET gross_score = EXCLUDED.gross_score,
                                version = hole_scores.version + 1`,
                        [
                            round1Id,
                            flightId,
                            playerId,
                            h + 1,
                            gross,
                            'online',
                            organizerId,
                            eventId,
                        ]
                    );
                }
            }
            console.log(`  Flight ${f.flightNumber}: scored holes 1..${plan.lastHole} for all 4 players`);
        }

        // Mark Round 1 flights 1+2 as completed (all holes played)
        await pool.query(
            `UPDATE flights SET state = 'completed' WHERE id = ANY($1::uuid[])`,
            [[flightIds.get(1)!, flightIds.get(2)!]]
        );

        console.log('\n✓ Test data seeded.');
        console.log('Open /leaderboard. You should see:');
        console.log('  • Round 1: 2 finished flights + 2 live flights');
        console.log('  • Round 2 + 3: empty');
    } finally {
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
