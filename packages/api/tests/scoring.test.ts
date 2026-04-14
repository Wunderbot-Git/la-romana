import { describe, it, expect } from 'vitest';
import {
    roundHalfUp,
    calculatePlayingHandicap,
    calculateScrambleTeamHandicap,
    getStrokesForHole,
    calculateStrokeAllocation,
    calculateNetScore,
    calculateNetScoresForRound
} from '../src/scoring';

describe('Scoring Module', () => {

    describe('Rounding', () => {
        it('should round 4.5 to 5', () => {
            expect(roundHalfUp(4.5)).toBe(5);
        });

        it('should round 4.4 to 4', () => {
            expect(roundHalfUp(4.4)).toBe(4);
        });

        it('should round 4.6 to 5', () => {
            expect(roundHalfUp(4.6)).toBe(5);
        });
    });

    describe('Playing Handicap', () => {
        it('should calculate HCP 10 * 0.80 = 8', () => {
            expect(calculatePlayingHandicap(10)).toBe(8);
        });

        it('should calculate HCP 15 * 0.80 = 12', () => {
            expect(calculatePlayingHandicap(15)).toBe(12);
        });

        it('should calculate HCP 11 * 0.80 = 8.8 → 9', () => {
            expect(calculatePlayingHandicap(11)).toBe(9);
        });

        it('should calculate HCP 0 * 0.80 = 0', () => {
            expect(calculatePlayingHandicap(0)).toBe(0);
        });
    });

    describe('Scramble Team Handicap', () => {
        it('should calculate (10 + 15) * 0.30 = 7.5 → 8', () => {
            expect(calculateScrambleTeamHandicap(10, 15)).toBe(8);
        });

        it('should calculate (5 + 7) * 0.30 = 3.6 → 4', () => {
            expect(calculateScrambleTeamHandicap(5, 7)).toBe(4);
        });
    });

    describe('Stroke Allocation', () => {
        it('should give 1 stroke on SI 1-10 for PH 10', () => {
            expect(getStrokesForHole(10, 1)).toBe(1);
            expect(getStrokesForHole(10, 10)).toBe(1);
            expect(getStrokesForHole(10, 11)).toBe(0);
        });

        it('should give 1 stroke on all holes for PH 18', () => {
            for (let si = 1; si <= 18; si++) {
                expect(getStrokesForHole(18, si)).toBe(1);
            }
        });

        it('should give 2 strokes on SI 1-4 for PH 22', () => {
            expect(getStrokesForHole(22, 1)).toBe(2);
            expect(getStrokesForHole(22, 4)).toBe(2);
            expect(getStrokesForHole(22, 5)).toBe(1);
        });

        it('should give 0 strokes for PH 0', () => {
            expect(getStrokesForHole(0, 1)).toBe(0);
        });

        it('should calculate full round allocation', () => {
            const indexes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
            const alloc = calculateStrokeAllocation(10, indexes);
            expect(alloc.slice(0, 10).every(s => s === 1)).toBe(true);
            expect(alloc.slice(10).every(s => s === 0)).toBe(true);
        });
    });

    describe('Net Score', () => {
        it('should calculate net = gross - strokes', () => {
            expect(calculateNetScore(5, 1)).toBe(4);
            expect(calculateNetScore(4, 0)).toBe(4);
        });

        it('should calculate net scores for round', () => {
            const grossScores = [5, 4, 6, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5];
            const indexes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
            const result = calculateNetScoresForRound(grossScores, 10, indexes);

            expect(result).toHaveLength(18);
            expect(result[0].netScore).toBe(4); // 5 - 1
            expect(result[10].netScore).toBe(4); // 4 - 0
        });
    });
});
