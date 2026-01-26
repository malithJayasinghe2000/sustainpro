// src/types/rules.types.ts

export type RuleOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'in';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AggregationType = 'avg' | 'sum' | 'min' | 'max' | 'count';
export type LogicalOperator = 'AND' | 'OR';
export type ActionType = 'alert' | 'email' | 'webhook' | 'escalate' | 'notification';

export interface RuleCondition {
  metric: string;
  operator: RuleOperator;
  threshold: number | string | any[];
  // Advanced (future)
  aggregation?: AggregationType;
  time_window?: number;
  conditions?: RuleCondition[];
  logical_operator?: LogicalOperator;
}

export interface RuleAction {
  type: ActionType;
  config?: Record<string, any>;
  delay_minutes?: number;
}

export interface TelemetryData {
  organization_id: string;
  device_id: string;
  device_code: string;
  device_type?: string;
  event_id?: string;
  timestamp: Date;
  metrics: Record<string, any>;
}

export interface AlertRule {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  device_type?: string;
  condition: RuleCondition;
  actions: RuleAction[];
  severity: Severity;
  is_active: boolean;
  priority: number;
  cooldown_seconds: number;
  last_triggered_at?: Date;
  trigger_count: number;
  event_id?: string;
  service_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateAlertRuleDto {
  organization_id: string;
  name: string;
  description?: string;
  device_type?: string;
  condition: RuleCondition;
  actions?: RuleAction[];
  severity: Severity;
  is_active?: boolean;
  priority?: number;
  cooldown_seconds?: number;
  event_id?: string;
  service_id?: string;
}

export interface UpdateAlertRuleDto {
  name?: string;
  description?: string;
  device_type?: string;
  condition?: RuleCondition;
  actions?: RuleAction[];
  severity?: Severity;
  is_active?: boolean;
  priority?: number;
  cooldown_seconds?: number;
}

// UI-specific types for rule builder
export interface RuleBuilderRow {
  id: string;
  metric: string;
  operator: RuleOperator;
  threshold: string;
  severity: Severity;
}

export const RULE_OPERATORS: { value: RuleOperator; label: string; description: string }[] = [
  { value: '>', label: '>', description: 'Greater than' },
  { value: '<', label: '<', description: 'Less than' },
  { value: '>=', label: '>=', description: 'Greater or equal' },
  { value: '<=', label: '<=', description: 'Less or equal' },
  { value: '==', label: '==', description: 'Equal' },
  { value: '!=', label: '!=', description: 'Not equal' },
  { value: 'contains', label: 'contains', description: 'String contains' },
  { value: 'in', label: 'in', description: 'Array membership' },
];

export const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-500' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-500' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'LOW', label: 'Low', color: 'bg-blue-500' },
];
