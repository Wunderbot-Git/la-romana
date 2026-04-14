'use client';

import { Match, PlayerScore } from '@/hooks/useLeaderboard';
import { useAuth } from '@/lib/auth';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface DetailedScorecardProps {
    match: Match;
    onClose?: () => void;
}

function getStrokes(siValues: number[], hcp: number, holeIdx: number): number {
    const holeSI = siValues[holeIdx];
    if (!holeSI) return 0;
    const baseStrokes = Math.floor(hcp / 18);
    const remainder = hcp % 18;
    const extraStroke = remainder >= holeSI ? 1 : 0;
    return baseStrokes + extraStroke;
}

function ScoreCell({
    score,
    team,
    isWinner,
    strokes,
}: {
    score: number | null;
    team: 'red' | 'blue';
    isWinner?: boolean;
    strokes?: number;
}) {
    const teamColor = team === 'red' ? '#E75480' : '#4A90D9';
    const strokeCount = strokes ?? 0;

    const strokeLines = strokeCount > 0 && (
        <div className="absolute top-0 left-1 right-1 flex flex-col gap-[1px] z-10">
            {Array.from({ length: strokeCount }).map((_, i) => (
                <div key={i} className="h-[2px] rounded-full" style={{ backgroundColor: teamColor, opacity: 0.7 }} />
            ))}
        </div>
    );

    if (score === null) {
        return (
            <td className="p-0 text-center relative">
                <span className="text-gray-300 text-sm font-fredoka">-</span>
                {strokeLines}
            </td>
        );
    }

    return (
        <td className="p-0 text-center relative">
            {strokeLines}
            <div className="inline-flex items-center justify-center w-7 h-8 relative">
                {isWinner && (
                    <div
                        className="absolute w-6 h-6 rounded-md"
                        style={{
                            backgroundColor: team === 'red' ? 'rgba(231,84,128,0.2)' : 'rgba(74,144,217,0.2)',
                            border: `2px solid ${teamColor}`,
                        }}
                    />
                )}
                <span
                    className="relative z-10 text-sm leading-none font-fredoka"
                    style={{
                        color: isWinner ? teamColor : '#64748b',
                        fontWeight: isWinner ? 700 : 400,
                    }}
                >
                    {score}
                </span>
            </div>
        </td>
    );
}

export function DetailedScorecard({ match, onClose }: DetailedScorecardProps) {
    const { user } = useAuth();
    const params = useParams();
    const eventId = params.eventId as string;

    const frontNine = match.parValues.slice(0, 9);
    const backNine = match.parValues.slice(9, 18);
    const holeNumbers = Array.from({ length: 18 }, (_, i) => i + 1);

    const showFront = match.segmentType !== 'scramble';
    const showBack = match.segmentType === 'scramble';

    const renderHalfTable = (start: number, end: number, label: string) => {
        const holes = holeNumbers.slice(start, end);
        const pars = match.parValues.slice(start, end);
        const hcps = (match.segmentType === 'scramble' && match.scrambleSiValues
            ? match.scrambleSiValues
            : match.hcpValues
        ).slice(start, end);
        const progression = match.matchProgression.slice(start, end);
        const holeWinnersChunk = match.holeWinners ? match.holeWinners.slice(start, end) : [];
        const isOut = label.includes('FRONT');

        // Track row index for alternating backgrounds
        let rowIdx = 0;

        return (
            <div className="mb-0">
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ backgroundColor: '#1a1a3e' }}>
                                <th className="p-1.5 text-left font-bangers w-16 pl-2 text-xs text-white font-bold rounded-tl-lg">Hoyo</th>
                                {holes.map(h => (
                                    <th key={h} className="p-1 text-center font-bangers text-xs w-[8%] min-w-[20px] text-white font-bold">{h}</th>
                                ))}
                                <th className="rounded-tr-lg" />
                            </tr>
                        </thead>
                        <tbody>
                            {/* Par row */}
                            <tr className={`border-b border-gray-100 ${rowIdx++ % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}`}>
                                <td className="p-1.5 font-fredoka text-gray-500 pl-2 text-[10px] uppercase tracking-wider font-medium">Par</td>
                                {pars.map((p, i) => (
                                    <td key={i} className="p-0.5 text-center text-gray-500 font-fredoka font-medium text-[10px]">{p}</td>
                                ))}
                                <td />
                            </tr>

                            {/* HCP row */}
                            <tr className={`border-b border-gray-100 ${rowIdx++ % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}`}>
                                <td className="p-1.5 font-fredoka font-normal text-gray-400 pl-2 text-[10px] uppercase tracking-wider italic">Hcp</td>
                                {hcps.map((h, i) => (
                                    <td key={i} className="p-0.5 text-center text-gray-400 text-[10px] italic font-fredoka">{h}</td>
                                ))}
                                <td />
                            </tr>

                            {/* Player Rows */}
                            {match.segmentType === 'scramble' ? (
                                <>
                                    {(() => {
                                        const scrambleHcp = Math.round(match.redPlayers.reduce((a, b) => a + b.hcp, 0) * 0.3);
                                        return (
                                            <tr className={`border-b border-gray-100 ${rowIdx++ % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}`}>
                                                <td className="p-1.5 font-fredoka font-bold truncate max-w-[80px] sm:max-w-[100px] pl-2 text-xs" style={{ color: '#E75480' }}>
                                                    {match.redPlayers.map(p => p.playerName.split(' ')[0]).join(' / ')}
                                                </td>
                                                {match.redPlayers[0]?.scores.slice(start, end).map((score, i) => (
                                                    <ScoreCell key={i} score={score} team="red" isWinner={holeWinnersChunk[i] === 'red'} strokes={getStrokes(hcps, scrambleHcp, i)} />
                                                ))}
                                                <td />
                                            </tr>
                                        );
                                    })()}

                                    {(() => {
                                        const scrambleHcp = Math.round(match.bluePlayers.reduce((a, b) => a + b.hcp, 0) * 0.3);
                                        return (
                                            <tr className={`border-b border-gray-100 ${rowIdx++ % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}`}>
                                                <td className="p-1.5 font-fredoka font-bold truncate max-w-[80px] sm:max-w-[100px] pl-2 text-xs" style={{ color: '#4A90D9' }}>
                                                    {match.bluePlayers.map(p => p.playerName.split(' ')[0]).join(' / ')}
                                                </td>
                                                {match.bluePlayers[0]?.scores.slice(start, end).map((score, i) => (
                                                    <ScoreCell key={i} score={score} team="blue" isWinner={holeWinnersChunk[i] === 'blue'} strokes={getStrokes(hcps, scrambleHcp, i)} />
                                                ))}
                                                <td />
                                            </tr>
                                        );
                                    })()}
                                </>
                            ) : (
                                <>
                                    {match.redPlayers.map((player, pIdx) => {
                                        const playingHcp = Math.round(player.hcp * 0.8);
                                        return (
                                            <tr key={`red-${pIdx}`} className={`border-b border-gray-100 ${(rowIdx + pIdx) % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}`}>
                                                <td className="p-1.5 font-fredoka font-bold truncate max-w-[80px] sm:max-w-[100px] pl-2 text-xs" style={{ color: '#E75480' }}>
                                                    {player.playerName.split(' ')[0]}
                                                </td>
                                                {player.scores.slice(start, end).map((score, i) => {
                                                    const strokes = getStrokes(hcps, playingHcp, i);
                                                    // In fourball, only highlight the best ball (lowest net) on the winning team
                                                    let isBestBall = holeWinnersChunk[i] === 'red';
                                                    if (isBestBall && match.redPlayers.length > 1 && score !== null) {
                                                        const myNet = score - strokes;
                                                        const partnerScore = match.redPlayers[1 - pIdx]?.scores[start + i];
                                                        const partnerHcp = Math.round(match.redPlayers[1 - pIdx]?.hcp * 0.8);
                                                        const partnerStrokes = getStrokes(hcps, partnerHcp, i);
                                                        const partnerNet = partnerScore !== null ? partnerScore - partnerStrokes : 999;
                                                        isBestBall = myNet <= partnerNet;
                                                    }
                                                    return <ScoreCell key={i} score={score} team="red" isWinner={isBestBall} strokes={strokes} />;
                                                })}
                                                <td />
                                            </tr>
                                        );
                                    })}
                                    {(() => { rowIdx += match.redPlayers.length; return null; })()}

                                    {match.bluePlayers.map((player, pIdx) => {
                                        const playingHcp = Math.round(player.hcp * 0.8);
                                        return (
                                            <tr key={`blue-${pIdx}`} className={`border-b border-gray-100 ${(rowIdx + pIdx) % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}`}>
                                                <td className="p-1.5 font-fredoka font-bold truncate max-w-[80px] sm:max-w-[100px] pl-2 text-xs" style={{ color: '#4A90D9' }}>
                                                    {player.playerName.split(' ')[0]}
                                                </td>
                                                {player.scores.slice(start, end).map((score, i) => {
                                                    const strokes = getStrokes(hcps, playingHcp, i);
                                                    let isBestBall = holeWinnersChunk[i] === 'blue';
                                                    if (isBestBall && match.bluePlayers.length > 1 && score !== null) {
                                                        const myNet = score - strokes;
                                                        const partnerScore = match.bluePlayers[1 - pIdx]?.scores[start + i];
                                                        const partnerHcp = Math.round(match.bluePlayers[1 - pIdx]?.hcp * 0.8);
                                                        const partnerStrokes = getStrokes(hcps, partnerHcp, i);
                                                        const partnerNet = partnerScore !== null ? partnerScore - partnerStrokes : 999;
                                                        isBestBall = myNet <= partnerNet;
                                                    }
                                                    return <ScoreCell key={i} score={score} team="blue" isWinner={isBestBall} strokes={strokes} />;
                                                })}
                                                <td />
                                            </tr>
                                        );
                                    })}
                                </>
                            )}

                            {/* Match progression row */}
                            <tr style={{ backgroundColor: '#1a1a3e' }}>
                                <td className="p-1.5 font-bangers pl-2 text-[10px] text-white/60 rounded-bl-lg">Partido</td>
                                {progression.map((status, i) => {
                                    const globalHoles = match.holeWinners.slice(0, start + i + 1);
                                    let scoreDiff = 0;
                                    globalHoles.forEach(winner => {
                                        if (winner === 'red') scoreDiff++;
                                        else if (winner === 'blue') scoreDiff--;
                                    });

                                    const hasBeenPlayed = (start + i) < match.holeWinners.length;
                                    if (!hasBeenPlayed) {
                                        return <td key={i} className="p-0.5 text-center" />;
                                    }

                                    let label = 'A/S';
                                    let color = 'rgba(255,255,255,0.5)';
                                    if (scoreDiff > 0) {
                                        label = `${scoreDiff} UP`;
                                        color = '#FF7BA6';
                                    } else if (scoreDiff < 0) {
                                        label = `${Math.abs(scoreDiff)} UP`;
                                        color = '#6BB5FF';
                                    }

                                    return (
                                        <td key={i} className="p-0.5 text-center">
                                            <span className="font-bangers text-[9px] tracking-tight" style={{ color }}>
                                                {label}
                                            </span>
                                        </td>
                                    );
                                })}
                                <td className="rounded-br-lg" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div>
            {showFront && renderHalfTable(0, 9, 'FRONT 9')}
            {showBack && match.parValues.length > 9 && renderHalfTable(9, 18, 'BACK 9')}

            {user?.appRole === 'admin' && (
                <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-400 font-fredoka">Controles Admin</span>
                    <Link
                        href={`/events/${eventId}/scores?flightId=${match.id}`}
                        className="text-xs font-bangers bevel-button px-4 py-2 rounded-lg hover:brightness-110 transition-colors shadow-sm"
                    >
                        Editar Scores
                    </Link>
                </div>
            )}
        </div>
    );
}
