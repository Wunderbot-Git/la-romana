'use client';

import { useAuth } from '@/lib/auth';
import { useActiveEvent } from '@/hooks/useEvents';
import { useApuestas, OverallSummary, OverallStanding, PotADay, PotADayStanding, PotBRyder, PotCRanking, PotCTotalViaje } from '@/hooks/useApuestas';
import { Avatar } from '@/components/Avatar';
import { ApuestasTabs } from '@/components/betting/ApuestasTabs';
import { EventSwitcher } from '@/components/EventSwitcher';
import { formatCurrency } from '@/lib/currency';

const CARD_DARK =
    'bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] border-[2px] border-[#31316b] rounded-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.5)]';

export default function ApuestasPage() {
    const { user } = useAuth();
    const { activeEvent, isLoading: eventsLoading } = useActiveEvent();
    const eventId = activeEvent?.id || '';
    const { data, isLoading } = useApuestas(eventId);

    if (eventsLoading || isLoading) return <div className="p-8 text-center font-fredoka text-white/60">Cargando…</div>;
    if (!activeEvent) return <div className="p-8 text-center font-fredoka text-white/60">No hay evento activo.</div>;
    if (!data) return <div className="p-8 text-center font-fredoka text-white/60">Sin datos todavía.</div>;

    return (
        <div className="relative z-[1] flex min-h-full flex-col pb-24">
            {/* Header */}
            <header className="px-4 pt-6 pb-2">
                <div className="flex items-center justify-between">
                    <div className="font-bangers text-[11px] uppercase tracking-[0.22em] text-[#fbbc05]/85">
                        Apuestas
                    </div>
                    <EventSwitcher />
                </div>
                <div
                    className="font-bangers text-[40px] leading-[0.95] tracking-wide text-white"
                    style={{
                        WebkitTextStroke: '1.5px #07101b',
                        textShadow: '0 3px 0 rgba(7,16,27,0.85), 0 0 18px rgba(240,200,80,0.18)',
                    }}
                >
                    Pozo del Trofeo
                </div>
                <div className="mt-1 font-fredoka text-[11px] uppercase tracking-wider text-white/55">
                    ${data.perPlayer.tripTotal} por jugador · ${data.perPlayer.dailyTotal}/día
                </div>
            </header>

            <ApuestasTabs active="principal" />

            {/* Hero — Total Pool */}
            <section className="px-4 pt-3">
                <div className={`${CARD_DARK} flex items-center justify-between gap-3 px-4 py-3`}>
                    <div>
                        <div className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">
                            Pozo Total del Viaje
                        </div>
                        <div className="font-bowlby text-[28px] leading-none text-[#fbbc05] mt-0.5">
                            {formatCurrency(data.grandPool)}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-bangers text-[10px] uppercase tracking-widest text-white/55">Tu aporte</div>
                        <div className="font-bowlby text-[18px] leading-none text-white mt-0.5">
                            {formatCurrency(data.perPlayer.tripTotal)}
                        </div>
                        <div className="mt-1 font-fredoka text-[10px] text-white/45">
                            $10 + $10 + $20 × 3 días
                        </div>
                    </div>
                </div>
            </section>

            <main className="flex flex-col gap-4 px-4 pt-4">
                <SectionA pots={data.pots.a} />
                <SectionB pot={data.pots.b} />
                <SectionC
                    pot={data.pots.c}
                    userId={user?.id ?? null}
                    isProvisional={data.pots.a.some(d => d.state !== 'completed')}
                />
                <SectionTotal summary={data.summary} userId={user?.id ?? null} />
            </main>
        </div>
    );
}

// ── SECTION A ────────────────────────────────────────────────────────────────

function SectionA({ pots }: { pots: PotADay[] }) {
    return (
        <section className={`${CARD_DARK} overflow-hidden`}>
            <div className="border-b border-[#31316b]/60 px-4 py-3">
                <div className="flex items-baseline justify-between">
                    <div>
                        <div className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">
                            Pot A
                        </div>
                        <div className="font-bangers text-lg uppercase tracking-wider text-white">
                            Mejor del Día
                        </div>
                    </div>
                    <div className="text-right font-fredoka text-[10px] text-white/55">
                        $10/jug × 3 días<br />
                        <span className="font-bangers text-[#fbbc05]">$100 + $50</span> por día
                    </div>
                </div>
                <div className="mt-1.5 font-fredoka text-[10px] text-white/40">
                    Mejor neto del día (gross − strokes). Cuanto menor, mejor.
                </div>
            </div>

            <div className="divide-y divide-[#31316b]/40">
                {pots.map(day => <DayCard key={day.roundId} day={day} />)}
            </div>
        </section>
    );
}

function DayCard({ day }: { day: PotADay }) {
    const top3 = day.standings.filter(s => s.rank !== null).slice(0, 3);
    return (
        <div className="px-4 py-3">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">
                        Round {day.roundNumber}
                    </div>
                    <div className="font-bangers text-sm uppercase tracking-wider text-white">
                        {day.courseName}
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-fredoka text-[10px] text-white/55">Pool</div>
                    <div className="font-bowlby text-base text-[#fbbc05]">{formatCurrency(day.poolSize)}</div>
                </div>
            </div>

            {top3.length === 0 ? (
                <div className="mt-2 font-fredoka text-xs italic text-white/40">Sin jugar</div>
            ) : (
                <div className="mt-3 space-y-1.5">
                    {top3.map(s => (
                        <DayStandingRow key={s.playerId} s={s} />
                    ))}
                </div>
            )}
        </div>
    );
}

function DayStandingRow({ s }: { s: PotADayStanding }) {
    const teamForAvatar: 'red' | 'blue' = s.team === 'blue' ? 'blue' : 'red';
    const teamColor = s.team === 'red' ? 'text-team-red' : s.team === 'blue' ? 'text-team-blue' : 'text-white';
    const isWinner = s.rank === 1 || s.rank === 2;
    const scoreLabel = s.netScore !== null
        ? (s.holesPlayed < 18 ? `${s.netScore} net · ${s.holesPlayed}/18` : `${s.netScore} net`)
        : '—';
    return (
        <div className={`flex items-center justify-between rounded-[10px] border px-2.5 py-1.5 ${
            isWinner ? 'border-[#fbbc05]/40 bg-[#fbbc05]/8' : 'border-[#31316b]/60 bg-[#0a1322]/60'
        }`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-5 text-center font-bangers text-sm text-[#fbbc05]">{s.rank}</span>
                <Avatar name={s.playerName} team={teamForAvatar} size={26} className="shrink-0" />
                <span className={`truncate font-bangers text-sm uppercase tracking-wider ${teamColor}`}>
                    {s.playerName}
                </span>
            </div>
            <div className="ml-2 flex items-baseline gap-2">
                <span className="font-fredoka text-[10px] uppercase text-white/45">{scoreLabel}</span>
                {s.payout > 0 && (
                    <span className="rounded-full bg-[#fbbc05]/20 px-2 py-0.5 font-bowlby text-[12px] text-[#fbbc05]">
                        {formatCurrency(s.payout)}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── SECTION B ────────────────────────────────────────────────────────────────

function SectionB({ pot }: { pot: PotBRyder }) {
    const ledClass = (side: 'red' | 'blue'): string => {
        if (pot.winner === side) return 'border-[#fbbc05] bg-[#fbbc05]/15';
        if (pot.winner) return 'border-[#31316b]/40 bg-[#0a1322]/40 opacity-50';
        // No winner yet — highlight current leader
        const leading = pot.redScore > pot.blueScore ? 'red' : pot.blueScore > pot.redScore ? 'blue' : null;
        if (leading === side) return side === 'red'
            ? 'border-team-red/60 bg-team-red/10'
            : 'border-team-blue/60 bg-team-blue/10';
        return 'border-[#31316b]/60 bg-[#0a1322]/60';
    };

    return (
        <section className={`${CARD_DARK} overflow-hidden`}>
            <div className="border-b border-[#31316b]/60 px-4 py-3">
                <div className="flex items-baseline justify-between">
                    <div>
                        <div className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">
                            Pot B
                        </div>
                        <div className="font-bangers text-lg uppercase tracking-wider text-white">
                            Ryder Cup
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-fredoka text-[10px] text-white/55">Pool total</div>
                        <div className="font-bowlby text-base text-[#fbbc05]">{formatCurrency(pot.poolSize)}</div>
                    </div>
                </div>
            </div>

            <div className="px-4 py-3">
                {/* Score */}
                <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className={`rounded-[12px] border-[2px] px-3 py-2 ${ledClass('red')}`}>
                        <div className="font-bangers text-[10px] uppercase tracking-wider text-team-red">Piratas</div>
                        <div className="font-bowlby text-2xl text-white">{pot.redScore}</div>
                        <div className="font-fredoka text-[10px] text-white/55">
                            Proyect. {pot.redProjected} · {pot.teamCounts.red} jug.
                        </div>
                    </div>
                    <div className={`rounded-[12px] border-[2px] px-3 py-2 ${ledClass('blue')}`}>
                        <div className="font-bangers text-[10px] uppercase tracking-wider text-team-blue">Fantasmas</div>
                        <div className="font-bowlby text-2xl text-white">{pot.blueScore}</div>
                        <div className="font-fredoka text-[10px] text-white/55">
                            Proyect. {pot.blueProjected} · {pot.teamCounts.blue} jug.
                        </div>
                    </div>
                </div>

                {/* Per-player payout */}
                <div className="rounded-[10px] border border-[#fbbc05]/30 bg-[#fbbc05]/5 px-3 py-2">
                    <div className="mb-1 font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]/85">
                        {pot.winner === 'red' ? 'Piratas ganan'
                            : pot.winner === 'blue' ? 'Fantasmas ganan'
                            : pot.winner === 'tie' ? 'Empate'
                            : 'Si gana'}
                    </div>
                    <div className="space-y-0.5 font-fredoka text-[12px] text-white/85">
                        <div className="flex justify-between">
                            <span className="text-team-red">Piratas ({pot.teamCounts.red} jug.)</span>
                            <span className="font-bowlby text-white">{formatCurrency(pot.perPlayerIfRedWins)} / jug.</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-team-blue">Fantasmas ({pot.teamCounts.blue} jug.)</span>
                            <span className="font-bowlby text-white">{formatCurrency(pot.perPlayerIfBlueWins)} / jug.</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ── SECTION C ────────────────────────────────────────────────────────────────

function SectionC({
    pot,
    userId,
    isProvisional,
}: {
    pot: PotCTotalViaje;
    userId: string | null;
    isProvisional: boolean;
}) {
    void userId;
    const top3 = pot.rankings.slice(0, 3);
    return (
        <section className={`${CARD_DARK} overflow-hidden`}>
            <div className="border-b border-[#31316b]/60 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">
                                Pot C
                            </span>
                            {isProvisional && (
                                <span className="rounded-full border border-[#fbbc05]/40 bg-[#fbbc05]/10 px-2 py-0.5 font-bangers text-[9px] uppercase tracking-wider text-[#fbbc05]/85">
                                    Provisional
                                </span>
                            )}
                        </div>
                        <div className="font-bangers text-lg uppercase tracking-wider text-white">
                            Total del Viaje
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="font-fredoka text-[10px] text-white/55">Pool</div>
                        <div className="font-bowlby text-base text-[#fbbc05]">{formatCurrency(pot.poolSize)}</div>
                    </div>
                </div>
                <div className="mt-1.5 font-fredoka text-[10px] text-white/55">
                    Ranking por Stableford acumulado
                    <span className="ml-2 text-[#fbbc05]/85 font-bangers uppercase tracking-wider">
                        1° {formatCurrency(pot.payouts.first)} · 2° {formatCurrency(pot.payouts.second)} · 3° {formatCurrency(pot.payouts.third)}
                    </span>
                </div>
            </div>

            <div className="divide-y divide-[#31316b]/30">
                {top3.map(r => <PotCRow key={r.playerId} r={r} isMe={false} />)}
                {top3.length === 0 && (
                    <div className="px-4 py-6 text-center font-fredoka italic text-white/40">Sin datos.</div>
                )}
            </div>

            {isProvisional && (
                <div className="border-t border-[#31316b]/40 bg-[#0a1322]/60 px-4 py-2 text-center font-fredoka text-[10px] italic text-white/50">
                    Resultados provisionales · cambia con cada ronda
                </div>
            )}
        </section>
    );
}

function PotCRow({ r, isMe }: { r: PotCRanking; isMe: boolean }) {
    const teamForAvatar: 'red' | 'blue' = r.team === 'blue' ? 'blue' : 'red';
    const teamColor = r.team === 'red' ? 'text-team-red' : r.team === 'blue' ? 'text-team-blue' : 'text-white';
    const isPaid = r.projectedPayout > 0;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 ${
            isMe ? 'bg-[#fbbc05]/10' : isPaid ? 'bg-[#fbbc05]/5' : ''
        }`}>
            <span className={`w-6 text-center font-bangers text-sm ${
                r.rank === 1 ? 'text-[#fbbc05]'
                : r.rank === 2 ? 'text-[#dde]'
                : r.rank === 3 ? 'text-[#caa278]'
                : 'text-white/45'
            }`}>{r.rank}</span>
            <Avatar name={r.playerName} team={teamForAvatar} size={28} className="shrink-0" />
            <span className={`flex-1 truncate font-bangers text-sm uppercase tracking-wider ${teamColor}`}>
                {r.playerName}
            </span>
            <div className="flex flex-col items-end leading-tight">
                <span className="font-bowlby text-base text-white">{r.score}</span>
                <span className="font-fredoka text-[10px] uppercase tracking-wider text-white/45">
                    pts
                </span>
                {isPaid && (
                    <span className="mt-0.5 font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]">
                        {formatCurrency(r.projectedPayout)}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── SECTION TOTAL — overall winnings per player across A+B+C ─────────────────

function SectionTotal({ summary, userId }: { summary: OverallSummary; userId: string | null }) {
    const standings = summary.standings;
    if (standings.length === 0) return null;
    const someoneWon = standings.some(s => s.total > 0);
    return (
        <section className={`${CARD_DARK} overflow-hidden`}>
            <div className="border-b border-[#31316b]/60 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">
                                Resumen
                            </span>
                            {summary.isProvisional && (
                                <span className="rounded-full border border-[#fbbc05]/40 bg-[#fbbc05]/10 px-2 py-0.5 font-bangers text-[9px] uppercase tracking-wider text-[#fbbc05]/85">
                                    Provisional
                                </span>
                            )}
                        </div>
                        <div className="font-bangers text-lg uppercase tracking-wider text-white">
                            Ganancias Totales
                        </div>
                    </div>
                    <div className="text-right shrink-0 font-fredoka text-[10px] text-white/55">
                        Pot A + B + C
                    </div>
                </div>
                <div className="mt-1.5 font-fredoka text-[10px] text-white/55">
                    Suma de Mejor del Día, Ryder Cup y Total del Viaje
                </div>
            </div>

            {!someoneWon ? (
                <div className="px-4 py-6 text-center font-fredoka italic text-white/40">
                    Aún sin ganancias.
                </div>
            ) : (
                <div className="divide-y divide-[#31316b]/30">
                    {standings.map(s => (
                        <TotalRow key={s.playerId} s={s} isMe={s.playerId === userId} />
                    ))}
                </div>
            )}

            {summary.isProvisional && someoneWon && (
                <div className="border-t border-[#31316b]/40 bg-[#0a1322]/60 px-4 py-2 text-center font-fredoka text-[10px] italic text-white/50">
                    Resultados provisionales · cambia con cada ronda
                </div>
            )}
        </section>
    );
}

function TotalRow({ s, isMe }: { s: OverallStanding; isMe: boolean }) {
    const teamForAvatar: 'red' | 'blue' = s.team === 'blue' ? 'blue' : 'red';
    const teamColor = s.team === 'red' ? 'text-team-red' : s.team === 'blue' ? 'text-team-blue' : 'text-white';
    const rankColor = s.rank === 1 ? 'text-[#fbbc05]'
        : s.rank === 2 ? 'text-[#dde]'
        : s.rank === 3 ? 'text-[#caa278]'
        : 'text-white/45';
    const hasWon = s.total > 0;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 ${
            isMe ? 'bg-[#fbbc05]/10' : hasWon && s.rank <= 3 ? 'bg-[#fbbc05]/5' : ''
        }`}>
            <span className={`w-6 text-center font-bangers text-sm ${rankColor}`}>{s.rank}</span>
            <Avatar name={s.playerName} team={teamForAvatar} size={28} className="shrink-0" />
            <div className="min-w-0 flex-1">
                <div className={`truncate font-bangers text-sm uppercase tracking-wider ${teamColor}`}>
                    {s.playerName}
                </div>
                <div className="font-fredoka text-[9px] uppercase tracking-wider text-white/40">
                    A {formatCurrency(s.potA)} · B {formatCurrency(s.potB)} · C {formatCurrency(s.potC)}
                </div>
            </div>
            <div className="ml-2 flex flex-col items-end leading-tight">
                <span className="font-bowlby text-base text-[#fbbc05]">{formatCurrency(s.total)}</span>
                <span className="font-fredoka text-[9px] uppercase tracking-wider text-white/45">total</span>
            </div>
        </div>
    );
}
