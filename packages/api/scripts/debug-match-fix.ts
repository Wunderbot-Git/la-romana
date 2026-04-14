
import { calculateFlightMatches, FlightPlayerScores } from '../src/scoring/flightMatchCalculator';
import { formatMatchStatus } from '../src/scoring/matchStatus';

const null9: (number | null)[] = Array(9).fill(null);
const si9 = Array.from({ length: 18 }, (_, i) => i + 1);

const makePlayer = (hcp: number, scores: (number | null)[]): FlightPlayerScores => ({
    handicapIndex: hcp,
    frontNineGross: scores,
    backNineGross: null9,
    strokeIndexes: si9
});

console.log('--- Testing Match Logic Fix ---');

// Scenario: Hole 1 played, rest null
const scoresP1 = [4, null, null, null, null, null, null, null, null];
const scoresP2 = [5, null, null, null, null, null, null, null, null]; // P2 loses hole 1

const input = {
    redPlayer1: makePlayer(0, scoresP1),
    redPlayer2: makePlayer(10, scoresP1),
    bluePlayer1: makePlayer(0, scoresP2),
    bluePlayer2: makePlayer(10, scoresP2)
};

const result = calculateFlightMatches(input);

console.log(`Singles 1 Hole Count: ${result.singles1?.holes.length}`);
console.log(`Fourball Hole Count: ${result.fourball?.holes.length}`);

if (result.fourball) {
    result.fourball.holes.forEach(h => {
        console.log(`Hole ${h.holeNumber}: ${formatMatchStatus(h.matchState)} (Winner: ${h.winner})`);
    });
}
