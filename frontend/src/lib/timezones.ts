/**
 * Comprehensive list of IANA timezones with labels and UTC offsets
 */

export interface TimezoneOption {
    value: string;
    label: string;
    offset: string;
    region: string;
}

// Get all available timezones using Intl API
const getAllTimezones = (): TimezoneOption[] => {
    // Common IANA timezones with their regions
    const timezones = [
        // UTC
        { value: 'UTC', region: 'Universal' },
        // Africa
        { value: 'Africa/Cairo', region: 'Africa' },
        { value: 'Africa/Johannesburg', region: 'Africa' },
        { value: 'Africa/Lagos', region: 'Africa' },
        { value: 'Africa/Nairobi', region: 'Africa' },
        // America
        { value: 'America/Anchorage', region: 'America' },
        { value: 'America/Chicago', region: 'America' },
        { value: 'America/Denver', region: 'America' },
        { value: 'America/Los_Angeles', region: 'America' },
        { value: 'America/New_York', region: 'America' },
        { value: 'America/Phoenix', region: 'America' },
        { value: 'America/Sao_Paulo', region: 'America' },
        { value: 'America/Toronto', region: 'America' },
        { value: 'America/Vancouver', region: 'America' },
        { value: 'America/Mexico_City', region: 'America' },
        { value: 'America/Bogota', region: 'America' },
        { value: 'America/Lima', region: 'America' },
        { value: 'America/Santiago', region: 'America' },
        { value: 'America/Buenos_Aires', region: 'America' },
        // Asia
        { value: 'Asia/Bahrain', region: 'Asia' },
        { value: 'Asia/Bangkok', region: 'Asia' },
        { value: 'Asia/Colombo', region: 'Asia' },  // Sri Lanka (UTC+5:30)
        { value: 'Asia/Dhaka', region: 'Asia' },
        { value: 'Asia/Dubai', region: 'Asia' },    // UAE (UTC+4)
        { value: 'Asia/Hong_Kong', region: 'Asia' },
        { value: 'Asia/Jakarta', region: 'Asia' },
        { value: 'Asia/Jerusalem', region: 'Asia' },
        { value: 'Asia/Karachi', region: 'Asia' },  // Pakistan (UTC+5)
        { value: 'Asia/Kathmandu', region: 'Asia' }, // Nepal (UTC+5:45)
        { value: 'Asia/Kolkata', region: 'Asia' },  // India (UTC+5:30)
        { value: 'Asia/Kuala_Lumpur', region: 'Asia' },
        { value: 'Asia/Kuwait', region: 'Asia' },
        { value: 'Asia/Manila', region: 'Asia' },
        { value: 'Asia/Muscat', region: 'Asia' },   // Oman (UTC+4)
        { value: 'Asia/Qatar', region: 'Asia' },    // Qatar (UTC+3)
        { value: 'Asia/Riyadh', region: 'Asia' },
        { value: 'Asia/Seoul', region: 'Asia' },
        { value: 'Asia/Shanghai', region: 'Asia' },
        { value: 'Asia/Singapore', region: 'Asia' },
        { value: 'Asia/Taipei', region: 'Asia' },
        { value: 'Asia/Tehran', region: 'Asia' },   // Iran (UTC+3:30)
        { value: 'Asia/Tokyo', region: 'Asia' },
        // Australia
        { value: 'Australia/Adelaide', region: 'Australia' },
        { value: 'Australia/Brisbane', region: 'Australia' },
        { value: 'Australia/Melbourne', region: 'Australia' },
        { value: 'Australia/Perth', region: 'Australia' },
        { value: 'Australia/Sydney', region: 'Australia' },
        // Europe
        { value: 'Europe/Amsterdam', region: 'Europe' },
        { value: 'Europe/Athens', region: 'Europe' },
        { value: 'Europe/Berlin', region: 'Europe' },
        { value: 'Europe/Brussels', region: 'Europe' },
        { value: 'Europe/Dublin', region: 'Europe' },
        { value: 'Europe/Helsinki', region: 'Europe' },
        { value: 'Europe/Istanbul', region: 'Europe' },
        { value: 'Europe/Lisbon', region: 'Europe' },
        { value: 'Europe/London', region: 'Europe' },
        { value: 'Europe/Madrid', region: 'Europe' },
        { value: 'Europe/Moscow', region: 'Europe' },
        { value: 'Europe/Oslo', region: 'Europe' },
        { value: 'Europe/Paris', region: 'Europe' },
        { value: 'Europe/Prague', region: 'Europe' },
        { value: 'Europe/Rome', region: 'Europe' },
        { value: 'Europe/Stockholm', region: 'Europe' },
        { value: 'Europe/Vienna', region: 'Europe' },
        { value: 'Europe/Warsaw', region: 'Europe' },
        { value: 'Europe/Zurich', region: 'Europe' },
        // Pacific
        { value: 'Pacific/Auckland', region: 'Pacific' },
        { value: 'Pacific/Fiji', region: 'Pacific' },
        { value: 'Pacific/Honolulu', region: 'Pacific' },
        { value: 'Pacific/Guam', region: 'Pacific' },
    ];

    // Calculate UTC offset for each timezone
    const now = new Date();

    return timezones.map(tz => {
        try {
            // Get the offset string
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: tz.value,
                timeZoneName: 'shortOffset'
            });
            const parts = formatter.formatToParts(now);
            const offsetPart = parts.find(p => p.type === 'timeZoneName');
            const offset = offsetPart?.value || 'UTC';

            // Create friendly label
            const city = tz.value.split('/').pop()?.replace(/_/g, ' ') || tz.value;

            return {
                value: tz.value,
                label: `${city} (${offset})`,
                offset: offset,
                region: tz.region
            };
        } catch {
            return {
                value: tz.value,
                label: tz.value,
                offset: 'UTC',
                region: tz.region
            };
        }
    }).sort((a, b) => a.label.localeCompare(b.label));
};

// Cached timezones
let cachedTimezones: TimezoneOption[] | null = null;

/**
 * Get all available timezones
 */
export const getTimezones = (): TimezoneOption[] => {
    if (!cachedTimezones) {
        cachedTimezones = getAllTimezones();
    }
    return cachedTimezones;
};

/**
 * Get timezones grouped by region
 */
export const getTimezonesGrouped = () => {
    const timezones = getTimezones();
    const grouped: Record<string, TimezoneOption[]> = {};

    timezones.forEach(tz => {
        if (!grouped[tz.region]) {
            grouped[tz.region] = [];
        }
        grouped[tz.region].push(tz);
    });

    return grouped;
};

/**
 * Find timezone by value
 */
export const findTimezone = (value: string): TimezoneOption | undefined => {
    return getTimezones().find(tz => tz.value === value);
};

/**
 * Get timezone label for a value
 */
export const getTimezoneLabel = (value: string): string => {
    const tz = findTimezone(value);
    return tz?.label || value;
};
