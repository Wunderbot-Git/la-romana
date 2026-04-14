'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSubmitScores } from './useScores';

interface UseScoreEntryParams {
    eventId: string;
    flightId: string;
}

interface SelectedCell {
    playerId: string;
    hole: number;
}

export function useScoreEntry({ eventId, flightId }: UseScoreEntryParams) {
    const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
    const [pendingScores, setPendingScores] = useState<Record<string, Record<number, number>>>({});
    const [isSyncing, setIsSyncing] = useState(false);
    const { submitScore, isSubmitting } = useSubmitScores();

    // Debounced submission
    useEffect(() => {
        const timeoutIds: NodeJS.Timeout[] = [];

        Object.entries(pendingScores).forEach(([playerId, holes]) => {
            Object.entries(holes).forEach(([hole, score]) => {
                const timeoutId = setTimeout(async () => {
                    setIsSyncing(true);
                    const success = await submitScore({
                        eventId,
                        flightId,
                        playerId,
                        hole: parseInt(hole),
                        score,
                    });

                    if (success) {
                        // Remove from pending after successful submission
                        setPendingScores((prev) => {
                            const updated = { ...prev };
                            if (updated[playerId]) {
                                delete updated[playerId][parseInt(hole)];
                                if (Object.keys(updated[playerId]).length === 0) {
                                    delete updated[playerId];
                                }
                            }
                            return updated;
                        });
                    }
                    setIsSyncing(false);
                }, 500); // 500ms debounce

                timeoutIds.push(timeoutId);
            });
        });

        return () => {
            timeoutIds.forEach(clearTimeout);
        };
    }, [pendingScores, eventId, flightId, submitScore]);

    const selectCell = useCallback((playerId: string, hole: number) => {
        setSelectedCell({ playerId, hole });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedCell(null);
    }, []);

    const enterScore = useCallback((score: number) => {
        if (!selectedCell) return;

        setPendingScores((prev) => ({
            ...prev,
            [selectedCell.playerId]: {
                ...(prev[selectedCell.playerId] || {}),
                [selectedCell.hole]: score,
            },
        }));
    }, [selectedCell]);

    const hasPendingChanges = Object.keys(pendingScores).length > 0;

    return {
        selectedCell,
        selectCell,
        clearSelection,
        enterScore,
        pendingScores,
        hasPendingChanges,
        isSyncing: isSyncing || isSubmitting,
    };
}
