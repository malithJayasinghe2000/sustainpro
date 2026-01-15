/**
 * Safely parse theme_config from database
 * Handles cases where theme_config might be:
 * - A proper object: { primary: "#color" }
 * - A JSON string: '{"primary":"#color"}'
 * - A double-escaped string: '"{\"primary\":\"#color\"}"'
 * - Triple-escaped: '"\"{\\\"primary\\\":\\\"#color\\\"}\""'
 */
export function parseThemeConfig(themeConfig: any): { primary?: string } | null {
    if (!themeConfig) return null;

    // If it's already an object with primary, return it
    if (typeof themeConfig === 'object' && themeConfig !== null) {
        if ('primary' in themeConfig) {
            return themeConfig;
        }
        return null;
    }

    // If it's a string, try to parse it (possibly multiple times)
    if (typeof themeConfig === 'string') {
        let parsed = themeConfig;
        let attempts = 0;
        const maxAttempts = 3; // Prevent infinite loops

        while (typeof parsed === 'string' && attempts < maxAttempts) {
            try {
                parsed = JSON.parse(parsed);
                attempts++;
            } catch {
                // If parsing fails, it's not valid JSON
                break;
            }
        }

        // After parsing, check if we have a valid object with primary
        if (typeof parsed === 'object' && parsed !== null && 'primary' in parsed) {
            return parsed;
        }
    }

    return null;
}

/**
 * Get primary color from theme_config
 * Returns the color string or a default fallback
 */
export function getPrimaryColor(themeConfig: any, fallback: string = '#0d9488'): string {
    const parsed = parseThemeConfig(themeConfig);
    return parsed?.primary || fallback;
}
