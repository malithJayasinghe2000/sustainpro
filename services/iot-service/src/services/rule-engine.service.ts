import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger, auditLogger, AuditCategory, AuditAction } from '@sustainpro/shared-utils';
import { LiveDataEntry } from './live-data.service';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'iot-service' });

// =============================================
// TYPE DEFINITIONS
// =============================================

export type RuleOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'in';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED';

export interface RuleCondition {
    metric: string;
    operator: RuleOperator;
    threshold: number | string | any[];
    aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
    time_window?: number; // in minutes
    conditions?: RuleCondition[];
    logical_operator?: 'AND' | 'OR';
}

export interface RuleAction {
    type: 'alert' | 'email' | 'webhook' | 'escalate' | 'notification';
    config?: Record<string, any>;
    delay_minutes?: number;
}

export interface AlertRule {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    device_type: string | null;
    condition: RuleCondition;
    actions: RuleAction[];
    severity: Severity;
    is_active: boolean;
    priority: number;
    cooldown_seconds: number;
    last_triggered_at: Date | null;
    trigger_count: number;
    event_id: string | null;
    service_id: string | null;
}

export interface EscalationPolicy {
    id: string;
    organization_id: string;
    event_id: string | null;
    service_id: string | null;
    name: string;
    description: string | null;
    escalation_level: number;
    escalation_delay_minutes: number;
    auto_assign_to: string | null;
    notify_method: string;
    is_active: boolean;
}

export interface AlertData {
    organization_id: string;
    event_id?: string;
    department_id?: string;
    service_id?: string;
    device_id: number;
    device_code: string;
    rule_id: string;
    rule_name: string;
    severity: Severity;
    message: string;
    value: any;
    threshold: any;
    metadata?: Record<string, any>;
}

// =============================================
// RULE ENGINE SERVICE
// =============================================

class RuleEngineService {
    private ruleCache: Map<string, AlertRule[]> = new Map();
    private escalationCache: Map<string, EscalationPolicy[]> = new Map();
    private cooldownTracker: Map<string, Date> = new Map();
    private cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
    private lastCacheRefresh = 0;

    /**
     * Evaluate telemetry data against all applicable rules
     */
    async evaluate(telemetryData: LiveDataEntry): Promise<void> {
        try {
            const rules = await this.getApplicableRules(
                telemetryData.organization_id,
                telemetryData.service_id
            );

            logger.info('📊 Rule evaluation started', {
                deviceCode: telemetryData.device_code,
                organizationId: telemetryData.organization_id,
                serviceId: telemetryData.service_id,
                totalRules: rules.length,
                telemetryData: telemetryData.data,
            });

            if (rules.length === 0) {
                logger.warn('⚠️ No active rules found for this device', {
                    deviceCode: telemetryData.device_code,
                    organizationId: telemetryData.organization_id,
                    serviceId: telemetryData.service_id,
                });
                return;
            }

            logger.debug('Evaluating rules for device', {
                deviceCode: telemetryData.device_code,
                ruleCount: rules.length,
            });

            for (const rule of rules) {
                try {
                    logger.debug('🔍 Evaluating rule', {
                        ruleId: rule.id,
                        ruleName: rule.name,
                        condition: rule.condition,
                        deviceCode: telemetryData.device_code,
                    });

                    const shouldTrigger = await this.evaluateRule(rule, telemetryData);

                    logger.info(`${shouldTrigger ? '✅' : '❌'} Rule evaluation result`, {
                        ruleId: rule.id,
                        ruleName: rule.name,
                        shouldTrigger,
                        deviceCode: telemetryData.device_code,
                    });

                    if (shouldTrigger) {
                        // Check cooldown
                        if (this.isInCooldown(rule.id, telemetryData.device_code, rule.cooldown_seconds)) {
                            logger.debug('Rule in cooldown', { ruleId: rule.id, deviceCode: telemetryData.device_code });
                            continue;
                        }

                        logger.info('🚨 Triggering alert for rule', {
                            ruleId: rule.id,
                            ruleName: rule.name,
                            deviceCode: telemetryData.device_code,
                        });

                        await this.triggerAlert(rule, telemetryData);
                    }
                } catch (err: any) {
                    logger.error('Error evaluating rule', {
                        ruleId: rule.id,
                        deviceCode: telemetryData.device_code,
                        error: err.message,
                    });
                }
            }
        } catch (err: any) {
            logger.error('Rule evaluation failed', { error: err.message });
        }
    }

    /**
     * Get applicable rules for an organization and optionally a service
     */
    private async getApplicableRules(
        organizationId: string,
        serviceId?: string
    ): Promise<AlertRule[]> {
        // Check if cache needs refresh
        if (Date.now() - this.lastCacheRefresh > this.cacheExpiry) {
            await this.refreshRuleCache();
        }

        const orgRules = this.ruleCache.get(organizationId) || [];

        // Filter rules: global org rules + service-specific rules
        return orgRules.filter(rule => {
            if (!rule.is_active) return false;
            // Include if rule has no service restriction OR matches the service
            if (!rule.service_id) return true;
            return rule.service_id === serviceId;
        });
    }

    /**
     * Refresh the rule cache from database
     */
    private async refreshRuleCache(): Promise<void> {
        try {
            const rules = await prisma.sps_alert_rules.findMany({
                where: { is_active: true },
            });

            this.ruleCache.clear();

            for (const rule of rules) {
                const orgId = rule.organization_id;
                if (!this.ruleCache.has(orgId)) {
                    this.ruleCache.set(orgId, []);
                }
                this.ruleCache.get(orgId)!.push(this.mapToAlertRule(rule));
            }

            this.lastCacheRefresh = Date.now();
            logger.debug('Rule cache refreshed', { ruleCount: rules.length });
        } catch (err: any) {
            logger.error('Failed to refresh rule cache', { error: err.message });
        }
    }

    /**
     * Evaluate a single rule against telemetry data
     */
    private async evaluateRule(rule: AlertRule, data: LiveDataEntry): Promise<boolean> {
        const condition = rule.condition;

        // Handle nested conditions with logical operators
        if (condition.conditions && condition.conditions.length > 0) {
            return this.evaluateNestedConditions(condition.conditions, condition.logical_operator || 'AND', data);
        }

        // Evaluate single condition
        return this.evaluateCondition(condition, data);
    }

    /**
     * Evaluate nested conditions with AND/OR logic
     */
    private evaluateNestedConditions(
        conditions: RuleCondition[],
        operator: 'AND' | 'OR',
        data: LiveDataEntry
    ): boolean {
        if (operator === 'AND') {
            return conditions.every(cond => this.evaluateCondition(cond, data));
        } else {
            return conditions.some(cond => this.evaluateCondition(cond, data));
        }
    }

    /**
     * Evaluate a single condition
     */
    private evaluateCondition(condition: RuleCondition, data: LiveDataEntry): boolean {
        const { metric, operator, threshold } = condition;

        // Get the value from telemetry data
        const value = this.getMetricValue(metric, data.data);

        logger.debug('📐 Evaluating condition', {
            metric,
            operator,
            threshold,
            value,
            valueType: typeof value,
            thresholdType: typeof threshold,
        });

        if (value === undefined || value === null) {
            logger.warn('⚠️ Metric value is undefined or null', { metric, deviceCode: data.device_code });
            return false;
        }

        let result = false;

        // Compare based on operator
        switch (operator) {
            case '>':
                result = Number(value) > Number(threshold);
                break;
            case '<':
                result = Number(value) < Number(threshold);
                break;
            case '>=':
                result = Number(value) >= Number(threshold);
                break;
            case '<=':
                result = Number(value) <= Number(threshold);
                break;
            case '==':
                result = value == threshold;
                break;
            case '!=':
                result = value != threshold;
                break;
            case 'contains':
                result = String(value).includes(String(threshold));
                break;
            case 'in':
                result = Array.isArray(threshold) && threshold.includes(value);
                break;
            default:
                logger.warn('Unknown operator', { operator });
                return false;
        }

        logger.info(`${result ? '✅' : '❌'} Condition evaluation`, {
            metric,
            operator,
            value: Number(value),
            threshold: Number(threshold),
            result,
            calculation: `${Number(value)} ${operator} ${Number(threshold)}`,
        });

        return result;
    }

    /**
     * Get metric value from nested data object
     * Supports dot notation: "sensors.temperature.value"
     */
    private getMetricValue(metric: string, data: Record<string, any>): any {
        const parts = metric.split('.');
        let value: any = data;

        for (const part of parts) {
            if (value === undefined || value === null) {
                return undefined;
            }
            value = value[part];
        }

        return value;
    }

    /**
     * Check if a rule is in cooldown for a device
     */
    private isInCooldown(ruleId: string, deviceCode: string, cooldownSeconds: number): boolean {
        const key = `${ruleId}:${deviceCode}`;
        const lastTriggered = this.cooldownTracker.get(key);

        if (!lastTriggered) {
            return false;
        }

        const cooldownMs = cooldownSeconds * 1000;
        return Date.now() - lastTriggered.getTime() < cooldownMs;
    }

    /**
     * Set cooldown for a rule-device combination
     */
    private setCooldown(ruleId: string, deviceCode: string): void {
        const key = `${ruleId}:${deviceCode}`;
        this.cooldownTracker.set(key, new Date());
    }

    /**
     * Trigger an alert and execute actions
     */
    private async triggerAlert(rule: AlertRule, data: LiveDataEntry): Promise<void> {
        const condition = rule.condition;
        const value = this.getMetricValue(condition.metric, data.data);

        // Get department info if service exists
        let departmentId: string | undefined;
        if (data.service_id) {
            const service = await prisma.sps_department_services.findUnique({
                where: { id: data.service_id },
                select: { department_id: true },
            });
            departmentId = service?.department_id;
        }

        // Get escalation policies for initial assignment
        const escalationPolicies = await this.getEscalationPolicies(data.service_id);
        const level0Policy = escalationPolicies.find(p => p.escalation_level === 0);

        const alertData: AlertData = {
            organization_id: data.organization_id,
            event_id: data.event_id || rule.event_id || undefined,
            department_id: departmentId,
            service_id: data.service_id,
            device_id: data.device_id,
            device_code: data.device_code,
            rule_id: rule.id,
            rule_name: rule.name,
            severity: rule.severity,
            message: this.buildAlertMessage(rule, data, value),
            value,
            threshold: condition.threshold,
            metadata: {
                metric: condition.metric,
                operator: condition.operator,
                telemetry_timestamp: data.timestamp,
            },
        };

        // Create alert in database
        const alert = await this.createAlert(alertData, level0Policy?.auto_assign_to);

        // Set cooldown
        this.setCooldown(rule.id, data.device_code);

        // Update rule trigger count
        await this.updateRuleTriggerCount(rule.id);

        // Execute rule actions
        await this.executeActions(rule.actions, alert, alertData);

        logger.info('Alert triggered', {
            alertId: alert.id,
            ruleName: rule.name,
            deviceCode: data.device_code,
            severity: rule.severity,
        });
    }

    /**
     * Build alert message
     */
    private buildAlertMessage(rule: AlertRule, data: LiveDataEntry, value: any): string {
        const condition = rule.condition;
        return `${rule.name}: ${condition.metric} is ${value} (threshold: ${condition.operator} ${condition.threshold}) on device ${data.device_code}`;
    }

    /**
     * Create alert in database
     */
    private async createAlert(alertData: AlertData, assignTo?: string | null): Promise<any> {
        const alert = await prisma.sps_alerts.create({
            data: {
                organization_id: alertData.organization_id,
                event_id: alertData.event_id || null,
                department_id: alertData.department_id || null,
                service_id: alertData.service_id || null,
                device_id: alertData.device_id,
                rule_id: alertData.rule_id,
                severity: alertData.severity,
                status: 'ACTIVE',
                message: alertData.message,
                value: alertData.value,
                threshold: alertData.threshold,
                escalation_level: 0,
                auto_assigned_to: assignTo || null,
                metadata: alertData.metadata,
            },
        });

        // Log to audit log
        auditLogger.logSystemAction(
            AuditCategory.ALERT,
            AuditAction.ALERT_TRIGGERED,
            {
                organizationId: alertData.organization_id,
                targetResource: 'alert',
                targetId: alert.id,
                description: `Alert triggered: ${alertData.message}`,
                metadata: {
                    severity: alertData.severity,
                    ruleId: alertData.rule_id,
                    deviceCode: alertData.device_code,
                    value: alertData.value
                }
            }
        );

        return alert;
    }


    /**
     * Update rule trigger count and last triggered time
     */
    private async updateRuleTriggerCount(ruleId: string): Promise<void> {
        try {
            await prisma.sps_alert_rules.update({
                where: { id: ruleId },
                data: {
                    trigger_count: { increment: 1 },
                    last_triggered_at: new Date(),
                },
            });
        } catch (err: any) {
            logger.error('Failed to update rule trigger count', { ruleId, error: err.message });
        }
    }

    /**
     * Get escalation policies for a service
     */
    private async getEscalationPolicies(serviceId?: string): Promise<EscalationPolicy[]> {
        if (!serviceId) {
            return [];
        }

        // Check cache
        if (this.escalationCache.has(serviceId)) {
            return this.escalationCache.get(serviceId)!;
        }

        const policies = await prisma.sps_escalation_policies.findMany({
            where: {
                service_id: serviceId,
                is_active: true,
            },
            orderBy: { escalation_level: 'asc' },
        });

        const mapped = policies.map(this.mapToEscalationPolicy);
        this.escalationCache.set(serviceId, mapped);

        return mapped;
    }

    /**
     * Execute rule actions
     */
    private async executeActions(actions: RuleAction[], alert: any, alertData: AlertData): Promise<void> {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'alert':
                        // Alert already created
                        break;

                    case 'notification':
                        await this.sendSystemNotification(alert, alertData);
                        break;

                    case 'email':
                        await this.sendEmailNotification(alert, alertData, action.config);
                        break;

                    case 'webhook':
                        await this.sendWebhook(alert, alertData, action.config);
                        break;

                    case 'escalate':
                        // Schedule escalation if delay specified
                        if (action.delay_minutes && action.delay_minutes > 0) {
                            this.scheduleEscalation(alert.id, action.delay_minutes);
                        }
                        break;

                    default:
                        logger.warn('Unknown action type', { type: action.type });
                }
            } catch (err: any) {
                logger.error('Failed to execute action', {
                    alertId: alert.id,
                    actionType: action.type,
                    error: err.message,
                });
            }
        }
    }

    /**
     * Send system notification
     */
    private async sendSystemNotification(alert: any, alertData: AlertData): Promise<void> {
        try {
            // Determine target users
            let targetUserIds: string[] = [];

            if (alert.auto_assigned_to) {
                targetUserIds.push(alert.auto_assigned_to);
            } else {
                // If no specific user assigned, notify Org Admins
                // We need to fetch org admins for this organization
                try {
                    // Query role assignments directly to find ORG_ADMINs for this organization
                    const adminAssignments = await prisma.sps_role_assignments.findMany({
                        where: {
                            role: 'ORG_ADMIN',
                            // Check both assignment org_id and user's org (via join if needed, but here simple filter)
                            // We heavily rely on org_id in assignment for multi-tenant scope
                            OR: [
                                { org_id: alertData.organization_id },
                                // Fallback: if assignment is global/generic but user is in this org
                                {
                                    org_id: null,
                                    sps_users: {
                                        organization_id: alertData.organization_id
                                    }
                                }
                            ]
                        },
                        select: { user_id: true }
                    });

                    targetUserIds = adminAssignments.map(a => a.user_id);

                    if (targetUserIds.length === 0) {
                        logger.warn('No Org Admins found to notify for unassigned alert', {
                            orgId: alertData.organization_id
                        });
                    }
                } catch (err) {
                    logger.warn('Failed to fetch org admins for notification', { error: err });
                }
            }

            if (targetUserIds.length === 0) {
                logger.debug('No targets for notification', { alertId: alert.id });
                return;
            }

            // Create notification for each target
            await Promise.all(targetUserIds.map(userId =>
                prisma.sps_system_notifications.create({
                    data: {
                        target_user_id: userId,
                        organization_id: alertData.organization_id,
                        type: alertData.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
                        title: `Alert: ${alertData.rule_name}`,
                        message: alertData.message,
                        source: 'device',
                        source_name: alertData.device_code,
                        metadata: {
                            alert_id: alert.id,
                            device_code: alertData.device_code,
                            rule_id: alertData.rule_id,
                            severity: alertData.severity,
                        },
                    },
                })
            ));

            logger.debug('System notification created', {
                alertId: alert.id,
                recipientCount: targetUserIds.length
            });
        } catch (err: any) {
            logger.error('Failed to create system notification', { error: err.message });
        }
    }

    /**
     * Send email notification via notification service
     */
    private async sendEmailNotification(
        alert: any,
        alertData: AlertData,
        config?: Record<string, any>
    ): Promise<void> {
        try {
            // Call notification service via HTTP (or use RabbitMQ queue)
            // For now, log the intent
            logger.info('Email notification queued', {
                alertId: alert.id,
                recipients: config?.recipients,
            });

            // TODO: Integrate with notification-service via RabbitMQ or HTTP
            // Example: publish to alert.notification queue
        } catch (err: any) {
            logger.error('Failed to send email notification', { error: err.message });
        }
    }

    /**
     * Send webhook notification
     */
    private async sendWebhook(
        alert: any,
        alertData: AlertData,
        config?: Record<string, any>
    ): Promise<void> {
        if (!config?.url) {
            return;
        }

        try {
            const response = await fetch(config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(config.headers || {}),
                },
                body: JSON.stringify({
                    alert_id: alert.id,
                    severity: alertData.severity,
                    message: alertData.message,
                    device_code: alertData.device_code,
                    value: alertData.value,
                    threshold: alertData.threshold,
                    timestamp: new Date().toISOString(),
                }),
            });

            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.status}`);
            }

            logger.debug('Webhook sent', { alertId: alert.id, url: config.url });
        } catch (err: any) {
            logger.error('Failed to send webhook', { error: err.message });
        }
    }

    /**
     * Schedule escalation for an alert
     */
    private scheduleEscalation(alertId: string, delayMinutes: number): void {
        setTimeout(async () => {
            try {
                await this.escalateAlert(alertId);
            } catch (err: any) {
                logger.error('Scheduled escalation failed', { alertId, error: err.message });
            }
        }, delayMinutes * 60 * 1000);

        logger.debug('Escalation scheduled', { alertId, delayMinutes });
    }

    /**
     * Escalate an alert to the next level
     */
    async escalateAlert(alertId: string): Promise<void> {
        const alert = await prisma.sps_alerts.findUnique({
            where: { id: alertId },
        });

        if (!alert || alert.status !== 'ACTIVE') {
            return;
        }

        const currentLevel = alert.escalation_level || 0;
        const nextLevel = currentLevel + 1;

        // Get next escalation policy
        if (!alert.service_id) {
            return;
        }

        const policies = await this.getEscalationPolicies(alert.service_id);
        const nextPolicy = policies.find(p => p.escalation_level === nextLevel);

        if (!nextPolicy) {
            logger.debug('No more escalation levels', { alertId, currentLevel });
            return;
        }

        // Update alert with new level and assignment
        await prisma.sps_alerts.update({
            where: { id: alertId },
            data: {
                escalation_level: nextLevel,
                auto_assigned_to: nextPolicy.auto_assign_to,
            },
        });

        // Send notification for escalation
        await this.sendEscalationNotification(alert, nextPolicy);

        logger.info('Alert escalated', {
            alertId,
            fromLevel: currentLevel,
            toLevel: nextLevel,
            assignedTo: nextPolicy.auto_assign_to,
        });

        // Schedule next escalation if policy has delay
        if (nextPolicy.escalation_delay_minutes > 0) {
            this.scheduleEscalation(alertId, nextPolicy.escalation_delay_minutes);
        }
    }

    /**
     * Send escalation notification
     */
    private async sendEscalationNotification(alert: any, policy: EscalationPolicy): Promise<void> {
        try {
            if (!policy.auto_assign_to) {
                logger.debug('No user assigned for escalation notification');
                return;
            }

            await prisma.sps_system_notifications.create({
                data: {
                    target_user_id: policy.auto_assign_to,
                    organization_id: alert.organization_id,
                    type: 'CRITICAL',
                    title: `Alert Escalated to Level ${policy.escalation_level}`,
                    message: alert.message || 'Alert requires attention',
                    source: 'system',
                    metadata: {
                        alert_id: alert.id,
                        escalation_level: policy.escalation_level,
                    },
                },
            });
        } catch (err: any) {
            logger.error('Failed to create escalation notification', { error: err.message });
        }
    }

    /**
     * Invalidate cache (call when rules are updated)
     */
    invalidateCache(): void {
        this.ruleCache.clear();
        this.escalationCache.clear();
        this.lastCacheRefresh = 0;
        logger.debug('Rule cache invalidated');
    }

    /**
     * Map database record to AlertRule
     */
    private mapToAlertRule(record: any): AlertRule {
        return {
            id: record.id,
            organization_id: record.organization_id,
            name: record.name,
            description: record.description,
            device_type: record.device_type,
            condition: record.condition as RuleCondition,
            actions: (record.actions as RuleAction[]) || [],
            severity: record.severity as Severity,
            is_active: record.is_active,
            priority: record.priority || 0,
            cooldown_seconds: record.cooldown_seconds || 300,
            last_triggered_at: record.last_triggered_at,
            trigger_count: record.trigger_count || 0,
            event_id: record.event_id,
            service_id: record.service_id,
        };
    }

    /**
     * Map database record to EscalationPolicy
     */
    private mapToEscalationPolicy(record: any): EscalationPolicy {
        return {
            id: record.id,
            organization_id: record.organization_id,
            event_id: record.event_id,
            service_id: record.service_id,
            name: record.name,
            description: record.description,
            escalation_level: record.escalation_level,
            escalation_delay_minutes: record.escalation_delay_minutes,
            auto_assign_to: record.auto_assign_to,
            notify_method: record.notify_method,
            is_active: record.is_active,
        };
    }
}

export const ruleEngineService = new RuleEngineService();
