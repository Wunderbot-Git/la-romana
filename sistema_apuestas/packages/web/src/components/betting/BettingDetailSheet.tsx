import { useState } from 'react';
import { Match } from '@/hooks/useLeaderboard';
import { useMatchBets, usePlaceBet } from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';

interface Props {
    eventId: string;
    match: Match;
    onClose: () => void;
}

export function BettingDetailSheet({ eventId, match, onClose }: Props) {
    const { data: betsData, isLoading } = useMatchBets(eventId, match.flightId, match.segmentType);
    const { placeBet, isSubmitting, error } = usePlaceBet();

    const [selectedPick, setSelectedPick] = useState<'A' | 'B' | 'AS' | null>(null);
    const [comment, setComment] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    // Derived states
    const isClosed = match.currentHole > 8 || match.status === 'completed' || match.matchStatus.includes('Won') || match.matchStatus.includes('Lost') || match.matchStatus.includes('&');
    const isLive = match.currentHole > 0 && !isClosed;
    const currentLeader = match.matchLeaders && match.matchLeaders.length > 0
        ? match.matchLeaders[match.currentHole > 0 ? match.currentHole - 1 : 0]
        : (match.matchStatus.includes('UP') ? 'red' : match.matchStatus.includes('DN') ? 'blue' : null);

    const redName = (match.segmentType === 'scramble'
        ? match.redPlayers.map(p => p.playerName.split(' ')[0]).join(' / ')
        : match.redPlayers[0].playerName).replace(/\s*-\s*$/, '');

    const blueName = (match.segmentType === 'scramble'
        ? match.bluePlayers.map(p => p.playerName.split(' ')[0]).join(' / ')
        : match.bluePlayers[0].playerName).replace(/\s*-\s*$/, '');

    const handleConfirm = async () => {
        if (!selectedPick) return;

        const success = await placeBet({
            eventId,
            flightId: match.flightId,
            segmentType: match.segmentType,
            pickedOutcome: selectedPick,
            comment
        });

        if (success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-slate-50 relative w-full rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>

                <div className="px-5 pb-5 overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">
                                {match.segmentType === 'singles' ? 'Individual' : match.segmentType === 'fourball' ? 'Bestball' : 'Scramble'}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">Fligth {match.flightName}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold bg-white border border-slate-200 shadow-sm px-3 py-1 rounded-lg text-slate-700">
                                {match.matchStatus || 'A/S'}
                            </span>
                            <div className="text-xs text-slate-400 mt-1">Hoyo {match.currentHole || '-'}</div>
                        </div>
                    </div>

                    {/* Betting Target Selection */}
                    {!showConfirm ? (
                        <>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 mt-6">Tu Pronóstico</div>

                            <div className="flex flex-col gap-3 mb-6">
                                <button
                                    onClick={() => setSelectedPick('A')}
                                    disabled={isClosed || (isLive && currentLeader === 'red')}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${selectedPick === 'A'
                                        ? 'border-red-500 bg-red-50'
                                        : (isClosed || (isLive && currentLeader === 'red'))
                                            ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                                            : 'border-slate-200 bg-white hover:border-red-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-red-600">{redName}</div>
                                        {isLive && currentLeader === 'red' && <span className="text-xs font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded">🚫 Líder</span>}
                                    </div>
                                </button>

                                <button
                                    onClick={() => setSelectedPick('AS')}
                                    disabled={isClosed}
                                    className={`relative p-4 rounded-xl border-2 text-center transition-all ${selectedPick === 'AS'
                                        ? 'border-slate-800 bg-slate-100'
                                        : isClosed
                                            ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className="font-bold text-slate-700">Empate (A/S)</div>
                                </button>

                                <button
                                    onClick={() => setSelectedPick('B')}
                                    disabled={isClosed || (isLive && currentLeader === 'blue')}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${selectedPick === 'B'
                                        ? 'border-team-blue bg-blue-50'
                                        : (isClosed || (isLive && currentLeader === 'blue'))
                                            ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                                            : 'border-slate-200 bg-white hover:border-blue-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="font-bold text-team-blue">{blueName}</div>
                                        {isLive && currentLeader === 'blue' && <span className="text-xs font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded">🚫 Líder</span>}
                                    </div>
                                </button>
                            </div>

                            {selectedPick && (
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg mt-4"
                                >
                                    Continuar
                                </button>
                            )}

                            {/* Pot Summary */}
                            {betsData && betsData.bets.length > 0 && (
                                <div className="mt-8">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex justify-between">
                                        <span>Últimas Apuestas</span>
                                        <span className="text-amber-500 font-bold">Pozo: {formatCurrency(betsData.pot)}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {betsData.bets.map(b => (
                                            <div key={b.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm flex justify-between items-center">
                                                <div>
                                                    <span className="font-medium text-slate-700">{b.pickedOutcome === 'A' ? redName : b.pickedOutcome === 'B' ? blueName : 'Empate'}</span>
                                                    {b.comment && <div className="text-xs text-slate-500 italic mt-0.5">"{b.comment}"</div>}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-400">{b.partes} partes</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Confirmation State */
                        <div className="mt-6 flex flex-col h-full min-h-[50vh]">
                            <button onClick={() => setShowConfirm(false)} className="text-sm text-slate-500 mb-6 flex items-center gap-1">
                                ← Volver
                            </button>

                            <div className="text-center mb-6">
                                <div className="text-sm text-slate-500 mb-1">Tu selección</div>
                                <div className="text-xl font-bold text-slate-800">
                                    {selectedPick === 'A' ? redName : selectedPick === 'B' ? blueName : 'Empate (A/S)'}
                                </div>
                            </div>

                            <textarea
                                placeholder="Añade un comentario rápido (opcional)"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 mb-8 focus:ring-2 focus:ring-slate-800 focus:outline-none"
                                maxLength={100}
                            />

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-auto">
                                <p className="text-sm text-amber-800 font-medium">
                                    ⚠️ Compromiso de Honor
                                </p>
                                <p className="text-xs text-amber-700 mt-2">
                                    Al confirmar, te comprometes a aportar el monto de la apuesta al pozo final del torneo. No se permiten cancelaciones.
                                </p>
                            </div>

                            {error && <div className="text-red-500 text-sm font-medium mb-4 text-center">{error}</div>}

                            <button
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                                className={`w-full text-white font-bold py-4 rounded-xl shadow-lg mt-6 flex justify-center items-center ${isSubmitting ? 'bg-slate-500 cursor-wait' : 'bg-slate-800 hover:bg-slate-700'
                                    }`}
                            >
                                {isSubmitting ? 'Cargando...' : 'Confirmar Apuesta'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
