'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'default' | 'destructive';
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
};

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    variant = 'default'
}: ModalProps) {
    // Close on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent background scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const variantClasses = variant === 'destructive'
        ? 'border-destructive/20 ring-1 ring-destructive/20'
        : 'border-border';

    const headerClasses = variant === 'destructive'
        ? 'bg-destructive/5 border-destructive/10'
        : '';

    const titleClasses = variant === 'destructive'
        ? 'text-destructive'
        : 'text-foreground';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`bg-background w-full ${sizeClasses[size]} rounded-xl shadow-2xl border ${variantClasses} overflow-hidden animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-6 py-4 border-b border-border flex items-center justify-between ${headerClasses}`}>
                    <h2 className={`text-lg font-semibold ${titleClasses}`}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
