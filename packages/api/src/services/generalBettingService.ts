/**
 * General Betting Service — La Romana 2026
 *
 * Tournament-wide bets (4 types):
 *   - tournament_winner   → 'red' | 'blue'
 *   - exact_score         → e.g. '20-16'  (must sum to 36 — total Ryder points)
 *   - mvp                 → playerId   (highest Stableford cumulative)
 *   - worst_player        → playerId   (lowest Stableford cumulative)
 *
 * Simplifications vs Bogotá:
 *   - No timing/risk multipliers. timing_factor + partes always 1.
 *   - Pots split equally among winners.
 *   - Lock when ANY hole is scored anywhere in the event.
 */

import { getPool } from '../config/database';
import {
    GeneralBet,
    GeneralBetType,
    createGeneralBet,
    getGeneralBetsForEvent,
    getUserGeneralBets,
    checkExistingBet,
} from '../repositories/generalBetRepository';
import { getLeaderboard, LeaderboardData } from './leaderboardService';

interface PlaceGeneralBetInput {
    eventId: string;
    bettorId: string;
    betType: GeneralBetType;
    pickedOutcome: string;
    comment?: string;
}

/** Bet types that La Romana supports. Others are legacy/disabled. */
export const ACTIVE_BET_TYPES: GeneralBetType[] = [
    'tournament_winner',
    'exact_score',
    'mvp',
    'worst_player',
];

const STATIC_VALID_OUTCOMES: Partial<Record<GeneralBetType, string[]>> = {
    tournament_winner: ['red', 'blue'],
};

/** Total Ryder match points up for grabs across 3 rounds (4 flights × 3 matches × 3 rounds). */
const TOTAL_RYDER_POINTS = 36;

const isExactScoreValid = (raw: string): boolean => {
    const m = raw.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) return false;
    const red = parseInt(m[1], 10);
    const blue = parseInt(m[2], 10);
    return red >= 0 && blue >= 0 && red + blue === TOTAL_RYDER_POINTS;
};

/** True if any hole in the event has been scored — locks all general bets. */
const isEventStarted = async (eventId: string): Promise<boolean> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT 1 FROM hole_scores WHERE event_id = $1 LIMIT 1`,
        [eventId],
    );
    return (res.rowCount ?? 0) > 0;
};

export const placeGeneralBet = async (input: PlaceGeneralBetInput): Promise<GeneralBet> => {
    const pool = getPool();

    // Validate event allows betting
    const evRes = await pool.query('SELECT bet_amount FROM events WHERE id = $1', [input.eventId]);
    if (evRes.rows.length === 0) throw new Error('Event not found');
    const cfgAmount = evRes.rows[0].bet_amount ? parseFloat(evRes.rows[0].bet_amount) : null;
    if (cfgAmount === null || cfgAmount <= 0) {
        throw new Error('Las apuestas no están habilitadas en este evento.');
    }

    if (!ACTIVE_BET_TYPES.includes(input.betType)) {
        throw new Error(`Tipo de apuesta no soportado: ${input.betType}`);
    }

    // Validate the picked outcome shape
    if (input.betType === 'exact_score') {
        if (!isExactScoreValid(input.pickedOutcome)) {
            throw new Error(`Marcador inválido. Formato esperado: 'XX-YY' que sume ${TOTAL_RYDER_POINTS}.`);
        }
    } else if (input.betType === 'mvp' || input.betType === 'worst_player') {
        // Player bets: outcome must be a valid player id in the event
        const r = await pool.query(
            `SELECT 1 FROM players WHERE id = $1 AND event_id = $2 LIMIT 1`,
            [input.pickedOutcome, input.eventId],
        );
        if ((r.rowCount ?? 0) === 0) throw new Error('Jugador inválido para esta apuesta.');
    } else {
        const valid = STATIC_VALID_OUTCOMES[input.betType] ?? [];
        if (!valid.includes(input.pickedOutcome)) {
            throw new Error(`Outcome inválido '${input.pickedOutcome}' para tipo '${input.betType}'.`);
        }
    }

    // Lock check
    if (await isEventStarted(input.eventId)) {
        throw new Error('Apuestas generales cerradas: el torneo ya comenzó.');
    }

    // Replace existing bet of this exact (eventId, bettorId, betType, no-flight-no-segment) tuple
    const existing = await checkExistingBet(
        input.eventId,
        input.bettorId,
        input.betType,
        null,
        null,
    );
    if (existing) {
        await pool.query(`DELETE FROM general_bets WHERE id = $1`, [existing.id]);
    }

    return createGeneralBet({
        eventId: input.eventId,
        bettorId: input.bettorId,
        betType: input.betType,
        flightId: null,
        segmentType: null,
        pickedOutcome: input.pickedOutcome,
        timingFactor: 1,
        partes: 1,
        amount: cfgAmount,
        comment: input.comment ?? null,
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolution
// ─────────────────────────────────────────────────────────────────────────────

interface Resolution {
    betType: GeneralBetType;
    isResolved: boolean;
    winningOutcome: string | null;
}

/**
 * Compute the resolved/unresolved state of each tournament-level bet from
 * the leaderboard. Returns one entry per ACTIVE_BET_TYPES.
 */
const resolveFromLeaderboard = (lb: LeaderboardData): Resolution[] => {
    const out: Resolution[] = [];

    const red = lb.ryderStandings.find(s => s.team === 'red');
    const blue = lb.ryderStandings.find(s => s.team === 'blue');
    const redPts = red?.matchPointsCumulative ?? 0;
    const bluePts = blue?.matchPointsCumulative ?? 0;
    // A round counts as "done" for resolution either when the organizer has
    // explicitly marked it completed in the admin UI, or when every match in
    // every flight has reached `isComplete` (decided or 18 holes scored).
    // Without this fallback, general bets would stay open after the tournament
    // ends until someone clicks "Complete round" — which would leave them out
    // of the settlement transfers entirely.
    const allRoundsCompleted =
        lb.rounds.length > 0 &&
        lb.rounds.every(
            r =>
                r.state === 'completed' ||
                (r.flightSummaries.length > 0 &&
                    r.flightSummaries.every(f => f.matches.length > 0 && f.matches.every(m => m.isComplete))),
        );
    const winThreshold = TOTAL_RYDER_POINTS / 2 + 0.5;

    // ── tournament_winner ──
    let winner: string | null = null;
    if (redPts >= winThreshold) winner = 'red';
    else if (bluePts >= winThreshold) winner = 'blue';
    else if (allRoundsCompleted) winner = redPts > bluePts ? 'red' : (bluePts > redPts ? 'blue' : 'tie');
    out.push({ betType: 'tournament_winner', isResolved: winner !== null, winningOutcome: winner });

    // ── exact_score ──
    if (allRoundsCompleted && redPts + bluePts === TOTAL_RYDER_POINTS) {
        out.push({
            betType: 'exact_score',
            isResolved: true,
            winningOutcome: `${Math.round(redPts * 10) / 10}-${Math.round(bluePts * 10) / 10}`,
        });
    } else {
        out.push({ betType: 'exact_score', isResolved: false, winningOutcome: null });
    }

    // ── mvp / worst_player (Stableford cumulative) ──
    if (allRoundsCompleted && lb.stablefordStandings.length > 0) {
        const sorted = [...lb.stablefordStandings].sort((a, b) => b.stablefordCumulative - a.stablefordCumulative);
        out.push({ betType: 'mvp', isResolved: true, winningOutcome: sorted[0].playerId });
        out.push({ betType: 'worst_player', isResolved: true, winningOutcome: sorted[sorted.length - 1].playerId });
    } else {
        out.push({ betType: 'mvp', isResolved: false, winningOutcome: null });
        out.push({ betType: 'worst_player', isResolved: false, winningOutcome: null });
    }

    return out;
};

// ─────────────────────────────────────────────────────────────────────────────
// Public APIs: pools + settlement
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneralBetPool {
    betType: GeneralBetType;
    flightId: string | null;
    flightName: string | null;
    segmentType: string | null;
    pot: number;
    betsCount: number;
    /** Number of bets per outcome string (since every bet is 1 share). */
    outcomePartes: Record<string, number>;
    isResolved: boolean;
    winningOutcome: string | null;
    /** Display only — both teams' rosters for MVP/worst dropdowns. Empty for non-player pools. */
    redPlayerNames: string[];
    bluePlayerNames: string[];
}

export const getGeneralBetPools = async (eventId: string): Promise<GeneralBetPool[]> => {
    const allBets = await getGeneralBetsForEvent(eventId);
    const lb = await getLeaderboard(eventId);
    const resolutions = resolveFromLeaderboard(lb);

    // Roster by team — used for MVP/worst dropdowns. Format "playerId:Name".
    const pool = getPool();
    const rosterRes = await pool.query(
        `SELECT id, first_name, last_name, team
         FROM players WHERE event_id = $1`,
        [eventId],
    );
    const redRoster: string[] = [];
    const blueRoster: string[] = [];
    for (const r of rosterRes.rows as { id: string; first_name: string; last_name: string; team: string | null }[]) {
        const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
        const entry = `${r.id}:${name}`;
        if (r.team === 'red') redRoster.push(entry);
        else if (r.team === 'blue') blueRoster.push(entry);
    }

    // Group bets by bet type
    const byType: Record<string, GeneralBet[]> = {};
    for (const b of allBets) {
        if (!byType[b.betType]) byType[b.betType] = [];
        byType[b.betType].push(b);
    }

    const pools: GeneralBetPool[] = [];
    for (const bt of ACTIVE_BET_TYPES) {
        const bets = byType[bt] || [];
        const resolution = resolutions.find(r => r.betType === bt);
        const outcomePartes: Record<string, number> = {};
        for (const b of bets) {
            outcomePartes[b.pickedOutcome] = (outcomePartes[b.pickedOutcome] || 0) + 1;
        }
        const isPlayerBet = bt === 'mvp' || bt === 'worst_player';
        pools.push({
            betType: bt,
            flightId: null,
            flightName: null,
            segmentType: null,
            pot: bets.reduce((s, b) => s + b.amount, 0),
            betsCount: bets.length,
            outcomePartes,
            isResolved: resolution?.isResolved ?? false,
            winningOutcome: resolution?.winningOutcome ?? null,
            redPlayerNames: isPlayerBet ? redRoster : [],
            bluePlayerNames: isPlayerBet ? blueRoster : [],
        });
    }

    return pools;
};

export const getGeneralBetSettlement = async (eventId: string): Promise<{
    isPartial: boolean;
    balances: Record<string, number>;
    openWagered: Record<string, number>;
    closedWagered: Record<string, number>;
    closedRecovered: Record<string, number>;
    openPotential: Record<string, number>;
}> => {
    const allBets = await getGeneralBetsForEvent(eventId);
    const lb = await getLeaderboard(eventId);
    const resolutions = resolveFromLeaderboard(lb);

    let isPartial = false;
    const balances: Record<string, number> = {};
    const openWagered: Record<string, number> = {};
    const closedWagered: Record<string, number> = {};
    const closedRecovered: Record<string, number> = {};
    const openPotential: Record<string, number> = {};

    const ensure = (id: string) => {
        if (balances[id] === undefined) balances[id] = 0;
        if (openWagered[id] === undefined) openWagered[id] = 0;
        if (closedWagered[id] === undefined) closedWagered[id] = 0;
        if (closedRecovered[id] === undefined) closedRecovered[id] = 0;
        if (openPotential[id] === undefined) openPotential[id] = 0;
    };

    // Group bets by type
    const byType: Record<string, GeneralBet[]> = {};
    for (const b of allBets) {
        if (!byType[b.betType]) byType[b.betType] = [];
        byType[b.betType].push(b);
    }

    for (const [bt, bets] of Object.entries(byType)) {
        const resolution = resolutions.find(r => r.betType === bt);
        const pot = bets.reduce((s, b) => s + b.amount, 0);
        const winners = resolution?.isResolved && resolution.winningOutcome
            ? bets.filter(b => b.pickedOutcome === resolution.winningOutcome)
            : [];
        const numWinners = winners.length;

        if (!resolution?.isResolved) isPartial = true;

        for (const bet of bets) {
            ensure(bet.bettorId);

            if (resolution?.isResolved) {
                closedWagered[bet.bettorId] += bet.amount;
                balances[bet.bettorId] -= bet.amount;
                // Refund if no winners
                if (numWinners === 0) {
                    balances[bet.bettorId] += bet.amount;
                    closedRecovered[bet.bettorId] += bet.amount;
                } else if (bet.pickedOutcome === resolution.winningOutcome) {
                    const payout = pot / numWinners;
                    balances[bet.bettorId] += payout;
                    closedRecovered[bet.bettorId] += payout;
                }
            } else {
                openWagered[bet.bettorId] += bet.amount;
                const sameSide = bets.filter(b => b.pickedOutcome === bet.pickedOutcome).length;
                if (sameSide > 0) openPotential[bet.bettorId] += pot / sameSide;
            }
        }
    }

    return { isPartial, balances, openWagered, closedWagered, closedRecovered, openPotential };
};
