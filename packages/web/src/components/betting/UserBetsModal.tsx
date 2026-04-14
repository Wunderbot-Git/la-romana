'use client';

import { useUserStats, PersonalStats } from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';

const SEGMENT_LABELS: Record<string, string> = {
    singles1: 'Individual 1',
    singles2: 'Individual 2',
    fourball: 'Mejor Bola',
    scramble: 'Scramble',
};

const OUTCOME_LABELS: Record<string, string> = {
    A: 'Cariñositos',
    B: 'Pitufos',
    AS: 'Empate',
};

const GENERAL_BET_LABELS: Record<string, string> = {
    tournament_winner: 'Ganador Torneo',
    mvp: 'MVP',
    worst_player: 'Peor Jugador',
    exact_score: 'Marcador Exacto',
};

function outcomeColor(outcome: string) {
    if (outcome === 'A') return 'text-team-red';
    if (outcome === 'B') return 'text-team-blue';
    return 'text-forest-deep/70';
}

function getGeneralOutcomeColor(betType: string, outcome: string): string {
    if (betType === 'tournament_winner') {
        if (outcome === 'Cariñositos') return 'text-team-red';
        if (outcome === 'Pitufos') return 'text-team-blue';
    }
    return 'text-forest-deep';
}

interface Props {
    eventId: string;
    userId: string;
    userName: string;
    onClose: () => void;
}

export function UserBetsModal({ eventId, userId, userName, onClose }: Props) {
    const { data: stats, isLoading } = useUserStats(eventId, userId);

    return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-cream rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 pb-24"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bangers text-forest-deep">Apuestas de {userName}</h2>
                    <button onClick={onClose} className="text-forest-deep/40 text-2xl font-bold px-2">x</button>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-forest-deep/40 font-fredoka text-base">Cargando...</div>
                ) : !stats || (!stats.bets?.length && !stats.generalBets?.length) ? (
                    <div className="text-center py-8 text-forest-deep/40 font-fredoka text-base">No tiene apuestas registradas.</div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-forest-deep/5 rounded-lg p-3">
                                <div className="text-xs font-bangers text-forest-deep/40 uppercase">Apostado</div>
                                <div className="text-base font-fredoka font-bold text-forest-deep">{formatCurrency(stats.wagered)}</div>
                            </div>
                            <div className="bg-forest-deep/5 rounded-lg p-3">
                                <div className="text-xs font-bangers text-forest-deep/40 uppercase">
                                    {stats.realizedNet !== 0 ? 'Ganancia / Pérdida' : 'Ganancia potencial'}
                                </div>
                                <div className={`text-base font-fredoka font-bold ${stats.realizedNet !== 0 ? (stats.realizedNet > 0 ? 'text-green-600' : 'text-team-red') : 'text-gold-border'}`}>
                                    {stats.realizedNet !== 0
                                        ? `${stats.realizedNet > 0 ? '+' : ''}${formatCurrency(stats.realizedNet)}`
                                        : formatCurrency(stats.potential)}
                                </div>
                            </div>
                        </div>

                        {/* General Bets */}
                        {stats.generalBets && stats.generalBets.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bangers text-forest-deep/50 uppercase tracking-wider mb-2">Apuestas Generales</h3>
                                <div className="flex flex-col gap-2">
                                    {stats.generalBets.map((bet: any, i: number) => {
                                        const label = bet.displayOutcome || bet.pickedOutcome;
                                        const color = getGeneralOutcomeColor(bet.betType, label);
                                        const statusColor = bet.status === 'closed'
                                            ? (bet.realizedPayout > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')
                                            : 'bg-white border-gold-border/20';
                                        return (
                                            <div key={i} className={`flex justify-between items-center px-3 py-2.5 rounded-lg border ${statusColor}`}>
                                                <div>
                                                    <div className="text-xs font-bangers text-forest-deep/40 uppercase">
                                                        {GENERAL_BET_LABELS[bet.betType] || bet.betType}
                                                    </div>
                                                    <div className={`text-base font-fredoka font-bold ${color}`}>
                                                        {label}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-fredoka text-forest-deep/50">{formatCurrency(bet.amount)}</div>
                                                    {bet.status === 'closed' && (
                                                        <div className={`text-sm font-fredoka font-bold ${bet.realizedPayout > 0 ? 'text-green-600' : 'text-team-red'}`}>
                                                            {bet.realizedPayout > 0 ? '+' : ''}{formatCurrency(bet.realizedPayout - bet.amount)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Match bets grouped by flight */}
                        {stats.bets && stats.bets.length > 0 && (() => {
                            const groups: Record<string, { name: string; bets: any[] }> = {};
                            stats.bets.forEach((bet: any) => {
                                const key = bet.flightId || 'unknown';
                                if (!groups[key]) groups[key] = { name: bet.flightName || 'Partido', bets: [] };
                                groups[key].bets.push(bet);
                            });
                            return Object.entries(groups).map(([flightId, group]) => (
                                <div key={flightId}>
                                    <h3 className="text-sm font-bangers text-forest-deep/50 uppercase tracking-wider mb-2">{group.name}</h3>
                                    <div className="flex flex-col gap-2">
                                        {group.bets.map((bet: any, i: number) => {
                                            const outcomeLabel = OUTCOME_LABELS[bet.pickedOutcome] || bet.pickedOutcome;
                                            const oColor = outcomeColor(bet.pickedOutcome);
                                            const statusColor = bet.status === 'closed'
                                                ? (bet.realizedPayout > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')
                                                : 'bg-white border-gold-border/20';
                                            return (
                                                <div key={i} className={`flex justify-between items-center px-3 py-2.5 rounded-lg border ${statusColor} ${bet.isAdditional ? 'border-l-4 border-l-gold-border' : ''}`}>
                                                    <div>
                                                        <div className="text-xs font-bangers text-forest-deep/40 uppercase">
                                                            {SEGMENT_LABELS[bet.segmentType] || bet.segmentType}
                                                            {bet.isAdditional && <span className="text-gold-border ml-1">+</span>}
                                                        </div>
                                                        <div className={`text-base font-fredoka font-bold ${oColor}`}>
                                                            {outcomeLabel}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-fredoka text-forest-deep/50">{formatCurrency(bet.amount)}</div>
                                                        {bet.status === 'closed' && (
                                                            <div className={`text-sm font-fredoka font-bold ${bet.realizedPayout > 0 ? 'text-green-600' : 'text-team-red'}`}>
                                                                {bet.realizedPayout > 0 ? '+' : ''}{formatCurrency(bet.realizedPayout - bet.amount)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
