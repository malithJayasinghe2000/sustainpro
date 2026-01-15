'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface RichSelectOption {
    value: string;
    label: string;
    image?: string;
    icon?: React.ElementType;
}

interface RichSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: RichSelectOption[];
    placeholder?: string;
    label?: string;
    error?: string;
    icon?: React.ElementType;
    className?: string;
    searchable?: boolean;
}

export function RichSelect({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    label,
    error,
    icon: Icon,
    className = '',
    searchable = false,
}: RichSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Filter options based on search query
    const filteredOptions = searchable && searchQuery
        ? options.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            opt.value.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="w-full space-y-1.5">
            {label && (
                <label className="text-sm font-medium text-foreground/80 leading-none">
                    {label}
                </label>
            )}
            <div className={`relative ${className}`} ref={containerRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full h-full flex items-center justify-between px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${isOpen ? 'ring-2 ring-primary/20 border-primary' : 'hover:border-primary/50'} ${error ? 'border-destructive' : ''}
                        }`}
                >
                    <div className="flex items-center gap-2 truncate">
                        {/* Selected Image */}
                        {selectedOption?.image ? (
                            <img
                                src={selectedOption.image}
                                alt=""
                                className="w-5 h-5 rounded-full object-cover bg-white border border-border"
                            />
                        ) : selectedOption?.icon ? (
                            /* Selected Option Icon */
                            <selectedOption.icon className="w-4 h-4 text-muted-foreground" />
                        ) : Icon ? (
                            /* Default Component Icon */
                            <Icon className="w-4 h-4 text-muted-foreground" />
                        ) : null}

                        {/* Selected Label */}
                        <span className={`truncate font-medium ${!selectedOption ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>

                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                        {/* Search Input */}
                        {searchable && (
                            <div className="p-2 border-b border-border">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Options List */}
                        <div className="max-h-60 overflow-auto py-1">
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                                    No results found
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const isSelected = option.value === value;
                                    return (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => handleSelect(option.value)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left
                                            ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'}
                                        `}
                                        >
                                            {/* Option Image or Icon */}
                                            {option.image ? (
                                                <img
                                                    src={option.image}
                                                    alt=""
                                                    className="w-5 h-5 rounded-full object-cover bg-white border border-border"
                                                />
                                            ) : option.icon ? (
                                                <option.icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                            ) : Icon && !option.image ? (
                                                // Fallback to generic icon if provided
                                                <div className="w-5 h-5 flex items-center justify-center">
                                                    <Icon className="w-4 h-4 text-muted-foreground opacity-50" />
                                                </div>
                                            ) : null}

                                            <span className="flex-1 truncate">{option.label}</span>

                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">{error}</p>}
        </div>
    );
}

