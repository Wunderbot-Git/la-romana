// Score Service — hole-score submission + aggregated scoreboard for a flight/round.

import {
    upsertHoleScoresBatch,
    getFlightHoleScores,
    HoleScore,
    CreateHoleScoreInput,
    deleteFlightHoleScores,
    deleteHoleScoresForHole,
    deleteRoundHoleScores,
} from '../repositories/holeScoreRepository';
import { createAuditLog } from '../repositories/auditRepository';
import { getPool } from '../config/database';
import { formatMatchStatus } from '../scoring/matchStatus';
import { invalidateLeaderboardCache } from './leaderboardService';
import { calculateFlightMatches, FlightPlayerScores } from '../scoring/flightMatchCalculator';
import { computePlayingHandicapFromIndex } from '../scoring/handicap';
import * as playerRoundTeeRepo from '../repositories/playerRoundTeeRepository';

export interface SubmitScoreInput {
    playerId: string;
    holeNumber: number;
    grossScore: number | null;
    mutationId: string;
}

export interface SubmitScoresInput {
    eventId: string;
    roundId: string;
    flightId: string;
    userId: string;
    scores: SubmitScoreInput[];
    source?: 'online' | 'offline';
}

export interface SubmitScoresResult {
    success: boolean;
    created: number;
    updated: number;
    conflicts: { holeNumber: number; playerId?: string; currentVersion: number }[];
    scores: HoleScore[];
}

/** Events must be live to accept score submissions. */
export const validateEventLive = async (eventId: string): Promise<void> => {
    const pool = getPool();
    const res = await pool.query('SELECT status FROM events WHERE id = $1', [eventId]);
    if (res.rows.length === 0) throw new Error('Event not found');
    if (res.rows[0].status !== 'live') {
        throw new Error('Event is not live. Scores can only be submitted during live events.');
    }
};

/** Flight must belong to the round. */
export const validateFlightInRound = async (flightId: string, roundId: string): Promise<void> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT id FROM flights WHERE id = $1 AND round_id = $2`,
        [flightId, roundId]
    );
    if (res.rows.length === 0) throw new Error('Flight does not belong to this round');
};

/** Player must be assigned to the flight (per-round junction; organizer override: allow if player exists). */
export const validatePlayerInFlight = async (playerId: string, flightId: string): Promise<void> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT pf.id
         FROM player_flights pf
         WHERE pf.player_id = $1 AND pf.flight_id = $2
         LIMIT 1`,
        [playerId, flightId]
    );
    if (res.rows.length === 0) {
        const playerExists = await pool.query('SELECT id FROM players WHERE id = $1', [playerId]);
        if (playerExists.rows.length === 0) throw new Error('Player not found');
        // Allow scoring if player exists (organizer override)
    }
};

/**
 * Submit hole scores for a flight within a round. Full 18-hole support;
 * scramble is no longer part of the format.
 */
export const submitHoleScores = async (input: SubmitScoresInput): Promise<SubmitScoresResult> => {
    await validateEventLive(input.eventId);
    await validateFlightInRound(input.flightId, input.roundId);

    const conflicts: SubmitScoresResult['conflicts'] = [];
    const createInputs: CreateHoleScoreInput[] = [];
    const deletions: SubmitScoreInput[] = [];

    for (const score of input.scores) {
        if (score.holeNumber < 1 || score.holeNumber > 18) {
            throw new Error(`Invalid hole number: ${score.holeNumber}. Must be 1..18.`);
        }
        if (score.grossScore === null || score.grossScore === 0) {
            deletions.push(score);
            continue;
        }
        if (typeof score.grossScore === 'number' && score.grossScore < 0) {
            throw new Error(`Invalid gross score: ${score.grossScore}. Must be positive.`);
        }
        createInputs.push({
            eventId: input.eventId,
            roundId: input.roundId,
            flightId: input.flightId,
            playerId: score.playerId,
            holeNumber: score.holeNumber,
            grossScore: score.grossScore as number,
            mutationId: score.mutationId,
            enteredByUserId: input.userId,
            source: input.source || 'online',
        });
    }

    const pool = getPool();
    const client = await pool.connect();
    let result: { scores: HoleScore[]; created: number; updated: number };

    try {
        await client.query('BEGIN');
        result = await upsertHoleScoresBatch(createInputs, client);

        for (const score of deletions) {
            await client.query(
                `DELETE FROM hole_scores
                 WHERE round_id = $1 AND flight_id = $2 AND player_id = $3 AND hole_number = $4`,
                [input.roundId, input.flightId, score.playerId, score.holeNumber]
            );
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    for (const score of deletions) {
        await createAuditLog({
            eventId: input.eventId,
            entityType: 'hole_score',
            entityId: score.playerId,
            action: 'delete',
            previousValue: { grossScore: 'unknown', holeNumber: score.holeNumber, roundId: input.roundId },
            newValue: { grossScore: null, holeNumber: score.holeNumber, roundId: input.roundId },
            source: input.source || 'online',
            byUserId: input.userId,
        });
    }

    invalidateLeaderboardCache(input.eventId);

    return {
        success: true,
        created: result.created,
        updated: result.updated,
        conflicts,
        scores: result.scores,
    };
};

export const getHoleScoresForFlight = async (flightId: string): Promise<HoleScore[]> => {
    return getFlightHoleScores(flightId);
};

/**
 * Aggregated scoreboard for a single flight — used by the /matches page.
 * Returns per-player scores plus the computed singles + fourball match states.
 */
export const getFlightScoreboardData = async (flightId: string) => {
    const pool = getPool();

    const flightRes = await pool.query(
        'SELECT id, flight_number, event_id, round_id, state FROM flights WHERE id = $1',
        [flightId]
    );
    if (flightRes.rows.length === 0) throw new Error('Flight not found');
    const flight = flightRes.rows[0];

    // Use per-round junction (`player_flights`) so the same player can appear on
    // different flights / different teams in different rounds. team + position
    // come from the junction, NOT the legacy `players.team`/`position` columns.
    const playersRes = await pool.query(
        `SELECT
            p.id, p.first_name, p.last_name, p.handicap_index, p.tee_id,
            pf.team     AS team,
            pf.position AS position
         FROM player_flights pf
         JOIN players p ON p.id = pf.player_id
         WHERE pf.flight_id = $1
         ORDER BY pf.team, pf.position`,
        [flightId]
    );
    const redPlayers = playersRes.rows.filter((p: any) => p.team === 'red');
    const bluePlayers = playersRes.rows.filter((p: any) => p.team === 'blue');

    const holeScores = await getFlightHoleScores(flightId);

    // Fetch this round's course par + SI + slope/rating per tee
    const roundRes = await pool.query(
        `SELECT r.course_id, r.hcp_singles_pct, r.hcp_fourball_pct
         FROM rounds r WHERE r.id = $1`,
        [flight.round_id]
    );
    const courseId = roundRes.rows[0]?.course_id;
    const hcpSinglesPct = parseFloat(roundRes.rows[0]?.hcp_singles_pct ?? '0.8');
    const hcpFourballPct = parseFloat(roundRes.rows[0]?.hcp_fourball_pct ?? '0.8');

    let parValues = Array(18).fill(4);
    let defaultSi = Array.from({ length: 18 }, (_, i) => i + 1);
    const teeSiMap: Record<string, number[]> = {};
    const teeRatingMap: Record<string, { slope: number | null; rating: number | null; par: number | null }> = {};

    if (courseId) {
        const teesRes = await pool.query(
            `SELECT t.id, t.name, t.slope_rating, t.course_rating
             FROM tees t WHERE t.course_id = $1`,
            [courseId]
        );
        for (const tee of teesRes.rows) {
            const holesRes = await pool.query(
                `SELECT hole_number, par, stroke_index FROM holes WHERE tee_id = $1 ORDER BY hole_number ASC`,
                [tee.id]
            );
            if (holesRes.rows.length === 18) {
                teeSiMap[tee.id] = holesRes.rows.map((h: any) => h.stroke_index);
                const teePars = holesRes.rows.map((h: any) => h.par);
                teeRatingMap[tee.id] = {
                    slope: tee.slope_rating != null ? parseFloat(tee.slope_rating) : null,
                    rating: tee.course_rating != null ? parseFloat(tee.course_rating) : null,
                    par: teePars.reduce((a: number, b: number) => a + b, 0),
                };
                // Use first tee encountered as the baseline for par display
                if (Object.keys(teeSiMap).length === 1) {
                    parValues = teePars;
                    defaultSi = holesRes.rows.map((h: any) => h.stroke_index);
                }
            }
        }
    }

    // Per-round tee overrides — same junction the match engine uses (migration 026).
    const roundTeeMap = await playerRoundTeeRepo.getRoundTeeMap(flight.round_id);

    const mapPlayer = (p: any) => {
        const pScores = holeScores.filter(s => s.playerId === p.id);
        const scores = Array(18).fill(null);
        pScores.forEach(s => {
            if (s.holeNumber >= 1 && s.holeNumber <= 18) {
                scores[s.holeNumber - 1] = s.grossScore;
            }
        });
        // Per-round tee override > player default. Match engine uses the same precedence.
        const effectiveTeeId = roundTeeMap.get(p.id) ?? p.tee_id;
        const playerSiValues = (effectiveTeeId && teeSiMap[effectiveTeeId]) || defaultSi;
        const teeRating = (effectiveTeeId && teeRatingMap[effectiveTeeId]) || null;
        const handicapIndex = parseFloat(p.handicap_index) || 0;
        const phSingles = computePlayingHandicapFromIndex({
            handicapIndex,
            slope: teeRating?.slope ?? null,
            rating: teeRating?.rating ?? null,
            par: teeRating?.par ?? null,
            allowance: hcpSinglesPct,
        }).playingHandicap;
        const phFourball = computePlayingHandicapFromIndex({
            handicapIndex,
            slope: teeRating?.slope ?? null,
            rating: teeRating?.rating ?? null,
            par: teeRating?.par ?? null,
            allowance: hcpFourballPct,
        }).playingHandicap;
        return {
            playerId: p.id,
            playerName: [p.first_name, p.last_name].filter((n: string) => n && n !== '-').join(' ').trim(),
            hcp: handicapIndex,
            playingHcpSingles: phSingles,
            playingHcpFourball: phFourball,
            scores,
            siValues: playerSiValues,
            singlesStatus: null as string | null,
            singlesResult: null as 'win' | 'loss' | 'halved' | null,
            singlesHoles: Array(18).fill(null) as (string | null)[],
        };
    };

    const redPlayersData = redPlayers.map(mapPlayer);
    const bluePlayersData = bluePlayers.map(mapPlayer);

    let matchStatus = 'Not Started';
    let fourballStatus = 'Not Started';
    let fourballWinner: 'red' | 'blue' | null = null;
    let fourballComplete = false;
    let fourballLeader: 'red' | 'blue' | null = null;
    let fourballLead = 0;
    const matchProgression = Array(18).fill(null);
    const holeWinners = Array(18).fill(null);
    const matchLeaders = Array(18).fill(null);

    if (redPlayers.length >= 2 && bluePlayers.length >= 2) {
        const buildCalcInput = (pIdx: number, team: 'red' | 'blue'): FlightPlayerScores => {
            const playersList = team === 'red' ? redPlayersData : bluePlayersData;
            const pData = playersList[pIdx];
            return {
                handicapIndex: pData.hcp,
                grossScores: pData.scores,
                strokeIndexes: pData.siValues,
            };
        };

        const result = calculateFlightMatches({
            redPlayer1: buildCalcInput(0, 'red'),
            redPlayer2: buildCalcInput(1, 'red'),
            bluePlayer1: buildCalcInput(0, 'blue'),
            bluePlayer2: buildCalcInput(1, 'blue'),
        });

        const formatSinglesStatus = (res: any, team: 'red' | 'blue'): string | null => {
            if (!res) return null;
            if (res.result.finalStatus === 'Not Started') return null;
            if (res.result.winner) {
                const status = res.result.finalStatus;
                if (res.result.winner === team) return `Won ${status}`;
                return `Lost ${status.replace('UP', 'DN')}`;
            }
            const leader = res.finalState.leader;
            const lead = res.finalState.lead;
            if (leader === null) return 'A/S';
            if (leader === team) return `${lead} UP`;
            return `${lead} DN`;
        };

        if (result.singles1) {
            redPlayersData[0].singlesStatus = formatSinglesStatus(result.singles1, 'red');
            bluePlayersData[0].singlesStatus = formatSinglesStatus(result.singles1, 'blue');
            redPlayersData[0].singlesResult = result.singles1.result.winner === 'red' ? 'win'
                : result.singles1.result.winner === 'blue' ? 'loss' : null;
            bluePlayersData[0].singlesResult = result.singles1.result.winner === 'blue' ? 'win'
                : result.singles1.result.winner === 'red' ? 'loss' : null;
            result.singles1.holes.forEach(h => {
                redPlayersData[0].singlesHoles[h.holeNumber - 1] = h.winner;
                bluePlayersData[0].singlesHoles[h.holeNumber - 1] = h.winner;
            });
        }

        if (result.singles2) {
            redPlayersData[1].singlesStatus = formatSinglesStatus(result.singles2, 'red');
            bluePlayersData[1].singlesStatus = formatSinglesStatus(result.singles2, 'blue');
            redPlayersData[1].singlesResult = result.singles2.result.winner === 'red' ? 'win'
                : result.singles2.result.winner === 'blue' ? 'loss' : null;
            bluePlayersData[1].singlesResult = result.singles2.result.winner === 'blue' ? 'win'
                : result.singles2.result.winner === 'red' ? 'loss' : null;
            result.singles2.holes.forEach(h => {
                redPlayersData[1].singlesHoles[h.holeNumber - 1] = h.winner;
                bluePlayersData[1].singlesHoles[h.holeNumber - 1] = h.winner;
            });
        }

        if (result.fourball) {
            fourballStatus = result.fourball.result.finalStatus;
            fourballWinner = result.fourball.result.winner;
            fourballComplete = result.fourball.finalState.holesRemaining === 0 || result.fourball.finalState.isDecided;
            fourballLeader = result.fourball.finalState.leader;
            fourballLead = result.fourball.finalState.lead;
            result.fourball.holes.forEach(h => {
                matchProgression[h.holeNumber - 1] = formatMatchStatus(h.matchState);
                holeWinners[h.holeNumber - 1] = h.winner;
                matchLeaders[h.holeNumber - 1] = h.matchState.leader;
            });
        }

        matchStatus = fourballStatus;
    }

    return {
        flightId: flight.id,
        roundId: flight.round_id,
        flightName: `Grupo ${flight.flight_number}`,
        matchStatus,
        fourballStatus,
        fourballWinner,
        fourballComplete,
        fourballLeader,
        fourballLead,
        matchProgression,
        holeWinners,
        matchLeaders,
        currentHole: Math.max(0, ...holeScores.map(s => s.holeNumber)) + 1,
        redPlayers: redPlayersData,
        bluePlayers: bluePlayersData,
        parValues,
    };
};

/** Admin: delete all scores for a flight. */
export const adminDeleteFlightScores = async (eventId: string, flightId: string, userId: string) => {
    const holeDeleted = await deleteFlightHoleScores(flightId);

    await createAuditLog({
        eventId,
        entityType: 'flight_scores',
        entityId: flightId,
        action: 'admin_delete_all',
        previousValue: { holeScores: holeDeleted },
        newValue: null,
        source: 'online',
        byUserId: userId,
    });

    invalidateLeaderboardCache(eventId);
    return { holeDeleted };
};

/**
 * Admin: delete *all* hole_scores for a round, regardless of flight_id.
 * Catches orphaned rows that the flight-scoped delete misses (e.g. dirty
 * test taps that landed without a flight composition, or rows whose flight
 * was later deleted).
 */
export const adminDeleteRoundScores = async (eventId: string, roundId: string, userId: string) => {
    const holeDeleted = await deleteRoundHoleScores(roundId);

    await createAuditLog({
        eventId,
        entityType: 'round_scores',
        entityId: roundId,
        action: 'admin_delete_all',
        previousValue: { holeScores: holeDeleted },
        newValue: null,
        source: 'online',
        byUserId: userId,
    });

    invalidateLeaderboardCache(eventId);
    return { holeDeleted };
};

/** Admin: delete scores for a specific hole in a flight. */
export const adminDeleteHoleScores = async (
    eventId: string,
    flightId: string,
    holeNumber: number,
    userId: string
) => {
    const deleted = await deleteHoleScoresForHole(flightId, holeNumber);

    await createAuditLog({
        eventId,
        entityType: 'hole_score',
        entityId: flightId,
        action: 'admin_delete_hole',
        previousValue: { holeNumber, deleted },
        newValue: null,
        source: 'online',
        byUserId: userId,
    });

    invalidateLeaderboardCache(eventId);
    return { deleted, holeNumber };
};
