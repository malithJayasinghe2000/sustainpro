'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { simulationApi, deviceModelsApi } from '@/lib/api';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';
import {
    Activity,
    Play,
    Square,
    Trash2,
    Plus,
    Save,
    CheckCircle2,
    AlertCircle,
    Server,
    Cpu,
    Zap,
    Copy,
    Component
} from 'lucide-react';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface DeviceModel {
    id: string;
    name: string;
    description: string;
    parameters: ParameterDefinition[];
}

interface ParameterDefinition {
    key: string;
    name: string;
    unit: string;
    dataType: 'float' | 'integer' | 'string' | 'boolean';
    category?: 'main' | 'common';
    min?: number;
    max?: number;
    icon?: string;
}

interface DeviceConfig {
    hardware_id: string;
    device_code: string;
    organization_id: string;
    event_id: string;
    department_id: string;
    service_id: string;
    host: string;
    device_model_id?: string; // New field for device model selection
}

interface TelemetryState {
    [key: string]: any; // Dynamic parameters based on device model
}

interface SimulatedDevice {
    id: string; // Internal ID for the simulator list
    config: DeviceConfig;
    telemetry: TelemetryState;
    isRunning: boolean;
    isRegistered: boolean;
    deviceModel?: DeviceModel; // Store the device model for easy access
    lastLog?: {
        message: string;
        type: 'success' | 'error' | 'info';
        timestamp: string;
    };
}

// ----------------------------------------------------------------------
// Constants & Defaults
// ----------------------------------------------------------------------

const DEFAULT_CONFIG: DeviceConfig = {
    hardware_id: 'SIM_DEVICE_',
    device_code: 'SIM-',
    organization_id: '5ceaf041-d66d-4805-8d70-c7bf5cfade94',
    event_id: 'deb075e0-4114-4bc6-8059-ea9a24b7aae0',
    department_id: 'f06a81ce-dc1b-4ccf-a603-f4384fb23d94',
    service_id: '',
    host: 'a3a0yoo2557wbr-ats.iot.me-central-1.amazonaws.com',
    device_model_id: ''
};

const DEFAULT_TELEMETRY: TelemetryState = {};

export default function SimulatorPage() {
    // ----------------------------------------------------------------------
    // State
    // ----------------------------------------------------------------------

    // Available device models
    const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
    const [selectedDeviceModel, setSelectedDeviceModel] = useState<DeviceModel | null>(null);

    // List of simulated devices
    const [devices, setDevices] = useState<SimulatedDevice[]>([]);

    // Form state for creating a new device
    const [newDeviceConfig, setNewDeviceConfig] = useState<DeviceConfig>(DEFAULT_CONFIG);
    const [createCount, setCreateCount] = useState(1);

    // Global Loop Ref
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // ----------------------------------------------------------------------
    // Data Loading
    // ----------------------------------------------------------------------

    useEffect(() => {
        fetchDeviceModels();
    }, []);

    const fetchDeviceModels = async () => {
        try {
            const models = await deviceModelsApi.getAll();
            setDeviceModels(models);
        } catch (error) {
            console.error('Failed to fetch device models:', error);
            toast.error('Failed to load device models');
        }
    };

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const getDefaultTelemetryForModel = (deviceModel: DeviceModel): TelemetryState => {
        const telemetry: TelemetryState = {};
        
        if (deviceModel?.parameters) {
            deviceModel.parameters.forEach(param => {
                switch (param.dataType) {
                    case 'float':
                    case 'integer':
                        telemetry[param.key] = param.min ?? 0;
                        break;
                    case 'boolean':
                        telemetry[param.key] = false;
                        break;
                    case 'string':
                    default:
                        telemetry[param.key] = '';
                        break;
                }
            });
        }
        
        return telemetry;
    };

    const handleDeviceModelSelect = (modelId: string) => {
        const model = deviceModels.find(m => m.id === modelId);
        setSelectedDeviceModel(model || null);
        setNewDeviceConfig({
            ...newDeviceConfig,
            device_model_id: modelId,
            hardware_id: model ? `${model.id}_SIM_` : 'SIM_DEVICE_',
            device_code: model ? `${model.id}-SIM-` : 'SIM-'
        });
    };

    const renderParameterInput = (device: SimulatedDevice, param: ParameterDefinition) => {
        const value = device.telemetry[param.key];
        
        switch (param.dataType) {
            case 'boolean':
                return (
                    <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">
                            {param.name} {param.unit && `(${param.unit})`}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={Boolean(value)}
                                onChange={(e) => updateDeviceTelemetryStart(device.id, param.key, e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-xs">{value ? 'True' : 'False'}</span>
                        </div>
                    </div>
                );
            
            case 'string':
                return (
                    <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">
                            {param.name} {param.unit && `(${param.unit})`}
                        </label>
                        <input
                            type="text"
                            className="w-full bg-background border border-border rounded px-2 py-1 font-mono text-sm"
                            value={String(value)}
                            onChange={(e) => updateDeviceTelemetryStart(device.id, param.key, e.target.value)}
                        />
                    </div>
                );
            
            case 'integer':
                return (
                    <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">
                            {param.name} {param.unit && `(${param.unit})`}
                        </label>
                        <input
                            type="number"
                            step="1"
                            min={param.min}
                            max={param.max}
                            className="w-full bg-background border border-border rounded px-2 py-1 font-mono text-sm"
                            value={Number(value)}
                            onChange={(e) => updateDeviceTelemetryStart(device.id, param.key, parseInt(e.target.value) || 0)}
                        />
                    </div>
                );
            
            case 'float':
            default:
                return (
                    <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">
                            {param.name} {param.unit && `(${param.unit})`}
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min={param.min}
                            max={param.max}
                            className="w-full bg-background border border-border rounded px-2 py-1 font-mono text-sm"
                            value={Number(value)}
                            onChange={(e) => updateDeviceTelemetryStart(device.id, param.key, parseFloat(e.target.value) || 0)}
                        />
                    </div>
                );
        }
    };

    const constructTopic = (config: DeviceConfig) => {
        return `sustainpro/${config.organization_id}/${config.event_id}/${config.department_id}`;
    };

    // ----------------------------------------------------------------------
    // Actions - Device Management
    // ----------------------------------------------------------------------

    const handleCreateDevice = () => {
        if (!selectedDeviceModel) {
            toast.error('Please select a device model first');
            return;
        }

        const device: SimulatedDevice = {
            id: generateId(),
            config: { ...newDeviceConfig },
            telemetry: getDefaultTelemetryForModel(selectedDeviceModel),
            deviceModel: selectedDeviceModel,
            isRunning: false,
            isRegistered: false
        };

        setDevices(prev => [...prev, device]);
        toast.success(`Created virtual device ${device.config.device_code}`);
        
        // Reset form
        setSelectedDeviceModel(null);
        setNewDeviceConfig(DEFAULT_CONFIG);
    };

    const deleteDevice = (id: string) => {
        setDevices(prev => prev.filter(d => d.id !== id));
    };

    const duplicateDevice = (device: SimulatedDevice) => {
        const uniqueSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const newDevice: SimulatedDevice = {
            ...device,
            id: generateId(),
            config: {
                ...device.config,
                hardware_id: `${device.config.hardware_id}_COPY_${uniqueSuffix}`,
                device_code: `${device.config.device_code}-COPY`
            },
            telemetry: { ...device.telemetry },
            deviceModel: device.deviceModel,
            isRunning: false,
            isRegistered: false,
            lastLog: undefined
        };
        setDevices(prev => [...prev, newDevice]);
        toast.success('Device duplicated');
    };

    const updateDeviceConfig = (id: string, field: keyof DeviceConfig, value: string) => {
        setDevices(prev => prev.map(d => {
            if (d.id === id) {
                return { ...d, config: { ...d.config, [field]: value } };
            }
            return d;
        }));
    };

    const updateDeviceTelemetryStart = (id: string, field: string, value: any) => {
        setDevices(prev => prev.map(d => {
            if (d.id === id) {
                return { ...d, telemetry: { ...d.telemetry, [field]: value } };
            }
            return d;
        }));
    };

    const toggleDeviceRunning = (id: string) => {
        setDevices(prev => prev.map(d => {
            if (d.id === id) return { ...d, isRunning: !d.isRunning };
            return d;
        }));
    };

    const startAll = () => setDevices(prev => prev.map(d => ({ ...d, isRunning: true })));
    const stopAll = () => setDevices(prev => prev.map(d => ({ ...d, isRunning: false })));

    // ----------------------------------------------------------------------
    // Actions - Backend Interactions
    // ----------------------------------------------------------------------

    const registerDevice = async (device: SimulatedDevice) => {
        try {
            await apiClient.post('/devices/register', {
                hardware_id: device.config.hardware_id,
                device_code: device.config.device_code,
                location: 'Virtual Simulation',
                organization_id: device.config.organization_id,
                department_id: device.config.department_id,
                event_id: device.config.event_id,
                service_id: device.config.service_id || undefined,
                host: device.config.host
            });

            setDevices(prev => prev.map(d => {
                if (d.id === device.id) {
                    return {
                        ...d,
                        isRegistered: true,
                        lastLog: {
                            message: 'Device Registered Successfully',
                            type: 'success',
                            timestamp: new Date().toLocaleTimeString()
                        }
                    };
                }
                return d;
            }));

            toast.success(`Registered ${device.config.device_code}`);
        } catch (error: any) {
            console.error('Registration failed', error);
            const msg = error.response?.data?.error || 'Registration Failed';
            setDevices(prev => prev.map(d => {
                if (d.id === device.id) {
                    return {
                        ...d,
                        lastLog: {
                            message: `Reg Failed: ${msg}`,
                            type: 'error',
                            timestamp: new Date().toLocaleTimeString()
                        }
                    };
                }
                return d;
            }));
            toast.error(msg);
        }
    };

    const sendTelemetryForDevice = async (device: SimulatedDevice) => {
        if (!device.deviceModel) {
            return;
        }

        // Create a copy of current telemetry
        const newTelemetry = { ...device.telemetry };

        // Apply simulation logic based on parameter types
        device.deviceModel.parameters.forEach(param => {
            const currentValue = newTelemetry[param.key];
            
            if (param.dataType === 'float' || param.dataType === 'integer') {
                // Add some realistic variance to numeric values
                const variance = (Math.random() - 0.5) * 0.2; // +/- 10%
                let newValue = Number(currentValue) + variance;
                
                // Apply min/max constraints if defined
                if (param.min !== undefined) newValue = Math.max(param.min, newValue);
                if (param.max !== undefined) newValue = Math.min(param.max, newValue);
                
                newTelemetry[param.key] = param.dataType === 'integer' ? 
                    Math.round(newValue) : Number(newValue.toFixed(2));
            }
            // Boolean and string parameters remain unchanged during simulation
        });

        const topic = constructTopic(device.config);
        const payload = {
            hardware_id: device.config.hardware_id,
            device_code: device.config.device_code,
            organization_id: device.config.organization_id,
            timestamp: Math.floor(Date.now() / 1000),
            data: newTelemetry
        };

        try {
            await simulationApi.injectTelemetry(topic, payload);

            // Update state
            setDevices(prev => prev.map(d => {
                if (d.id === device.id) {
                    return {
                        ...d,
                        telemetry: newTelemetry,
                        lastLog: {
                            message: `Data sent successfully`,
                            type: 'info',
                            timestamp: new Date().toLocaleTimeString()
                        }
                    };
                }
                return d;
            }));
        } catch (error: any) {
            setDevices(prev => prev.map(d => {
                if (d.id === device.id) {
                    return {
                        ...d,
                        isRunning: false,
                        lastLog: {
                            message: `Send Failed`,
                            type: 'error',
                            timestamp: new Date().toLocaleTimeString()
                        }
                    };
                }
                return d;
            }));
        }
    };

    // ----------------------------------------------------------------------
    // Simulation Loop
    // ----------------------------------------------------------------------

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setDevices(currentDevices => {
                // Return a new array reference only if changes occur? 
                // Currently always mapping to trigger re-renders for log updates

                // We can't do async inside map effectively for state update 
                // But we called sendTelemetryForDevice which IS async and sets state independently.
                // Actually, calling async state setters inside loop is tricky.
                // Better pattern: The loop fires the async function. The async function updates state.
                currentDevices.forEach(device => {
                    if (device.isRunning) {
                        sendTelemetryForDevice(device);
                    }
                });
                return currentDevices; // Return same ref, let async request handlers update state
            });
        }, 5000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // ----------------------------------------------------------------------
    // Render
    // ----------------------------------------------------------------------

    return (
        <DashboardLayout>
            <div className="p-8 max-w-[1800px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Zap className="w-7 h-7 text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Simulator Studio</h1>
                            <p className="text-sm text-muted-foreground">Advanced Multi-Device Simulation Environment</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={startAll}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-2 transition-colors font-medium"
                        >
                            <Play className="w-4 h-4" /> Start All
                        </button>
                        <button
                            onClick={stopAll}
                            className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white rounded-lg flex items-center gap-2 transition-colors font-medium"
                        >
                            <Square className="w-4 h-4" /> Stop All
                        </button>
                    </div>
                </div>

                {/* Creator Panel */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" /> Create New Device
                    </h3>

                    {/* Device Model Selection */}
                    <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                        <label className="text-sm font-medium text-muted-foreground block mb-2">
                            Select Device Model *
                        </label>
                        <select
                            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                            value={newDeviceConfig.device_model_id}
                            onChange={e => handleDeviceModelSelect(e.target.value)}
                        >
                            <option value="">Choose a device model...</option>
                            {deviceModels.map(model => (
                                <option key={model.id} value={model.id}>
                                    {model.name} - {model.description}
                                </option>
                            ))}
                        </select>
                        {selectedDeviceModel && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                <strong>Parameters:</strong> {selectedDeviceModel.parameters.map(p => p.name).join(', ')}
                            </div>
                        )}
                    </div>

                    {/* Configuration Fields */}
                    {selectedDeviceModel && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Hardware ID</label>
                                <input
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                                    value={newDeviceConfig.hardware_id}
                                    onChange={e => setNewDeviceConfig({ ...newDeviceConfig, hardware_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Device Code</label>
                                <input
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                                    value={newDeviceConfig.device_code}
                                    onChange={e => setNewDeviceConfig({ ...newDeviceConfig, device_code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Organization ID</label>
                                <input
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                    value={newDeviceConfig.organization_id}
                                    onChange={e => setNewDeviceConfig({ ...newDeviceConfig, organization_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Event ID</label>
                                <input
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                    value={newDeviceConfig.event_id}
                                    onChange={e => setNewDeviceConfig({ ...newDeviceConfig, event_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Department ID</label>
                                <input
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                    value={newDeviceConfig.department_id}
                                    onChange={e => setNewDeviceConfig({ ...newDeviceConfig, department_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Service ID (Optional)</label>
                                <input
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                    value={newDeviceConfig.service_id}
                                    onChange={e => setNewDeviceConfig({ ...newDeviceConfig, service_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Host</label>
                                <input
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                                    value={newDeviceConfig.host}
                                    onChange={e => setNewDeviceConfig({ ...newDeviceConfig, host: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleCreateDevice}
                        disabled={!selectedDeviceModel}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {selectedDeviceModel ? `Add ${selectedDeviceModel.name} Device` : 'Select a device model first'}
                    </button>
                </div>

                {/* Device Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {devices.map(device => (
                        <div
                            key={device.id}
                            className={`bg-card border-2 rounded-xl p-5 transition-all w-full flex flex-col gap-4 relative overflow-hidden ${device.isRunning ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
                                }`}
                        >
                            {/* Running Indicator */}
                            {device.isRunning && (
                                <div className="absolute top-0 right-0 p-2 z-10">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                </div>
                            )}

                            {/* Config Inputs */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 mr-2">
                                        <label className="text-[10px] text-muted-foreground uppercase font-bold">Device Code</label>
                                        <input
                                            className="w-full bg-transparent border-b border-border focus:border-primary outline-none font-bold text-lg"
                                            value={device.config.device_code}
                                            onChange={(e) => updateDeviceConfig(device.id, 'device_code', e.target.value)}
                                        />
                                        {device.deviceModel && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Model: {device.deviceModel.name}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => duplicateDevice(device)}
                                            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                            title="Duplicate Device"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteDevice(device.id)}
                                            className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                            title="Delete Device"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Hardware ID</label>
                                    <input
                                        className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-xs font-mono text-muted-foreground"
                                        value={device.config.hardware_id}
                                        onChange={(e) => updateDeviceConfig(device.id, 'hardware_id', e.target.value)}
                                    />
                                </div>

                                {/* Collapsible Details? Or just show all tiny */}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <label className="text-[10px] text-muted-foreground uppercase">Organization ID</label>
                                        <input
                                            className="w-full bg-muted/30 rounded px-1 py-0.5 text-[10px] font-mono border-none outline-none"
                                            value={device.config.organization_id}
                                            onChange={(e) => updateDeviceConfig(device.id, 'organization_id', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground uppercase">Event ID</label>
                                        <input
                                            className="w-full bg-muted/30 rounded px-1 py-0.5 text-[10px] font-mono border-none outline-none"
                                            value={device.config.event_id}
                                            onChange={(e) => updateDeviceConfig(device.id, 'event_id', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground uppercase">Dept ID</label>
                                        <input
                                            className="w-full bg-muted/30 rounded px-1 py-0.5 text-[10px] font-mono border-none outline-none"
                                            value={device.config.department_id}
                                            onChange={(e) => updateDeviceConfig(device.id, 'department_id', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground uppercase">Service ID</label>
                                        <input
                                            className="w-full bg-muted/30 rounded px-1 py-0.5 text-[10px] font-mono border-none outline-none"
                                            value={device.config.service_id}
                                            onChange={(e) => updateDeviceConfig(device.id, 'service_id', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="my-1 border-t border-border/50"></div>

                            {/* Telemetry Controls - Dynamic Parameters */}
                            {device.deviceModel && device.deviceModel.parameters && (
                                <div className="bg-muted/20 p-3 rounded-lg text-sm space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Component className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {device.deviceModel.name} Parameters
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        {device.deviceModel.parameters.map(param => (
                                            <div key={param.key}>
                                                {renderParameterInput(device, param)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!device.deviceModel && (
                                <div className="bg-muted/20 p-3 rounded-lg text-sm text-center">
                                    <span className="text-muted-foreground">No device model configured</span>
                                </div>
                            )}

                            {/* Logs */}
                            <div className="text-xs font-mono h-5 truncate text-muted-foreground">
                                {device.lastLog && (
                                    <span className={
                                        device.lastLog.type === 'error' ? 'text-destructive' :
                                            device.lastLog.type === 'success' ? 'text-emerald-600' : 'text-blue-500'
                                    }>
                                        [{device.lastLog.timestamp}] {device.lastLog.message}
                                    </span>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <button
                                    onClick={() => registerDevice(device)}
                                    disabled={device.isRegistered}
                                    className={`py-2 rounded-lg text-sm font-medium transition-colors border ${device.isRegistered
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                            : 'bg-background hover:bg-muted border-primary/20 text-primary'
                                        }`}
                                >
                                    {device.isRegistered ? 'Registered' : 'Provision Device'}
                                </button>
                                <button
                                    onClick={() => toggleDeviceRunning(device.id)}
                                    className={`py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${device.isRunning
                                            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20'
                                            : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20'
                                        }`}
                                >
                                    {device.isRunning ? (
                                        <><Square className="w-4 h-4" /> Stop</>
                                    ) : (
                                        <><Play className="w-4 h-4" /> Start</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}

                    {devices.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 border-2 border-dashed border-border rounded-xl">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No simulated devices. Create one to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
