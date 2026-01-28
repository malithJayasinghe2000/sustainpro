import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, Clock, Activity, Bell, Mail, Webhook, ArrowUp } from 'lucide-react';
import { servicesApi } from '@/lib/api';
import { RichSelect, RichSelectOption } from '@/components/ui/RichSelect';
import { Input } from '@/components/ui/Input';

// Types
export type RuleOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'in';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AggregationType = 'none' | 'avg' | 'sum' | 'min' | 'max' | 'count';
export type ActionType = 'alert' | 'email' | 'webhook' | 'escalate' | 'notification';

export interface AlertRuleRow {
    id: string;
    name: string;
    description: string;
    metric: string;
    operator: RuleOperator;
    threshold: string;
    severity: Severity;
    aggregation: AggregationType;
    timeWindow: number; // in minutes
    cooldownSeconds: number;
    actions: ActionType[];
}

export interface DeviceParameter {
    key: string;
    name: string;
    unit?: string;
    dataType?: 'number' | 'string' | 'boolean';
}

interface AlertRulesStepProps {
    serviceTemplateId: string;
    rules: AlertRuleRow[];
    onRulesChange: (rules: AlertRuleRow[]) => void;
}

const RULE_OPERATORS_OPTIONS: RichSelectOption[] = [
    { value: '>', label: 'Greater than (>)' },
    { value: '<', label: 'Less than (<)' },
    { value: '>=', label: 'Greater or equal (>=)' },
    { value: '<=', label: 'Less or equal (<=)' },
    { value: '==', label: 'Equals (==)' },
    { value: '!=', label: 'Not equals (!=)' },
    { value: 'contains', label: 'Contains' },
    { value: 'in', label: 'In List' },
];

const SEVERITY_OPTIONS: RichSelectOption[] = [
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
];

const ACTION_OPTIONS: { value: ActionType; label: string; icon: any }[] = [
    { value: 'alert', label: 'Create Alert', icon: AlertTriangle },
    { value: 'notification', label: 'In-App Notification', icon: Bell },
    { value: 'email', label: 'Email Notification', icon: Mail },
    { value: 'escalate', label: 'Escalate', icon: ArrowUp },
    { value: 'webhook', label: 'Webhook', icon: Webhook },
];

const COOLDOWN_OPTIONS: RichSelectOption[] = [
    { value: '60', label: '1 minute' },
    { value: '300', label: '5 minutes' },
    { value: '600', label: '10 minutes' },
    { value: '900', label: '15 minutes' },
    { value: '1800', label: '30 minutes' },
    { value: '3600', label: '1 hour' },
    { value: '7200', label: '2 hours' },
    { value: '21600', label: '6 hours' },
    { value: '86400', label: '24 hours' },
];

const AGGREGATION_OPTIONS: RichSelectOption[] = [
    { value: 'none', label: 'None (Instant)' },
    { value: 'avg', label: 'Average' },
    { value: 'sum', label: 'Sum' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'count', label: 'Count' },
];

const TIME_WINDOW_OPTIONS: RichSelectOption[] = [
    { value: '0', label: 'Instant' },
    { value: '1', label: '1 minute' },
    { value: '5', label: '5 minutes' },
    { value: '10', label: '10 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
];

// Helper to generate unique ID
const generateId = () => `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function AlertRulesStep({ serviceTemplateId, rules, onRulesChange }: AlertRulesStepProps) {
    const [parameters, setParameters] = useState<DeviceParameter[]>([]);
    const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    // Fetch device parameters from service template's device models
    useEffect(() => {
        const fetchParameters = async () => {
            if (!serviceTemplateId) return;

            setIsLoading(true);
            try {
                const service = await servicesApi.getById(serviceTemplateId);

                // Collect parameters from device models
                const allParameters: DeviceParameter[] = [];

                // Add service parameters
                if (service?.service_parameters && Array.isArray(service.service_parameters)) {
                    service.service_parameters.forEach((param: any) => {
                        allParameters.push({
                            key: param.key || param.sourceParam,
                            name: param.name || param.key,
                            unit: param.unit,
                            dataType: param.dataType || 'number',
                        });
                    });
                }

                // Add device model parameters
                if (service?.device_models && Array.isArray(service.device_models)) {
                    service.device_models.forEach((dm: any) => {
                        const deviceModel = dm.device_model;
                        if (deviceModel?.parameters && Array.isArray(deviceModel.parameters)) {
                            deviceModel.parameters.forEach((param: any) => {
                                // Avoid duplicates
                                if (!allParameters.some(p => p.key === param.key)) {
                                    allParameters.push({
                                        key: param.key,
                                        name: param.name || param.key,
                                        unit: param.unit,
                                        dataType: param.dataType || 'number',
                                    });
                                }
                            });
                        }
                    });
                }

                // Add common IoT parameters if no parameters found
                if (allParameters.length === 0) {
                    allParameters.push(
                        { key: 'temperature', name: 'Temperature', unit: '°C', dataType: 'number' },
                        { key: 'humidity', name: 'Humidity', unit: '%', dataType: 'number' },
                        { key: 'pressure', name: 'Pressure', unit: 'hPa', dataType: 'number' },
                        { key: 'battery', name: 'Battery Level', unit: '%', dataType: 'number' },
                        { key: 'status', name: 'Status', dataType: 'string' },
                    );
                }

                setParameters(allParameters);
            } catch (error) {
                console.error('Error fetching parameters:', error);
                // Add default parameters on error
                setParameters([
                    { key: 'temperature', name: 'Temperature', unit: '°C', dataType: 'number' },
                    { key: 'humidity', name: 'Humidity', unit: '%', dataType: 'number' },
                    { key: 'battery', name: 'Battery Level', unit: '%', dataType: 'number' },
                ]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchParameters();
    }, [serviceTemplateId]);

    const addRule = () => {
        const defaultParam = parameters[0]?.key || 'temperature';
        const ruleId = generateId();
        const newRule: AlertRuleRow = {
            id: ruleId,
            name: `${parameters.find(p => p.key === defaultParam)?.name || 'Parameter'} Alert`,
            description: '',
            metric: defaultParam,
            operator: '>',
            threshold: '',
            severity: 'MEDIUM',
            aggregation: 'none',
            timeWindow: 0,
            cooldownSeconds: 300,
            actions: ['alert'],
        };
        onRulesChange([...rules, newRule]);
        // Auto-expand ONLY the new rule, collapsing others
        setExpandedRules(new Set([ruleId]));
    };

    const updateRule = (id: string, field: keyof AlertRuleRow, value: any) => {
        const updatedRules = rules.map(rule => {
            if (rule.id === id) {
                const updated = { ...rule, [field]: value };
                // Auto-update name when metric changes
                if (field === 'metric') {
                    const param = parameters.find(p => p.key === value);
                    updated.name = `${param?.name || value} Alert`;
                }
                return updated;
            }
            return rule;
        });
        onRulesChange(updatedRules);
    };

    const removeRule = (id: string) => {
        onRulesChange(rules.filter(rule => rule.id !== id));
        setExpandedRules(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const toggleRuleExpanded = (id: string) => {
        setExpandedRules(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const parameterOptions = parameters.map(p => ({
        value: p.key,
        label: p.name + (p.unit ? ` (${p.unit})` : ''),
        icon: Activity
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Alert Rules Configuration
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure alert rules to monitor device parameters and trigger notifications.
                </p>
            </div>

            {/* Rules List */}
            {rules.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-12 text-center bg-muted/5">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No alert rules configured</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        Create rules to automatically monitor device data and trigger alerts when thresholds are breached.
                    </p>
                    <button
                        onClick={addRule}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add First Rule
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {rules.map((rule, index) => {
                        const isExpanded = expandedRules.has(rule.id);

                        return (
                            <div key={rule.id} className="border border-border rounded-xl bg-card shadow-sm transition-all hover:shadow-md">
                                {/* Rule Header / Summary Row */}
                                <div className="p-4 flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                                        {index + 1}
                                    </div>

                                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Rule Name</p>
                                            <div className="font-medium text-sm truncate">{rule.name}</div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Condition</p>
                                            <div className="text-sm flex items-center gap-1.5 truncate">
                                                <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{rule.metric}</span>
                                                <span className="font-mono font-bold text-primary">{rule.operator}</span>
                                                <span className="font-mono">{rule.threshold || '...'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-0.5">Severity</p>
                                            <div className="flex">
                                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${rule.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    rule.severity === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                        rule.severity === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                            'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                    {rule.severity}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => toggleRuleExpanded(rule.id)}
                                            className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-muted text-foreground' : 'hover:bg-muted text-muted-foreground'
                                                }`}
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => removeRule(rule.id)}
                                            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                                            title="Remove rule"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Configuration */}
                                {isExpanded && (
                                    <div className="px-6 pb-6 pt-4 border-t border-border/50 bg-muted/20">
                                        <div className="space-y-6">
                                            {/* Primary Configuration - Natural Language Style */}
                                            <div className="space-y-4">
                                                <Input
                                                    label="Rule Name"
                                                    value={rule.name}
                                                    onChange={(e) => updateRule(rule.id, 'name', e.target.value)}
                                                    placeholder="e.g. High Temperature Alert"
                                                    className="font-medium"
                                                />

                                                <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                                                    <h4 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider text-xs">Condition Logic</h4>

                                                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                                                        <div className="w-full md:w-1/3">
                                                            <RichSelect
                                                                value={rule.metric}
                                                                onChange={(val) => updateRule(rule.id, 'metric', val)}
                                                                options={parameterOptions}
                                                                placeholder="Parameter"
                                                                icon={Activity}
                                                            />
                                                        </div>
                                                        <div className="w-full md:w-1/4">
                                                            <RichSelect
                                                                value={rule.operator}
                                                                onChange={(val) => updateRule(rule.id, 'operator', val)}
                                                                options={RULE_OPERATORS_OPTIONS}
                                                                placeholder="Operator"
                                                            />
                                                        </div>
                                                        <div className="w-full md:flex-1">
                                                            <Input
                                                                value={rule.threshold}
                                                                onChange={(e) => updateRule(rule.id, 'threshold', e.target.value)}
                                                                placeholder="Value"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <RichSelect
                                                        label="Severity Level"
                                                        value={rule.severity}
                                                        onChange={(val) => updateRule(rule.id, 'severity', val)}
                                                        options={SEVERITY_OPTIONS}
                                                        icon={AlertTriangle}
                                                    />

                                                    <div className="space-y-1.5">
                                                        <label className="text-sm font-medium text-foreground/80 leading-none">Notifications & Actions</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {ACTION_OPTIONS.map((action) => {
                                                                const isSelected = rule.actions.includes(action.value);
                                                                return (
                                                                    <button
                                                                        key={action.value}
                                                                        onClick={() => {
                                                                            const newActions = isSelected
                                                                                ? rule.actions.filter(a => a !== action.value)
                                                                                : [...rule.actions, action.value];
                                                                            updateRule(rule.id, 'actions', newActions);
                                                                        }}
                                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${isSelected
                                                                            ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20'
                                                                            : 'bg-background border border-border text-muted-foreground hover:border-primary/50 hover:bg-muted'
                                                                            }`}
                                                                    >
                                                                        <action.icon className="w-3.5 h-3.5" />
                                                                        {action.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Advanced Settings Toggle */}
                                            <details className="group" open>
                                                <summary className="flex items-center gap-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-primary transition-colors select-none py-2">
                                                    <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                                                    Advanced Settings (Aggregation, Time Window, Cooldown)
                                                </summary>

                                                <div className="pt-4 pl-4 border-l-2 border-border/50 ml-2 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <RichSelect
                                                            label="Aggregation"
                                                            value={rule.aggregation}
                                                            onChange={(val) => updateRule(rule.id, 'aggregation', val)}
                                                            options={AGGREGATION_OPTIONS}
                                                            menuPlacement="top"
                                                        />
                                                        <RichSelect
                                                            label="Time Window"
                                                            value={rule.timeWindow.toString()}
                                                            onChange={(val) => updateRule(rule.id, 'timeWindow', parseInt(val))}
                                                            options={TIME_WINDOW_OPTIONS}
                                                            menuPlacement="top"
                                                            error={rule.aggregation !== 'none' && rule.timeWindow === 0 ? "Required" : undefined}
                                                        />
                                                        <RichSelect
                                                            label="Cooldown Period"
                                                            value={rule.cooldownSeconds.toString()}
                                                            onChange={(val) => updateRule(rule.id, 'cooldownSeconds', parseInt(val))}
                                                            options={COOLDOWN_OPTIONS}
                                                            menuPlacement="top"
                                                            icon={Clock}
                                                        />
                                                    </div>

                                                    <Input
                                                        label="Description (Optional)"
                                                        value={rule.description}
                                                        onChange={(e) => updateRule(rule.id, 'description', e.target.value)}
                                                        placeholder="Detailed reason for this alert rule..."
                                                    />
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add Button */}
                    <button
                        onClick={addRule}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 top-0 text-sm bg-background border border-dashed border-border hover:bg-muted/50 hover:border-primary/50 hover:text-primary rounded-xl transition-all group"
                    >
                        <div className="w-8 h-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span className="font-medium">Add Another Rule</span>
                    </button>
                </div>
            )}
        </div>
    );
}
