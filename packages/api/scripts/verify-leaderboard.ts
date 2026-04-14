
import { buildApp } from '../src/app';
import { getPool } from '../src/config/database';
import 'dotenv/config';

async function main() {
    const app = buildApp();
    const pool = getPool();

    // Get event ID for RYDER0
    const eventRes = await pool.query("SELECT id FROM events WHERE event_code = 'RYDER0'");
    const eventId = eventRes.rows[0].id;

    // Check response
    const response = await app.inject({
        method: 'GET',
        url: `/events/${eventId}/leaderboard`
    });

    if (response.statusCode !== 200) {
        console.error('Failed to get leaderboard:', response.statusCode, response.body);
        process.exit(1);
    }

    const data = JSON.parse(response.body);
    console.log('Keys:', Object.keys(data));

    if (data.totalScore && data.totalScore.red !== undefined) {
        console.log('✅ totalScore structure is correct');
    } else {
        console.error('❌ totalScore missing or invalid');
    }

    if (Array.isArray(data.matches)) {
        console.log(`✅ matches is an array of length ${data.matches.length}`);
        if (data.matches.length > 0) {
            const m = data.matches[0];
            if (m.redPlayers && Array.isArray(m.redPlayers)) {
                console.log('✅ match has redPlayers');
            } else {
                console.error('❌ match missing redPlayers');
            }
        }
    } else {
        console.error('❌ matches is not an array');
    }

    await pool.end();
}

main().catch(console.error);
