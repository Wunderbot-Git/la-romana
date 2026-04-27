'use client';

import { useState } from 'react';
import {
    GeneralBet,
    GeneralBetPool,
    GeneralBetType,
    usePlaceGeneralBet,
} from '@/hooks/useBetting';
import { formatCurrency } from '@/lib/currency';

const BET_TYPE_LABELS: Record<GeneralBetType, { title: string; description: string }> = {
    tournament_winner: { title: 'Ganador del Torneo', description: '¿Piratas o Fantasmas?' },
    exact_score: { title: 'Marcador Exacto', description: 'Predice el marcador final (suma 36)' },
    mvp: { title: 'MVP', description: 'El mejor jugador del torneo' },
    worst_player: { title: 'Peor Jugador', description: 'El que peor le va' },
};

interface Props {
    eventId: string;
    pools: GeneralBetPool[];
    myBets: GeneralBet[];
    onBetPlaced: () => void;
}

export function GeneralBetsSection({ eventId, pools, myBets, onBetPlaced }: Props) {
    if (pools.length === 0) {
        return <div className="py-8 text-center font-fredoka text-white/55">Sin pools.</div>;
    }
    return (
        <div className="flex flex-col gap-3">
            {pools.map(pool => {
                const myBet = myBets.find(b => b.betType === pool.betType);
                return (
                    <GeneralBetPoolCard
                        key={pool.betType}
                        eventId={eventId}
                        pool={pool}
                        myBet={myBet}
                        onPlaced={onBetPlaced}
                    />
                );
            })}
        </div>
    );
}

function GeneralBetPoolCard({
    eventId,
    pool,
    myBet,
    onPlaced,
}: {
    eventId: string;
    pool: GeneralBetPool;
    myBet?: GeneralBet;
    onPlaced: () => void;
}) {
    const meta = BET_TYPE_LABELS[pool.betType];
    const { placeGeneralBet, isSubmitting, error } = usePlaceGeneralBet();
    const [selected, setSelected] = useState<string>(myBet?.pickedOutcome ?? '');
    const [exactRed, setExactRed] = useState<string>(myBet && pool.betType === 'exact_score' ? myBet.pickedOutcome.split('-')[0] : '');
    const [exactBlue, setExactBlue] = useState<string>(myBet && pool.betType === 'exact_score' ? myBet.pickedOutcome.split('-')[1] : '');

    const isPlayerBet = pool.betType === 'mvp' || pool.betType === 'worst_player';

    const handleSubmit = async () => {
        let pickedOutcome = selected;
        if (pool.betType === 'exact_score') {
            const r = parseInt(exactRed, 10);
            const b = parseInt(exactBlue, 10);
            if (isNaN(r) || isNaN(b) || r + b !== 36) return;
            pickedOutcome = `${r}-${b}`;
        }
        if (!pickedOutcome) return;
        const ok = await placeGeneralBet({ eventId, betType: pool.betType, pickedOutcome });
        if (ok) onPlaced();
    };

    const myPickLabel = (): string | null => {
        if (!myBet) return null;
        if (pool.betType === 'tournament_winner') return myBet.pickedOutcome === 'red' ? 'Piratas' : 'Fantasmas';
        if (isPlayerBet) {
            const all = [...pool.redPlayerNames, ...pool.bluePlayerNames];
            const found = all.find(s => s.startsWith(myBet.pickedOutcome + ':'));
            return found ? found.split(':')[1] : myBet.pickedOutcome;
        }
        return myBet.pickedOutcome;
    };

    return (
        <div className="overflow-hidden rounded-[14px] border-[2px] border-[#31316b] bg-gradient-to-b from-[#1c2f3e] to-[#0f172b] shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#31316b]/60 px-4 py-3">
                <div className="min-w-0">
                    <div className="font-bangers text-base uppercase tracking-wider text-white">
                        {meta.title}
                    </div>
                    <div className="font-fredoka text-[11px] text-white/55">{meta.description}</div>
                </div>
                <div className="text-right">
                    <div className="font-bangers text-[9px] uppercase tracking-wider text-white/45">Pozo</div>
                    <div className="font-bowlby text-base text-[#fbbc05]">{formatCurrency(pool.pot)}</div>
                </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
                {myBet && (
                    <div className="mb-3 flex items-center justify-between rounded-[10px] border border-emerald-500/40 bg-emerald-900/20 px-3 py-2">
                        <span className="font-bangers text-[10px] uppercase tracking-wider text-emerald-300/85">
                            Tu pick
                        </span>
                        <span className="font-bangers text-sm uppercase tracking-wider text-white">
                            {myPickLabel()}
                        </span>
                    </div>
                )}

                {pool.isResolved && (
                    <div className="mb-3 rounded-[10px] border border-[#fbbc05]/50 bg-[#fbbc05]/10 px-3 py-2 font-fredoka text-xs text-[#fbbc05]/95">
                        ✓ Resuelto: {pool.winningOutcome}
                    </div>
                )}

                {pool.betType === 'tournament_winner' && (
                    <div className="grid grid-cols-2 gap-2">
                        <SelectButton
                            active={selected === 'red'}
                            onClick={() => setSelected('red')}
                            disabled={pool.isResolved}
                            tone="red"
                            label="Piratas"
                            count={pool.outcomePartes.red ?? 0}
                        />
                        <SelectButton
                            active={selected === 'blue'}
                            onClick={() => setSelected('blue')}
                            disabled={pool.isResolved}
                            tone="blue"
                            label="Fantasmas"
                            count={pool.outcomePartes.blue ?? 0}
                        />
                    </div>
                )}

                {pool.betType === 'exact_score' && (
                    <div className="space-y-2">
                        <div className="flex items-end gap-2">
                            <ScoreField label="Piratas" value={exactRed} onChange={setExactRed} disabled={pool.isResolved || !!myBet} />
                            <span className="pb-2 font-bangers text-base text-white/45">–</span>
                            <ScoreField label="Fantasmas" value={exactBlue} onChange={setExactBlue} disabled={pool.isResolved || !!myBet} />
                        </div>
                        <div className="font-fredoka text-[11px] text-white/45">
                            Suma debe ser <span className="text-[#fbbc05]">36</span>{' '}
                            (actual: {(parseInt(exactRed) || 0) + (parseInt(exactBlue) || 0)})
                        </div>
                    </div>
                )}

                {isPlayerBet && (
                    <PlayerSelect
                        red={pool.redPlayerNames}
                        blue={pool.bluePlayerNames}
                        value={selected}
                        onChange={setSelected}
                        disabled={pool.isResolved || !!myBet}
                    />
                )}

                {error && (
                    <div className="mt-2 rounded-[8px] bg-rose-900/40 px-3 py-2 font-fredoka text-xs text-rose-200">
                        {error}
                    </div>
                )}

                {!myBet && !pool.isResolved && (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (pool.betType !== 'exact_score' && !selected) || (pool.betType === 'exact_score' && (parseInt(exactRed) || 0) + (parseInt(exactBlue) || 0) !== 36)}
                        className="mt-3 w-full rounded-full border-[2px] border-[#1e293b] bg-gradient-to-b from-[#fce8b2] via-[#fbbc05] to-[#e37400] py-2.5 font-bangers text-sm uppercase tracking-wider text-[#1e293b] shadow-[0_3px_0_#1e293b] disabled:opacity-50"
                    >
                        {isSubmitting ? 'Guardando…' : `Apostar ${formatCurrency(2)}`}
                    </button>
                )}

                <div className="mt-3 flex items-center justify-between font-fredoka text-[11px] text-white/45">
                    <span>{pool.betsCount} apuesta{pool.betsCount !== 1 ? 's' : ''}</span>
                    {pool.betsCount > 0 && (
                        <span className="font-bangers uppercase tracking-wider">
                            Repartir: {formatCurrency(pool.pot / Math.max(1, pool.betsCount))} / acertador
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function SelectButton({
    active,
    onClick,
    disabled,
    tone,
    label,
    count,
}: {
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
    tone: 'red' | 'blue';
    label: string;
    count: number;
}) {
    const teamClass = tone === 'red' ? 'text-team-red' : 'text-team-blue';
    const ring = active ? 'border-[#fbbc05] bg-[#fbbc05]/15' : 'border-[#31316b]/60 bg-[#0a1322]/80';
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex flex-col rounded-[12px] border-[2px] px-3 py-2.5 text-left disabled:opacity-50 ${ring}`}
        >
            <span className={`font-bangers text-base uppercase tracking-wider ${teamClass}`}>{label}</span>
            <span className="mt-0.5 font-fredoka text-[10px] text-white/55">{count} bets</span>
        </button>
    );
}

function ScoreField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (s: string) => void;
    disabled?: boolean;
}) {
    return (
        <label className="flex flex-1 flex-col">
            <span className="mb-1 font-bangers text-[10px] uppercase tracking-wider text-white/55">{label}</span>
            <input
                type="number"
                inputMode="numeric"
                min={0}
                max={36}
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                className="rounded-[10px] border-[2px] border-[#31316b] bg-[#0a1322] px-3 py-2 text-center font-bowlby text-lg text-white outline-none focus:border-[#fbbc05] disabled:opacity-50"
                placeholder="0"
            />
        </label>
    );
}

function PlayerSelect({
    red,
    blue,
    value,
    onChange,
    disabled,
}: {
    red: string[];
    blue: string[];
    value: string;
    onChange: (s: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <div>
                <div className="mb-1 font-bangers text-[10px] uppercase tracking-wider text-team-red">Piratas</div>
                <div className="flex flex-wrap gap-1.5">
                    {red.map(entry => {
                        const [id, name] = entry.split(':');
                        const active = value === id;
                        return (
                            <button
                                key={id}
                                onClick={() => onChange(id)}
                                disabled={disabled}
                                className={`rounded-full border px-3 py-1 font-bangers text-xs uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                    active
                                        ? 'border-[#fbbc05] bg-[#fbbc05]/20 text-team-red'
                                        : 'border-[#31316b]/60 bg-[#0a1322]/70 text-white/65 hover:text-white'
                                }`}
                            >
                                {name}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div>
                <div className="mb-1 font-bangers text-[10px] uppercase tracking-wider text-team-blue">Fantasmas</div>
                <div className="flex flex-wrap gap-1.5">
                    {blue.map(entry => {
                        const [id, name] = entry.split(':');
                        const active = value === id;
                        return (
                            <button
                                key={id}
                                onClick={() => onChange(id)}
                                disabled={disabled}
                                className={`rounded-full border px-3 py-1 font-bangers text-xs uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                    active
                                        ? 'border-[#fbbc05] bg-[#fbbc05]/20 text-team-blue'
                                        : 'border-[#31316b]/60 bg-[#0a1322]/70 text-white/65 hover:text-white'
                                }`}
                            >
                                {name}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
