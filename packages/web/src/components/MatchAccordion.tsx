'use client';

import { useState } from 'react';
import { MatchHistory } from '@/hooks/useFlightHistory';

interface MatchAccordionProps {
    match: MatchHistory;
}

function MatchStatusBadge({ status, winner }: { status: string; winner: 'red' | 'blue' | 'halved' | null }) {
    let bgColor = 'bg-forest-mid';
    if (winner === 'red') bgColor = 'bg-team-red';
    else if (winner === 'blue') bgColor = 'bg-team-blue';
    else if (winner === 'halved') bgColor = 'bg-forest-deep';

    return (
        <span className={`${bgColor} text-white text-xs font-bangers px-2 py-1 rounded-lg`}>
            {status}
        </span>
    );
}

function PointsBadge({ points }: { points: { red: number; blue: number } }) {
    return (
        <div className="flex gap-1 text-xs font-bangers">
            <span className="text-team-red">{points.red}</span>
            <span className="text-gold-border/40">:</span>
            <span className="text-team-blue">{points.blue}</span>
        </div>
    );
}

function HoleByHoleTable({ match }: { match: MatchHistory }) {
    const frontNine = match.holes.slice(0, 9);
    const backNine = match.holes.slice(9, 18);

    const renderHalfTable = (holes: typeof match.holes, label: string) => (
        <div className="mb-3">
            <h5 className="text-xs font-bangers text-gold-light mb-1">{label}</h5>
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-forest-deep/30">
                            <th className="px-2 py-1 text-left font-bangers text-gold-light/70">Hoyo</th>
                            {holes.map(h => (
                                <th key={h.holeNumber} className="px-2 py-1 text-center font-bangers text-gold-light/70">{h.holeNumber}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-gold-border/10">
                            <td className="px-2 py-1 text-team-red font-fredoka font-bold">Rojo</td>
                            {holes.map(h => {
                                const score = h.redNet !== null ? h.redNet : '-';
                                const isWinner = h.holeWinner === 'red';
                                return (
                                    <td key={h.holeNumber} className={`px-2 py-1 text-center font-fredoka ${isWinner ? 'bg-team-red/15 font-bold text-team-red' : 'text-cream/70'}`}>
                                        {score}
                                    </td>
                                );
                            })}
                        </tr>

                        <tr className="border-b border-gold-border/10">
                            <td className="px-2 py-1 text-team-blue font-fredoka font-bold">Azul</td>
                            {holes.map(h => {
                                const score = h.blueNet !== null ? h.blueNet : '-';
                                const isWinner = h.holeWinner === 'blue';
                                return (
                                    <td key={h.holeNumber} className={`px-2 py-1 text-center font-fredoka ${isWinner ? 'bg-team-blue/15 font-bold text-team-blue' : 'text-cream/70'}`}>
                                        {score}
                                    </td>
                                );
                            })}
                        </tr>

                        <tr className="bg-forest-mid/20">
                            <td className="px-2 py-1 font-bangers text-gold-light/60">Match</td>
                            {holes.map(h => {
                                const isEarlyFinish = match.earlyFinish === h.holeNumber;
                                return (
                                    <td
                                        key={h.holeNumber}
                                        className={`px-2 py-1 text-center text-xs font-fredoka ${isEarlyFinish ? 'bg-gold-border/20 font-bold text-gold-light' : 'text-cream/50'}`}
                                    >
                                        {h.matchStatusAfter}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="p-3 bg-forest-mid/30 rounded-b-xl">
            {frontNine.length > 0 && renderHalfTable(frontNine, 'FRONT 9')}
            {backNine.length > 0 && renderHalfTable(backNine, 'BACK 9')}

            {match.earlyFinish && (
                <div className="text-center text-xs text-gold-light/50 mt-2 font-fredoka">
                    Partida decidida en el hoyo {match.earlyFinish}
                </div>
            )}
        </div>
    );
}

export function MatchAccordion({ match }: MatchAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const matchTypeLabel = {
        singles: 'Individual',
        fourball: 'Mejor Bola',
        scramble: 'Scramble',
    }[match.matchType];

    return (
        <div className="bg-forest-deep gold-border rounded-xl overflow-hidden mb-3">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-forest-mid/20 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className={`text-gold-border transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    <span className="font-bangers text-cream">{matchTypeLabel}</span>
                </div>

                <div className="flex items-center gap-4">
                    <PointsBadge points={match.points} />
                    <MatchStatusBadge status={match.matchStatus} winner={match.winner} />
                </div>
            </button>

            {isExpanded && <HoleByHoleTable match={match} />}
        </div>
    );
}
