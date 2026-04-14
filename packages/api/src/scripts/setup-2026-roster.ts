import { Pool } from 'pg';
import path from 'path';
import 'dotenv/config';
import bcrypt from 'bcrypt';

// Load env from the root of the project if running from packages/api
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const rawPlayers = [
    { name: 'Fercho', hcp: 14, tee: 'Azules' },
    { name: 'Camacho', hcp: 14, tee: 'Azules' },
    { name: 'Pocho', hcp: 8, tee: 'Azules' },
    { name: 'Manuela', hcp: 15, tee: 'Rojas' },
    { name: 'Phil', hcp: 11, tee: 'Azules' },
    { name: 'Vargas', hcp: 14, tee: 'Azules' },
    { name: 'Burrowes', hcp: 15, tee: 'Azules' },
    { name: 'Fito', hcp: 12, tee: 'Azules' },
    { name: 'Vélez', hcp: 20, tee: 'Azules' },
    { name: 'Gaitan', hcp: 25, tee: 'Blancas' },
    { name: 'Pulido', hcp: 6, tee: 'Azules' },
    { name: 'Tomás', hcp: 14, tee: 'Azules' },
    { name: 'Sardi', hcp: 17, tee: 'Azules' },
    { name: 'Herrera', hcp: 16, tee: 'Azules' },
    { name: 'Adriana', hcp: 14, tee: 'Rojas' },
    { name: 'Ana', hcp: 11, tee: 'Rojas' },
];

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const shuffledPlayers = shuffleArray(rawPlayers);
const redTeam = shuffledPlayers.slice(0, 8);
const blueTeam = shuffledPlayers.slice(8, 16);

const players2026: Array<{ name: string; team: string; flight: number; hcp: number; tee: string }> = [];
for (let i = 0; i < 4; i++) {
    players2026.push({ ...redTeam[i * 2], team: 'red', flight: i + 1 });
    players2026.push({ ...redTeam[i * 2 + 1], team: 'red', flight: i + 1 });
    players2026.push({ ...blueTeam[i * 2], team: 'blue', flight: i + 1 });
    players2026.push({ ...blueTeam[i * 2 + 1], team: 'blue', flight: i + 1 });
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ryder_cup_dev';
    console.log('Connecting to database:', databaseUrl.replace(/:[^@]+@/, ':***@'));
    const pool = new Pool({ connectionString: databaseUrl });

    try {
        console.log('--- Wiping old event data ---');
        // We wipe cascading upwards
        await pool.query('DELETE FROM scramble_team_scores');
        await pool.query('DELETE FROM hole_scores');
        await pool.query('DELETE FROM player_invites');
        await pool.query('DELETE FROM players');
        await pool.query('DELETE FROM flights');
        await pool.query('DELETE FROM holes');
        await pool.query('DELETE FROM tees');
        await pool.query('DELETE FROM courses');
        await pool.query('DELETE FROM events');

        // Wipe old users except the main admin
        await pool.query(`DELETE FROM users WHERE email != 'organizer@ryder.test' AND email != 'admin2@ryder.test'`);

        console.log('--- Creating 2026 Event ---');
        const passwordHash = await bcrypt.hash('password', 10);

        // Ensure organizer exists
        const orgResult = await pool.query(`
      INSERT INTO users (email, password_hash, name, app_role, created_at)
      VALUES ('organizer@ryder.test', $1, 'System Admin', 'admin', NOW())
      ON CONFLICT (email) DO UPDATE SET app_role = 'admin', name = 'System Admin'
      RETURNING id
    `, [passwordHash]);
        const organizerId = orgResult.rows[0].id;

        const eventResult = await pool.query(`
      INSERT INTO events (name, status, event_code, created_by_user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id
    `, ['Ryder Cup 2026', 'live', 'RYDER2026', organizerId]);
        const eventId = eventResult.rows[0].id;

        // Create 18 standard holes
        const courseResult = await pool.query(`
      INSERT INTO courses (event_id, name, source, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `, [eventId, 'Ryder Cup Official Course', 'manual']);
        const courseId = courseResult.rows[0].id;

        const teesData = ['Azules', 'Rojas', 'Blancas'];
        const teeIds: Record<string, string> = {};

        for (const teeName of teesData) {
            const teeResult = await pool.query(`
              INSERT INTO tees (course_id, name, created_at)
              VALUES ($1, $2, NOW())
              RETURNING id
            `, [courseId, teeName]);
            teeIds[teeName] = teeResult.rows[0].id;

            // Standard Pars/SI for each tee
            console.log(`Creating holes for ${teeName}...`);
            for (let i = 1; i <= 18; i++) {
                // Simple alternating par 4/3/5 just for structure
                const par = i % 3 === 0 ? 5 : i % 4 === 0 ? 3 : 4;
                const si = i; // simple 1-18 SI for now
                await pool.query(`
                    INSERT INTO holes (tee_id, hole_number, par, stroke_index)
                    VALUES ($1, $2, $3, $4)
                `, [teeIds[teeName], i, par, si]);
            }
        }

        // Create Flights
        console.log('Creating flights...');
        const flightMap: Record<number, string> = {};
        for (let i = 1; i <= 4; i++) {
            const fResult = await pool.query(`
            INSERT INTO flights (event_id, flight_number, front_state, back_state, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id
        `, [eventId, i, 'open', 'open']);
            flightMap[i] = fResult.rows[0].id;
        }

        // Create Players
        console.log('Creating players...');
        for (const player of players2026) {
            // Create user account for them
            const email = `${player.name.toLowerCase()}@ryder.test`;
            const uResult = await pool.query(`
            INSERT INTO users (email, password_hash, name, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id
        `, [email, passwordHash, player.name]);
            const userId = uResult.rows[0].id;

            // Create player profile
            const teamPos = players2026.filter(p => p.flight === player.flight && p.team === player.team).findIndex(p => p.name === player.name) + 1;

            await pool.query(`
            INSERT INTO players (event_id, user_id, first_name, last_name, handicap_index, team, flight_id, position, tee_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [eventId, userId, player.name, '-', player.hcp, player.team, flightMap[player.flight], teamPos, teeIds[player.tee]]);
        }

        console.log('--- Setup Complete ---');
        console.log(`Successfully imported ${players2026.length} players into the Ryder Cup 2026 event.`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

main();
