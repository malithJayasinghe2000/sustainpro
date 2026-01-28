'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import apiClient from '@/lib/api';

export interface PasswordPolicy {
    min_length: number;
    max_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
    special_chars_allowed: string;
}

interface PasswordRequirement {
    key: string;
    label: string;
    met: boolean;
}

interface PasswordRequirementsProps {
    password: string;
    onValidChange?: (isValid: boolean) => void;
    className?: string;
}

// Default policies if API fails
const defaultPolicies: PasswordPolicy = {
    min_length: 8,
    max_length: 128,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: true,
    special_chars_allowed: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

// Cache for password policies
let cachedPolicies: PasswordPolicy | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getPasswordPolicies(): Promise<PasswordPolicy> {
    // Return cached if still valid
    if (cachedPolicies && Date.now() - cacheTime < CACHE_TTL) {
        return cachedPolicies;
    }

    try {
        const response = await apiClient.get('/auth/password-policy');
        if (response.data?.success && response.data?.policies) {
            cachedPolicies = response.data.policies;
            cacheTime = Date.now();
            return cachedPolicies as PasswordPolicy;
        }
    } catch (error) {
        console.warn('Failed to fetch password policies, using defaults');
    }

    return defaultPolicies;
}

export function validatePassword(password: string, policies: PasswordPolicy): PasswordRequirement[] {
    const requirements: PasswordRequirement[] = [];

    // Min length
    requirements.push({
        key: 'min_length',
        label: `Minimum ${policies.min_length} characters`,
        met: password.length >= policies.min_length,
    });

    // Lowercase
    if (policies.require_lowercase) {
        requirements.push({
            key: 'lowercase',
            label: 'At least one lowercase letter',
            met: /[a-z]/.test(password),
        });
    }

    // Uppercase
    if (policies.require_uppercase) {
        requirements.push({
            key: 'uppercase',
            label: 'At least one uppercase letter',
            met: /[A-Z]/.test(password),
        });
    }

    // Numbers
    if (policies.require_numbers) {
        requirements.push({
            key: 'numbers',
            label: 'At least one number',
            met: /[0-9]/.test(password),
        });
    }

    // Special characters
    if (policies.require_special_chars) {
        const specialChars = policies.special_chars_allowed || '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const hasSpecial = [...password].some(char => specialChars.includes(char));
        requirements.push({
            key: 'special',
            label: 'At least one special character',
            met: hasSpecial,
        });
    }

    return requirements;
}

export default function PasswordRequirements({
    password,
    onValidChange,
    className = '',
}: PasswordRequirementsProps) {
    const [policies, setPolicies] = useState<PasswordPolicy>(defaultPolicies);
    const [requirements, setRequirements] = useState<PasswordRequirement[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch password policies on mount
    useEffect(() => {
        getPasswordPolicies()
            .then(setPolicies)
            .finally(() => setLoading(false));
    }, []);

    // Update requirements when password or policies change
    useEffect(() => {
        const reqs = validatePassword(password, policies);
        setRequirements(reqs);

        const isValid = reqs.every(r => r.met);
        onValidChange?.(isValid);
    }, [password, policies, onValidChange]);

    if (loading) {
        return (
            <div className={`bg-muted/50 rounded-lg p-4 border border-border ${className}`}>
                <p className="text-xs text-muted-foreground">Loading password requirements...</p>
            </div>
        );
    }

    return (
        <div className={`bg-muted/50 rounded-lg p-4 border border-border ${className}`}>
            <p className="text-xs font-medium text-muted-foreground mb-3">Password Requirements:</p>
            <ul className="space-y-1.5">
                {requirements.map((req) => (
                    <li
                        key={req.key}
                        className={`flex items-center gap-2 text-xs transition-colors ${req.met ? 'text-green-500' : 'text-muted-foreground'
                            }`}
                    >
                        {req.met ? (
                            <Check className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                            <X className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                        )}
                        <span>{req.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Hook for using password validation in forms
export function usePasswordValidation(password: string) {
    const [policies, setPolicies] = useState<PasswordPolicy>(defaultPolicies);
    const [requirements, setRequirements] = useState<PasswordRequirement[]>([]);
    const [isValid, setIsValid] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch policies on mount
    useEffect(() => {
        getPasswordPolicies()
            .then(setPolicies)
            .finally(() => setLoading(false));
    }, []);

    // Update requirements when password changes
    useEffect(() => {
        const reqs = validatePassword(password, policies);
        setRequirements(reqs);
        setIsValid(reqs.every(r => r.met));
    }, [password, policies]);

    return { policies, requirements, isValid, loading };
}
