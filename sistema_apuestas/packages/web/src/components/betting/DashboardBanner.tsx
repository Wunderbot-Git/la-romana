import { PersonalStats } from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';

interface Props {
    stats?: PersonalStats;
    isLoading: boolean;
}

export function DashboardBanner({ stats, isLoading }: Props) {
    if (isLoading || !stats) {
        return (
            <div className="bg-slate-800 text-white p-4 mx-4 mt-4 rounded-xl shadow-lg border border-slate-700 animate-pulse h-32">
                ...
            </div>
        );
    }

    const hasBets = stats.wagered > 0;

    return (
        <div className="bg-slate-800 text-white p-5 mx-4 mt-4 rounded-xl shadow-lg border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full blur-2xl -mt-10 -mr-10"></div>

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                    <circle cx="12" cy="12" r="8" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="9" y1="10" x2="15" y2="10" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                Mi Cuenta
            </h2>

            {!hasBets ? (
                <div className="text-center text-slate-400 text-sm py-4 italic">
                    Aún no has apostado en ninguna partida.
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div className="bg-slate-700/50 rounded-lg p-2">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Apostado</div>
                            <div className="text-sm font-semibold">{formatCurrency(stats.wagered)}</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Resultado</div>
                            <div className={`text-sm font-semibold ${stats.realizedNet > 0 ? 'text-green-400' : stats.realizedNet < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                                {stats.realizedNet > 0 ? '+' : ''}{formatCurrency(stats.realizedNet)}
                            </div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2 relative overflow-hidden border border-amber-500/30">
                            <div className="absolute inset-0 bg-amber-500/10"></div>
                            <div className="text-[10px] text-amber-200/70 uppercase tracking-wider mb-1 relative z-10">Potencial</div>
                            <div className="text-sm font-semibold text-amber-400 relative z-10">{formatCurrency(stats.potential)}</div>
                        </div>
                    </div>

                    {stats.closedWagered > 0 && (
                        <div className="mt-2 text-xs">
                            <div className="flex justify-between text-slate-400 mb-1">
                                <span>Recuperado</span>
                                <span>{Math.round((stats.closedRecovered / Math.max(1, stats.closedWagered)) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${stats.closedRecovered >= stats.closedWagered ? 'bg-green-500' : 'bg-blue-500'}`}
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
