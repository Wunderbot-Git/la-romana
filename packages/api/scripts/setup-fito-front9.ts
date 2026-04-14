
import { Pool } from 'pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ryder_cup_dev';
const pool = new Pool({ connectionString: databaseUrl });

async function main() {
    try {
        console.log('Setting up Front 9 Test for Fito (preserving original flight)...');

        // 1. Find the Live Event (or force it to live)
        const eventRes = await pool.query("UPDATE events SET status = 'live' WHERE event_code = 'RYDER0' RETURNING id");
        if (eventRes.rows.length === 0) throw new Error('Event RYDER0 not found');
        const eventId = eventRes.rows[0].id;
        console.log(`Ensured Event is LIVE (ID: ${eventId})`);

        // 2. Find Fito's User
        const userRes = await pool.query("SELECT id FROM users WHERE email = 'fito@ryder.test'");
        if (userRes.rows.length === 0) throw new Error('User fito@ryder.test not found. (Did seed run?)');
        const fitoUserId = userRes.rows[0].id;

        // 2. Find Fito's Player Record (by name, as he might not be linked to user yet, or linked to a different auto-generated user)
        // We look for 'Fito' in first_name or display_name
        const playerRes = await pool.query(`
            SELECT id, flight_id, first_name, last_name 
            FROM players 
            WHERE first_name ILIKE 'Fito' 
            LIMIT 1
        `);

        if (playerRes.rows.length === 0) throw new Error('Player "Fito" not found in event.');

        const fitoPlayer = playerRes.rows[0];
        const flightId = fitoPlayer.flight_id;

        if (!flightId) throw new Error('Fito player is not assigned to a flight.');

        console.log(`Found Fito (Player ID: ${fitoPlayer.id}) in Flight ${flightId}`);

        // 3. Link Player to User (if not already)
        await pool.query("UPDATE players SET user_id = $1 WHERE id = $2", [fitoUserId, fitoPlayer.id]);
        console.log('Linked Fito player to fito@ryder.test user.');

        // 4. Reset Flight Status
        await pool.query("UPDATE flights SET front_state = 'open', back_state = 'open' WHERE id = $1", [flightId]);
        console.log('Reset flight status to OPEN/OPEN.');

        // 5. Clear Scores for this flight
        await pool.query("DELETE FROM hole_scores WHERE flight_id = $1", [flightId]);
        await pool.query("DELETE FROM scramble_team_scores WHERE flight_id = $1", [flightId]);
        console.log('Cleared all scores for the flight.');

        // 6. Verify Flight Members
        const membersRes = await pool.query(`
            SELECT first_name, last_name, team 
            FROM players 
            WHERE flight_id = $1 ORDER BY team, position
        `, [flightId]);

        console.log('\nFlight Members:');
        membersRes.rows.forEach(p => {
            console.log(`- ${p.first_name} ${p.last_name || ''} (${p.team})`);
        });

        console.log('\nSetup Complete! Login as fito@ryder.test to test.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
