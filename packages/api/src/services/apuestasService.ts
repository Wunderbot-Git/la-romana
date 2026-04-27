/**
 * Apuestas Service — La Romana 2026
 *
 * Berechnet die 3 deterministischen Pots:
 *   A) Mejor del Día      — pro Tag $10/Spieler, 1° → $100, 2° → $50
 *   B) Pot Ryder Cup      — gesamt $10/Spieler/Tag = $450, kompletter Pot ans Sieger-Team
 *   C) Pot Total Viaje    — gesamt $20/Spieler/Tag = $900, Top-3 nach (Stableford + daily wins)
 *                            Auszahlung: 1° $550, 2° $250, 3° $100
 *
 * Phantom (Fantasma) zahlt nicht und kriegt nichts — wird überall rausgefiltert.
 */

import { getPool } from '../config/database';
import { getLeaderboard } from './leaderboardService';

const DAILY_PAYOUTS_POT_A = { first: 100, second: 50 };
const TRIP_PAYOUTS_POT_C = { first: 550, second: 250, third: 100 };
const DAILY_CONTRIB_PER_PLAYER = { potA: 10, potB: 10, potC: 20 };
const NUM_DAYS = 3;
const PHANTOM_NAME = 'Fantasma';

export interface PotADayStanding {
    playerId: string;
    playerName: string;
    team: 'red' | 'blue' | null;
    stablefordPoints: number;
    /** Place in this round's daily ranking (1-based). null if not played yet. */
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

export interface ApuestasOverview {
    perPlayer: { dailyTotal: number; tripTotal: number };
    grandPool: number;
    pots: {
        a: PotADay[];
        b: PotBRyder;
        c: PotCTotalViaje;
    };
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

    // Build humanStandings from the full roster (not just from leaderboard standings).
    // Players without scores get a zero-pts placeholder so Pot C still lists them.
    const humanStandings = fullRoster
        .filter(r => r.first_name !== PHANTOM_NAME)
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
            };
        });
    const numHumans = humanStandings.length;

    // ── POT A — per-round Mejor del Día ──────────────────────────────────────
    interface DayRow {
        playerId: string;
        playerName: string;
        team: 'red' | 'blue' | null;
        stablefordPoints: number;
        played: boolean;
    }
    const potA: PotADay[] = lb.rounds.map(round => {
        const dayPool = numHumans * DAILY_CONTRIB_PER_PLAYER.potA;
        const standings: DayRow[] = humanStandings
            .map(s => {
                const br = s.byRound?.find(r => r.roundNumber === round.roundNumber);
                const pts = br?.stablefordPoints ?? 0;
                return {
                    playerId: s.playerId,
                    playerName: s.playerName,
                    team: s.team,
                    stablefordPoints: pts,
                    played: !!br && pts > 0,
                };
            })
            .sort((a, b) => b.stablefordPoints - a.stablefordPoints || a.playerName.localeCompare(b.playerName));

        // Rank only those who actually played; others get rank=null
        let nextRank = 1;
        const ranked: PotADayStanding[] = standings.map(s => {
            const result: PotADayStanding = {
                playerId: s.playerId,
                playerName: s.playerName,
                team: s.team,
                stablefordPoints: s.stablefordPoints,
                rank: null,
                payout: 0,
            };
            if (s.played) {
                result.rank = nextRank;
                if (nextRank === 1) result.payout = DAILY_PAYOUTS_POT_A.first;
                else if (nextRank === 2) result.payout = DAILY_PAYOUTS_POT_A.second;
                nextRank += 1;
            }
            return result;
        });

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
    const cRows = humanStandings
        .map(s => ({
            playerId: s.playerId,
            playerName: s.playerName,
            team: s.team,
            stablefordCumulative: s.stablefordCumulative,
            dailyWinningsTotal: dailyWinningsByPlayer.get(s.playerId) ?? 0, // info-only display
            score: s.stablefordCumulative,
        }))
        .sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName));

    const potC: PotCTotalViaje = {
        poolSize: tripPool,
        payouts: TRIP_PAYOUTS_POT_C,
        rankings: cRows.map((r, idx) => ({
            rank: idx + 1,
            playerId: r.playerId,
            playerName: r.playerName,
            team: r.team,
            stablefordCumulative: r.stablefordCumulative,
            dailyWinningsTotal: r.dailyWinningsTotal,
            score: r.score,
            projectedPayout:
                idx === 0 ? TRIP_PAYOUTS_POT_C.first
                : idx === 1 ? TRIP_PAYOUTS_POT_C.second
                : idx === 2 ? TRIP_PAYOUTS_POT_C.third
                : 0,
        })),
    };

    const dailyTotal =
        DAILY_CONTRIB_PER_PLAYER.potA + DAILY_CONTRIB_PER_PLAYER.potB + DAILY_CONTRIB_PER_PLAYER.potC;

    return {
        perPlayer: { dailyTotal, tripTotal: dailyTotal * NUM_DAYS },
        grandPool: dailyTotal * NUM_DAYS * numHumans,
        pots: { a: potA, b: potB, c: potC },
    };
};
