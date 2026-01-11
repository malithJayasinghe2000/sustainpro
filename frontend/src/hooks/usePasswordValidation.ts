'use client';

import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '@/lib/api';

export interface PasswordRules {
    min_length: number;
    max_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    special_chars_allowed: string;
}

export interface PasswordValidation {
    isValid: boolean;
    errors: string[];
    requirements: {
        label: string;
        met: boolean;
    }[];
    strength: 'weak' | 'medium' | 'strong';
}

const DEFAULT_RULES: PasswordRules = {
    min_length: 8,
    max_length: 128,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: true,
    special_chars_allowed: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Hook to get password rules and validate passwords
 */
export function usePasswordValidation() {
    const [rules, setRules] = useState<PasswordRules>(DEFAULT_RULES);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch password rules from API
    useEffect(() => {
        const fetchRules = async () => {
            try {
                const fetchedRules = await settingsApi.getPasswordRules();
                setRules({ ...DEFAULT_RULES, ...fetchedRules });
            } catch (error) {
                // Use defaults on error
                console.warn('Failed to fetch password rules, using defaults');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRules();
    }, []);

    /**
     * Validate a password against the rules
     */
    const validatePassword = useCallback((password: string): PasswordValidation => {
        const errors: string[] = [];
        const requirements: { label: string; met: boolean }[] = [];

        // Check minimum length
        const minLengthMet = password.length >= rules.min_length;
        requirements.push({
            label: `At least ${rules.min_length} characters`,
            met: minLengthMet,
        });
        if (!minLengthMet) {
            errors.push(`Password must be at least ${rules.min_length} characters`);
        }

        // Check maximum length
        if (password.length > rules.max_length) {
            errors.push(`Password must be no more than ${rules.max_length} characters`);
        }

        // Check uppercase
        if (rules.require_uppercase) {
            const hasUppercase = /[A-Z]/.test(password);
            requirements.push({
                label: 'One uppercase letter (A-Z)',
                met: hasUppercase,
            });
            if (!hasUppercase) {
                errors.push('Password must contain at least one uppercase letter');
            }
        }

        // Check lowercase
        if (rules.require_lowercase) {
            const hasLowercase = /[a-z]/.test(password);
            requirements.push({
                label: 'One lowercase letter (a-z)',
                met: hasLowercase,
            });
            if (!hasLowercase) {
                errors.push('Password must contain at least one lowercase letter');
            }
        }

        // Check numbers
        if (rules.require_numbers) {
            const hasNumber = /[0-9]/.test(password);
            requirements.push({
                label: 'One number (0-9)',
                met: hasNumber,
            });
            if (!hasNumber) {
                errors.push('Password must contain at least one number');
            }
        }

        // Check special characters
        if (rules.require_special_chars) {
            const specialChars = rules.special_chars_allowed;
            const hasSpecial = [...password].some(char => specialChars.includes(char));
            requirements.push({
                label: 'One special character',
                met: hasSpecial,
            });
            if (!hasSpecial) {
                errors.push('Password must contain at least one special character');
            }
        }

        // Calculate strength
        let strengthScore = 0;
        if (password.length >= 8) strengthScore++;
        if (password.length >= 12) strengthScore++;
        if (password.length >= 16) strengthScore++;
        if (/[A-Z]/.test(password)) strengthScore++;
        if (/[a-z]/.test(password)) strengthScore++;
        if (/[0-9]/.test(password)) strengthScore++;
        if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) strengthScore++;

        let strength: 'weak' | 'medium' | 'strong' = 'weak';
        if (strengthScore >= 6) strength = 'strong';
        else if (strengthScore >= 4) strength = 'medium';

        return {
            isValid: errors.length === 0 && password.length > 0,
            errors,
            requirements,
            strength,
        };
    }, [rules]);

    /**
     * Get password strength color
     */
    const getStrengthColor = useCallback((strength: 'weak' | 'medium' | 'strong') => {
        switch (strength) {
            case 'strong': return 'bg-green-500';
            case 'medium': return 'bg-yellow-500';
            default: return 'bg-red-500';
        }
    }, []);

    return {
        rules,
        isLoading,
        validatePassword,
        getStrengthColor,
    };
}

export default usePasswordValidation;
