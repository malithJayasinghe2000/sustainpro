'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { usePasswordValidation, PasswordValidation } from '@/hooks/usePasswordValidation';

interface PasswordInputProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    showValidation?: boolean;
    showStrength?: boolean;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    onValidationChange?: (validation: PasswordValidation) => void;
}

export default function PasswordInput({
    label = 'Password',
    value,
    onChange,
    placeholder = 'Enter password',
    showValidation = true,
    showStrength = true,
    required = false,
    disabled = false,
    className = '',
    onValidationChange,
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [touched, setTouched] = useState(false);
    const { validatePassword, getStrengthColor, isLoading } = usePasswordValidation();
    const [validation, setValidation] = useState<PasswordValidation>({
        isValid: false,
        errors: [],
        requirements: [],
        strength: 'weak',
    });

    // Validate password when it changes
    useEffect(() => {
        if (value) {
            const newValidation = validatePassword(value);
            setValidation(newValidation);
            onValidationChange?.(newValidation);
        } else {
            setValidation({
                isValid: false,
                errors: [],
                requirements: [],
                strength: 'weak',
            });
        }
    }, [value, validatePassword, onValidationChange]);

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-foreground">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {/* Password Input */}
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder={placeholder}
                    disabled={disabled || isLoading}
                    className={`w-full px-4 py-2.5 pr-12 bg-background border rounded-lg transition-all
                        focus:ring-2 focus:ring-primary/20 focus:border-primary
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${touched && value && !validation.isValid
                            ? 'border-red-500/50'
                            : touched && value && validation.isValid
                                ? 'border-green-500/50'
                                : 'border-input'
                        }`}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>

            {/* Strength Meter */}
            {showStrength && value && (
                <div className="space-y-1">
                    <div className="flex gap-1">
                        <div className={`h-1 flex-1 rounded ${value.length > 0 ? getStrengthColor(validation.strength) : 'bg-muted'}`} />
                        <div className={`h-1 flex-1 rounded ${validation.strength === 'medium' || validation.strength === 'strong' ? getStrengthColor(validation.strength) : 'bg-muted'}`} />
                        <div className={`h-1 flex-1 rounded ${validation.strength === 'strong' ? getStrengthColor(validation.strength) : 'bg-muted'}`} />
                    </div>
                    <p className={`text-xs capitalize ${validation.strength === 'strong' ? 'text-green-500' :
                            validation.strength === 'medium' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                        {validation.strength} password
                    </p>
                </div>
            )}

            {/* Requirements Checklist */}
            {showValidation && value && validation.requirements.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Password Requirements:</p>
                    {validation.requirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                            {req.met ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                                <X className="w-3.5 h-3.5 text-red-500" />
                            )}
                            <span className={req.met ? 'text-green-600' : 'text-muted-foreground'}>
                                {req.label}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Error Message (for form submissions) */}
            {touched && validation.errors.length > 0 && !showValidation && (
                <div className="flex items-center gap-1.5 text-red-500 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validation.errors[0]}</span>
                </div>
            )}
        </div>
    );
}
