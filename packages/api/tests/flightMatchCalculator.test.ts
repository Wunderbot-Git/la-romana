import { describe, it, expect } from 'vitest';
import { calculateFlightMatches, FlightMatchesInput } from '../src/scoring';

describe('Flight Match Calculator (La Romana — 18-hole singles + fourball)', () => {
    const si18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    const makePlayer = (hcp: number, scores: number[]) => ({
        handicapIndex: hcp,
        grossScores: scores,
        strokeIndexes: si18,
    });

    describe('Complete flight', () => {
        it('produces 3 matches (singles1, singles2, fourball)', () => {
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, Array(18).fill(4)),
                redPlayer2: makePlayer(10, Array(18).fill(4)),
                bluePlayer1: makePlayer(10, Array(18).fill(5)),
                bluePlayer2: makePlayer(10, Array(18).fill(5)),
            };

            const result = calculateFlightMatches(input);

            expect(result.singles1).not.toBeNull();
            expect(result.singles2).not.toBeNull();
            expect(result.fourball).not.toBeNull();
            expect(result.summary.matches).toHaveLength(3);
        });

        it('aggregates total points across all 3 matches (red dominant)', () => {
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, Array(18).fill(3)),
                redPlayer2: makePlayer(10, Array(18).fill(3)),
                bluePlayer1: makePlayer(10, Array(18).fill(6)),
                bluePlayer2: makePlayer(10, Array(18).fill(6)),
            };
            const result = calculateFlightMatches(input);
            // Red wins all 3 matches: 1 + 1 + 1 = 3 points
            expect(result.summary.totalRedPoints).toBe(3);
            expect(result.summary.totalBluePoints).toBe(0);
        });
    });

    describe('Partial data', () => {
        it('returns Not Started stubs when scores are empty', () => {
            const empty = Array(18).fill(null);
            const input: FlightMatchesInput = {
                redPlayer1: makePlayer(10, empty),
                redPlayer2: makePlayer(10, empty),
                bluePlayer1: makePlayer(10, empty),
                bluePlayer2: makePlayer(10, empty),
            };
            const result = calculateFlightMatches(input);
            expect(result.singles1).toBeNull();
            expect(result.singles2).toBeNull();
            expect(result.fourball).toBeNull();
            for (const m of result.summary.matches) {
                expect(m.finalStatus).toBe('Not Started');
                expect(m.redPoints).toBe(0);
                expect(m.bluePoints).toBe(0);
            }
        });
    });
});
