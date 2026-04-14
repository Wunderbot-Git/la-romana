import { describe, it, expect } from 'vitest';
import { calculateSinglesMatch, SinglesMatchInput } from '../src/scoring';

describe('Singles Match Engine', () => {

    // Standard SI order for 9 holes (front)
    const strokeIndexes9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    describe('No Strokes Difference', () => {
        it('should calculate match with equal handicaps', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 10, grossScores: [4, 4, 4, 4, 4, 4, 4, 4, 4] },
                bluePlayer: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.redPlayingHandicap).toBe(8);
            expect(result.bluePlayingHandicap).toBe(8);
            // No strokes given since equal handicaps
            expect(result.holes[0].redStrokes).toBe(0);
            expect(result.holes[0].blueStrokes).toBe(0);
        });

        it('should have lower gross win each hole', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 10, grossScores: [4, 5, 4, 5, 4, 5, 4, 5, 4] },
                bluePlayer: { handicapIndex: 10, grossScores: [5, 4, 5, 4, 5, 4, 5, 4, 5] },
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            expect(result.holes[0].winner).toBe('red'); // Red 4 vs Blue 5
            expect(result.holes[1].winner).toBe('blue'); // Red 5 vs Blue 4
        });
    });

    describe('Stroke Advantage', () => {
        it('should give strokes to higher handicap player', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 20, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] }, // PH 16
                bluePlayer: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] }, // PH 8
                strokeIndexes: strokeIndexes9,
                totalHoles: 9
            };

            const result = calculateSinglesMatch(input);
            // Differential = 16 - 8 = 8 strokes
            // Red receives strokes on SI 1-8
            expect(result.holes[0].redStrokes).toBe(1); // SI 1
            // Match may be decided before all holes played, just check first few
            expect(result.holes[0].blueStrokes).toBe(0);
            // Verify differential is applied (red gets strokes, not blue)
            expect(result.redPlayingHandicap).toBe(16);
            expect(result.bluePlayingHandicap).toBe(8);
        });

        it('should apply strokes correctly on SI holes', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 15, grossScores: [5] }, // PH 12
                bluePlayer: { handicapIndex: 5, grossScores: [5] },  // PH 4
                strokeIndexes: [1], // SI 1
                totalHoles: 1
            };

            const result = calculateSinglesMatch(input);
            // Differential = 12 - 4 = 8, red gets stroke on SI 1
            expect(result.holes[0].redStrokes).toBe(1);
            expect(result.holes[0].redNet).toBe(4); // 5 - 1
            expect(result.holes[0].blueNet).toBe(5);
            expect(result.holes[0].winner).toBe('red'); // 4 < 5
        });
    });

    describe('Match Progression', () => {
        it('should track lead through holes', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 10, grossScores: [4, 4, 4, 5, 5, 5, 5, 5, 5] },
                bluePlayer: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
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
                redPlayer: { handicapIndex: 10, grossScores: [3, 3, 3, 3, 3, 5, 5, 5, 5] },
                bluePlayer: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5] },
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
        it('should handle tie match', () => {
            const input: SinglesMatchInput = {
                redPlayer: { handicapIndex: 10, grossScores: [4, 5, 4, 5, 4, 5, 4, 5, 4] },
                bluePlayer: { handicapIndex: 10, grossScores: [5, 4, 5, 4, 5, 4, 5, 4, 5] },
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
                redPlayer: { handicapIndex: 10, grossScores: [3, 3, 3, 4, 4, 4, 4] },
                bluePlayer: { handicapIndex: 10, grossScores: [5, 5, 5, 4, 4, 4, 4] },
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
