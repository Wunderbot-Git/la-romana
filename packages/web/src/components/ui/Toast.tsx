'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    duration?: number;
    onDone: () => void;
}

export function Toast({ message, type = 'success', duration = 2000, onDone }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onDone, 300); // wait for fade-out
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onDone]);

    const bg = type === 'success'
        ? 'bg-green-600'
        : 'bg-team-red';

    return (
        <div
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-fredoka font-medium flex items-center gap-2 transition-all duration-300 ${bg} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
            {type === 'success' ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3 3 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
            )}
            {message}
        </div>
    );
}
