import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';
import { emitDeviceStatus } from '../socket';

const logger = createLogger({ service: 'live-data' });

export interface LiveDataEntry {
    device_id: number;  // Changed from string to number to match database
    device_code: string;
    organization_id: string;
    event_id?: string;
    service_id?: string;  // Changed from department_service_id
    data: Record<string, any>;
    timestamp: Date;
    status: 'online' | 'offline';
}

// In-memory store for live device data (can upgrade to Redis later)
const liveDataStore = new Map<string, LiveDataEntry>();

// Track when devices go offline
const offlineCheckTimers = new Map<string, NodeJS.Timeout>();

/**
 * Live Data Service - manages real-time device data in memory
 */
export class LiveDataService {
    private offlineThreshold: number;

    constructor() {
        this.offlineThreshold = config.liveData.offlineThresholdMs;
        this.startCleanupInterval();
    }

    /**
     * Store live data for a device
     */
    store(deviceCode: string, entry: LiveDataEntry): void {
        // Cancel existing offline timer
        const existingTimer = offlineCheckTimers.get(deviceCode);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Store the data
        entry.status = 'online';
        liveDataStore.set(deviceCode, entry);

        logger.debug('Live data stored', { deviceCode, dataKeys: Object.keys(entry.data) });

        // Set offline check timer
        const timer = setTimeout(() => {
            this.markOffline(deviceCode);
        }, this.offlineThreshold);

        offlineCheckTimers.set(deviceCode, timer);
    }

    /**
     * Get live data for a device
     */
    get(deviceCode: string): LiveDataEntry | null {
        return liveDataStore.get(deviceCode) || null;
    }

    /**
     * Get status of a device
     */
    getStatus(deviceCode: string): 'online' | 'offline' {
        const entry = liveDataStore.get(deviceCode);
        if (!entry) return 'offline';

        const age = Date.now() - entry.timestamp.getTime();
        return age < this.offlineThreshold ? 'online' : 'offline';
    }

    /**
     * Get all live data for an organization
     */
    getByOrganization(organizationId: string): LiveDataEntry[] {
        const entries: LiveDataEntry[] = [];
        liveDataStore.forEach((entry) => {
            if (entry.organization_id === organizationId) {
                entries.push(entry);
            }
        });
        return entries;
    }

    /**
     * Get all live data for an event
     */
    getByEvent(eventId: string): LiveDataEntry[] {
        const entries: LiveDataEntry[] = [];
        liveDataStore.forEach((entry) => {
            if (entry.event_id === eventId) {
                entries.push(entry);
            }
        });
        return entries;
    }

    /**
     * Get count of online devices
     */
    getOnlineCount(organizationId?: string): number {
        let count = 0;
        liveDataStore.forEach((entry) => {
            if (entry.status === 'online') {
                if (!organizationId || entry.organization_id === organizationId) {
                    count++;
                }
            }
        });
        return count;
    }

    /**
     * Get count of offline devices (devices that were online but are now offline)
     */
    getOfflineCount(organizationId?: string): number {
        let count = 0;
        liveDataStore.forEach((entry) => {
            if (entry.status === 'offline') {
                if (!organizationId || entry.organization_id === organizationId) {
                    count++;
                }
            }
        });
        return count;
    }

    /**
     * Get all device statuses
     */
    getAllStatuses(): Map<string, 'online' | 'offline'> {
        const statuses = new Map<string, 'online' | 'offline'>();
        liveDataStore.forEach((entry, deviceCode) => {
            statuses.set(deviceCode, entry.status);
        });
        return statuses;
    }

    /**
     * Mark a device as offline
     */
    private markOffline(deviceCode: string): void {
        const entry = liveDataStore.get(deviceCode);
        if (entry && entry.status === 'online') {
            entry.status = 'offline';
            liveDataStore.set(deviceCode, entry);

            logger.info('Device marked offline', { deviceCode });

            // Emit status change
            emitDeviceStatus(deviceCode, 'offline', entry.organization_id);
        }
    }

    /**
     * Remove stale entries periodically
     */
    private startCleanupInterval(): void {
        setInterval(() => {
            const now = Date.now();
            const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

            liveDataStore.forEach((entry, deviceCode) => {
                const age = now - entry.timestamp.getTime();
                if (age > staleThreshold) {
                    liveDataStore.delete(deviceCode);
                    offlineCheckTimers.delete(deviceCode);
                    logger.debug('Removed stale entry', { deviceCode, ageHours: Math.round(age / 3600000) });
                }
            });
        }, config.liveData.cleanupIntervalMs);
    }

    /**
     * Clear all data (for testing)
     */
    clear(): void {
        liveDataStore.clear();
        offlineCheckTimers.forEach((timer) => clearTimeout(timer));
        offlineCheckTimers.clear();
    }
}

// Singleton instance
export const liveDataService = new LiveDataService();
