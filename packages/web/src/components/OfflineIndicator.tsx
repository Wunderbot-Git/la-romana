'use client';

import { useSync } from '@/lib/syncContext';

export function OfflineIndicator() {
    const { status, pendingCount, sync } = useSync();

    // Don't show if online and synced
    if (status === 'online' && pendingCount === 0) {
        return null;
    }

    const statusConfig = {
        online: {
            bg: 'bg-forest-deep',
            text: 'Todo sincronizado',
            icon: '✓',
        },
        offline: {
            bg: 'bg-brass',
            text: pendingCount > 0 ? `Sin conexión - ${pendingCount} pendientes` : 'Sin conexión',
            icon: '⚡',
        },
        syncing: {
            bg: 'bg-team-blue',
            text: 'Sincronizando...',
            icon: '↻',
        },
        error: {
            bg: 'bg-team-red',
            text: `Error de sincronización - ${pendingCount} pendientes`,
            icon: '!',
        },
    };

    const config = statusConfig[status];

    const handleClick = async () => {
        if (status !== 'syncing') {
            await sync();
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={status === 'syncing'}
            className={`fixed bottom-20 left-1/2 -translate-x-1/2 ${config.bg} text-cream px-4 py-2 rounded-full shadow-lg gold-border flex items-center gap-2 text-sm font-fredoka font-medium z-40`}
        >
            <span className={status === 'syncing' ? 'animate-spin' : ''}>{config.icon}</span>
            <span>{config.text}</span>
        </button>
    );
}
