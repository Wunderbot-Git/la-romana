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
            className="bg-cream gold-border rounded-xl p-4 relative overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
        >
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bangers text-forest-deep/60 bg-forest-deep/5 px-2 py-1 rounded border border-gold-border/20">
                    {match.segmentType === 'singles1' ? 'Individual 1' : match.segmentType === 'singles2' ? 'Individual 2' : match.segmentType === 'fourball' ? 'Mejor Bola' : 'Scramble'}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-fredoka font-medium">
                    {match.currentHole === 0 ? (
                        <span className="text-forest-deep/40 bg-forest-deep/5 px-2 py-0.5 rounded-full">No iniciada</span>
                    ) : isClosed ? (
                        <span className="text-forest-deep/40 bg-forest-deep/5 px-2 py-0.5 rounded-full">Finalizada</span>
                    ) : (
                        <span className="text-green-700 bg-green-50 flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-green-200">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Hoyo {match.currentHole} de 9
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-stretch justify-between mb-3 text-sm">
                <div className="flex-1 text-center font-fredoka font-medium truncate text-team-red px-1">{redName}</div>
                <div className="bg-forest-deep text-gold-light font-bangers px-3 py-1 rounded-md text-xs whitespace-nowrap self-center mx-1 border border-gold-border/30 shadow-inner">
                    {match.matchStatus === 'Not Started' ? 'vs' : (match.matchStatus || 'A/S')}
                </div>
                <div className="flex-1 text-center font-fredoka font-medium truncate text-team-blue px-1">{blueName}</div>
            </div>

            {!userBet ? (
                <div className="flex justify-end mt-2">
                    <span className="text-[10px] text-forest-deep/30 font-fredoka">Pendiente</span>
                </div>
            ) : (
                <div className="border-t border-gold-border/20 pt-3">
                    <div className="flex justify-between items-center bg-forest-deep/5 p-2 rounded-lg border border-gold-border/20">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-8 rounded-full ${userBet.pickedOutcome === 'A' ? 'bg-team-red' : userBet.pickedOutcome === 'B' ? 'bg-team-blue' : 'bg-forest-mid'}`}></div>
                            <div>
                                <div className="text-[10px] text-forest-deep/40 font-bangers uppercase tracking-wide">Tu Apuesta</div>
                                <div className="text-sm font-fredoka font-bold text-forest-deep">
                                    {userBet.pickedOutcome === 'A' ? redName : userBet.pickedOutcome === 'B' ? blueName : 'Empate (A/S)'}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            {match.currentHole === 0 ? (
                                <div className="text-xs font-bangers text-brass uppercase tracking-wide">Cambiar ✎</div>
                            ) : (
                                <>
                                    <div className="text-[10px] text-forest-deep/40 font-bangers uppercase tracking-wide">
                                        {isClosed ? 'Resultado' : 'Potencial'}
                                    </div>
                                    <div className={`text-sm font-bangers ${isClosed ? (userBet.potentialPayout && userBet.potentialPayout > 0 ? 'text-green-600' : 'text-forest-deep/40') : 'text-brass'}`}>
                                        {isClosed && (!userBet.potentialPayout || userBet.potentialPayout === 0)
                                            ? 'Perdida'
                                            : (userBet.potentialPayout ? formatCurrency(userBet.potentialPayout) : 'Calculando...')}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
