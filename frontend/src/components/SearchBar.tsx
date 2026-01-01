'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}

export default function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    className = '',
    autoFocus = false,
}: SearchBarProps) {
    const [isFocused, setIsFocused] = useState(false);

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className={`relative max-w-md ${className}`}>
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFocused ? 'text-primary' : 'text-muted-foreground'
                }`} />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoFocus={autoFocus}
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all placeholder:text-muted-foreground"
            />
            {value && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    title="Clear search"
                    type="button"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
