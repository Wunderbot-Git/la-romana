import { Match } from '@/hooks/useLeaderboard';


interface ScoreBreakdownProps {
    segmentScores: {
        singles: { red: number; blue: number };
        fourball: { red: number; blue: number };
        scramble: { red: number; blue: number };
    };
    matches: Match[];
    onMatchClick?: (match: Match) => void;
}

export function ScoreBreakdown({ segmentScores, matches, onMatchClick }: ScoreBreakdownProps) {
    const Segment = ({ label, type }: { label: string, type: 'singles' | 'fourball' | 'scramble' }) => {
        const segmentMatches = (matches || [])
            .filter(m => (type === 'singles' ? m.segmentType.startsWith('singles') : m.segmentType === type) && m.status !== 'completed')
            .sort((a, b) => {
                if (a.status === 'not_started' && b.status !== 'not_started') return 1;
                if (a.status !== 'not_started' && b.status === 'not_started') return -1;
                return 0;
            });

        let redDelta = 0;
        let blueDelta = 0;
        const pts = type === 'scramble' ? 2 : 1;

        segmentMatches.forEach(m => {
            if (m.status === 'not_started') {
                redDelta += (pts / 2);
                blueDelta += (pts / 2);
            } else if (m.currentLeader === 'red') {
                redDelta += pts;
            } else if (m.currentLeader === 'blue') {
                blueDelta += pts;
            } else if (m.matchWinner === 'red') {
                redDelta += pts;
            } else if (m.matchWinner === 'blue') {
                blueDelta += pts;
            } else {
                redDelta += (pts / 2);
                blueDelta += (pts / 2);
            }
        });

        const formatDelta = (n: number) => n === 0 ? '0' : `+${n}`;
        const liveCount = segmentMatches.filter(m => m.status !== 'not_started').length;

        return (
            <div className="py-4 border-b border-[rgba(255,255,255,0.15)] last:border-0 relative">
                <div className="flex justify-center items-end mb-2 relative z-10 w-full">
                    <div className="flex flex-col items-center gap-1">
                        <span className="font-bangers text-white text-[20px] tracking-wider" style={{ textShadow: '2px 2px 0px #1e293b' }}>
                            {label}
                        </span>
                        {liveCount > 0 && (
                            <div className="flex items-center gap-1.5 bg-[#151532] border border-[#31316b] px-3 py-1 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                <span className="text-[11px] text-[#fce8b2] font-bangers tracking-widest uppercase">
                                    {liveCount} {liveCount === 1 ? 'EN VIVO' : 'EN VIVO'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-6 px-2 sm:px-8 relative z-10">
                    {/* BLUE DELTA (Left) */}
                    <span className={`text-[28px] sm:text-[34px] font-bangers w-16 text-center ${segmentMatches.length > 0 ? 'text-[#4A90D9]' : 'text-[#4a4a8e]'}`} style={segmentMatches.length > 0 ? { filter: 'drop-shadow(0px 0px 4px rgba(74,144,217,0.8))', WebkitTextStroke: '2px #1e293b' } : {}}>
                        {formatDelta(blueDelta)}
                    </span>

                    <div className="flex-1 flex justify-center py-2 h-8">
                        <div className="grid grid-cols-6 gap-2 sm:gap-3 place-items-center w-full max-w-[180px]">
                            {segmentMatches.length > 0 ? segmentMatches.map((m, i) => {
                                let dotStyle = '';
                                let glowStyle = '';

                                if (m.status === 'not_started') {
                                    dotStyle = 'bg-[#4a4a6e] border-[#1e293b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]';
                                } else if (m.currentLeader === 'red' || m.matchWinner === 'red') {
                                    dotStyle = 'bg-[#E75480] border-[#1e293b]';
                                    glowStyle = '0 0 8px rgba(231,84,128,0.6), inset 0 2px 2px rgba(255,255,255,0.4)';
                                } else if (m.currentLeader === 'blue' || m.matchWinner === 'blue') {
                                    dotStyle = 'bg-[#4A90D9] border-[#1e293b]';
                                    glowStyle = '0 0 8px rgba(74,144,217,0.6), inset 0 2px 2px rgba(255,255,255,0.4)';
                                } else {
                                    // Tied or in_progress without leader
                                    dotStyle = 'bg-[#F0C850] border-[#1e293b] relative z-10';
                                    glowStyle = '0 0 10px rgba(240,200,80,0.8), inset 0 2px 4px rgba(255,255,255,0.6)';
                                }

                                // Precise Grid Column Alignment Logic
                                const isThreeItems = segmentMatches.length === 3;
                                const isFourItems = segmentMatches.length === 4;
                                const colSpan = isThreeItems ? 'col-span-2' : 'col-span-1';
                                const startClass = (isFourItems && i === 0) ? 'col-start-2' : '';

                                return (
                                    <div key={m.id || i} title={m.matchStatus} className={`relative group cursor-pointer flex justify-center w-full h-full items-center ${startClass} ${colSpan}`} onClick={() => onMatchClick?.(m)}>
                                        <div
                                            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[2px] transition-all duration-300 ${dotStyle} ${m.status === 'in_progress' ? 'animate-pulse' : ''}`}
                                            style={glowStyle ? { boxShadow: glowStyle } : {}}
                                        />
                                    </div>
                                );
                            }) : (
                                <div className="col-span-6 w-full text-center text-[11px] text-[#4a4a8e] font-bangers tracking-wider uppercase">
                                    Todos los partidos terminados
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RED DELTA (Right) */}
                    <span className={`text-[28px] sm:text-[34px] font-bangers w-16 text-center ${segmentMatches.length > 0 ? 'text-[#E75480]' : 'text-[#4a4a8e]'}`} style={segmentMatches.length > 0 ? { filter: 'drop-shadow(0px 0px 4px rgba(231,84,128,0.8))', WebkitTextStroke: '2px #1e293b' } : {}}>
                        {formatDelta(redDelta)}
                    </span>
                </div>
            </div>
        )
    };

    return (
        <div className="w-full flex justify-center flex-col px-1 sm:px-4 mt-2">

            {/* Mini-Ribbon for Header */}
            <div className="flex justify-center w-full mb-6 relative">
                <div className="z-40 bg-gradient-to-b from-[#2D8B24] to-[#1B5E20] border-[3px] border-[#1e293b] rounded-[10px] py-1.5 px-6 shadow-[0_4px_0_#1e293b,inset_0_2px_0_rgba(255,255,255,0.4)] whitespace-nowrap inline-block">
                    <h3 className="text-[14px] sm:text-[16px] font-bangers text-[#fffbeb] tracking-widest uppercase m-0 leading-tight" style={{ textShadow: '0 2px 0 #1e293b' }}>
                        PARTIDOS EN VIVO Y POR JUGAR
                    </h3>
                </div>
            </div>

            <div className="w-full">
                <Segment label="Individual" type="singles" />
                <Segment label="Mejor Bola" type="fourball" />
                <Segment label="Scramble" type="scramble" />
            </div>
        </div>
    );
}

