'use client';

interface TeamScoreHeaderProps {
    redScore: number;
    blueScore: number;
    projectedRed: number;
    projectedBlue: number;
    isCurrentExpanded?: boolean;
    onToggleCurrent?: () => void;
    currentDetailContent?: React.ReactNode;
    isProjectedExpanded?: boolean;
    onToggleProjected?: () => void;
    projectedDetailContent?: React.ReactNode;
    showProjected?: boolean;
    minimized?: boolean;
    detachedBottom?: boolean;
}

export function TeamScoreHeader({
    redScore,
    blueScore,
    projectedRed,
    projectedBlue,
    isCurrentExpanded,
    onToggleCurrent,
    currentDetailContent,
    isProjectedExpanded,
    onToggleProjected,
    projectedDetailContent,
    showProjected = true,
    minimized = false,
    detachedBottom = false,
}: TeamScoreHeaderProps) {
    if (minimized) {
        return (
            <div className="pt-2 px-2 pb-2 transition-all duration-300">
                <div className="bg-[#1a1a3e] border-[3px] border-[#4a4a8e] rounded-xl overflow-hidden mb-0 py-2 px-6 flex items-center justify-between h-[50px]">
                    <div className="text-2xl font-bangers text-[#4A90D9]">
                        {projectedBlue.toFixed(1).replace('.0', '')}
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bangers text-[#F0C850] uppercase tracking-widest leading-none">PROYECTADO</span>
                    </div>
                    <div className="text-2xl font-bangers text-[#E75480]">
                        {projectedRed.toFixed(1).replace('.0', '')}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-8 px-4 pb-2 relative z-20">
            <div className="relative mt-2">
                {/* 1. MARCADOR Ribbon directly clipping onto the panel */}
                <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-[320px] flex justify-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
                    <div className="bg-gradient-to-b from-[#2D8B24] to-[#1B5E20] text-center font-bangers tracking-wider py-1.5 px-3 sm:px-6 border-[4px] border-[#1e293b] rounded-[16px] relative w-full shadow-[inset_0_4px_0_rgba(255,255,255,0.4),0_6px_0_#1e293b] z-20 flex items-center justify-between">
                        {/* Decorator Left (Star) */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fce8b2" stroke="#1e293b" strokeWidth="2.5" className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] transform -rotate-12 shrink-0">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>

                        <span className="text-[20px] sm:text-[24px] relative z-30 text-[#fffbeb] uppercase px-1 leading-tight flex-1" style={{
                            textShadow: '0 3px 0 #1e293b, 0 -1.5px 0 rgba(255,255,255,0.3), 2px 0 0 #1e293b, -2px 0 0 #1e293b, 2px 2px 0 #1e293b, -2px -2px 0 #1e293b'
                        }}>
                            MARCADOR
                        </span>

                        {/* Decorator Right (Star) */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fce8b2" stroke="#1e293b" strokeWidth="2.5" className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] transform rotate-12 shrink-0">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                    </div>
                </div>

                {/* 3. Navy/Dark Blue Scoreboard Panel */}
                <div className={`bg-gradient-to-b from-[#2a2a5e] to-[#1a1a3e] border-[4px] border-[#4a4a8e] shadow-[0_12px_24px_rgba(0,0,0,0.6),inset_0_4px_8px_rgba(255,255,255,0.1)] rounded-[32px] pt-10 sm:pt-10 pb-2 px-2 sm:px-4 relative z-10 mb-8 overflow-hidden`}>
                    <div className="flex flex-col items-center relative z-20">
                        {/* 4. Huge Dramatic Scores Row */}
                        <div className="flex items-center justify-between w-full px-2 sm:px-6 cursor-pointer" onClick={onToggleCurrent}>

                            {/* Blue Score */}
                            <div className="flex flex-col items-center justify-center w-[40%] relative">
                                <div className="relative" style={{ filter: 'drop-shadow(0px 0px 24px rgba(74,144,217,0.7))' }}>
                                    <span
                                        className="text-[80px] sm:text-[100px] leading-none font-bangers absolute left-0 top-0 z-0 text-[#173e6e]"
                                        style={{ WebkitTextStroke: '16px #173e6e', transform: 'translateY(6px)' }}
                                    >
                                        {blueScore}
                                    </span>
                                    <span
                                        className="text-[80px] sm:text-[100px] leading-none font-bangers absolute left-0 top-0 z-0 text-[#1e293b]"
                                        style={{ WebkitTextStroke: '12px #1e293b' }}
                                    >
                                        {blueScore}
                                    </span>
                                    <span
                                        className="text-[80px] sm:text-[100px] leading-none font-bangers relative z-10"
                                        style={{
                                            background: 'linear-gradient(180deg, #A8D1FF 0%, #4A90D9 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            color: 'transparent'
                                        }}
                                    >
                                        {blueScore}
                                    </span>
                                </div>
                            </div>

                            {/* Center Separator Dash */}
                            <div className="flex items-center justify-center w-[20%] relative z-10">
                                <div className="w-6 h-2 rounded-full bg-gradient-to-b from-[#F0C850] to-[#E3A010] border-[2px] border-[#1e293b] shadow-[0_3px_0_#1e293b,0_0_10px_rgba(240,200,80,0.5)]"></div>
                            </div>

                            {/* Pink Score */}
                            <div className="flex flex-col items-center justify-center w-[40%] relative">
                                <div className="relative" style={{ filter: 'drop-shadow(0px 0px 24px rgba(231,84,128,0.7))' }}>
                                    <span
                                        className="text-[80px] sm:text-[100px] leading-none font-bangers absolute left-0 top-0 z-0 text-[#8a1c3d]"
                                        style={{ WebkitTextStroke: '16px #8a1c3d', transform: 'translateY(6px)' }}
                                    >
                                        {redScore}
                                    </span>
                                    <span
                                        className="text-[80px] sm:text-[100px] leading-none font-bangers absolute left-0 top-0 z-0 text-[#1e293b]"
                                        style={{ WebkitTextStroke: '12px #1e293b' }}
                                    >
                                        {redScore}
                                    </span>
                                    <span
                                        className="text-[80px] sm:text-[100px] leading-none font-bangers relative z-10"
                                        style={{
                                            background: 'linear-gradient(180deg, #FFB6C1 0%, #E75480 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            color: 'transparent'
                                        }}
                                    >
                                        {redScore}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Subtler Proyectado Section */}
                        {showProjected && (
                            <div className="flex flex-col items-center mt-2 cursor-pointer w-full" onClick={onToggleCurrent}>
                                <div className="bg-[#151532] border-[2px] border-[#31316b] shadow-inner rounded-full px-8 py-2 flex items-center justify-center gap-4">
                                    <span className="text-[26px] sm:text-[30px] font-bangers text-[#4A90D9] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">
                                        {projectedBlue}
                                    </span>

                                    <span className="text-[16px] sm:text-[18px] font-bangers text-[#F0C850] tracking-widest" style={{ textShadow: '0px 2px 2px rgba(0,0,0,0.8)' }}>
                                        PROYECTADO
                                    </span>

                                    <span className="text-[26px] sm:text-[30px] font-bangers text-[#E75480] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">
                                        {projectedRed}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="w-full flex justify-center text-center mt-2 mb-2 cursor-pointer relative z-40" onClick={onToggleCurrent}>
                            <div className="animate-bounce">
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="20" viewBox="0 0 36 24" fill="none" className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-300 ${isCurrentExpanded ? 'rotate-180' : ''}`}>
                                    <path
                                        d="M4 6 L18 18 L32 6"
                                        stroke="#1e293b"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M4 6 L18 18 L32 6"
                                        stroke="#ffffff"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* EXPANDED CONTENT: UNIFIED */}
                    {isCurrentExpanded && (
                        <div className="w-full relative z-0 pt-2 pb-4">
                            {currentDetailContent && (
                                <div className="mb-2 w-full">
                                    {currentDetailContent}
                                </div>
                            )}
                            {projectedDetailContent && (
                                <div className="mt-4 w-full">
                                    {projectedDetailContent}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
