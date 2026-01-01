
import React, { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = '', label, error, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-sm font-medium text-foreground/80 leading-none">
                        {label}
                    </label>
                )}
                <textarea
                    className={`flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-primary/50 ${error ? 'border-destructive focus-visible:ring-destructive' : ''} ${className}`}
                    ref={ref}
                    {...props}
                />
                {error && <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">{error}</p>}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
