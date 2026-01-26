import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { servicesApi } from '@/lib/api';

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

const RULE_OPERATORS: { value: RuleOperator; label: string }[] = [
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: '==', label: '==' },
    { value: '!=', label: '!=' },
    { value: 'contains', label: 'contains' },
    { value: 'in', label: 'in' },
];

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string; bgColor: string; borderColor: string }[] = [
    { value: 'CRITICAL', label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    { value: 'HIGH', label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { value: 'LOW', label: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
];

const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
    { value: 'alert', label: 'System Alert' },
    { value: 'notification', label: 'Push Notification' },
    { value: 'email', label: 'Email' },
    { value: 'escalate', label: 'Escalate' },
    { value: 'webhook', label: 'Webhook' },
];

const COOLDOWN_OPTIONS = [
    { value: 60, label: '1 min' },
    { value: 300, label: '5 min' },
    { value: 600, label: '10 min' },
    { value: 900, label: '15 min' },
    { value: 1800, label: '30 min' },
    { value: 3600, label: '1 hour' },
    { value: 7200, label: '2 hours' },
    { value: 21600, label: '6 hours' },
    { value: 86400, label: '24 hours' },
];

const AGGREGATION_OPTIONS: { value: AggregationType; label: string }[] = [
    { value: 'none', label: 'None (Instant)' },
    { value: 'avg', label: 'Average' },
    { value: 'sum', label: 'Sum' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'count', label: 'Count' },
];

const TIME_WINDOW_OPTIONS = [
    { value: 0, label: 'Instant' },
    { value: 1, label: '1 min' },
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
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
        // Auto-expand new rule to show all fields
        setExpandedRules(prev => new Set([...prev, ruleId]));
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

    const getSeverityStyle = (severity: Severity) => {
        return SEVERITY_OPTIONS.find(s => s.value === severity) || SEVERITY_OPTIONS[2];
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
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Alert Rules Configuration
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure alert rules to monitor device parameters and trigger notifications.
                </p>
            </div>

            {/* Rules List */}
            {rules.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                        No alert rules configured. Click the button below to add your first rule.
                    </p>
                    <button
                        onClick={addRule}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4" />
                        Add Alert Rule
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {rules.map((rule, index) => {
                        const severityStyle = getSeverityStyle(rule.severity);
                        const isExpanded = expandedRules.has(rule.id);

                        return (
                            <div key={rule.id} className="border border-border rounded-lg bg-card overflow-hidden">
                                {/* Row 1: Main fields */}
                                <div className="p-4 grid grid-cols-12 gap-3 items-start">
                                    {/* Rule # Badge */}
                                    <div className="col-span-1 flex items-center">
                                        <span className="w-7 h-7 flex items-center justify-center bg-muted rounded-full text-xs font-medium">
                                            {index + 1}
                                        </span>
                                    </div>

                                    {/* Rule Name */}
                                    <div className="col-span-3">
                                        <label className="text-xs text-muted-foreground block mb-1">Rule Name</label>
                                        <input
                                            type="text"
                                            value={rule.name}
                                            onChange={(e) => updateRule(rule.id, 'name', e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                            placeholder="Rule name"
                                        />
                                    </div>

                                    {/* Parameter */}
                                    <div className="col-span-2">
                                        <label className="text-xs text-muted-foreground block mb-1">Parameter</label>
                                        <select
                                            value={rule.metric}
                                            onChange={(e) => updateRule(rule.id, 'metric', e.target.value)}
                                            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                        >
                                            {parameters.map((param) => (
                                                <option key={param.key} value={param.key}>
                                                    {param.name} {param.unit && `(${param.unit})`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Condition (Operator + Threshold) */}
                                    <div className="col-span-2">
                                        <label className="text-xs text-muted-foreground block mb-1">Condition</label>
                                        <div className="flex gap-1">
                                            <select
                                                value={rule.operator}
                                                onChange={(e) => updateRule(rule.id, 'operator', e.target.value as RuleOperator)}
                                                className="w-16 px-1 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary font-mono"
                                            >
                                                {RULE_OPERATORS.map((op) => (
                                                    <option key={op.value} value={op.value}>
                                                        {op.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={rule.threshold}
                                                onChange={(e) => updateRule(rule.id, 'threshold', e.target.value)}
                                                placeholder="Value"
                                                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Severity */}
                                    <div className="col-span-2">
                                        <label className="text-xs text-muted-foreground block mb-1">Severity</label>
                                        <select
                                            value={rule.severity}
                                            onChange={(e) => updateRule(rule.id, 'severity', e.target.value as Severity)}
                                            className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-primary/20 ${severityStyle.borderColor} ${severityStyle.bgColor} ${severityStyle.color} font-medium`}
                                        >
                                            {SEVERITY_OPTIONS.map((sev) => (
                                                <option key={sev.value} value={sev.value}>
                                                    {sev.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2 flex items-end gap-2">
                                        <button
                                            onClick={() => toggleRuleExpanded(rule.id)}
                                            className="p-1.5 hover:bg-muted text-muted-foreground rounded transition-colors"
                                            title={isExpanded ? "Hide advanced options" : "Show advanced options"}
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => removeRule(rule.id)}
                                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                                            title="Remove rule"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Advanced fields (expandable) */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/20">
                                        <div className="grid grid-cols-12 gap-3 pt-3">
                                            {/* Spacer for alignment */}
                                            <div className="col-span-1"></div>

                                            {/* Description */}
                                            <div className="col-span-5">
                                                <label className="text-xs text-muted-foreground block mb-1">Description</label>
                                                <input
                                                    type="text"
                                                    value={rule.description || ''}
                                                    onChange={(e) => updateRule(rule.id, 'description', e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                                    placeholder="Brief description of this rule..."
                                                />
                                            </div>

                                            {/* Aggregation */}
                                            <div className="col-span-2">
                                                <label className="text-xs text-muted-foreground block mb-1">Aggregation</label>
                                                <select
                                                    value={rule.aggregation || 'none'}
                                                    onChange={(e) => updateRule(rule.id, 'aggregation', e.target.value as AggregationType)}
                                                    className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                                >
                                                    {AGGREGATION_OPTIONS.map((agg) => (
                                                        <option key={agg.value} value={agg.value}>
                                                            {agg.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Time Window */}
                                            <div className="col-span-2">
                                                <label className="text-xs text-muted-foreground block mb-1">Time Window</label>
                                                <select
                                                    value={rule.timeWindow || 0}
                                                    onChange={(e) => updateRule(rule.id, 'timeWindow', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                                    disabled={rule.aggregation === 'none'}
                                                >
                                                    {TIME_WINDOW_OPTIONS.map((tw) => (
                                                        <option key={tw.value} value={tw.value}>
                                                            {tw.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Actions column spacer */}
                                            <div className="col-span-2"></div>

                                            {/* Second row within expanded section */}
                                            <div className="col-span-1"></div>

                                            {/* Cooldown */}
                                            <div className="col-span-2">
                                                <label className="text-xs text-muted-foreground block mb-1">Cooldown</label>
                                                <select
                                                    value={rule.cooldownSeconds || 300}
                                                    onChange={(e) => updateRule(rule.id, 'cooldownSeconds', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                                >
                                                    {COOLDOWN_OPTIONS.map((cd) => (
                                                        <option key={cd.value} value={cd.value}>
                                                            {cd.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Action Type */}
                                            <div className="col-span-2">
                                                <label className="text-xs text-muted-foreground block mb-1">Action</label>
                                                <select
                                                    value={(rule.actions && rule.actions[0]) || 'alert'}
                                                    onChange={(e) => updateRule(rule.id, 'actions', [e.target.value as ActionType])}
                                                    className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-primary/20 focus:border-primary"
                                                >
                                                    {ACTION_OPTIONS.map((action) => (
                                                        <option key={action.value} value={action.value}>
                                                            {action.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add Button */}
                    <button
                        onClick={addRule}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm bg-background border border-dashed border-border hover:bg-muted hover:border-primary/30 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Another Rule
                    </button>
                </div>
            )}

            {/* Optional Notice */}
            {rules.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Click the expand button on each rule to configure advanced options. Rules can be modified later from the service management panel.
                </p>
            )}
        </div>
    );
}
