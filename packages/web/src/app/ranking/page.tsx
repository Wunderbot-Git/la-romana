'use client';

import { useMemo, useState } from 'react';
import { useMyEvents } from '@/hooks/useEvents';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { PullToRefresh } from '@/components/PullToRefresh';
import { SettingsLink } from '@/components/SettingsLink';
import { StablefordTable, StablefordFilter } from '@/components/StablefordTable';

/**
 * Cumulative individual ranking across all 3 rounds — Stableford net points.
 * Filter pills above the table allow drilling into individual days
 * (so you can see "Mejor del Día" daily standings + their $100/$50 payouts).
 */
export default function RankingPage() {
    const { events, isLoading: eventsLoading } = useMyEvents();
    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';
    const { data, isLoading, refetch } = useLeaderboard(eventId);
    const [filter, setFilter] = useState<StablefordFilter>('total');

    if (eventsLoading || (eventId && isLoading && !data)) {
        return <div className="p-8 text-center text-white/70 font-fredoka">Cargando…</div>;
    }
    if (!activeEvent) {
        return <div className="p-8 text-center text-white/70 font-fredoka">No hay evento activo.</div>;
    }
    if (!data) {
        return <div className="p-8 text-center text-white/70 font-fredoka">Sin datos todavía.</div>;
    }

    const dayLabel = (n: number) => {
        const round = data.rounds.find(r => r.roundNumber === n);
        return round?.courseName ? `Día ${n}` : `Día ${n}`;
    };
    const filterCourseName = typeof filter === 'number'
        ? data.rounds.find(r => r.roundNumber === filter)?.courseName ?? null
        : null;

    return (
        <PullToRefresh onRefresh={refetch}>
            <div className="relative z-[1] flex min-h-full flex-col pb-24">
                <header className="flex items-end justify-between px-4 pt-6 pb-4">
                    <div className="min-w-0 flex-1">
                        <div className="font-bangers text-[11px] uppercase tracking-[0.22em] text-[#fbbc05]/85">
                            Ranking Individual
                        </div>
                        <div
                            className="font-bangers text-[40px] leading-[0.95] tracking-wide text-white"
                            style={{
                                WebkitTextStroke: '1.5px #07101b',
                                textShadow: '0 3px 0 rgba(7,16,27,0.85), 0 0 18px rgba(240,200,80,0.18)',
                            }}
                        >
                            Stableford
                        </div>
                        <div className="mt-1 font-fredoka text-[11px] uppercase tracking-wider text-white/55">
                            {filter === 'total'
                                ? 'Acumulado · 3 rondas'
                                : filterCourseName
                                ? `Mejor del Día · ${filterCourseName}`
                                : `Mejor del Día · Día ${filter}`}
                        </div>
                    </div>
                    <SettingsLink />
                </header>

                {/* Filter pills */}
                <div className="px-4 pb-3">
                    <div className="flex gap-1.5 overflow-x-auto">
                        <FilterPill active={filter === 'total'} onClick={() => setFilter('total')}>
                            Total
                        </FilterPill>
                        {data.rounds.map(r => (
                            <FilterPill
                                key={r.roundId}
                                active={filter === r.roundNumber}
                                onClick={() => setFilter(r.roundNumber)}
                            >
                                {dayLabel(r.roundNumber)}
                            </FilterPill>
                        ))}
                    </div>
                </div>

                <main className="px-4">
                    <StablefordTable data={data} filter={filter} />
                </main>
            </div>
        </PullToRefresh>
    );
}

function FilterPill({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-shrink-0 whitespace-nowrap rounded-full border-[2px] px-4 py-1.5 font-bangers text-xs uppercase tracking-wider transition-colors ${
                active
                    ? 'border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b] shadow-[0_3px_0_#1e293b]'
                    : 'border-[#31316b] bg-[#0f172b]/70 text-white/65 hover:text-white'
            }`}
        >
            {children}
        </button>
    );
}
