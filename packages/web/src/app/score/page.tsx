'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMyEvents } from '@/hooks/useEvents';
import { useFlightScores, useSubmitScores } from '@/hooks/useScores';

export default function ScorePage() {
    const router = useRouter();
    const params = useSearchParams();
    const roundId = params.get('roundId');
    const flightId = params.get('flightId');

    const { events, isLoading: eventsLoading } = useMyEvents();
    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);
    const eventId = activeEvent?.id || '';

    const { data: flight, isLoading, refetch } = useFlightScores(eventId, flightId);
    const { submitBatchScores, isSubmitting, error } = useSubmitScores();

    const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
    const [draft, setDraft] = useState<Record<string, (number | null)[]>>({});

    useEffect(() => {
        if (!flight) return;
        const seed: Record<string, (number | null)[]> = {};
        [...flight.redPlayers, ...flight.bluePlayers].forEach(p => {
            seed[p.playerId] = p.scores.slice();
        });
        setDraft(seed);
    }, [flight]);

    if (!flightId || !roundId) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500 mb-2">Falta el round o el grupo.</p>
                <Link href="/matches" className="text-blue-600 underline">Volver a Partidas</Link>
            </div>
        );
    }
    if (eventsLoading || isLoading) {
        return <div className="p-8 text-center text-gray-500">Cargando…</div>;
    }
    if (!flight || !activeEvent) {
        return <div className="p-8 text-center text-gray-500">Grupo no encontrado.</div>;
    }

    const allPlayers = [...flight.redPlayers, ...flight.bluePlayers];

    const setHoleScore = (playerId: string, holeIdx: number, value: number | null) => {
        setDraft(prev => ({
            ...prev,
            [playerId]: prev[playerId]?.map((s, i) => (i === holeIdx ? value : s)) ?? [],
        }));
    };

    const saveAll = async () => {
        const payload: { playerId: string; hole: number; score: number | null }[] = [];
        for (const p of allPlayers) {
            const current = flight.redPlayers.find(r => r.playerId === p.playerId)?.scores
                ?? flight.bluePlayers.find(b => b.playerId === p.playerId)?.scores
                ?? [];
            const next = draft[p.playerId] ?? [];
            for (let i = 0; i < 18; i++) {
                if (current[i] !== next[i]) {
                    payload.push({ playerId: p.playerId, hole: i + 1, score: next[i] });
                }
            }
        }
        if (payload.length === 0) return;
        const ok = await submitBatchScores({
            eventId: activeEvent.id,
            roundId,
            flightId,
            scores: payload,
        });
        if (ok) {
            await refetch();
            setEditingPlayer(null);
        }
    };

    const hasChanges = allPlayers.some(p => {
        const current = p.scores;
        const next = draft[p.playerId] ?? [];
        return next.some((v, i) => v !== current[i]);
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div>
                        <Link href="/matches" className="text-sm text-blue-600">&larr; Partidas</Link>
                        <h1 className="text-lg font-bold">{flight.flightName}</h1>
                    </div>
                    <button
                        onClick={saveAll}
                        disabled={!hasChanges || isSubmitting}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                            hasChanges && !isSubmitting
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {isSubmitting ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2">{error}</div>}
            </header>

            <main className="max-w-3xl mx-auto px-4 py-4">
                <div className="mb-4 text-sm text-gray-600">
                    <span className="font-medium">Fourball:</span> {flight.fourballStatus}
                </div>

                <div className="space-y-6">
                    {['red', 'blue'].map(team => (
                        <div key={team}>
                            <h2 className={`text-sm font-bold uppercase mb-2 ${team === 'red' ? 'text-team-red' : 'text-team-blue'}`}>
                                {team}
                            </h2>
                            <div className="space-y-3">
                                {(team === 'red' ? flight.redPlayers : flight.bluePlayers).map(p => (
                                    <PlayerScoreCard
                                        key={p.playerId}
                                        player={p}
                                        pars={flight.parValues}
                                        draft={draft[p.playerId] ?? []}
                                        onSet={(i, v) => setHoleScore(p.playerId, i, v)}
                                        expanded={editingPlayer === p.playerId}
                                        onToggle={() =>
                                            setEditingPlayer(editingPlayer === p.playerId ? null : p.playerId)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

function PlayerScoreCard({
    player,
    pars,
    draft,
    onSet,
    expanded,
    onToggle,
}: {
    player: { playerId: string; playerName: string; hcp: number; singlesStatus: string | null };
    pars: number[];
    draft: (number | null)[];
    onSet: (holeIdx: number, value: number | null) => void;
    expanded: boolean;
    onToggle: () => void;
}) {
    const total = draft.reduce<number>((a, v) => a + (v ?? 0), 0);
    const parTotal = pars.reduce<number>((a, v) => a + v, 0);

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between"
            >
                <div className="flex-1 text-left">
                    <div className="font-medium">
                        {player.playerName} <span className="text-gray-400 text-sm">HCP {player.hcp}</span>
                    </div>
                    {player.singlesStatus && (
                        <div className="text-xs text-gray-500">Singles: {player.singlesStatus}</div>
                    )}
                </div>
                <div className="text-right">
                    <div className="font-bold text-lg">{total || '—'}</div>
                    <div className="text-xs text-gray-500">Par {parTotal}</div>
                </div>
            </button>
            {expanded && (
                <div className="border-t px-2 py-3">
                    <div className="grid grid-cols-9 gap-1 text-xs">
                        {Array.from({ length: 18 }).map((_, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="text-gray-400">{i + 1}</div>
                                <div className="text-gray-500 text-[10px]">P{pars[i] ?? '-'}</div>
                                <input
                                    type="number"
                                    min="1"
                                    max="15"
                                    value={draft[i] ?? ''}
                                    onChange={(e) => {
                                        const v = e.target.value === '' ? null : Number(e.target.value);
                                        onSet(i, Number.isFinite(v) && (v as number) > 0 ? (v as number) : null);
                                    }}
                                    className="w-10 h-10 text-center border border-gray-300 rounded text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
