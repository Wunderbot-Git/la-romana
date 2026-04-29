'use client';

import { useEffect, useRef } from 'react';
import type { FlightScore } from '@/hooks/useScores';

/**
 * ScoreGrid — live scorecard view ported from Bogotá Pitufos repo and adapted
 * for La Romana 2026:
 *   - 18 holes durchgehend Singles + Fourball (kein Scramble-Modus)
 *   - Front 9 / Back 9 toggle (nur View-Filter)
 *   - Per-Spieler stroke dots (PH 80%) + net score
 *   - Singles-Status pro Match (P1 vs P1, P2 vs P2)
 *   - Fourball-Status row
 *   - La-Romana-Theme (dark navy + gold/ice tokens)
 */
interface ScoreGridProps {
    flightScore: FlightScore;
    onHoleClick: (hole: number) => void;
    pendingScores?: Record<string, Record<number, number | null>>;
    scrollToHole?: number | null;
    half: 'front' | 'back';
}

const RED = '#F0C850';   // Piratas gold
const BLUE = '#5BA6DC';  // Fantasmas ice

function getStrokes(siValues: number[], ph: number, holeIdx: number): number {
    const holeSI = siValues[holeIdx];
    if (!holeSI || ph <= 0) return 0;
    if (ph < holeSI) return 0;
    return 1 + Math.floor((ph - holeSI) / 18);
}

interface ScoreCellProps {
    score: number | null;
    isPending: boolean;
    ph: number;
    siValues: number[];
    holeIdx: number;
    onClick: () => void;
    isFourballWinner?: boolean;
    isSinglesWinner?: boolean;
    team: 'red' | 'blue';
}

function ScoreCell({
    score,
    isPending,
    ph,
    siValues,
    holeIdx,
    onClick,
    isFourballWinner,
    isSinglesWinner,
    team,
}: ScoreCellProps) {
    const strokes = getStrokes(siValues, ph, holeIdx);
    const net = score !== null ? score - strokes : null;
    const teamColor = team === 'red' ? RED : BLUE;

    let circleClasses = '';
    let scoreTextColor = 'text-white/85';

    if (isPending) {
        scoreTextColor = 'text-[#fbbc05]';
    } else if (isSinglesWinner) {
        // Solid filled circle — singles match winner
        circleClasses = team === 'red'
            ? 'rounded-full bg-team-red border-2 border-team-red'
            : 'rounded-full bg-team-blue border-2 border-team-blue';
        scoreTextColor = 'text-[#0a1322] font-extrabold';
    } else if (isFourballWinner) {
        // Outlined circle — fourball best ball winner
        circleClasses = team === 'red'
            ? 'rounded-full bg-team-red/20 border-2 border-team-red'
            : 'rounded-full bg-team-blue/20 border-2 border-team-blue';
        scoreTextColor = team === 'red' ? 'text-team-red' : 'text-team-blue';
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="relative flex h-14 min-w-[50px] flex-col items-center justify-center transition-colors hover:bg-[#fbbc05]/10"
        >
            {/* Stroke dots — small colored ticks at top of cell */}
            {strokes > 0 && (
                <span
                    className="pointer-events-none absolute inset-x-1.5 top-[2px] flex flex-col gap-[2px]"
                    aria-hidden
                >
                    {Array.from({ length: Math.min(strokes, 2) }).map((_, i) => (
                        <span
                            key={i}
                            className="block h-[2px] w-full rounded-full"
                            style={{ background: teamColor, boxShadow: `0 0 3px ${teamColor}66` }}
                        />
                    ))}
                </span>
            )}

            <span
                className={`inline-flex h-8 w-8 items-center justify-center ${circleClasses} ${
                    isPending ? 'opacity-60' : ''
                }`}
            >
                {score !== null ? (
                    <span className={`font-bowlby text-[15px] leading-none ${scoreTextColor}`}>{score}</span>
                ) : (
                    <span className="text-white/25">·</span>
                )}
            </span>

            {/* Net score badge — bottom right when stroked */}
            {score !== null && strokes > 0 && (
                <span className="absolute bottom-[1px] right-[3px] font-bangers text-[10px] leading-none text-white/45">
                    {net}
                </span>
            )}
        </button>
    );
}

export function ScoreGrid({ flightScore, onHoleClick, pendingScores = {}, scrollToHole, half }: ScoreGridProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const allHoles = Array.from({ length: flightScore.parValues.length }, (_, i) => i + 1);
    const visibleHoles = half === 'back' ? allHoles.slice(9) : allHoles.slice(0, 9);

    useEffect(() => {
        if (scrollToHole && scrollRef.current) {
            const holeEl = document.getElementById(`hole-header-${scrollToHole}`);
            if (holeEl) {
                const container = scrollRef.current;
                const stickyWidth = 128;
                const containerWidth = container.clientWidth;
                const holeWidth = holeEl.offsetWidth;
                const holeLeft = holeEl.offsetLeft;
                const targetScrollLeft = holeLeft + holeWidth / 2 - stickyWidth - (containerWidth - stickyWidth) / 2;
                container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
            }
        }
    }, [scrollToHole]);

    const renderHoleHeader = (holeNumbers: number[]) => (
        <div className="sticky top-0 z-30 flex border-b border-[#31316b] bg-[#0f172b]">
            <div className="sticky left-0 z-30 w-32 flex-shrink-0 border-r border-[#31316b] bg-[#0f172b] px-3 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]">
                <span className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">Hoyo / Par</span>
            </div>
            <div className="flex flex-1 overflow-hidden">
                {holeNumbers.map(hole => (
                    <button
                        type="button"
                        key={hole}
                        id={`hole-header-${hole}`}
                        onClick={() => onHoleClick(hole)}
                        className="flex min-w-[50px] flex-col items-center justify-center border-r border-[#31316b]/60 py-1.5 transition-colors hover:bg-[#fbbc05]/10"
                    >
                        <span className="font-bangers text-[14px] text-[#fbbc05]">{hole}</span>
                        <span className="font-fredoka text-[9px] text-white/50">P{flightScore.parValues[hole - 1]}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderPlayerRow = (
        player: FlightScore['redPlayers'][number],
        team: 'red' | 'blue',
        holeNumbers: number[],
    ) => {
        // Course-aware Playing HCP straight from the API (mirrors what the match engine
        // and the leaderboard's MatchCard use). Falls back to `index × 0.8` only if the
        // backend response doesn't carry the field — protects older clients during deploy.
        const ph = typeof player.playingHcpSingles === 'number'
            ? player.playingHcpSingles
            : Math.round(player.hcp * 0.8);
        const teamTextColor = team === 'red' ? 'text-team-red' : 'text-team-blue';
        return (
            <div key={player.playerId} className="flex items-center border-b border-[#31316b]/50 last:border-0">
                <div className="sticky left-0 z-10 w-32 flex-shrink-0 border-r border-[#31316b] bg-[#0a1322] px-3 py-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                    <p className={`truncate font-bangers text-[14px] tracking-wider uppercase ${teamTextColor}`}>
                        {player.playerName.split(' ')[0]}
                    </p>
                    <p className="font-fredoka text-[10px] uppercase tracking-tighter text-white/45">
                        HCP {player.hcp}
                        <span className="text-white/30"> ({ph})</span>
                    </p>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    {holeNumbers.map(hole => {
                        const holeIdx = hole - 1;
                        const pendingVal = pendingScores[player.playerId]?.[hole];
                        const isPending = pendingVal !== undefined;
                        const score = isPending ? pendingVal ?? null : player.scores[holeIdx];
                        const isTeamWinnerOnHole = flightScore.holeWinners[holeIdx] === team;

                        // Fourball winner = my net is the team's lowest net for this hole
                        let isFourballWinner = false;
                        if (isTeamWinnerOnHole && score !== null) {
                            const teamPlayers = team === 'red' ? flightScore.redPlayers : flightScore.bluePlayers;
                            let minNet = Infinity;
                            teamPlayers.forEach(tp => {
                                const s = tp.scores[holeIdx];
                                if (s !== null) {
                                    const tpPh = typeof tp.playingHcpFourball === 'number'
                                        ? tp.playingHcpFourball
                                        : Math.round(tp.hcp * 0.8);
                                    const tpSi = tp.siValues || flightScore.parValues.map((_, i) => i + 1);
                                    const strokes = getStrokes(tpSi, tpPh, holeIdx);
                                    const net = s - strokes;
                                    if (net < minNet) minNet = net;
                                }
                            });
                            const mySi = player.siValues || flightScore.parValues.map((_, i) => i + 1);
                            const myStrokes = getStrokes(mySi, ph, holeIdx);
                            const myNet = score - myStrokes;
                            if (myNet === minNet) isFourballWinner = true;
                        }

                        // Singles winner — from per-player singlesHoles array
                        const isSinglesWinner = player.singlesHoles?.[holeIdx] === team;

                        return (
                            <ScoreCell
                                key={hole}
                                score={score}
                                isPending={isPending}
                                ph={ph}
                                siValues={player.siValues || flightScore.parValues.map((_, i) => i + 1)}
                                holeIdx={holeIdx}
                                onClick={() => onHoleClick(hole)}
                                isFourballWinner={isFourballWinner}
                                isSinglesWinner={isSinglesWinner}
                                team={team}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    /**
     * Singles match status row — running 1UP / A/S / 2UP based on hole-by-hole winner
     * for a specific (red[i] vs blue[i]) match index.
     */
    const renderSinglesRow = (matchIndex: number, holeNumbers: number[]) => {
        const red = flightScore.redPlayers[matchIndex];
        const blue = flightScore.bluePlayers[matchIndex];
        if (!red || !blue) return null;
        const singlesHoles = red.singlesHoles;
        if (!singlesHoles) return null;

        const holePlayed = (h: number) => red.scores[h - 1] !== null || blue.scores[h - 1] !== null;
        let running = 0;
        const states: { status: string; leader: 'red' | 'blue' | null; played: boolean }[] = [];
        for (const h of holeNumbers) {
            const w = singlesHoles[h - 1];
            if (w === 'red') running++;
            else if (w === 'blue') running--;
            const played = holePlayed(h);
            if (!played) {
                states.push({ status: '', leader: null, played: false });
            } else {
                const abs = Math.abs(running);
                states.push({
                    status: running === 0 ? 'A/S' : `${abs}UP`,
                    leader: running > 0 ? 'red' : running < 0 ? 'blue' : null,
                    played: true,
                });
            }
        }

        const redName = red.playerName.split(' ')[0];
        const blueName = blue.playerName.split(' ')[0];

        return (
            <div className="relative z-20 flex h-9 border-y border-[#31316b]/60 bg-[#162844] shadow-inner">
                <div className="sticky left-0 z-30 flex w-32 flex-shrink-0 items-center border-r border-[#31316b] bg-[#162844] px-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]">
                    <span className="font-bangers text-[10px] uppercase tracking-wider text-white/65 leading-tight">
                        {redName} vs {blueName}
                    </span>
                </div>
                <div className="flex flex-1 overflow-hidden">
                    {holeNumbers.map((h, i) => {
                        const st = states[i];
                        if (!st || !st.played) {
                            return (
                                <div key={h} className="flex min-w-[50px] items-center justify-center">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#31316b]/50" />
                                </div>
                            );
                        }
                        const isAS = !st.leader;
                        const isRed = st.leader === 'red';
                        return (
                            <div key={h} className="flex min-w-[50px] items-center justify-center">
                                <span
                                    className={`inline-flex h-7 w-9 items-center justify-center rounded-full font-bangers text-[10px] shadow-sm ${
                                        isAS
                                            ? 'bg-white/8 text-white/55'
                                            : isRed
                                            ? 'bg-team-red/20 text-team-red'
                                            : 'bg-team-blue/20 text-team-blue'
                                    }`}
                                >
                                    {st.status}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    /** Fourball/Best-Ball match status row — uses precomputed matchProgression + matchLeaders. */
    const renderFourballRow = (holeNumbers: number[]) => (
        <div className="relative z-20 flex h-10 border-y border-[#31316b]/60 bg-[#0a1322] shadow-inner">
            <div className="sticky left-0 z-30 flex w-32 flex-shrink-0 items-center border-r border-[#31316b] bg-[#0a1322] px-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]">
                <span className="font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]/85 leading-tight">
                    Mejor Bola
                </span>
            </div>
            <div className="flex flex-1 overflow-hidden">
                {holeNumbers.map(h => {
                    const status = flightScore.matchProgression[h - 1];
                    const leader = flightScore.matchLeaders?.[h - 1] ?? null;
                    if (!status) {
                        return (
                            <div key={h} className="flex min-w-[50px] items-center justify-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#31316b]/50" />
                            </div>
                        );
                    }
                    const isAS = !leader;
                    const isRed = leader === 'red';
                    return (
                        <div key={h} className="flex min-w-[50px] items-center justify-center">
                            <span
                                className={`inline-flex h-7 w-10 items-center justify-center rounded-full font-bangers text-[10px] shadow-sm ${
                                    isAS
                                        ? 'bg-white/8 text-white/55'
                                        : isRed
                                        ? 'bg-team-red/25 text-team-red'
                                        : 'bg-team-blue/25 text-team-blue'
                                }`}
                            >
                                {status.replace(' ', '')}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Match summary card (under the grid) — mirrors Bogotá design
    const buildSummary = (): { label: string; status: string; leader: 'red' | 'blue' | null }[] => {
        const out: { label: string; status: string; leader: 'red' | 'blue' | null }[] = [];

        for (let m = 0; m < 2; m++) {
            const red = flightScore.redPlayers[m];
            const blue = flightScore.bluePlayers[m];
            if (!red || !blue) continue;
            const redName = red.playerName.split(' ')[0];
            const blueName = blue.playerName.split(' ')[0];
            const sh = red.singlesHoles;
            let score = 0;
            let played = false;
            if (sh) {
                for (const h of visibleHoles) {
                    const w = sh[h - 1];
                    if (w === 'red') { score++; played = true; }
                    else if (w === 'blue') { score--; played = true; }
                }
            }
            const abs = Math.abs(score);
            const leader = score > 0 ? 'red' : score < 0 ? 'blue' : null;
            const winnerName = leader === 'red' ? redName : leader === 'blue' ? blueName : '';
            const status = !played ? 'Sin Iniciar' : score === 0 ? 'A/S' : `${winnerName} ${abs} UP`;
            out.push({ label: `${redName} vs ${blueName}`, status, leader });
        }

        // Fourball summary — last non-null in matchProgression for the visible half
        let lastStatus = '';
        let lastLeader: 'red' | 'blue' | null = null;
        for (const h of visibleHoles) {
            const s = flightScore.matchProgression[h - 1];
            const l = flightScore.matchLeaders?.[h - 1] ?? null;
            if (s) { lastStatus = s; lastLeader = l; }
        }
        const teamName = lastLeader === 'red' ? 'Piratas' : lastLeader === 'blue' ? 'Fantasmas' : '';
        const fbStatus = !lastStatus ? 'Sin Iniciar' : !lastLeader ? 'A/S' : `${teamName} ${lastStatus}`;
        out.push({ label: 'Mejor Bola', status: fbStatus, leader: lastLeader });

        return out;
    };

    const summaries = buildSummary();

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3">
            <div className="overflow-hidden rounded-[16px] border-[2px] border-[#31316b] bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <div className="overflow-x-auto" ref={scrollRef}>
                    <div className="min-w-max">
                        {renderHoleHeader(visibleHoles)}

                        {/* Match 1 */}
                        {flightScore.redPlayers[0] && renderPlayerRow(flightScore.redPlayers[0], 'red', visibleHoles)}
                        {flightScore.bluePlayers[0] && renderPlayerRow(flightScore.bluePlayers[0], 'blue', visibleHoles)}
                        {renderSinglesRow(0, visibleHoles)}

                        {/* Match 2 */}
                        {flightScore.redPlayers[1] && renderPlayerRow(flightScore.redPlayers[1], 'red', visibleHoles)}
                        {flightScore.bluePlayers[1] && renderPlayerRow(flightScore.bluePlayers[1], 'blue', visibleHoles)}
                        {renderSinglesRow(1, visibleHoles)}

                        {/* Fourball */}
                        {renderFourballRow(visibleHoles)}
                    </div>
                </div>
            </div>

            <div className="rounded-[16px] border-[2px] border-[#31316b] bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col gap-2">
                    {summaries.map((m, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <span className="font-bangers text-[11px] uppercase tracking-wider text-white/65">{m.label}</span>
                            <span
                                className={`inline-flex items-center rounded-lg px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wide ${
                                    !m.leader
                                        ? 'bg-white/8 text-white/55'
                                        : m.leader === 'red'
                                        ? 'bg-team-red/20 text-team-red'
                                        : 'bg-team-blue/20 text-team-blue'
                                }`}
                            >
                                {m.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
