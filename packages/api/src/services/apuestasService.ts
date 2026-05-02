/**
 * Apuestas Service — La Romana 2026
 *
 * Berechnet die 3 deterministischen Pots:
 *   A) Mejor del Día      — pro Tag $10/Spieler, 1° → $100, 2° → $50
 *   B) Pot Ryder Cup      — gesamt $10/Spieler/Tag = $450, kompletter Pot ans Sieger-Team
 *   C) Pot Total Viaje    — gesamt $20/Spieler/Tag = $900, Top-3 nach (Stableford + daily wins)
 *                            Auszahlung: 1° $550, 2° $250, 3° $100
 *
 * Phantom (Fantasma) zahlt NICHT in den Pool ein, wird aber MIT in die
 * Stableford-/Mejor-del-Día-Rankings eingerechnet (Phil-Request 2026-05-02).
 * D. h. das Phantom kann technisch eine Position einnehmen — die Pool-Größen
 * werden aber weiterhin aus der reinen Menschen-Anzahl gerechnet, sodass keine
 * Geldbeträge verschwinden außer in dem (seltenen) Fall, dass das Phantom
 * 1./2. Mejor del Día oder Top-3 Trip-Total wird.
 */

import { getPool } from '../config/database';
import { getLeaderboard } from './leaderboardService';

const DAILY_PAYOUTS_POT_A = { first: 100, second: 50 };
const TRIP_PAYOUTS_POT_C = { first: 550, second: 250, third: 100 };
const DAILY_CONTRIB_PER_PLAYER = { potA: 10, potB: 10, potC: 20 };
const NUM_DAYS = 3;

/**
 * Walk a pre-sorted standings list and assign ranks + payouts with proper
 * tie-handling: tied scores get the same (lowest) rank and SHARE the pooled
 * value of the positions they occupy. Pari-mutuel-style — total $ paid out
 * stays equal to the sum of the relevant prize positions.
 *
 *   2-way tie at 1st with payouts [100, 50, 0]   → both rank 1, $75 each
 *   3-way tie at 1st with [100, 50, 0]           → all rank 1, $50 each
 *   1st alone, 2-way tie at 2nd with [100,50,0]  → 1st gets 100, 2nd-3rd $25 each
 *   2-way tie outside money positions            → both ranked, $0 payout
 *
 * `payouts[i]` is the prize for position i+1 (so payouts[0] = first place).
 * Indices beyond `payouts.length` get $0.
 */
function assignTiedPayouts<T>(
    sorted: T[],
    rankable: (item: T) => boolean,
    scoreEqual: (a: T, b: T) => boolean,
    payouts: number[],
): Array<{ rank: number | null; payout: number }> {
    const out: Array<{ rank: number | null; payout: number }> = sorted.map(() => ({ rank: null, payout: 0 }));
    let nextRank = 1;
    let i = 0;
    while (i < sorted.length) {
        if (!rankable(sorted[i])) { i++; continue; }
        let j = i;
        while (j + 1 < sorted.length && rankable(sorted[j + 1]) && scoreEqual(sorted[i], sorted[j + 1])) {
            j++;
        }
        const groupSize = j - i + 1;
        let pooled = 0;
        for (let r = nextRank; r < nextRank + groupSize; r++) {
            pooled += payouts[r - 1] ?? 0;
        }
        const share = pooled / groupSize;
        for (let k = i; k <= j; k++) {
            out[k] = { rank: nextRank, payout: share };
        }
        nextRank += groupSize;
        i = j + 1;
    }
    return out;
}
const PHANTOM_NAME = 'Fantasma';

export interface PotADayStanding {
    playerId: string;
    playerName: string;
    team: 'red' | 'blue' | null;
    /** Net stroke total for the day (sum of gross − strokes per hole). Lower is better. null if not played. */
    netScore: number | null;
    /** Number of holes the player has scored in this round (for partial-round display). */
    holesPlayed: number;
    /** Stableford cumulative for this round — kept for reference / display. */
    stablefordPoints: number;
    /** Place in this round's daily ranking (1-based). null if round not finished by player. */
    rank: number | null;
    /** Dollar payout for this player on this day. */
    payout: number;
}

export interface PotADay {
    roundId: string;
    roundNumber: number;
    courseName: string;
    poolSize: number;          // 150
    state: 'upcoming' | 'in_progress' | 'completed';
    /** All human players sorted desc by stablefordPoints (skips unplayed). */
    standings: PotADayStanding[];
}

export interface PotBRyder {
    poolSize: number;          // 450
    redScore: number;
    blueScore: number;
    redProjected: number;
    blueProjected: number;
    /** 'red' | 'blue' once decided (mathematically clinched or all rounds done). */
    winner: 'red' | 'blue' | 'tie' | null;
    teamCounts: { red: number; blue: number };  // human counts (no phantom)
    perPlayerIfRedWins: number;  // 56.25
    perPlayerIfBlueWins: number; // 64.29
}

export interface PotCRanking {
    rank: number;
    playerId: string;
    playerName: string;
    team: 'red' | 'blue' | null;
    stablefordCumulative: number;
    dailyWinningsTotal: number;   // sum of $ won via Pot A
    score: number;                // stableford + dailyWinningsTotal
    projectedPayout: number;      // 0 unless top-3
}

export interface PotCTotalViaje {
    poolSize: number;          // 900
    payouts: { first: number; second: number; third: number };
    rankings: PotCRanking[];
}

export interface OverallStanding {
    rank: number;
    playerId: string;
    playerName: string;
    team: 'red' | 'blue' | null;
    /** Sum of Pot A daily winnings across completed rounds. */
    potA: number;
    /** Pot B share — only filled once Ryder Cup winner (or tie) is decided. */
    potB: number;
    /** Pot C projected/realized payout (provisional until all rounds complete). */
    potC: number;
    /** potA + potB + potC */
    total: number;
}

export interface OverallSummary {
    /** True until all 3 rounds are completed AND Pot B is decided. */
    isProvisional: boolean;
    standings: OverallStanding[];
}

export interface ApuestasOverview {
    perPlayer: { dailyTotal: number; tripTotal: number };
    grandPool: number;
    pots: {
        a: PotADay[];
        b: PotBRyder;
        c: PotCTotalViaje;
    };
    summary: OverallSummary;
}

export const getApuestasOverview = async (eventId: string): Promise<ApuestasOverview> => {
    const lb = await getLeaderboard(eventId);
    const pool = getPool();

    // Roster from `players` (single source of truth). Includes phantom — filtered below.
    // We need this independent of leaderboard's `stablefordStandings`, which only contains
    // players who already have scores. Pool sizes must reflect the full paying roster.
    const rosterRes = await pool.query(
        `SELECT p.id, p.first_name, p.last_name, p.team, p.handicap_index
         FROM players p
         WHERE p.event_id = $1`,
        [eventId],
    );
    interface RosterRow { id: string; first_name: string; last_name: string; team: 'red' | 'blue' | null; handicap_index: number }
    const fullRoster: RosterRow[] = rosterRes.rows;

    // Per-round flight assignments — used as a tiebreaker for team if `players.team` is null.
    const teamRes = await pool.query(
        `SELECT DISTINCT pf.player_id, pf.team
         FROM player_flights pf
         JOIN flights f ON f.id = pf.flight_id
         JOIN rounds r ON r.id = f.round_id
         WHERE r.event_id = $1`,
        [eventId],
    );
    const teamByPlayer = new Map<string, 'red' | 'blue'>();
    for (const row of teamRes.rows as { player_id: string; team: 'red' | 'blue' }[]) {
        teamByPlayer.set(row.player_id, row.team);
    }
    const teamFor = (id: string, fallback: 'red' | 'blue' | null) =>
        teamByPlayer.get(id) ?? fallback ?? null;

    // Standings indexed by playerId (only for those with scores)
    const standingsById = new Map(lb.stablefordStandings.map(s => [s.playerId, s] as const));

    // Build playerStandings from the FULL roster including the phantom — Phil
    // requested that Fantasma counts in the Stableford / pot rankings (someone
    // is actually playing the slot, so their net contributes to "Mejor del Día"
    // and to the trip total). Pool SIZES still come from the human count only
    // (Fantasma doesn't pay), so the prize money stays $150/day · $450 Ryder ·
    // $900 trip — but Fantasma can rank and "win" a position. The user accepts
    // that any phantom payout sits unclaimed in the pot if it lands first/second.
    const playerStandings = fullRoster
        .map(r => {
            const s = standingsById.get(r.id);
            const playerName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.first_name;
            return {
                playerId: r.id,
                playerName: s?.playerName ?? playerName,
                handicapIndex: s?.handicapIndex ?? r.handicap_index,
                team: teamFor(r.id, r.team),
                stablefordCumulative: s?.stablefordCumulative ?? 0,
                ryderIndividualCumulative: s?.ryderIndividualCumulative ?? 0,
                roundsPlayed: s?.roundsPlayed ?? 0,
                byRound: s?.byRound,
                isPhantom: r.first_name === PHANTOM_NAME,
            };
        });
    const humanStandings = playerStandings.filter(s => !s.isPhantom);
    const numHumans = humanStandings.length;

    // ── POT A — per-round Mejor del Día (net stroke score, lower = better) ─
    // Stableford caps blow-up holes at 0, which doesn't actually penalize bad
    // holes. For "neto" daily we use the raw net stroke total
    // (sum of gross − strokes per hole) — every shot counts.
    interface DayRow {
        playerId: string;
        playerName: string;
        team: 'red' | 'blue' | null;
        netScore: number | null;     // null if round not played at all
        holesPlayed: number;
        stablefordPoints: number;
        completed: boolean;          // all holes for this round scored (9 or 18)
    }
    const potA: PotADay[] = lb.rounds.map(round => {
        const dayPool = numHumans * DAILY_CONTRIB_PER_PLAYER.potA;
        const holesPerRound = round.holesPerRound ?? 18;
        const standings: DayRow[] = playerStandings
            .map(s => {
                const br = s.byRound?.find(r => r.roundNumber === round.roundNumber);
                const holes = br?.holes ?? [];
                const playedHoles = holes.filter(h => h.grossScore !== null && h.netScore !== null);
                const netScore = playedHoles.length > 0
                    ? playedHoles.reduce((sum, h) => sum + (h.netScore ?? 0), 0)
                    : null;
                return {
                    playerId: s.playerId,
                    playerName: s.playerName,
                    team: s.team,
                    netScore,
                    holesPlayed: playedHoles.length,
                    stablefordPoints: br?.stablefordPoints ?? 0,
                    completed: playedHoles.length === holesPerRound,
                };
            })
            // Lower net is better. Players with no net come last.
            .sort((a, b) => {
                if (a.netScore === null && b.netScore === null) return a.playerName.localeCompare(b.playerName);
                if (a.netScore === null) return 1;
                if (b.netScore === null) return -1;
                return a.netScore - b.netScore || a.playerName.localeCompare(b.playerName);
            });

        // Only fully-played rounds (18 holes) are rankable for daily payout.
        // Ties at the money positions split the pooled payouts evenly
        // (e.g. two players tied at 1st each get ($100+$50)/2 = $75).
        const tieResults = assignTiedPayouts(
            standings,
            s => s.completed,
            (a, b) => a.netScore !== null && a.netScore === b.netScore,
            [DAILY_PAYOUTS_POT_A.first, DAILY_PAYOUTS_POT_A.second],
        );
        const ranked: PotADayStanding[] = standings.map((s, idx) => ({
            playerId: s.playerId,
            playerName: s.playerName,
            team: s.team,
            netScore: s.netScore,
            holesPlayed: s.holesPlayed,
            stablefordPoints: s.stablefordPoints,
            rank: tieResults[idx].rank,
            payout: tieResults[idx].payout,
        }));

        const playedCount = ranked.filter(r => r.rank !== null).length;
        const state: 'upcoming' | 'in_progress' | 'completed' =
            playedCount === 0
                ? 'upcoming'
                : playedCount < humanStandings.length
                ? 'in_progress'
                : round.state === 'completed'
                ? 'completed'
                : 'in_progress';

        return {
            roundId: round.roundId,
            roundNumber: round.roundNumber,
            courseName: round.courseName,
            poolSize: dayPool,
            state,
            standings: ranked,
        };
    });

    // ── POT B — Ryder Cup ────────────────────────────────────────────────────
    const red = lb.ryderStandings.find(s => s.team === 'red');
    const blue = lb.ryderStandings.find(s => s.team === 'blue');
    const redScore = red?.matchPointsCumulative ?? 0;
    const blueScore = blue?.matchPointsCumulative ?? 0;
    const redProjected = red?.matchPointsProjected ?? 0;
    const blueProjected = blue?.matchPointsProjected ?? 0;
    const allRoundsCompleted = lb.rounds.length > 0 && lb.rounds.every(r => r.state === 'completed');
    const totalPossible = lb.rounds.length * 12; // 12 Ryder pts pro Round (4 flights × 3 matches)
    const winThreshold = totalPossible / 2 + 0.5;

    let winner: 'red' | 'blue' | 'tie' | null = null;
    if (redScore >= winThreshold) winner = 'red';
    else if (blueScore >= winThreshold) winner = 'blue';
    else if (allRoundsCompleted) winner = redScore > blueScore ? 'red' : (blueScore > redScore ? 'blue' : 'tie');

    // Count humans per team (phantom excluded)
    const redCount = humanStandings.filter(s => s.team === 'red').length;
    const blueCount = humanStandings.filter(s => s.team === 'blue').length;

    const ryderPool = numHumans * DAILY_CONTRIB_PER_PLAYER.potB * NUM_DAYS;
    const potB: PotBRyder = {
        poolSize: ryderPool,
        redScore,
        blueScore,
        redProjected,
        blueProjected,
        winner,
        teamCounts: { red: redCount, blue: blueCount },
        perPlayerIfRedWins: redCount > 0 ? Math.round((ryderPool / redCount) * 100) / 100 : 0,
        perPlayerIfBlueWins: blueCount > 0 ? Math.round((ryderPool / blueCount) * 100) / 100 : 0,
    };

    // ── POT C — Total Viaje ──────────────────────────────────────────────────
    // Score = Stableford_Cumulative (über alle 3 Runden).
    // Daily-Pot-Gewinne fließen in Pot A separat — hier kein Bonus.
    const dailyWinningsByPlayer = new Map<string, number>();
    for (const day of potA) {
        for (const s of day.standings) {
            if (s.payout > 0) {
                dailyWinningsByPlayer.set(s.playerId, (dailyWinningsByPlayer.get(s.playerId) ?? 0) + s.payout);
            }
        }
    }

    const tripPool = numHumans * DAILY_CONTRIB_PER_PLAYER.potC * NUM_DAYS;
    const cRows = playerStandings
        .map(s => ({
            playerId: s.playerId,
            playerName: s.playerName,
            team: s.team,
            stablefordCumulative: s.stablefordCumulative,
            dailyWinningsTotal: dailyWinningsByPlayer.get(s.playerId) ?? 0, // info-only display
            score: s.stablefordCumulative,
        }))
        .sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName));

    // Trip-total ranking: ties at money positions split the pooled payout
    // (e.g. 2-way tie at 1st gets ($550+$250)/2 = $400 each).
    const cTieResults = assignTiedPayouts(
        cRows,
        () => true, // every cumulative score is rankable; no completion gate at trip level
        (a, b) => a.score === b.score,
        [TRIP_PAYOUTS_POT_C.first, TRIP_PAYOUTS_POT_C.second, TRIP_PAYOUTS_POT_C.third],
    );
    const potC: PotCTotalViaje = {
        poolSize: tripPool,
        payouts: TRIP_PAYOUTS_POT_C,
        rankings: cRows.map((r, idx) => ({
            rank: cTieResults[idx].rank ?? idx + 1,
            playerId: r.playerId,
            playerName: r.playerName,
            team: r.team,
            stablefordCumulative: r.stablefordCumulative,
            dailyWinningsTotal: r.dailyWinningsTotal,
            score: r.score,
            projectedPayout: cTieResults[idx].payout,
        })),
    };

    // ── OVERALL SUMMARY — total per player across all 3 pots ────────────────
    // Pot A: realized daily winnings (only completed rounds contribute).
    // Pot B: share once a winner (or tie) is decided; otherwise 0.
    // Pot C: projected/realized podium payout (provisional until all rounds done).
    const potBShareByPlayer = new Map<string, number>();
    if (winner === 'red' && redCount > 0) {
        for (const s of humanStandings) {
            if (s.team === 'red') potBShareByPlayer.set(s.playerId, ryderPool / redCount);
        }
    } else if (winner === 'blue' && blueCount > 0) {
        for (const s of humanStandings) {
            if (s.team === 'blue') potBShareByPlayer.set(s.playerId, ryderPool / blueCount);
        }
    } else if (winner === 'tie' && numHumans > 0) {
        for (const s of humanStandings) {
            potBShareByPlayer.set(s.playerId, ryderPool / numHumans);
        }
    }
    const potCByPlayer = new Map<string, number>(
        potC.rankings.map(r => [r.playerId, r.projectedPayout]),
    );

    const summaryRows: Omit<OverallStanding, 'rank'>[] = playerStandings.map(s => {
        const a = dailyWinningsByPlayer.get(s.playerId) ?? 0;
        const b = potBShareByPlayer.get(s.playerId) ?? 0;
        const c = potCByPlayer.get(s.playerId) ?? 0;
        return {
            playerId: s.playerId,
            playerName: s.playerName,
            team: s.team,
            potA: a,
            potB: b,
            potC: c,
            total: a + b + c,
        };
    });
    summaryRows.sort((x, y) => y.total - x.total || x.playerName.localeCompare(y.playerName));

    // Dense ranking: tied totals share a rank, next rank skips by group size.
    const standings: OverallStanding[] = [];
    let rank = 1;
    for (let i = 0; i < summaryRows.length; i++) {
        if (i > 0 && summaryRows[i].total !== summaryRows[i - 1].total) {
            rank = i + 1;
        }
        standings.push({ rank, ...summaryRows[i] });
    }

    const summary: OverallSummary = {
        isProvisional: !allRoundsCompleted || winner === null,
        standings,
    };

    const dailyTotal =
        DAILY_CONTRIB_PER_PLAYER.potA + DAILY_CONTRIB_PER_PLAYER.potB + DAILY_CONTRIB_PER_PLAYER.potC;

    return {
        perPlayer: { dailyTotal, tripTotal: dailyTotal * NUM_DAYS },
        grandPool: dailyTotal * NUM_DAYS * numHumans,
        pots: { a: potA, b: potB, c: potC },
        summary,
    };
};
