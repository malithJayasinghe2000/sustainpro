'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import Navbar from '@/components/Navbar';
import MaintenancePage from '@/components/MaintenancePage';
import { getRoleLabel, hasRole, isAdmin, ROLES } from '@/lib/roles';
import { LayoutDashboard, Users, UserPlus, Settings, LogOut, ChevronLeft, ChevronRight, Menu, Bell, Search, Plus, Filter, LayoutTemplate, Calendar, Building2, Cpu, Database, Network, Activity, Layers, Smartphone, FileText, Component, Shield, User, ScrollText } from 'lucide-react';
import { applyOrganizationTheme } from '@/lib/theme-utils';
import { getPrimaryColor } from '@/lib/theme-parser';

interface MenuItem {
    name: string;
    icon: any;
    path: string;
    submenu?: { name: string; path: string; requiredPermission?: string }[];
    requiredRole?: string;
    requiredPermission?: string;
}

interface SidebarProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: SidebarProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const { settings } = useSettings();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }

        // Apply Global Organization Theme
        if (user?.theme_config) {
            const primaryColor = getPrimaryColor(user.theme_config, '');
            if (primaryColor) {
                applyOrganizationTheme(primaryColor);
            }
        }
    }, [isLoading, isAuthenticated, router, user?.theme_config]);

    // Auto-collapse logic
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (sidebarOpen && !isHovered) {
            timer = setTimeout(() => {
                setSidebarOpen(false);
            }, 10000);
        }
        return () => clearTimeout(timer);
    }, [sidebarOpen, isHovered]);


    const superAdminItems: MenuItem[] = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
        {
            name: 'Organizations',
            icon: Building2,
            path: '/admin/organizations',
            submenu: [
                { name: 'Overview', path: '/admin/organizations' },
                { name: 'Add Organization', path: '/admin/organizations/new' }
            ]
        },
        {
            name: 'Event Management',
            icon: Calendar,
            path: '/admin/events',
            submenu: [
                { name: 'Overview', path: '/events' },
                { name: 'Create Event', path: '/events/new' }
            ]
        },
        {
            name: 'Global User Management',
            icon: Users,
            path: '/users',
            submenu: [
                { name: 'Overview', path: '/users' },
                { name: 'Create User', path: '/users/new' }
            ]
        },
        { name: 'Device Inventory', icon: Smartphone, path: '/admin/devices' },
        { name: 'Department Templates', icon: Layers, path: '/admin/department-templates' },
        { name: 'Services', icon: Layers, path: '/admin/services' }, // Added Services menu item
        { name: 'Device Models', icon: Component, path: '/admin/device-models' },
        { name: 'Global Reports', icon: FileText, path: '/admin/reports' },
        { name: 'Direct Profile', icon: User, path: '/profile' },
        { name: 'System Settings', icon: Settings, path: '/admin/settings' },
        { name: 'Access Control (RBAC)', icon: Shield, path: '/admin/rbac' },
        { name: 'Admin Settings', icon: Shield, path: '/admin/platform-settings' },
        { name: 'Audit Logs', icon: ScrollText, path: '/audit-logs' },
    ];

    const standardItems: MenuItem[] = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        {
            name: 'Event Management',
            icon: Calendar,
            path: '/events',
            requiredPermission: 'events:view', // The Module Access
            submenu: [
                { name: 'Overview', path: '/events' },
                { name: 'Create Event', path: '/events/new', requiredPermission: 'events:create' }
            ]
        },
        { name: 'My Devices', icon: Component, path: '/devices' },
        { name: 'Reports', icon: FileText, path: '/reports' },
        { name: 'Direct Profile', icon: User, path: '/profile' },
        { name: 'Organization', icon: Building2, path: '/organization', requiredRole: 'ORG_ADMIN' },
        {
            name: 'User Management',
            icon: Users,
            path: '/users',
            requiredRole: 'ORG_ADMIN',
            submenu: [
                { name: 'Overview', path: '/users' },
                { name: 'Create User', path: '/users/new' }
            ]
        },
        { name: 'Audit Logs', icon: ScrollText, path: '/audit-logs', requiredRole: 'ORG_ADMIN' },
    ];

    let filteredMenuItems: MenuItem[] = [];
    if (user?.is_super_admin) {
        filteredMenuItems = superAdminItems;
    } else {
        filteredMenuItems = standardItems
            .filter(item => {
                if (item.requiredPermission) {
                    // If permission is required, check if user has it
                    if (!user?.permissions?.includes(item.requiredPermission)) {
                        return false;
                    }
                }

                // HIDE Dashboard for Event Managers
                if (item.path === '/dashboard' && hasRole(user, ROLES.EVENT_MANAGER)) {
                    return false;
                }

                if (item.requiredRole) {
                    return hasRole(user, item.requiredRole);
                }
                return true;
            })
            // Filter Submenus
            .map(item => {
                if (item.submenu) {
                    return {
                        ...item,
                        submenu: item.submenu.filter(sub => {
                            if (sub.requiredPermission && !user?.permissions?.includes(sub.requiredPermission)) {
                                return false;
                            }
                            return true;
                        })
                    };
                }
                return item;
            });
    }

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // Show maintenance page if enabled (except for super admins)
    if (settings?.maintenance_mode && !user?.is_super_admin) {
        return <MaintenancePage />;
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground">
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`hidden lg:flex flex-col bg-primary text-primary-foreground border-r-0 transition-all duration-300 ease-in-out z-30 shadow-xl ${sidebarOpen ? 'w-64' : 'w-[70px]'
                    }`}
            >
                {/* User Info / Toggle Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-primary-foreground/10">
                    <div className={`flex items-center gap-3 transition-opacity duration-300 ${!sidebarOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'}`}>
                        <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-medium text-sm backdrop-blur-sm border border-primary-foreground/10 shadow-inner">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold truncate text-primary-foreground tracking-wide">
                                {user?.full_name || user?.email?.split('@')[0]}
                            </span>
                            <span
                                className="text-[11px] text-primary-foreground/90 truncate font-medium bg-black/20 px-2 py-0.5 rounded-full mt-0.5 w-fit max-w-full"
                                title={getRoleLabel(user?.roles?.[0]?.role || '', user?.is_super_admin)}
                            >
                                {getRoleLabel(user?.roles?.[0]?.role || '', user?.is_super_admin)}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className={`p-1.5 rounded-lg text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-all ${!sidebarOpen && 'mx-auto'}`}
                    >
                        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar-dark">
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        const isExpanded = expandedMenu === item.name;
                        const hasSubmenu = item.submenu && item.submenu.length > 0;
                        const isSubmenuActive = hasSubmenu && item.submenu?.some((sub: any) => pathname === sub.path);

                        return (
                            <div key={item.path}>
                                <button
                                    onClick={() => {
                                        if (hasSubmenu && sidebarOpen) {
                                            setExpandedMenu(isExpanded ? null : item.name);
                                        } else {
                                            router.push(item.path);
                                        }
                                    }}
                                    className={`w-full flex items-center px-3 py-3 rounded-xl text-sm transition-all duration-200 group relative ${isActive || isSubmenuActive
                                        ? 'bg-primary-foreground text-primary shadow-md font-semibold'
                                        : 'text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground'
                                        } ${sidebarOpen ? 'gap-3' : 'justify-center px-2 gap-0'}`}
                                    title={!sidebarOpen ? item.name : ''}
                                >
                                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive || isSubmenuActive ? 'text-primary' : 'text-primary-foreground/80 group-hover:text-primary-foreground'}`} />

                                    <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                                        {item.name}
                                    </span>

                                    {hasSubmenu && sidebarOpen && (
                                        <ChevronRight className={`w-4 h-4 ml-auto transition-transform duration-200 opacity-70 ${isExpanded ? 'rotate-90' : ''}`} />
                                    )}
                                </button>

                                {/* Submenu */}
                                {hasSubmenu && isExpanded && sidebarOpen && (
                                    <div className="ml-4 mt-1 space-y-1 p-2 bg-black/10 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                                        {item.submenu?.map((subItem: any) => {
                                            const isSubActive = pathname === subItem.path;
                                            return (
                                                <button
                                                    key={subItem.path}
                                                    onClick={() => router.push(subItem.path)}
                                                    className={`w-full flex items-center px-3 py-2 rounded-lg text-xs transition-all duration-200 ${isSubActive
                                                        ? 'bg-primary-foreground/20 text-primary-foreground font-semibold shadow-sm backdrop-blur-sm'
                                                        : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isSubActive ? 'bg-white' : 'bg-primary-foreground/40'}`}></span>
                                                    {subItem.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-primary-foreground/10">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-primary-foreground/80 hover:bg-red-500/20 hover:text-white rounded-xl text-sm transition-all duration-200 group ${!sidebarOpen && 'justify-center px-2'}`}
                        title={!sidebarOpen ? 'Logout' : ''}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0 transition-colors opacity-80 group-hover:opacity-100" />
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                            Logout
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Global Navbar */}
                <Navbar />

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 bg-background">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
                <div className="flex items-center justify-around px-2 py-2">
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className={`flex flex-col items-center gap-1 px-2 py-1 rounded min-w-[56px] transition-colors ${isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-[10px] font-medium truncate w-full text-center">{item.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
