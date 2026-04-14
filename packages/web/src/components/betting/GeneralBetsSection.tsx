'use client';

import { useState, useCallback } from 'react';
import { GeneralBetPool, GeneralBet, usePlaceGeneralBet } from '@/hooks/useBetting';
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
    pools: GeneralBetPool[];
    myBets: GeneralBet[];
    onBetPlaced: () => void;
    filter?: 'all' | 'placed' | 'pending';
    canChange?: boolean;
}

const BET_TYPE_LABELS: Record<string, { title: string; description: string }> = {
    tournament_winner: { title: 'Ganador del Torneo', description: '¿Quién se lleva el torneo?' },
    exact_score: { title: 'Marcador Exacto', description: '¿Cuál será el marcador final?' },
    mvp: { title: 'MVP', description: '¿Quién ganará más puntos en todos los partidos?' },
    worst_player: { title: 'Peor Jugador', description: '¿Quién ganará menos puntos?' },
};

const OUTCOME_LABELS: Record<string, string> = {
    red: 'Cariñositos',
    blue: 'Pitufos',
    tie: 'Empate',
    yes: 'Sí',
    no: 'No',
};

function OutcomeButton({ outcome, label, isSelected, isMyPick, partes, onClick, disabled }: {
    outcome: string; label: string; isSelected: boolean; isMyPick: boolean;
    partes: number; onClick: () => void; disabled: boolean;
}) {
    const isRed = outcome === 'red';
    const isBlue = outcome === 'blue';

    let borderClass = 'border-gold-border/30 bg-white hover:border-gold-border/60';
    let textClass = 'text-forest-deep';

    if (isMyPick) {
        borderClass = isRed ? 'border-team-red bg-team-red/10 ring-2 ring-team-red/30'
            : isBlue ? 'border-team-blue bg-team-blue/10 ring-2 ring-team-blue/30'
            : 'border-forest-deep bg-forest-deep/10 ring-2 ring-forest-deep/20';
    } else if (isSelected) {
        borderClass = isRed ? 'border-team-red/50 bg-team-red/5'
            : isBlue ? 'border-team-blue/50 bg-team-blue/5'
            : 'border-forest-deep/30 bg-forest-deep/5';
    }

    if (isRed) textClass = 'text-team-red';
    else if (isBlue) textClass = 'text-team-blue';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex-1 rounded-lg p-3 text-center border-2 transition-all ${borderClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <div className={`text-sm font-fredoka font-bold ${textClass}`}>{label}</div>
            {partes > 0 && (
                <div className="text-[10px] text-forest-deep/40 mt-1 font-fredoka">{partes} partes</div>
            )}
            {isMyPick && (
                <div className="text-[9px] font-bangers text-green-600 mt-1 uppercase">Tu apuesta</div>
            )}
        </button>
    );
}

function ExactScorePicker({ onSelect, disabled }: { onSelect: (outcome: string) => void; disabled: boolean }) {
    const [pitufos, setPitufos] = useState(12.5);
    const cariniositos = 25 - pitufos;

    const adjust = (delta: number) => {
        const next = pitufos + delta;
        if (next >= 0 && next <= 25 && next % 0.5 === 0) {
            setPitufos(next);
            onSelect(`${next}-${25 - next}`);
        }
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4 w-full justify-center">
                <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] font-bangers text-team-blue uppercase tracking-wider">Pitufos</span>
                    <div className="bg-team-blue/10 border-2 border-team-blue/30 rounded-xl px-4 py-2 min-w-[80px] text-center">
                        <span className="text-3xl font-bangers text-team-blue">{pitufos}</span>
                    </div>
                </div>

                <span className="text-forest-deep/30 font-bangers text-lg mt-4">vs</span>

                <div className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] font-bangers text-team-red uppercase tracking-wider">Cariñositos</span>
                    <div className="bg-team-red/10 border-2 border-team-red/30 rounded-xl px-4 py-2 min-w-[80px] text-center">
                        <span className="text-3xl font-bangers text-team-red">{cariniositos}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => adjust(0.5)}
                    disabled={disabled || pitufos >= 25}
                    className="w-10 h-10 rounded-full border-2 border-team-blue/40 bg-team-blue/10 text-team-blue font-bangers text-lg disabled:opacity-30 transition-all hover:bg-team-blue/20"
                >
                    +
                </button>
                <span className="text-[10px] text-forest-deep/40 font-fredoka w-16 text-center">
                    {pitufos === cariniositos ? 'Empate' : pitufos > cariniositos ? 'Pitufos' : 'Cariñositos'}
                </span>
                <button
                    onClick={() => adjust(-0.5)}
                    disabled={disabled || pitufos <= 0}
                    className="w-10 h-10 rounded-full border-2 border-team-red/40 bg-team-red/10 text-team-red font-bangers text-lg disabled:opacity-30 transition-all hover:bg-team-red/20"
                >
                    +
                </button>
            </div>
        </div>
    );
}

function GeneralBetCard({ pool, myBet, eventId, onBetPlaced, canChange = false }: {
    pool: GeneralBetPool; myBet: GeneralBet | undefined; eventId: string; onBetPlaced: () => void; canChange?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
    const { placeGeneralBet, isSubmitting, error } = usePlaceGeneralBet();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const meta = BET_TYPE_LABELS[pool.betType] || { title: pool.betType, description: '' };
    const hasBet = !!myBet;
    const showFullHonor = !isHonorShown();

    const isPlayerBet = pool.betType === 'mvp' || pool.betType === 'worst_player';
    const isExactScore = pool.betType === 'exact_score';

    const allPlayers = isPlayerBet
        ? [...(pool.redPlayerNames || []), ...(pool.bluePlayerNames || [])].map(s => {
            const [id, ...nameParts] = s.split(':');
            return { id, name: nameParts.join(':'), team: (pool.redPlayerNames || []).includes(s) ? 'red' as const : 'blue' as const };
        })
        : [];

    const outcomes = isPlayerBet ? allPlayers.map(p => p.id)
        : pool.betType === 'tournament_winner' ? ['red', 'blue']
        : ['red', 'blue'];

    const getPlayerName = (id: string) => allPlayers.find(p => p.id === id)?.name || id;
    const getPlayerTeam = (id: string) => allPlayers.find(p => p.id === id)?.team;

    const handlePlace = async () => {
        if (!selectedOutcome) return;
        markHonorShown();
        const success = await placeGeneralBet({
            eventId,
            betType: pool.betType,
            pickedOutcome: selectedOutcome,
            flightId: pool.flightId || undefined,
            segmentType: pool.segmentType || undefined,
        });
        if (success) {
            setSelectedOutcome(null);
            setExpanded(false);
            setToast({ message: 'Apuesta registrada', type: 'success' });
            onBetPlaced();
        } else {
            setToast({ message: 'Error al registrar apuesta', type: 'error' });
        }
    };

    const clearToast = useCallback(() => setToast(null), []);

    const formatExactScore = (outcome: string) => {
        const [p, c] = outcome.split('-');
        return { pitufos: p, cariniositos: c };
    };

    return (
        <>
            <div className={`bg-cream gold-border rounded-xl overflow-hidden ${pool.isResolved ? 'opacity-80' : ''}`}>
                <button
                    onClick={() => !pool.isResolved && setExpanded(!expanded)}
                    className="w-full flex items-center justify-between p-4 text-left"
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bangers text-forest-deep">{meta.title}</h3>
                        </div>
                        <p className="text-xs text-forest-deep/40 mt-0.5 font-fredoka">{meta.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                        {hasBet ? (
                            <span className="text-xs font-fredoka text-forest-deep/50">{formatCurrency(5000)}</span>
                        ) : pool.pot > 0 ? (
                            <span className="text-[10px] font-fredoka text-forest-deep/30">Pozo: {formatCurrency(pool.pot)}</span>
                        ) : null}
                        {pool.betsCount > 0
                            ? <span className="text-sm text-green-600 font-bangers">Apostado</span>
                            : <span className="text-sm text-forest-deep/30 font-fredoka">Pendiente</span>
                        }
                        {pool.isResolved && pool.winningOutcome && pool.winningOutcome !== '__none__' && (() => {
                            if (isExactScore) {
                                const { pitufos, cariniositos } = formatExactScore(pool.winningOutcome);
                                return (
                                    <span className="text-[9px] font-bangers uppercase px-2 py-0.5 rounded bg-forest-mid/20 text-forest-deep/60">
                                        {pitufos} - {cariniositos}
                                    </span>
                                );
                            }
                            const winTeam = isPlayerBet ? getPlayerTeam(pool.winningOutcome) : null;
                            const winLabel = isPlayerBet ? getPlayerName(pool.winningOutcome) : (OUTCOME_LABELS[pool.winningOutcome] || pool.winningOutcome);
                            const winColor = isPlayerBet
                                ? (winTeam === 'red' ? 'bg-team-red/15 text-team-red' : winTeam === 'blue' ? 'bg-team-blue/15 text-team-blue' : 'bg-forest-mid/20 text-forest-deep/60')
                                : (pool.winningOutcome === 'red' ? 'bg-team-red/15 text-team-red' : pool.winningOutcome === 'blue' ? 'bg-team-blue/15 text-team-blue' : 'bg-forest-mid/20 text-forest-deep/60');
                            return (
                                <span className={`text-[9px] font-bangers uppercase px-2 py-0.5 rounded ${winColor}`}>
                                    {winLabel}
                                </span>
                            );
                        })()}
                    </div>
                </button>

                {hasBet && !expanded && (() => {
                    const betDisplay = (() => {
                        if (isExactScore) {
                            const { pitufos, cariniositos } = formatExactScore(myBet.pickedOutcome);
                            return (
                                <div className="inline-flex items-center gap-1.5 text-[10px] font-bangers uppercase px-2 py-1 rounded bg-forest-mid/10 text-forest-deep/60">
                                    Tu apuesta: <span className="text-team-blue">{pitufos}</span> - <span className="text-team-red">{cariniositos}</span>
                                </div>
                            );
                        }
                        const pickedTeam = isPlayerBet ? getPlayerTeam(myBet.pickedOutcome) : null;
                        const displayOutcome = isPlayerBet ? getPlayerName(myBet.pickedOutcome) : (OUTCOME_LABELS[myBet.pickedOutcome] || myBet.pickedOutcome);
                        const colorKey = isPlayerBet ? (pickedTeam || 'neutral') : myBet.pickedOutcome;
                        const bgClass = colorKey === 'red' ? 'bg-team-red/10 text-team-red' : colorKey === 'blue' ? 'bg-team-blue/10 text-team-blue' : 'bg-forest-mid/10 text-forest-deep/60';
                        const dotClass = colorKey === 'red' ? 'bg-team-red' : colorKey === 'blue' ? 'bg-team-blue' : 'bg-forest-mid';
                        return (
                            <div className={`inline-flex items-center gap-1.5 text-[10px] font-bangers uppercase px-2 py-1 rounded ${bgClass}`}>
                                <div className={`w-1.5 h-4 rounded-full ${dotClass}`} />
                                Tu apuesta: {displayOutcome}
                            </div>
                        );
                    })();
                    return (
                        <div className="px-4 pb-3 -mt-1 flex items-center gap-3">
                            {betDisplay}
                            {!pool.isResolved && canChange && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                                    className="text-xs font-fredoka text-forest-deep/40 hover:text-forest-deep/70"
                                >
                                    Cambiar
                                </button>
                            )}
                        </div>
                    );
                })()}

                {expanded && !pool.isResolved && (!hasBet || canChange) && (
                    <div className="px-4 pb-4 border-t border-gold-border/20 pt-3">
                        {isExactScore ? (
                            <div className="mb-3">
                                <ExactScorePicker
                                    onSelect={setSelectedOutcome}
                                    disabled={isSubmitting}
                                />
                            </div>
                        ) : isPlayerBet ? (
                            <div className="flex flex-col gap-1.5 mb-3 max-h-60 overflow-y-auto">
                                {allPlayers.map(p => {
                                    const isSelected = selectedOutcome === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedOutcome(p.id)}
                                            disabled={isSubmitting}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all text-left
                                                ${isSelected
                                                    ? p.team === 'red' ? 'border-team-red/50 bg-team-red/5' : 'border-team-blue/50 bg-team-blue/5'
                                                    : 'border-gold-border/20 bg-white hover:border-gold-border/40'
                                                }
                                            `}
                                        >
                                            <span className={`text-sm font-fredoka font-bold ${p.team === 'red' ? 'text-team-red' : 'text-team-blue'}`}>{p.name}</span>
                                            {(pool.outcomePartes[p.id] || 0) > 0 && (
                                                <span className="text-[10px] text-forest-deep/40 font-fredoka">{pool.outcomePartes[p.id]} partes</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                        <div className="flex gap-2 mb-3">
                            {outcomes.map(o => (
                                <OutcomeButton
                                    key={o}
                                    outcome={o}
                                    label={OUTCOME_LABELS[o] || o}
                                    isSelected={selectedOutcome === o}
                                    isMyPick={false}
                                    partes={pool.outcomePartes[o] || 0}
                                    onClick={() => setSelectedOutcome(o)}
                                    disabled={isSubmitting}
                                />
                            ))}
                        </div>
                        )}

                        {selectedOutcome && (
                            <div className="flex flex-col gap-3 mt-2">
                                {showFullHonor ? (
                                    <div className="bg-gold-light/20 border border-gold-border/40 rounded-xl p-3">
                                        <p className="text-xs text-brass font-bangers">Compromiso de Honor</p>
                                        <p className="text-[11px] text-forest-deep/60 mt-1 font-fredoka">
                                            Al confirmar, te comprometes a aportar el monto al pozo final. No se permiten cancelaciones.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-brass/70 font-fredoka text-center">Compromiso de honor aplica</p>
                                )}

                                {error && <p className="text-team-red text-xs text-center font-fredoka">{error}</p>}

                                <button
                                    onClick={handlePlace}
                                    disabled={isSubmitting}
                                    className="w-full py-3 rounded-xl gold-button text-[#1e293b] shadow-[0_4px_0_#1e293b] active:translate-y-1 active:shadow-none font-bangers text-sm disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Guardando...' : hasBet ? 'Cambiar Apuesta' : 'Confirmar Apuesta'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onDone={clearToast} />}
        </>
    );
}

export function GeneralBetsSection({ eventId, pools, myBets, onBetPlaced, filter = 'all', canChange = false }: Props) {
    if (!pools || pools.length === 0) {
        return <p className="text-center text-cream/50 text-sm py-8 font-fredoka">No hay apuestas generales disponibles.</p>;
    }

    const filterPool = (pool: GeneralBetPool) => {
        if (filter === 'all') return true;
        const hasBet = myBets.some(b => b.betType === pool.betType && b.flightId === pool.flightId);
        return filter === 'placed' ? hasBet : !hasBet;
    };

    const tournamentPools = pools.filter(p =>
        ['tournament_winner', 'exact_score', 'mvp', 'worst_player'].includes(p.betType)
    ).filter(filterPool);

    const renderCard = (pool: GeneralBetPool) => (
        <GeneralBetCard
            key={`${pool.betType}-${pool.flightId || ''}`}
            pool={pool}
            myBet={myBets.find(b => b.betType === pool.betType && b.flightId === pool.flightId)}
            eventId={eventId}
            onBetPlaced={onBetPlaced}
            canChange={canChange}
        />
    );

    return (
        <div className="flex flex-col gap-5">
            {tournamentPools.length > 0 && (
                <div className="bg-forest-deep/50 gold-border rounded-xl p-3 pt-3">
                    <h3 className="text-xs font-bangers text-gold-light uppercase tracking-widest mb-3 px-1">Torneo General</h3>
                    <div className="flex flex-col gap-2">
                        {tournamentPools.map(renderCard)}
                    </div>
                </div>
            )}
        </div>
    );
}
