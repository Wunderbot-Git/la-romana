import { getLeaderboard } from '../src/services/leaderboardService';

async function debugScrambleStrokes() {
    const eventId = '1ae6ec28-13d7-481c-90c6-67aeaf1f930a';

    console.log('Fetching leaderboard...');
    const leaderboard = await getLeaderboard(eventId);

    const scrambleMatches = leaderboard.matches.filter(m => m.segmentType === 'scramble');

    console.log(`\nFound ${scrambleMatches.length} scramble matches\n`);

    scrambleMatches.forEach(match => {
        console.log(`Match: ${match.name}`);
        console.log(`  segmentType: ${match.segmentType}`);
        console.log(`  redTeamStrokes:`, match.redTeamStrokes);
        console.log(`  blueTeamStrokes:`, match.blueTeamStrokes);
        console.log(`  Red Players:`, match.redPlayers.map(p => ({
            name: p.name,
            scores: p.scores
        })));
        console.log(`  Blue Players:`, match.bluePlayers.map(p => ({
            name: p.name,
            scores: p.scores
        })));
        console.log('---\n');
    });

    // Also check a singles match for comparison
    const singlesMatch = leaderboard.matches.find(m => m.segmentType === 'singles');
    if (singlesMatch) {
        console.log('\n=== SINGLES MATCH FOR COMPARISON ===');
        console.log(`Match: ${singlesMatch.name}`);
        console.log(`  segmentType: ${singlesMatch.segmentType}`);
        console.log(`  Red Players:`, singlesMatch.redPlayers.map(p => ({
            name: p.name,
            scores: p.scores,
            strokes: p.strokes
        })));
        console.log(`  Blue Players:`, singlesMatch.bluePlayers.map(p => ({
            name: p.name,
            scores: p.scores,
            strokes: p.strokes
        })));
    }
}

debugScrambleStrokes().catch(console.error);
