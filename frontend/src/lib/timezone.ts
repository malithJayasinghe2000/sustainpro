import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Frontend Timezone Utility Module
 * Handles timezone conversions and formatting for display
 */

/**
 * Get the current user's timezone from localStorage or browser
 * Falls back to browser timezone if not set
 */
export function getUserTimezone(): string {
    if (typeof window === 'undefined') {
        return 'UTC';
    }
    // Try to get from user settings (will be set by AuthContext)
    const userTZ = localStorage.getItem('userTimezone');
    if (userTZ) {
        return userTZ;
    }

    // Fallback to browser timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Convert a UTC/system timestamp to user's timezone
 * @param date - The date to convert (ISO string or Date object)
 * @param userTimezone - Optional timezone override
 * @returns Date object in user's timezone
 */
export function convertToUserTZ(date: Date | string, userTimezone?: string): Date {
    const tz = userTimezone || getUserTimezone();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return toZonedTime(dateObj, tz);
}

/**
 * Format a date in the user's timezone
 * @param date - The date to format
 * @param formatString - Format string (date-fns format)
 * @param userTimezone - Optional timezone override
 * @returns Formatted date string
 */
export function formatDateTime(
    date: Date | string | null | undefined,
    formatString: string = 'PPpp',
    userTimezone?: string
): string {
    if (!date) return '-';

    const tz = userTimezone || getUserTimezone();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    try {
        return formatInTimeZone(dateObj, tz, formatString);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

/**
 * Format a date as relative time ("2 hours ago")
 * @param date - The date to format
 * @param userTimezone - Optional timezone override
 * @returns Relative time string
 */
export function formatRelativeTime(
    date: Date | string | null | undefined,
    userTimezone?: string
): string {
    if (!date) return '-';

    const tz = userTimezone || getUserTimezone();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const zonedDate = toZonedTime(dateObj, tz);

    try {
        return formatDistanceToNow(zonedDate, { addSuffix: true });
    } catch (error) {
        console.error('Error formatting relative time:', error);
        return 'Invalid Date';
    }
}

/**
 * Format date in short format (e.g., "Dec 11, 2024")
 */
export function formatDateShort(date: Date | string | null | undefined, userTimezone?: string): string {
    return formatDateTime(date, 'PP', userTimezone);
}

/**
 * Format date in long format (e.g., "December 11, 2024, 12:30 PM")
 */
export function formatDateLong(date: Date | string | null | undefined, userTimezone?: string): string {
    return formatDateTime(date, 'PPpp', userTimezone);
}

/**
 * Format time only (e.g., "12:30 PM")
 */
export function formatTimeOnly(date: Date | string | null | undefined, userTimezone?: string): string {
    return formatDateTime(date, 'p', userTimezone);
}

/**
 * Format date and time with timezone abbreviation (e.g., "Dec 11, 2024, 12:30 PM IST")
 */
export function formatDateTimeWithTZ(date: Date | string | null | undefined, userTimezone?: string): string {
    return formatDateTime(date, 'PPpp zzz', userTimezone);
}

/**
 * Get timezone abbreviation (e.g., "IST", "EST")
 */
export function getTimezoneAbbr(userTimezone?: string): string {
    const tz = userTimezone || getUserTimezone();
    try {
        return formatInTimeZone(new Date(), tz, 'zzz');
    } catch (error) {
        return tz;
    }
}

/**
 * Get UTC offset (e.g., "+05:30", "-08:00")
 */
export function getUTCOffset(userTimezone?: string): string {
    const tz = userTimezone || getUserTimezone();
    try {
        return formatInTimeZone(new Date(), tz, 'XXX');
    } catch (error) {
        return '+00:00';
    }
}

/**
 * Get a list of all supported timezones suitable for a SELECT dropdown
 * Uses browser's Intl API to get all valid timezones
 */
export function getAllTimezones(): string[] {
    try {
        if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
            return (Intl as any).supportedValuesOf('timeZone');
        }

        // Fallback list if Intl.supportedValuesOf is not available
        return [
            'UTC', 'Asia/Kolkata', 'Asia/Colombo', 'America/New_York', 'Europe/London',
            'Australia/Sydney', 'Asia/Tokyo', 'Europe/Paris', 'America/Los_Angeles'
        ].sort();
    } catch (e) {
        return ['UTC', 'Asia/Kolkata', 'Asia/Colombo', 'America/New_York', 'Europe/London'];
    }
}
