import LoadingSpinner from '@/components/LoadingSpinner';
import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, Users, Clock, Mail, Bell, MessageSquare, CheckCircle2, User, UserCog, Settings } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { ROLE_LABELS, ROLES } from '@/lib/roles';
import { RichSelect, RichSelectOption } from '@/components/ui/RichSelect';

// Types
export type NotifyMethod = 'email' | 'sms' | 'push' | 'all';

export interface EscalationLevel {
    id: string;
    level: number;
    delayMinutes: number;
    autoAssignTo: string; // User ID
    notifyMethod: NotifyMethod;
    filterRole?: string;
}

export interface UserRole {
    role: string;
    event_id?: string;
    department_id?: string;
}

export interface OrgUser {
    id: string;
    full_name: string;
    email: string;
    roles?: UserRole[];  // Users have an array of roles, not a single role
    is_super_admin?: boolean;
}

interface EscalationPolicyStepProps {
    organizationId: string;
    departmentId?: string;
    eventId?: string;
    policies: EscalationLevel[];
    onPoliciesChange: (policies: EscalationLevel[]) => void;
}

const DELAY_OPTIONS: RichSelectOption[] = [
    { value: '5', label: '5 minutes' },
    { value: '10', label: '10 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '120', label: '2 hours' },
    { value: '240', label: '4 hours' },
    { value: '480', label: '8 hours' },
    { value: '1440', label: '24 hours' },
];

const NOTIFY_METHOD_OPTIONS: RichSelectOption[] = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'push', label: 'Push Notification', icon: Bell },
    { value: 'sms', label: 'SMS', icon: MessageSquare },
    { value: 'all', label: 'All Methods', icon: Bell },
];

// Helper to generate unique ID
const generateId = () => `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function EscalationPolicyStep({
    organizationId,
    departmentId,
    eventId,
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
                // Filter to users in this organization OR Super Admins
                const orgUsers = (response.data || []).filter((u: any) =>
                    (u.organization_id === organizationId || u.is_super_admin) && u.is_active !== false
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

    // Derived State: Role Options from Constant
    const roleOptions: RichSelectOption[] = Object.entries(ROLE_LABELS).map(([value, label]) => ({
        value,
        label,
        icon: UserCog
    }));

    const addLevel = () => {
        const nextLevel = policies.length + 1;
        const newPolicy: EscalationLevel = {
            id: generateId(),
            level: nextLevel,
            delayMinutes: 15,
            autoAssignTo: '',
            notifyMethod: 'email',
            filterRole: '',
        };
        onPoliciesChange([...policies, newPolicy]);
    };

    const updatePolicy = (id: string, field: keyof EscalationLevel, value: any) => {
        const updated = policies.map(policy => {
            if (policy.id === id) {
                // If filterRole changes, reset the assigned user to force re-selection (optional but UX friendly)
                if (field === 'filterRole') {
                    return { ...policy, [field]: value, autoAssignTo: '' };
                }
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner className="" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ArrowUp className="w-5 h-5 text-blue-500" />
                    Escalation Policy
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Define a timeline of who gets notified if an alert is not acknowledged.
                    Levels trigger sequentially if no action is taken.
                </p>
            </div>

            {/* List of Cards (Replacing Timeline) */}
            <div className="space-y-4">
                {policies.map((policy, index) => {
                    // Context-Aware User Filtering
                    const filteredUsers = users.filter(u => {
                        // If no role filter selected, show all org users
                        if (!policy.filterRole) return true;

                        // 1. Check for Super Admin (special case - check is_super_admin flag)
                        if (policy.filterRole === ROLES.SUPER_ADMIN) {
                            return u.is_super_admin === true;
                        }

                        // 2. Check if user has the selected role in their roles array
                        const userRoles = u.roles || [];
                        const matchingRole = userRoles.find(r => r.role === policy.filterRole);

                        if (!matchingRole) return false;

                        // 3. Context Checks based on role type
                        if (policy.filterRole === ROLES.EVENT_MANAGER) {
                            // Event Manager must match eventId if available
                            if (eventId && matchingRole.event_id && matchingRole.event_id !== eventId) {
                                return false;
                            }
                        }
                        if (policy.filterRole === ROLES.DEPT_HEAD) {
                            // Dept Head must match departmentId if available
                            if (departmentId && matchingRole.department_id && matchingRole.department_id !== departmentId) {
                                return false;
                            }
                        }

                        return true;
                    });

                    const userOptions: RichSelectOption[] = filteredUsers.map(u => ({
                        value: u.id,
                        label: u.email ? `${u.full_name} (${u.email})` : u.full_name,
                        icon: User
                    }));

                    return (
                        <div key={policy.id} className="border border-border rounded-xl bg-card shadow-sm transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-4 flex items-start sm:items-center gap-4">
                                {/* Number Circle aligned with content */}
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 mt-1.5 sm:mt-0">
                                    {policy.level}
                                </div>

                                {/* Main Content Area */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="flex flex-col col-span-2 space-y-1">
                                    <RichSelect
                                        label="Filter by Role"
                                        value={policy.filterRole || ''}
                                        onChange={(val) => updatePolicy(policy.id, 'filterRole', val)}
                                        options={roleOptions}
                                        placeholder="All Roles"
                                        icon={Settings}
                                        className="min-w-[140px]"
                                    />
                                    <RichSelect
                                        label="Notify via"
                                        value={policy.notifyMethod}
                                        onChange={(val) => updatePolicy(policy.id, 'notifyMethod', val)}
                                        options={NOTIFY_METHOD_OPTIONS}
                                        placeholder="Select method..."
                                        icon={Bell}
                                    />                                  
                                    </div>

                                    <div className="flex flex-col col-span-2 space-y-1">
                                    
                                    <RichSelect
                                        label="Assign To User"
                                        value={policy.autoAssignTo}
                                        onChange={(val) => updatePolicy(policy.id, 'autoAssignTo', val)}
                                        options={userOptions}
                                        placeholder="Select user..."
                                        icon={Users}
                                        className="min-w-[160px]"
                                    />
                                    

                                    <div className="space-y-1">
                                        <RichSelect
                                            label="Escalate after"
                                            value={policy.delayMinutes.toString()}
                                            onChange={(val) => updatePolicy(policy.id, 'delayMinutes', parseInt(val))}
                                            options={DELAY_OPTIONS}
                                            placeholder="Time to wait..."
                                            icon={Clock}
                                        />
                                    </div>
                                    </div>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => removePolicy(policy.id)}
                                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors shrink-0 self-start sm:self-center"
                                    title="Remove level"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Add Level Button - Matches Alert Step Style */}
                <button
                    onClick={addLevel}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 top-0 text-sm bg-background border border-dashed border-border hover:bg-muted/50 hover:border-primary/50 hover:text-primary rounded-xl transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Plus className="w-4 h-4" />
                    </div>
                    <span className="font-medium">Add Escalation Level {policies.length + 1}</span>
                </button>
            </div>
        </div>
    );
}
