'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const threshold = 150; // px to pull down to trigger

    const handleTouchStart = (e: React.TouchEvent) => {
        // Only valid if scrolled to top
        if (window.scrollY === 0 && !refreshing) {
            setStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startY === 0 || refreshing || window.scrollY > 0) return;

        const touchY = e.touches[0].clientY;
        const diff = touchY - startY;

        if (diff > 0) {
            setCurrentY(diff * 0.4); // Resistance
        }
    };

    const handleTouchEnd = async () => {
        if (refreshing || startY === 0) return;

        if (currentY > 60) { // Trigger threshold
            setRefreshing(true);
            setCurrentY(60); // Snap to loading position
            await onRefresh();
            setRefreshing(false);
            setCurrentY(0);
        } else {
            setCurrentY(0);
        }
        setStartY(0);
    };

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="min-h-screen relative"
        >
            {/* Loading Indicator */}
            <div
                className="absolute top-0 left-0 w-full flex justify-center items-center pointer-events-none transition-transform duration-200 z-50 mt-16"
                style={{
                    height: '60px',
                    transform: `translateY(${currentY - 60}px)`,
                    opacity: currentY > 0 ? 1 : 0
                }}
            >
                <div className={`w-8 h-8 rounded-full bg-cream shadow-md gold-border flex items-center justify-center ${refreshing ? 'animate-spin' : ''}`}>
                    {refreshing ? (
                        <span className="text-gold-border font-bold text-lg">↻</span>
                    ) : (
                        <span className="text-forest-deep/40 font-bold text-lg" style={{ transform: `rotate(${currentY * 3}deg)` }}>↓</span>
                    )}
                </div>
            </div>

            <div
                style={{
                    transform: currentY > 0 ? `translateY(${currentY}px)` : undefined,
                    transition: refreshing ? 'transform 0.2s' : 'transform 0.2s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
}
