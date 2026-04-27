'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ScoreEntryModal — full-screen number-pad score entry, ported from Bogotá
 * Pitufos repo and themed for La Romana 2026.
 *
 * Behavior:
 *   - One hole at a time, all players in the flight visible as rows.
 *   - Tap a number → score saved to the active player → auto-advance to next.
 *   - After last player, auto-saves & closes.
 *   - "+10" toggles a high-score keypad (10–18).
 *   - "C" clears the active player's score.
 *   - Tapping a player row activates that player.
 *   - Number labels (Birdie / Par / Bogey / etc.) appear under each digit.
 */
interface PlayerEntryInfo {
    playerId: string;
    playerName: string;
    hcp: number;
    team: 'red' | 'blue';
}

interface ScoreEntryModalProps {
    isOpen: boolean;
    holeNumber: number;
    par: number;
    players: PlayerEntryInfo[];
    initialScores: Record<string, number | null>;
    onSave: (scores: Record<string, number | null>) => void;
    onClose: () => void;
    isSaving?: boolean;
    error?: string | null;
}

export function ScoreEntryModal({
    isOpen,
    holeNumber,
    par,
    players,
    initialScores,
    onSave,
    onClose,
    isSaving = false,
    error = null,
}: ScoreEntryModalProps) {
    const [scores, setScores] = useState<Record<string, number | null>>(initialScores);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [isHighScoreMode, setIsHighScoreMode] = useState(false);
    const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setScores(initialScores);
            const firstEmpty = players.findIndex(p => initialScores[p.playerId] == null);
            setActivePlayerIndex(firstEmpty >= 0 ? firstEmpty : 0);
            setIsHighScoreMode(false);
        }
    }, [isOpen, initialScores, players]);

    useEffect(() => {
        if (isOpen && playerRefs.current[activePlayerIndex]) {
            playerRefs.current[activePlayerIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [activePlayerIndex, isOpen]);

    if (!isOpen) return null;

    const handleNumberPress = (num: number) => {
        if (isSaving) return;
        const ap = players[activePlayerIndex];
        if (!ap) return;
        const newScores = { ...scores, [ap.playerId]: num };
        setScores(newScores);
        if (activePlayerIndex < players.length - 1) {
            setActivePlayerIndex(prev => prev + 1);
        } else {
            handleSaveAndClose(newScores);
        }
    };

    const handleClear = () => {
        if (isSaving) return;
        const ap = players[activePlayerIndex];
        if (!ap) return;
        const newScores = { ...scores, [ap.playerId]: null };
        setScores(newScores);
        if (activePlayerIndex < players.length - 1) {
            setActivePlayerIndex(prev => prev + 1);
        } else {
            handleSaveAndClose(newScores);
        }
    };

    const prepareFinal = (current: Record<string, number | null>) => {
        const final: Record<string, number | null> = {};
        players.forEach(p => {
            final[p.playerId] = current[p.playerId] ?? null;
        });
        return final;
    };

    const handleSaveAndClose = (current: Record<string, number | null>) => {
        onSave(prepareFinal(current));
    };

    const handleManualClose = () => {
        onSave(prepareFinal(scores));
        onClose();
    };

    const labelFor = (n: number): string => {
        const rel = n - par;
        if (rel === 0) return 'Par';
        if (rel === -1) return 'Birdie';
        if (rel === -2) return 'Eagle';
        if (rel === -3) return 'Albatros';
        if (rel === 1) return 'Bogey';
        if (rel === 2) return 'Doble';
        return '';
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-[#0f172b] via-[#1c2f3e] to-[#0a1322] text-white">
            {/* Saving overlay */}
            {isSaving && (
                <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm transition-all duration-300">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#fbbc05] border-t-transparent" />
                    <span className="animate-pulse font-bangers text-lg uppercase tracking-widest text-[#fbbc05]">
                        Guardando…
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#fbbc05]/40 bg-[#0f172b] p-4">
                <button
                    onClick={handleManualClose}
                    className="-ml-2 p-2 text-[#fbbc05]/70 hover:text-[#fbbc05]"
                    aria-label="Cerrar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-bowlby text-2xl uppercase tracking-tight text-[#fbbc05] drop-shadow-[0_2px_0_#1e293b]">
                        Hoyo {holeNumber}
                    </span>
                    <span className="font-bangers text-[11px] uppercase tracking-widest text-white/70">Par {par}</span>
                </div>
                <div className="w-10" />
            </div>

            {/* Player list */}
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {players.map((player, idx) => {
                    const isActive = idx === activePlayerIndex;
                    const score = scores[player.playerId];
                    const teamColor = player.team === 'red' ? 'text-team-red' : 'text-team-blue';
                    const teamRing = player.team === 'red' ? 'ring-team-red/60' : 'ring-team-blue/60';
                    const ph = Math.round(player.hcp * 0.8);
                    return (
                        <div
                            key={player.playerId}
                            ref={el => { playerRefs.current[idx] = el; }}
                            onClick={() => setActivePlayerIndex(idx)}
                            className={`flex cursor-pointer items-center justify-between rounded-[14px] border px-4 py-3 transition-all ${
                                isActive
                                    ? `bg-[#1c2f3e] border-[#fbbc05] ring-2 ${teamRing}`
                                    : 'border-[#31316b]/60 bg-[#0f172b]/70 opacity-70 hover:opacity-100'
                            }`}
                        >
                            <div className="min-w-0">
                                <div className={`truncate font-bangers text-[18px] tracking-wider uppercase ${teamColor}`}>
                                    {player.playerName.split(' ')[0]}
                                </div>
                                <div className="font-fredoka text-[11px] text-white/55">
                                    HCP {player.hcp} <span className="text-white/35">· PH {ph}</span>
                                </div>
                            </div>
                            <div
                                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 font-bowlby text-[22px] leading-none ${
                                    isActive
                                        ? 'border-[#fbbc05] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b]'
                                        : score !== null
                                        ? 'border-[#fbbc05]/60 bg-[#0a1322] text-[#fbbc05]'
                                        : 'border-white/20 text-white/30'
                                }`}
                            >
                                {score ?? '–'}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-rose-900/85 p-3 text-center font-fredoka text-xs font-bold text-white">
                    <span className="mr-2 opacity-70">Error:</span>
                    {error}
                </div>
            )}

            {/* Keypad */}
            <div className="border-t-2 border-[#fbbc05]/40 bg-[#0f172b] p-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
                <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(base => {
                        const num = isHighScoreMode ? base + 9 : base;
                        const label = labelFor(num);
                        const isPar = num === par;
                        return (
                            <button
                                key={num}
                                onClick={() => handleNumberPress(num)}
                                className={`flex h-16 flex-col items-center justify-center rounded-[12px] border font-bangers text-2xl transition-colors ${
                                    isPar
                                        ? 'border-[#fbbc05] bg-[#1c2f3e] text-[#fbbc05] hover:bg-[#1c2f3e]/80'
                                        : 'border-[#31316b] bg-[#0a1322] text-white/85 hover:bg-[#162844]'
                                }`}
                            >
                                <span>{num}</span>
                                {label && (
                                    <span className="-mt-0.5 font-fredoka text-[10px] font-normal uppercase tracking-tight text-white/55">
                                        {label}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    <button
                        onClick={handleClear}
                        className="flex h-16 items-center justify-center rounded-[12px] border border-team-red/70 bg-team-red/80 font-bangers text-xl text-white transition-colors hover:bg-team-red"
                    >
                        C
                    </button>
                    <button
                        disabled
                        className="flex h-16 items-center justify-center rounded-[12px] border border-[#31316b]/40 bg-[#0a1322]/40 font-bangers text-xl text-white/15"
                    >
                        –
                    </button>
                    <button
                        onClick={() => setIsHighScoreMode(prev => !prev)}
                        className={`flex h-16 items-center justify-center rounded-[12px] border font-bangers text-xl transition-colors ${
                            isHighScoreMode
                                ? 'border-team-blue bg-team-blue/85 text-white hover:bg-team-blue'
                                : 'border-[#31316b] bg-[#0a1322] text-white/65 hover:bg-[#162844]'
                        }`}
                    >
                        {isHighScoreMode ? '1-9' : '10+'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
