import { describe, it, expect } from 'vitest';
import { calculateFourballMatch, FourballMatchInput } from '../src/scoring/fourballMatch';

describe('Fourball Early Finalization Bug', () => {
    it('should not mark match as final after 2 holes', () => {
        const input: FourballMatchInput = {
            redTeam: {
                player1: { handicapIndex: 12, grossScores: [4, 4, null, null, null, null, null, null, null], strokeIndexes: [3, 1, 9, 11, 5, 13, 15, 7, 17] },
                player2: { handicapIndex: 17, grossScores: [4, 5, null, null, null, null, null, null, null], strokeIndexes: [3, 1, 9, 11, 5, 13, 15, 7, 17] },
            },
            blueTeam: {
                player1: { handicapIndex: 7, grossScores: [4, 5, null, null, null, null, null, null, null], strokeIndexes: [3, 1, 9, 11, 5, 13, 15, 7, 17] },
                player2: { handicapIndex: 17, grossScores: [4, 6, null, null, null, null, null, null, null], strokeIndexes: [3, 1, 9, 11, 5, 13, 15, 7, 17] },
            },
            totalHoles: 9,
            matchPoints: 1
        };

        const result = calculateFourballMatch(input);

        console.log("FINAL STATE:", JSON.stringify(result.finalState, null, 2));
        console.log("RESULT:", JSON.stringify(result.result, null, 2));

        expect(result.finalState.isDecided).toBe(false);
        expect(result.result.finalStatus).toBe('1 UP');
    });
});
