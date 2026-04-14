'use client';

const DB_NAME = 'ryder-cup-offline';
const DB_VERSION = 1;

interface PendingScore {
    id: string;
    eventId: string;
    flightId: string;
    playerId: string;
    hole: number;
    score: number;
    timestamp: number;
}

interface CachedEvent {
    id: string;
    data: unknown;
    cachedAt: number;
}

interface CachedScores {
    eventId: string;
    flightId: string;
    data: unknown;
    cachedAt: number;
}

class LocalDatabase {
    private db: IDBDatabase | null = null;
    private isInitialized = false;

    async init(): Promise<void> {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Events cache
                if (!db.objectStoreNames.contains('events')) {
                    db.createObjectStore('events', { keyPath: 'id' });
                }

                // Scores cache
                if (!db.objectStoreNames.contains('scores')) {
                    const store = db.createObjectStore('scores', { keyPath: ['eventId', 'flightId'] });
                    store.createIndex('eventId', 'eventId', { unique: false });
                }

                // Sync queue
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    private async ensureInit(): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    async saveEvent(eventId: string, data: unknown): Promise<void> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readwrite');
            const store = transaction.objectStore('events');
            const record: CachedEvent = { id: eventId, data, cachedAt: Date.now() };
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getEvent(eventId: string): Promise<unknown | null> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events'], 'readonly');
            const store = transaction.objectStore('events');
            const request = store.get(eventId);
            request.onsuccess = () => {
                const result = request.result as CachedEvent | undefined;
                resolve(result?.data ?? null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async saveScores(eventId: string, flightId: string, data: unknown): Promise<void> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['scores'], 'readwrite');
            const store = transaction.objectStore('scores');
            const record: CachedScores = { eventId, flightId, data, cachedAt: Date.now() };
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getScores(eventId: string, flightId: string): Promise<unknown | null> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['scores'], 'readonly');
            const store = transaction.objectStore('scores');
            const request = store.get([eventId, flightId]);
            request.onsuccess = () => {
                const result = request.result as CachedScores | undefined;
                resolve(result?.data ?? null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async addToSyncQueue(item: Omit<PendingScore, 'id' | 'timestamp'>): Promise<string> {
        await this.ensureInit();
        const id = `${item.eventId}-${item.flightId}-${item.playerId}-${item.hole}-${Date.now()}`;
        const record: PendingScore = { ...item, id, timestamp: Date.now() };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.put(record);
            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncQueue(): Promise<PendingScore[]> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const index = store.index('timestamp');
            const request = index.getAll();
            request.onsuccess = () => resolve(request.result as PendingScore[]);
            request.onerror = () => reject(request.error);
        });
    }

    async removeFromSyncQueue(id: string): Promise<void> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearSyncQueue(): Promise<void> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearAll(): Promise<void> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['events', 'scores', 'syncQueue'], 'readwrite');
            transaction.objectStore('events').clear();
            transaction.objectStore('scores').clear();
            transaction.objectStore('syncQueue').clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

export const db = new LocalDatabase();
export type { PendingScore, CachedEvent, CachedScores };
