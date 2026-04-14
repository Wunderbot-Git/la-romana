'use client';

interface MatchHeaderProps {
    title?: string;
    status: string;
    onMenuClick?: () => void;
}

export function MatchHeader({ title = 'MATCH PLAY', status, onMenuClick }: MatchHeaderProps) {
    const getBadgeColor = () => {
        if (status.includes('UP')) {
            if (status.includes('RED') || status.startsWith('-')) {
                return 'bg-team-red';
            }
            return 'bg-team-blue';
        }
        return 'bg-forest-mid';
    };

    return (
        <div className="bg-forest-deep gold-border rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
                {onMenuClick && (
                    <button onClick={onMenuClick} className="text-gold-light p-2">
                        ☰
                    </button>
                )}

                <div className="flex-1 text-center">
                    <h2 className="text-sm font-bangers text-gold-light">{title}</h2>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-white text-xs font-bangers ${getBadgeColor()}`}>
                        {status}
                    </span>
                </div>

                {onMenuClick && <div className="w-10"></div>}
            </div>
        </div>
    );
}
