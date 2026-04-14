
import { calculateMatchState, MatchState } from '../src/scoring/matchStatus';
import { calculateMatchResult } from '../src/scoring/matchResult';

console.log('--- Testing Match Result Logic ---');

// Simulate a match that is 1 UP after 4 holes (Active)
const activeState: MatchState = {
    leader: 'red',
    lead: 1,
    holesPlayed: 4,
    holesRemaining: 5, // Total 9
    isDecided: false,
    isDormie: false
};

const activeResult = calculateMatchResult(activeState);
console.log('Active Match (1 UP, 5 to go):');
console.log('  Winner:', activeResult.winner);
console.log('  Status:', activeResult.finalStatus);

// Simulate a match that is 1 UP after 9 holes (Finished)
const finishedState: MatchState = {
    leader: 'red',
    lead: 1,
    holesPlayed: 9,
    holesRemaining: 0,
    isDecided: false, // Not decided "early", but over
    isDormie: false
};

const finishedResult = calculateMatchResult(finishedState);
console.log('\nFinished Match (1 UP, 0 to go):');
console.log('  Winner:', finishedResult.winner);
console.log('  Status:', finishedResult.finalStatus);

// Simulate a match that is 3 UP with 2 to go (Decided)
const decidedState: MatchState = {
    leader: 'red',
    lead: 3,
    holesPlayed: 7,
    holesRemaining: 2,
    isDecided: true,
    isDormie: false
};

const decidedResult = calculateMatchResult(decidedState);
console.log('\nDecided Match (3 & 2):');
console.log('  Winner:', decidedResult.winner);
console.log('  Status:', decidedResult.finalStatus);
