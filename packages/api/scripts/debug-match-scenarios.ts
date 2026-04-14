
import { calculatePlayingHandicap, SINGLES_FOURBALL_ALLOWANCE } from '../src/scoring/handicap';
import { getStrokesForHole } from '../src/scoring/strokeAllocation';
import { calculateNetScore } from '../src/scoring/netScore';
import { compareHoleScores } from '../src/scoring/matchStatus';

const runScenario = () => {
    console.log('--- Debug Match Scenario ---');
    console.log(`Current Allowance: ${SINGLES_FOURBALL_ALLOWANCE * 100}%`);

    const playerHI = 3.0; // Fercho
    const holeSI = 3;
    const gross = 5;

    console.log(`\nPlayer Handicap Index: ${playerHI}`);
    console.log(`Hole Stroke Index: ${holeSI}`);

    // Calculate Playing Handicap
    const ph = calculatePlayingHandicap(playerHI);
    console.log(`Playing Handicap (Index * Allowance): ${playerHI * SINGLES_FOURBALL_ALLOWANCE} -> Rounded: ${ph}`);

    // Calculate Strokes
    const strokes = getStrokesForHole(ph, holeSI);
    console.log(`Strokes for Hole (PH vs SI): ${strokes}`);

    // Calculate Net
    const net = calculateNetScore(gross, strokes);
    console.log(`Gross Score: ${gross}`);
    console.log(`Net Score: ${net}`);

    // Compare with Fito (Gross 4, Net 4 assuming PH < 3)
    const fitoNet = 4;
    console.log(`\nOpponent (Fito) Net: ${fitoNet}`);

    const winner = compareHoleScores(fitoNet, net);
    console.log(`Winner: ${winner ? winner : 'Halved'}`);

    if (winner === 'red') { // Fito (Red) wins
        console.log('\n[!] BUG REPRODUCED: Fercho should have tied with net 4, but lost (likely net 5).');
    } else {
        console.log('\n[?] SCENARIO PASSED: Match Halved.');
    }
};

runScenario();
