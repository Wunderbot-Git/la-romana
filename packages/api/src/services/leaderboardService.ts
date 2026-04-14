// Leaderboard Service — aggregates tournament data across rounds.
//
// La Romana returns three parallel leaderboards:
//   1. Ryder Cup    — team match points (singles + fourball), cumulative
//   2. Stableford    — individual points, cumulative
//   3. Neto pots     — daily pot state per round
//
// Plus per-flight match detail on demand (via scoreService.getFlightScoreboardData).

import { getPool } from '../config/database';
import { getFlightHoleScores } from '../repositories/holeScoreRepository';
import {
    calculateFlightMatches,
    FlightPlayerScores,
    MatchSummary,
} from '../scoring/flightMatchCalculator';
import { calculateStablefordRound } from '../scoring/stableford';
import {
    aggregatePlayerTotals,
    aggregateTeamTotals,
    PlayerRoundPoints,
    TeamRoundPoints,
} from '../scoring/tournamentAggregator';
import * as netoRepo from '../repositories/netoPotRepository';

export interface RyderTeamStanding {
    team: 'red' | 'blue';
    matchPointsCumulative: number;
    roundsPlayed: number;
}

export interface StablefordStanding {
    playerId: string;
    playerName: string;
    handicapIndex: number;
    team: 'red' | 'blue' | null;
    stablefordCumulative: number;
    ryderIndividualCumulative: number;
    roundsPlayed: number;
}

export interface RoundBreakdown {
    roundId: string;
    roundNumber: number;
    courseName: string;
    state: 'open' | 'completed' | 'reopened';
    teamPoints: { red: number; blue: number };
    flightSummaries: FlightRoundSummary[];
}

export interface FlightRoundSummary {
    flightId: string;
    flightNumber: number;
    state: 'open' | 'completed' | 'reopened';
    matches: MatchSummary[];
    redPoints: number;
    bluePoints: number;
}

export interface LeaderboardData {
    eventId: string;
    eventName: string;
    updatedAt: string;
    ryderStandings: RyderTeamStanding[];
    stablefordStandings: StablefordStanding[];
    rounds: RoundBreakdown[];
    netoPotsByRound: Record<string, Awaited<ReturnType<typeof netoRepo.listPotsForRound>>>;
}

// Simple in-memory cache
const leaderboardCache: Map<string, { data: LeaderboardData; timestamp: number }> = new Map();
const CACHE_TTL_MS = 10_000;

export const invalidateLeaderboardCache = (eventId: string): void => {
    leaderboardCache.delete(eventId);
};

interface CourseTeeData {
    /** tee_id → 18 stroke indexes */
    siByTee: Record<string, number[]>;
    /** Par values for the course (from the first tee with 18 holes). */
    parValues: number[];
    /** Fallback SI array if player has no tee_id. */
    defaultSi: number[];
}

const loadCourseTeeData = async (courseId: string): Promise<CourseTeeData> => {
    const pool = getPool();
    const teesRes = await pool.query(
        `SELECT t.id FROM tees t WHERE t.course_id = $1 ORDER BY t.created_at ASC`,
        [courseId]
    );
    const siByTee: Record<string, number[]> = {};
    let parValues = Array(18).fill(4);
    let defaultSi = Array.from({ length: 18 }, (_, i) => i + 1);
    let setDefaults = false;

    for (const tee of teesRes.rows) {
        const holesRes = await pool.query(
            `SELECT hole_number, par, stroke_index FROM holes WHERE tee_id = $1 ORDER BY hole_number ASC`,
            [tee.id]
        );
        if (holesRes.rows.length === 18) {
            siByTee[tee.id] = holesRes.rows.map((h: any) => h.stroke_index);
            if (!setDefaults) {
                parValues = holesRes.rows.map((h: any) => h.par);
                defaultSi = siByTee[tee.id];
                setDefaults = true;
            }
        }
    }
    return { siByTee, parValues, defaultSi };
};

interface RoundContext {
    id: string;
    roundNumber: number;
    courseId: string;
    courseName: string;
    state: 'open' | 'completed' | 'reopened';
    hcpSinglesPct: number;
    hcpFourballPct: number;
}

const loadRounds = async (eventId: string): Promise<RoundContext[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT r.id, r.round_number, r.course_id, c.name AS course_name, r.state,
                r.hcp_singles_pct, r.hcp_fourball_pct
         FROM rounds r
         JOIN courses c ON c.id = r.course_id
         WHERE r.event_id = $1
         ORDER BY r.round_number ASC`,
        [eventId]
    );
    return res.rows.map((r: any) => ({
        id: r.id,
        roundNumber: r.round_number,
        courseId: r.course_id,
        courseName: r.course_name,
        state: r.state,
        hcpSinglesPct: Number(r.hcp_singles_pct),
        hcpFourballPct: Number(r.hcp_fourball_pct),
    }));
};

interface RosterEntry {
    id: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    team: 'red' | 'blue' | null;
    teeId: string | null;
    position: number | null;
    flightId: string | null;
}

const loadRoster = async (eventId: string): Promise<RosterEntry[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT id, first_name, last_name, handicap_index, team, tee_id, position, flight_id
         FROM players
         WHERE event_id = $1`,
        [eventId]
    );
    return res.rows.map((r: any) => ({
        id: r.id,
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        handicapIndex: Number(r.handicap_index) || 0,
        team: r.team ?? null,
        teeId: r.tee_id ?? null,
        position: r.position ?? null,
        flightId: r.flight_id ?? null,
    }));
};

interface FlightRow {
    id: string;
    flightNumber: number;
    roundId: string;
    state: 'open' | 'completed' | 'reopened';
}

const loadFlightsForRound = async (roundId: string): Promise<FlightRow[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT id, flight_number, round_id, state FROM flights WHERE round_id = $1 ORDER BY flight_number ASC`,
        [roundId]
    );
    return res.rows.map((r: any) => ({
        id: r.id,
        flightNumber: r.flight_number,
        roundId: r.round_id,
        state: r.state,
    }));
};

const playerName = (r: RosterEntry): string =>
    [r.firstName, r.lastName].filter(n => n && n !== '-').join(' ').trim() || 'Unknown';

/** Build FlightPlayerScores for the match calculator, given a player and their round scores. */
const buildPlayerScores = (
    player: RosterEntry,
    scoresByHole: Map<number, number | null>,
    tee: CourseTeeData
): FlightPlayerScores => {
    const grossScores = Array.from({ length: 18 }, (_, i) => scoresByHole.get(i + 1) ?? null);
    const strokeIndexes = (player.teeId && tee.siByTee[player.teeId]) || tee.defaultSi;
    return {
        handicapIndex: player.handicapIndex,
        grossScores,
        strokeIndexes,
    };
};

export const getLeaderboard = async (eventId: string): Promise<LeaderboardData> => {
    const cached = leaderboardCache.get(eventId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        return cached.data;
    }

    const pool = getPool();

    const eventRes = await pool.query('SELECT id, name FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) throw new Error('Event not found');
    const event = eventRes.rows[0];

    const rounds = await loadRounds(eventId);
    const roster = await loadRoster(eventId);
    const rosterById = new Map(roster.map(r => [r.id, r]));

    const teamPointsPerRound: TeamRoundPoints[] = [];
    const playerPointsPerRound: PlayerRoundPoints[] = [];
    const roundBreakdowns: RoundBreakdown[] = [];
    const netoPotsByRound: LeaderboardData['netoPotsByRound'] = {};

    for (const round of rounds) {
        const teeData = await loadCourseTeeData(round.courseId);
        const flights = await loadFlightsForRound(round.id);

        let roundRedPoints = 0;
        let roundBluePoints = 0;
        const flightSummaries: FlightRoundSummary[] = [];

        for (const flight of flights) {
            const flightScores = await getFlightHoleScores(flight.id);
            const scoresByPlayer = new Map<string, Map<number, number | null>>();
            for (const s of flightScores) {
                if (s.roundId !== round.id) continue;
                const byHole = scoresByPlayer.get(s.playerId) ?? new Map();
                byHole.set(s.holeNumber, s.grossScore);
                scoresByPlayer.set(s.playerId, byHole);
            }

            // Find the 4 assigned players (2 red + 2 blue) for this flight
            const flightPlayers = roster.filter(r => r.flightId === flight.id);
            const redSorted = flightPlayers
                .filter(p => p.team === 'red')
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
            const blueSorted = flightPlayers
                .filter(p => p.team === 'blue')
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

            let flightRedPoints = 0;
            let flightBluePoints = 0;
            let matches: MatchSummary[] = [
                { matchType: 'singles1', winner: null, finalStatus: 'Not Started', redPoints: 0, bluePoints: 0, holesPlayed: 0, isComplete: false },
                { matchType: 'singles2', winner: null, finalStatus: 'Not Started', redPoints: 0, bluePoints: 0, holesPlayed: 0, isComplete: false },
                { matchType: 'fourball', winner: null, finalStatus: 'Not Started', redPoints: 0, bluePoints: 0, holesPlayed: 0, isComplete: false },
            ];

            if (redSorted.length >= 2 && blueSorted.length >= 2) {
                const result = calculateFlightMatches({
                    redPlayer1: buildPlayerScores(redSorted[0], scoresByPlayer.get(redSorted[0].id) ?? new Map(), teeData),
                    redPlayer2: buildPlayerScores(redSorted[1], scoresByPlayer.get(redSorted[1].id) ?? new Map(), teeData),
                    bluePlayer1: buildPlayerScores(blueSorted[0], scoresByPlayer.get(blueSorted[0].id) ?? new Map(), teeData),
                    bluePlayer2: buildPlayerScores(blueSorted[1], scoresByPlayer.get(blueSorted[1].id) ?? new Map(), teeData),
                });
                matches = result.summary.matches;
                flightRedPoints = result.summary.totalRedPoints;
                flightBluePoints = result.summary.totalBluePoints;

                // Allocate individual Ryder points:
                //   singles1 winner → Red P1 or Blue P1 (1 pt)
                //   singles2 winner → Red P2 or Blue P2 (1 pt)
                //   fourball winner → 0.5 pt to each player on the winning team (total 1 pt distributed)
                const addIndiv = (pId: string, pts: number) => {
                    playerPointsPerRound.push({
                        playerId: pId,
                        roundNumber: round.roundNumber,
                        stablefordPoints: 0, // fill later
                        ryderIndividualPoints: pts,
                    });
                };
                if (result.singles1?.result.winner === 'red') addIndiv(redSorted[0].id, 1);
                else if (result.singles1?.result.winner === 'blue') addIndiv(blueSorted[0].id, 1);
                else if (result.singles1?.result.winner === null && result.singles1) {
                    // Halved: 0.5 each
                    addIndiv(redSorted[0].id, 0.5);
                    addIndiv(blueSorted[0].id, 0.5);
                }
                if (result.singles2?.result.winner === 'red') addIndiv(redSorted[1].id, 1);
                else if (result.singles2?.result.winner === 'blue') addIndiv(blueSorted[1].id, 1);
                else if (result.singles2?.result.winner === null && result.singles2) {
                    addIndiv(redSorted[1].id, 0.5);
                    addIndiv(blueSorted[1].id, 0.5);
                }
                if (result.fourball?.result.winner === 'red') {
                    addIndiv(redSorted[0].id, 0.5);
                    addIndiv(redSorted[1].id, 0.5);
                } else if (result.fourball?.result.winner === 'blue') {
                    addIndiv(blueSorted[0].id, 0.5);
                    addIndiv(blueSorted[1].id, 0.5);
                } else if (result.fourball?.result.winner === null && result.fourball) {
                    addIndiv(redSorted[0].id, 0.25);
                    addIndiv(redSorted[1].id, 0.25);
                    addIndiv(blueSorted[0].id, 0.25);
                    addIndiv(blueSorted[1].id, 0.25);
                }
            }

            roundRedPoints += flightRedPoints;
            roundBluePoints += flightBluePoints;

            flightSummaries.push({
                flightId: flight.id,
                flightNumber: flight.flightNumber,
                state: flight.state,
                matches,
                redPoints: flightRedPoints,
                bluePoints: flightBluePoints,
            });
        }

        // Stableford per-player for this round
        for (const player of roster) {
            const playerRoundScores = flights.flatMap(f => {
                const byHole = new Map<number, number | null>();
                // Scores already loaded per flight — but we need flight-scoped iteration
                return []; // placeholder — filled below
            });
        }

        // Actually: query all hole_scores for this round in one go for Stableford
        const allRoundScoresRes = await pool.query(
            `SELECT player_id, hole_number, gross_score FROM hole_scores WHERE round_id = $1`,
            [round.id]
        );
        const scoresByPlayerForRound = new Map<string, Map<number, number>>();
        for (const s of allRoundScoresRes.rows) {
            const byHole = scoresByPlayerForRound.get(s.player_id) ?? new Map();
            byHole.set(s.hole_number, s.gross_score);
            scoresByPlayerForRound.set(s.player_id, byHole);
        }

        for (const player of roster) {
            const byHole = scoresByPlayerForRound.get(player.id);
            if (!byHole || byHole.size === 0) continue; // didn't play this round
            const grossScores = Array.from({ length: 18 }, (_, i) => byHole.get(i + 1) ?? null);
            const si = (player.teeId && teeData.siByTee[player.teeId]) || teeData.defaultSi;
            const stbl = calculateStablefordRound({
                grossScores,
                pars: teeData.parValues,
                strokeIndexes: si,
                handicapIndex: player.handicapIndex,
                allowance: round.hcpSinglesPct,
            });
            playerPointsPerRound.push({
                playerId: player.id,
                roundNumber: round.roundNumber,
                stablefordPoints: stbl.totalPoints,
                ryderIndividualPoints: 0, // already recorded from match calculator above
            });
        }

        teamPointsPerRound.push({ team: 'red', roundNumber: round.roundNumber, matchPoints: roundRedPoints });
        teamPointsPerRound.push({ team: 'blue', roundNumber: round.roundNumber, matchPoints: roundBluePoints });

        roundBreakdowns.push({
            roundId: round.id,
            roundNumber: round.roundNumber,
            courseName: round.courseName,
            state: round.state,
            teamPoints: { red: roundRedPoints, blue: roundBluePoints },
            flightSummaries,
        });

        netoPotsByRound[round.id] = await netoRepo.listPotsForRound(round.id);
    }

    const ryderStandings: RyderTeamStanding[] = aggregateTeamTotals(teamPointsPerRound).map(t => ({
        team: t.team,
        matchPointsCumulative: t.matchPointsCumulative,
        roundsPlayed: t.roundsPlayed,
    }));

    const playerTotals = aggregatePlayerTotals(playerPointsPerRound);
    const stablefordStandings: StablefordStanding[] = playerTotals.map(t => {
        const player = rosterById.get(t.playerId);
        return {
            playerId: t.playerId,
            playerName: player ? playerName(player) : 'Unknown',
            handicapIndex: player?.handicapIndex ?? 0,
            team: player?.team ?? null,
            stablefordCumulative: t.stablefordCumulative,
            ryderIndividualCumulative: t.ryderIndividualCumulative,
            roundsPlayed: t.roundsPlayed,
        };
    });

    const data: LeaderboardData = {
        eventId,
        eventName: event.name,
        updatedAt: new Date().toISOString(),
        ryderStandings,
        stablefordStandings,
        rounds: roundBreakdowns,
        netoPotsByRound,
    };

    leaderboardCache.set(eventId, { data, timestamp: Date.now() });
    return data;
};
