'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useActiveEvent } from '@/hooks/useEvents';
import { useRounds, useRoundFlights, pickDefaultRound } from '@/hooks/useRounds';
import { useFlightScores, useSubmitScores } from '@/hooks/useScores';
import { ScoreGrid } from '@/components/ScoreGrid';

// Modal is portal-rendered → load only client-side
const ScoreEntryModal = dynamic(
    () => import('@/components/ScoreEntryModal').then(m => ({ default: m.ScoreEntryModal })),
    { ssr: false },
);

export default function ScorePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-white/60 font-fredoka">Cargando…</div>}>
            <ScorePageInner />
        </Suspense>
    );
}

function ScorePageInner() {
    const router = useRouter();
    const params = useSearchParams();
    const roundIdParam = params.get('roundId');
    const flightIdParam = params.get('flightId');

    const { user } = useAuth();
    const { activeEvent, isLoading: eventsLoading } = useActiveEvent();
    const eventId = activeEvent?.id || '';
    const isOrganizer = activeEvent?.role === 'organizer';

    // ── Auto-resolve flight when params are missing ────────────────────────
    // When a user lands on `/score` without ?roundId=&flightId= (e.g. via the
    // BottomNav), pick the first non-completed round and find the user's
    // flight in it; redirect once we know it. Organizers without a flight
    // assignment fall through to /matches.
    const { rounds, isLoading: roundsLoading } = useRounds(eventId);
    const defaultRoundId = useMemo(() => pickDefaultRound(rounds)?.id ?? null, [rounds]);
    const needsResolve = !flightIdParam || !roundIdParam;
    const resolveRoundId = needsResolve ? defaultRoundId : null;
    const { flights: resolverFlights, isLoading: resolverLoading } = useRoundFlights(eventId, resolveRoundId);

    useEffect(() => {
        if (!needsResolve) return;
        if (resolverLoading || roundsLoading || eventsLoading) return;
        if (!user || !resolveRoundId) return;
        const myFlight = resolverFlights.find(f => f.players.some(p => p.userId === user.id));
        if (myFlight) {
            router.replace(`/score?roundId=${resolveRoundId}&flightId=${myFlight.id}`);
        } else if (!isOrganizer) {
            // Player has no flight in this round → send to Partidas to pick another
            router.replace('/matches');
        }
        // Organizer w/o flight: leave the page in fallback state below — they can navigate.
    }, [
        needsResolve,
        resolverLoading,
        roundsLoading,
        eventsLoading,
        user,
        resolveRoundId,
        resolverFlights,
        isOrganizer,
        router,
    ]);

    const flightId = flightIdParam;
    const roundId = roundIdParam;

    const { data: flight, isLoading, refetch } = useFlightScores(eventId, flightId);
    const { submitBatchScores, isSubmitting, error: submitError } = useSubmitScores();

    const [openHole, setOpenHole] = useState<number | null>(null);
    const [lastSavedHole, setLastSavedHole] = useState<number | null>(null);
    const [half, setHalf] = useState<'front' | 'back'>('front');

    // While auto-resolving, show a loader (not the fallback message)
    if (needsResolve) {
        if (eventsLoading || roundsLoading || resolverLoading) {
            return <div className="p-8 text-center text-white/60 font-fredoka">Cargando tu partido…</div>;
        }
        // Reached: organizer with no flight (regular players already redirected to /matches)
        return (
            <div className="min-h-screen p-8 text-center text-white/60 font-fredoka">
                <p className="mb-3">Elige un grupo para ingresar scores.</p>
                <Link href="/matches" className="font-bangers uppercase tracking-wider text-[#fbbc05]">
                    Ir a Partidas
                </Link>
            </div>
        );
    }
    if (eventsLoading || isLoading) {
        return <div className="p-8 text-center text-white/60 font-fredoka">Cargando…</div>;
    }
    if (!flight || !activeEvent) {
        return <div className="p-8 text-center text-white/60 font-fredoka">Grupo no encontrado.</div>;
    }

    const allPlayers = [
        ...flight.redPlayers.map(p => ({ ...p, team: 'red' as const })),
        ...flight.bluePlayers.map(p => ({ ...p, team: 'blue' as const })),
    ];

    const handleHoleClick = (hole: number) => {
        // Auto-switch the displayed half so the user lands on the right side after closing the modal.
        if (hole >= 10) setHalf('back');
        else setHalf('front');
        setOpenHole(hole);
    };

    const handleSaveModal = async (newScores: Record<string, number | null>) => {
        if (openHole === null) return;
        if (!roundId || !flightId) return; // narrowed by early-return above; TS doesn't see it
        const batch = Object.entries(newScores).map(([playerId, score]) => ({
            playerId,
            hole: openHole,
            score,
        }));
        const ok = await submitBatchScores({
            eventId,
            roundId,
            flightId,
            scores: batch,
        });
        if (ok) {
            setLastSavedHole(openHole);
            setOpenHole(null);
            refetch();
        }
    };

    const initialScores = openHole
        ? allPlayers.reduce<Record<string, number | null>>((acc, p) => {
              acc[p.playerId] = p.scores[openHole - 1] ?? null;
              return acc;
          }, {})
        : {};

    const currentPar = openHole ? flight.parValues[openHole - 1] : 0;

    const modalPlayers = allPlayers.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        hcp: p.hcp,
        team: p.team,
    }));

    return (
        <div className="relative z-[1] flex h-[100dvh] flex-col overflow-hidden pb-24">
            {/* Header */}
            <header className="border-b border-[#31316b] bg-[#0f172b]/95 px-4 py-3">
                <div className="flex items-center justify-between">
                    <Link href="/matches" className="font-bangers text-xs uppercase tracking-wider text-[#fbbc05]">
                        ← Partidas
                    </Link>
                    <div className="text-center">
                        <div className="font-bangers text-[10px] uppercase tracking-widest text-white/55">
                            {flight.flightName}
                        </div>
                    </div>
                    <div className="w-16" />
                </div>
            </header>

            {/* Save indicator */}
            {isSubmitting && (
                <div className="bg-[#fbbc05]/15 px-4 py-1 text-center font-fredoka text-xs text-[#fbbc05]">
                    Guardando…
                </div>
            )}
            {submitError && (
                <div className="border-b border-rose-700 bg-rose-900/85 px-4 py-2 text-center font-fredoka text-xs text-white">
                    <span className="font-bold">Error:</span> {submitError}
                </div>
            )}

            {/* Half toggle — hidden for 9-hole rounds (e.g. night-golf side events) */}
            {flight.parValues.length > 9 && (
                <div className="flex gap-2 px-4 pt-3 pb-2">
                    <button
                        onClick={() => setHalf('front')}
                        className={`flex-1 rounded-[12px] border-[2px] py-2 font-bangers text-xs uppercase tracking-wider transition-colors ${
                            half === 'front'
                                ? 'border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b] shadow-[0_3px_0_#1e293b]'
                                : 'border-[#31316b] bg-[#0f172b]/70 text-white/65 hover:text-white'
                        }`}
                    >
                        Hoyos 1–9
                    </button>
                    <button
                        onClick={() => setHalf('back')}
                        className={`flex-1 rounded-[12px] border-[2px] py-2 font-bangers text-xs uppercase tracking-wider transition-colors ${
                            half === 'back'
                                ? 'border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b] shadow-[0_3px_0_#1e293b]'
                                : 'border-[#31316b] bg-[#0f172b]/70 text-white/65 hover:text-white'
                        }`}
                    >
                        Hoyos 10–18
                    </button>
                </div>
            )}

            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <ScoreGrid
                    flightScore={flight}
                    onHoleClick={handleHoleClick}
                    scrollToHole={lastSavedHole}
                    half={half}
                />
            </main>

            {openHole !== null && (
                <ScoreEntryModal
                    isOpen={true}
                    holeNumber={openHole}
                    par={currentPar}
                    players={modalPlayers}
                    initialScores={initialScores}
                    onSave={handleSaveModal}
                    onClose={() => setOpenHole(null)}
                    isSaving={isSubmitting}
                    error={submitError}
                />
            )}
        </div>
    );
}
