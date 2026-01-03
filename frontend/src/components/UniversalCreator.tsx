'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    X,
    Building2,
    Calendar,
    UserPlus,
    Layers,
    Activity,
    Smartphone,
    ChevronRight
} from 'lucide-react';

interface UniversalCreatorProps {
    isOpen: boolean;
    onClose: () => void;
}

const ITEMS = [
    {
        id: 'org',
        title: 'Organization',
        description: 'Create a new tenant organization',
        icon: Building2,
        path: '/admin/organizations/new',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20'
    },
    {
        id: 'event',
        title: 'Mega Event',
        description: 'Setup high-security, permitted events',
        icon: Calendar,
        path: '/events/new',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20'
    },
    {
        id: 'user',
        title: 'Global User',
        description: 'Invite admins, managers, or staff',
        icon: UserPlus,
        path: '/users/new',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20'
    },
    {
        id: 'device',
        title: 'IoT Device',
        description: 'Provision sensors & gateways',
        icon: Smartphone,
        path: '/admin/devices/new', // Assumed route, can update later
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20'
    },
    {
        id: 'dept-template',
        title: 'Department Template',
        description: 'Create reusable department presets',
        icon: Layers,
        path: '/admin/department-templates',
        color: 'text-teal-500',
        bgColor: 'bg-teal-500/10',
        borderColor: 'border-teal-500/20'
    }
];

export default function UniversalCreator({ isOpen, onClose }: UniversalCreatorProps) {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const handleSelect = (path: string) => {
        router.push(path);
        onClose();
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                    <div>
                        <h2 className="text-lg font-bold">Create New...</h2>
                        <p className="text-sm text-muted-foreground">Select an item to configure</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item.path)}
                                className={`group flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md text-left ${item.borderColor} hover:bg-muted/50 bg-card`}
                            >
                                <div className={`p-3 rounded-lg ${item.bgColor} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer Hint */}
                <div className="px-6 py-4 bg-muted/30 border-t border-border text-xs text-center text-muted-foreground">
                    <span className="font-semibold">Tip:</span> You can also press <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">C</kbd> anywhere to open this menu.
                </div>
            </div>
        </div>
    );
}
