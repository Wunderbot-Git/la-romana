'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useMyEvents } from '@/hooks/useEvents';
import { useRounds, useRoundFlights } from '@/hooks/useRounds';

export default function MatchesPage() {
    const { events, isLoading: eventsLoading } = useMyEvents();
    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);
    const eventId = activeEvent?.id || '';

    const { rounds, isLoading: roundsLoading } = useRounds(eventId);

    const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
    useEffect(() => {
        if (rounds.length > 0 && !selectedRoundId) {
            setSelectedRoundId(rounds[0].id);
        }
    }, [rounds, selectedRoundId]);

    const { flights, isLoading: flightsLoading } = useRoundFlights(eventId, selectedRoundId);

    if (eventsLoading || roundsLoading) {
        return <div className="p-8 text-center text-gray-500">Cargando…</div>;
    }
    if (!activeEvent) {
        return <div className="p-8 text-center text-gray-500">No hay evento activo.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold">Partidas</h1>
                    <p className="text-sm text-gray-600">{activeEvent.name}</p>
                </div>
            </header>

            {/* Round selector */}
            <div className="max-w-3xl mx-auto px-4 pt-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {rounds.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setSelectedRoundId(r.id)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                                selectedRoundId === r.id
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                        >
                            Round {r.roundNumber}
                        </button>
                    ))}
                    {rounds.length === 0 && (
                        <div className="text-sm text-gray-400 italic py-2">
                            No hay rounds todavía. Créalos en Admin.
                        </div>
                    )}
                </div>
            </div>

            {/* Flights for selected round */}
            <main className="max-w-3xl mx-auto px-4 py-4">
                {flightsLoading ? (
                    <div className="text-center text-gray-500">Cargando flights…</div>
                ) : flights.length === 0 ? (
                    <div className="bg-white rounded-lg p-6 text-center text-gray-500 shadow-sm">
                        No hay flights asignados a este round todavía.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {flights.map(f => (
                            <Link
                                key={f.id}
                                href={`/score?roundId=${selectedRoundId}&flightId=${f.id}`}
                                className="block bg-white rounded-lg p-4 shadow-sm hover:shadow transition-shadow"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="font-semibold">Grupo {f.flightNumber}</div>
                                    <div className="text-xs text-gray-500 capitalize">{f.state}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <div className="text-xs font-medium text-team-red mb-1">Red</div>
                                        {f.players.filter(p => p.team === 'red').map(p => (
                                            <div key={p.id} className="text-gray-700">
                                                {[p.firstName, p.lastName].filter(Boolean).join(' ')}{' '}
                                                <span className="text-gray-400 text-xs">({p.handicapIndex})</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-team-blue mb-1">Blue</div>
                                        {f.players.filter(p => p.team === 'blue').map(p => (
                                            <div key={p.id} className="text-gray-700">
                                                {[p.firstName, p.lastName].filter(Boolean).join(' ')}{' '}
                                                <span className="text-gray-400 text-xs">({p.handicapIndex})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
