'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Shield, Save, Check, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { rbacApi, rolesApi, Role } from '@/lib/api';
import { ROLES, ROLE_LABELS } from '@/lib/roles';
import { toast } from 'sonner';

interface Permission {
    code: string;
    name: string;
    module: string;
    description: string;
}

export default function RBACPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [mappings, setMappings] = useState<Record<string, string[]>>({});
    const [selectedRole, setSelectedRole] = useState<string>(ROLES.ORG_ADMIN);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

    // Group permissions by module
    const groupedPermissions = permissions.reduce((acc, perm) => {
        if (!acc[perm.module]) acc[perm.module] = [];
        acc[perm.module].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    useEffect(() => {
        if (!authLoading && user && !user.is_super_admin) {
            router.push('/dashboard');
        }
    }, [user, authLoading]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [perms, maps, roles] = await Promise.all([
                rbacApi.getPermissions(),
                rbacApi.getMappings(),
                rolesApi.getAll().catch(() => []) // Fallback to empty if API fails
            ]);
            setPermissions(perms);
            setMappings(maps);

            // Filter out SUPER_ADMIN from role list (permissions managed differently)
            const filteredRoles = roles.filter(r => r.code !== 'SUPER_ADMIN');
            setAvailableRoles(filteredRoles);

            // Set default selected role if available
            if (filteredRoles.length > 0 && !filteredRoles.find(r => r.code === selectedRole)) {
                setSelectedRole(filteredRoles[0].code);
            }
        } catch (error) {
            toast.error('Failed to load RBAC configuration');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = (permCode: string) => {
        setMappings(prev => {
            const currentRolePerms = prev[selectedRole] || [];
            const hasPerm = currentRolePerms.includes(permCode);

            let newRolePerms;
            if (hasPerm) {
                newRolePerms = currentRolePerms.filter(p => p !== permCode);
            } else {
                newRolePerms = [...currentRolePerms, permCode];
            }

            return {
                ...prev,
                [selectedRole]: newRolePerms
            };
        });
    };

    const handleModuleToggle = (moduleName: string, modulePerms: Permission[]) => {
        setMappings(prev => {
            const currentRolePerms = prev[selectedRole] || [];
            const modulePermCodes = modulePerms.map(p => p.code);

            // Check if all are currently selected
            const allSelected = modulePermCodes.every(code => currentRolePerms.includes(code));

            let newRolePerms;
            if (allSelected) {
                // Deselect all
                newRolePerms = currentRolePerms.filter(p => !modulePermCodes.includes(p));
            } else {
                // Select all (add missing ones)
                const toAdd = modulePermCodes.filter(code => !currentRolePerms.includes(code));
                newRolePerms = [...currentRolePerms, ...toAdd];
            }

            return {
                ...prev,
                [selectedRole]: newRolePerms
            };
        });
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const rolePerms = mappings[selectedRole] || [];
            await rbacApi.updateMapping(selectedRole, rolePerms);
            toast.success(`Updated permissions for ${ROLE_LABELS[selectedRole]}`);
        } catch (error) {
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user?.is_super_admin) return null;

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            Access Control (RBAC)
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Configure feature access and permissions for each system role.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchData}
                            className="btn-outline flex items-center gap-2"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

                    {/* Left: Role Selector */}
                    <div className="lg:col-span-1 space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">
                            Select Role
                        </label>
                        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
                            {availableRoles.length > 0 ? (
                                availableRoles.map((role) => (
                                    <button
                                        key={role.code}
                                        onClick={() => setSelectedRole(role.code)}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-l-4 ${selectedRole === role.code
                                            ? 'bg-primary/5 border-l-primary text-primary'
                                            : 'border-l-transparent text-foreground/70 hover:bg-muted hover:text-foreground'
                                            }`}
                                        style={selectedRole === role.code && role.color ? { borderLeftColor: role.color } : undefined}
                                    >
                                        {role.name}
                                    </button>
                                ))
                            ) : (
                                // Fallback to static ROLES if API roles not loaded
                                Object.values(ROLES).filter(r => r !== 'SUPER_ADMIN').map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => setSelectedRole(role)}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-l-4 ${selectedRole === role
                                            ? 'bg-primary/5 border-l-primary text-primary'
                                            : 'border-l-transparent text-foreground/70 hover:bg-muted hover:text-foreground'
                                            }`}
                                    >
                                        {ROLE_LABELS[role]}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 rounded-xl border border-amber-200 dark:border-amber-800 text-xs mt-4">
                            <h4 className="font-bold flex items-center gap-1 mb-1">
                                <AlertTriangle className="w-3 h-3" />
                                Important
                            </h4>
                            Changes affect all users with this role immediately after saving.
                        </div>
                    </div>

                    {/* Right: Permissions Matrix */}
                    <div className="lg:col-span-3 space-y-6">

                        <div className="bg-card border border-border rounded-xl !shadow-none overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/10">
                                <div>
                                    <h2 className="font-semibold text-lg">
                                        {availableRoles.find(r => r.code === selectedRole)?.name || ROLE_LABELS[selectedRole]}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">Managing {mappings[selectedRole]?.length || 0} permissions</p>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>

                            <div className="p-6 space-y-8">
                                {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                                    const rolePerms = mappings[selectedRole] || [];
                                    const modulePermCodes = perms.map(p => p.code);
                                    const allSelected = modulePermCodes.every(code => rolePerms.includes(code));
                                    const someSelected = modulePermCodes.some(code => rolePerms.includes(code));
                                    const isIndeterminate = someSelected && !allSelected;

                                    return (
                                        <div key={moduleName} className="space-y-3">
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                                                    {moduleName}
                                                </h3>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors font-medium">
                                                        {allSelected ? 'Disable Module' : 'Enable Module'}
                                                    </span>
                                                    <div
                                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${allSelected || isIndeterminate
                                                            ? 'bg-primary border-primary text-white'
                                                            : 'border-muted-foreground/30 bg-white group-hover:border-primary'
                                                            }`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleModuleToggle(moduleName, perms);
                                                        }}
                                                    >
                                                        {allSelected && <Check className="w-3.5 h-3.5" />}
                                                        {isIndeterminate && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
                                                    </div>
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {perms.map(perm => {
                                                    const isChecked = mappings[selectedRole]?.includes(perm.code);
                                                    return (
                                                        <label
                                                            key={perm.code}
                                                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isChecked
                                                                ? 'bg-primary/5 border-primary/30'
                                                                : 'bg-background border-border hover:border-border/80'
                                                                }`}
                                                        >
                                                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30 bg-white'
                                                                }`}>
                                                                {isChecked && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                className="hidden"
                                                                checked={isChecked || false}
                                                                onChange={() => handleToggle(perm.code)}
                                                            />
                                                            <div className="space-y-0.5">
                                                                <span className={`text-sm font-medium ${isChecked ? 'text-primary' : 'text-foreground'}`}>
                                                                    {perm.name}
                                                                </span>
                                                                <p className="text-[11px] text-muted-foreground leading-snug">
                                                                    {perm.description}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
