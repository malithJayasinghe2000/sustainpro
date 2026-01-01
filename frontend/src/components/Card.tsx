import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
    return (
        <div
            className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '', ...props }: CardProps) {
    return (
        <div
            className={`px-6 py-4 border-b border-border ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardContent({ children, className = '', ...props }: CardProps) {
    return (
        <div
            className={`p-6 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardTitle({ children, className = '', ...props }: CardProps) {
    return (
        <h2
            className={`font-semibold text-foreground ${className}`}
            {...props}
        >
            {children}
        </h2>
    );
}
