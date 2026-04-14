import { describe, it, expect } from 'vitest';
import {
    calculateStablefordRound,
    stablefordPointsFromNet,
    aggregatePlayerTotals,
    aggregateTeamTotals,
} from '../src/scoring';

// Standard stroke indexes 1..18 for a full round (index 0 = hole 1)
const strokeIndexes18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
// Typical par distribution summing to 72
const pars72 = [4, 4, 4, 3, 4, 5, 4, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 5];

describe('stablefordPointsFromNet', () => {
    const par = 4;
    it('returns 0 for double bogey or worse', () => {
        expect(stablefordPointsFromNet(6, par)).toBe(0); // +2
        expect(stablefordPointsFromNet(10, par)).toBe(0); // triple+
    });
    it('returns 1 for bogey', () => {
        expect(stablefordPointsFromNet(5, par)).toBe(1);
    });
    it('returns 2 for par', () => {
        expect(stablefordPointsFromNet(4, par)).toBe(2);
    });
    it('returns 3 for birdie', () => {
        expect(stablefordPointsFromNet(3, par)).toBe(3);
    });
    it('returns 4 for eagle', () => {
        expect(stablefordPointsFromNet(2, par)).toBe(4);
    });
    it('returns 5 for albatross', () => {
        expect(stablefordPointsFromNet(1, par)).toBe(5);
    });
    it('returns 0 for null (pickup / no return)', () => {
        expect(stablefordPointsFromNet(null, par)).toBe(0);
    });
    it('scales past albatross (condor = 6)', () => {
        expect(stablefordPointsFromNet(0, par)).toBe(6);
    });
});

describe('calculateStablefordRound', () => {
    it('scratch player, all pars, 80% allowance → 36 points', () => {
        const result = calculateStablefordRound({
            grossScores: pars72,
            pars: pars72,
            strokeIndexes: strokeIndexes18,
            handicapIndex: 0,
            allowance: 0.80,
        });
        expect(result.playingHandicap).toBe(0);
        expect(result.totalPoints).toBe(36); // 2 pts × 18 holes
    });

    it('18-HCP player @ 80%, all pars gross → bogeys with strokes on SI 1-14', () => {
        // PH = round(18 × 0.80) = round(14.4) = 14
        // Shoots par on every hole gross. Net = par - 1 on SI 1-14 (birdie net, 3 pts),
        // Net = par on SI 15-18 (par net, 2 pts). Total = 14×3 + 4×2 = 42 + 8 = 50.
        const result = calculateStablefordRound({
            grossScores: pars72,
            pars: pars72,
            strokeIndexes: strokeIndexes18,
            handicapIndex: 18,
            allowance: 0.80,
        });
        expect(result.playingHandicap).toBe(14);
        // SI 1-14 get 1 stroke each → net -1 from par → birdie (3 pts)
        // SI 15-18 get 0 strokes → net = par (2 pts)
        const birdieHoles = result.holes.filter(h => h.points === 3);
        const parHoles = result.holes.filter(h => h.points === 2);
        expect(birdieHoles).toHaveLength(14);
        expect(parHoles).toHaveLength(4);
        expect(result.totalPoints).toBe(14 * 3 + 4 * 2);
    });

    it('handles pickups (null gross) as 0 points', () => {
        const grossScores: (number | null)[] = [...pars72];
        grossScores[0] = null; // picked up on hole 1
        grossScores[17] = null; // picked up on hole 18

        const result = calculateStablefordRound({
            grossScores,
            pars: pars72,
            strokeIndexes: strokeIndexes18,
            handicapIndex: 0,
            allowance: 0.80,
        });
        expect(result.holes[0].points).toBe(0);
        expect(result.holes[17].points).toBe(0);
        // 16 pars × 2 pts = 32
        expect(result.totalPoints).toBe(32);
    });

    it('rejects input arrays that are not 18 entries', () => {
        expect(() =>
            calculateStablefordRound({
                grossScores: [4, 4, 4],
                pars: pars72,
                strokeIndexes: strokeIndexes18,
                handicapIndex: 0,
            })
        ).toThrow();
    });

    it('defaults allowance to 80% when not specified', () => {
        const a = calculateStablefordRound({
            grossScores: pars72,
            pars: pars72,
            strokeIndexes: strokeIndexes18,
            handicapIndex: 10,
        });
        const b = calculateStablefordRound({
            grossScores: pars72,
            pars: pars72,
            strokeIndexes: strokeIndexes18,
            handicapIndex: 10,
            allowance: 0.80,
        });
        expect(a.totalPoints).toBe(b.totalPoints);
        expect(a.playingHandicap).toBe(b.playingHandicap);
    });

    it('handicap 36 @ 80% → PH 29 (1 stroke on all 18 + extra on SI 1-11)', () => {
        // PH = round(36 × 0.80) = round(28.8) = 29
        // Strokes: 1 on every hole, +1 extra on SI 1..11 → 2 strokes on SI 1-11, 1 stroke on SI 12-18
        const result = calculateStablefordRound({
            grossScores: pars72.map(p => p + 1), // one-over-par gross on every hole
            pars: pars72,
            strokeIndexes: strokeIndexes18,
            handicapIndex: 36,
            allowance: 0.80,
        });
        expect(result.playingHandicap).toBe(29);
        // SI 1-11: 2 strokes, gross = par+1 → net = par-1 → birdie (3 pts) × 11 = 33
        // SI 12-18: 1 stroke, gross = par+1 → net = par (2 pts) × 7 = 14
        expect(result.totalPoints).toBe(33 + 14);
    });
});

describe('aggregatePlayerTotals', () => {
    it('sums Stableford and Ryder individual points across rounds, sorted by Stableford', () => {
        const totals = aggregatePlayerTotals([
            { playerId: 'p1', roundNumber: 1, stablefordPoints: 34, ryderIndividualPoints: 1 },
            { playerId: 'p1', roundNumber: 2, stablefordPoints: 38, ryderIndividualPoints: 0.5 },
            { playerId: 'p1', roundNumber: 3, stablefordPoints: 36, ryderIndividualPoints: 1 },
            { playerId: 'p2', roundNumber: 1, stablefordPoints: 40, ryderIndividualPoints: 0 },
            { playerId: 'p2', roundNumber: 2, stablefordPoints: 42, ryderIndividualPoints: 1 },
        ]);
        expect(totals).toHaveLength(2);
        // p1: 34 + 38 + 36 = 108 (leader)
        expect(totals[0].playerId).toBe('p1');
        expect(totals[0].stablefordCumulative).toBe(108);
        expect(totals[0].ryderIndividualCumulative).toBe(2.5);
        expect(totals[0].roundsPlayed).toBe(3);
        // p2: 40 + 42 = 82
        expect(totals[1].playerId).toBe('p2');
        expect(totals[1].stablefordCumulative).toBe(82);
        expect(totals[1].ryderIndividualCumulative).toBe(1);
        expect(totals[1].roundsPlayed).toBe(2);
    });
});

describe('aggregateTeamTotals', () => {
    it('sums team match points across rounds, sorted by points', () => {
        const totals = aggregateTeamTotals([
            { team: 'red', roundNumber: 1, matchPoints: 5 },
            { team: 'red', roundNumber: 2, matchPoints: 4 },
            { team: 'red', roundNumber: 3, matchPoints: 3 },
            { team: 'blue', roundNumber: 1, matchPoints: 7 },
            { team: 'blue', roundNumber: 2, matchPoints: 8 },
            { team: 'blue', roundNumber: 3, matchPoints: 9 },
        ]);
        expect(totals).toHaveLength(2);
        expect(totals[0].team).toBe('blue');
        expect(totals[0].matchPointsCumulative).toBe(24);
        expect(totals[1].team).toBe('red');
        expect(totals[1].matchPointsCumulative).toBe(12);
    });
});
