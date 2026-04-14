'use client';

import { useMemo, useState } from 'react';
import { useMyEvents } from '@/hooks/useEvents';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { PullToRefresh } from '@/components/PullToRefresh';

type Tab = 'ryder' | 'stableford' | 'neto';

export default function LeaderboardPage() {
    const { events, isLoading: eventsLoading } = useMyEvents();
    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';
    const { data, isLoading, refetch } = useLeaderboard(eventId);

    const [tab, setTab] = useState<Tab>('ryder');

    if (eventsLoading || (eventId && isLoading && !data)) {
        return <div className="p-8 text-center text-gray-500">Cargando…</div>;
    }
    if (!activeEvent) {
        return <div className="p-8 text-center text-gray-500">No hay evento activo.</div>;
    }
    if (!data) {
        return <div className="p-8 text-center text-gray-500">Sin datos todavía.</div>;
    }

    const redStanding = data.ryderStandings.find(s => s.team === 'red');
    const blueStanding = data.ryderStandings.find(s => s.team === 'blue');
    const redPts = redStanding?.matchPointsCumulative ?? 0;
    const bluePts = blueStanding?.matchPointsCumulative ?? 0;
    const redProj = redStanding?.matchPointsProjected ?? 0;
    const blueProj = blueStanding?.matchPointsProjected ?? 0;

    return (
        <PullToRefresh onRefresh={refetch}>
            <div className="min-h-screen bg-gray-50 pb-24">
                {/* Hero score */}
                <header className="bg-white border-b">
                    <div className="max-w-3xl mx-auto px-4 py-6">
                        <h1 className="text-xl font-bold text-center mb-4">{data.eventName}</h1>
                        <div className="flex items-center justify-around">
                            <div className="text-center">
                                <div className="text-sm font-medium text-team-red">Red</div>
                                <div className="text-5xl font-bold text-team-red">{formatPts(redPts)}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Proj. <span className="font-semibold text-team-red">{formatPts(redProj)}</span>
                                </div>
                            </div>
                            <div className="text-2xl text-gray-400">vs</div>
                            <div className="text-center">
                                <div className="text-sm font-medium text-team-blue">Blue</div>
                                <div className="text-5xl font-bold text-team-blue">{formatPts(bluePts)}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Proj. <span className="font-semibold text-team-blue">{formatPts(blueProj)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-[11px] text-gray-400 text-center mt-3">
                            Actual = matches decididos · Proyectado = decididos + líder en juego + 0.5/0.5 sin empezar
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="max-w-3xl mx-auto px-4 sticky top-0 bg-gray-50 border-b z-10">
                    <div className="flex gap-1 py-2">
                        <TabButton active={tab === 'ryder'} onClick={() => setTab('ryder')}>Ryder Cup</TabButton>
                        <TabButton active={tab === 'stableford'} onClick={() => setTab('stableford')}>Stableford</TabButton>
                        <TabButton active={tab === 'neto'} onClick={() => setTab('neto')}>Neto</TabButton>
                    </div>
                </div>

                <main className="max-w-3xl mx-auto px-4 py-4">
                    {tab === 'ryder' && <RyderTab data={data} />}
                    {tab === 'stableford' && <StablefordTab data={data} />}
                    {tab === 'neto' && <NetoTab data={data} />}
                </main>
            </div>
        </PullToRefresh>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {children}
        </button>
    );
}

function RyderTab({ data }: { data: ReturnType<typeof useLeaderboard>['data'] }) {
    if (!data) return null;
    return (
        <div className="space-y-4">
            {data.rounds.map(round => (
                <div key={round.roundId} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="text-xs uppercase text-gray-500 font-medium">Round {round.roundNumber}</div>
                            <div className="font-semibold">{round.courseName}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm">
                                <span className="text-team-red font-bold">{formatPts(round.teamPoints.red)}</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-team-blue font-bold">{formatPts(round.teamPoints.blue)}</span>
                            </div>
                            <div className="text-[11px] text-gray-500">
                                proj. {formatPts(round.teamPointsProjected.red)} · {formatPts(round.teamPointsProjected.blue)}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">{round.state}</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {round.flightSummaries.map(f => (
                            <div key={f.flightId} className="border-t pt-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="font-medium">Grupo {f.flightNumber}</div>
                                    <div>
                                        <span className="text-team-red">{f.redPoints}</span>
                                        <span className="text-gray-400 mx-1">·</span>
                                        <span className="text-team-blue">{f.bluePoints}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-1 mt-1 text-xs">
                                    {f.matches.map(m => (
                                        <div key={m.matchType} className="bg-gray-50 rounded px-2 py-1">
                                            <div className="text-gray-500">{matchLabel(m.matchType)}</div>
                                            <div className={`font-medium ${winnerColor(m.winner)}`}>{m.finalStatus}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {round.flightSummaries.length === 0 && (
                            <div className="text-sm text-gray-400 italic">No hay flights todavía</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function StablefordTab({ data }: { data: ReturnType<typeof useLeaderboard>['data'] }) {
    if (!data) return null;
    const standings = [...data.stablefordStandings].sort(
        (a, b) => b.stablefordCumulative - a.stablefordCumulative
    );
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 text-xs">
                    <tr>
                        <th className="px-3 py-2 text-left w-10">#</th>
                        <th className="px-3 py-2 text-left">Jugador</th>
                        <th className="px-3 py-2 text-center">HCP</th>
                        <th className="px-3 py-2 text-right">Pts</th>
                        <th className="px-3 py-2 text-center">Rondas</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => (
                        <tr key={s.playerId} className="border-t">
                            <td className="px-3 py-2 font-medium">{i + 1}</td>
                            <td className="px-3 py-2">
                                <span className={s.team === 'red' ? 'text-team-red' : s.team === 'blue' ? 'text-team-blue' : ''}>
                                    {s.playerName}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">{s.handicapIndex}</td>
                            <td className="px-3 py-2 text-right font-bold">{s.stablefordCumulative}</td>
                            <td className="px-3 py-2 text-center text-gray-500">{s.roundsPlayed}</td>
                        </tr>
                    ))}
                    {standings.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-400 italic">
                                Sin puntos todavía
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function NetoTab({ data }: { data: ReturnType<typeof useLeaderboard>['data'] }) {
    if (!data) return null;
    const byName = new Map(data.stablefordStandings.map(s => [s.playerId, s.playerName]));
    return (
        <div className="space-y-4">
            {data.rounds.map(round => {
                const pots = data.netoPotsByRound[round.roundId] ?? [];
                return (
                    <div key={round.roundId} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="mb-2">
                            <div className="text-xs uppercase text-gray-500 font-medium">Round {round.roundNumber}</div>
                            <div className="font-semibold">{round.courseName}</div>
                        </div>
                        {pots.length === 0 ? (
                            <div className="text-sm text-gray-400 italic">Sin pots declarados</div>
                        ) : (
                            <div className="space-y-2">
                                {pots.map(p => (
                                    <div key={p.id} className="border-t pt-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="font-medium">Pot ${p.potAmountUsd}</div>
                                            <div className="text-xs text-gray-500">
                                                {p.winners.length === 0
                                                    ? 'Sin ganador'
                                                    : p.winners
                                                        .sort((a, b) => a.rank - b.rank)
                                                        .map(w => `#${w.rank} ${byName.get(w.playerId) ?? '?'}`)
                                                        .join(' · ')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

const formatPts = (n: number): string => {
    // Show .5 only when fractional — keep hero nice and clean otherwise
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

const matchLabel = (t: MatchSummary['matchType']): string => {
    if (t === 'singles1') return 'Singles 1';
    if (t === 'singles2') return 'Singles 2';
    return 'Fourball';
};

const winnerColor = (w: 'red' | 'blue' | null): string => {
    if (w === 'red') return 'text-team-red';
    if (w === 'blue') return 'text-team-blue';
    return 'text-gray-600';
};

// Types for MatchSummary (re-exported from hook)
type MatchSummary = {
    matchType: 'singles1' | 'singles2' | 'fourball';
    winner: 'red' | 'blue' | null;
    finalStatus: string;
};
