import { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface PasswordInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    placeholder?: string;
    showStrength?: boolean;
    confirmValue?: string;
    required?: boolean;
}

// Helper function to calculate strength
export function calculateStrength(password: string): number {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
}

export function PasswordStrength({ password, confirmPassword, className = '' }: { password: string, confirmPassword?: string, className?: string }) {
    if (!password) return null;

    const strength = calculateStrength(password);
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

    // Check if passwords match
    const passwordsMatch = confirmPassword !== undefined && password && confirmPassword && password === confirmPassword;
    const passwordsDontMatch = confirmPassword !== undefined && password && confirmPassword && password !== confirmPassword;


    return (
        <div className={`space-y-3 mt-3 ${className}`}>
            {/* Enterprise Segmented Bar Strength Indicator */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Password Strength</span>
                        {confirmPassword !== undefined && password && confirmPassword && (
                            <div className="flex items-center gap-1.5 border-l border-border/50 pl-3">
                                {passwordsMatch ? (
                                    <span className="text-[11px] font-medium text-green-500 flex items-center gap-1">
                                        <Check className="w-2.5 h-2.5" /> Passwords match
                                    </span>
                                ) : passwordsDontMatch ? (
                                    <span className="text-[11px] font-medium text-red-500 flex items-center gap-1">
                                        <X className="w-2.5 h-2.5" /> Passwords don't match
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </div>
                    <span className={`text-[11px] font-medium transition-colors ${strength <= 1 ? 'text-red-500' :
                        strength === 2 ? 'text-orange-500' :
                            strength === 3 ? 'text-yellow-500' :
                                'text-green-500'
                        }`}>
                        {strengthLabels[Math.min(strength, 4)] || 'Start typing'}
                    </span>
                </div>
                <div className="flex gap-1 h-1.5 w-full">
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className={`flex-1 rounded-full transition-all duration-500 ${index < strength
                                ? (strength <= 1 ? 'bg-red-500' :
                                    strength === 2 ? 'bg-orange-500' :
                                        strength === 3 ? 'bg-yellow-500' :
                                            'bg-green-500')
                                : 'bg-muted/50'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function PasswordInput({
    label,
    value,
    onChange,
    error,
    placeholder = '••••••••',
    showStrength = false,
    confirmValue,
    required = false
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full px-3 py-2.5 pr-10 border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${error ? 'border-red-500' : 'border-border'
                        }`}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>

            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> {error}
                </p>
            )}

            {/* Password Strength Indicator */}
            {showStrength && value && (
                <PasswordStrength password={value} confirmPassword={confirmValue} />
            )}
        </div>
    );
}
