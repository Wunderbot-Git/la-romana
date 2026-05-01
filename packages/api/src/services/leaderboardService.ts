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
import { formatMatchStatus } from '../scoring/matchStatus';
import { calculateStablefordRound } from '../scoring/stableford';
import { computePlayingHandicapFromIndex } from '../scoring/handicap';
import * as playerFlightRepo from '../repositories/playerFlightRepository';
import * as playerRoundTeeRepo from '../repositories/playerRoundTeeRepository';
import {
    aggregatePlayerTotals,
    aggregateTeamTotals,
    PlayerRoundPoints,
    TeamRoundPoints,
} from '../scoring/tournamentAggregator';
import * as netoRepo from '../repositories/netoPotRepository';

export interface RyderTeamStanding {
    team: 'red' | 'blue';
    /** Points actually earned from decided matches only. */
    matchPointsCumulative: number;
    /** Actual + projection for in-progress (to current leader) + 0.5/0.5 for not-started. */
    matchPointsProjected: number;
    roundsPlayed: number;
}

export interface StablefordHoleDetail {
    holeNumber: number;
    par: number;
    grossScore: number | null;
    strokes: number;
    netScore: number | null;
    points: number;
}

export interface StablefordRoundBreakdown {
    roundNumber: number;
    courseName: string;
    stablefordPoints: number;
    ryderIndividualPoints: number;
    /** Per-hole detail (only present for rounds the player has played). */
    holes?: StablefordHoleDetail[];
    /** Playing Handicap used for Stableford this round (course-aware). */
    playingHandicap?: number;
}

export interface StablefordStanding {
    playerId: string;
    playerName: string;
    handicapIndex: number;
    team: 'red' | 'blue' | null;
    stablefordCumulative: number;
    ryderIndividualCumulative: number;
    roundsPlayed: number;
    /** Per-round Stableford + individual Ryder points, sorted by roundNumber. */
    byRound: StablefordRoundBreakdown[];
}

export interface RoundBreakdown {
    roundId: string;
    roundNumber: number;
    courseName: string;
    scheduledAt: string | null;
    state: 'open' | 'completed' | 'reopened';
    holesPerRound: number;
    teamPoints: { red: number; blue: number };
    teamPointsProjected: { red: number; blue: number };
    flightSummaries: FlightRoundSummary[];
}

export interface MatchPlayer {
    id: string;
    name: string;
    hcp: number;
    /** Playing Handicap for singles match (course-aware, allowance-applied). */
    playingHcpSingles?: number;
    /** Playing Handicap for fourball match (course-aware, allowance-applied). */
    playingHcpFourball?: number;
    /** This player's per-hole Stroke Index list (1=hardest), 18 entries, based on their tee. */
    strokeIndexes?: number[];
}

export interface MatchHoleDetail {
    holeNumber: number;
    par: number;
    strokeIndex: number;
    /** Gross scores per player (same order as redPlayers on the match). */
    redScores: (number | null)[];
    blueScores: (number | null)[];
    winner: 'red' | 'blue' | null;
    /** Formatted match state label for this hole ("1 UP", "A/S", "2&1", ...) or null if not played. */
    matchStateLabel: string | null;
}

export interface MatchDetail extends MatchSummary {
    flightId: string;
    flightNumber: number;
    redPlayers: MatchPlayer[];
    bluePlayers: MatchPlayer[];
    pars: number[];
    strokeIndexes: number[];
    holes: MatchHoleDetail[];
}

export interface FlightRoundSummary {
    flightId: string;
    flightNumber: number;
    state: 'open' | 'completed' | 'reopened';
    matches: MatchDetail[];
    redPoints: number;
    bluePoints: number;
    redPointsProjected: number;
    bluePointsProjected: number;
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

interface TeeRatingData {
    slope: number | null;
    rating: number | null;
    /** Sum of par across the 18 holes for this tee. */
    par: number | null;
}

interface CourseTeeData {
    /** tee_id → 18 stroke indexes */
    siByTee: Record<string, number[]>;
    /** tee_id → slope/rating/par (USGA Course HCP inputs). */
    ratingByTee: Record<string, TeeRatingData>;
    /** Par values for the course (from the first tee with 18 holes). */
    parValues: number[];
    /** Fallback SI array if player has no tee_id. */
    defaultSi: number[];
}

const loadCourseTeeData = async (courseId: string): Promise<CourseTeeData> => {
    const pool = getPool();
    const teesRes = await pool.query(
        `SELECT t.id, t.slope_rating, t.course_rating
           FROM tees t
          WHERE t.course_id = $1
          ORDER BY t.created_at ASC`,
        [courseId]
    );
    const siByTee: Record<string, number[]> = {};
    const ratingByTee: Record<string, TeeRatingData> = {};
    let parValues = Array(18).fill(4);
    let defaultSi = Array.from({ length: 18 }, (_, i) => i + 1);
    let setDefaults = false;

    for (const tee of teesRes.rows) {
        const holesRes = await pool.query(
            `SELECT hole_number, par, stroke_index FROM holes WHERE tee_id = $1 ORDER BY hole_number ASC`,
            [tee.id]
        );
        // Accept 9- or 18-hole tees (night-golf side events use 9).
        if (holesRes.rows.length === 18 || holesRes.rows.length === 9) {
            siByTee[tee.id] = holesRes.rows.map((h: any) => h.stroke_index);
            const teePars = holesRes.rows.map((h: any) => Number(h.par) || 4);
            const parTotal = teePars.reduce((s: number, n: number) => s + n, 0);
            ratingByTee[tee.id] = {
                slope: tee.slope_rating != null ? Number(tee.slope_rating) : null,
                rating: tee.course_rating != null ? Number(tee.course_rating) : null,
                par: parTotal,
            };
            if (!setDefaults) {
                parValues = teePars;
                defaultSi = siByTee[tee.id];
                setDefaults = true;
            }
        }
    }
    return { siByTee, ratingByTee, parValues, defaultSi };
};

interface RoundContext {
    id: string;
    roundNumber: number;
    courseId: string;
    courseName: string;
    scheduledAt: string | null;
    state: 'open' | 'completed' | 'reopened';
    hcpSinglesPct: number;
    hcpFourballPct: number;
    holesPerRound: number;
}

const loadRounds = async (eventId: string): Promise<RoundContext[]> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT r.id, r.round_number, r.course_id, c.name AS course_name, r.state,
                r.scheduled_at, r.hcp_singles_pct, r.hcp_fourball_pct, r.holes_per_round
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
        scheduledAt: r.scheduled_at ? r.scheduled_at.toISOString() : null,
        state: r.state,
        hcpSinglesPct: Number(r.hcp_singles_pct),
        hcpFourballPct: Number(r.hcp_fourball_pct),
        holesPerRound: Number(r.holes_per_round) || 18,
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

const playerSummary = (r: RosterEntry): MatchPlayer => ({
    id: r.id,
    name: playerName(r),
    hcp: r.handicapIndex,
});

/**
 * Like `playerSummary` but enriched with course-aware Playing Handicaps and
 * the player's per-hole SI list — needed by the leaderboard scorecard so the
 * UI can render stroke indicators on the correct holes.
 */
const enrichedPlayerSummary = (
    r: RosterEntry,
    tee: CourseTeeData,
    round: RoundContext,
    roundTeeId?: string | null,
): MatchPlayer => {
    // Per-round tee override (migration 026) takes precedence over the player default,
    // matching what the match engine + scoreService do.
    const effectiveTeeId = roundTeeId ?? r.teeId;
    const strokeIndexes = (effectiveTeeId && tee.siByTee[effectiveTeeId]) || tee.defaultSi;
    const teeRating = (effectiveTeeId && tee.ratingByTee[effectiveTeeId]) || null;
    const phSingles = computePlayingHandicapFromIndex({
        handicapIndex: r.handicapIndex,
        slope: teeRating?.slope ?? null,
        rating: teeRating?.rating ?? null,
        par: teeRating?.par ?? null,
        allowance: round.hcpSinglesPct,
    }).playingHandicap;
    const phFourball = computePlayingHandicapFromIndex({
        handicapIndex: r.handicapIndex,
        slope: teeRating?.slope ?? null,
        rating: teeRating?.rating ?? null,
        par: teeRating?.par ?? null,
        allowance: round.hcpFourballPct,
    }).playingHandicap;
    return {
        id: r.id,
        name: playerName(r),
        hcp: r.handicapIndex,
        playingHcpSingles: phSingles,
        playingHcpFourball: phFourball,
        strokeIndexes,
    };
};

const emptyHoleDetail = (holeNumber: number, par: number, strokeIndex: number, redCount: number, blueCount: number): MatchHoleDetail => ({
    holeNumber,
    par,
    strokeIndex,
    redScores: Array(redCount).fill(null),
    blueScores: Array(blueCount).fill(null),
    winner: null,
    matchStateLabel: null,
});

/** Build a Not Started MatchDetail when the flight doesn't have 2+2 players. */
const notStartedDetail = (
    matchType: 'singles1' | 'singles2' | 'fourball',
    flightId: string,
    flightNumber: number,
    red: MatchPlayer[],
    blue: MatchPlayer[],
    pars: number[],
    strokeIndexes: number[]
): MatchDetail => ({
    matchType,
    winner: null,
    finalStatus: 'Not Started',
    redPoints: 0,
    bluePoints: 0,
    holesPlayed: 0,
    isComplete: false,
    flightId,
    flightNumber,
    redPlayers: red,
    bluePlayers: blue,
    pars,
    strokeIndexes,
    holes: Array.from({ length: 18 }, (_, i) =>
        emptyHoleDetail(i + 1, pars[i] ?? 4, strokeIndexes[i] ?? i + 1, red.length, blue.length)
    ),
});

/**
 * Project a single match to (red, blue) projected points, where each match is worth 1 pt.
 *   null (not started)      → 0.5 / 0.5
 *   decided (winner !== null) → 1 / 0 (or 0 / 1)
 *   halved at final         → 0.5 / 0.5
 *   in progress, leader red → 1 / 0
 *   in progress, leader blue → 0 / 1
 *   in progress, A/S tied   → 0.5 / 0.5
 */
const projectMatch = (
    matchResult:
        | null
        | {
              result: { winner: 'red' | 'blue' | null };
              finalState: { leader: 'red' | 'blue' | null; holesRemaining: number; isDecided: boolean };
          }
): { red: number; blue: number } => {
    if (!matchResult) return { red: 0.5, blue: 0.5 };
    const { result, finalState } = matchResult;
    const isFinished = finalState.isDecided || finalState.holesRemaining === 0;
    if (isFinished) {
        if (result.winner === 'red') return { red: 1, blue: 0 };
        if (result.winner === 'blue') return { red: 0, blue: 1 };
        return { red: 0.5, blue: 0.5 }; // halved at final
    }
    // In progress — project to current leader
    if (finalState.leader === 'red') return { red: 1, blue: 0 };
    if (finalState.leader === 'blue') return { red: 0, blue: 1 };
    return { red: 0.5, blue: 0.5 }; // tied mid-match
};

/**
 * Build FlightPlayerScores for the match calculator, given a player and their round scores.
 * Pre-computes per-match Playing Handicaps using:
 *   - the player's tee slope/rating (USGA Course HCP) when available
 *   - the round's hcp_singles_pct / hcp_fourball_pct allowances
 * Falls back to legacy `index × allowance` if the tee has no slope/rating yet.
 *
 * Tee resolution order:
 *   1. Per-round override from `player_round_tees` (preferred)
 *   2. Player's default `players.tee_id`
 */
const buildPlayerScores = (
    player: RosterEntry,
    scoresByHole: Map<number, number | null>,
    tee: CourseTeeData,
    round: RoundContext,
    roundTeeOverride: string | null,
): FlightPlayerScores => {
    const grossScores = Array.from({ length: 18 }, (_, i) => scoresByHole.get(i + 1) ?? null);
    const effectiveTeeId = roundTeeOverride ?? player.teeId;
    const strokeIndexes = (effectiveTeeId && tee.siByTee[effectiveTeeId]) || tee.defaultSi;
    const teeRating = (effectiveTeeId && tee.ratingByTee[effectiveTeeId]) || null;

    const phSingles = computePlayingHandicapFromIndex({
        handicapIndex: player.handicapIndex,
        slope: teeRating?.slope ?? null,
        rating: teeRating?.rating ?? null,
        par: teeRating?.par ?? null,
        allowance: round.hcpSinglesPct,
    }).playingHandicap;

    const phFourball = computePlayingHandicapFromIndex({
        handicapIndex: player.handicapIndex,
        slope: teeRating?.slope ?? null,
        rating: teeRating?.rating ?? null,
        par: teeRating?.par ?? null,
        allowance: round.hcpFourballPct,
    }).playingHandicap;

    return {
        handicapIndex: player.handicapIndex,
        grossScores,
        strokeIndexes,
        playingHcpSingles: phSingles,
        playingHcpFourball: phFourball,
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

        // Per-round flight composition lives in the `player_flights` junction table
        // (migration 025). Group assignments by flight for fast lookup below.
        const roundAssignments = await playerFlightRepo.getRoundAssignments(round.id);
        const assignmentsByFlight = new Map<string, typeof roundAssignments>();
        for (const a of roundAssignments) {
            const list = assignmentsByFlight.get(a.flightId) ?? [];
            list.push(a);
            assignmentsByFlight.set(a.flightId, list);
        }

        // Per-round tee overrides (migration 026). Map<playerId, teeId>.
        const roundTeeMap = await playerRoundTeeRepo.getRoundTeeMap(round.id);

        let roundRedPoints = 0;
        let roundBluePoints = 0;
        let roundRedProjected = 0;
        let roundBlueProjected = 0;
        const flightSummaries: FlightRoundSummary[] = [];

        // Round hasn't been composed yet → project all expected matches as not-started
        // (matches the leaderboard footer promise: "0.5/0.5 sin empezar"). Standard
        // format: 4 players per flight (2 red + 2 blue), 3 matches per flight, so each
        // expected flight contributes 1.5/1.5 to projection.
        if (flights.length === 0) {
            const expectedFlights = Math.ceil(roster.length / 4);
            roundRedProjected = expectedFlights * 1.5;
            roundBlueProjected = expectedFlights * 1.5;
        }

        for (const flight of flights) {
            const flightScores = await getFlightHoleScores(flight.id);
            const scoresByPlayer = new Map<string, Map<number, number | null>>();
            for (const s of flightScores) {
                if (s.roundId !== round.id) continue;
                const byHole = scoresByPlayer.get(s.playerId) ?? new Map();
                byHole.set(s.holeNumber, s.grossScore);
                scoresByPlayer.set(s.playerId, byHole);
            }

            // Resolve the 4 assigned players (2 red + 2 blue) for this flight via the junction.
            // Junction-row team/position override the legacy single-flight columns on `players`.
            const flightAssignments = assignmentsByFlight.get(flight.id) ?? [];
            const flightPlayers = flightAssignments
                .map(a => {
                    const p = rosterById.get(a.playerId);
                    if (!p) return null;
                    return { ...p, team: a.team, position: a.position, flightId: flight.id } as RosterEntry;
                })
                .filter((p): p is RosterEntry => p !== null);
            const redSorted = flightPlayers
                .filter(p => p.team === 'red')
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
            const blueSorted = flightPlayers
                .filter(p => p.team === 'blue')
                .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

            let flightRedPoints = 0;
            let flightBluePoints = 0;
            // Default projection for a flight with no assigned players: 3 matches × 0.5/0.5 = 1.5/1.5
            let flightRedProjected = 1.5;
            let flightBlueProjected = 1.5;

            const redPlayersSummary = redSorted.map(r => enrichedPlayerSummary(r, teeData, round, roundTeeMap.get(r.id)));
            const bluePlayersSummary = blueSorted.map(r => enrichedPlayerSummary(r, teeData, round, roundTeeMap.get(r.id)));

            let matches: MatchDetail[] = [
                notStartedDetail('singles1', flight.id, flight.flightNumber, redPlayersSummary.slice(0, 1), bluePlayersSummary.slice(0, 1), teeData.parValues, teeData.defaultSi),
                notStartedDetail('singles2', flight.id, flight.flightNumber, redPlayersSummary.slice(1, 2), bluePlayersSummary.slice(1, 2), teeData.parValues, teeData.defaultSi),
                notStartedDetail('fourball', flight.id, flight.flightNumber, redPlayersSummary, bluePlayersSummary, teeData.parValues, teeData.defaultSi),
            ];

            if (redSorted.length >= 2 && blueSorted.length >= 2) {
                const result = calculateFlightMatches({
                    redPlayer1: buildPlayerScores(redSorted[0], scoresByPlayer.get(redSorted[0].id) ?? new Map(), teeData, round, roundTeeMap.get(redSorted[0].id) ?? null),
                    redPlayer2: buildPlayerScores(redSorted[1], scoresByPlayer.get(redSorted[1].id) ?? new Map(), teeData, round, roundTeeMap.get(redSorted[1].id) ?? null),
                    bluePlayer1: buildPlayerScores(blueSorted[0], scoresByPlayer.get(blueSorted[0].id) ?? new Map(), teeData, round, roundTeeMap.get(blueSorted[0].id) ?? null),
                    bluePlayer2: buildPlayerScores(blueSorted[1], scoresByPlayer.get(blueSorted[1].id) ?? new Map(), teeData, round, roundTeeMap.get(blueSorted[1].id) ?? null),
                });
                flightRedPoints = result.summary.totalRedPoints;
                flightBluePoints = result.summary.totalBluePoints;

                // Projection: sum per-match projected points for the 3 matches
                const p1 = projectMatch(result.singles1);
                const p2 = projectMatch(result.singles2);
                const p3 = projectMatch(result.fourball);
                flightRedProjected = p1.red + p2.red + p3.red;
                flightBlueProjected = p1.blue + p2.blue + p3.blue;

                // Build detailed match cards
                const buildSingles = (
                    matchType: 'singles1' | 'singles2',
                    output: typeof result.singles1,
                    redPlayer: MatchPlayer,
                    bluePlayer: MatchPlayer,
                    summary: MatchSummary
                ): MatchDetail => {
                    const holes: MatchHoleDetail[] = Array.from({ length: 18 }, (_, i) => {
                        // Look up by holeNumber, not array index — the engine now skips
                        // unplayed holes (shotgun-start support), so output.holes is sparse.
                        const h = output?.holes.find(hh => hh.holeNumber === i + 1);
                        const par = teeData.parValues[i] ?? 4;
                        const si = teeData.defaultSi[i] ?? i + 1;
                        if (!h) return emptyHoleDetail(i + 1, par, si, 1, 1);
                        return {
                            holeNumber: h.holeNumber,
                            par,
                            strokeIndex: h.strokeIndex,
                            redScores: [h.redGross],
                            blueScores: [h.blueGross],
                            winner: h.winner,
                            matchStateLabel: formatMatchStatus(h.matchState),
                        };
                    });
                    return {
                        ...summary,
                        flightId: flight.id,
                        flightNumber: flight.flightNumber,
                        redPlayers: [redPlayer],
                        bluePlayers: [bluePlayer],
                        pars: teeData.parValues,
                        strokeIndexes: teeData.defaultSi,
                        holes,
                    };
                };

                const buildFourball = (
                    output: typeof result.fourball,
                    summary: MatchSummary
                ): MatchDetail => {
                    const holes: MatchHoleDetail[] = Array.from({ length: 18 }, (_, i) => {
                        // Look up by holeNumber, not array index — see buildSingles for rationale.
                        const h = output?.holes.find(hh => hh.holeNumber === i + 1);
                        const par = teeData.parValues[i] ?? 4;
                        const si = teeData.defaultSi[i] ?? i + 1;
                        if (!h) return emptyHoleDetail(i + 1, par, si, 2, 2);
                        return {
                            holeNumber: h.holeNumber,
                            par,
                            strokeIndex: si,
                            redScores: [h.red.p1Gross, h.red.p2Gross],
                            blueScores: [h.blue.p1Gross, h.blue.p2Gross],
                            winner: h.winner,
                            matchStateLabel: formatMatchStatus(h.matchState),
                        };
                    });
                    return {
                        ...summary,
                        flightId: flight.id,
                        flightNumber: flight.flightNumber,
                        redPlayers: redPlayersSummary,
                        bluePlayers: bluePlayersSummary,
                        pars: teeData.parValues,
                        strokeIndexes: teeData.defaultSi,
                        holes,
                    };
                };

                matches = [
                    buildSingles('singles1', result.singles1, redPlayersSummary[0], bluePlayersSummary[0], result.summary.matches[0]),
                    buildSingles('singles2', result.singles2, redPlayersSummary[1], bluePlayersSummary[1], result.summary.matches[1]),
                    buildFourball(result.fourball, result.summary.matches[2]),
                ];

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
            roundRedProjected += flightRedProjected;
            roundBlueProjected += flightBlueProjected;

            flightSummaries.push({
                flightId: flight.id,
                flightNumber: flight.flightNumber,
                state: flight.state,
                matches,
                redPoints: flightRedPoints,
                bluePoints: flightBluePoints,
                redPointsProjected: flightRedProjected,
                bluePointsProjected: flightBlueProjected,
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
            const effectiveTeeId = roundTeeMap.get(player.id) ?? player.teeId;
            const si = (effectiveTeeId && teeData.siByTee[effectiveTeeId]) || teeData.defaultSi;
            // Course-aware Playing HCP for Stableford (uses slope/rating + round allowance).
            const teeRating = (effectiveTeeId && teeData.ratingByTee[effectiveTeeId]) || null;
            const stablefordPH = computePlayingHandicapFromIndex({
                handicapIndex: player.handicapIndex,
                slope: teeRating?.slope ?? null,
                rating: teeRating?.rating ?? null,
                par: teeRating?.par ?? null,
                allowance: round.hcpSinglesPct,
            }).playingHandicap;
            const stbl = calculateStablefordRound({
                grossScores,
                pars: teeData.parValues,
                strokeIndexes: si,
                handicapIndex: player.handicapIndex,
                allowance: round.hcpSinglesPct,
                playingHandicap: stablefordPH,
            });
            playerPointsPerRound.push({
                playerId: player.id,
                roundNumber: round.roundNumber,
                stablefordPoints: stbl.totalPoints,
                ryderIndividualPoints: 0, // already recorded from match calculator above
                stablefordHoles: stbl.holes.map(h => ({
                    holeNumber: h.holeNumber,
                    par: h.par,
                    grossScore: h.grossScore,
                    strokes: h.strokes,
                    netScore: h.netScore,
                    points: h.points,
                })),
                playingHandicap: stbl.playingHandicap,
            });
        }

        teamPointsPerRound.push({ team: 'red', roundNumber: round.roundNumber, matchPoints: roundRedPoints });
        teamPointsPerRound.push({ team: 'blue', roundNumber: round.roundNumber, matchPoints: roundBluePoints });

        roundBreakdowns.push({
            roundId: round.id,
            roundNumber: round.roundNumber,
            courseName: round.courseName,
            scheduledAt: round.scheduledAt,
            state: round.state,
            holesPerRound: round.holesPerRound,
            teamPoints: { red: roundRedPoints, blue: roundBluePoints },
            teamPointsProjected: { red: roundRedProjected, blue: roundBlueProjected },
            flightSummaries,
        });

        netoPotsByRound[round.id] = await netoRepo.listPotsForRound(round.id);
    }

    const ryderStandings: RyderTeamStanding[] = aggregateTeamTotals(teamPointsPerRound).map(t => {
        const projected = roundBreakdowns.reduce(
            (sum, r) => sum + (t.team === 'red' ? r.teamPointsProjected.red : r.teamPointsProjected.blue),
            0
        );
        return {
            team: t.team,
            matchPointsCumulative: t.matchPointsCumulative,
            matchPointsProjected: projected,
            roundsPlayed: t.roundsPlayed,
        };
    });

    const playerTotals = aggregatePlayerTotals(playerPointsPerRound);

    // Build per-player per-round breakdown by aggregating playerPointsPerRound
    // (multiple entries per (playerId, roundNumber) come from singles + fourball + Stableford rows).
    const courseByRoundNumber = new Map<number, string>(
        roundBreakdowns.map(r => [r.roundNumber, r.courseName])
    );
    const breakdownByPlayer = new Map<string, Map<number, StablefordRoundBreakdown>>();
    for (const entry of playerPointsPerRound) {
        const playerMap = breakdownByPlayer.get(entry.playerId) ?? new Map();
        const prev: StablefordRoundBreakdown = playerMap.get(entry.roundNumber) ?? {
            roundNumber: entry.roundNumber,
            courseName: courseByRoundNumber.get(entry.roundNumber) ?? `Round ${entry.roundNumber}`,
            stablefordPoints: 0,
            ryderIndividualPoints: 0,
        };
        prev.stablefordPoints += entry.stablefordPoints;
        prev.ryderIndividualPoints += entry.ryderIndividualPoints;
        // Only the Stableford-source entry carries hole detail + PH — preserve them.
        if (entry.stablefordHoles) prev.holes = entry.stablefordHoles;
        if (entry.playingHandicap !== undefined) prev.playingHandicap = entry.playingHandicap;
        playerMap.set(entry.roundNumber, prev);
        breakdownByPlayer.set(entry.playerId, playerMap);
    }

    const stablefordStandings: StablefordStanding[] = playerTotals.map(t => {
        const player = rosterById.get(t.playerId);
        const byRound = [...(breakdownByPlayer.get(t.playerId)?.values() ?? [])].sort(
            (a, b) => a.roundNumber - b.roundNumber
        );
        return {
            playerId: t.playerId,
            playerName: player ? playerName(player) : 'Unknown',
            handicapIndex: player?.handicapIndex ?? 0,
            team: player?.team ?? null,
            stablefordCumulative: t.stablefordCumulative,
            ryderIndividualCumulative: t.ryderIndividualCumulative,
            roundsPlayed: t.roundsPlayed,
            byRound,
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
