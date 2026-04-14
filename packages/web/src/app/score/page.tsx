'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useMyEvents } from '@/hooks/useEvents';
import { usePlayers } from '@/hooks/usePlayers';
import { useFlightScores, useSubmitScores } from '@/hooks/useScores';
import { ScoreGrid } from '@/components/ScoreGrid';
import { CelebrationOverlay } from '@/components/CelebrationOverlay';

const ScoreEntryModal = dynamic(() => import('@/components/ScoreEntryModal').then(m => ({ default: m.ScoreEntryModal })), { ssr: false });

export default function ScoresPage() {
    const { user } = useAuth();
    const { events, isLoading: eventsLoading } = useMyEvents();

    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';
    const { players, isLoading: playersLoading } = usePlayers(eventId);

    const me = useMemo(() => {
        if (!user || !players) return null;
        return players.find(p => p.userId === user.id);
    }, [user, players]);

    const flightId = me?.flightId;

    const { data: flightScore, isLoading: scoresLoading, refetch } = useFlightScores(eventId, flightId);
    const { submitBatchScores, isSubmitting: isSaving, error: submitError } = useSubmitScores();
    const [openHole, setOpenHole] = useState<number | null>(null);
    const [lastSavedHole, setLastSavedHole] = useState<number | null>(null);
    const [activeSegment, setActiveSegmentState] = useState<'bestball' | 'scramble'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('score_activeSegment');
            if (saved === 'bestball' || saved === 'scramble') return saved;
        }
        return 'bestball';
    });
    const setActiveSegment = (seg: 'bestball' | 'scramble') => {
        setActiveSegmentState(seg);
        if (typeof window !== 'undefined') localStorage.setItem('score_activeSegment', seg);
    };

    const [celebrationTeam, setCelebrationTeam] = useState<'red' | 'blue' | null>(null);

    // Trigger celebration video when either team wins a hole
    useEffect(() => {
        if (lastSavedHole && flightScore) {
            const winner = flightScore.holeWinners[lastSavedHole - 1];
            if (winner === 'red' || winner === 'blue') {
                setCelebrationTeam(winner);
            }
        }
    }, [lastSavedHole, flightScore]);

    const isLoading = eventsLoading || playersLoading || (flightId ? scoresLoading : false);

    const handleHoleClick = (hole: number) => {
        setOpenHole(hole);
    };

    const handleSaveModal = async (scores: Record<string, number | null>) => {
        if (!flightScore || openHole === null || !flightId) return;

        const isScrambleHole = openHole > 9;

        const batch = Object.entries(scores).map(([id, score]) => {
            if (isScrambleHole) {
                return {
                    team: id === 'red_team' ? 'red' as const : 'blue' as const,
                    hole: openHole,
                    score
                };
            }
            return {
                playerId: id,
                hole: openHole,
                score
            };
        });

        const success = await submitBatchScores({
            eventId,
            flightId,
            scores: batch
        });

        if (success) {
            setLastSavedHole(openHole);
            setOpenHole(null);
            refetch();
        }
    };

    const isScrambleModal = openHole !== null && openHole > 9;

    const modalPlayers = openHole && flightScore ? (
        isScrambleModal ? [
            {
                playerId: 'red_team',
                playerName: flightScore.redPlayers.map(p => p.playerName.split(' ')[0]).join(' / '),
                hcp: Math.round(flightScore.redPlayers.reduce((a, b) => a + b.hcp, 0) / (flightScore.redPlayers.length || 1)),
                team: 'red' as const,
                scores: flightScore.redPlayers[0]?.scores || []
            },
            {
                playerId: 'blue_team',
                playerName: flightScore.bluePlayers.map(p => p.playerName.split(' ')[0]).join(' / '),
                hcp: Math.round(flightScore.bluePlayers.reduce((a, b) => a + b.hcp, 0) / (flightScore.bluePlayers.length || 1)),
                team: 'blue' as const,
                scores: flightScore.bluePlayers[0]?.scores || []
            }
        ] : [
            ...flightScore.redPlayers.map(p => ({ ...p, team: 'red' as const })),
            ...flightScore.bluePlayers.map(p => ({ ...p, team: 'blue' as const }))
        ]
    ) : [];

    const initialScores = openHole && flightScore ? modalPlayers.reduce((acc, p) => {
        acc[p.playerId] = p.scores[openHole - 1] ?? null;
        return acc;
    }, {} as Record<string, number | null>) : {};

    const currentPar = openHole && flightScore ? flightScore.parValues[openHole - 1] : 0;

    return (
        <div className="flex flex-col h-[100dvh] pb-16 overflow-hidden">

            {/* ERROR indicator */}
            {submitError && (
                <div className="px-4 py-2 bg-red-900/80 text-white text-xs text-center border-b border-red-700 font-fredoka">
                    <span className="font-bold">Error:</span> {submitError}
                </div>
            )}

            {/* Saving indicator */}
            {isSaving && (
                <div className="px-4 py-1 bg-gold-border/20 text-gold-light text-xs text-center font-fredoka">
                    Guardando...
                </div>
            )}

            <main className="flex-1 min-h-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-border mb-4"></div>
                        <p className="text-forest-deep/60 text-sm font-fredoka">Cargando tu partido...</p>
                    </div>
                ) : !activeEvent ? (
                    <div className="p-8 text-center">
                        <div className="cartoon-card p-6">
                            <p className="text-forest-deep/60 mb-4 font-fredoka">No eres parte de ningún evento activo.</p>
                        </div>
                    </div>
                ) : !flightId ? (
                    <div className="p-8 text-center">
                        <div className="cartoon-card p-6 text-center">
                            <p className="mb-2 font-bangers text-[#1e293b] uppercase text-xs tracking-widest">Sin Partido Asignado</p>
                            <p className="text-sm font-fredoka text-forest-deep/70">Podrás ingresar scores cuando te asignen a un grupo en <span className="font-bold text-forest-deep">{activeEvent.name}</span>.</p>
                        </div>
                    </div>
                ) : !flightScore ? (
                    <div className="p-8 text-center text-red-500 font-fredoka">
                        Error al cargar los datos de scores.
                    </div>
                ) : (
                    <div className="h-full flex flex-col overflow-hidden">
                        {/* Segment Toggle */}
                        <div className="flex gap-2 px-4 pt-3 pb-2">
                            <button
                                onClick={() => setActiveSegment('bestball')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bangers uppercase tracking-wider transition-colors ${activeSegment === 'bestball'
                                        ? 'bg-team-blue text-white shadow-sm thick-border font-bold'
                                        : 'cartoon-card text-gray-500 font-bold'
                                    }`}
                            >
                                Hoyos 1-9
                            </button>
                            <button
                                onClick={() => setActiveSegment('scramble')}
                                className={`flex-1 py-2 rounded-lg text-xs font-bangers uppercase tracking-wider transition-colors ${activeSegment === 'scramble'
                                        ? 'bg-team-blue text-white shadow-sm thick-border font-bold'
                                        : 'cartoon-card text-gray-500 font-bold'
                                    }`}
                            >
                                Hoyos 10-18
                            </button>
                        </div>

                        <ScoreGrid
                            flightScore={{ ...flightScore, segmentType: activeSegment === 'bestball' ? 'fourball' : 'scramble' }}
                            onHoleClick={handleHoleClick}
                            pendingScores={{}}
                            scrollToHole={lastSavedHole}
                        />
                    </div>
                )}
            </main>

            {celebrationTeam && (
                <CelebrationOverlay team={celebrationTeam} onClose={() => setCelebrationTeam(null)} />
            )}

            {openHole !== null && flightScore && (
                <ScoreEntryModal
                    isOpen={true}
                    holeNumber={openHole}
                    par={currentPar}
                    players={modalPlayers}
                    initialScores={initialScores}
                    onSave={handleSaveModal}
                    onClose={() => setOpenHole(null)}
                    isSaving={isSaving}
                    error={submitError}
                />
            )}
        </div>
    );
}
