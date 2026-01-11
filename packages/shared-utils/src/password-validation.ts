/**
 * Password Validation Utility
 * Validates passwords against configured password policies
 */

export interface PasswordPolicies {
    min_length?: number;
    max_length?: number;
    require_uppercase?: boolean;
    require_lowercase?: boolean;
    require_numbers?: boolean;
    require_special_chars?: boolean;
    special_chars_allowed?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
}

const DEFAULT_POLICIES: PasswordPolicies = {
    min_length: 8,
    max_length: 128,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: true,
    special_chars_allowed: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Validate a password against the given policies
 */
export function validatePassword(password: string, policies: PasswordPolicies = {}): ValidationResult {
    const config = { ...DEFAULT_POLICIES, ...policies };
    const errors: string[] = [];

    // Check minimum length
    if (password.length < (config.min_length || 8)) {
        errors.push(`Password must be at least ${config.min_length} characters long`);
    }

    // Check maximum length
    if (password.length > (config.max_length || 128)) {
        errors.push(`Password must be no more than ${config.max_length} characters long`);
    }

    // Check uppercase requirement
    if (config.require_uppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase requirement
    if (config.require_lowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    // Check numbers requirement
    if (config.require_numbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    // Check special characters requirement
    if (config.require_special_chars) {
        const specialChars = config.special_chars_allowed || '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const hasSpecial = [...password].some(char => specialChars.includes(char));
        if (!hasSpecial) {
            errors.push(`Password must contain at least one special character (${specialChars})`);
        }
    }

    // Calculate password strength
    let strengthScore = 0;
    if (password.length >= 8) strengthScore++;
    if (password.length >= 12) strengthScore++;
    if (/[A-Z]/.test(password)) strengthScore++;
    if (/[a-z]/.test(password)) strengthScore++;
    if (/[0-9]/.test(password)) strengthScore++;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) strengthScore++;

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (strengthScore >= 5) strength = 'strong';
    else if (strengthScore >= 3) strength = 'medium';

    return {
        isValid: errors.length === 0,
        errors,
        strength,
    };
}

/**
 * Generate password requirements description
 */
export function getPasswordRequirements(policies: PasswordPolicies = {}): string[] {
    const config = { ...DEFAULT_POLICIES, ...policies };
    const requirements: string[] = [];

    requirements.push(`At least ${config.min_length} characters`);

    if (config.require_uppercase) {
        requirements.push('At least one uppercase letter (A-Z)');
    }
    if (config.require_lowercase) {
        requirements.push('At least one lowercase letter (a-z)');
    }
    if (config.require_numbers) {
        requirements.push('At least one number (0-9)');
    }
    if (config.require_special_chars) {
        requirements.push('At least one special character');
    }

    return requirements;
}
