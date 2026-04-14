'use client';

import { useRef, useEffect } from 'react';

const CELEBRATION_VIDEOS: Record<string, string> = {
    red: '/videos/carinositos_win_hole.mp4',
    blue: '/videos/pitufos_win_hole.mp4',
    red_tournament: '/videos/carinositos_win_torneo.mp4',
    blue_tournament: '/videos/pitufos_win_torneo.mp4',
};

interface CelebrationOverlayProps {
    team: 'red' | 'blue';
    variant?: 'hole' | 'tournament';
    onClose: () => void;
}

export function CelebrationOverlay({ team, variant = 'hole', onClose }: CelebrationOverlayProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Try to auto-play (may require user interaction on some browsers)
        videoRef.current?.play().catch(() => {
            // If autoplay blocked, dismiss after short delay
            setTimeout(onClose, 1000);
        });
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
            onClick={onClose}
        >
            <video
                ref={videoRef}
                src={CELEBRATION_VIDEOS[variant === 'tournament' ? `${team}_tournament` : team] || CELEBRATION_VIDEOS[team]}
                className="max-w-[90vw] max-h-[70vh] rounded-2xl shadow-2xl"
                playsInline
                muted
                onEnded={onClose}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}
