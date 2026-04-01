import React from 'react';

interface LoadingSpinnerProps {
    className?: string;
    fullScreen?: boolean;
}

export default function LoadingSpinner({ className = "flex items-center justify-center py-20", fullScreen }: LoadingSpinnerProps) {
    return (
        <div className={fullScreen ? "min-h-screen flex items-center justify-center bg-gray-50/50" : className}>
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
}