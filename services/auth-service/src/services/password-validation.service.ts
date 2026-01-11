import { getPrismaClient } from '@sustainpro/shared-database';
import { BadRequestError } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const CONFIG_ID = 'sps_password_policy';

interface PasswordPolicies {
    min_length: number;
    max_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    special_chars_allowed: string;
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Validate password against policies
 */
function validatePassword(password: string, policies: PasswordPolicies): ValidationResult {
    const errors: string[] = [];

    if (password.length < policies.min_length) {
        errors.push(`Password must be at least ${policies.min_length} characters long`);
    }

    if (password.length > policies.max_length) {
        errors.push(`Password must be no more than ${policies.max_length} characters long`);
    }

    if (policies.require_uppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (policies.require_lowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (policies.require_numbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (policies.require_special_chars) {
        const specialChars = policies.special_chars_allowed;
        const hasSpecial = [...password].some(char => specialChars.includes(char));
        if (!hasSpecial) {
            errors.push('Password must contain at least one special character');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Password Validation Service
 * Validates passwords against configured policies from database
 */
export class PasswordValidationService {
    private cachedPolicies: PasswordPolicies | null = null;
    private lastFetch: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute cache

    /**
     * Get password policies from database (with caching)
     */
    async getPolicies(): Promise<PasswordPolicies> {
        // Return cached if still valid
        if (this.cachedPolicies && Date.now() - this.lastFetch < this.CACHE_TTL) {
            return this.cachedPolicies;
        }

        try {
            const policies = await prisma.sps_password_policies.findUnique({
                where: { id: CONFIG_ID },
            });

            this.cachedPolicies = {
                min_length: policies?.min_length || 8,
                max_length: policies?.max_length || 128,
                require_uppercase: policies?.require_uppercase ?? true,
                require_lowercase: policies?.require_lowercase ?? true,
                require_numbers: policies?.require_numbers ?? true,
                require_special_chars: policies?.require_special_chars ?? true,
                special_chars_allowed: policies?.special_chars_allowed || '!@#$%^&*()_+-=[]{}|;:,.<>?',
            };
            this.lastFetch = Date.now();

            return this.cachedPolicies;
        } catch (error) {
            // Return defaults on error
            return {
                min_length: 8,
                max_length: 128,
                require_uppercase: true,
                require_lowercase: true,
                require_numbers: true,
                require_special_chars: true,
                special_chars_allowed: '!@#$%^&*()_+-=[]{}|;:,.<>?',
            };
        }
    }

    /**
     * Validate a password against configured policies
     * @throws BadRequestError if password doesn't meet requirements
     */
    async validatePasswordStrength(password: string): Promise<void> {
        const policies = await this.getPolicies();
        const result = validatePassword(password, policies);

        if (!result.isValid) {
            throw new BadRequestError(result.errors.join('. '));
        }
    }

    /**
     * Clear the cache (useful when policies are updated)
     */
    clearCache(): void {
        this.cachedPolicies = null;
        this.lastFetch = 0;
    }
}

export const passwordValidationService = new PasswordValidationService();

