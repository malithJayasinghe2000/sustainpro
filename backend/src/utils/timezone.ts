import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import pool from '../db';

/**
 * Timezone Utility Module
 * Handles all timezone conversions between system timezone and user timezones
 */

let cachedSystemTimezone: string | null = null;

/**
 * Get the system's default timezone from database settings
 * Caches the result to avoid repeated database queries
 */
export async function getSystemTimezone(): Promise<string> {
    // FORCE UTC: As per new requirement, all backend operations must use UTC.
    // We ignore the database setting for system storage timezone.
    return 'UTC';
}

/**
 * Clear the cached system timezone (call this when system timezone is updated)
 */
export function clearSystemTimezoneCache(): void {
    cachedSystemTimezone = null;
}

/**
 * Convert a date from any timezone to the system's timezone
 * @param date - The date to convert
 * @param fromTimezone - The source timezone (defaults to UTC)
 * @returns Date object in system timezone
 */
export async function convertToSystemTZ(date: Date | string, fromTimezone: string = 'UTC'): Promise<Date> {
    const systemTZ = await getSystemTimezone();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Convert from source timezone to system timezone
    const zonedDate = toZonedTime(dateObj, fromTimezone);
    return fromZonedTime(zonedDate, systemTZ);
}

/**
 * Convert a date from system timezone to a target timezone
 * @param date - The date in system timezone
 * @param toTimezone - The target timezone
 * @returns Date object in target timezone
 */
export async function convertFromSystemTZ(date: Date | string, toTimezone: string): Promise<Date> {
    const systemTZ = await getSystemTimezone();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Convert from system timezone to target timezone
    const zonedDate = toZonedTime(dateObj, systemTZ);
    return fromZonedTime(zonedDate, toTimezone);
}

/**
 * Format a timestamp in a specific timezone
 * @param date - The date to format
 * @param timezone - The timezone to format in
 * @param formatString - The format string (date-fns format)
 * @returns Formatted date string
 */
export function formatTimestamp(
    date: Date | string,
    timezone: string,
    formatString: string = 'yyyy-MM-dd HH:mm:ss zzz'
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(dateObj, timezone, formatString);
}

/**
 * Get current timestamp in system timezone
 * @returns Current date in system timezone
 */
export async function getCurrentSystemTime(): Promise<Date> {
    // FORCE UTC: Return current time. Postgres will store this as absolute UTC.
    // We do NOT shift the time components string-wise, as that corrupts the absolute timestamp.
    return new Date();
}

/**
 * Attach timezone metadata to API response
 * Useful for frontend to know what timezone the data is in
 */
export async function getTimezoneMetadata() {
    const systemTZ = await getSystemTimezone();
    return {
        systemTimezone: systemTZ,
        serverTime: await getCurrentSystemTime(),
        utcOffset: formatInTimeZone(new Date(), systemTZ, 'XXX')
    };
}
