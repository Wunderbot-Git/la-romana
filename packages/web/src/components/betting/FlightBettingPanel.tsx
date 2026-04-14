'use client';

import { useState, useCallback } from 'react';
import { Match } from '@/hooks/useLeaderboard';
import { Bet } from '@/hooks/useBetting';
import { api } from '@/lib/api';
import { Toast } from '@/components/ui/Toast';

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

function getMatchNames(match: Match) {
    const isTeam = match.segmentType === 'scramble' || match.segmentType === 'fourball';
    const red = (isTeam
        ? match.redPlayers.map(p => p.playerName.split(' ')[0]).join(' / ')
        : match.redPlayers[0]?.playerName?.split(' ')[0] || '?').replace(/\s*-\s*$/, '');
    const blue = (isTeam
        ? match.bluePlayers.map(p => p.playerName.split(' ')[0]).join(' / ')
        : match.bluePlayers[0]?.playerName?.split(' ')[0] || '?').replace(/\s*-\s*$/, '');
    return { red, blue };
}

function isMatchClosed(match: Match) {
    return match.currentHole > 8 || match.status === 'completed' || match.matchStatus.includes('Won') || match.matchStatus.includes('Lost') || match.matchStatus.includes('&');
}

function isPreMatch(match: Match) {
    return match.currentHole === 0 && !isMatchClosed(match);
}

interface Props {
    eventId: string;
    flightName: string;
    matches: Match[];
    userBets: Record<string, Bet | undefined>; // keyed by segmentType
    additionalBets?: Record<string, Bet | undefined>; // keyed by segmentType
    onBetsPlaced: () => void;
}

export function FlightBettingPanel({ eventId, flightName, matches, userBets, additionalBets = {}, onBetsPlaced }: Props) {
    const [selections, setSelections] = useState<Record<string, Outcome>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const clearToast = useCallback(() => setToast(null), []);

    // Check if all matches have bets placed
    const allBetsPlaced = matches.every(m => !!userBets[m.segmentType]);
    // Check if any match is still pre-match (changeable)
    const anyPreMatch = matches.some(m => isPreMatch(m));
    // Show compact view when all bets placed and not editing
    const showCompact = allBetsPlaced && !isEditing;

    const toggleSelection = (segmentType: string, outcome: Outcome) => {
        setSelections(prev => {
            const current = prev[segmentType];
            if (current === outcome) {
                const next = { ...prev };
                delete next[segmentType];
                return next;
            }
            return { ...prev, [segmentType]: outcome };
        });
    };

    // Count new selections (excluding matches that already have the same bet)
    const newSelections = Object.entries(selections).filter(([seg, outcome]) => {
        const existing = userBets[seg];
        return !existing || existing.pickedOutcome !== outcome;
    });

    const handleConfirmAll = async () => {
        if (newSelections.length === 0) return;
        setIsSubmitting(true);
        setProgress({ current: 0, total: newSelections.length });

        let successCount = 0;
        let lastError = '';

        for (const [segmentType, outcome] of newSelections) {
            const match = matches.find(m => m.segmentType === segmentType);
            if (!match) continue;

            // Only treat as additional if match is live (not pre-match replacement)
            const existingBet = userBets[segmentType];
            const isReplacement = existingBet && isPreMatch(match);
            const isAdditional = !!existingBet && !isReplacement;

            try {
                await api.post(`/events/${eventId}/flights/${match.flightId}/segments/${segmentType}/bets`, {
                    pickedOutcome: outcome,
                    ...(isAdditional ? { amount: 5000 } : {}),
                });
                successCount++;
            } catch (err) {
                lastError = err instanceof Error ? err.message : 'Error';
            }
            setProgress(p => ({ ...p, current: p.current + 1 }));
        }

        setIsSubmitting(false);
        setSelections({});
        setIsEditing(false);

        if (successCount > 0) {
            setToast({
                message: `${successCount} apuesta${successCount > 1 ? 's' : ''} registrada${successCount > 1 ? 's' : ''}`,
                type: successCount === newSelections.length ? 'success' : 'error',
            });
            onBetsPlaced();
        } else if (lastError) {
            setToast({ message: lastError, type: 'error' });
        }
    };

    // Compact summary view
    if (showCompact) {
        return (
            <div className="bg-[#0a4030] thick-border rounded-2xl p-3">
                <div className="flex justify-between items-center mb-2 px-1">
                    <h3 className="text-xs font-bangers text-gold-light uppercase tracking-widest">
                        {flightName}
                    </h3>
                    <span className="text-xs font-fredoka text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                        Completo
                    </span>
                </div>
                <div className="bg-cream gold-border rounded-xl px-3 py-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {matches.map(match => {
                            const bet = userBets[match.segmentType];
                            const addBet = additionalBets[match.segmentType];
                            if (!bet) return null;
                            const { red, blue } = getMatchNames(match);
                            const pickLabel = bet.pickedOutcome === 'A' ? red
                                : bet.pickedOutcome === 'B' ? blue : 'A/S';
                            const pickColor = bet.pickedOutcome === 'A' ? 'text-team-red'
                                : bet.pickedOutcome === 'B' ? 'text-team-blue' : 'text-forest-deep/70';
                            const addPickLabel = addBet
                                ? (addBet.pickedOutcome === 'A' ? red : addBet.pickedOutcome === 'B' ? blue : 'A/S')
                                : null;
                            const addPickColor = addBet
                                ? (addBet.pickedOutcome === 'A' ? 'text-team-red' : addBet.pickedOutcome === 'B' ? 'text-team-blue' : 'text-forest-deep/70')
                                : '';
                            return (
                                <div key={match.segmentType} className="flex items-center justify-between py-1">
                                    <span className="text-xs font-bangers text-forest-deep/40 uppercase tracking-wider">
                                        {SEGMENT_LABELS[match.segmentType]}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-sm font-fredoka font-bold ${pickColor}`}>
                                            {pickLabel}
                                        </span>
                                        {addPickLabel && (
                                            <span className={`text-[10px] font-fredoka font-bold ${addPickColor} bg-gold-border/15 px-1 rounded`}>
                                                +{addPickLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {anyPreMatch && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="w-full mt-2 py-1.5 text-xs font-fredoka text-gold-light/70 hover:text-gold-light transition-colors"
                    >
                        Cambiar apuestas
                    </button>
                )}
                {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
            </div>
        );
    }

    return (
        <div className="bg-[#0a4030] thick-border rounded-2xl p-3">
            <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="text-xs font-bangers text-gold-light uppercase tracking-widest">
                    {flightName}
                </h3>
                {isEditing && (
                    <button
                        onClick={() => { setIsEditing(false); setSelections({}); }}
                        className="text-[10px] font-fredoka text-gold-light/50 hover:text-gold-light"
                    >
                        Cancelar
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {matches.map(match => {
                    const { red, blue } = getMatchNames(match);
                    const closed = isMatchClosed(match);
                    const isLive = match.currentHole > 0 && !closed;
                    const preMatch = isPreMatch(match);
                    const existingBet = userBets[match.segmentType];
                    const selected = selections[match.segmentType] || null;

                    // In edit mode, only show pre-match matches as editable
                    const canEdit = isEditing ? preMatch : true;

                    const currentLeader = match.matchLeaders && match.matchLeaders.length > 0
                        ? match.matchLeaders[match.currentHole > 0 ? match.currentHole - 1 : 0]
                        : (match.matchStatus.includes('UP') ? 'red' : match.matchStatus.includes('DN') ? 'blue' : null);

                    const canBetA = canEdit && !closed && !(isLive && currentLeader === 'red');
                    const canBetB = canEdit && !closed && !(isLive && currentLeader === 'blue');
                    const canBetAS = canEdit && !closed;

                    return (
                        <div key={match.segmentType} className="bg-cream gold-border rounded-xl px-3 py-3">
                            {/* Row 1: segment label + status */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bangers text-forest-deep/50 uppercase tracking-wider">
                                    {SEGMENT_LABELS[match.segmentType] || match.segmentType}
                                </span>
                                {existingBet && preMatch && (
                                    <span className="text-[9px] font-fredoka text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                                        Cambiable
                                    </span>
                                )}
                                {isLive && (
                                    <span className="text-[10px] font-fredoka font-medium text-green-700 bg-green-50 flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-green-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        H{match.currentHole}
                                    </span>
                                )}
                                {closed && (
                                    <span className="text-[10px] font-fredoka text-forest-deep/30 bg-forest-deep/5 px-1.5 py-0.5 rounded-full">
                                        {match.matchStatus || 'Fin'}
                                    </span>
                                )}
                            </div>

                            {/* Row 2: outcome buttons */}
                            <div className="flex gap-1.5">
                                <OutcomeBtn
                                    label={red}
                                    outcome="A"
                                    team="red"
                                    selected={selected === 'A'}
                                    existingPick={existingBet?.pickedOutcome === 'A'}
                                    disabled={!canBetA}
                                    onClick={() => toggleSelection(match.segmentType, 'A')}
                                />
                                <OutcomeBtn
                                    label="AS"
                                    outcome="AS"
                                    team="neutral"
                                    selected={selected === 'AS'}
                                    existingPick={existingBet?.pickedOutcome === 'AS'}
                                    disabled={!canBetAS}
                                    onClick={() => toggleSelection(match.segmentType, 'AS')}
                                />
                                <OutcomeBtn
                                    label={blue}
                                    outcome="B"
                                    team="blue"
                                    selected={selected === 'B'}
                                    existingPick={existingBet?.pickedOutcome === 'B'}
                                    disabled={!canBetB}
                                    onClick={() => toggleSelection(match.segmentType, 'B')}
                                />
                            </div>

                            {/* Additional bet indicator */}
                            {additionalBets[match.segmentType] && (() => {
                                const addBet = additionalBets[match.segmentType]!;
                                const addLabel = addBet.pickedOutcome === 'A' ? red
                                    : addBet.pickedOutcome === 'B' ? blue : 'A/S';
                                const addColor = addBet.pickedOutcome === 'A' ? 'text-team-red'
                                    : addBet.pickedOutcome === 'B' ? 'text-team-blue' : 'text-forest-deep/70';
                                return (
                                    <div className="mt-1.5 flex items-center gap-1.5 bg-gold-border/10 rounded-lg px-2 py-1">
                                        <span className="text-[10px] font-bangers text-gold-border">+</span>
                                        <span className="text-[10px] font-fredoka text-forest-deep/50">Adicional:</span>
                                        <span className={`text-[10px] font-fredoka font-bold ${addColor}`}>{addLabel}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>

            {/* Confirm button */}
            {newSelections.length > 0 && (
                <button
                    onClick={handleConfirmAll}
                    disabled={isSubmitting}
                    className={`w-full mt-3 py-4 rounded-xl font-bangers text-lg transition-all ${isSubmitting ? 'bg-forest-mid text-cream/50 cursor-wait' : 'gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none'}`}
                >
                    {isSubmitting
                        ? `Guardando ${progress.current} de ${progress.total}...`
                        : isEditing
                            ? `Cambiar ${newSelections.length} apuesta${newSelections.length > 1 ? 's' : ''}`
                            : `Confirmar ${newSelections.length} apuesta${newSelections.length > 1 ? 's' : ''}`}
                </button>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
        </div>
    );
}

function OutcomeBtn({ label, outcome, team, selected, existingPick, disabled, onClick }: {
    label: string;
    outcome: Outcome;
    team: 'red' | 'blue' | 'neutral';
    selected: boolean;
    existingPick: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    const isAS = outcome === 'AS';

    let bg = team === 'red' ? 'bg-team-red/5 border-team-red/20'
        : team === 'blue' ? 'bg-team-blue/5 border-team-blue/20'
        : 'bg-forest-deep/5 border-forest-deep/15';
    let text = team === 'red' ? 'text-team-red/70' : team === 'blue' ? 'text-team-blue/70' : 'text-forest-deep/50';

    if (selected) {
        bg = team === 'red' ? 'bg-team-red/25 border-team-red ring-2 ring-team-red/40 shadow-md'
            : team === 'blue' ? 'bg-team-blue/25 border-team-blue ring-2 ring-team-blue/40 shadow-md'
            : 'bg-forest-deep/20 border-forest-deep ring-2 ring-forest-deep/30 shadow-md';
        text = team === 'red' ? 'text-team-red font-extrabold text-sm' : team === 'blue' ? 'text-team-blue font-extrabold text-sm' : 'text-forest-deep font-extrabold text-sm';
    } else if (existingPick) {
        bg = team === 'red' ? 'bg-team-red/20 border-team-red/60 shadow-sm'
            : team === 'blue' ? 'bg-team-blue/20 border-team-blue/60 shadow-sm'
            : 'bg-forest-deep/15 border-forest-deep/50 shadow-sm';
        text = team === 'red' ? 'text-team-red font-bold' : team === 'blue' ? 'text-team-blue font-bold' : 'text-forest-deep/80 font-bold';
    }

    if (disabled) {
        bg = 'bg-forest-deep/5 border-gold-border/10';
        text = 'text-forest-deep/20';
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex-1 py-2.5 rounded-lg border-2 text-center transition-all active:scale-95 ${bg} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <div className={`text-xs font-fredoka font-bold truncate px-1 ${text}`}>
                {isAS ? 'A/S' : label}
            </div>
        </button>
    );
}
