'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { LayoutGrid, List, Smartphone, Search, Filter, Signal, Battery, Calendar } from 'lucide-react';
import { devicesApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function GlobalDevicesPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [devices, setDevices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        try {
            setIsLoading(true);
            const data = await devicesApi.getAll(); // Assuming global fetch for Super Admin
            setDevices(data);
        } catch (error) {
            toast.error('Failed to load devices');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredDevices = devices.filter(device =>
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.org_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="page-padding max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Smartphone className="w-6 h-6 text-primary" />
                            Global Device Inventory
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Monitor all deployed devices across the platform
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-card border border-border rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search devices by ID, Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-xl border border-border" />)}
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredDevices.map((device) => (
                                    <div key={device.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all hover:shadow-lg group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <Smartphone className="w-6 h-6" />
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-medium ${device.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                                                {device.status || 'Unknown'}
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-foreground truncate">{device.name}</h3>
                                        <p className="text-xs text-muted-foreground font-mono mt-1">{device.device_id}</p>

                                        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Signal className="w-3 h-3" /> RSSI
                                                </span>
                                                <span className="font-medium">-</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Battery className="w-3 h-3" /> Battery
                                                </span>
                                                <span className="font-medium">-</span>
                                            </div>
                                        </div>

                                        <button className="mt-4 w-full py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium rounded-lg transition-colors">
                                            View Details
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-secondary/50 border-b border-border">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Device</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Owner (Org)</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Last Active</th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredDevices.map((device) => (
                                            <tr key={device.id} className="hover:bg-secondary/20 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                            <Smartphone className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-foreground">{device.name}</div>
                                                            <div className="text-xs text-muted-foreground font-mono">{device.device_id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                                    {device.org_name || 'Unassigned'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${device.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                                        }`}>
                                                        {device.status || 'Offline'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                                    {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button className="text-primary hover:text-primary/80 text-xs font-medium">Manage</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
