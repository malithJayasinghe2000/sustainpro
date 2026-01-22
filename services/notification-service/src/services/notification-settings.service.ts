/**
 * Notification Settings Service
 * Fetches notification settings from database with caching
 */
import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'notification-service' });

/**
 * Notification settings interface
 */
export interface NotificationSettings {
    // Email Settings
    email_notifications_enabled?: boolean;
    email_notification_types?: string; // Comma-separated: alerts, reports, updates
    email_digest_enabled?: boolean;
    email_digest_frequency?: string; // daily, weekly, monthly

    // Quiet Hours
    quiet_hours_enabled?: boolean;
    quiet_hours_start?: string; // HH:MM format
    quiet_hours_end?: string; // HH:MM format
    quiet_hours_timezone?: string;
    quiet_hours_override_urgent?: boolean;

    // Retry Settings
    retry_failed_notifications?: boolean;
    max_retry_attempts?: number;
    retry_delay_minutes?: number;
}

/**
 * Cache for notification settings
 */
let cachedSettings: NotificationSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Get notification settings from database with caching
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
    const now = Date.now();
    
    if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedSettings;
    }

    try {
        const settings = await prisma.sps_notification_settings.findUnique({
            where: { id: 'sps_notifications' },
        });
        
        if (settings) {
            cachedSettings = settings as unknown as NotificationSettings;
            cacheTimestamp = now;
            return cachedSettings;
        }
    } catch (error) {
        logger.error('Failed to fetch notification settings', { error: (error as Error).message });
    }

    // Return defaults
    return {
        email_notifications_enabled: true,
        email_notification_types: 'alerts,reports,updates',
        email_digest_enabled: false,
        email_digest_frequency: 'daily',
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        quiet_hours_timezone: 'UTC',
        quiet_hours_override_urgent: true,
        retry_failed_notifications: true,
        max_retry_attempts: 3,
        retry_delay_minutes: 5,
    };
}

/**
 * Check if current time is within quiet hours
 */
export function isWithinQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quiet_hours_enabled) {
        return false;
    }

    const start = settings.quiet_hours_start || '22:00';
    const end = settings.quiet_hours_end || '08:00';
    const timezone = settings.quiet_hours_timezone || 'UTC';

    try {
        // Get current time in the configured timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const currentTime = formatter.format(now);
        
        // Parse times as minutes from midnight
        const parseTime = (time: string): number => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const currentMinutes = parseTime(currentTime);
        const startMinutes = parseTime(start);
        const endMinutes = parseTime(end);

        // Handle overnight quiet hours (e.g., 22:00 to 08:00)
        if (startMinutes > endMinutes) {
            // Quiet hours span midnight
            return currentMinutes >= startMinutes || currentMinutes < endMinutes;
        } else {
            // Quiet hours within same day
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }
    } catch (error) {
        logger.error('Error checking quiet hours', { error: (error as Error).message });
        return false;
    }
}

/**
 * Check if a notification should be sent based on settings
 */
export async function shouldSendNotification(
    notificationType: 'alert' | 'report' | 'update' | 'otp' | 'security',
    isUrgent: boolean = false
): Promise<{ allowed: boolean; reason?: string }> {
    const settings = await getNotificationSettings();

    // Email notifications disabled globally
    if (!settings.email_notifications_enabled) {
        return { allowed: false, reason: 'Email notifications are disabled' };
    }

    // Check notification type is enabled
    const enabledTypes = settings.email_notification_types?.split(',').map(t => t.trim()) || [];
    if (!['otp', 'security'].includes(notificationType) && !enabledTypes.includes(`${notificationType}s`)) {
        return { allowed: false, reason: `${notificationType} notifications are disabled` };
    }

    // Always allow OTP and security-related notifications
    if (['otp', 'security'].includes(notificationType)) {
        return { allowed: true };
    }

    // Check quiet hours
    if (isWithinQuietHours(settings)) {
        // Allow urgent notifications to bypass quiet hours if configured
        if (isUrgent && settings.quiet_hours_override_urgent) {
            return { allowed: true };
        }
        return { allowed: false, reason: 'Quiet hours are active' };
    }

    return { allowed: true };
}

/**
 * Clear settings cache (call when settings are updated)
 */
export function clearNotificationSettingsCache(): void {
    cachedSettings = null;
    cacheTimestamp = 0;
}
