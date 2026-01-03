
import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ElementType;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, icon: Icon, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-sm font-medium text-foreground/80 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {Icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            <Icon className="w-4 h-4" />
                        </div>
                    )}
                    <input
                        className={`flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/50 ${Icon ? 'pl-9' : ''} ${error ? 'border-destructive focus-visible:ring-destructive' : ''} ${className}`}
                        ref={ref}
                        onClick={(e) => {
                            if (props.type === 'date' || props.type === 'datetime-local') {
                                try {
                                    (e.target as HTMLInputElement).showPicker();
                                } catch (err) {
                                    // Browser doesn't support showPicker
                                }
                            }
                            props.onClick?.(e);
                        }}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
