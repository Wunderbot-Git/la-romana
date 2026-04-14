'use client';

import { db, PendingScore } from './db';
import { api } from './api';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

interface SyncResult {
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
}

class SyncService {
    private isOnline: boolean = true;
    private status: SyncStatus = 'online';
    private pendingCount: number = 0;
    private listeners: Set<(status: SyncStatus, pending: number) => void> = new Set();

    constructor() {
        if (typeof window !== 'undefined') {
            this.isOnline = navigator.onLine;
            this.status = this.isOnline ? 'online' : 'offline';

            window.addEventListener('online', () => this.handleOnline());
            window.addEventListener('offline', () => this.handleOffline());

            // Initialize pending count
            this.updatePendingCount();
        }
    }

    private async handleOnline() {
        this.isOnline = true;
        this.status = 'online';
        this.notifyListeners();

        // Auto-sync when coming online
        await this.sync();
    }

    private handleOffline() {
        this.isOnline = false;
        this.status = 'offline';
        this.notifyListeners();
    }

    private notifyListeners() {
        this.listeners.forEach((listener) => listener(this.status, this.pendingCount));
    }

    subscribe(listener: (status: SyncStatus, pending: number) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private async updatePendingCount(): Promise<void> {
        try {
            const queue = await db.getSyncQueue();
            this.pendingCount = queue.length;
            this.notifyListeners();
        } catch {
            // Ignore errors during count update
        }
    }

    getStatus(): SyncStatus {
        return this.status;
    }

    getPendingCount(): number {
        return this.pendingCount;
    }

    isNetworkOnline(): boolean {
        return this.isOnline;
    }

    async addPendingScore(params: {
        eventId: string;
        flightId: string;
        playerId: string;
        hole: number;
        score: number;
    }): Promise<string> {
        const id = await db.addToSyncQueue(params);
        await this.updatePendingCount();

        // Try to sync immediately if online
        if (this.isOnline) {
            this.sync().catch(() => {
                // Ignore sync errors, will retry later
            });
        }

        return id;
    }

    async sync(): Promise<SyncResult> {
        if (!this.isOnline) {
            return { success: false, synced: 0, failed: 0, errors: ['Offline'] };
        }

        this.status = 'syncing';
        this.notifyListeners();

        const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

        try {
            const queue = await db.getSyncQueue();

            for (const item of queue) {
                try {
                    // Submit to API (last-write-wins)
                    await api.post(`/events/${item.eventId}/flights/${item.flightId}/scores`, {
                        playerId: item.playerId,
                        hole: item.hole,
                        score: item.score,
                        timestamp: item.timestamp, // Server uses this for conflict resolution
                    });

                    // Remove from queue on success
                    await db.removeFromSyncQueue(item.id);
                    result.synced++;
                } catch (error) {
                    result.failed++;
                    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
                }
            }

            this.status = result.failed > 0 ? 'error' : 'online';
            result.success = result.failed === 0;
        } catch (error) {
            this.status = 'error';
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : 'Sync failed');
        }

        await this.updatePendingCount();
        this.notifyListeners();

        return result;
    }
}

export const syncService = new SyncService();
