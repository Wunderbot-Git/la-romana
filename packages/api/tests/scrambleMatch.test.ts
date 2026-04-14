import { describe, it, expect } from 'vitest';
import { calculateScrambleMatch, ScrambleMatchInput, calculateScrambleTeamHandicap } from '../src/scoring';

describe('Scramble Match Engine', () => {

    const si9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    describe('Team Handicap', () => {
        it('should calculate (15 + 20) * 0.20 = 7', () => {
            expect(calculateScrambleTeamHandicap(15, 20)).toBe(7);
        });

        it('should calculate (10 + 10) * 0.20 = 4', () => {
            expect(calculateScrambleTeamHandicap(10, 10)).toBe(4);
        });
    });

    describe('Stroke Allocation', () => {
        it('should give strokes based on differential', () => {
            // Red: (20+20)*0.20 = 8, Blue: (10+10)*0.20 = 4
            // Diff: Red gets 8-4 = 4 strokes on SI 1-4
            const input: ScrambleMatchInput = {
                redTeam: {
                    player1HandicapIndex: 20,
                    player2HandicapIndex: 20,
                    teamGrossScores: [4, 4, 4, 4, 4],
                    strokeIndexes: [1, 2, 3, 4, 5]
                },
                blueTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [4, 4, 4, 4, 4],
                    strokeIndexes: [1, 2, 3, 4, 5]
                },
                totalHoles: 5
            };

            const result = calculateScrambleMatch(input);
            expect(result.redTeamHandicap).toBe(8);
            expect(result.blueTeamHandicap).toBe(4);
            // Red gets stroke on SI 1-4 (but match may clinch early)
            expect(result.holes[0].redStrokes).toBe(1);
            expect(result.holes[0].blueStrokes).toBe(0);
            // Verify strokes are being applied
            expect(result.holes[0].redNet).toBe(3); // 4 - 1
            expect(result.holes[0].blueNet).toBe(4); // 4 - 0
        });
    });

    describe('Match Progression', () => {
        it('should handle full back 9', () => {
            const input: ScrambleMatchInput = {
                redTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [4, 4, 4, 4, 4, 4, 4, 4, 4],
                    strokeIndexes: si9
                },
                blueTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [5, 5, 5, 5, 5, 5, 5, 5, 5],
                    strokeIndexes: si9
                },
                totalHoles: 9
            };

            const result = calculateScrambleMatch(input);
            expect(result.holes.length).toBe(5); // Red 5 up after 5 = decided
        });

        it('should handle early clinch 5&4', () => {
            const input: ScrambleMatchInput = {
                redTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [3, 3, 3, 3, 3, 4, 4, 4, 4],
                    strokeIndexes: si9
                },
                blueTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [5, 5, 5, 5, 5, 4, 4, 4, 4],
                    strokeIndexes: si9
                },
                totalHoles: 9
            };

            const result = calculateScrambleMatch(input);
            expect(result.finalState.isDecided).toBe(true);
            expect(result.finalState.lead).toBe(5);
            expect(result.finalState.holesRemaining).toBe(4);
            expect(result.result.finalStatus).toBe('5&4');
        });
    });

    describe('Point Value', () => {
        it('should give winner 2 points (default)', () => {
            const input: ScrambleMatchInput = {
                redTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [3],
                    strokeIndexes: [1]
                },
                blueTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [5],
                    strokeIndexes: [1]
                },
                totalHoles: 1
            };

            const result = calculateScrambleMatch(input);
            expect(result.result.redPoints).toBe(2);
            expect(result.result.bluePoints).toBe(0);
        });

        it('should give 1 point each on tie', () => {
            const input: ScrambleMatchInput = {
                redTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [4],
                    strokeIndexes: [1]
                },
                blueTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [4],
                    strokeIndexes: [1]
                },
                totalHoles: 1
            };

            const result = calculateScrambleMatch(input);
            expect(result.result.redPoints).toBe(1);
            expect(result.result.bluePoints).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        it('should support different scramble percentages', () => {
            const input: ScrambleMatchInput = {
                redTeam: {
                    player1HandicapIndex: 20,
                    player2HandicapIndex: 20,
                    teamGrossScores: [4],
                    strokeIndexes: [1]
                },
                blueTeam: {
                    player1HandicapIndex: 10,
                    player2HandicapIndex: 10,
                    teamGrossScores: [4],
                    strokeIndexes: [1]
                },
                totalHoles: 1,
                scrambleAllowance: 0.25 // 25% instead of 20%
            };

            const result = calculateScrambleMatch(input);
            // Red: (20+20)*0.25 = 10, Blue: (10+10)*0.25 = 5
            expect(result.redTeamHandicap).toBe(10);
            expect(result.blueTeamHandicap).toBe(5);
        });
    });
});
