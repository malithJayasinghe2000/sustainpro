/**
 * Timezone utilities using date-fns
 */
import { parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Convert a date to a specific timezone
 */
export const toTimezone = (date: Date | string, timezone: string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return toZonedTime(dateObj, timezone);
};

/**
 * Convert a date from a specific timezone to UTC
 */
export const fromTimezone = (date: Date | string, timezone: string): Date => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return fromZonedTime(dateObj, timezone);
};

/**
 * Format a date in a specific timezone
 */
export const formatInTz = (
    date: Date | string,
    timezone: string,
    formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, timezone, formatStr);
};

/**
 * Get current time in a specific timezone
 */
export const getCurrentTimeInTimezone = (timezone: string): Date => {
    return toZonedTime(new Date(), timezone);
};

/**
 * Common timezone constants
 */
export const TIMEZONES = {
    UTC: 'UTC',
    ASIA_COLOMBO: 'Asia/Colombo',
    AMERICA_NEW_YORK: 'America/New_York',
    EUROPE_LONDON: 'Europe/London',
} as const;
