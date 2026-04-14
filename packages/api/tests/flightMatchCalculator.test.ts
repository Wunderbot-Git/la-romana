import { describe, it, expect } from 'vitest';
import { calculateFlightMatches, FlightMatchesInput } from '../src/scoring';

describe('Flight Match Calculator', () => {

    const si18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    const makePlayer = (hcp: number, front: number[], back: number[]): any => ({
        handicapIndex: hcp,
        frontNineGross: front,
        backNineGross: back,
        strokeIndexes: si18
    });

    describe('Complete Flight', () => {
        it('should calculate all 4 matches', () => {
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, [4, 4, 4, 4, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 4, 4, 4, 4]),
                redPlayer2: makePlayer(10, [4, 4, 4, 4, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 4, 4, 4, 4]),
                bluePlayer1: makePlayer(10, [5, 5, 5, 5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5, 5, 5, 5]),
                bluePlayer2: makePlayer(10, [5, 5, 5, 5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5, 5, 5, 5])
            };

            const result = calculateFlightMatches(input);

            expect(result.singles1).not.toBeNull();
            expect(result.singles2).not.toBeNull();
            expect(result.fourball).not.toBeNull();
            expect(result.scramble).not.toBeNull();
            expect(result.summary.matches).toHaveLength(4);
        });

        it('should aggregate total points correctly', () => {
            // Red wins all matches decisively
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, [3, 3, 3, 3, 3, 4, 4, 4, 4], [3, 3, 3, 3, 3, 4, 4, 4, 4]),
                redPlayer2: makePlayer(10, [3, 3, 3, 3, 3, 4, 4, 4, 4], [3, 3, 3, 3, 3, 4, 4, 4, 4]),
                bluePlayer1: makePlayer(10, [5, 5, 5, 5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5, 5, 5, 5]),
                bluePlayer2: makePlayer(10, [5, 5, 5, 5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5, 5, 5, 5])
            };

            const result = calculateFlightMatches(input);

            // Red should win all: 1 + 1 + 1 + 2 = 5 points
            expect(result.summary.totalRedPoints).toBe(5);
            expect(result.summary.totalBluePoints).toBe(0);
        });
    });

    describe('Partial Data', () => {
        it('should handle missing back 9 (no scramble)', () => {
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, [4, 4, 4, 4, 4, 4, 4, 4, 4], []),
                redPlayer2: makePlayer(10, [4, 4, 4, 4, 4, 4, 4, 4, 4], []),
                bluePlayer1: makePlayer(10, [5, 5, 5, 5, 5, 5, 5, 5, 5], []),
                bluePlayer2: makePlayer(10, [5, 5, 5, 5, 5, 5, 5, 5, 5], [])
            };

            const result = calculateFlightMatches(input);

            expect(result.singles1).not.toBeNull();
            expect(result.singles2).not.toBeNull();
            expect(result.fourball).not.toBeNull();
            expect(result.scramble).toBeNull();
            expect(result.summary.matches).toHaveLength(3);
        });

        it('should handle gracefully missing front 9', () => {
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, [], [4, 4, 4, 4, 4, 4, 4, 4, 4]),
                redPlayer2: makePlayer(10, [], [4, 4, 4, 4, 4, 4, 4, 4, 4]),
                bluePlayer1: makePlayer(10, [], [5, 5, 5, 5, 5, 5, 5, 5, 5]),
                bluePlayer2: makePlayer(10, [], [5, 5, 5, 5, 5, 5, 5, 5, 5])
            };

            const result = calculateFlightMatches(input);

            expect(result.singles1).toBeNull();
            expect(result.singles2).toBeNull();
            expect(result.fourball).toBeNull();
            expect(result.scramble).not.toBeNull();
            expect(result.summary.matches).toHaveLength(1);
        });
    });

    describe('Match Types', () => {
        it('should calculate front 9 feeding into singles and fourball', () => {
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, [4, 4, 4, 4, 4, 4, 4, 4, 4], []),
                redPlayer2: makePlayer(10, [4, 4, 4, 4, 4, 4, 4, 4, 4], []),
                bluePlayer1: makePlayer(10, [4, 4, 4, 4, 4, 4, 4, 4, 4], []),
                bluePlayer2: makePlayer(10, [4, 4, 4, 4, 4, 4, 4, 4, 4], [])
            };

            const result = calculateFlightMatches(input);

            // All ties
            expect(result.singles1?.result.finalStatus).toBe('A/S');
            expect(result.singles2?.result.finalStatus).toBe('A/S');
            expect(result.fourball?.result.finalStatus).toBe('A/S');
        });

        it('should calculate scramble worth 2 points', () => {
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, [], [3, 3, 3, 3, 3, 4, 4, 4, 4]),
                redPlayer2: makePlayer(10, [], [3, 3, 3, 3, 3, 4, 4, 4, 4]),
                bluePlayer1: makePlayer(10, [], [5, 5, 5, 5, 5, 5, 5, 5, 5]),
                bluePlayer2: makePlayer(10, [], [5, 5, 5, 5, 5, 5, 5, 5, 5])
            };

            const result = calculateFlightMatches(input);

            expect(result.scramble?.result.redPoints).toBe(2);
            expect(result.scramble?.result.bluePoints).toBe(0);
        });

        it('should use back 9 SI from scrambleStrokeIndexes override', () => {
            // Front 9 SI: [9, 8, 7, 6, 5, 4, 3, 2, 1]
            // Back 9 SI:  [1, 2, 3, 4, 5, 6, 7, 8, 9]
            // With back 9 SI, hole 10 (SI=1) gives strokes to both teams
            // With front 9 SI (bug), hole 10 (SI=9) gives strokes differently
            const si18_override = [9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9];

            // Red team: HCP 20+20 → TH = round((20+20)*0.30) = round(12) = 12
            // Blue team: HCP 5+5 → TH = round((5+5)*0.30) = round(3) = 3
            // Hole 10 (back 9 index 0):
            //   Correct SI (back 9): 1 → both teams get stroke (1<=12, 1<=3)
            //   Wrong SI (front 9): 9 → only red gets stroke (9<=12, 9>3)
            // Both teams score 5 gross on hole 10:
            //   Correct: both get stroke → 4 vs 4 → halved
            //   Wrong: only red gets stroke → 4 vs 5 → red wins (incorrect)
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(20, [], [5, 5, 5, 5, 5, 5, 5, 5, 5]),
                redPlayer2: makePlayer(20, [], [5, 5, 5, 5, 5, 5, 5, 5, 5]),
                bluePlayer1: makePlayer(5, [], [5, 5, 5, 5, 5, 5, 5, 5, 5]),
                bluePlayer2: makePlayer(5, [], [5, 5, 5, 5, 5, 5, 5, 5, 5]),
                scrambleStrokeIndexes: si18_override
            };

            const result = calculateFlightMatches(input);

            // With correct back 9 SI [1,2,3,4,5,6,7,8,9]:
            // Red TH=12 gets strokes on all holes (SI 1-9 all <= 12)
            // Blue TH=3 gets strokes on holes with SI <= 3 (holes with SI 1,2,3)
            // Holes with SI 1,2,3: both get stroke → same gross → halved
            // Holes with SI 4-9: only red gets stroke → red net=4, blue net=5 → red wins
            // Red wins 6 holes, halves 3 → red wins
            expect(result.scramble).not.toBeNull();
            expect(result.scramble?.result.winner).toBe('red');

            // Verify the scramble uses back 9 SI, not front 9
            // With front 9 SI [9,8,7,6,5,4,3,2,1]:
            // Blue TH=3 would get strokes on SI 1,2,3 which map to holes 9,8,7
            // instead of holes 1,2,3 of back 9
            // This would give DIFFERENT hole-by-hole results
            const firstHole = result.scramble!.holes[0];
            // Hole 10 should use SI=1 (from back 9), not SI=9 (from front 9)
            expect(firstHole.strokeIndex).toBe(1);
        });
    });
});
