import { useState, useCallback } from 'react';
import { Match } from '@/hooks/useLeaderboard';
import { useMatchBets, usePlaceBet } from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';
import { Toast } from '@/components/ui/Toast';

const HONOR_KEY = 'betting_honor_shown';

function isHonorShown(): boolean {
    try { return sessionStorage.getItem(HONOR_KEY) === '1'; } catch { return false; }
}
function markHonorShown() {
    try { sessionStorage.setItem(HONOR_KEY, '1'); } catch { /* noop */ }
}

interface Props {
    eventId: string;
    match: Match;
    onClose: () => void;
}

export function BettingDetailSheet({ eventId, match, onClose }: Props) {
    const { data: betsData, isLoading, refetch } = useMatchBets(eventId, match.flightId, match.segmentType);
    const { placeBet, isSubmitting, error } = usePlaceBet();

    const [selectedPick, setSelectedPick] = useState<'A' | 'B' | 'AS' | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const isClosed = match.currentHole > 8 || match.status === 'completed' || match.matchStatus.includes('Won') || match.matchStatus.includes('Lost') || match.matchStatus.includes('&');
    const isLive = match.currentHole > 0 && !isClosed;
    const currentLeader = match.matchLeaders && match.matchLeaders.length > 0
        ? match.matchLeaders[match.currentHole > 0 ? match.currentHole - 1 : 0]
        : (match.matchStatus.includes('UP') ? 'red' : match.matchStatus.includes('DN') ? 'blue' : null);

    const hasMandatoryBet = betsData?.bets && betsData.bets.length > 0;
    const isAdditionalBet = !!hasMandatoryBet;

    const showFullHonor = !isHonorShown();

    const redName = (match.segmentType === 'scramble'
        ? match.redPlayers.map(p => p.playerName.split(' ')[0]).join(' / ')
        : match.redPlayers[0].playerName).replace(/\s*-\s*$/, '');

    const blueName = (match.segmentType === 'scramble'
        ? match.bluePlayers.map(p => p.playerName.split(' ')[0]).join(' / ')
        : match.bluePlayers[0].playerName).replace(/\s*-\s*$/, '');

    const handleConfirm = async () => {
        if (!selectedPick) return;

        markHonorShown();

        const success = await placeBet({
            eventId,
            flightId: match.flightId,
            segmentType: match.segmentType,
            pickedOutcome: selectedPick,
            ...(isAdditionalBet ? { amount: 5000 } : {})
        });

        if (success) {
            setSelectedPick(null);
            setToast({ message: 'Apuesta registrada', type: 'success' });
            refetch();
        } else {
            setToast({ message: 'Error al registrar apuesta', type: 'error' });
        }
    };

    const clearToast = useCallback(() => setToast(null), []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-cream relative w-full rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-gold-border/40 rounded-full" />
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 pb-4">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bangers text-lg text-forest-deep">
                                {match.segmentType === 'singles1' ? 'Individual 1' : match.segmentType === 'singles2' ? 'Individual 2' : match.segmentType === 'fourball' ? 'Mejor Bola' : 'Scramble'}
                            </h3>
                            <p className="text-sm text-forest-deep/50 font-fredoka font-medium">{match.flightName}</p>
                            {isAdditionalBet && !isClosed && (
                                <span className="text-[10px] font-bangers text-brass bg-gold-light/30 px-2 py-0.5 rounded mt-1 inline-block uppercase">Apuesta Adicional</span>
                            )}
                        </div>
                        {match.currentHole > 0 && (
                            <div className="text-right">
                                <span className="text-sm font-bangers bg-forest-deep text-gold-light gold-border px-3 py-1 rounded-lg">
                                    {match.matchStatus || 'A/S'}
                                </span>
                                <div className="text-xs text-forest-deep/40 mt-1 font-fredoka">Hoyo {match.currentHole} de 9</div>
                            </div>
                        )}
                    </div>

                    {/* Pick Selection */}
                    {!isClosed && (
                        <>
                            <div className="text-xs font-bangers uppercase tracking-wider text-gold-border mb-3 mt-4">Tu Pronóstico</div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => setSelectedPick('A')}
                                    disabled={isLive && currentLeader === 'red'}
                                    className={`relative p-4 rounded-xl border-2 text-center transition-all ${selectedPick === 'A'
                                        ? 'border-team-red bg-team-red/10'
                                        : (isLive && currentLeader === 'red')
                                            ? 'border-gold-border/20 bg-forest-deep/5 opacity-60 cursor-not-allowed'
                                            : 'border-gold-border/30 bg-white hover:border-team-red/50'
                                        }`}
                                >
                                    <div className="font-fredoka font-bold text-team-red">Ganará {redName}</div>
                                    {isLive && currentLeader === 'red' && <span className="text-xs font-fredoka font-medium text-forest-deep/40 bg-forest-deep/5 px-2 py-0.5 rounded mt-1 inline-block">Líder</span>}
                                </button>

                                <button
                                    onClick={() => setSelectedPick('AS')}
                                    className={`relative p-4 rounded-xl border-2 text-center transition-all ${selectedPick === 'AS'
                                        ? 'border-forest-deep bg-forest-deep/10'
                                        : 'border-gold-border/30 bg-white hover:border-forest-deep/30'
                                        }`}
                                >
                                    <div className="font-fredoka font-bold text-forest-deep">Empate (A/S)</div>
                                </button>

                                <button
                                    onClick={() => setSelectedPick('B')}
                                    disabled={isLive && currentLeader === 'blue'}
                                    className={`relative p-4 rounded-xl border-2 text-center transition-all ${selectedPick === 'B'
                                        ? 'border-team-blue bg-team-blue/10'
                                        : (isLive && currentLeader === 'blue')
                                            ? 'border-gold-border/20 bg-forest-deep/5 opacity-60 cursor-not-allowed'
                                            : 'border-gold-border/30 bg-white hover:border-team-blue/50'
                                        }`}
                                >
                                    <div className="font-fredoka font-bold text-team-blue">Ganará {blueName}</div>
                                    {isLive && currentLeader === 'blue' && <span className="text-xs font-fredoka font-medium text-forest-deep/40 bg-forest-deep/5 px-2 py-0.5 rounded mt-1 inline-block">Líder</span>}
                                </button>
                            </div>

                            {/* Full honor warning — only on first bet of session */}
                            {selectedPick && showFullHonor && (
                                <div className="bg-gold-light/20 border border-gold-border/40 rounded-xl p-3 mt-4">
                                    <p className="text-xs text-brass font-bangers">Compromiso de Honor</p>
                                    <p className="text-[11px] text-forest-deep/60 mt-1 font-fredoka">
                                        {!isAdditionalBet && match.currentHole === 0
                                            ? 'Puedes cambiar tu apuesta hasta que se registre el primer score.'
                                            : 'Al confirmar, te comprometes a aportar el monto al pozo final. No se permiten cancelaciones.'}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {betsData && betsData.bets.length > 0 && (
                        <div className="mt-6">
                            <div className="text-xs font-bangers uppercase tracking-wider text-forest-deep/50 mb-3 flex justify-between">
                                <span>Apuestas en esta partida</span>
                                <span className="text-brass font-bold">Pozo: {formatCurrency(betsData.pot)}</span>
                            </div>
                            <div className="space-y-2">
                                {betsData.bets.map(b => (
                                    <div key={b.id} className="bg-white p-3 rounded-lg gold-border text-sm flex justify-between items-center">
                                        <div>
                                            <span className="font-fredoka font-medium text-forest-deep">{b.pickedOutcome === 'A' ? redName : b.pickedOutcome === 'B' ? blueName : 'Empate'}</span>
                                            {b.comment && <div className="text-xs text-forest-deep/40 italic mt-0.5 font-fredoka">&quot;{b.comment}&quot;</div>}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-forest-deep/40 font-fredoka">{b.partes} partes</div>
                                            {b.amount && <div className="text-[10px] text-brass font-fredoka">{formatCurrency(b.amount)}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky footer — always visible confirm button */}
                {!isClosed && selectedPick && (
                    <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-gold-border/20 bg-cream">
                        {isAdditionalBet && (
                            <div className="text-center mb-2">
                                <span className="text-xs font-bangers text-forest-deep/50 uppercase tracking-wider">Monto: </span>
                                <span className="text-sm font-bangers text-forest-deep">{formatCurrency(5000)}</span>
                            </div>
                        )}

                        {!showFullHonor && (
                            <p className="text-[10px] text-brass/70 font-fredoka text-center mb-2">Compromiso de honor aplica</p>
                        )}

                        {error && <div className="text-team-red text-sm font-fredoka font-medium text-center mb-2">{error}</div>}

                        <button
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className={`w-full font-bangers text-lg py-4 rounded-xl flex justify-center items-center ${isSubmitting ? 'bg-forest-mid text-cream/50 cursor-wait' : 'gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none'}`}
                        >
                            {isSubmitting ? 'Cargando...' : isAdditionalBet ? `Apostar ${formatCurrency(5000)}` : 'Confirmar Apuesta'}
                        </button>
                    </div>
                )}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
        </div>
    );
}
