/**
 * Fourball Match Engine — tests
 *
 * RULE: La Romana 2026 plays "Full Course Handicap" fourball (modern WHS standard,
 * confirmed by tournament organizer Apr 2026):
 *   - Each of the 4 players receives strokes per their OWN Playing Handicap.
 *   - On a hole with stroke index SI, a player with PH ≥ SI gets 1 stroke.
 *   - Each player computes their own net score; team takes the LOWER (best ball).
 *   - Lower team-best-net wins the hole.
 *
 * NOT used: the older "differential from lowest of 4 PHs" rule.
 *
 * Most tests use HCP 0 (PH 0) to isolate the best-ball / hole-winner logic from
 * stroke allocation. The dedicated "Stroke Allocation" describe block exercises
 * the per-player stroke math.
 */

import { describe, it, expect } from 'vitest';
import { calculateFourballMatch, FourballMatchInput } from '../src/scoring';

describe('Fourball Match Engine', () => {

    const si9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    describe('Basic Fourball', () => {
        it('should have one player carry team on a hole', () => {
            // HCP 0 → PH 0 → no strokes. Best-ball logic only.
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [4], strokeIndexes: [1] } // Carries
                },
                blueTeam: {
                    player1: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].red.bestNet).toBe(4);
            expect(result.holes[0].blue.bestNet).toBe(5);
            expect(result.holes[0].winner).toBe('red');
        });

        it('should have different player carry on next hole', () => {
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 0, grossScores: [5, 3], strokeIndexes: [1, 2] }, // Carries H2
                    player2: { handicapIndex: 0, grossScores: [4, 5], strokeIndexes: [1, 2] }  // Carries H1
                },
                blueTeam: {
                    player1: { handicapIndex: 0, grossScores: [5, 5], strokeIndexes: [1, 2] },
                    player2: { handicapIndex: 0, grossScores: [5, 5], strokeIndexes: [1, 2] }
                },
                totalHoles: 2
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].red.bestNet).toBe(4); // P2 carries
            expect(result.holes[1].red.bestNet).toBe(3); // P1 carries
        });
    });

    describe('Best Ball Selection', () => {
        it('should pick either when both nets are same', () => {
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 0, grossScores: [4], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [4], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].red.bestNet).toBe(4);
        });

        it('should pick better player when one is lower', () => {
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 0, grossScores: [6], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [4], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].red.bestNet).toBe(4); // P2's score
        });
    });

    describe('Stroke Allocation (Full Course HCP)', () => {
        it('should give each player strokes per own PH on holes within that PH', () => {
            // Red P1: HCP 20 (PH 16), Red P2: HCP 10 (PH 8)
            // Blue P1: HCP 5  (PH 4), Blue P2: HCP 10 (PH 8)
            // On SI 1: all 4 PHs ≥ 1 → all 4 get 1 stroke (Full HCP).
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 20, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 5, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            // SI 1 — all PHs ≥ 1, so all 4 receive a stroke independently
            expect(result.holes[0].red.p1Strokes).toBe(1);
            expect(result.holes[0].red.p2Strokes).toBe(1);
            expect(result.holes[0].blue.p1Strokes).toBe(1);
            expect(result.holes[0].blue.p2Strokes).toBe(1);
            // Per-player Playing HCPs are reflected on the output
            expect(result.redTeamHandicaps).toEqual({ p1: 16, p2: 8 });
            expect(result.blueTeamHandicaps).toEqual({ p1: 4, p2: 8 });
        });

        it('should only give a stroke to players whose PH covers the SI', () => {
            // SI 10: Red P1 PH 16 ≥ 10 → 1 stroke. Others (PH 8/4/8) < 10 → 0.
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 20, grossScores: [5], strokeIndexes: [10] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [10] }
                },
                blueTeam: {
                    player1: { handicapIndex: 5, grossScores: [5], strokeIndexes: [10] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [10] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].red.p1Strokes).toBe(1);
            expect(result.holes[0].red.p2Strokes).toBe(0);
            expect(result.holes[0].blue.p1Strokes).toBe(0);
            expect(result.holes[0].blue.p2Strokes).toBe(0);
            // Red P1 nets 4, others net 5 → red bestNet 4 wins
            expect(result.holes[0].red.bestNet).toBe(4);
            expect(result.holes[0].blue.bestNet).toBe(5);
            expect(result.holes[0].winner).toBe('red');
        });
    });

    describe('Match Progression', () => {
        it('should handle full match with early clinch', () => {
            // Red wins first 5 holes -> 5 up with 4 to play -> decided
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 0, grossScores: [3, 3, 3, 3, 3, 5, 5, 5, 5], strokeIndexes: si9 },
                    player2: { handicapIndex: 0, grossScores: [3, 3, 3, 3, 3, 5, 5, 5, 5], strokeIndexes: si9 }
                },
                blueTeam: {
                    player1: { handicapIndex: 0, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5], strokeIndexes: si9 },
                    player2: { handicapIndex: 0, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5], strokeIndexes: si9 }
                },
                totalHoles: 9
            };

            const result = calculateFourballMatch(input);
            expect(result.finalState.isDecided).toBe(true);
            expect(result.holes.length).toBe(5);
        });
    });

    describe('Tie Scenarios', () => {
        it('should handle teams tying a hole', () => {
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 0, grossScores: [4], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 0, grossScores: [4], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].winner).toBeNull(); // Halved
        });
    });

    describe('Edge Cases', () => {
        it('should handle one player picking up', () => {
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 0, grossScores: [null], strokeIndexes: [1] }, // Picked up
                    player2: { handicapIndex: 0, grossScores: [4], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 0, grossScores: [5], strokeIndexes: [1] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].red.p1Net).toBeNull();
            expect(result.holes[0].red.bestNet).toBe(4); // P2's score
            expect(result.holes[0].winner).toBe('red');
        });
    });
});
