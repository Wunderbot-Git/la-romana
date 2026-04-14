// Leaderboard Service - Aggregates tournament scoring data

import { getPool } from '../config/database';
import { getFlightHoleScores } from '../repositories/holeScoreRepository';
import { getFlightScrambleScores } from '../repositories/scrambleScoreRepository';
import { getCourseByEventId } from '../repositories/courseRepository';
import { calculateFlightMatches, FlightMatchesOutput, FlightPlayerScores, MatchSummary } from '../scoring/flightMatchCalculator';
import { calculateTournamentPoints, TournamentPoints } from '../scoring/pointAllocation';
import { calculateMomentum, MomentumIndicator } from '../scoring/momentum';
import { formatMatchStatus } from '../scoring/matchStatus';

export interface PlayerScore {
    playerId: string;
    playerName: string;
    hcp: number;
    scores: (number | null)[];
}

export interface Match {
    id: string;
    flightId: string;
    flightName: string;
    segmentType: 'singles1' | 'singles2' | 'fourball' | 'scramble';
    status: 'not_started' | 'in_progress' | 'completed';
    currentHole: number;
    matchStatus: string; // e.g., "2 UP", "A/S", "1 DN"
    matchWinner: 'red' | 'blue' | null;
    currentLeader: 'red' | 'blue' | null;
    redPlayers: PlayerScore[];
    bluePlayers: PlayerScore[];
    matchProgression: string[]; // Status at each hole
    parValues: number[];
    hcpValues: number[];
    scrambleSiValues?: number[];
    holeWinners: ('red' | 'blue' | null)[];
    redTeamStrokes?: number[];
    blueTeamStrokes?: number[];
}

export interface LeaderboardData {
    eventId: string;
    eventName: string;
    updatedAt: string;
    totalScore: {
        red: number;
        blue: number;
    };
    projectedScore: {
        red: number;
        blue: number;
    };
    segmentScores: {
        singles: { red: number; blue: number };
        fourball: { red: number; blue: number };
        scramble: { red: number; blue: number };
    };
    momentum: 'red' | 'blue' | 'neutral';
    matches: Match[];
}

// Simple in-memory cache
const leaderboardCache: Map<string, { data: LeaderboardData; timestamp: number }> = new Map();
const CACHE_TTL_MS = 10000; // 10 seconds (reduced for dev)

/**
 * Invalidate leaderboard cache for an event.
 */
export const invalidateLeaderboardCache = (eventId: string): void => {
    leaderboardCache.delete(eventId);
};

/**
 * Get leaderboard for an event.
 */
export const getLeaderboard = async (eventId: string): Promise<LeaderboardData> => {
    // Check cache
    const cached = leaderboardCache.get(eventId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        return cached.data;
    }

    const pool = getPool();

    // Get event info
    const eventRes = await pool.query('SELECT id, name FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
        throw new Error('Event not found');
    }
    const event = eventRes.rows[0];

    // Get course info for par/hcp values
    const course = await getCourseByEventId(eventId);
    // Default to standard par 72 if no course found, or parsing fails
    let parValues = Array(18).fill(4);
    let hcpValues = Array.from({ length: 18 }, (_, i) => i + 1); // 1..18 default

    let scrambleSiValues: number[] | null = null;

    if (course && course.tees.length > 0) {
        // Use the first tee as the reference for scorecard display
        const tee = course.tees[0];
        const sortedHoles = [...tee.holes].sort((a, b) => a.holeNumber - b.holeNumber);

        if (sortedHoles.length === 18) {
            parValues = sortedHoles.map(h => h.par);
            hcpValues = sortedHoles.map(h => h.strokeIndex);
        }

        // Find Mujeres tee SI for scramble (matches scoreService logic)
        for (const t of course.tees) {
            if (t.name === 'Mujeres') {
                const sorted = [...t.holes].sort((a, b) => a.holeNumber - b.holeNumber);
                if (sorted.length === 18) {
                    scrambleSiValues = sorted.map(h => h.strokeIndex);
                }
                break;
            }
        }
    }

    // Get all flights
    const flightsRes = await pool.query(
        `SELECT id, flight_number FROM flights WHERE event_id = $1 ORDER BY flight_number`,
        [eventId]
    );

    const matchResults: Match[] = [];

    // Tracking scores
    const segmentScores = {
        singles: { red: 0, blue: 0 },
        fourball: { red: 0, blue: 0 },
        scramble: { red: 0, blue: 0 },
    };
    let totalRedPoints = 0;
    let totalBluePoints = 0;

    // Helper to build PlayerScore for frontend
    const mapPlayerToScore = (p: any, scores: (number | null)[]): PlayerScore => ({
        playerId: p.id,
        playerName: p.name,
        hcp: p.handicapIndex,
        scores: scores.map(s => (s !== null && s > 0) ? s : null)
    });

    for (const flight of flightsRes.rows) {
        // Get players for this flight directly from players table
        const playersRes = await pool.query(
            `SELECT id, first_name, last_name, handicap_index, team, position
             FROM players
             WHERE flight_id = $1
             ORDER BY team, position`,
            [flight.id]
        );

        const redPlayers = playersRes.rows
            .filter((p: any) => p.team === 'red')
            .map((p: any) => ({
                id: p.id,
                name: [p.first_name, p.last_name].filter(n => n && n !== '-').join(' ').trim() || 'Unknown',
                handicapIndex: parseFloat(p.handicap_index) || 0
            }));

        const bluePlayers = playersRes.rows
            .filter((p: any) => p.team === 'blue')
            .map((p: any) => ({
                id: p.id,
                name: [p.first_name, p.last_name].filter(n => n && n !== '-').join(' ').trim() || 'Unknown',
                handicapIndex: parseFloat(p.handicap_index) || 0
            }));

        // Get hole scores for this flight
        const holeScores = await getFlightHoleScores(flight.id);
        const scrambleScores = await getFlightScrambleScores(flight.id);

        // Build player score data for calculator
        const buildPlayerScores = (playerId: string, hcp: number, team: 'red' | 'blue'): FlightPlayerScores => {
            const playerHoles = holeScores.filter(s => s.playerId === playerId);
            const frontNine = Array(9).fill(null);
            const backNine = Array(9).fill(null);

            // 1. Fill individual hole scores (Singles / Front 9)
            for (const score of playerHoles) {
                if (score.holeNumber <= 9) {
                    frontNine[score.holeNumber - 1] = score.grossScore;
                } else {
                    backNine[score.holeNumber - 10] = score.grossScore;
                }
            }

            // 2. Overlay Scramble scores (Back 9 Override)
            // Scramble scores are stored by team, so we apply them to all players in that team
            const teamScrambleScores = scrambleScores.filter(s => s.team === team);
            for (const score of teamScrambleScores) {
                if (score.holeNumber >= 10 && score.holeNumber <= 18) {
                    backNine[score.holeNumber - 10] = score.grossScore;
                }
            }

            return {
                handicapIndex: hcp,
                frontNineGross: frontNine,
                backNineGross: backNine,
                strokeIndexes: hcpValues // Use actual course stroke indexes
            };
        };

        if (redPlayers.length >= 2 && bluePlayers.length >= 2) {
            const flightInput = {
                redPlayer1: buildPlayerScores(redPlayers[0].id, redPlayers[0].handicapIndex, 'red'),
                redPlayer2: buildPlayerScores(redPlayers[1].id, redPlayers[1].handicapIndex, 'red'),
                bluePlayer1: buildPlayerScores(bluePlayers[0].id, bluePlayers[0].handicapIndex, 'blue'),
                bluePlayer2: buildPlayerScores(bluePlayers[1].id, bluePlayers[1].handicapIndex, 'blue'),
                ...(scrambleSiValues ? { scrambleStrokeIndexes: scrambleSiValues } : {})
            };

            const result = calculateFlightMatches(flightInput);

            // -- Helper to process a match result --
            const processMatch = (
                matchDetails: any,
                type: 'singles1' | 'singles2' | 'fourball' | 'scramble',
                idSuffix: string,
                rPlayers: any[],
                bPlayers: any[],
                rScores: (number | null)[][], // array of score arrays corresponding to players
                bScores: (number | null)[][]
            ) => {
                // If no match details (unstarted), create stub
                const isUnstarted = !matchDetails;

                // Add to totals if started
                if (matchDetails) {
                    if (type === 'singles1' || type === 'singles2') {
                        segmentScores.singles.red += matchDetails.result.redPoints;
                        segmentScores.singles.blue += matchDetails.result.bluePoints;
                    } else if (type === 'fourball') {
                        segmentScores.fourball.red += matchDetails.result.redPoints;
                        segmentScores.fourball.blue += matchDetails.result.bluePoints;
                    } else {
                        segmentScores.scramble.red += matchDetails.result.redPoints;
                        segmentScores.scramble.blue += matchDetails.result.bluePoints;
                    }
                    totalRedPoints += matchDetails.result.redPoints;
                    totalBluePoints += matchDetails.result.bluePoints;
                }

                // Create Match Object
                const prepareScores = (scores: (number | null)[]) => {
                    if (type === 'scramble') {
                        return [...Array(9).fill(null), ...scores];
                    }
                    return scores;
                };

                const prepareProgression = (arr: string[]) => {
                    if (type === 'scramble') {
                        return [...Array(9).fill(''), ...arr];
                    }
                    return arr;
                };

                const prepareWinners = (arr: any[]) => {
                    if (type === 'scramble') {
                        return [...Array(9).fill(null), ...arr];
                    }
                    return arr;
                };

                // Extract Scramble Strokes
                let redStrokes: number[] | undefined;
                let blueStrokes: number[] | undefined;

                if (matchDetails && type === 'scramble' && matchDetails.holes) {
                    const rStrokesRaw = matchDetails.holes.map((h: any) => h.redStrokes ?? 0);
                    const bStrokesRaw = matchDetails.holes.map((h: any) => h.blueStrokes ?? 0);
                    redStrokes = [...Array(9).fill(0), ...rStrokesRaw];
                    blueStrokes = [...Array(9).fill(0), ...bStrokesRaw];
                }

                const match: Match = {
                    id: `${flight.id}-${idSuffix}`,
                    flightId: flight.id,
                    flightName: `Grupo ${flight.flight_number}`,
                    segmentType: type,
                    status: isUnstarted ? 'not_started' : (matchDetails.finalState.isDecided || matchDetails.finalState.holesRemaining === 0 ? 'completed' : (matchDetails.holes.length > 0 ? 'in_progress' : 'not_started')),
                    currentHole: isUnstarted ? 0 : matchDetails.holes.length,
                    matchStatus: isUnstarted ? 'Not Started' : matchDetails.result.finalStatus,
                    matchWinner: isUnstarted ? null : matchDetails.result.winner,
                    currentLeader: isUnstarted ? null : matchDetails.finalState.leader,
                    redPlayers: rPlayers.map((p, i) => mapPlayerToScore(p, prepareScores(isUnstarted ? Object.values(rScores[i]).fill(null) : rScores[i]))),
                    bluePlayers: bPlayers.map((p, i) => mapPlayerToScore(p, prepareScores(isUnstarted ? Object.values(bScores[i]).fill(null) : bScores[i]))),
                    matchProgression: isUnstarted ? [] : prepareProgression(matchDetails.holes.map((h: any) => formatMatchStatus(h.matchState))),
                    holeWinners: isUnstarted ? [] : prepareWinners(matchDetails.holes.map((h: any) => h.winner)),
                    parValues,
                    hcpValues,
                    ...(scrambleSiValues ? { scrambleSiValues } : {}),
                    redTeamStrokes: redStrokes,
                    blueTeamStrokes: blueStrokes
                };
                matchResults.push(match);
            };

            // Process Singles 1 - Always process
            processMatch(
                result.singles1, 'singles1', 's1',
                [redPlayers[0]], [bluePlayers[0]],
                [flightInput.redPlayer1.frontNineGross],
                [flightInput.bluePlayer1.frontNineGross]
            );

            // Process Singles 2 - Always process
            processMatch(
                result.singles2, 'singles2', 's2',
                [redPlayers[1]], [bluePlayers[1]],
                [flightInput.redPlayer2.frontNineGross],
                [flightInput.bluePlayer2.frontNineGross]
            );

            // Process Fourball - Always process
            processMatch(
                result.fourball, 'fourball', 'fb',
                [redPlayers[0], redPlayers[1]], [bluePlayers[0], bluePlayers[1]],
                [flightInput.redPlayer1.frontNineGross, flightInput.redPlayer2.frontNineGross],
                [flightInput.bluePlayer1.frontNineGross, flightInput.bluePlayer2.frontNineGross]
            );

            // For scramble, provide back nine scores
            processMatch(
                result.scramble, 'scramble', 'sc',
                [redPlayers[0], redPlayers[1]], [bluePlayers[0], bluePlayers[1]],
                [flightInput.redPlayer1.backNineGross, flightInput.redPlayer2.backNineGross],
                [flightInput.bluePlayer1.backNineGross, flightInput.bluePlayer2.backNineGross]
            );
        }
    }

    // Momentum calc (placeholder for now, reusing simple logic if available or just based on recent)
    // We can infer momentum from last few matches in matchResults
    // ... logic ...
    const momentum: 'red' | 'blue' | 'neutral' = 'neutral';

    // Calculate Projected Score (Live Score + 0.5 for unstarted matches)
    let projectedRed = totalRedPoints;
    let projectedBlue = totalBluePoints;

    matchResults.forEach(m => {
        const pts = m.segmentType === 'scramble' ? 2 : 1;

        if (m.status === 'not_started') {
            projectedRed += (pts / 2);
            projectedBlue += (pts / 2);
        } else if (m.status === 'in_progress') {
            // Project based on current leader
            if (m.currentLeader === 'red') {
                projectedRed += pts;
            } else if (m.currentLeader === 'blue') {
                projectedBlue += pts;
            } else {
                // A/S or undefined - split the projected point
                projectedRed += (pts / 2);
                projectedBlue += (pts / 2);
            }
        }
    });

    const data: LeaderboardData = {
        eventId,
        eventName: event.name,
        updatedAt: new Date().toISOString(),
        totalScore: {
            red: totalRedPoints,
            blue: totalBluePoints
        },
        projectedScore: {
            red: projectedRed,
            blue: projectedBlue
        },
        segmentScores,
        momentum,
        matches: matchResults
    };

    // Cache result
    leaderboardCache.set(eventId, { data, timestamp: Date.now() });

    return data;
};

/**
 * Get detailed match history for a flight.
 * This function handles just one flight's calculation (reused logic could be abstracted but keeping distinct for now)
 */
export const getFlightMatchHistory = async (flightId: string): Promise<FlightMatchesOutput | null> => {
    // ... (Keep existing implementation or remove if not used by any route. 
    // For now I will strictly replace the file with the working `getLeaderboard`, 
    // but I should keep `getFlightMatchHistory` if other parts depend on it.)
    // To save space/complexity in this rewrite, I'll copy the existing logic for `getFlightMatchHistory` back in.

    const pool = getPool();
    // Get flight info
    const flightRes = await pool.query(
        `SELECT f.id, f.flight_number, f.event_id FROM flights f WHERE f.id = $1`,
        [flightId]
    );
    if (flightRes.rows.length === 0) {
        throw new Error('Flight not found');
    }
    // Get players directly from players table
    const playersRes = await pool.query(
        `SELECT id, first_name, last_name, handicap_index, team, position
         FROM players
         WHERE flight_id = $1
         ORDER BY team, position`,
        [flightId]
    );
    const redPlayers = playersRes.rows.filter((p: any) => p.team === 'red');
    const bluePlayers = playersRes.rows.filter((p: any) => p.team === 'blue');
    if (redPlayers.length < 2 || bluePlayers.length < 2) {
        return null;
    }
    const holeScores = await getFlightHoleScores(flightId);

    // Get course info for stroke indexes
    const eventId = flightRes.rows[0].event_id;
    const course = await getCourseByEventId(eventId);
    let hcpValues = Array.from({ length: 18 }, (_, i) => i + 1); // Default 1..18
    let scrambleSiValues: number[] | null = null;
    if (course && course.tees.length > 0) {
        const sortedHoles = [...course.tees[0].holes].sort((a, b) => a.holeNumber - b.holeNumber);
        if (sortedHoles.length === 18) {
            hcpValues = sortedHoles.map(h => h.strokeIndex);
        }
        for (const t of course.tees) {
            if (t.name === 'Mujeres') {
                const sorted = [...t.holes].sort((a, b) => a.holeNumber - b.holeNumber);
                if (sorted.length === 18) {
                    scrambleSiValues = sorted.map(h => h.strokeIndex);
                }
                break;
            }
        }
    }

    // Get scramble scores
    const scrambleScores = await getFlightScrambleScores(flightId);

    const buildPlayerScores = (player: any): FlightPlayerScores => {
        const playerHoles = holeScores.filter(s => s.playerId === player.id);
        const frontNine = Array(9).fill(null);
        const backNine = Array(9).fill(null);
        for (const score of playerHoles) {
            if (score.holeNumber <= 9) {
                frontNine[score.holeNumber - 1] = score.grossScore;
            } else {
                backNine[score.holeNumber - 10] = score.grossScore;
            }
        }
        // Overlay scramble scores (team-based back 9)
        const teamScrambleScores = scrambleScores.filter(s => s.team === player.team);
        for (const score of teamScrambleScores) {
            if (score.holeNumber >= 10 && score.holeNumber <= 18) {
                backNine[score.holeNumber - 10] = score.grossScore;
            }
        }
        return {
            handicapIndex: parseFloat(player.handicap_index) || 0,
            frontNineGross: frontNine,
            backNineGross: backNine,
            strokeIndexes: hcpValues // Use actual course stroke indexes
        };
    };
    const flightInput = {
        redPlayer1: buildPlayerScores(redPlayers[0]),
        redPlayer2: buildPlayerScores(redPlayers[1]),
        bluePlayer1: buildPlayerScores(bluePlayers[0]),
        bluePlayer2: buildPlayerScores(bluePlayers[1]),
        ...(scrambleSiValues ? { scrambleStrokeIndexes: scrambleSiValues } : {})
    };
    return calculateFlightMatches(flightInput);
};
