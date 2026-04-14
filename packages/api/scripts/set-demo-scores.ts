import { getPool } from '../src/config/database';
import { randomUUID } from 'crypto';

const USER_ID = 'bbda34d3-e47d-4860-9a9a-f62cd1386a9c'; // fito@ryder.test

// Flight IDs
const F1_ID = 'e8a76d40-5ec1-4478-85e3-3d1ebb2c2670';
const F2_ID = '1530313b-9e5e-4dea-89e5-7b2eb15b9123';

// Flight 1 Players
const F1_RED_P1 = 'd9229f0a-e07a-4b65-99e6-340000269997'; // Fito
const F1_RED_P2 = '0a9d629e-2099-43a6-88aa-cbe6f260dfa1'; // Adri
const F1_BLUE_P1 = 'c24cad49-ba49-4d46-94a0-6a1c737b0202'; // Fercho
const F1_BLUE_P2 = '9abf76bf-c662-488c-ba20-52e624666a0d'; // Gaitan

// Flight 2 Players
const F2_RED_P1 = '87910d73-d7b8-4d80-bcec-78bbe0b4c8ce'; // Cadavid
const F2_RED_P2 = '7a9fca13-5596-44bb-916f-9e594ced338d'; // Saenz
const F2_BLUE_P1 = '2b2801e1-312c-4193-933f-5f24796ab732'; // Otto
const F2_BLUE_P2 = '5cc3a172-6a7f-4279-af47-5b2def5e87b5'; // Valenzuela

// All players to clear
const ALL_PLAYERS = [F1_RED_P1, F1_RED_P2, F1_BLUE_P1, F1_BLUE_P2, F2_RED_P1, F2_RED_P2, F2_BLUE_P1, F2_BLUE_P2];

// Score Data
const SCENARIOS = [
    // Flight 1 (FINISHED)
    {
        playerId: F1_RED_P1, // Fito
        flightId: F1_ID,
        scores: [
            // Front 9 (Singles Win, Fourball Draw)
            { h: 1, s: 4 }, { h: 2, s: 4 }, { h: 3, s: 3 }, { h: 4, s: 4 }, { h: 5, s: 4 }, { h: 6, s: 3 }, { h: 7, s: 4 }, { h: 8, s: 4 }, { h: 9, s: 4 },
            // Back 9 (Scramble Team Score - Win)
            { h: 10, s: 4 }, { h: 11, s: 4 }, { h: 12, s: 3 }, { h: 13, s: 4 }, { h: 14, s: 4 }, { h: 15, s: 3 }, { h: 16, s: 4 }, { h: 17, s: 4 }, { h: 18, s: 4 }
        ]
    },
    {
        playerId: F1_RED_P2, // Adri
        flightId: F1_ID,
        scores: [
            // Front 9 (Singles Loss)
            { h: 1, s: 5 }, { h: 2, s: 5 }, { h: 3, s: 4 }, { h: 4, s: 5 }, { h: 5, s: 5 }, { h: 6, s: 4 }, { h: 7, s: 5 }, { h: 8, s: 5 }, { h: 9, s: 4 },
            // Back 9 (Just filling)
            { h: 10, s: 5 }, { h: 11, s: 5 }, { h: 12, s: 4 }, { h: 13, s: 5 }, { h: 14, s: 5 }, { h: 15, s: 4 }, { h: 16, s: 5 }, { h: 17, s: 5 }, { h: 18, s: 5 }
        ]
    },
    {
        playerId: F1_BLUE_P1, // Fercho
        flightId: F1_ID,
        scores: [
            // Front 9 (Singles Loss)
            { h: 1, s: 5 }, { h: 2, s: 5 }, { h: 3, s: 4 }, { h: 4, s: 5 }, { h: 5, s: 5 }, { h: 6, s: 4 }, { h: 7, s: 5 }, { h: 8, s: 5 }, { h: 9, s: 5 },
            // Back 9 (Scramble Team Score - Loss)
            { h: 10, s: 4 }, { h: 11, s: 5 }, { h: 12, s: 3 }, { h: 13, s: 5 }, { h: 14, s: 4 }, { h: 15, s: 3 }, { h: 16, s: 5 }, { h: 17, s: 4 }, { h: 18, s: 4 }
        ]
    },
    {
        playerId: F1_BLUE_P2, // Gaitan
        flightId: F1_ID,
        scores: [
            // Front 9 (Singles Win)
            { h: 1, s: 3 }, { h: 2, s: 4 }, { h: 3, s: 3 }, { h: 4, s: 4 }, { h: 5, s: 3 }, { h: 6, s: 3 }, { h: 7, s: 4 }, { h: 8, s: 3 }, { h: 9, s: 4 },
            // Back 9
            { h: 10, s: 4 }, { h: 11, s: 5 }, { h: 12, s: 3 }, { h: 13, s: 5 }, { h: 14, s: 4 }, { h: 15, s: 3 }, { h: 16, s: 5 }, { h: 17, s: 4 }, { h: 18, s: 4 }
        ]
    },

    // Flight 2 (ONGOING)
    {
        playerId: F2_RED_P1, // Cadavid
        flightId: F2_ID,
        scores: [
            // Front 9 (Holes 1-6 Only)
            { h: 1, s: 4 }, { h: 2, s: 5 }, { h: 3, s: 4 }, { h: 4, s: 5 }, { h: 5, s: 4 }, { h: 6, s: 5 },
            // Back 9 (Holes 10-13 Only)
            { h: 10, s: 4 }, { h: 11, s: 5 }, { h: 12, s: 3 }, { h: 13, s: 5 }
        ]
    },
    {
        playerId: F2_RED_P2, // Saenz
        flightId: F2_ID,
        scores: [
            // Front 9 (Holes 1-8 Only)
            { h: 1, s: 4 }, { h: 2, s: 5 }, { h: 3, s: 4 }, { h: 4, s: 5 }, { h: 5, s: 4 }, { h: 6, s: 5 }, { h: 7, s: 4 }, { h: 8, s: 5 },
            // Back 9 (Holes 10-13 Only)
            { h: 10, s: 4 }, { h: 11, s: 5 }, { h: 12, s: 3 }, { h: 13, s: 5 }
        ]
    },
    {
        playerId: F2_BLUE_P1, // Otto
        flightId: F2_ID,
        scores: [
            // Front 9 (Holes 1-6 Only)
            { h: 1, s: 5 }, { h: 2, s: 4 }, { h: 3, s: 5 }, { h: 4, s: 4 }, { h: 5, s: 5 }, { h: 6, s: 4 },
            // Back 9 (Holes 10-13 Only)
            { h: 10, s: 5 }, { h: 11, s: 4 }, { h: 12, s: 4 }, { h: 13, s: 4 }
        ]
    },
    {
        playerId: F2_BLUE_P2, // Valenzuela
        flightId: F2_ID,
        scores: [
            // Front 9 (Holes 1-8 Only)
            { h: 1, s: 5 }, { h: 2, s: 4 }, { h: 3, s: 5 }, { h: 4, s: 4 }, { h: 5, s: 5 }, { h: 6, s: 4 }, { h: 7, s: 5 }, { h: 8, s: 4 },
            // Back 9 (Holes 10-13 Only)
            { h: 10, s: 5 }, { h: 11, s: 4 }, { h: 12, s: 4 }, { h: 13, s: 4 }
        ]
    }
];

async function setDemoScores() {
    console.log('Update Scores Script Started...');
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('Clearing old scores for Flight 1 and 2 players...');
        await client.query('DELETE FROM hole_scores WHERE player_id = ANY($1)', [ALL_PLAYERS]);

        const F3_PLAYERS = ['8aa69596-a827-465b-a481-85c7ac96a96f', 'c56b2c5e-fc4b-4456-90a7-d56c2f4a0a67', '3d5fb107-ee1a-44f3-a208-d12e82a1d755', '5e4e769d-5a1f-4498-838d-b52dabc85c26'];
        await client.query('DELETE FROM hole_scores WHERE player_id = ANY($1)', [F3_PLAYERS]);
        console.log('Cleared scores for Flight 3 (Not Started).');

        console.log('Inserting new scores...');

        for (const scenario of SCENARIOS) {
            for (const score of scenario.scores) {
                await client.query(
                    'INSERT INTO hole_scores (player_id, hole_number, gross_score, entered_by_user_id, event_id, flight_id, client_timestamp, mutation_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [
                        scenario.playerId,
                        score.h,
                        score.s,
                        USER_ID,
                        '1ae6ec28-13d7-481c-90c6-67aeaf1f930a',
                        scenario.flightId,
                        new Date().toISOString(),
                        randomUUID()
                    ]
                );
            }
        }

        await client.query('COMMIT');
        console.log('Successfully updated demo scores!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error updating scores:', e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0); // Ensure script exits
    }
}

setDemoScores();
