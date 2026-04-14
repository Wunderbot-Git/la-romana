'use client';

interface MomentumIndicatorProps {
    momentum: 'red' | 'blue' | 'neutral';
}

export function MomentumIndicator({ momentum }: MomentumIndicatorProps) {
    if (momentum === 'neutral') {
        return (
            <div className="flex items-center gap-1 text-gold-border/60">
                <span className="text-sm">→</span>
                <span className="text-xs font-fredoka">Neutral</span>
            </div>
        );
    }

    const isRed = momentum === 'red';
    const color = isRed ? 'text-team-red' : 'text-team-blue';
    const arrow = isRed ? '←' : '→';
    const label = isRed ? 'Cariñositos' : 'Pitufos';

    return (
        <div className={`flex items-center gap-1 ${color}`}>
            <span className="text-lg font-bold animate-pulse">{arrow}</span>
            <span className="text-xs font-fredoka">{label}</span>
        </div>
    );
}
