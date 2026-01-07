/**
 * Common validation utilities
 */

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

export const isValidDeviceCode = (code: string): boolean => {
    // Device codes: alphanumeric with hyphens/underscores, 3-50 chars
    const codeRegex = /^[A-Za-z0-9_-]{3,50}$/;
    return codeRegex.test(code);
};

export const sanitizeString = (str: string): string => {
    return str.trim().replace(/\s+/g, ' ');
};

export const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
};

export const generateCode = (prefix: string, index: number): string => {
    const paddedIndex = String(index).padStart(3, '0');
    return `${prefix}-${paddedIndex}`;
};
