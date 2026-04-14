'use client';

import { useRef, useState, useEffect } from 'react';
import { FlightScore } from '@/hooks/useScores';

interface ScoreGridProps {
    flightScore: FlightScore;
    onHoleClick: (hole: number) => void;
    pendingScores: Record<string, Record<number, number>>;
    scrollToHole?: number | null;
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
    isPending,
    hcp,
    siValues,
    holeIdx,
    onClick,
    isWinner,
    isSinglesWinner,
    team,
    isPlayingHcp,
}: {
    score: number | null;
    isPending: boolean;
    hcp: number;
    siValues: number[];
    holeIdx: number;
    onClick: () => void;
    isWinner?: boolean;
    isSinglesWinner?: boolean;
    team: 'red' | 'blue';
    isPlayingHcp?: boolean;
}) {
    // For scramble, hcp is already the playing HCP (30% of sum); skip 80% reduction
    const playingHcp = isPlayingHcp ? hcp : Math.round(hcp * 0.8);
    const strokes = getStrokes(siValues, playingHcp, holeIdx);
    const net = score !== null ? score - strokes : null;

    const teamColor = team === 'red' ? '#E75480' : '#4A90D9';

    // Filled circle for winners: solid team color bg + white text
    let winnerClasses = '';
    let scoreTextColor = 'text-forest-deep';
    let mejorBolaRing = '';

    if (isPending) {
        scoreTextColor = 'text-gold-border';
    } else if (isSinglesWinner || isWinner) {
        winnerClasses = team === 'red' ? 'rounded-full bg-team-red' : 'rounded-full bg-team-blue';
        scoreTextColor = 'text-white';
    }

    // Gold bullseye ring when this score wins the mejor bola point
    if (isWinner && !isPending) {
        mejorBolaRing = 'ring-2 ring-offset-1 ring-[#fbbc05]';
    }

    return (
        <div
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center min-w-[50px] h-14 cursor-pointer transition-all hover:bg-gold-light/10 relative overflow-hidden
                ${isPending ? 'bg-gold-light/10' : ''}
            `}
        >
            {strokes > 0 && (
                <div className="absolute top-0 left-2 right-2 flex flex-col gap-[1px]">
                    {Array.from({ length: strokes }).map((_, i) => (
                        <div key={i} className="h-[2px] rounded-full" style={{ backgroundColor: teamColor, opacity: 0.7 }} />
                    ))}
                </div>
            )}

            <div className={`
                inline-flex flex-col items-center justify-center w-8 h-8 ${winnerClasses} ${mejorBolaRing}
                ${isPending ? 'opacity-50' : ''}
            `}>
                {score !== null ? (
                    <span className={`text-lg font-fredoka font-bold ${scoreTextColor}`}>
                        {score}
                    </span>
                ) : (
                    <span className="text-gold-border/30">-</span>
                )}
            </div>

            {score !== null && strokes > 0 && (
                <span className="text-[10px] font-fredoka font-bold text-forest-deep/40 absolute -bottom-0.5 right-[3px]">
                    {net}
                </span>
            )}
        </div>
    );
}

export function ScoreGrid({ flightScore, onHoleClick, pendingScores, scrollToHole }: ScoreGridProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const holes = Array.from({ length: flightScore.parValues.length }, (_, i) => i + 1);

    const isScramble = flightScore.segmentType === 'scramble';
    const visibleHoles = isScramble ? holes.slice(9) : holes.slice(0, 9);

    useEffect(() => {
        if (scrollToHole && scrollRef.current) {
            const holeEl = document.getElementById(`hole-header-${scrollToHole}`);
            if (holeEl) {
                const container = scrollRef.current;
                const stickyWidth = 128;
                const containerWidth = container.clientWidth;
                const holeWidth = holeEl.offsetWidth;
                const holeLeft = holeEl.offsetLeft;

                const targetScrollLeft = holeLeft + (holeWidth / 2) - stickyWidth - ((containerWidth - stickyWidth) / 2);

                container.scrollTo({
                    left: targetScrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    }, [scrollToHole]);

    const renderPlayerRow = (player: any, holeNumbers: number[]) => {
        return (
            <div key={player.playerId} className="flex border-b border-gold-border/10 last:border-0 items-stretch">
                <div className="flex-shrink-0 w-32 px-3 py-2 sticky left-0 z-20 bg-cream border-r border-gold-border/20 flex flex-col justify-center">
                    <p className={`text-sm font-fredoka font-bold truncate ${player.team === 'red' ? 'text-team-red' : 'text-team-blue'}`}>
                        {player.playerName.replace(/ -$/, '')}
                    </p>
                    <p className="text-[10px] font-fredoka font-bold text-forest-deep/40 uppercase tracking-tighter">
                        HCP {player.hcp}
                        {!player.playerName.includes('/') && <span className="text-forest-deep/25"> ({Math.round(player.hcp * 0.8)})</span>}
                    </p>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    {holeNumbers.map((hole) => {
                        const holeIdx = hole - 1;
                        const score = (pendingScores[player.playerId]?.[hole]) ?? player.scores[holeIdx];
                        const isPending = pendingScores[player.playerId]?.[hole] !== undefined;

                        const isTeamWinner = flightScore.holeWinners[holeIdx] === player.team;
                        let isWinner = false;

                        if (isTeamWinner) {
                            if (isScramble) {
                                isWinner = true;
                            } else {
                                const teamPlayers = player.team === 'red' ? flightScore.redPlayers : flightScore.bluePlayers;
                                let minNet = 999;

                                teamPlayers.forEach((p: any) => {
                                    const s = p.scores[holeIdx];
                                    if (s !== null) {
                                        const pSi = p.siValues || flightScore.siValues;
                                        const playingHcp = Math.round(p.hcp * 0.8);
                                        const strokes = getStrokes(pSi, playingHcp, holeIdx);
                                        const net = s - strokes;
                                        if (net < minNet) minNet = net;
                                    }
                                });

                                const backendScore = player.scores[holeIdx];
                                if (backendScore !== null) {
                                    const playerSi = player.siValues || flightScore.siValues;
                                    const myPlayingHcp = Math.round(player.hcp * 0.8);
                                    const myStrokes = getStrokes(playerSi, myPlayingHcp, holeIdx);
                                    const myNet = backendScore - myStrokes;
                                    if (myNet === minNet) isWinner = true;
                                }
                            }
                        }

                        let isSinglesWinner = false;
                        if (!isScramble && player.singlesHoles?.[holeIdx] === player.team) {
                            isSinglesWinner = true;
                        }

                        return (
                            <ScoreCell
                                key={hole}
                                score={score}
                                isPending={isPending}
                                hcp={player.hcp}
                                siValues={player.siValues || flightScore.siValues}
                                holeIdx={holeIdx}
                                onClick={() => onHoleClick(hole)}
                                isWinner={isWinner}
                                isSinglesWinner={isSinglesWinner}
                                team={player.team}
                                isPlayingHcp={player.isPlayingHcp}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderHoleHeaders = (holeNumbers: number[]) => (
        <div className="flex bg-forest-deep/10 border-y border-gold-border/20 sticky top-0 z-30">
            <div className="flex-shrink-0 w-32 px-3 py-2 bg-cream sticky left-0 z-30 border-r border-gold-border/20">
                <span className="text-[10px] font-bangers text-forest-deep/60 uppercase tracking-widest">Hoyo / Par</span>
            </div>
            <div className="flex-1 flex overflow-hidden">
                {holeNumbers.map((hole) => (
                    <div
                        key={hole}
                        id={`hole-header-${hole}`}
                        onClick={() => onHoleClick(hole)}
                        className="min-w-[50px] flex flex-col items-center justify-center py-1.5 border-r border-gold-border/10 cursor-pointer hover:bg-gold-light/10 transition-colors"
                    >
                        <span className="text-xs font-bangers text-forest-deep">{hole}</span>
                        <span className="text-[9px] font-fredoka font-bold text-forest-deep/40">P{flightScore.parValues[hole - 1]}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderMatchStatusRow = (holeNumbers: number[]) => (
        <div className="flex bg-[#e8e4db] h-10 border-y border-gold-border/20 shadow-inner relative z-20">
            <div className="flex-shrink-0 w-32 px-2 sticky left-0 z-30 bg-[#e8e4db] border-r border-gold-border/20 flex items-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                <span className="text-[10px] font-bangers text-forest-deep/70 uppercase tracking-wider leading-tight">
                    {flightScore.segmentType === 'scramble' ? 'Scramble' : flightScore.segmentType.startsWith('singles') ? 'Partido' : 'Mejor Bola'}
                </span>
            </div>
            <div className="flex-1 flex overflow-hidden">
                {holeNumbers.map((hole) => {
                    const status = flightScore.matchProgression[hole - 1];
                    if (!status) return <div key={hole} className="min-w-[50px] flex items-center justify-center"><div className="w-1.5 h-1.5 bg-gold-border/20 rounded-full" /></div>;

                    const leader = flightScore.matchLeaders?.[hole - 1];
                    const isRed = leader === 'red';
                    const isBlue = leader === 'blue';
                    const isAS = !leader;

                    return (
                        <div key={hole} className="min-w-[50px] flex items-center justify-center">
                            <div className={`
                                flex items-center justify-center w-8 h-7 rounded-full text-[10px] font-bangers shadow-sm
                                ${isAS ? 'bg-forest-mid/20 text-forest-deep/60' : isRed ? 'bg-team-red/15 text-team-red' : 'bg-team-blue/15 text-team-blue'}
                            `}>
                                {status.replace(' ', '')}
                            </div>
                        </div>
                    );
                })}

            </div>
        </div>
    );

    const renderSinglesStatusRow = (matchIndex: number, holeNumbers: number[]) => {
        const redPlayer = flightScore.redPlayers[matchIndex];
        const bluePlayer = flightScore.bluePlayers[matchIndex];
        if (!redPlayer || !bluePlayer) return null;

        const singlesHoles = redPlayer.singlesHoles;
        if (!singlesHoles) return null;

        // Check which holes have been played (both players have a score)
        const holePlayed = (hole: number): boolean => {
            const idx = hole - 1;
            return redPlayer.scores[idx] !== null || bluePlayer.scores[idx] !== null;
        };

        // Compute running match state from hole winners — only for played holes
        let runningScore = 0; // positive = red leading, negative = blue leading
        const states: { status: string; leader: 'red' | 'blue' | null; played: boolean }[] = [];

        for (const hole of holeNumbers) {
            const played = holePlayed(hole);
            const winner = singlesHoles[hole - 1];
            if (winner === 'red') runningScore++;
            else if (winner === 'blue') runningScore--;

            if (!played) {
                states.push({ status: '', leader: null, played: false });
            } else {
                const absScore = Math.abs(runningScore);
                const status = runningScore === 0 ? 'A/S' : `${absScore}UP`;
                const leader = runningScore > 0 ? 'red' as const : runningScore < 0 ? 'blue' as const : null;
                states.push({ status, leader, played: true });
            }
        }

        const redName = redPlayer.playerName.replace(/ -$/, '').split(' ')[0];
        const blueName = bluePlayer.playerName.replace(/ -$/, '').split(' ')[0];

        return (
            <div className="flex bg-[#e8e4db] h-9 border-y border-gold-border/20 shadow-inner relative z-20">
                <div className="flex-shrink-0 w-32 px-2 sticky left-0 z-30 bg-[#e8e4db] border-r border-gold-border/20 flex items-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <span className="text-[10px] font-bangers text-forest-deep/70 uppercase tracking-wider leading-tight">
                        {redName} vs {blueName}
                    </span>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    {holeNumbers.map((hole, i) => {
                        const state = states[i];
                        if (!state || !state.played) {
                            return <div key={hole} className="min-w-[50px] flex items-center justify-center"><div className="w-1.5 h-1.5 bg-gold-border/20 rounded-full" /></div>;
                        }

                        const isRed = state.leader === 'red';
                        const isBlue = state.leader === 'blue';
                        const isAS = !state.leader;

                        return (
                            <div key={hole} className="min-w-[50px] flex items-center justify-center">
                                <div className={`
                                    flex items-center justify-center w-8 h-7 rounded-full text-[10px] font-bangers shadow-sm
                                    ${isAS ? 'bg-forest-mid/20 text-forest-deep/60' : isRed ? 'bg-team-red/15 text-team-red' : 'bg-team-blue/15 text-team-blue'}
                                `}>
                                    {state.status.replace(' ', '')}
                                </div>
                            </div>
                        );
                    })}
    
                </div>
            </div>
        );
    };

    const renderScrambleRow = (team: 'red' | 'blue', players: any[], holeNumbers: number[]) => {
        if (!players.length) return null;
        const combinedName = players.map(p => p.playerName.split(' ')[0]).join(' / ');
        // Scramble team HCP = 30% of sum of both HCPs
        const scrambleHcp = Math.round(players.reduce((a: any, b: any) => a + b.hcp, 0) * 0.3);

        return renderPlayerRow({
            playerId: `${team}_team`,
            playerName: combinedName,
            hcp: scrambleHcp,
            isPlayingHcp: true,
            siValues: flightScore.scrambleSiValues || flightScore.siValues,
            team: team,
            scores: players[0].scores
        }, holeNumbers);
    };

    // Compute current match statuses for the summary
    const getMatchSummary = () => {
        const summaries: { label: string; status: string; leader: 'red' | 'blue' | null }[] = [];

        if (!isScramble) {
            // Singles matches
            for (let m = 0; m < 2; m++) {
                const red = flightScore.redPlayers[m];
                const blue = flightScore.bluePlayers[m];
                if (!red || !blue) continue;

                const redName = red.playerName.replace(/ -$/, '').split(' ')[0];
                const blueName = blue.playerName.replace(/ -$/, '').split(' ')[0];
                const singlesHoles = red.singlesHoles;

                let score = 0;
                let played = false;
                if (singlesHoles) {
                    for (const hole of visibleHoles) {
                        const w = singlesHoles[hole - 1];
                        if (w === 'red') { score++; played = true; }
                        else if (w === 'blue') { score--; played = true; }
                    }
                }

                const abs = Math.abs(score);
                const status = !played ? 'N/S' : score === 0 ? 'A/S' : `${abs} UP`;
                const leader = score > 0 ? 'red' as const : score < 0 ? 'blue' as const : null;
                const winnerName = leader === 'red' ? redName : leader === 'blue' ? blueName : '';

                summaries.push({
                    label: `${redName} vs ${blueName}`,
                    status: !played ? 'Not Started' : score === 0 ? 'All Square' : `${winnerName} ${abs} UP`,
                    leader,
                });
            }

            // Mejor Bola
            let lastStatus = '';
            let lastLeader: 'red' | 'blue' | null = null;
            for (const hole of visibleHoles) {
                const s = flightScore.matchProgression[hole - 1];
                const l = flightScore.matchLeaders?.[hole - 1];
                if (s) { lastStatus = s; lastLeader = l ?? null; }
            }
            const teamName = lastLeader === 'red' ? 'Cariñositos' : lastLeader === 'blue' ? 'Pitufos' : '';
            const mejorBolaStatus = !lastStatus ? 'Not Started' : !lastLeader ? 'All Square' : `${teamName} ${lastStatus}`;
            summaries.push({
                label: 'Mejor Bola',
                status: mejorBolaStatus,
                leader: lastLeader,
            });
        }

        return summaries;
    };

    const matchSummaries = getMatchSummary();

    return (
        <div className="flex flex-col gap-2 mx-3 flex-1 min-h-0 overflow-y-auto">
            <div className="cartoon-card overflow-hidden">
                <div className="overflow-x-auto" ref={scrollRef} style={{ isolation: 'isolate' }}>
                    <div className="min-w-max">
                        {renderHoleHeaders(visibleHoles)}

                        {isScramble ? (
                            <>
                                {renderScrambleRow('red', flightScore.redPlayers, visibleHoles)}
                                {renderMatchStatusRow(visibleHoles)}
                                {renderScrambleRow('blue', flightScore.bluePlayers, visibleHoles)}
                            </>
                        ) : (
                            <>
                                {/* Match 1: Red[0] vs Blue[0] */}
                                {flightScore.redPlayers[0] && renderPlayerRow({ ...flightScore.redPlayers[0], team: 'red' }, visibleHoles)}
                                {flightScore.bluePlayers[0] && renderPlayerRow({ ...flightScore.bluePlayers[0], team: 'blue' }, visibleHoles)}
                                {renderSinglesStatusRow(0, visibleHoles)}

                                {/* Match 2: Red[1] vs Blue[1] */}
                                {flightScore.redPlayers[1] && renderPlayerRow({ ...flightScore.redPlayers[1], team: 'red' }, visibleHoles)}
                                {flightScore.bluePlayers[1] && renderPlayerRow({ ...flightScore.bluePlayers[1], team: 'blue' }, visibleHoles)}
                                {renderSinglesStatusRow(1, visibleHoles)}

                                {/* Fourball (Best Ball) overall result */}
                                {renderMatchStatusRow(visibleHoles)}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Match Summary below scorecard */}
            {matchSummaries.length > 0 && (
                <div className="cartoon-card px-4 py-3 flex flex-col gap-2">
                    {matchSummaries.map((m, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="text-xs font-bangers text-forest-deep/70 uppercase tracking-wider">{m.label}</span>
                            <span className={`
                                px-2.5 py-1 rounded-lg text-xs font-bangers uppercase tracking-wide
                                ${!m.leader ? 'bg-forest-mid/15 text-forest-deep/60' : m.leader === 'red' ? 'bg-team-red/15 text-team-red' : 'bg-team-blue/15 text-team-blue'}
                            `}>
                                {m.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
