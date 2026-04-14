import { Match } from '@/hooks/useLeaderboard';
import { Bet } from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';

interface Props {
    match: Match;
    userBet?: Bet;
    onClick: () => void;
}

export function MatchBettingCard({ match, userBet, onClick }: Props) {
    const isClosed = match.currentHole > 8 || match.status === 'completed' || match.matchStatus.includes('Won') || match.matchStatus.includes('Lost') || match.matchStatus.includes('&');
    const isPhase1 = match.currentHole <= 3 && !isClosed;
    const isPhase2 = match.currentHole > 3 && match.currentHole <= 8 && !isClosed;

    const redName = (match.segmentType === 'scramble'
        ? match.redPlayers.map(p => p.playerName.split(' ')[0]).join(' / ')
        : match.redPlayers[0].playerName).replace(/\s*-\s*$/, '');

    const blueName = (match.segmentType === 'scramble'
        ? match.bluePlayers.map(p => p.playerName.split(' ')[0]).join(' / ')
        : match.bluePlayers[0].playerName).replace(/\s*-\s*$/, '');

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-3 relative overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
        >
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {match.segmentType === 'singles' ? 'Individual' : match.segmentType === 'fourball' ? 'Bestball' : 'Scramble'}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-medium">
                    {match.currentHole === 0 ? (
                        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">No iniciada</span>
                    ) : isClosed ? (
                        <span className="text-red-600 bg-red-50 flex items-center gap-1.5 px-2 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Apuestas Cerradas
                        </span>
                    ) : isPhase1 ? (
                        <span className="text-emerald-700 bg-emerald-50 flex items-center gap-1.5 px-2 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Fase 1
                        </span>
                    ) : (
                        <span className="text-amber-700 bg-amber-50 flex items-center gap-1.5 px-2 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Fase 2
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-stretch justify-between mb-3 text-sm">
                <div className="flex-1 text-center font-medium truncate text-red-600 px-1">{redName}</div>
                <div className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-md text-xs whitespace-nowrap self-center mx-1 border border-slate-200 shadow-inner">
                    {match.matchStatus || 'A/S'}
                </div>
                <div className="flex-1 text-center font-medium truncate text-team-blue px-1">{blueName}</div>
            </div>

            <div className="border-t border-slate-100 pt-3">
                {!userBet ? (
                    <div className="text-center text-team-blue text-xs font-medium">
                        👉 Selecciona para apostar
                    </div>
                ) : (
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-8 rounded-full ${userBet.pickedOutcome === 'A' ? 'bg-red-500' : userBet.pickedOutcome === 'B' ? 'bg-team-blue' : 'bg-slate-400'}`}></div>
                            <div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Tu Apuesta</div>
                                <div className="text-sm font-bold text-slate-800">
                                    {userBet.pickedOutcome === 'A' ? redName : userBet.pickedOutcome === 'B' ? blueName : 'Empate (A/S)'}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                                {isClosed ? 'Resultado' : 'Potencial'}
                            </div>
                            <div className={`text-sm font-bold ${isClosed ? (userBet.potentialPayout && userBet.potentialPayout > 0 ? 'text-emerald-600' : 'text-slate-400') : 'text-amber-500'}`}>
                                {isClosed && (!userBet.potentialPayout || userBet.potentialPayout === 0)
                                    ? 'Perdida'
                                    : (userBet.potentialPayout ? formatCurrency(userBet.potentialPayout) : 'Calculando...')}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
