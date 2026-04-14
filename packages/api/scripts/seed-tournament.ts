/**
 * Seed the database with real tournament data from "Ryder Par 00 (2) copy.xlsx"
 * Run with: npx ts-node scripts/seed-tournament.ts
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import { Pool } from 'pg';
import 'dotenv/config';
import bcrypt from 'bcrypt';

const EXCEL_PATH = path.join(__dirname, '../../../Ryder Par 00 (2) copy.xlsx');

interface RosterRow {
  Player_Name: string;
  Team: 'Red' | 'Blue';
  Flight_ID: string;
  Full_HCP: number;
  Tee_Box: string;
  Player_Order: number;
}

interface CourseRow {
  Hole: number;
  Par: number;
  Hole_HCP_Index: number;
}

async function main() {
  console.log('Reading Excel file:', EXCEL_PATH);
  const workbook = XLSX.readFile(EXCEL_PATH);

  // Parse Roster
  const rosterSheet = workbook.Sheets['Roster'];
  const roster: RosterRow[] = XLSX.utils.sheet_to_json(rosterSheet);
  console.log(`Found ${roster.length} players`);

  // Parse Course
  const courseSheet = workbook.Sheets['Course'];
  const course: CourseRow[] = XLSX.utils.sheet_to_json(courseSheet);
  console.log(`Found ${course.length} holes`);

  // Connect to PostgreSQL
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ryder_cup_dev';
  console.log('\nConnecting to database:', databaseUrl.replace(/:[^@]+@/, ':***@'));
  const pool = new Pool({ connectionString: databaseUrl });

  const passwordHash = await bcrypt.hash('password', 10);

  try {
    // Create a test organizer user
    const orgResult = await pool.query(`
      INSERT INTO users (email, password_hash, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (email) DO UPDATE SET email = $1
      RETURNING id
    `, ['organizer@ryder.test', passwordHash]);
    const organizerId = orgResult.rows[0].id;
    console.log(`Created/found organizer user: ${organizerId}`);

    // Create the event
    const eventCode = 'RYDER0';
    const eventResult = await pool.query(`
      INSERT INTO events (name, status, event_code, created_by_user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (event_code) DO UPDATE SET name = $1, status = $2
      RETURNING id
    `, ['Ryder Par 00 (Test Data)', 'completed', eventCode, organizerId]);
    const eventId = eventResult.rows[0].id;
    console.log(`Created event: ${eventId} (code: ${eventCode})`);

    // Create the course
    const courseResult = await pool.query(`
      INSERT INTO courses (event_id, name, source, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (event_id) DO UPDATE SET name = $2
      RETURNING id
    `, [eventId, 'Ryder Par 00 Course', 'manual']);
    const courseId = courseResult.rows[0].id;

    // Create a tee set
    const teeResult = await pool.query(`
      INSERT INTO tees (course_id, name, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [courseId, 'Default Tees']);
    let teeId = teeResult.rows[0]?.id;

    // If conflict, get existing
    if (!teeId) {
      const existingTee = await pool.query(`SELECT id FROM tees WHERE course_id = $1 LIMIT 1`, [courseId]);
      teeId = existingTee.rows[0]?.id;
    }
    console.log(`Created/found tee set: ${teeId}`);

    // Insert holes (delete existing first to avoid conflicts)
    await pool.query(`DELETE FROM holes WHERE tee_id = $1`, [teeId]);
    for (const hole of course) {
      await pool.query(`
        INSERT INTO holes (tee_id, hole_number, par, stroke_index)
        VALUES ($1, $2, $3, $4)
      `, [teeId, hole.Hole, hole.Par, hole.Hole_HCP_Index]);
    }
    console.log(`Inserted ${course.length} holes`);

    // Create flights for each unique Flight_ID
    const flightIds: Record<string, string> = {};
    const uniqueFlights = [...new Set(roster.map(r => r.Flight_ID))];

    // Delete existing scores, players, then flights (FK constraint order)
    await pool.query(`DELETE FROM scramble_team_scores WHERE event_id = $1`, [eventId]);
    await pool.query(`DELETE FROM hole_scores WHERE event_id = $1`, [eventId]);
    await pool.query(`DELETE FROM players WHERE event_id = $1`, [eventId]);
    await pool.query(`DELETE FROM flights WHERE event_id = $1`, [eventId]);

    for (let idx = 0; idx < uniqueFlights.length; idx++) {
      const flightName = uniqueFlights[idx];
      const flightNumber = idx + 1;

      const flightResult = await pool.query(`
        INSERT INTO flights (event_id, flight_number, front_state, back_state, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `, [eventId, flightNumber, 'completed', 'completed']);
      flightIds[flightName] = flightResult.rows[0].id;
    }
    console.log(`Created ${uniqueFlights.length} flights`);

    // Create players - group by flight and team
    const flightTeamPlayers: Record<string, { red: RosterRow[]; blue: RosterRow[] }> = {};
    roster.forEach(player => {
      const flightId = player.Flight_ID;
      if (!flightTeamPlayers[flightId]) {
        flightTeamPlayers[flightId] = { red: [], blue: [] };
      }
      const team = player.Team.toLowerCase() as 'red' | 'blue';
      flightTeamPlayers[flightId][team].push(player);
    });

    let playerCount = 0;
    for (const [flightName, teams] of Object.entries(flightTeamPlayers)) {
      const flightId = flightIds[flightName];

      // Insert red players
      for (let pos = 0; pos < teams.red.length; pos++) {
        const player = teams.red[pos];
        const email = `${player.Player_Name.toLowerCase().replace(/\s+/g, '.')}@ryder.test`;

        // Create user
        const userResult = await pool.query(`
          INSERT INTO users (email, password_hash, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (email) DO UPDATE SET email = $1
          RETURNING id
        `, [email, passwordHash]);
        const userId = userResult.rows[0].id;

        // Create player - split name into first/last
        const nameParts = player.Player_Name.split(' ');
        const firstName = nameParts[0] || player.Player_Name;
        const lastName = nameParts.slice(1).join(' ') || '-';
        await pool.query(`
          INSERT INTO players (event_id, user_id, first_name, last_name, handicap_index, team, flight_id, position, tee_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [eventId, userId, firstName, lastName, player.Full_HCP, 'red', flightId, pos + 1, teeId]);
        playerCount++;
      }

      // Insert blue players
      for (let pos = 0; pos < teams.blue.length; pos++) {
        const player = teams.blue[pos];
        const email = `${player.Player_Name.toLowerCase().replace(/\s+/g, '.')}@ryder.test`;

        // Create user
        const userResult = await pool.query(`
          INSERT INTO users (email, password_hash, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (email) DO UPDATE SET email = $1
          RETURNING id
        `, [email, passwordHash]);
        const userId = userResult.rows[0].id;

        // Create player - split name into first/last
        const nameParts = player.Player_Name.split(' ');
        const firstName = nameParts[0] || player.Player_Name;
        const lastName = nameParts.slice(1).join(' ') || '-';
        await pool.query(`
          INSERT INTO players (event_id, user_id, first_name, last_name, handicap_index, team, flight_id, position, tee_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [eventId, userId, firstName, lastName, player.Full_HCP, 'blue', flightId, pos + 1, teeId]);
        playerCount++;
      }
    }
    console.log(`Created ${playerCount} players`);

    // Build player lookup by name
    const playerLookup: Record<string, { id: string, flightId: string, userId: string }> = {};
    const playersResult = await pool.query(`
      SELECT p.id, p.first_name, p.last_name, p.flight_id, p.user_id
      FROM players p WHERE p.event_id = $1
    `, [eventId]);
    playersResult.rows.forEach(row => {
      const fullName = row.last_name === '-' ? row.first_name : `${row.first_name} ${row.last_name}`;
      playerLookup[fullName] = { id: row.id, flightId: row.flight_id, userId: row.user_id };
      // Also add first name only for single-name matches
      playerLookup[row.first_name] = { id: row.id, flightId: row.flight_id, userId: row.user_id };
    });

    // Parse Front9_Scores (individual playerscores for holes 1-9)
    const front9Sheet = workbook.Sheets['Front9_Scores'];
    interface Front9Row {
      Flight_ID: string;
      Player_Name: string;
      Hole: number;
      Gross_Score: number;
      Player_Email: string;
    }
    const front9Scores: Front9Row[] = XLSX.utils.sheet_to_json(front9Sheet);
    console.log(`Found ${front9Scores.length} front 9 scores`);

    // Parse Back9_Scores (Scramble team scores for holes 10-18)
    const back9Sheet = workbook.Sheets['Back9_Scores'];
    interface Back9Row {
      Flight_ID: string;
      Hole: number;
      Red_Scramble_Score: number | string;
      Blue_Scramble_Score: number | string;
    }
    const back9Scores: Back9Row[] = XLSX.utils.sheet_to_json(back9Sheet);
    console.log(`Found ${back9Scores.length} back 9 (scramble) scores`);

    // Delete existing scores
    await pool.query(`DELETE FROM hole_scores WHERE event_id = $1`, [eventId]);

    let scoreCount = 0;
    const { v4: uuidv4 } = await import('uuid');

    // Insert Front 9 Scores
    for (const score of front9Scores) {
      const player = playerLookup[score.Player_Name];
      if (!player) {
        continue;
      }
      try {
        await pool.query(`
          INSERT INTO hole_scores (event_id, flight_id, player_id, hole_number, gross_score, entered_by_user_id, source, client_timestamp, mutation_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
          ON CONFLICT (event_id, player_id, hole_number) DO UPDATE SET gross_score = $5
        `, [eventId, player.flightId, player.id, score.Hole, score.Gross_Score, player.userId, 'online', uuidv4()]);
        scoreCount++;
      } catch (err) { }
    }

    // Verify keys
    console.log('Available Flights:', Object.keys(flightTeamPlayers));

    // Insert Back 9 (Scramble) Scores
    for (const score of back9Scores) {
      const flightTeams = flightTeamPlayers[score.Flight_ID];
      if (!flightTeams) {
        console.log(`Skipping unknown flight ID: "${score.Flight_ID}"`);
        continue;
      }

      // Helper to insert team score for all players in a team
      const insertTeamScore = async (teamName: 'red' | 'blue', rawScore: number | string) => {
        const val = typeof rawScore === 'number' ? rawScore : parseInt(rawScore as string);
        if (isNaN(val)) return;

        const rosterPlayers = flightTeams[teamName]; // RosterRow[]
        for (const rp of rosterPlayers) {
          const player = playerLookup[rp.Player_Name];
          if (!player) continue;

          try {
            await pool.query(`
                  INSERT INTO hole_scores (event_id, flight_id, player_id, hole_number, gross_score, entered_by_user_id, source, client_timestamp, mutation_id)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
                  ON CONFLICT (event_id, player_id, hole_number) DO UPDATE SET gross_score = $5
                `, [eventId, player.flightId, player.id, score.Hole, val, player.userId, 'online', uuidv4()]);
            scoreCount++;
          } catch (err) {
            console.error('Insert Error:', err);
          }
        }
      };

      await insertTeamScore('red', score.Red_Scramble_Score);
      await insertTeamScore('blue', score.Blue_Scramble_Score);
    }

    console.log(`Inserted total ${scoreCount} scores (Front9 + Scramble)`);

    // Summary
    console.log('\n=== SEED DATA COMPLETE ===');
    console.log(`Event: Ryder Par 00 (${eventCode})`);
    console.log(`Event ID: ${eventId}`);
    console.log(`Players: ${playerCount}`);
    console.log(`Flights: ${uniqueFlights.length}`);
    console.log(`Holes: ${course.length}`);
    console.log(`Scores: ${scoreCount}`);
    console.log('\nYou can now start the API and frontend to view the data!');
    console.log('\nTest user login: organizer@ryder.test');

  } finally {
    await pool.end();
  }
}

main().catch(console.error);
