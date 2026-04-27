'use client';

import type { PersonalStats } from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';

/**
 * Top-of-page summary banner — shows the logged-in user's wager total,
 * realized P/L, current potential payout from open bets.
 */
export function DashboardBanner({ stats, isLoading }: { stats?: PersonalStats; isLoading: boolean }) {
    if (isLoading || !stats) {
        return (
            <div className="mx-4 mt-4 h-32 animate-pulse rounded-[16px] border-[2px] border-[#fbbc05]/40 bg-gradient-to-b from-[#1c2f3e] to-[#0f172b]" />
        );
    }
    const hasBets = stats.wagered > 0;
    const realizedClass =
        stats.realizedNet > 0 ? 'text-emerald-400' :
        stats.realizedNet < 0 ? 'text-team-red' : 'text-white';

    return (
        <div className="relative mx-4 mt-4 overflow-hidden rounded-[16px] border-[2px] border-[#fbbc05]/55 bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] p-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#fbbc05]/15 blur-2xl" />

            <h2 className="mb-3 flex items-center gap-2 font-bangers text-lg uppercase tracking-wider text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbc05" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="9" y1="10" x2="15" y2="10" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                Mi Cuenta
            </h2>

            {!hasBets ? (
                <div className="py-3 text-center font-fredoka text-sm italic text-white/55">
                    Aún no has apostado en este torneo.
                </div>
            ) : (
                <>
                    <div className="mb-3 grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-[10px] border border-[#fbbc05]/25 bg-white/5 p-2">
                            <div className="font-bangers text-[10px] uppercase tracking-wider text-white/55">Total Apostado</div>
                            <div className="mt-0.5 font-bowlby text-base text-white">{formatCurrency(stats.wagered)}</div>
                        </div>
                        <div className="rounded-[10px] border border-[#fbbc05]/25 bg-white/5 p-2">
                            <div className="font-bangers text-[10px] uppercase tracking-wider text-white/55">
                                {stats.realizedNet !== 0 ? 'Ganancia / Pérdida' : 'Apuestas'}
                            </div>
                            <div className={`mt-0.5 font-bowlby text-base ${realizedClass}`}>
                                {stats.realizedNet !== 0
                                    ? `${stats.realizedNet > 0 ? '+' : ''}${formatCurrency(stats.realizedNet)}`
                                    : (() => {
                                        const m = stats.bets.length;
                                        const g = stats.generalBetsCount;
                                        const parts: string[] = [];
                                        if (m > 0) parts.push(`${m} partida${m !== 1 ? 's' : ''}`);
                                        if (g > 0) parts.push(`${g} general${g !== 1 ? 'es' : ''}`);
                                        return parts.join(' · ') || '0 apuestas';
                                    })()}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-[10px] border border-[#fbbc05]/40 bg-[#fbbc05]/15 px-3 py-2">
                        <span className="font-bangers text-[10px] uppercase tracking-wider text-[#fbbc05]/85">
                            Lo que te puedes ganar
                        </span>
                        <span className="font-bowlby text-lg text-[#fbbc05]">{formatCurrency(stats.potential)}</span>
                    </div>

                    {stats.closedWagered > 0 && (
                        <div className="mt-3 text-xs">
                            <div className="mb-1 flex justify-between font-fredoka text-white/55">
                                <span>Recuperado</span>
                                <span>{Math.round((stats.closedRecovered / Math.max(1, stats.closedWagered)) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                                <div
                                    className={`h-full rounded-full ${stats.closedRecovered >= stats.closedWagered ? 'bg-emerald-500' : 'bg-[#fbbc05]'}`}
                                    style={{ width: `${Math.min(100, (stats.closedRecovered / Math.max(1, stats.closedWagered)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
