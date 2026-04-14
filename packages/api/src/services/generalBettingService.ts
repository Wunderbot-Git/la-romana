import { getPool } from '../config/database';
import {
    GeneralBet, GeneralBetType, REMOVED_BET_TYPES,
    createGeneralBet, getGeneralBetsForEvent, getUserGeneralBets,
    getGeneralBetsByType, checkExistingBet
} from '../repositories/generalBetRepository';
import { getLeaderboard, Match, LeaderboardData, PlayerScore } from './leaderboardService';

interface PlaceGeneralBetInput {
    eventId: string;
    bettorId: string;
    betType: GeneralBetType;
    pickedOutcome: string;
    flightId?: string;
    segmentType?: string;
    comment?: string;
}

const VALID_OUTCOMES: Record<string, string[]> = {
    tournament_winner: ['red', 'blue'],
    mvp: [], // dynamic — any player id
    worst_player: [], // dynamic — any player id
    exact_score: [], // dynamic — validated via regex
    // Removed types kept for historical resolution
    flight_winner: ['red', 'blue', 'tie'],
    flight_sweep: ['red', 'blue'],
    biggest_blowout: [],
    any_halve: ['yes', 'no'],
    early_close: ['yes', 'no'],
};

/**
 * Determine timing factor based on tournament state.
 * Pre-tournament (no matches started) = 3x, early play = 2x, mid/late = 1x
 */
function getTimingFactor(leaderboard: LeaderboardData): number {
    const started = leaderboard.matches.filter(m => m.status !== 'not_started').length;
    const total = leaderboard.matches.length;
    if (started === 0) return 3;
    if (started / total < 0.25) return 2;
    return 1;
}

export const placeGeneralBet = async (input: PlaceGeneralBetInput): Promise<GeneralBet> => {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Validate event has betting enabled
        const eventRes = await client.query('SELECT bet_amount FROM events WHERE id = $1', [input.eventId]);
        if (eventRes.rows.length === 0) throw new Error('Event not found');
        const betAmount = eventRes.rows[0].bet_amount ? parseFloat(eventRes.rows[0].bet_amount) : 5000;
        if (!betAmount || betAmount <= 0) throw new Error('Betting is not enabled for this event.');

        // 2. Reject removed bet types
        if (REMOVED_BET_TYPES.includes(input.betType)) {
            throw new Error(`Bet type '${input.betType}' is no longer available.`);
        }

        // 3. Validate bet type and outcome
        const dynamicBetTypes: GeneralBetType[] = ['mvp', 'worst_player', 'exact_score'];
        const validOutcomes = VALID_OUTCOMES[input.betType] || [];
        if (!dynamicBetTypes.includes(input.betType) && !validOutcomes.includes(input.pickedOutcome)) {
            throw new Error(`Invalid outcome '${input.pickedOutcome}' for bet type '${input.betType}'.`);
        }

        // 4. Validate exact_score format: "X-Y" where X+Y=25, 0.5 increments
        if (input.betType === 'exact_score') {
            const match = input.pickedOutcome.match(/^(\d+\.?5?)-(\d+\.?5?)$/);
            if (!match) throw new Error('Formato inválido. Esperado: "X-Y" como "14-11".');
            const pitufos = parseFloat(match[1]);
            const cariniositos = parseFloat(match[2]);
            if (pitufos + cariniositos !== 25) throw new Error('Los marcadores deben sumar 25.');
            if (pitufos < 0 || pitufos > 25 || cariniositos < 0 || cariniositos > 25) throw new Error('Marcador fuera de rango (0-25).');
            if (pitufos % 0.5 !== 0 || cariniositos % 0.5 !== 0) throw new Error('Los marcadores deben ser en incrementos de 0.5.');
        }

        // 4. Get leaderboard for timing factor and validation
        const leaderboard = await getLeaderboard(input.eventId);

        // 5. Check for duplicate bet (FOR UPDATE on same client) — allow replacement if no scores recorded yet
        const existing = await checkExistingBet(
            input.eventId, input.bettorId, input.betType,
            input.flightId || null, input.segmentType || null,
            client
        );
        if (existing) {
            const started = leaderboard.matches.filter(m => m.status !== 'not_started').length;
            if (started === 0) {
                // No scores yet — delete old bet so it can be replaced
                await client.query('DELETE FROM general_bets WHERE id = $1', [existing.id]);
            } else {
                throw new Error('You have already placed this type of bet.');
            }
        }

        // 6. Tournament winner can't be bet on if already decided
        if (input.betType === 'tournament_winner') {
            const { red, blue } = leaderboard.totalScore;
            const totalPossible = leaderboard.matches.length; // rough upper bound
            const winThreshold = totalPossible / 2 + 0.5;
            if (red >= winThreshold || blue >= winThreshold) {
                throw new Error('Tournament winner already decided.');
            }
        }

        // General bets: flat partes (no timing/risk factors — those only apply to match bets)
        const timingFactor = 1;
        const partes = 1;

        // 7. Insert via raw query to use transaction client
        const res = await client.query(
            `INSERT INTO general_bets (
                event_id, bettor_id, bet_type, flight_id, segment_type,
                picked_outcome, timing_factor, partes, amount, comment
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                input.eventId, input.bettorId, input.betType,
                input.flightId || null, input.segmentType || null,
                input.pickedOutcome, timingFactor, partes, betAmount,
                input.comment || null
            ]
        );

        await client.query('COMMIT');

        const row = res.rows[0];
        return {
            id: row.id,
            eventId: row.event_id,
            bettorId: row.bettor_id,
            betType: row.bet_type,
            flightId: row.flight_id,
            segmentType: row.segment_type,
            pickedOutcome: row.picked_outcome,
            timingFactor: row.timing_factor,
            partes: row.partes,
            amount: parseFloat(row.amount),
            comment: row.comment,
            createdAt: row.created_at
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

// ──────────────────────────────────────────────────
// Resolution helpers
// ──────────────────────────────────────────────────

interface ResolvedOutcome {
    betType: GeneralBetType;
    flightId: string | null;
    segmentType: string | null;
    winningOutcome: string | null; // null = not yet resolved
    isResolved: boolean;
}

function resolveFromLeaderboard(leaderboard: LeaderboardData): ResolvedOutcome[] {
    const outcomes: ResolvedOutcome[] = [];
    const allCompleted = leaderboard.matches.every(m => m.status === 'completed');

    // ── Tournament Winner ──
    const { red, blue } = leaderboard.totalScore;
    const totalMatches = leaderboard.matches.length;
    const winThreshold = totalMatches / 2 + 0.5;
    let tournamentWinner: string | null = null;
    if (red >= winThreshold) tournamentWinner = 'red';
    else if (blue >= winThreshold) tournamentWinner = 'blue';
    else if (allCompleted && red === blue) tournamentWinner = 'tie';
    else if (allCompleted) tournamentWinner = red > blue ? 'red' : 'blue';

    outcomes.push({
        betType: 'tournament_winner',
        flightId: null, segmentType: null,
        winningOutcome: tournamentWinner,
        isResolved: tournamentWinner !== null
    });

    // ── Exact Score ── (format: "Pitufos-Cariñositos" = "blue-red")
    if (allCompleted) {
        outcomes.push({
            betType: 'exact_score',
            flightId: null, segmentType: null,
            winningOutcome: `${blue}-${red}`,
            isResolved: true
        });
    } else {
        outcomes.push({
            betType: 'exact_score',
            flightId: null, segmentType: null,
            winningOutcome: null,
            isResolved: false
        });
    }

    // ── Any Halve ──
    const anyHalve = leaderboard.matches.some(m => m.status === 'completed' && m.matchStatus === 'Halved');
    outcomes.push({
        betType: 'any_halve',
        flightId: null, segmentType: null,
        winningOutcome: allCompleted ? (anyHalve ? 'yes' : 'no') : (anyHalve ? 'yes' : null),
        isResolved: allCompleted || anyHalve // "yes" can resolve early
    });

    // ── Per-flight bets ──
    const flightIds = [...new Set(leaderboard.matches.map(m => m.flightId))];
    for (const flightId of flightIds) {
        const flightMatches = leaderboard.matches.filter(m => m.flightId === flightId);
        const flightCompleted = flightMatches.every(m => m.status === 'completed');

        // Flight Winner: count points per team
        let flightRed = 0;
        let flightBlue = 0;
        flightMatches.forEach(m => {
            if (m.status === 'completed') {
                if (m.matchWinner === 'red') {
                    flightRed += m.segmentType === 'scramble' ? 2 : 1;
                } else if (m.matchWinner === 'blue') {
                    flightBlue += m.segmentType === 'scramble' ? 2 : 1;
                } else {
                    // halved — 0.5 each
                    flightRed += m.segmentType === 'scramble' ? 1 : 0.5;
                    flightBlue += m.segmentType === 'scramble' ? 1 : 0.5;
                }
            }
        });

        let flightWinner: string | null = null;
        if (flightCompleted) {
            if (flightRed > flightBlue) flightWinner = 'red';
            else if (flightBlue > flightRed) flightWinner = 'blue';
            else flightWinner = 'tie';
        }

        outcomes.push({
            betType: 'flight_winner',
            flightId, segmentType: null,
            winningOutcome: flightWinner,
            isResolved: flightCompleted
        });

        // Flight Sweep: one team wins all 4 segments
        const completedFlightMatches = flightMatches.filter(m => m.status === 'completed');
        const allRedWins = completedFlightMatches.length === 4 && completedFlightMatches.every(m => m.matchWinner === 'red');
        const allBlueWins = completedFlightMatches.length === 4 && completedFlightMatches.every(m => m.matchWinner === 'blue');

        let sweepOutcome: string | null = null;
        if (flightCompleted) {
            if (allRedWins) sweepOutcome = 'red';
            else if (allBlueWins) sweepOutcome = 'blue';
            else sweepOutcome = '__none__'; // no sweep happened
        }

        outcomes.push({
            betType: 'flight_sweep',
            flightId, segmentType: null,
            winningOutcome: sweepOutcome,
            isResolved: flightCompleted
        });

    }

    // ── Biggest Blowout ──
    if (allCompleted) {
        let biggestMargin = 0;
        let biggestMatch: Match | null = null;

        leaderboard.matches.forEach(m => {
            if (m.status !== 'completed') return;
            const margin = parseMargin(m.matchStatus);
            if (margin > biggestMargin) {
                biggestMargin = margin;
                biggestMatch = m;
            }
        });

        outcomes.push({
            betType: 'biggest_blowout',
            flightId: null, segmentType: null,
            winningOutcome: biggestMatch ? `${(biggestMatch as Match).flightId}_${(biggestMatch as Match).segmentType}` : null,
            isResolved: true
        });
    } else {
        outcomes.push({
            betType: 'biggest_blowout',
            flightId: null, segmentType: null,
            winningOutcome: null,
            isResolved: false
        });
    }

    // ── MVP & Worst Player ──
    // Use total match play points (same as ranking page):
    //   Singles/Fourball win = 1pt, halve = 0.5pt; Scramble win = 2pt, halve = 1pt
    // Tiebreaker: net score from singles (lower is better for MVP, higher is worse)
    if (allCompleted) {
        const playerScores: Record<string, { id: string; name: string; points: number; netScore: number | null }> = {};

        leaderboard.matches.forEach(m => {
            if (m.status !== 'completed') return;
            const matchPoints = m.segmentType === 'scramble' ? 2 : 1;
            const isSingles = m.segmentType === 'singles1' || m.segmentType === 'singles2';

            let redPts = 0;
            let bluePts = 0;
            if (m.matchWinner === 'red') redPts = matchPoints;
            else if (m.matchWinner === 'blue') bluePts = matchPoints;
            else { redPts = matchPoints / 2; bluePts = matchPoints / 2; }

            const processPlayer = (p: PlayerScore, pts: number) => {
                if (!playerScores[p.playerId]) {
                    playerScores[p.playerId] = { id: p.playerId, name: p.playerName, points: 0, netScore: null };
                }
                playerScores[p.playerId].points += pts;

                // Calculate net score from singles (front 9, holes 0-8) for tiebreaker
                if (isSingles && p.scores) {
                    const ph = Math.round(p.hcp * 0.8);
                    for (let i = 0; i < 9; i++) {
                        const gross = p.scores[i];
                        if (gross !== null && gross > 0) {
                            const si = m.hcpValues?.[i] ?? (i + 1);
                            const strokes = ph >= si + 18 ? 2 : (ph >= si ? 1 : 0);
                            const net = gross - strokes;
                            if (playerScores[p.playerId].netScore === null) playerScores[p.playerId].netScore = 0;
                            playerScores[p.playerId].netScore! += net;
                        }
                    }
                }
            };

            m.redPlayers.forEach(p => processPlayer(p, redPts));
            m.bluePlayers.forEach(p => processPlayer(p, bluePts));
        });

        // Sort by points descending, then net score ascending (lower net = better)
        const sorted = Object.values(playerScores).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (a.netScore === null && b.netScore === null) return 0;
            if (a.netScore === null) return 1;
            if (b.netScore === null) return -1;
            return a.netScore - b.netScore;
        });

        // MVP = first in ranking (highest points, lowest net score)
        const topScore = sorted.length > 0 ? sorted[0].points : 0;
        const topNet = sorted.length > 0 ? sorted[0].netScore : null;
        const mvpIds = sorted.filter(p => p.points === topScore && p.netScore === topNet).map(p => p.id);

        // Worst player = last in ranking (lowest points, highest net score)
        const bottomScore = sorted.length > 0 ? sorted[sorted.length - 1].points : 0;
        const bottomNet = sorted.length > 0 ? sorted[sorted.length - 1].netScore : null;
        const worstIds = sorted.filter(p => p.points === bottomScore && p.netScore === bottomNet).map(p => p.id);

        outcomes.push({
            betType: 'mvp', flightId: null, segmentType: null,
            winningOutcome: mvpIds.length > 0 ? mvpIds.join(',') : null, isResolved: true
        });
        outcomes.push({
            betType: 'worst_player', flightId: null, segmentType: null,
            winningOutcome: worstIds.length > 0 ? worstIds.join(',') : null, isResolved: true
        });
    } else {
        outcomes.push({ betType: 'mvp', flightId: null, segmentType: null, winningOutcome: null, isResolved: false });
        outcomes.push({ betType: 'worst_player', flightId: null, segmentType: null, winningOutcome: null, isResolved: false });
    }

    return outcomes;
}

/** Parse a match status string into a numeric margin for comparison.
 *  "6 & 5" => 6, "3 & 2" => 3, "2 UP" => assumes went to last hole so margin ~1, "Halved" => 0
 */
function parseMargin(status: string): number {
    // "X & Y" format — X is the winning margin (holes up with Y to play)
    const closedMatch = status.match(/^(\d+) & (\d+)$/);
    if (closedMatch) return parseInt(closedMatch[1]);

    // "X UP" at end of match — means won by X on the last hole
    const upMatch = status.match(/^(\d+) UP$/);
    if (upMatch) return parseInt(upMatch[1]);

    // "Won X UP" / "Won"
    const wonMatch = status.match(/Won (\d+)/);
    if (wonMatch) return parseInt(wonMatch[1]);

    return 0; // Halved or unrecognized
}

// ──────────────────────────────────────────────────
// Pool & settlement for general bets
// ──────────────────────────────────────────────────

export interface GeneralBetPool {
    betType: GeneralBetType;
    flightId: string | null;
    flightName: string | null;
    segmentType: string | null;
    pot: number;
    betsCount: number;
    outcomePartes: Record<string, number>;
    isResolved: boolean;
    winningOutcome: string | null;
    redPlayerNames: string[];
    bluePlayerNames: string[];
}

export const getGeneralBetPools = async (eventId: string): Promise<GeneralBetPool[]> => {
    const allBets = await getGeneralBetsForEvent(eventId);
    const leaderboard = await getLeaderboard(eventId);
    const resolutions = resolveFromLeaderboard(leaderboard);

    // Group bets by (betType, flightId, segmentType)
    const poolMap: Record<string, GeneralBet[]> = {};
    allBets.forEach(b => {
        const key = `${b.betType}|${b.flightId || ''}|${b.segmentType || ''}`;
        if (!poolMap[key]) poolMap[key] = [];
        poolMap[key].push(b);
    });

    // Build flight name map and player names map
    const flightNameMap: Record<string, string> = {};
    const flightRedPlayers: Record<string, Set<string>> = {};
    const flightBluePlayers: Record<string, Set<string>> = {};
    leaderboard.matches.forEach(m => {
        flightNameMap[m.flightId] = m.flightName;
        if (!flightRedPlayers[m.flightId]) flightRedPlayers[m.flightId] = new Set();
        if (!flightBluePlayers[m.flightId]) flightBluePlayers[m.flightId] = new Set();
        m.redPlayers.forEach(p => flightRedPlayers[m.flightId].add(p.playerName));
        m.bluePlayers.forEach(p => flightBluePlayers[m.flightId].add(p.playerName));
    });

    const pools: GeneralBetPool[] = [];

    // Create pools for active bet types (even if no bets yet)
    const betTypes: GeneralBetType[] = ['tournament_winner', 'exact_score'];
    const flightIds = [...new Set(leaderboard.matches.map(m => m.flightId))];

    // Tournament-level pools
    for (const bt of betTypes) {
        const key = `${bt}||`;
        const bets = poolMap[key] || [];
        const resolution = resolutions.find(r => r.betType === bt && !r.flightId);

        const outcomePartes: Record<string, number> = {};
        bets.forEach(b => {
            outcomePartes[b.pickedOutcome] = (outcomePartes[b.pickedOutcome] || 0) + b.partes;
        });

        pools.push({
            betType: bt,
            flightId: null, flightName: null, segmentType: null,
            pot: bets.reduce((s, b) => s + b.amount, 0),
            betsCount: bets.length,
            outcomePartes,
            isResolved: resolution?.isResolved || false,
            winningOutcome: resolution?.winningOutcome || null,
            redPlayerNames: [],
            bluePlayerNames: []
        });
    }

    // MVP & Worst Player pools (tournament-level, player-based)
    for (const bt of ['mvp', 'worst_player'] as GeneralBetType[]) {
        const key = `${bt}||`;
        const bets = poolMap[key] || [];
        const resolution = resolutions.find(r => r.betType === bt && !r.flightId);

        const outcomePartes: Record<string, number> = {};
        bets.forEach(b => {
            outcomePartes[b.pickedOutcome] = (outcomePartes[b.pickedOutcome] || 0) + b.partes;
        });

        // Collect all player names from leaderboard for display
        const allPlayerNames: string[] = [];
        leaderboard.matches.forEach(m => {
            m.redPlayers.forEach(p => allPlayerNames.push(p.playerName));
            m.bluePlayers.forEach(p => allPlayerNames.push(p.playerName));
        });

        pools.push({
            betType: bt,
            flightId: null, flightName: null, segmentType: null,
            pot: bets.reduce((s, b) => s + b.amount, 0),
            betsCount: bets.length,
            outcomePartes,
            isResolved: resolution?.isResolved || false,
            winningOutcome: resolution?.winningOutcome || null,
            redPlayerNames: [...new Set(leaderboard.matches.flatMap(m => m.redPlayers.map(p => `${p.playerId}:${p.playerName}`)))],
            bluePlayerNames: [...new Set(leaderboard.matches.flatMap(m => m.bluePlayers.map(p => `${p.playerId}:${p.playerName}`)))]
        });
    }

    return pools;
};

export const getGeneralBetSettlement = async (eventId: string) => {
    const allBets = await getGeneralBetsForEvent(eventId);
    const leaderboard = await getLeaderboard(eventId);
    const resolutions = resolveFromLeaderboard(leaderboard);

    let isPartial = false;
    const balances: Record<string, number> = {};
    const openWagered: Record<string, number> = {};
    const closedWagered: Record<string, number> = {};
    const closedRecovered: Record<string, number> = {};
    const openPotential: Record<string, number> = {};

    // Group bets by pool key for pari-mutuel calculation
    const poolMap: Record<string, GeneralBet[]> = {};
    allBets.forEach(b => {
        const key = `${b.betType}|${b.flightId || ''}|${b.segmentType || ''}`;
        if (!poolMap[key]) poolMap[key] = [];
        poolMap[key].push(b);
    });

    for (const [key, bets] of Object.entries(poolMap)) {
        const [betType, flightId] = key.split('|');
        const resolution = resolutions.find(r =>
            r.betType === betType &&
            (r.flightId || '') === flightId
        );

        const potSize = bets.reduce((s, b) => s + b.amount, 0);

        // Group partes by outcome
        const partesByOutcome: Record<string, number> = {};
        bets.forEach(b => {
            partesByOutcome[b.pickedOutcome] = (partesByOutcome[b.pickedOutcome] || 0) + b.partes;
        });

        if (!resolution?.isResolved) {
            isPartial = true;
        }

        // Initialize balances for all bettors in this pool
        bets.forEach(bet => {
            if (!balances[bet.bettorId]) balances[bet.bettorId] = 0;
            if (!openWagered[bet.bettorId]) openWagered[bet.bettorId] = 0;
            if (!closedWagered[bet.bettorId]) closedWagered[bet.bettorId] = 0;
            if (!closedRecovered[bet.bettorId]) closedRecovered[bet.bettorId] = 0;
            if (!openPotential[bet.bettorId]) openPotential[bet.bettorId] = 0;
        });

        // Exact score: closest-guess fallback when no one guesses exactly
        if (betType === 'exact_score' && resolution?.isResolved && resolution.winningOutcome) {
            const winOutcome = resolution.winningOutcome;
            const exactWinners = bets.filter(b => b.pickedOutcome === winOutcome);

            if (exactWinners.length === 0 && bets.length > 0) {
                // Find closest guesses by Manhattan distance
                const [actualBlue, actualRed] = winOutcome.split('-').map(Number);
                const distances = bets.map(b => {
                    const [bBlue, bRed] = b.pickedOutcome.split('-').map(Number);
                    return { bet: b, distance: Math.abs(bBlue - actualBlue) + Math.abs(bRed - actualRed) };
                });
                const minDistance = Math.min(...distances.map(d => d.distance));
                const closestBetIds = new Set(distances.filter(d => d.distance === minDistance).map(d => d.bet.id));
                const closestPartes = distances.filter(d => d.distance === minDistance).reduce((s, d) => s + d.bet.partes, 0);

                bets.forEach(bet => {
                    closedWagered[bet.bettorId] += bet.amount;
                    balances[bet.bettorId] -= bet.amount;

                    if (closestBetIds.has(bet.id) && closestPartes > 0) {
                        const payout = (bet.partes / closestPartes) * potSize;
                        balances[bet.bettorId] += payout;
                        closedRecovered[bet.bettorId] += payout;
                    }
                });
                continue; // Skip generic settlement for this pool
            }
        }

        bets.forEach(bet => {
            if (resolution?.isResolved) {
                closedWagered[bet.bettorId] += bet.amount;
                balances[bet.bettorId] -= bet.amount;

                const winOutcome = resolution.winningOutcome ?? '';
                let payout = 0;

                if (winOutcome === '__none__') {
                    // No sweep happened — refund sweep bets
                    payout = bet.amount;
                } else {
                    // Support multiple winners (comma-separated IDs for MVP/worst_player ties)
                    const winningOutcomes = winOutcome.split(',');
                    if (winningOutcomes.includes(bet.pickedOutcome)) {
                        // Sum partes for ALL winning outcomes
                        let totalWinningPartes = 0;
                        winningOutcomes.forEach(wo => {
                            totalWinningPartes += partesByOutcome[wo] || 0;
                        });
                        if (totalWinningPartes > 0) {
                            payout = (bet.partes / totalWinningPartes) * potSize;
                        }
                    }
                }

                if (payout > 0) {
                    balances[bet.bettorId] += payout;
                    closedRecovered[bet.bettorId] += payout;
                }
            } else {
                openWagered[bet.bettorId] += bet.amount;
                const totalPartes = partesByOutcome[bet.pickedOutcome] || 0;
                if (totalPartes > 0) {
                    openPotential[bet.bettorId] += Math.max(0, ((bet.partes / totalPartes) * potSize) - bet.amount);
                }
            }
        });
    }

    return { isPartial, balances, openWagered, closedWagered, closedRecovered, openPotential };
};

export const getPersonalGeneralStats = async (eventId: string, bettorId: string) => {
    const bets = await getUserGeneralBets(eventId, bettorId);
    const settlement = await getGeneralBetSettlement(eventId);

    const wagered = (settlement.openWagered[bettorId] || 0) + (settlement.closedWagered[bettorId] || 0);
    const realizedNet = (settlement.closedRecovered[bettorId] || 0) - (settlement.closedWagered[bettorId] || 0);
    const potential = settlement.openPotential[bettorId] || 0;

    return { wagered, realizedNet, potential, bets };
};

/**
 * Returns per-bet resolution details for a user's general bets,
 * including status ('open'/'closed') and realizedPayout.
 */
export const getGeneralBetDetailsForUser = async (eventId: string, bettorId: string) => {
    const allBets = await getGeneralBetsForEvent(eventId);
    const userBets = allBets.filter(b => b.bettorId === bettorId);
    const leaderboard = await getLeaderboard(eventId);
    const resolutions = resolveFromLeaderboard(leaderboard);

    return userBets.map(bet => {
        const resolution = resolutions.find(r =>
            r.betType === bet.betType &&
            (r.flightId || '') === (bet.flightId || '') &&
            (r.segmentType || '') === (bet.segmentType || '')
        );

        const isResolved = resolution?.isResolved || false;
        let realizedPayout = 0;

        if (isResolved && resolution) {
            // Get all bets in the same pool
            const poolBets = allBets.filter(b =>
                b.betType === bet.betType &&
                (b.flightId || '') === (bet.flightId || '') &&
                (b.segmentType || '') === (bet.segmentType || '')
            );
            const potSize = poolBets.reduce((s, b) => s + b.amount, 0);
            const winOutcome = resolution.winningOutcome ?? '';

            // Exact score closest-guess fallback
            if (bet.betType === 'exact_score' && resolution.winningOutcome) {
                const exactWinners = poolBets.filter(b => b.pickedOutcome === resolution.winningOutcome!);
                if (exactWinners.length === 0 && poolBets.length > 0) {
                    const [actualBlue, actualRed] = resolution.winningOutcome!.split('-').map(Number);
                    const distances = poolBets.map(b => {
                        const [bBlue, bRed] = b.pickedOutcome.split('-').map(Number);
                        return { bet: b, distance: Math.abs(bBlue - actualBlue) + Math.abs(bRed - actualRed) };
                    });
                    const minDistance = Math.min(...distances.map(d => d.distance));
                    const closestBets = distances.filter(d => d.distance === minDistance);
                    const closestPartes = closestBets.reduce((s, d) => s + d.bet.partes, 0);
                    const isClosest = closestBets.some(d => d.bet.id === bet.id);
                    if (isClosest && closestPartes > 0) {
                        realizedPayout = (bet.partes / closestPartes) * potSize;
                    }
                    return { ...bet, status: 'closed' as const, realizedPayout };
                }
            }

            if (winOutcome === '__none__') {
                // Refund (e.g., no sweep happened)
                realizedPayout = bet.amount;
            } else {
                const winningOutcomes = winOutcome.split(',');
                if (winningOutcomes.includes(bet.pickedOutcome)) {
                    const partesByOutcome: Record<string, number> = {};
                    poolBets.forEach(b => {
                        partesByOutcome[b.pickedOutcome] = (partesByOutcome[b.pickedOutcome] || 0) + b.partes;
                    });
                    let totalWinningPartes = 0;
                    winningOutcomes.forEach(wo => {
                        totalWinningPartes += partesByOutcome[wo] || 0;
                    });
                    if (totalWinningPartes > 0) {
                        realizedPayout = (bet.partes / totalWinningPartes) * potSize;
                    }
                }
            }
        }

        return {
            ...bet,
            status: isResolved ? 'closed' as const : 'open' as const,
            realizedPayout
        };
    });
};
