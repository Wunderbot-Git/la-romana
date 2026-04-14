'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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
    error = null
}: ScoreEntryModalProps) {
    const [scores, setScores] = useState<Record<string, number | null>>(initialScores);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [isHighScoreMode, setIsHighScoreMode] = useState(false);
    const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setScores(initialScores);
            const firstEmptyIndex = players.findIndex(p => initialScores[p.playerId] === null);
            setActivePlayerIndex(firstEmptyIndex >= 0 ? firstEmptyIndex : 0);
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
        const activePlayer = players[activePlayerIndex];
        if (!activePlayer) return;

        const newScores = { ...scores, [activePlayer.playerId]: num };
        setScores(newScores);

        if (activePlayerIndex < players.length - 1) {
            setActivePlayerIndex(prev => prev + 1);
        } else {
            handleSaveAndClose(newScores);
        }
    };

    const prepareFinalScores = (currentScores: Record<string, number | null>) => {
        const finalScores: Record<string, number | null> = {};
        players.forEach(p => {
            const s = currentScores[p.playerId];
            finalScores[p.playerId] = s ?? null;
        });
        return finalScores;
    };

    const handleSaveAndClose = (currentScores: Record<string, number | null>) => {
        const finalScores = prepareFinalScores(currentScores);
        onSave(finalScores);
    };

    const handleManualClose = () => {
        const finalScores = prepareFinalScores(scores);
        onSave(finalScores);
        onClose();
    };

    const handleClear = () => {
        if (isSaving) return;
        const activePlayer = players[activePlayerIndex];
        if (!activePlayer) return;

        const newScores = { ...scores, [activePlayer.playerId]: null };
        setScores(newScores);

        if (activePlayerIndex < players.length - 1) {
            setActivePlayerIndex(prev => prev + 1);
        } else {
            handleSaveAndClose(newScores);
        }
    };

    const activePlayer = players[activePlayerIndex];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-forest-deep via-forest-mid to-forest-deep text-white h-[100dvh] overflow-hidden">
            {isSaving && (
                <div className="absolute inset-0 z-[110] bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-border border-t-transparent mb-4"></div>
                    <span className="text-lg font-bangers text-gold-light tracking-widest uppercase animate-pulse">Guardando Scores...</span>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-forest-deep border-b-2 border-gold-border/50">
                <button
                    onClick={handleManualClose}
                    className="p-2 -ml-2 text-gold-border/60 hover:text-gold-light"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bangers tracking-tight uppercase text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">Hoyo {holeNumber}</span>
                    <span className="text-sm font-bangers text-gold-light tracking-widest uppercase">Par {par}</span>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Players List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {players.map((player, index) => {
                    const isActive = index === activePlayerIndex;
                    const score = scores[player.playerId];
                    const displayName = player.playerName.replace(/\s-\s*$/, '');

                    return (
                        <div
                            key={player.playerId}
                            ref={(el) => { playerRefs.current[index] = el; }}
                            onClick={() => setActivePlayerIndex(index)}
                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${isActive ? 'bg-forest-mid gold-border text-white' : 'bg-transparent text-cream/60'}`}
                        >
                            <div>
                                <div className="font-fredoka font-bold text-lg leading-none text-white">
                                    {displayName}
                                </div>
                                <div className={`text-xs font-fredoka ${isActive ? 'text-gold-light/70' : 'text-cream/30'}`}>
                                    HCP {Math.round(player.hcp * 0.8)}
                                </div>
                            </div>

                            <div className="flex items-center">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 text-2xl font-bangers ${isActive
                                    ? 'bg-gold-border text-forest-deep border-gold-light'
                                    : (score !== null ? 'bg-forest-mid border-gold-border/40 text-gold-light' : 'border-gold-border/30 text-gold-border/30')
                                    }`}>
                                    {score !== null ? score : '-'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-rose-900/80 text-white p-3 text-xs font-fredoka font-bold text-center animate-in slide-in-from-bottom duration-300">
                    <span className="opacity-70 mr-2">Error:</span> {error}
                </div>
            )}

            {/* Keypad */}
            <div className="bg-forest-deep border-t-2 border-gold-border/50 p-2 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
                <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(baseNum => {
                        const num = isHighScoreMode ? baseNum + 9 : baseNum;
                        const rel = num - par;
                        let label = '';

                        if (rel === 0) label = 'Par';
                        else if (rel === -1) label = 'Birdie';
                        else if (rel === 1) label = 'Bogey';
                        else if (rel === -2) label = 'Eagle';
                        else if (rel === 2) label = 'Dbl Bogey';
                        else if (rel > 2 && !isHighScoreMode) label = 'Other';

                        return (
                            <button
                                key={num}
                                onClick={() => handleNumberPress(num)}
                                className={`h-16 rounded-lg font-bangers text-2xl flex flex-col items-center justify-center transition-colors
                                    ${num === par ? 'bg-forest-mid border-2 border-gold-border text-gold-light hover:bg-forest-mid/80' : 'bg-forest-mid/60 hover:bg-forest-mid active:bg-forest-deep text-cream border border-gold-border/20'}
                                `}
                            >
                                <span>{num}</span>
                                {label && <span className="text-[10px] font-fredoka font-normal text-cream/50 uppercase tracking-tight -mt-1">{label}</span>}
                            </button>
                        );
                    })}
                    <button
                        onClick={handleClear}
                        className="h-16 rounded-lg bg-team-red/80 hover:bg-team-red active:bg-team-red/60 text-white font-bangers text-xl flex items-center justify-center transition-colors border border-team-red"
                    >
                        C
                    </button>
                    <button className="h-16 rounded-lg bg-forest-mid/30 text-cream/20 font-bangers text-xl flex items-center justify-center cursor-not-allowed opacity-50 border border-gold-border/10">
                        -
                    </button>
                    <button
                        onClick={() => setIsHighScoreMode(!isHighScoreMode)}
                        className={`h-16 rounded-lg font-bangers text-xl flex items-center justify-center transition-colors border
                            ${isHighScoreMode ? 'bg-team-blue/80 text-white border-team-blue hover:bg-team-blue' : 'bg-forest-mid/40 text-cream/60 border-gold-border/20 hover:bg-forest-mid/60'}
                        `}
                    >
                        {isHighScoreMode ? '1-9' : '10+'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
