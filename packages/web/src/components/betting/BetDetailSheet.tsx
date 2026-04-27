'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { MatchDetail } from '@/hooks/useLeaderboard';
import { useMatchBets, usePlaceBet } from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';

const BET_AMOUNT = 2;

/**
 * Slide-up modal for placing / inspecting a single match bet.
 * Each side card shows: player names, total bets on that side, current pot share.
 */
export function BetDetailSheet({
    eventId,
    roundId,
    flightId,
    match,
    onClose,
    onPlaced,
}: {
    eventId: string;
    roundId: string;
    flightId: string;
    match: MatchDetail;
    onClose: () => void;
    onPlaced?: () => void;
}) {
    const segmentType = match.matchType;
    const { data, isLoading, refetch } = useMatchBets(eventId, roundId, flightId, segmentType);
    const { placeBet, isSubmitting, error } = usePlaceBet();
    const [selected, setSelected] = useState<'A' | 'B' | 'AS' | null>(null);

    const redLabel = match.matchType === 'fourball'
        ? match.redPlayers.map(p => p.name.split(' ')[0]).join(' / ')
        : (match.redPlayers[0]?.name.split(' ')[0] ?? 'Piratas');
    const blueLabel = match.matchType === 'fourball'
        ? match.bluePlayers.map(p => p.name.split(' ')[0]).join(' / ')
        : (match.bluePlayers[0]?.name.split(' ')[0] ?? 'Fantasmas');

    const counts = data?.counts ?? { A: 0, B: 0, AS: 0 };
    const pot = data?.pot ?? 0;
    const locked = !!data?.locked;

    const handleSubmit = async () => {
        if (!selected) return;
        const ok = await placeBet({
            eventId,
            roundId,
            flightId,
            segmentType,
            pickedOutcome: selected,
        });
        if (ok) {
            await refetch();
            onPlaced?.();
            onClose();
        }
    };

    const projectedPayout = (count: number): number => {
        // Including this $2 bet: pot becomes pot + 2; same-side count becomes count + 1
        if (count + 1 === 0) return 0;
        return (pot + BET_AMOUNT) / (count + 1);
    };

    const optionButton = (
        key: 'A' | 'B' | 'AS',
        label: string,
        sub: string,
        count: number,
        teamClass: string,
    ) => {
        const isActive = selected === key;
        return (
            <button
                key={key}
                onClick={() => setSelected(key)}
                disabled={locked || isSubmitting}
                className={`flex flex-col items-stretch rounded-[14px] border-[2px] px-3 py-3 text-left transition-all disabled:opacity-50 ${
                    isActive
                        ? 'border-[#fbbc05] bg-[#fbbc05]/15'
                        : 'border-[#31316b]/60 bg-[#0a1322]/80 hover:bg-[#0f172b]'
                }`}
            >
                <div className={`font-bangers text-base uppercase tracking-wider ${teamClass}`}>{label}</div>
                <div className="mt-0.5 truncate font-fredoka text-[10px] text-white/55">{sub}</div>
                <div className="mt-2 flex items-baseline justify-between gap-1">
                    <span className="font-bangers text-[10px] uppercase text-white/45">
                        {count} apuesta{count !== 1 ? 's' : ''}
                    </span>
                    <span className="font-bowlby text-base text-[#fbbc05]">
                        {formatCurrency(projectedPayout(count))}
                    </span>
                </div>
            </button>
        );
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-end bg-black/65"
            onClick={onClose}
            role="dialog"
            aria-modal
        >
            <div
                onClick={e => e.stopPropagation()}
                className="w-full rounded-t-[24px] border-t-[2px] border-[#fbbc05]/55 bg-gradient-to-b from-[#1c2f3e] to-[#0a1322] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
            >
                <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/15" />

                <div className="mb-3 flex items-baseline justify-between gap-2">
                    <div>
                        <div className="font-bangers text-[10px] uppercase tracking-widest text-[#fbbc05]/85">
                            {match.matchType === 'singles1' ? 'Singles 1'
                                : match.matchType === 'singles2' ? 'Singles 2'
                                : 'Mejor Bola'}
                        </div>
                        <div className="font-bangers text-lg uppercase tracking-wider text-white">
                            <span className="text-team-red">{redLabel}</span>
                            <span className="mx-1.5 text-white/40">vs</span>
                            <span className="text-team-blue">{blueLabel}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full bg-white/10 p-1.5 text-white/70 hover:bg-white/15"
                        aria-label="Cerrar"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {locked && (
                    <div className="mb-3 rounded-[10px] border border-rose-500/40 bg-rose-900/30 px-3 py-2 font-fredoka text-xs text-rose-300">
                        Apuestas cerradas — el partido ya comenzó.
                    </div>
                )}

                {isLoading ? (
                    <div className="py-8 text-center font-fredoka text-white/55">Cargando…</div>
                ) : (
                    <>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="font-bangers text-[10px] uppercase tracking-wider text-white/55">
                                Pozo actual
                            </span>
                            <span className="font-bowlby text-base text-[#fbbc05]">{formatCurrency(pot)}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {optionButton('A', 'Piratas', redLabel, counts.A, 'text-team-red')}
                            {optionButton('AS', 'Empate', 'A/S al final', counts.AS, 'text-white/85')}
                            {optionButton('B', 'Fantasmas', blueLabel, counts.B, 'text-team-blue')}
                        </div>

                        {error && (
                            <div className="mt-2 rounded-[8px] bg-rose-900/40 px-3 py-2 font-fredoka text-xs text-rose-200">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={locked || !selected || isSubmitting}
                            className="mt-3 w-full rounded-full border-[2px] border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] py-3 font-bangers text-base uppercase tracking-wider text-[#1e293b] shadow-[0_3px_0_#1e293b] disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando…' : `Apostar ${formatCurrency(BET_AMOUNT)}`}
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
}
