/**
 * Singles Match Engine — tests
 *
 * RULE: La Romana 2026 plays "Full Course Handicap" match play (modern WHS standard,
 * confirmed by tournament organizer Apr 2026):
 *   - Each player receives strokes per their OWN Playing Handicap, independently
 *     of the opponent.
 *   - On a hole with stroke index SI, a player with PH ≥ SI gets 1 stroke
 *     (or 2 strokes when PH ≥ SI + 18 for very high handicaps).
 *   - Net scores are computed independently for each player; lower net wins.
 *
 * NOT used: the older "100% of differential" rule where only the higher-HCP
 * player receives strokes equal to (higherPH − lowerPH).
 */

import { describe, it, expect } from 'vitest';
import { calculateSinglesMatch, SinglesMatchInput } from '../src/scoring';

describe('Singles Match Engine', () => {

    // Standard SI order for 9 holes (front)
    const strokeIndexes9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    describe('No Strokes (HCP 0)', () => {
        it('should give zero strokes to either player', () => {
            // PH 0 isolates the win-determination logic from stroke allocation.
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 0, grossScores: [4, 4, 4, 4, 4, 4, 4, 4, 4] },
                bluePlayer: { handicapIndex: 0, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.redPlayingHandicap).toBe(0);
            expect(result.bluePlayingHandicap).toBe(0);
            expect(result.holes[0].redStrokes).toBe(0);
            expect(result.holes[0].blueStrokes).toBe(0);
        });

        it('should have lower gross win each hole', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 0, grossScores: [4, 5, 4, 5, 4, 5, 4, 5, 4] },
                bluePlayer: { handicapIndex: 0, grossScores: [5, 4, 5, 4, 5, 4, 5, 4, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.holes[0].winner).toBe('red'); // Red 4 vs Blue 5
            expect(result.holes[1].winner).toBe('blue'); // Red 5 vs Blue 4
        });
    });

    describe('Equal Handicaps — Full HCP gives both players strokes', () => {
        it('should give BOTH players a stroke on holes within their PH', () => {
            // HCP 10 → PH 8. Both get 1 stroke on SI 1-8 (independent of each other).
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
                bluePlayer: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.redPlayingHandicap).toBe(8);
            expect(result.bluePlayingHandicap).toBe(8);
            // SI 1: both PH 8 ≥ SI 1 → both get 1 stroke.
            expect(result.holes[0].redStrokes).toBe(1);
            expect(result.holes[0].blueStrokes).toBe(1);
            // Both nets equal → hole halved.
            expect(result.holes[0].redNet).toBe(4);
            expect(result.holes[0].blueNet).toBe(4);
            expect(result.holes[0].winner).toBeNull();
        });
    });

    describe('Stroke Advantage', () => {
        it('should give the higher-HCP player MORE strokes than the lower-HCP player', () => {
            // Red HCP 20 → PH 16, Blue HCP 10 → PH 8.
            // Both get strokes on SI 1-8 (Full HCP). Only red gets strokes on SI 9-16.
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 20, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
                bluePlayer: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.redPlayingHandicap).toBe(16);
            expect(result.bluePlayingHandicap).toBe(8);

            // SI 1: both ≤ both PHs → both get 1.
            expect(result.holes[0].redStrokes).toBe(1);
            expect(result.holes[0].blueStrokes).toBe(1);

            // SI 9 (hole index 8): red PH 16 ≥ 9 → 1; blue PH 8 < 9 → 0.
            expect(result.holes[8].redStrokes).toBe(1);
            expect(result.holes[8].blueStrokes).toBe(0);
            // Same gross 5, but red nets 4 / blue nets 5 → red wins this hole alone.
            expect(result.holes[8].winner).toBe('red');
        });

        it('should apply stroke only to the player whose PH covers the SI', () => {
            // Red HCP 15 → PH 12, Blue HCP 5 → PH 4. One hole at SI 8.
            // Red PH 12 ≥ 8 → 1 stroke. Blue PH 4 < 8 → 0 strokes.
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 15, grossScores: [5] },
                bluePlayer: { handicapIndex: 5, grossScores: [5] },
                strokeIndexes: [8],
                totalHoles: 1
            };

            const result = calculateSinglesMatch(input);
            expect(result.holes[0].redStrokes).toBe(1);
            expect(result.holes[0].blueStrokes).toBe(0);
            expect(result.holes[0].redNet).toBe(4);
            expect(result.holes[0].blueNet).toBe(5);
            expect(result.holes[0].winner).toBe('red');
        });
    });

    describe('Match Progression', () => {
        it('should track lead through holes', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 0, grossScores: [4, 4, 4, 5, 5, 5, 5, 5, 5] },
                bluePlayer: { handicapIndex: 0, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.holes[0].matchState.lead).toBe(1); // Red 1 UP
            expect(result.holes[0].matchState.leader).toBe('red');
            expect(result.holes[2].matchState.lead).toBe(3); // Red 3 UP
        });
    });

    describe('Early Clinch', () => {
        it('should stop match when decided', () => {
            // Red wins first 5 holes in 9-hole match -> 5 up with 4 to play -> decided
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 0, grossScores: [3, 3, 3, 3, 3, 5, 5, 5, 5] },
                bluePlayer: { handicapIndex: 0, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.finalState.isDecided).toBe(true);
            expect(result.finalState.lead).toBe(5);
            expect(result.holes.length).toBe(5); // Stops at hole 5
        });
    });

    describe('Full Match Scenarios', () => {
        it('should handle close match', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 0, grossScores: [4, 5, 4, 5, 4, 5, 4, 5, 4] },
                bluePlayer: { handicapIndex: 0, grossScores: [5, 4, 5, 4, 5, 4, 5, 4, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            // Red wins 1,3,5,7,9 (5 holes), Blue wins 2,4,6,8 (4 holes) -> Red 1 UP
            expect(result.finalState.lead).toBe(1);
            expect(result.result.winner).toBe('red');
        });

        it('should format 3&2 finish', () => {
            // Red wins holes 1-3, ties rest until hole 7 -> 3 up with 2 to play
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 0, grossScores: [3, 3, 3, 4, 4, 4, 4] },
                bluePlayer: { handicapIndex: 0, grossScores: [5, 5, 5, 4, 4, 4, 4] },
                strokeIndexes: [1, 2, 3, 4, 5, 6, 7],
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.finalState.lead).toBe(3);
            expect(result.finalState.holesRemaining).toBe(2);
            expect(result.finalState.isDecided).toBe(true);
            expect(result.result.finalStatus).toBe('3&2');
        });
    });
});
