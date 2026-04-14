
import { getLeaderboard } from '../src/services/leaderboardService';
import { getEventById } from '../src/repositories/eventRepository';

const verifyHoleWinners = async () => {
    try {
        // Fetch the event to get a valid ID (assuming seeded data)
        // Or just use a hardcoded known ID if available, but better to fetch.
        // We can just query the DB for the first event.
        // For this script, we'll try to get the first event ID.

        // Mocking or setup might be needed if not connected to DB, 
        // but assuming we are running in the same env as other scripts.

        // Let's hardcode the event ID if we know it, or fetch.
        // Previous logs didn't show event ID clearly, but let's assume we can fetch.

        // Actually, let's just use the logic from verify-leaderboard.ts
        // It likely had some setup.

        // Let's reuse the event ID from previous interactions if possible 
        // or just fetch all events.

        const eventId = 'e207d5b2-3837-43z8-9c60-3129486c8d23'; // Example from previous context if any? 
        // Actually, let's just use the repository to find one.

        // NOTE: Since I can't easily import everything without proper setup, 
        // I'll rely on the existing patterns. 
        // Let's check verify-leaderboard.ts to see how it got the ID.

        // Since I cannot see verify-leaderboard.ts content right now (I saw diff but not full content),
        // I will assume I can just copy the pattern I used before.

        // Let's blindly guess the event ID or query it.
        // I'll just write a script that queries the first event.

        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });

        const res = await pool.query('SELECT id FROM events LIMIT 1');
        if (res.rows.length === 0) {
            console.error('No events found');
            process.exit(1);
        }
        const realEventId = res.rows[0].id;
        console.log(`Testing with Event ID: ${realEventId}`);

        const leaderboard = await getLeaderboard(realEventId);

        if (!leaderboard.matches || leaderboard.matches.length === 0) {
            console.error('No matches found in leaderboard');
            process.exit(1);
        }

        const match = leaderboard.matches[0];
        console.log('Checking Match:', match.id);

        if (!match.holeWinners) {
            console.error('ERROR: holeWinners is undefined');
            process.exit(1);
        }

        if (!Array.isArray(match.holeWinners)) {
            console.error('ERROR: holeWinners is not an array');
            process.exit(1);
        }

        console.log('holeWinners found:', match.holeWinners);
        console.log('holeWinners length:', match.holeWinners.length);

        if (match.holeWinners.length > 0) {
            console.log('Sample winner:', match.holeWinners[0]);
        }

        // Check consistency with currentHole
        if (match.holeWinners.length !== match.currentHole) {
            console.warn(`WARNING: holeWinners length (${match.holeWinners.length}) does not match currentHole (${match.currentHole})`);
        }

        console.log('SUCCESS: holeWinners verification passed');
        process.exit(0);

    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verifyHoleWinners();
