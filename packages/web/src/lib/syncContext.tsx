'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { syncService, SyncStatus } from './sync';

interface SyncContextType {
    status: SyncStatus;
    pendingCount: number;
    isOnline: boolean;
    sync: () => Promise<void>;
    addPendingScore: (params: {
        eventId: string;
        flightId: string;
        playerId: string;
        hole: number;
        score: number;
    }) => Promise<string>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
    const [pendingCount, setPendingCount] = useState(syncService.getPendingCount());

    useEffect(() => {
        const unsubscribe = syncService.subscribe((newStatus, count) => {
            setStatus(newStatus);
            setPendingCount(count);
        });

        return unsubscribe;
    }, []);

    const sync = async () => {
        await syncService.sync();
    };

    const addPendingScore = async (params: {
        eventId: string;
        flightId: string;
        playerId: string;
        hole: number;
        score: number;
    }) => {
        return syncService.addPendingScore(params);
    };

    return (
        <SyncContext.Provider
            value={{
                status,
                pendingCount,
                isOnline: syncService.isNetworkOnline(),
                sync,
                addPendingScore,
            }}
        >
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
}
