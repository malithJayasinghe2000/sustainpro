'use client';

import { useState, useEffect } from 'react';
import {
    X,
    Layers,
    Shield,
    Heart,
    Zap,
    Users,
    Settings,
    Check,
    Search
} from 'lucide-react';
import { departmentTemplatesApi } from '@/lib/api';
import { toast } from 'sonner';

// Icon mapping
const ICON_MAP: Record<string, any> = {
    Shield,
    Heart,
    Zap,
    Users,
    Settings,
    Layers
};

interface DepartmentTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
}

interface DepartmentsSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: DepartmentTemplate) => void;
    currentOrgId?: string; // Optional: if we need to filter by specific org, though API handles it
}

export default function DepartmentsSelector({ isOpen, onClose, onSelect }: DepartmentsSelectorProps) {
    const [templates, setTemplates] = useState<DepartmentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowContent(true);
            fetchTemplates();
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setShowContent(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await departmentTemplatesApi.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!showContent && !isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
                }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 flex flex-col max-h-[85vh] ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                    }`}
            >
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <div>
                        <h2 className="font-bold text-lg">Add Department</h2>
                        <p className="text-sm text-muted-foreground">Select a template to instantiate</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No templates found</p>
                        </div>
                    ) : (
                        filteredTemplates.map((template) => {
                            const Icon = ICON_MAP[template.icon] || Layers;
                            return (
                                <button
                                    key={template.id}
                                    onClick={() => onSelect(template)}
                                    className="w-full flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all group text-left"
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                        style={{
                                            backgroundColor: `${template.color || '#3B82F6'}15`,
                                            color: template.color || '#3B82F6'
                                        }}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {template.name}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {template.description || 'No description provided'}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
