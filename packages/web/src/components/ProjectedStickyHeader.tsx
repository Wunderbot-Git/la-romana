'use client';

import { ReactNode } from 'react';

interface ProjectedStickyHeaderProps {
    projectedRed: number;
    projectedBlue: number;
    isExpanded?: boolean;
    onToggle?: () => void;
    detailContent?: ReactNode;
    detachedTop?: boolean;
}

export function ProjectedStickyHeader({
    projectedRed,
    projectedBlue,
    isExpanded,
    onToggle,
    detailContent,
    detachedTop = false,
}: ProjectedStickyHeaderProps) {
    return (
        <div className={`px-2 pb-2 ${detachedTop ? 'pt-0' : 'pt-2'} transition-all duration-300`}>
            <div className={`bg-forest-deep gold-border shadow-sm overflow-hidden ${detachedTop ? 'rounded-b-xl rounded-t-none border-t-0' : 'rounded-xl'} mb-0`}>

                {/* PROJECTED SECTION */}
                <div
                    onClick={onToggle}
                    className="cursor-pointer transition-colors pb-3 hover:bg-forest-mid/30 pt-2"
                >
                    <div className="flex items-center justify-center gap-2 py-1">
                        <span className="text-[10px] font-bangers text-gold-light tracking-[0.2em] uppercase">PROYECTADO</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`text-gold-border transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>

                    <div className="flex justify-center items-center gap-8">
                        <div className="text-3xl font-bangers text-team-red opacity-80">
                            {projectedRed.toFixed(1).replace('.0', '')}
                        </div>
                        <div className="text-sm font-bangers text-gold-light italic">VS</div>
                        <div className="text-3xl font-bangers text-team-blue opacity-80">
                            {projectedBlue.toFixed(1).replace('.0', '')}
                        </div>
                    </div>
                </div>

                {/* EXPANDED CONTENT: PROJECTED */}
                {isExpanded && detailContent && (
                    <div className="border-t border-gold-border/30 bg-forest-mid/30">
                        {detailContent}
                    </div>
                )}
            </div>
        </div>
    );
}
