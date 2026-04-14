'use client';

import { useState, useEffect } from 'react';
import { syncService, SyncStatus } from '@/lib/sync';
import { db } from '@/lib/db';

const STATUS_LABELS: Record<SyncStatus, { label: string; color: string; dot: string }> = {
    online: { label: 'En línea', color: 'text-green-600', dot: 'bg-green-500' },
    offline: { label: 'Sin conexión', color: 'text-forest-deep/50', dot: 'bg-forest-deep/30' },
    syncing: { label: 'Sincronizando...', color: 'text-gold-border', dot: 'bg-gold-border' },
    error: { label: 'Error de sincronización', color: 'text-team-red', dot: 'bg-team-red' },
};

export function AppInfoSection() {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
    const [pendingCount, setPendingCount] = useState(syncService.getPendingCount());
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const unsubscribe = syncService.subscribe((status, pending) => {
            setSyncStatus(status);
            setPendingCount(pending);
            if (status !== 'syncing') setIsSyncing(false);
        });
        return unsubscribe;
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        await syncService.sync();
    };

    const handleClearCache = async () => {
        if (!window.confirm('¿Borrar todos los datos locales? Esto eliminará scores y eventos en caché. Los elementos pendientes de sincronización también se borrarán.')) {
            return;
        }
        await db.clearAll();
        window.location.reload();
    };

    const statusInfo = STATUS_LABELS[syncStatus];

    return (
        <div className="bg-white thick-border rounded-[20px] p-4">
            <h2 className="text-xs font-bangers text-[#1e293b] uppercase tracking-widest mb-3">App</h2>

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                    <span className={`text-sm font-fredoka font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                    {pendingCount > 0 && (
                        <span className="text-[10px] text-forest-deep/40 font-fredoka font-medium">({pendingCount} pendientes)</span>
                    )}
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing || syncStatus === 'offline'}
                    className="px-3 py-1.5 bg-forest-deep/10 text-forest-deep/60 rounded-lg text-xs font-bangers disabled:opacity-50 border border-gold-border/20"
                >
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
            </div>

            <button
                onClick={handleClearCache}
                className="w-full py-2 text-forest-deep/50 bg-forest-deep/5 border border-gold-border/20 rounded-xl text-xs font-fredoka font-semibold hover:bg-forest-deep/10 transition-colors mb-3"
            >
                Borrar Datos Locales
            </button>

            <p className="text-[10px] text-forest-deep/30 text-center font-fredoka">Ryder Cup Par00 v1.0.0</p>
        </div>
    );
}
