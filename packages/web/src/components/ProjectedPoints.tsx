'use client';

interface ProjectedPointsProps {
    projectedRed: number;
    projectedBlue: number;
    totalRed: number;
    totalBlue: number;
}

export function ProjectedPoints({ projectedRed, projectedBlue, totalRed, totalBlue }: ProjectedPointsProps) {
    return (
        <div className="bg-forest-deep gold-border rounded-xl mx-2 mb-4 flex items-center justify-between px-4 py-3 relative overflow-hidden">

            {/* Red Project */}
            <div className="flex flex-col items-center">
                <span className="text-team-red font-bangers text-2xl leading-none">{projectedRed.toFixed(1)}</span>
            </div>

            {/* Center Label */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <span className="text-[10px] font-bangers text-gold-light tracking-[0.2em] uppercase">PROYECTADO</span>
            </div>

            {/* Blue Project */}
            <div className="flex flex-col items-center">
                <span className="text-team-blue font-bangers text-2xl leading-none">{projectedBlue.toFixed(1)}</span>
            </div>
        </div>
    );
}
