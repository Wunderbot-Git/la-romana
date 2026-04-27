'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useMyEvents } from '@/hooks/useEvents';
import { useLeaderboard, MatchDetail } from '@/hooks/useLeaderboard';
import {
    usePersonalStats,
    useTournamentSettlement,
    useGeneralBetPools,
    useMyGeneralBets,
} from '@/hooks/useBetting';
import { ApuestasTabs } from '@/components/betting/ApuestasTabs';
import { DashboardBanner } from '@/components/betting/DashboardBanner';
import { MatchBetCard } from '@/components/betting/MatchBetCard';
import { GeneralBetsSection } from '@/components/betting/GeneralBetsSection';
import { formatCurrency } from '@/lib/currency';

const BetDetailSheet = dynamic(
    () => import('@/components/betting/BetDetailSheet').then(m => ({ default: m.BetDetailSheet })),
    { ssr: false },
);

type Tab = 'general' | 'matches' | 'standings' | 'settlement';

interface OpenSheet {
    roundId: string;
    flightId: string;
    match: MatchDetail;
}

export default function ApuestasPage() {
    const { user } = useAuth();
    const { events, isLoading: eventsLoading } = useMyEvents();
    const activeEvent = useMemo(
        () => events?.find(e => e.status === 'live') || events?.[0] || null,
        [events],
    );
    const eventId = activeEvent?.id || '';

    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = usePersonalStats(eventId);
    const { data: leaderboard } = useLeaderboard(eventId);
    const { data: settlement } = useTournamentSettlement(eventId);
    const { data: pools, refetch: refetchPools } = useGeneralBetPools(eventId);
    const { data: myGeneralBets, refetch: refetchMyGeneralBets } = useMyGeneralBets(eventId);

    const [tab, setTab] = useState<Tab>('matches');
    const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(0);
    const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null);

    if (!user) {
        return <div className="p-8 text-center font-fredoka text-white/60">Inicia sesión para acceder a las apuestas.</div>;
    }
    if (eventsLoading) {
        return <div className="p-8 text-center font-fredoka text-white/60">Cargando…</div>;
    }
    if (!activeEvent) {
        return <div className="p-8 text-center font-fredoka text-white/60">No hay evento activo.</div>;
    }

    return (
        <div className="relative z-[1] flex min-h-full flex-col pb-24">
            {/* Header */}
            <header className="px-4 pt-6 pb-2">
                <div className="font-bangers text-[11px] uppercase tracking-[0.22em] text-[#fbbc05]/85">
                    Apuestas
                </div>
                <div
                    className="font-bangers text-[40px] leading-[0.95] tracking-wide text-white"
                    style={{
                        WebkitTextStroke: '1.5px #07101b',
                        textShadow: '0 3px 0 rgba(7,16,27,0.85), 0 0 18px rgba(240,200,80,0.18)',
                    }}
                >
                    Predicciones
                </div>
                <div className="mt-1 font-fredoka text-[11px] uppercase tracking-wider text-white/55">
                    {formatCurrency(2)} por apuesta · pari-mutuel · participación voluntaria
                </div>
            </header>

            <ApuestasTabs active="extra" />

            <DashboardBanner stats={stats || undefined} isLoading={statsLoading} />

            {/* Tab nav */}
            <div className="mt-4 flex gap-1 border-b border-[#31316b] px-2">
                {[
                    ['general', 'General'],
                    ['matches', 'Partidos'],
                    ['standings', 'Clasificación'],
                    ['settlement', 'Liquidación'],
                ].map(([key, label]) => {
                    const active = tab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setTab(key as Tab)}
                            className={`flex-1 border-b-[3px] py-2.5 font-bangers text-xs uppercase tracking-wider transition-colors ${
                                active
                                    ? 'border-[#fbbc05] text-[#fbbc05]'
                                    : 'border-transparent text-white/45 hover:text-white/70'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <main className="flex-1 px-4 py-3">
                {tab === 'general' && (
                    <GeneralBetsSection
                        eventId={eventId}
                        pools={pools || []}
                        myBets={myGeneralBets || []}
                        onBetPlaced={() => { refetchPools(); refetchMyGeneralBets(); refetchStats(); }}
                    />
                )}

                {tab === 'matches' && leaderboard && (
                    <MatchesTab
                        eventId={eventId}
                        leaderboard={leaderboard}
                        myBets={stats?.bets ?? []}
                        selectedRoundIdx={selectedRoundIdx}
                        setSelectedRoundIdx={setSelectedRoundIdx}
                        onCardClick={setOpenSheet}
                    />
                )}

                {tab === 'standings' && (
                    <StandingsTab settlement={settlement} userId={user.id} />
                )}

                {tab === 'settlement' && (
                    <SettlementTab settlement={settlement} userId={user.id} />
                )}
            </main>

            {openSheet && (
                <BetDetailSheet
                    eventId={eventId}
                    roundId={openSheet.roundId}
                    flightId={openSheet.flightId}
                    match={openSheet.match}
                    onClose={() => setOpenSheet(null)}
                    onPlaced={() => {
                        refetchStats();
                        setOpenSheet(null);
                    }}
                />
            )}
        </div>
    );
}

// ─── Matches tab ──────────────────────────────────────────────────────────

function MatchesTab({
    leaderboard,
    myBets,
    selectedRoundIdx,
    setSelectedRoundIdx,
    onCardClick,
}: {
    eventId: string;
    leaderboard: any;
    myBets: any[];
    selectedRoundIdx: number;
    setSelectedRoundIdx: (n: number) => void;
    onCardClick: (sheet: OpenSheet) => void;
}) {
    const round = leaderboard.rounds[selectedRoundIdx];
    if (!round) return <div className="font-fredoka text-white/55">Sin rondas.</div>;

    const flightStarted = (flightId: string): boolean => {
        const fs = round.flightSummaries.find((f: any) => f.flightId === flightId);
        if (!fs) return false;
        return fs.matches.some((m: any) => m.holesPlayed > 0);
    };

    return (
        <div className="space-y-3">
            {/* Round selector */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {leaderboard.rounds.map((r: any, idx: number) => {
                    const active = idx === selectedRoundIdx;
                    return (
                        <button
                            key={r.roundId}
                            onClick={() => setSelectedRoundIdx(idx)}
                            className={`flex-shrink-0 whitespace-nowrap rounded-full border-[2px] px-3 py-1.5 font-bangers text-xs uppercase tracking-wider transition-colors ${
                                active
                                    ? 'border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] text-[#1e293b] shadow-[0_3px_0_#1e293b]'
                                    : 'border-[#31316b] bg-[#0f172b]/70 text-white/65 hover:text-white'
                            }`}
                        >
                            R{r.roundNumber} · {r.courseName}
                        </button>
                    );
                })}
            </div>

            {/* Flight cards */}
            {round.flightSummaries.map((flight: any) => {
                const locked = flightStarted(flight.flightId);
                return (
                    <div
                        key={flight.flightId}
                        className="overflow-hidden rounded-[14px] border-[2px] border-[#31316b] bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex items-center justify-between border-b border-[#31316b]/60 px-4 py-2">
                            <span className="font-bangers text-sm uppercase tracking-wider text-[#fbbc05]">
                                Grupo {flight.flightNumber}
                            </span>
                            {locked && (
                                <span className="rounded-full bg-rose-900/40 px-2 py-0.5 font-bangers text-[9px] uppercase tracking-wider text-rose-300">
                                    Cerrado
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5 p-2">
                            {flight.matches.map((m: any) => {
                                const userBet = myBets.find(
                                    b => b.flightId === flight.flightId && b.segmentType === m.matchType && b.roundId === round.roundId,
                                );
                                return (
                                    <MatchBetCard
                                        key={m.matchType}
                                        match={m}
                                        userBet={userBet}
                                        locked={locked}
                                        onClick={() =>
                                            onCardClick({ roundId: round.roundId, flightId: flight.flightId, match: m })
                                        }
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Standings tab ────────────────────────────────────────────────────────

function StandingsTab({ settlement, userId }: { settlement: any; userId: string }) {
    if (!settlement) return <div className="text-center font-fredoka text-white/55">Cargando…</div>;
    if (settlement.balances.length === 0) {
        return <div className="text-center font-fredoka text-white/55 py-8">Aún no hay apuestas registradas.</div>;
    }
    return (
        <div className="overflow-hidden rounded-[14px] border-[2px] border-[#31316b] bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            {settlement.balances.map((p: any, idx: number) => {
                const isMe = p.id === userId;
                const balanceClass =
                    p.balance > 0.01 ? 'text-emerald-400'
                    : p.balance < -0.01 ? 'text-team-red'
                    : 'text-white/55';
                return (
                    <div
                        key={p.id}
                        className={`flex items-center justify-between border-t border-[#31316b]/40 px-4 py-3 first:border-0 ${
                            isMe ? 'bg-[#fbbc05]/10' : ''
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="w-6 text-center font-bangers text-sm text-[#fbbc05]">{idx + 1}</span>
                            <span className="font-bangers text-sm uppercase tracking-wider text-white">
                                {p.name} {isMe && <span className="text-[#fbbc05]">(Tú)</span>}
                            </span>
                        </div>
                        <span className={`font-bowlby text-base ${balanceClass}`}>
                            {p.balance > 0 ? '+' : ''}
                            {formatCurrency(p.balance)}
                        </span>
                    </div>
                );
            })}
            {settlement.isPartial && (
                <div className="border-t border-[#31316b]/40 bg-[#0a1322] px-4 py-2 font-fredoka text-[10px] italic text-white/45">
                    * Resultado parcial. Basado en partidas finalizadas.
                </div>
            )}
        </div>
    );
}

// ─── Settlement tab ───────────────────────────────────────────────────────

function SettlementTab({ settlement, userId }: { settlement: any; userId: string }) {
    if (!settlement) return <div className="text-center font-fredoka text-white/55">Cargando…</div>;
    if (settlement.transfers.length === 0) {
        return (
            <div className="rounded-[14px] border-[2px] border-[#31316b] bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                <div className="mb-2 text-4xl">🤝</div>
                <div className="font-bangers text-lg uppercase tracking-wider text-white">Nada que liquidar</div>
                <div className="mt-1 font-fredoka text-xs text-white/55">
                    Todos están a mano o no hay apuestas cerradas.
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-2">
            <div className="rounded-[10px] border-[2px] border-[#fbbc05]/55 bg-[#fbbc05]/15 px-3 py-2 font-fredoka text-xs text-white/85">
                <span className="font-bangers text-[#fbbc05]">Sistema de honor:</span> el aplicativo calcula la
                forma más eficiente de saldar las deudas entre todos.
            </div>
            {settlement.transfers.map((t: any, idx: number) => {
                const fromName = settlement.balances.find((b: any) => b.id === t.from)?.name ?? '?';
                const toName = settlement.balances.find((b: any) => b.id === t.to)?.name ?? '?';
                const isMeFrom = t.from === userId;
                const isMeTo = t.to === userId;
                return (
                    <div
                        key={idx}
                        className={`rounded-[14px] border-[2px] px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${
                            isMeFrom
                                ? 'border-team-red/60 bg-rose-900/20'
                                : isMeTo
                                ? 'border-emerald-400/60 bg-emerald-900/20'
                                : 'border-[#31316b] bg-gradient-to-b from-[#1c2f3e] to-[#0f172b]'
                        }`}
                    >
                        <div className="flex items-center justify-between font-bangers text-sm uppercase tracking-wider">
                            <span className={isMeFrom ? 'text-team-red' : 'text-white/85'}>{fromName}</span>
                            <span className="font-fredoka text-[10px] normal-case text-white/45">paga a</span>
                            <span className={isMeTo ? 'text-emerald-400' : 'text-white/85'}>{toName}</span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2">
                            <span className="font-fredoka text-[10px] uppercase tracking-wider text-white/45">
                                Transferencia
                            </span>
                            <span className="font-bowlby text-lg text-[#fbbc05]">{formatCurrency(t.amount)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
