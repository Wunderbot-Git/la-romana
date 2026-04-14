'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useMyEvents } from '@/hooks/useEvents';
import { Bet, usePersonalStats, useTournamentSettlement, useGeneralBetPools, useMyGeneralBets } from '@/hooks/useBetting';
import { useLeaderboard, Match } from '@/hooks/useLeaderboard';
import { DashboardBanner } from '@/components/betting/DashboardBanner';
import { FlightBettingPanel } from '@/components/betting/FlightBettingPanel';
import { GeneralBetsSection } from '@/components/betting/GeneralBetsSection';
import { UserBetsModal } from '@/components/betting/UserBetsModal';
import { AdditionalBetsSection } from '@/components/betting/AdditionalBetsSection';
import { formatCurrency } from '@/lib/currency';
import { api } from '@/lib/api';

const MandatoryBetWizard = dynamic(() => import('@/components/betting/MandatoryBetWizard').then(m => ({ default: m.MandatoryBetWizard })), { ssr: false });

export default function ApuestasClient() {
    const { user } = useAuth();
    const { events, isLoading: eventsLoading } = useMyEvents();

    const activeEvent = useMemo(() => {
        if (!events || events.length === 0) return null;
        return events.find(e => e.status === 'live') || events[0];
    }, [events]);

    const eventId = activeEvent?.id || '';

    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = usePersonalStats(eventId);
    const { data: leaderboard, isLoading: matchesLoading } = useLeaderboard(eventId);
    const { data: settlement, isLoading: settlementLoading } = useTournamentSettlement(eventId);
    const { data: generalPools, isLoading: generalPoolsLoading, refetch: refetchPools } = useGeneralBetPools(eventId);
    const { data: myGeneralBets, isLoading: myGeneralBetsLoading, refetch: refetchMyBets } = useMyGeneralBets(eventId);

    const [activeTab, setActiveTab] = useState<'general' | 'overview' | 'leaderboard' | 'settlement'>('general');
    const [betFilter, setBetFilter] = useState<'all' | 'placed' | 'pending'>('all');
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [wizardDismissed, setWizardDismissed] = useState(false);

    const isLoading = eventsLoading || (!!eventId && statsLoading) || (!!eventId && matchesLoading) || (!!eventId && settlementLoading);

    // Check mandatory bet status and show wizard if incomplete
    const checkMandatoryStatus = useCallback(async () => {
        if (!eventId || !user || wizardDismissed) return;
        try {
            const status = await api.get<{ total: number; placed: number }>(`/events/${eventId}/bets/mandatory-status`);
            if (status.placed < status.total) {
                setShowWizard(true);
            }
        } catch {
            // Silently ignore — don't block the page if endpoint fails
        }
    }, [eventId, user, wizardDismissed]);

    useEffect(() => {
        checkMandatoryStatus();
    }, [checkMandatoryStatus]);

    if (!user) {
        return <div className="p-4 text-center text-cream/60 font-fredoka">Por favor, inicia sesión para acceder a las apuestas.</div>;
    }

    if (!activeEvent && !isLoading) {
        return <div className="p-4 text-center text-cream/60 font-fredoka">No hay eventos activos para apostar.</div>;
    }

    return (
        <div className="flex flex-col min-h-screen pb-20">
            {/* Mandatory Bet Wizard */}
            {showWizard && eventId && (
                <MandatoryBetWizard
                    eventId={eventId}
                    onComplete={() => {
                        setShowWizard(false);
                        setWizardDismissed(true);
                        // Refresh data after all bets placed
                        refetchStats();
                        refetchPools();
                        refetchMyBets();
                    }}
                    onDismiss={() => {
                        setShowWizard(false);
                        setWizardDismissed(true);
                    }}
                />
            )}

{/* Dashboard Banner */}
            <DashboardBanner stats={stats || undefined} isLoading={isLoading} />

            {/* Tab Navigation */}
            <div className="flex border-b-2 border-gold-border/30 mt-4 px-2 bg-forest-deep/50">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-3 text-sm font-bangers border-b-2 transition-colors ${activeTab === 'general'
                        ? 'border-gold-border text-gold-light'
                        : 'border-transparent text-cream/40 hover:text-cream/60 hover:border-gold-border/30'
                        }`}
                >
                    General
                </button>
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-3 text-sm font-bangers border-b-2 transition-colors ${activeTab === 'overview'
                        ? 'border-gold-border text-gold-light'
                        : 'border-transparent text-cream/40 hover:text-cream/60 hover:border-gold-border/30'
                        }`}
                >
                    Partidos
                </button>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`flex-1 py-3 text-sm font-bangers border-b-2 transition-colors ${activeTab === 'leaderboard'
                        ? 'border-gold-border text-gold-light'
                        : 'border-transparent text-cream/40 hover:text-cream/60 hover:border-gold-border/30'
                        }`}
                >
                    Clasificación
                </button>
                <button
                    onClick={() => setActiveTab('settlement')}
                    className={`flex-1 py-3 text-sm font-bangers border-b-2 transition-colors ${activeTab === 'settlement'
                        ? 'border-gold-border text-gold-light'
                        : 'border-transparent text-cream/40 hover:text-cream/60 hover:border-gold-border/30'
                        }`}
                >
                    Liquidación
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-4 pb-24 overflow-y-auto">
                {/* Bet filter */}
                {(activeTab === 'general' || activeTab === 'overview') && (
                    <div className="flex gap-2 mb-3">
                        {([['all', 'Todas'], ['pending', 'Pendientes'], ['placed', 'Apostadas']] as const).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setBetFilter(key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bangers transition-colors ${betFilter === key
                                        ? 'gold-button text-[#1e293b] translate-y-1'
                                        : 'cartoon-card py-1.5 text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'general' && (
                    <GeneralBetsSection
                        eventId={eventId}
                        pools={generalPools || []}
                        myBets={myGeneralBets || []}
                        onBetPlaced={() => { refetchStats(); refetchPools(); refetchMyBets(); }}
                        filter={betFilter}
                        canChange={!leaderboard?.matches.some(m => m.currentHole > 0 || m.status === 'completed')}
                    />
                )}

                {activeTab === 'overview' && (
                    <div className="flex flex-col gap-5">
                        {!leaderboard ? (
                            <p className="text-center text-cream/50 font-fredoka">Cargando partidas disponibles...</p>
                        ) : leaderboard.matches.length === 0 ? (
                            <p className="text-center text-cream/50 font-fredoka">No hay partidas configuradas.</p>
                        ) : (() => {
                            const flightGroups: Record<string, { name: string; matches: Match[] }> = {};
                            leaderboard.matches
                                .filter(match => {
                                    if (betFilter === 'all') return true;
                                    const hasBet = !!stats?.bets?.find(b => b.flightId === match.flightId && b.segmentType === match.segmentType);
                                    return betFilter === 'placed' ? hasBet : !hasBet;
                                })
                                .forEach(match => {
                                    if (!flightGroups[match.flightId]) {
                                        flightGroups[match.flightId] = { name: match.flightName, matches: [] };
                                    }
                                    flightGroups[match.flightId].matches.push(match);
                                });

                            return Object.entries(flightGroups).map(([flightId, group]) => {
                                const betsMap: Record<string, Bet | undefined> = {};
                                const additionalBetsMap: Record<string, Bet | undefined> = {};
                                group.matches.forEach(m => {
                                    betsMap[m.segmentType] = stats?.bets?.find(b => b.flightId === m.flightId && b.segmentType === m.segmentType && !b.isAdditional);
                                    additionalBetsMap[m.segmentType] = stats?.bets?.find(b => b.flightId === m.flightId && b.segmentType === m.segmentType && b.isAdditional);
                                });

                                return (
                                    <FlightBettingPanel
                                        key={flightId}
                                        eventId={eventId}
                                        flightName={group.name}
                                        matches={group.matches}
                                        userBets={betsMap}
                                        additionalBets={additionalBetsMap}
                                        onBetsPlaced={() => { refetchStats(); refetchPools(); refetchMyBets(); }}
                                    />
                                );
                            });
                        })()}

                        {/* Additional bets for live matches */}
                        {leaderboard && (() => {
                            const liveMatches = leaderboard.matches.filter(m =>
                                m.currentHole > 0 && m.status !== 'completed' &&
                                !m.matchStatus.includes('Won') && !m.matchStatus.includes('Lost') && !m.matchStatus.includes('&')
                            );
                            const existingAdditionalKeys = new Set(
                                stats?.bets?.filter(b => b.isAdditional).map(b => `${b.flightId}:${b.segmentType}`) || []
                            );
                            return liveMatches.length > 0 ? (
                                <AdditionalBetsSection
                                    eventId={eventId}
                                    matches={liveMatches}
                                    onBetPlaced={() => { refetchStats(); refetchPools(); refetchMyBets(); }}
                                    betAmount={5000}
                                    existingAdditionalBets={existingAdditionalKeys}
                                />
                            ) : null;
                        })()}
                    </div>
                )}

                {activeTab === 'leaderboard' && (
                    <div className="flex flex-col gap-2">
                        {!settlement ? (
                            <p className="text-center text-cream/50 font-fredoka">Cargando clasificación...</p>
                        ) : settlement.balances.length === 0 ? (
                            <p className="text-center text-cream/50 py-8 font-fredoka">Aún no hay apuestas registradas para este evento.</p>
                        ) : (
                            <div className="bg-white thick-border rounded-2xl shadow-none overflow-hidden">
                                {settlement.balances.map((player, idx) => (
                                    <div
                                        key={player.id}
                                        className={`flex justify-between items-center p-4 cursor-pointer hover:bg-gold-light/10 transition-colors ${idx !== settlement.balances.length - 1 ? 'border-b border-gold-border/20' : ''}`}
                                        onClick={() => setSelectedUser({ id: player.id, name: player.name })}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 text-center text-sm font-bangers text-gold-border">
                                                {idx + 1}
                                            </div>
                                            <div className="font-fredoka font-medium text-forest-deep underline decoration-forest-deep/20 underline-offset-2">
                                                {player.name} {player.id === user?.id ? '(Tú)' : ''}
                                            </div>
                                        </div>
                                        <div className={`font-bangers text-lg ${player.balance > 0 ? 'text-green-600' : player.balance < 0 ? 'text-team-red' : 'text-forest-deep/40'}`}>
                                            {player.balance > 0 ? '+' : ''}{formatCurrency(player.balance)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {settlement && settlement.isPartial && (
                            <p className="text-xs text-center text-cream/40 mt-2 font-fredoka">
                                * Resultados parciales. Basado solo en partidas finalizadas.
                            </p>
                        )}
                    </div>
                )}

                {activeTab === 'settlement' && (
                    <div className="flex flex-col gap-3">
                        {!settlement ? (
                            <p className="text-center text-cream/50 font-fredoka">Cargando liquidación...</p>
                        ) : settlement.transfers.length === 0 ? (
                            <div className="bg-white thick-border rounded-2xl p-8 text-center shadow-none">
                                <h3 className="font-bangers text-forest-deep">Nada que liquidar</h3>
                                <p className="text-sm text-forest-deep/60 mt-1 font-fredoka">Todos están a mano o no hay apuestas cerradas.</p>
                            </div>
                        ) : (
                            <>
                                <div className="thick-border bg-[#ffd700] text-[#1e293b] p-3 rounded-2xl text-sm mb-2 shadow-none font-fredoka">
                                    <span className="font-bangers">Sistema de Honor:</span> El aplicativo calcula la forma más eficiente de saldar las deudas entre todos.
                                </div>

                                {settlement.transfers.map((t, idx) => {
                                    const fromName = settlement.balances.find(b => b.id === t.from)?.name || 'Desconocido';
                                    const toName = settlement.balances.find(b => b.id === t.to)?.name || 'Desconocido';
                                    const isMeFrom = t.from === user?.id;
                                    const isMeTo = t.to === user?.id;

                                    return (
                                        <div
                                            key={idx}
                                            className={`bg-white thick-border rounded-2xl shadow-none p-4 ${isMeFrom ? 'border-team-red bg-red-50' : isMeTo ? 'border-green-500 bg-green-50' : ''}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm font-fredoka font-medium text-forest-deep">
                                                    <span className={isMeFrom ? 'font-bold text-team-red' : ''}>{fromName}</span>
                                                    <span className="mx-2">debe pagar a</span>
                                                    <span className={isMeTo ? 'font-bold text-green-600' : ''}>{toName}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end border-t border-gold-border/20 pt-2 mt-2">
                                                <div className="text-xs text-forest-deep/40 font-fredoka">Transferencia sugerida</div>
                                                <div className="font-bangers text-lg text-forest-deep">
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

            {selectedUser && (
                <UserBetsModal
                    eventId={eventId}
                    userId={selectedUser.id}
                    userName={selectedUser.name}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
}
