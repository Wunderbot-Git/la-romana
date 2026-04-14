
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

    if (data.matches && data.matches.length > 0) {
        const m = data.matches[0];
        console.log('Match ID:', m.id);

        if (m.matchProgression && Array.isArray(m.matchProgression)) {
            console.log('✅ matchProgression is array');
            const hasData = m.matchProgression.length > 0;
            if (hasData) {
                console.log('Sample Status:', m.matchProgression[0]);
                if (typeof m.matchProgression[0] === 'string') {
                    console.log('✅ matchProgression items are strings');
                } else {
                    console.error('❌ matchProgression items are NOT strings:', m.matchProgression[0]);
                }
            } else {
                console.log('⚠️ matchProgression is empty (might be expected if no holes played)');
            }
        } else {
            console.error('❌ matchProgression missing or invalid:', m.matchProgression);
        }
    } else {
        console.error('❌ No matches found to verify');
    }

    await pool.end();
}

main().catch(console.error);
