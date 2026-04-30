'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useActiveEvent } from '@/hooks/useEvents';
import { useRounds, useRoundFlights } from '@/hooks/useRounds';
import { EventSwitcher } from '@/components/EventSwitcher';

const CARD_DARK =
    'bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] border-[2px] border-[#31316b] rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]';

export default function MatchesPage() {
    const { user } = useAuth();
    const { activeEvent, isLoading: eventsLoading } = useActiveEvent();
    const eventId = activeEvent?.id || '';
    const isOrganizer = activeEvent?.role === 'organizer';

    const { rounds, isLoading: roundsLoading } = useRounds(eventId);

    const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
    useEffect(() => {
        if (rounds.length > 0 && !selectedRoundId) {
            setSelectedRoundId(rounds[0].id);
        }
    }, [rounds, selectedRoundId]);

    const { flights: allFlights, isLoading: flightsLoading } = useRoundFlights(eventId, selectedRoundId);

    // Players see only the flights they're in; organizers see everything.
    const flights = useMemo(() => {
        if (isOrganizer || !user) return allFlights;
        return allFlights.filter(f => f.players.some(p => p.userId === user.id));
    }, [allFlights, isOrganizer, user]);

    if (eventsLoading || roundsLoading) {
        return <div className="p-8 text-center text-white/60 font-fredoka">Cargando…</div>;
    }
    if (!activeEvent) {
        return <div className="p-8 text-center text-white/60 font-fredoka">No hay evento activo.</div>;
    }

    return (
        <div className="relative z-[1] flex min-h-full flex-col pb-24">
            {/* Header */}
            <header className="px-4 pt-6 pb-4">
                <div className="flex items-center justify-between">
                    <div className="font-bangers text-[11px] uppercase tracking-[0.22em] text-[#fbbc05]/85">Partidas</div>
                    <EventSwitcher />
                </div>
                <div
                    className="font-bangers text-[40px] leading-[0.95] tracking-wide text-white"
                    style={{
                        WebkitTextStroke: '1.5px #07101b',
                        textShadow: '0 3px 0 rgba(7,16,27,0.85), 0 0 18px rgba(240,200,80,0.18)',
                    }}
                >
                    {activeEvent.name}
                </div>
            </header>

            {/* Round selector */}
            <div className="px-4 pb-2">
                <div className="flex gap-2 overflow-x-auto">
                    {rounds.map(r => {
                        const active = selectedRoundId === r.id;
                        return (
                            <button
                                key={r.id}
                                onClick={() => setSelectedRoundId(r.id)}
                                className={`flex-shrink-0 whitespace-nowrap rounded-full border-[2px] px-4 py-2 font-bangers text-xs uppercase tracking-wider transition-colors ${
                                    active
                                        ? 'border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b] shadow-[0_3px_0_#1e293b]'
                                        : 'border-[#31316b] bg-[#0f172b]/70 text-white/65 hover:text-white'
                                }`}
                            >
                                Round {r.roundNumber}
                            </button>
                        );
                    })}
                    {rounds.length === 0 && (
                        <div className="py-2 font-fredoka text-sm italic text-white/35">
                            No hay rounds todavía. Créalos en Admin.
                        </div>
                    )}
                </div>
            </div>

            {/* Flights */}
            <main className="flex-1 px-4 py-3">
                {flightsLoading ? (
                    <div className="text-center text-white/55 font-fredoka">Cargando flights…</div>
                ) : flights.length === 0 ? (
                    <div className={`${CARD_DARK} p-6 text-center font-fredoka text-white/55`}>
                        {!isOrganizer && allFlights.length > 0
                            ? 'No estás asignado a un grupo en esta ronda.'
                            : 'No hay flights asignados a este round todavía.'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {flights.map(f => {
                            const red = f.players.filter(p => p.team === 'red');
                            const blue = f.players.filter(p => p.team === 'blue');
                            const isCompleted = f.state === 'completed';
                            const isOpen = f.state === 'open';
                            const stateLabel =
                                f.state === 'completed' ? 'Finalizado' : f.state === 'reopened' ? 'Reabierto' : 'Abierto';
                            const stateClass = isCompleted
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : isOpen
                                ? 'bg-[#fbbc05]/15 text-[#fbbc05]'
                                : 'bg-white/8 text-white/65';
                            return (
                                <Link
                                    key={f.id}
                                    href={`/score?roundId=${selectedRoundId}&flightId=${f.id}`}
                                    className={`${CARD_DARK} block transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.6)]`}
                                >
                                    <div className="flex items-center justify-between border-b border-[#31316b]/50 px-4 py-3">
                                        <div className="font-bangers text-lg uppercase tracking-wider text-[#fbbc05]">
                                            Grupo {f.flightNumber}
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 font-bangers text-[10px] uppercase tracking-wider ${stateClass}`}
                                        >
                                            {stateLabel}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 px-4 py-3">
                                        <PlayerColumn label="Piratas" tone="red" players={red} />
                                        <PlayerColumn label="Fantasmas" tone="blue" players={blue} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

function PlayerColumn({
    label,
    tone,
    players,
}: {
    label: string;
    tone: 'red' | 'blue';
    players: {
        id: string;
        firstName: string;
        lastName: string;
        handicapIndex: number | string;
        playingHcpSingles?: number;
        playingHcpFourball?: number;
    }[];
}) {
    const labelClass = tone === 'red' ? 'text-team-red' : 'text-team-blue';
    return (
        <div>
            <div className={`mb-1 font-bangers text-[10px] uppercase tracking-widest ${labelClass}`}>{label}</div>
            {players.length === 0 ? (
                <div className="font-fredoka text-xs italic text-white/30">—</div>
            ) : (
                <div className="space-y-1">
                    {players.map(p => {
                        const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
                        // Singles- und Fourball-PH können sich unterscheiden (verschiedene Allowances).
                        // Wenn gleich → einmal anzeigen, sonst beide.
                        const phS = p.playingHcpSingles;
                        const phF = p.playingHcpFourball;
                        const phLabel =
                            phS === undefined ? null
                            : phF === undefined || phS === phF
                                ? `PH ${phS}`
                                : `PH ${phS}/${phF}`;
                        return (
                            <div key={p.id} className="flex flex-col leading-tight">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="font-bangers text-sm tracking-wider text-white">
                                        {name || '—'}
                                    </span>
                                    <span className="font-fredoka text-[10px] text-white/40">({p.handicapIndex})</span>
                                </div>
                                {phLabel && (
                                    <span className="font-fredoka text-[10px] uppercase tracking-wider text-[#fbbc05]/75">
                                        {phLabel}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
