/**
 * extract-pocho-vs-manuela.ts
 *
 * Pulls the gross (no-HCP) hole-by-hole scores of Pocho and Manuela across
 * the three La Romana rounds (Teeth of the Dog, Ocean's Four, Dye Fore) and
 * computes a hypothetical match-play result as if they had played each other
 * head-to-head on each round.
 *
 * No handicap strokes are applied — pure gross matchplay.
 *
 * Run from repo root:
 *   DATABASE_URL="postgresql://..." npx ts-node packages/api/scripts/extract-pocho-vs-manuela.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

interface HoleRow {
    hole_number: number;
    par: number;
    score_a: number | null;
    score_b: number | null;
}

function fmtMatchStatus(aUp: number, holesPlayed: number, holesRemaining: number): string {
    if (aUp === 0) return holesPlayed === 0 ? '-' : 'AS';
    const leader = aUp > 0 ? 'A' : 'B';
    const diff = Math.abs(aUp);
    return `${leader} ${diff} UP`;
}

function computeMatch(rows: HoleRow[], nameA: string, nameB: string) {
    let aUp = 0; // positive = A leads
    let totalA = 0;
    let totalB = 0;
    let holesPlayed = 0;
    const lines: string[] = [];
    let result = 'incomplete';
    let decidedOnHole: number | null = null;

    const completeRows = rows.filter(r => r.score_a != null && r.score_b != null);

    for (let i = 0; i < completeRows.length; i++) {
        const r = completeRows[i];
        holesPlayed++;
        totalA += r.score_a!;
        totalB += r.score_b!;
        let winner = '½';
        if (r.score_a! < r.score_b!) {
            aUp += 1;
            winner = nameA;
        } else if (r.score_b! < r.score_a!) {
            aUp -= 1;
            winner = nameB;
        }
        const holesRemaining = completeRows.length - holesPlayed;
        const status = fmtMatchStatus(aUp, holesPlayed, holesRemaining);
        lines.push(
            `  H${String(r.hole_number).padStart(2)} par ${r.par}  ` +
            `${nameA}=${r.score_a}  ${nameB}=${r.score_b}  ` +
            `→ ${winner.padEnd(10)}  [${status}]`,
        );
        // Match decided when |aUp| > holesRemaining
        if (decidedOnHole === null && Math.abs(aUp) > holesRemaining) {
            decidedOnHole = r.hole_number;
            const diff = Math.abs(aUp);
            const leftover = holesRemaining;
            const winnerName = aUp > 0 ? nameA : nameB;
            result = leftover === 0 ? `${winnerName} wins ${diff} UP` : `${winnerName} wins ${diff}&${leftover}`;
        }
    }

    if (decidedOnHole === null) {
        if (completeRows.length === 18) {
            if (aUp === 0) result = 'Halved (AS)';
            else result = `${aUp > 0 ? nameA : nameB} wins ${Math.abs(aUp)} UP`;
        } else {
            result = `incomplete (${completeRows.length}/18 holes scored)` +
                (aUp === 0 ? ', AS' : `, ${aUp > 0 ? nameA : nameB} ${Math.abs(aUp)} UP`);
        }
    }

    return { lines, result, totalA, totalB, decidedOnHole, holesPlayed: completeRows.length };
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }
    const pool = new Pool({ connectionString: databaseUrl });

    try {
        // Find LR2026 event
        const evRes = await pool.query(
            `SELECT id, name FROM events WHERE event_code = 'LR2026' OR name ILIKE '%la romana%' ORDER BY created_at DESC LIMIT 1`,
        );
        if (evRes.rows.length === 0) {
            console.error('La Romana event not found.');
            process.exit(1);
        }
        const eventId = evRes.rows[0].id as string;
        console.log(`Event: ${evRes.rows[0].name}  (${eventId})\n`);

        // Find Pocho and Manuela in this event
        const playersRes = await pool.query(
            `SELECT id, first_name, tee_id
             FROM players
             WHERE event_id = $1
               AND (first_name ILIKE 'pocho' OR first_name ILIKE 'manuela')`,
            [eventId],
        );
        const pocho = playersRes.rows.find((r: any) => /pocho/i.test(r.first_name));
        const manuela = playersRes.rows.find((r: any) => /manuela/i.test(r.first_name));
        if (!pocho || !manuela) {
            console.error('Could not locate both players. Found:', playersRes.rows);
            process.exit(1);
        }

        // Find rounds (course-name based) — order chronologically by round_number
        const roundsRes = await pool.query(
            `SELECT r.id, r.round_number, c.name AS course_name, r.scheduled_at
             FROM rounds r
             JOIN courses c ON c.id = r.course_id
             WHERE r.event_id = $1
             ORDER BY r.round_number`,
            [eventId],
        );

        const wantedCourses: Array<{ key: string; match: RegExp }> = [
            { key: 'Teeth of the Dog', match: /teeth/i },
            { key: "Ocean's Four", match: /ocean/i },
            { key: 'Dye Fore', match: /dye/i },
        ];

        for (const w of wantedCourses) {
            const round = roundsRes.rows.find((r: any) => w.match.test(r.course_name));
            if (!round) {
                console.log(`\n=== ${w.key} ===\n  (round not found in DB)`);
                continue;
            }
            console.log(`\n=== Round ${round.round_number}: ${round.course_name} ===`);

            // Pull pars from holes table — use Pocho's tee for the par column,
            // since matchplay only cares about gross scores (par shown for context).
            const scoresRes = await pool.query(
                `WITH pars AS (
                     SELECT h.hole_number, h.par
                     FROM holes h
                     WHERE h.tee_id = $1
                 ),
                 a AS (
                     SELECT hole_number, gross_score FROM hole_scores
                     WHERE round_id = $2 AND player_id = $3
                 ),
                 b AS (
                     SELECT hole_number, gross_score FROM hole_scores
                     WHERE round_id = $2 AND player_id = $4
                 )
                 SELECT p.hole_number, p.par,
                        a.gross_score AS score_a,
                        b.gross_score AS score_b
                 FROM pars p
                 LEFT JOIN a ON a.hole_number = p.hole_number
                 LEFT JOIN b ON b.hole_number = p.hole_number
                 ORDER BY p.hole_number`,
                [pocho.tee_id, round.id, pocho.id, manuela.id],
            );

            const rows: HoleRow[] = scoresRes.rows.map((r: any) => ({
                hole_number: r.hole_number,
                par: r.par,
                score_a: r.score_a,
                score_b: r.score_b,
            }));

            const { lines, result, totalA, totalB, decidedOnHole, holesPlayed } =
                computeMatch(rows, 'Pocho', 'Manuela');

            for (const ln of lines) console.log(ln);
            console.log(
                `  ----\n  Gross totals (over ${holesPlayed} holes): Pocho=${totalA}, Manuela=${totalB}` +
                (decidedOnHole ? `\n  Decided on hole ${decidedOnHole}` : '') +
                `\n  Match result (gross, no HCP): ${result}`,
            );
        }
    } finally {
        await pool.end();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
