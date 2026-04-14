import { calculateScrambleMatch } from '../src/scoring/scrambleMatch';

// Flight 1: Fito/Adri (Red) vs Fercho/Gaitan (Blue)
// Red: 11.0 + 14.0 = 25.0 × 0.20 = 5.0
// Blue: 15.0 + 20.0 = 35.0 × 0.20 = 7.0
// Blue should get 2 strokes

const input = {
    redTeam: {
        player1HandicapIndex: 11.0,
        player2HandicapIndex: 14.0,
        teamGrossScores: [4, 4, 2, 4, 4, 3, 4, 5, 5], // Back 9 scores
        strokeIndexes: [10, 2, 4, 6, 16, 18, 14, 8, 12] // Back 9 SI
    },
    blueTeam: {
        player1HandicapIndex: 15.0,
        player2HandicapIndex: 20.0,
        teamGrossScores: [5, 5, 3, 4, 4, 3, 5, 5, 7],
        strokeIndexes: [10, 2, 4, 6, 16, 18, 14, 8, 12]
    },
    totalHoles: 9,
    matchPoints: 2
};

console.log('Testing Scramble Match Calculation\n');
console.log('Input:');
console.log('  Red Team HCPs:', input.redTeam.player1HandicapIndex, '+', input.redTeam.player2HandicapIndex);
console.log('  Blue Team HCPs:', input.blueTeam.player1HandicapIndex, '+', input.blueTeam.player2HandicapIndex);
console.log('  Expected Red TH:', (input.redTeam.player1HandicapIndex + input.redTeam.player2HandicapIndex) * 0.20);
console.log('  Expected Blue TH:', (input.blueTeam.player1HandicapIndex + input.blueTeam.player2HandicapIndex) * 0.20);
console.log('  Expected Blue Strokes:', 7.0 - 5.0, '\n');

const result = calculateScrambleMatch(input);

console.log('Result:');
console.log('  Red Team Handicap:', result.redTeamHandicap);
console.log('  Blue Team Handicap:', result.blueTeamHandicap);
console.log('  Differential:', result.blueTeamHandicap - result.redTeamHandicap);
console.log('\nHole Details:');
result.holes.forEach(hole => {
    console.log(`  Hole ${hole.holeNumber} (SI ${hole.strokeIndex}):`);
    console.log(`    Red: ${hole.redGross} - ${hole.redStrokes} = ${hole.redNet}`);
    console.log(`    Blue: ${hole.blueGross} - ${hole.blueStrokes} = ${hole.blueNet}`);
    console.log(`    Winner: ${hole.winner || 'tie'}`);
});

console.log('\nStroke Arrays:');
console.log('  Red Strokes:', result.holes.map(h => h.redStrokes));
console.log('  Blue Strokes:', result.holes.map(h => h.blueStrokes));
