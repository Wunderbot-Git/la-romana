'use client';

interface TeamScoreHeaderProps {
    redScore: number;
    blueScore: number;
    projectedRed: number;
    projectedBlue: number;
    isCurrentExpanded?: boolean;
    onToggleCurrent?: () => void;
    currentDetailContent?: React.ReactNode;
    showProjected?: boolean;
    minimized?: boolean;
}

/**
 * La Romana 2026 scoreboard header.
 * Visual convention: redScore = Piratas (gold), blueScore = Fantasmas (ice-blue).
 * Prop names stay red/blue to match the DB `team IN ('red','blue')` column.
 */
export function TeamScoreHeader({
    redScore,
    blueScore,
    projectedRed,
    projectedBlue,
    isCurrentExpanded,
    onToggleCurrent,
    currentDetailContent,
    showProjected = true,
    minimized = false,
}: TeamScoreHeaderProps) {
    const redText = formatNum(redScore);
    const blueText = formatNum(blueScore);
    const projectedRedText = formatNum(projectedRed);
    const projectedBlueText = formatNum(projectedBlue);

    if (minimized) {
        return (
            <div className="pt-2 px-4 pb-2">
                <div className="bg-gradient-to-b from-[#1b2c39]/95 to-[#07101b]/95 border border-[#b98546]/70 rounded-[18px] py-2 px-6 flex items-center justify-between h-[50px] shadow-[0_8px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <div className="text-2xl font-bowlby text-[#F0C850] drop-shadow-[0_3px_0_#251304]">
                        {redText}
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[12px] font-bowlby text-[#fbbc05] uppercase leading-none">VS</span>
                        <span className="text-[8px] font-bangers text-white/55 uppercase leading-none mt-0.5">Proyectado</span>
                    </div>
                    <div className="text-2xl font-bowlby text-[#8ed2ff] drop-shadow-[0_3px_0_#07101b]">
                        {blueText}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative z-20 px-4 pb-2 pt-0">
            <div className="relative -mt-4">
                <div className="absolute -top-[40px] left-1/2 z-40 w-[100%] max-w-[420px] -translate-x-1/2 drop-shadow-[0_9px_12px_rgba(0,0,0,0.72)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/banner-marcador.webp"
                        alt="Marcador"
                        className="block h-auto w-full select-none"
                        draggable={false}
                    />
                </div>

                <div
                    className="relative z-10 overflow-hidden rounded-[30px] border border-[#b98546]/75 px-3 pb-5 pt-12"
                    style={{
                        background:
                            'linear-gradient(90deg, rgba(83,48,12,0.74) 0%, rgba(9,16,27,0.96) 48%, rgba(8,38,66,0.82) 100%)',
                        boxShadow:
                            '0 16px 28px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,229,176,0.16), inset 0 0 0 1px rgba(6,10,18,0.92)',
                    }}
                >
                    <img
                        src="/images/scoreboard-smoke.webp"
                        alt=""
                        aria-hidden
                        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-75 mix-blend-screen"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-[55%] bg-[radial-gradient(circle_at_26%_34%,rgba(240,200,80,0.28),transparent_54%)]" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-[55%] bg-[radial-gradient(circle_at_74%_36%,rgba(91,166,220,0.28),transparent_55%)]" />
                    <div className="pointer-events-none absolute inset-x-5 top-2 h-px bg-white/10" />

                    <div
                        className="relative z-10 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-1"
                        onClick={onToggleCurrent}
                    >
                        <ScoreNumber value={redText} tone="gold" />

                        <div className="relative flex w-[68px] items-center justify-center">
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    background:
                                        'radial-gradient(circle at center, rgba(240,200,80,0.72) 0%, rgba(227,116,0,0.32) 34%, transparent 68%)',
                                    filter: 'blur(9px)',
                                }}
                            />
                            <span
                                className="relative font-bowlby text-[46px] leading-none"
                                style={{
                                    background:
                                        'linear-gradient(180deg, #fff8df 0%, #ffd76a 34%, #f08d15 78%, #5d2b08 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    WebkitTextStroke: '3px #3A2410',
                                    filter:
                                        'drop-shadow(0 5px 0 rgba(26,15,5,0.95)) drop-shadow(0 0 18px rgba(240,200,80,0.7))',
                                }}
                            >
                                VS
                            </span>
                        </div>

                        <ScoreNumber value={blueText} tone="ice" />
                    </div>

                    {showProjected && (
                        <div className="relative z-10 mx-auto mt-3 w-full max-w-[316px] cursor-pointer px-2" onClick={onToggleCurrent}>
                            <div
                                className="grid grid-cols-[34px_minmax(34px,auto)_minmax(0,1fr)_minmax(34px,auto)_34px] items-center gap-x-1.5 rounded-full border border-[#6fa6d7]/55 px-2 py-1.5"
                                style={{
                                    background:
                                        'linear-gradient(90deg, rgba(35,22,10,0.94) 0%, rgba(8,16,27,0.96) 50%, rgba(10,34,56,0.96) 100%)',
                                    boxShadow:
                                        'inset 0 2px 5px rgba(0,0,0,0.62), 0 2px 0 rgba(0,0,0,0.42)',
                                }}
                            >
                                <img src="/images/crest-piratas.webp" alt="Piratas" className="h-8 w-8 drop-shadow-[0_2px_2px_rgba(0,0,0,0.72)]" />
                                <span className="justify-self-center font-bowlby text-[26px] leading-none text-[#F0C850] drop-shadow-[0_2px_0_#251304]">
                                    {projectedRedText}
                                </span>
                                <span className="justify-self-center font-bangers text-[16px] uppercase leading-none text-[#ffe7a2] drop-shadow-[0_2px_0_#251304]">
                                    PROYECTADO
                                </span>
                                <span className="justify-self-center font-bowlby text-[26px] leading-none text-[#8ed2ff] drop-shadow-[0_2px_0_#07101b]">
                                    {projectedBlueText}
                                </span>
                                <img src="/images/crest-fantasmas.webp" alt="Fantasmas" className="h-8 w-8 drop-shadow-[0_2px_2px_rgba(0,0,0,0.72)]" />
                            </div>
                        </div>
                    )}

                    {onToggleCurrent && (
                        <div className="relative z-10 mt-5 flex cursor-pointer justify-center" onClick={onToggleCurrent}>
                            <svg
                                width="38"
                                height="24"
                                viewBox="0 0 36 24"
                                fill="none"
                                className={`transition-transform duration-300 ${isCurrentExpanded ? 'rotate-180' : ''}`}
                            >
                                <path d="M4 6 L18 18 L32 6" stroke="#07101b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M4 6 L18 18 L32 6" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    )}

                    {isCurrentExpanded && currentDetailContent && (
                        <div className="w-full pt-3">{currentDetailContent}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ScoreNumber({ value, tone }: { value: string; tone: 'gold' | 'ice' }) {
    const isGold = tone === 'gold';
    const textClass = scoreTextClass(value);
    const outline = isGold ? '#3A2410' : '#17314a';
    const shadow = isGold ? '#1a0f05' : '#050a12';
    const glow = isGold ? 'rgba(240,200,80,0.9)' : 'rgba(91,166,220,0.9)';
    const fill = isGold
        ? 'linear-gradient(180deg,#fff7dc 0%,#ffd978 18%,#f0c850 48%,#b97813 78%,#6d3c0d 100%)'
        : 'linear-gradient(180deg,#ffffff 0%,#dff5ff 18%,#9ed4f5 48%,#4e88c0 78%,#1f4e78 100%)';

    return (
        <div className="flex min-w-0 items-center justify-center">
            <div className="relative font-bowlby leading-none" style={{ filter: `drop-shadow(0 0 26px ${glow})` }}>
                <span
                    className={`absolute inset-0 leading-none ${textClass}`}
                    style={{
                        color: shadow,
                        WebkitTextStroke: `4px ${shadow}`,
                        transform: 'translateY(7px)',
                        opacity: 0.88,
                    }}
                >
                    {value}
                </span>
                <span
                    className={`absolute inset-0 leading-none ${textClass}`}
                    style={{ color: outline, WebkitTextStroke: `12px ${outline}` }}
                >
                    {value}
                </span>
                <span
                    className={`relative leading-none ${textClass}`}
                    style={{
                        background: fill,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    {value}
                </span>
            </div>
        </div>
    );
}

function scoreTextClass(value: string): string {
    if (value.length >= 4) return 'text-[42px]';
    if (value.length === 3) return 'text-[56px]';
    if (value.length === 2) return 'text-[68px]';
    return 'text-[84px]';
}

function formatNum(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}
