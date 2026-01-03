'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Plus,
    Edit,
    Trash2,
    Layers,
    Shield,
    Heart,
    Zap,
    Users,
    Settings
} from 'lucide-react';
import { RichSelect } from '@/components/ui/RichSelect';
import { departmentTemplatesApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Icon mapping for template display
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
    organization_id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    is_active: boolean;
    created_at: string;
}

export default function DepartmentTemplatesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [templates, setTemplates] = useState<DepartmentTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<DepartmentTemplate | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: 'Layers',
        color: '#3B82F6'
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await departmentTemplatesApi.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('Failed to load department templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!formData.name) {
                toast.error('Name is required');
                return;
            }

            if (editingTemplate) {
                await departmentTemplatesApi.update(editingTemplate.id, formData);
                toast.success('Template updated successfully');
            } else {
                await departmentTemplatesApi.create(formData);
                toast.success('Template created successfully');
            }

            setShowCreateModal(false);
            setEditingTemplate(null);
            setFormData({ name: '', description: '', icon: 'Layers', color: '#3B82F6' });
            fetchTemplates();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to save template');
        }
    };

    const handleEdit = (template: DepartmentTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            description: template.description || '',
            icon: template.icon || 'Layers',
            color: template.color || '#3B82F6'
        });
        setShowCreateModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            await departmentTemplatesApi.delete(id);
            toast.success('Template deleted successfully');
            fetchTemplates();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to delete template');
        }
    };

    const openCreateModal = () => {
        setEditingTemplate(null);
        setFormData({ name: '', description: '', icon: 'Layers', color: '#3B82F6' });
        setShowCreateModal(true);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1400px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Department Templates</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Create reusable department configurations for your organization
                        </p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create Template
                    </button>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {templates.map((template) => {
                        const Icon = ICON_MAP[template.icon] || Layers;
                        return (
                            <div
                                key={template.id}
                                className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div
                                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                                        style={{
                                            backgroundColor: `${template.color}15`,
                                            color: template.color
                                        }}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(template)}
                                            className="p-1.5 hover:bg-muted rounded transition-colors"
                                        >
                                            <Edit className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {template.description || 'No description'}
                                </p>
                            </div>
                        );
                    })}

                    {templates.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                            <Layers className="w-16 h-16 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Create your first department template to get started
                            </p>
                            <button
                                onClick={openCreateModal}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                                Create Template
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowCreateModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
                        <h2 className="text-lg font-bold mb-4">
                            {editingTemplate ? 'Edit Template' : 'Create Template'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                    placeholder="e.g., Security, Medical, Operations"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                                    rows={3}
                                    placeholder="Brief description of this department"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Icon</label>
                                    <RichSelect
                                        value={formData.icon}
                                        onChange={(val) => setFormData({ ...formData, icon: val })}
                                        options={[
                                            { value: 'Layers', label: 'Layers', icon: Layers },
                                            { value: 'Shield', label: 'Shield', icon: Shield },
                                            { value: 'Heart', label: 'Heart', icon: Heart },
                                            { value: 'Zap', label: 'Zap', icon: Zap },
                                            { value: 'Users', label: 'Users', icon: Users },
                                            { value: 'Settings', label: 'Settings', icon: Settings },
                                        ]}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">Color</label>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full h-10 border border-border rounded-lg bg-background cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                {editingTemplate ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
