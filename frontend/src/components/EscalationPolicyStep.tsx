import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, Users, Clock, Mail, Bell, MessageSquare } from 'lucide-react';
import { usersApi } from '@/lib/api';

// Types
export type NotifyMethod = 'email' | 'sms' | 'push' | 'all';

export interface EscalationLevel {
    id: string;
    level: number;
    delayMinutes: number;
    autoAssignTo: string; // User ID
    notifyMethod: NotifyMethod;
}

export interface OrgUser {
    id: string;
    full_name: string;
    email: string;
    role?: string;
}

interface EscalationPolicyStepProps {
    organizationId: string;
    policies: EscalationLevel[];
    onPoliciesChange: (policies: EscalationLevel[]) => void;
}

const DELAY_OPTIONS = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
    { value: 1440, label: '24 hours' },
];

const NOTIFY_METHOD_OPTIONS: { value: NotifyMethod; label: string; icon: typeof Mail }[] = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'push', label: 'Push Notification', icon: Bell },
    { value: 'sms', label: 'SMS', icon: MessageSquare },
    { value: 'all', label: 'All Methods', icon: Bell },
];

// Helper to generate unique ID
const generateId = () => `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function EscalationPolicyStep({
    organizationId,
    policies,
    onPoliciesChange
}: EscalationPolicyStepProps) {
    const [users, setUsers] = useState<OrgUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch organization users for assignment dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            if (!organizationId) return;

            setIsLoading(true);
            try {
                const response = await usersApi.getAll();
                // Filter to users in this organization
                const orgUsers = (response.data || []).filter((u: any) => 
                    u.organization_id === organizationId && u.is_active !== false
                );
                setUsers(orgUsers);
            } catch (error) {
                console.error('Error fetching users:', error);
                setUsers([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [organizationId]);

    const addLevel = () => {
        const nextLevel = policies.length + 1;
        const newPolicy: EscalationLevel = {
            id: generateId(),
            level: nextLevel,
            delayMinutes: 15,
            autoAssignTo: '',
            notifyMethod: 'email',
        };
        onPoliciesChange([...policies, newPolicy]);
    };

    const updatePolicy = (id: string, field: keyof EscalationLevel, value: any) => {
        const updated = policies.map(policy => {
            if (policy.id === id) {
                return { ...policy, [field]: value };
            }
            return policy;
        });
        onPoliciesChange(updated);
    };

    const removePolicy = (id: string) => {
        const filtered = policies.filter(p => p.id !== id);
        // Re-number levels
        const renumbered = filtered.map((p, idx) => ({ ...p, level: idx + 1 }));
        onPoliciesChange(renumbered);
    };

    const getUserName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? user.full_name : 'Select user...';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ArrowUp className="w-5 h-5 text-blue-500" />
                    Escalation Policy Configuration
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Define escalation levels to automatically notify and assign alerts if they are not acknowledged in time.
                </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>How it works:</strong> When an alert is triggered, Level 1 is notified first. 
                    If the alert is not acknowledged within the specified delay, it escalates to the next level.
                    This continues until the alert is acknowledged or all levels have been exhausted.
                </p>
            </div>

            {/* Escalation Levels */}
            {policies.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-8 text-center">
                    <ArrowUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                        No escalation levels configured. Add levels to automatically escalate unacknowledged alerts.
                    </p>
                    <button
                        onClick={addLevel}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4" />
                        Add Escalation Level
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {policies.map((policy, index) => (
                        <div 
                            key={policy.id} 
                            className="border border-border rounded-lg bg-card p-4"
                        >
                            <div className="grid grid-cols-12 gap-4 items-start">
                                {/* Level Badge */}
                                <div className="col-span-1">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                                        <span className="text-sm font-bold text-primary">{policy.level}</span>
                                    </div>
                                </div>

                                {/* Auto Assign To */}
                                <div className="col-span-4">
                                    <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Assign To
                                    </label>
                                    <select
                                        value={policy.autoAssignTo}
                                        onChange={(e) => updatePolicy(policy.id, 'autoAssignTo', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="">Select user to assign...</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Delay Before Escalation */}
                                <div className="col-span-3">
                                    <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Escalate After
                                    </label>
                                    <select
                                        value={policy.delayMinutes}
                                        onChange={(e) => updatePolicy(policy.id, 'delayMinutes', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                    >
                                        {DELAY_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Notify Method */}
                                <div className="col-span-3">
                                    <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                                        <Bell className="w-3 h-3" />
                                        Notify Via
                                    </label>
                                    <select
                                        value={policy.notifyMethod}
                                        onChange={(e) => updatePolicy(policy.id, 'notifyMethod', e.target.value as NotifyMethod)}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                    >
                                        {NOTIFY_METHOD_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Remove Button */}
                                <div className="col-span-1 flex justify-end">
                                    <button
                                        onClick={() => removePolicy(policy.id)}
                                        className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                                        title="Remove level"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Escalation Arrow */}
                            {index < policies.length - 1 && (
                                <div className="flex justify-center mt-3 pt-3 border-t border-dashed border-border">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>If not acknowledged within {policy.delayMinutes} min</span>
                                        <ArrowUp className="w-4 h-4 rotate-180" />
                                        <span>Escalate to Level {policy.level + 1}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add More Button */}
                    <button
                        onClick={addLevel}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm bg-background border border-dashed border-border hover:bg-muted hover:border-primary/30 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Escalation Level {policies.length + 1}
                    </button>
                </div>
            )}

            {/* Notice */}
            {policies.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Escalation policies can be modified later from the service management panel.
                </p>
            )}

            {/* Skip Notice */}
            <div className="text-center pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                    Escalation policies are optional. You can skip this step and configure them later.
                </p>
            </div>
        </div>
    );
}
