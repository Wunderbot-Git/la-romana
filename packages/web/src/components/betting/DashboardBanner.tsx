'use client';

import { useState } from 'react';
import { PersonalStats } from '@/hooks/useBetting';
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

interface Props {
    stats?: PersonalStats;
    isLoading: boolean;
}

export function DashboardBanner({ stats, isLoading }: Props) {
    const [showBreakdown, setShowBreakdown] = useState(false);

    if (isLoading || !stats) {
        return (
            <div className="bg-[#1a1a3e] text-white p-4 mx-4 mt-4 rounded-xl shadow-lg gold-border animate-pulse h-32">
                ...
            </div>
        );
    }

    const hasBets = stats.wagered > 0;

    // Get open bets with potential > 0 for breakdown
    const openBets = (stats.bets || []).filter((b: any) => b.status === 'open' && b.potentialPayout > 0);

    return (
        <div className="bg-[#1a1a3e] text-white p-5 mx-4 mt-4 rounded-xl shadow-lg gold-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-border opacity-10 rounded-full blur-2xl -mt-10 -mr-10"></div>

            <h2 className="text-xl font-bangers mb-4 flex items-center gap-2 text-white">
                Mi Cuenta
            </h2>

            {!hasBets ? (
                <div className="text-center text-white/60 text-sm py-4 italic font-fredoka">
                    Aún no has apostado en ningún partido.
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-2 text-center mb-3">
                        <div className="bg-white/10 rounded-lg p-2 border border-gold-border/20">
                            <div className="text-[10px] text-white/60 uppercase tracking-wider mb-1 font-bangers">Total Apostado</div>
                            <div className="text-sm font-fredoka font-semibold text-white">{formatCurrency(stats.wagered)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-2 border border-gold-border/20">
                            <div className="text-[10px] text-white/60 uppercase tracking-wider mb-1 font-bangers">
                                {stats.realizedNet !== 0 ? 'Ganancia / Pérdida' : 'Apuestas'}
                            </div>
                            <div className={`text-sm font-fredoka font-semibold ${stats.realizedNet > 0 ? 'text-green-400' : stats.realizedNet < 0 ? 'text-team-red' : 'text-white'}`}>
                                {stats.realizedNet !== 0
                                    ? `${stats.realizedNet > 0 ? '+' : ''}${formatCurrency(stats.realizedNet)}`
                                    : (() => {
                                        const matchCount = stats.bets?.length || 0;
                                        const generalCount = stats.generalBetsCount || 0;
                                        const parts: string[] = [];
                                        if (matchCount > 0) parts.push(`${matchCount} partido${matchCount !== 1 ? 's' : ''}`);
                                        if (generalCount > 0) parts.push(`${generalCount} general${generalCount !== 1 ? 'es' : ''}`);
                                        return parts.length > 0
                                            ? parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <br />}</span>)
                                            : '0 apuestas';
                                    })()
                                }
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => openBets.length > 0 && setShowBreakdown(!showBreakdown)}
                        className="w-full bg-gold-border/15 border border-gold-border/40 rounded-lg p-3 flex items-center justify-between"
                    >
                        <div className="text-[10px] text-gold-light/80 uppercase tracking-wider font-bangers text-left">
                            Ganancia potencial
                            <span className="text-[9px] text-gold-light/40 normal-case tracking-normal ml-1">
                                (si ganas todas)
                            </span>
                        </div>
                        <div className="text-lg font-bangers text-gold-light">{formatCurrency(stats.potential - stats.wagered)}</div>
                    </button>

                    {showBreakdown && openBets.length > 0 && (
                        <div className="mt-2 bg-white/5 rounded-lg p-3 border border-gold-border/20">
                            <div className="text-[9px] font-fredoka text-white/40 mb-2">
                                Ganancia neta si ganas todas tus apuestas abiertas:
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {openBets.map((bet: any, i: number) => {
                                    const outcomeLabel = OUTCOME_LABELS[bet.pickedOutcome] || bet.pickedOutcome;
                                    const outcomeColor = bet.pickedOutcome === 'A' ? 'text-team-red'
                                        : bet.pickedOutcome === 'B' ? 'text-team-blue' : 'text-white/70';
                                    return (
                                        <div key={i} className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-fredoka text-white/40">
                                                    {bet.flightName ? `${bet.flightName} · ` : ''}{SEGMENT_LABELS[bet.segmentType] || bet.segmentType}
                                                </span>
                                                <span className={`font-fredoka font-bold ${outcomeColor}`}>{outcomeLabel}</span>
                                            </div>
                                            <span className="font-fredoka font-bold text-green-400">
                                                +{formatCurrency(bet.potentialPayout - bet.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10 text-xs">
                                <span className="font-bangers text-white/50 uppercase">Ganancia neta</span>
                                <span className="font-bangers text-gold-light text-sm">+{formatCurrency(stats.potential - stats.wagered)}</span>
                            </div>
                        </div>
                    )}

                    {stats.closedWagered > 0 && (
                        <div className="mt-3 text-xs">
                            <div className="flex justify-between text-white/50 mb-1 font-fredoka">
                                <span>Recuperado</span>
                                <span>{Math.round((stats.closedRecovered / Math.max(1, stats.closedWagered)) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${stats.closedRecovered >= stats.closedWagered ? 'bg-green-500' : 'bg-gold-border'}`}
                                    style={{ width: `${Math.min(100, (stats.closedRecovered / Math.max(1, stats.closedWagered)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
