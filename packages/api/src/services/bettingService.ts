/**
 * Betting Service — La Romana 2026
 *
 * Simplifications vs Bogotá:
 *   - No timing/risk multipliers. Every bet = 1 share = $2 USD.
 *   - Pots split EQUALLY among winning bets.
 *   - Match bets lock the moment the first hole is scored for that
 *     (round, flight). No late betting, no leader-restriction logic.
 *   - Per-round scoping: bets reference round_id explicitly.
 *
 * One match = one (round_id, flight_id, segment_type) triple, where segment_type
 * ∈ {'singles1','singles2','fourball'}. Per round there are 4 flights × 3
 * segments = 12 match bets per player; across 3 rounds = 36 total.
 */

import { getPool } from '../config/database';
import {
    Bet,
    createBet,
    getBetsForEvent,
    getExistingMatchBet,
} from '../repositories/betRepository';
import { getUserGeneralBets } from '../repositories/generalBetRepository';
import { getLeaderboard } from './leaderboardService';
import { getGeneralBetSettlement } from './generalBettingService';

/** Fixed bet amount for La Romana (USD). */
export const BET_AMOUNT_USD = 2;

interface PlaceMatchBetInput {
    eventId: string;
    roundId: string;
    flightId: string;
    segmentType: 'singles1' | 'singles2' | 'fourball';
    bettorId: string;
    pickedOutcome: 'A' | 'B' | 'AS';
    comment?: string;
}

/**
 * Returns true if any hole has been scored for this (round, flight) — meaning
 * the betting window is closed for ALL three matches in this flight.
 */
export const isFlightStarted = async (roundId: string, flightId: string): Promise<boolean> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT 1 FROM hole_scores WHERE round_id = $1 AND flight_id = $2 LIMIT 1`,
        [roundId, flightId],
    );
    return (res.rowCount ?? 0) > 0;
};

/** Returns true if any hole has been scored anywhere in this event. */
export const isEventStarted = async (eventId: string): Promise<boolean> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT 1 FROM hole_scores WHERE event_id = $1 LIMIT 1`,
        [eventId],
    );
    return (res.rowCount ?? 0) > 0;
};

/** Place (or replace) a match bet. Bets stay OPEN at all times for La Romana
 *  per Phil-Request 2026-05-02 — players can bet (or change a bet) at any
 *  point during the round, including after a match is fully scored. */
export const placeBet = async (input: PlaceMatchBetInput): Promise<Bet> => {
    // Validate event allows betting (bet_amount > 0). We use our fixed $2 but still
    // gate on bet_amount being set so this is configurable per event later.
    const pool = getPool();
    const evRes = await pool.query('SELECT bet_amount FROM events WHERE id = $1', [input.eventId]);
    if (evRes.rows.length === 0) throw new Error('Event not found');
    const cfgAmount = evRes.rows[0].bet_amount ? parseFloat(evRes.rows[0].bet_amount) : null;
    if (cfgAmount === null || cfgAmount <= 0) {
        throw new Error('Las apuestas no están habilitadas en este evento.');
    }

    // Replace existing bet if one exists (still allowed — bets stay open)
    const existing = await getExistingMatchBet(
        input.roundId,
        input.flightId,
        input.segmentType,
        input.bettorId,
    );
    if (existing) {
        await pool.query(`DELETE FROM bets WHERE id = $1`, [existing.id]);
    }

    return createBet({
        eventId: input.eventId,
        roundId: input.roundId,
        flightId: input.flightId,
        segmentType: input.segmentType,
        bettorId: input.bettorId,
        pickedOutcome: input.pickedOutcome,
        timingFactor: 1,
        riskFactor: 1,
        partes: 1,
        amount: cfgAmount,
        scoreAtBet: null,
        holeAtBet: null,
        comment: input.comment ?? null,
        isAdditional: false,
    });
};

/**
 * Returns all bets for a specific match (roundId × flightId × segmentType)
 * with current pot + counts per outcome.
 */
export const getMatchBets = async (
    roundId: string,
    flightId: string,
    segmentType: string,
): Promise<{ bets: Bet[]; pot: number; counts: { A: number; B: number; AS: number } }> => {
    const pool = getPool();
    const res = await pool.query(
        `SELECT * FROM bets
         WHERE round_id = $1 AND flight_id = $2 AND segment_type = $3
         ORDER BY created_at ASC`,
        [roundId, flightId, segmentType],
    );
    const bets: Bet[] = res.rows.map((row: any) => ({
        id: row.id,
        eventId: row.event_id,
        roundId: row.round_id,
        flightId: row.flight_id,
        segmentType: row.segment_type,
        bettorId: row.bettor_id,
        pickedOutcome: row.picked_outcome,
        timingFactor: row.timing_factor,
        riskFactor: row.risk_factor,
        partes: row.partes,
        amount: parseFloat(row.amount),
        scoreAtBet: row.score_at_bet,
        holeAtBet: row.hole_at_bet,
        comment: row.comment,
        isAdditional: row.is_additional || false,
        createdAt: row.created_at,
    }));
    const pot = bets.reduce((sum, b) => sum + b.amount, 0);
    const counts = {
        A: bets.filter(b => b.pickedOutcome === 'A').length,
        B: bets.filter(b => b.pickedOutcome === 'B').length,
        AS: bets.filter(b => b.pickedOutcome === 'AS').length,
    };
    return { bets, pot, counts };
};

// ─────────────────────────────────────────────────────────────────────────────
// Tournament settlement
// ─────────────────────────────────────────────────────────────────────────────

interface MatchOutcomeKey {
    roundId: string;
    flightId: string;
    segmentType: 'singles1' | 'singles2' | 'fourball';
}

interface MatchOutcomeValue {
    isComplete: boolean;
    winner: 'A' | 'B' | 'AS' | null;  // null if not finished
}

/**
 * Build a map of every match's current outcome from the leaderboard service.
 * Maps team color → bet outcome:  red → A, blue → B, halved → AS.
 */
const collectMatchOutcomes = async (eventId: string): Promise<Map<string, MatchOutcomeValue>> => {
    const lb = await getLeaderboard(eventId);
    const map = new Map<string, MatchOutcomeValue>();
    for (const round of lb.rounds) {
        for (const flight of round.flightSummaries) {
            for (const m of flight.matches) {
                const key = `${round.roundId}::${flight.flightId}::${m.matchType}`;
                let winner: 'A' | 'B' | 'AS' | null = null;
                if (m.isComplete) {
                    winner = m.winner === 'red' ? 'A' : m.winner === 'blue' ? 'B' : 'AS';
                }
                map.set(key, { isComplete: m.isComplete, winner });
            }
        }
    }
    return map;
};

export interface BetEnriched extends Bet {
    status: 'open' | 'closed';
    realizedPayout: number;
    potentialPayout: number;
    /** 'A' | 'B' | 'AS' once the match is decided, else null. */
    winningOutcome: 'A' | 'B' | 'AS' | null;
}

export interface SettlementBalance {
    id: string;
    name: string;
    balance: number;
}

export interface SettlementTransfer {
    from: string;
    to: string;
    amount: number;
}

export interface SettlementData {
    isPartial: boolean;
    balances: SettlementBalance[];
    transfers: SettlementTransfer[];
    /** Internal aggregates re-used by `getPersonalStats`. */
    personalStats: {
        playerOpenWagered: Record<string, number>;
        playerClosedWagered: Record<string, number>;
        playerClosedRecovered: Record<string, number>;
        playerOpenPotential: Record<string, number>;
        playerBets: Record<string, BetEnriched[]>;
    };
}

export const getTournamentSettlement = async (eventId: string): Promise<SettlementData> => {
    const pool = getPool();
    const allBets = await getBetsForEvent(eventId);
    const outcomes = await collectMatchOutcomes(eventId);

    const playerBalances: Record<string, number> = {};
    const playerOpenWagered: Record<string, number> = {};
    const playerClosedWagered: Record<string, number> = {};
    const playerClosedRecovered: Record<string, number> = {};
    const playerOpenPotential: Record<string, number> = {};
    const playerBets: Record<string, BetEnriched[]> = {};

    let isPartial = false;

    // Group bets by match (roundId × flightId × segmentType)
    const betsByMatch = new Map<string, Bet[]>();
    for (const b of allBets) {
        const key = `${b.roundId}::${b.flightId}::${b.segmentType}`;
        if (!betsByMatch.has(key)) betsByMatch.set(key, []);
        betsByMatch.get(key)!.push(b);
    }

    const ensure = (id: string) => {
        if (playerBalances[id] === undefined) playerBalances[id] = 0;
        if (playerOpenWagered[id] === undefined) playerOpenWagered[id] = 0;
        if (playerClosedWagered[id] === undefined) playerClosedWagered[id] = 0;
        if (playerClosedRecovered[id] === undefined) playerClosedRecovered[id] = 0;
        if (playerOpenPotential[id] === undefined) playerOpenPotential[id] = 0;
        if (!playerBets[id]) playerBets[id] = [];
    };

    for (const [key, matchBets] of betsByMatch) {
        const outcome = outcomes.get(key);
        const isFinished = outcome?.isComplete ?? false;
        const winner = outcome?.winner ?? null;
        if (!isFinished) isPartial = true;

        const pot = matchBets.reduce((sum, b) => sum + b.amount, 0);
        const winningBets = winner !== null ? matchBets.filter(b => b.pickedOutcome === winner) : [];
        const numWinners = winningBets.length;

        for (const bet of matchBets) {
            ensure(bet.bettorId);
            const enriched: BetEnriched = {
                ...bet,
                status: isFinished ? 'closed' : 'open',
                realizedPayout: 0,
                potentialPayout: 0,
                winningOutcome: winner,
            };

            if (isFinished) {
                playerClosedWagered[bet.bettorId] += bet.amount;
                playerBalances[bet.bettorId] -= bet.amount; // wager paid

                // Edge: nobody bet on the winning outcome → refund to all bettors of that match.
                if (numWinners === 0) {
                    playerBalances[bet.bettorId] += bet.amount;
                    playerClosedRecovered[bet.bettorId] += bet.amount;
                    enriched.realizedPayout = bet.amount;
                } else if (bet.pickedOutcome === winner) {
                    const payout = pot / numWinners;
                    playerBalances[bet.bettorId] += payout;
                    playerClosedRecovered[bet.bettorId] += payout;
                    enriched.realizedPayout = payout;
                }
                enriched.potentialPayout = enriched.realizedPayout;
            } else {
                // Open match: project potential payout assuming current pool stays
                playerOpenWagered[bet.bettorId] += bet.amount;
                const sameSideCount = matchBets.filter(b => b.pickedOutcome === bet.pickedOutcome).length;
                if (sameSideCount > 0) {
                    const projectedPayout = pot / sameSideCount;
                    playerOpenPotential[bet.bettorId] += projectedPayout;
                    enriched.potentialPayout = projectedPayout;
                }
            }

            playerBets[bet.bettorId].push(enriched);
        }
    }

    // Merge in general-bet settlement (also produces balance deltas + open/closed splits)
    const general = await getGeneralBetSettlement(eventId);
    if (general.isPartial) isPartial = true;
    for (const [id, v] of Object.entries(general.balances)) {
        playerBalances[id] = (playerBalances[id] || 0) + v;
    }
    for (const [id, v] of Object.entries(general.openWagered)) {
        playerOpenWagered[id] = (playerOpenWagered[id] || 0) + v;
    }
    for (const [id, v] of Object.entries(general.closedWagered)) {
        playerClosedWagered[id] = (playerClosedWagered[id] || 0) + v;
    }
    for (const [id, v] of Object.entries(general.closedRecovered)) {
        playerClosedRecovered[id] = (playerClosedRecovered[id] || 0) + v;
    }
    for (const [id, v] of Object.entries(general.openPotential)) {
        playerOpenPotential[id] = (playerOpenPotential[id] || 0) + v;
    }

    // Resolve names
    const ids = Object.keys(playerBalances);
    const usersRes = ids.length > 0
        ? await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [ids])
        : { rows: [] };
    const nameMap: Record<string, string> = {};
    for (const r of usersRes.rows as { id: string; name: string }[]) {
        nameMap[r.id] = r.name || 'Unknown';
    }

    // Greedy debt minimization
    const debtors = ids
        .filter(id => playerBalances[id] < -0.01)
        .map(id => ({ id, name: nameMap[id] ?? 'Unknown', balance: playerBalances[id] }))
        .sort((a, b) => a.balance - b.balance);
    const creditors = ids
        .filter(id => playerBalances[id] > 0.01)
        .map(id => ({ id, name: nameMap[id] ?? 'Unknown', balance: playerBalances[id] }))
        .sort((a, b) => b.balance - a.balance);

    const transfers: SettlementTransfer[] = [];
    let dIdx = 0;
    let cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
        const debt = -debtors[dIdx].balance;
        const credit = creditors[cIdx].balance;
        const amount = Math.min(debt, credit);
        transfers.push({ from: debtors[dIdx].id, to: creditors[cIdx].id, amount });
        debtors[dIdx].balance += amount;
        creditors[cIdx].balance -= amount;
        if (Math.abs(debtors[dIdx].balance) < 0.01) dIdx++;
        if (Math.abs(creditors[cIdx].balance) < 0.01) cIdx++;
    }

    const balances: SettlementBalance[] = ids
        .map(id => ({ id, name: nameMap[id] ?? 'Unknown', balance: playerBalances[id] }))
        .sort((a, b) => b.balance - a.balance);

    return {
        isPartial,
        balances,
        transfers,
        personalStats: {
            playerOpenWagered,
            playerClosedWagered,
            playerClosedRecovered,
            playerOpenPotential,
            playerBets,
        },
    };
};

export interface PersonalStats {
    wagered: number;
    realizedNet: number;
    potential: number;
    closedWagered: number;
    closedRecovered: number;
    bets: BetEnriched[];
    generalBetsCount: number;
}

export const getPersonalStats = async (eventId: string, bettorId: string): Promise<PersonalStats> => {
    const [settlement, generalBets] = await Promise.all([
        getTournamentSettlement(eventId),
        getUserGeneralBets(eventId, bettorId),
    ]);

    const open = settlement.personalStats.playerOpenWagered[bettorId] || 0;
    const closed = settlement.personalStats.playerClosedWagered[bettorId] || 0;
    const recovered = settlement.personalStats.playerClosedRecovered[bettorId] || 0;
    const potential = settlement.personalStats.playerOpenPotential[bettorId] || 0;
    const userBets = settlement.personalStats.playerBets[bettorId] || [];

    return {
        wagered: open + closed,
        realizedNet: recovered - closed,
        potential,
        closedWagered: closed,
        closedRecovered: recovered,
        bets: userBets,
        generalBetsCount: generalBets.length,
    };
};
