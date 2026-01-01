import React from 'react';
import { formatDateTime, formatRelativeTime, formatDateShort, formatDateLong, formatDateTimeWithTZ } from '@/lib/timezone';

interface TimeDisplayProps {
    timestamp: Date | string | null | undefined;
    format?: 'full' | 'short' | 'relative' | 'long' | 'with-tz';
    className?: string;
    fallback?: string;
}

/**
 * TimeDisplay Component
 * Displays timestamps in the user's timezone with various format options
 * 
 * @example
 * <TimeDisplay timestamp={user.created_at} format="relative" />
 * // Output: "2 hours ago"
 * 
 * <TimeDisplay timestamp={user.last_login} format="full" />
 * // Output: "Dec 11, 2024, 12:30 PM"
 */
export default function TimeDisplay({
    timestamp,
    format = 'full',
    className = '',
    fallback = '-'
}: TimeDisplayProps) {
    if (!timestamp) {
        return <span className={className}>{fallback}</span>;
    }

    let formattedTime: string;

    switch (format) {
        case 'short':
            formattedTime = formatDateShort(timestamp);
            break;
        case 'long':
            formattedTime = formatDateLong(timestamp);
            break;
        case 'relative':
            formattedTime = formatRelativeTime(timestamp);
            break;
        case 'with-tz':
            formattedTime = formatDateTimeWithTZ(timestamp);
            break;
        case 'full':
        default:
            formattedTime = formatDateTime(timestamp);
            break;
    }

    return (
        <span className={className} title={formatDateTimeWithTZ(timestamp)}>
            {formattedTime}
        </span>
    );
}
