'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useMyEvents } from '@/hooks/useEvents';
import { usePersonalStats, useTournamentSettlement } from '@/hooks/useBetting';
import { useLeaderboard, Match } from '@/hooks/useLeaderboard';
import { DashboardBanner } from '@/components/betting/DashboardBanner';
import { MatchBettingCard } from '@/components/betting/MatchBettingCard';
import { BettingDetailSheet } from '@/components/betting/BettingDetailSheet';
import { formatCurrency } from '@/lib/currency';

export default function ApuestasClient() {
    const { user } = useAuth();
    const { events, isLoading: eventsLoading } = useMyEvents();

    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';

    const { data: stats, isLoading: statsLoading } = usePersonalStats(eventId);
    const { data: leaderboard, isLoading: matchesLoading } = useLeaderboard(eventId);
    const { data: settlement, isLoading: settlementLoading } = useTournamentSettlement(eventId);

    const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'settlement'>('overview');
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const isLoading = eventsLoading || (!!eventId && statsLoading) || (!!eventId && matchesLoading) || (!!eventId && settlementLoading);

    if (!user) {
        return <div className="p-4 text-center text-gray-500">Por favor, inicia sesión para acceder a las apuestas.</div>;
    }

    if (!activeEvent && !isLoading) {
        return <div className="p-4 text-center text-gray-500">No hay eventos activos para apostar.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Mi Cuenta Dashboard Banner */}
            <DashboardBanner stats={stats || undefined} isLoading={isLoading} />

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mt-4 px-2">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                        ? 'border-team-blue text-team-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Partidas
                </button>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leaderboard'
                        ? 'border-team-blue text-team-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Clasificación
                </button>
                <button
                    onClick={() => setActiveTab('settlement')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settlement'
                        ? 'border-team-blue text-team-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    Liquidación
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 p-4 pb-24 overflow-y-auto">
                {activeTab === 'overview' && (
                    <div className="flex flex-col gap-1">
                        {!leaderboard ? (
                            <p className="text-center text-slate-500">Cargando partidas disponibles...</p>
                        ) : leaderboard.matches.length === 0 ? (
                            <p className="text-center text-slate-500">No hay partidas configuradas.</p>
                        ) : (
                            leaderboard.matches.map(match => {
                                const userBet = stats?.bets?.find(b => b.flightId === match.flightId && b.segmentType === match.segmentType);
                                return (
                                    <MatchBettingCard
                                        key={`${match.flightId}-${match.segmentType}`}
                                        match={match}
                                        userBet={userBet}
                                        onClick={() => setSelectedMatch(match)}
                                    />
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'leaderboard' && (
                    <div className="flex flex-col gap-2">
                        {!settlement ? (
                            <p className="text-center text-slate-500">Cargando clasificación...</p>
                        ) : settlement.balances.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">Aún no hay apuestas registradas para este evento.</p>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                {settlement.balances.map((player, idx) => (
                                    <div key={player.id} className={`flex justify-between items-center p-4 ${idx !== settlement.balances.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 text-center text-sm font-bold text-slate-400">
                                                {idx + 1}
                                            </div>
                                            <div className="font-medium text-slate-800">
                                                {player.name} {player.id === user?.id ? '(Tú)' : ''}
                                            </div>
                                        </div>
                                        <div className={`font-bold ${player.balance > 0 ? 'text-green-500' : player.balance < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {player.balance > 0 ? '+' : ''}{formatCurrency(player.balance)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {settlement && settlement.isPartial && (
                            <p className="text-xs text-center text-slate-400 mt-2">
                                * Resultados parciales. Basado solo en partidas finalizadas.
                            </p>
                        )}
                    </div>
                )}

                {activeTab === 'settlement' && (
                    <div className="flex flex-col gap-3">
                        {!settlement ? (
                            <p className="text-center text-slate-500">Cargando liquidación...</p>
                        ) : settlement.transfers.length === 0 ? (
                            <div className="bg-white rounded-xl p-8 border border-slate-200 text-center shadow-sm">
                                <div className="text-4xl mb-2">🤝</div>
                                <h3 className="font-bold text-slate-700">Nada que liquidar</h3>
                                <p className="text-sm text-slate-500 mt-1">Todos están a mano o no hay apuestas cerradas.</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm mb-2 shadow-sm">
                                    <span className="font-bold">Sistema de Honor:</span> El aplicativo calcula la forma más eficiente de saldar las deudas entre todos.
                                </div>

                                {settlement.transfers.map((t, idx) => {
                                    const fromName = settlement.balances.find(b => b.id === t.from)?.name || 'Desconocido';
                                    const toName = settlement.balances.find(b => b.id === t.to)?.name || 'Desconocido';
                                    const isMeFrom = t.from === user?.id;
                                    const isMeTo = t.to === user?.id;

                                    return (
                                        <div
                                            key={idx}
                                            className={`bg-white rounded-xl shadow-sm border p-4 ${isMeFrom ? 'border-red-300 bg-red-50' : isMeTo ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm font-medium text-slate-600">
                                                    <span className={isMeFrom ? 'font-bold text-red-600' : ''}>{fromName}</span>
                                                    <span className="mx-2">debe pagar a</span>
                                                    <span className={isMeTo ? 'font-bold text-green-600' : ''}>{toName}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end border-t border-slate-100/50 pt-2 mt-2">
                                                <div className="text-xs text-slate-400">Transferencia sugerida</div>
                                                <div className="font-black text-lg text-slate-800">
                                                    {formatCurrency(t.amount)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Slide-up Detail Sheet */}
            {selectedMatch && (
                <BettingDetailSheet
                    eventId={eventId}
                    match={selectedMatch}
                    onClose={() => setSelectedMatch(null)}
                />
            )}
        </div>
    );
}
