'use client';

interface CompletedBreakdownProps {
    segmentScores: {
        singles: { red: number; blue: number };
        fourball: { red: number; blue: number };
        scramble: { red: number; blue: number };
    };
}

export function CompletedBreakdown({ segmentScores }: CompletedBreakdownProps) {
    const Row = ({ label, red, blue }: { label: string, red: number, blue: number }) => (
        <div className="flex items-center py-3 border-b border-[rgba(255,255,255,0.15)] last:border-0 relative px-4 sm:px-8">
            {/* BLUE (Left) */}
            <div className="flex-1 flex justify-center">
                <span className={`text-[28px] sm:text-[34px] font-bangers w-16 text-center ${blue > 0 ? 'text-[#4A90D9]' : 'text-[#4a4a8e]'}`} style={blue > 0 ? { filter: 'drop-shadow(0px 0px 4px rgba(74,144,217,0.8))', WebkitTextStroke: '2px #1e293b' } : {}}>
                    {blue}
                </span>
            </div>
            {/* LABEL (Center) */}
            <div className="w-[120px] shrink-0 flex justify-center items-center relative h-full">
                <span className="whitespace-nowrap text-[16px] sm:text-[20px] font-bangers uppercase tracking-widest text-[#d5d5d5]" style={{ textShadow: '2px 2px 0px #1e293b' }}>
                    {label}
                </span>
            </div>
            {/* RED (Right) */}
            <div className="flex-1 flex justify-center">
                <span className={`text-[28px] sm:text-[34px] font-bangers w-16 text-center ${red > 0 ? 'text-[#E75480]' : 'text-[#4a4a8e]'}`} style={red > 0 ? { filter: 'drop-shadow(0px 0px 4px rgba(231,84,128,0.8))', WebkitTextStroke: '2px #1e293b' } : {}}>
                    {red}
                </span>
            </div>
        </div>
    );

    return (
        <div className="px-2">
            <Row label="INDIVIDUAL" red={segmentScores.singles.red} blue={segmentScores.singles.blue} />
            <Row label="MEJOR BOLA" red={segmentScores.fourball.red} blue={segmentScores.fourball.blue} />
            <Row label="SCRAMBLE" red={segmentScores.scramble.red} blue={segmentScores.scramble.blue} />
        </div>
    );
}
