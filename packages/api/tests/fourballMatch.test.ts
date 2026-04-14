import { describe, it, expect } from 'vitest';
import { calculateFourballMatch, FourballMatchInput } from '../src/scoring';

describe('Fourball Match Engine', () => {

    const si9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    describe('Basic Fourball', () => {
        it('should have one player carry team on a hole', () => {
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [4], strokeIndexes: [1] } // Carries
                },
                blueTeam: {
                    player1: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }
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
                    player1: { handicapIndex: 10, grossScores: [5, 3], strokeIndexes: [1, 2] }, // Carries H2
                    player2: { handicapIndex: 10, grossScores: [4, 5], strokeIndexes: [1, 2] }  // Carries H1
                },
                blueTeam: {
                    player1: { handicapIndex: 10, grossScores: [5, 5], strokeIndexes: [1, 2] },
                    player2: { handicapIndex: 10, grossScores: [5, 5], strokeIndexes: [1, 2] }
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
                    player1: { handicapIndex: 10, grossScores: [4], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [4], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].red.bestNet).toBe(4);
        });

        it('should pick better player when one is lower', () => {
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 10, grossScores: [6], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [4], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            expect(result.holes[0].red.bestNet).toBe(4); // P2's score
        });
    });

    describe('Mixed Tees (Stroke Differential)', () => {
        it('should give strokes based on differential from lowest', () => {
            // Red P1: HCP 20 (PH 16), P2: HCP 10 (PH 8)
            // Blue P1: HCP 5 (PH 4), P2: HCP 10 (PH 8)
            // Lowest PH = 4 (Blue P1)
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 20, grossScores: [5], strokeIndexes: [1] }, // Gets 12 strokes diff
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }  // Gets 4 strokes diff
                },
                blueTeam: {
                    player1: { handicapIndex: 5, grossScores: [5], strokeIndexes: [1] },  // Gets 0
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] } // Gets 4 strokes diff
                },
                totalHoles: 1
            };

            const result = calculateFourballMatch(input);
            // Red P1 gets stroke on SI 1 (diff 12 >= 1), net = 5-1 = 4
            expect(result.holes[0].red.p1Strokes).toBe(1);
            // Blue P1 lowest, gets 0
            expect(result.holes[0].blue.p1Strokes).toBe(0);
        });
    });

    describe('Match Progression', () => {
        it('should handle full match with early clinch', () => {
            // Red wins first 5 holes -> 5 up with 4 to play -> decided
            const input: FourballMatchInput = {
                redTeam: {
                    player1: { handicapIndex: 10, grossScores: [3, 3, 3, 3, 3, 5, 5, 5, 5], strokeIndexes: si9 },
                    player2: { handicapIndex: 10, grossScores: [3, 3, 3, 3, 3, 5, 5, 5, 5], strokeIndexes: si9 }
                },
                blueTeam: {
                    player1: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5], strokeIndexes: si9 },
                    player2: { handicapIndex: 10, grossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5], strokeIndexes: si9 }
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
                    player1: { handicapIndex: 10, grossScores: [4], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 10, grossScores: [4], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }
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
                    player1: { handicapIndex: 10, grossScores: [null], strokeIndexes: [1] }, // Picked up
                    player2: { handicapIndex: 10, grossScores: [4], strokeIndexes: [1] }
                },
                blueTeam: {
                    player1: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] },
                    player2: { handicapIndex: 10, grossScores: [5], strokeIndexes: [1] }
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
