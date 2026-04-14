'use client';

import { useState, useCallback } from 'react';
import { Match } from '@/hooks/useLeaderboard';
import { api } from '@/lib/api';
import { Toast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/currency';

const SEGMENT_LABELS: Record<string, string> = {
    singles1: 'Individual 1',
    singles2: 'Individual 2',
    fourball: 'Mejor Bola',
    scramble: 'Scramble',
};

const OUTCOME_LABELS: Record<string, string> = {
    A: 'Cariñositos',
    B: 'Pitufos',
    AS: 'Empate',
};

type Outcome = 'A' | 'B' | 'AS';

interface Props {
    eventId: string;
    matches: Match[]; // only live matches
    onBetPlaced: () => void;
    betAmount: number;
    existingAdditionalBets?: Set<string>; // "flightId:segmentType" keys
}

export function AdditionalBetsSection({ eventId, matches, onBetPlaced, betAmount, existingAdditionalBets }: Props) {
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
    const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const clearToast = useCallback(() => setToast(null), []);

    // Filter out matches where user already has an additional bet
    const availableMatches = existingAdditionalBets
        ? matches.filter(m => !existingAdditionalBets.has(`${m.flightId}:${m.segmentType}`))
        : matches;

    if (availableMatches.length === 0) return null;

    const handlePlace = async (match: Match) => {
        if (!selectedOutcome) return;
        setIsSubmitting(true);
        try {
            await api.post(`/events/${eventId}/flights/${match.flightId}/segments/${match.segmentType}/bets`, {
                pickedOutcome: selectedOutcome,
                amount: betAmount,
            });
            setToast({ message: 'Apuesta adicional registrada', type: 'success' });
            setSelectedOutcome(null);
            setExpandedMatch(null);
            onBetPlaced();
        } catch (err) {
            setToast({ message: err instanceof Error ? err.message : 'Error', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Group by flight
    const flightGroups: Record<string, { name: string; matches: Match[] }> = {};
    availableMatches.forEach(m => {
        if (!flightGroups[m.flightId]) flightGroups[m.flightId] = { name: m.flightName, matches: [] };
        flightGroups[m.flightId].matches.push(m);
    });

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bangers text-cream/70 uppercase tracking-widest px-1">
                Apuestas Adicionales
            </h3>
            <p className="text-xs font-fredoka text-cream/40 px-1 -mt-2">
                Apuesta {formatCurrency(betAmount)} extra en partidos en juego. No puedes apostar por el líder actual.
            </p>

            {Object.entries(flightGroups).map(([flightId, group]) => (
                <div key={flightId} className="bg-[#0a4030]/50 thick-border rounded-2xl p-3">
                    <h4 className="text-xs font-bangers text-gold-light/60 uppercase tracking-widest mb-2 px-1">
                        {group.name}
                    </h4>
                    <div className="flex flex-col gap-2">
                        {group.matches.map(match => {
                            const isExpanded = expandedMatch === `${match.flightId}_${match.segmentType}`;
                            const matchKey = `${match.flightId}_${match.segmentType}`;

                            const currentLeader = match.matchLeaders && match.matchLeaders.length > 0
                                ? match.matchLeaders[match.currentHole > 0 ? match.currentHole - 1 : 0]
                                : null;

                            const redName = match.redPlayers.map(p => p.playerName.split(' ')[0]).join(' / ');
                            const blueName = match.bluePlayers.map(p => p.playerName.split(' ')[0]).join(' / ');

                            const canBetA = currentLeader !== 'red';
                            const canBetB = currentLeader !== 'blue';

                            return (
                                <div key={matchKey} className="bg-cream gold-border rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => {
                                            setExpandedMatch(isExpanded ? null : matchKey);
                                            setSelectedOutcome(null);
                                        }}
                                        className="w-full flex justify-between items-center px-3 py-2.5 text-left"
                                    >
                                        <div>
                                            <span className="text-xs font-bangers text-forest-deep/40 uppercase tracking-wider">
                                                {SEGMENT_LABELS[match.segmentType]}
                                            </span>
                                            <div className="text-sm font-fredoka text-forest-deep/60">
                                                <span className="text-team-red font-bold">{redName}</span>
                                                {' vs '}
                                                <span className="text-team-blue font-bold">{blueName}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-fredoka font-medium text-green-700 bg-green-50 flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-green-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                H{match.currentHole}
                                            </span>
                                            {match.matchStatus && (
                                                <span className="text-[10px] font-fredoka text-forest-deep/50">
                                                    {match.matchStatus}
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-3 pb-3 border-t border-gold-border/20 pt-2">
                                            <div className="flex gap-1.5 mb-2">
                                                {[
                                                    { outcome: 'A' as Outcome, label: redName, team: 'red', canBet: canBetA },
                                                    { outcome: 'AS' as Outcome, label: 'A/S', team: 'neutral', canBet: true },
                                                    { outcome: 'B' as Outcome, label: blueName, team: 'blue', canBet: canBetB },
                                                ].map(({ outcome, label, team, canBet }) => {
                                                    const isSelected = selectedOutcome === outcome;
                                                    const teamColor = team === 'red' ? 'team-red' : team === 'blue' ? 'team-blue' : 'forest-deep';
                                                    return (
                                                        <button
                                                            key={outcome}
                                                            onClick={() => canBet && setSelectedOutcome(isSelected ? null : outcome)}
                                                            disabled={!canBet}
                                                            className={`flex-1 py-3 rounded-lg border-2 text-center transition-all text-sm font-fredoka font-bold truncate px-2
                                                                ${!canBet ? 'bg-forest-deep/5 border-gold-border/10 text-forest-deep/20 cursor-not-allowed' :
                                                                    isSelected ? `bg-${teamColor}/25 border-${teamColor} ring-2 ring-${teamColor}/40 shadow-md text-${teamColor}` :
                                                                        `bg-${teamColor}/5 border-${teamColor}/20 text-${teamColor}/70 active:scale-95`}
                                                            `}
                                                        >
                                                            {outcome === 'AS' ? 'A/S' : label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {selectedOutcome && (
                                                <button
                                                    onClick={() => handlePlace(match)}
                                                    disabled={isSubmitting}
                                                    className="w-full py-3 rounded-xl gold-button text-[#1e293b] shadow-[0_3px_0_#1e293b] active:translate-y-0.5 active:shadow-none font-bangers text-base disabled:opacity-50"
                                                >
                                                    {isSubmitting ? 'Guardando...' : `Apostar ${formatCurrency(betAmount)}`}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
        </div>
    );
}
