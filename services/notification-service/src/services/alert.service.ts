import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';
import { emailService } from './email.service';
import { escalationService } from './escalation.service';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'notification-service' });

// =============================================
// TYPE DEFINITIONS
// =============================================

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED';

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

// =============================================
// ALERT SERVICE
// =============================================

class AlertService {
    private escalationCache: Map<string, EscalationPolicy[]> = new Map();

    /**
     * Process an incoming alert from IoT service
     */
    async processAlert(alertData: AlertData): Promise<any> {
        try {
            logger.info('Processing alert', {
                ruleId: alertData.rule_id,
                deviceCode: alertData.device_code,
                severity: alertData.severity,
            });

            // Get escalation policies for initial assignment
            const escalationPolicies = await this.getEscalationPolicies(alertData.service_id);
            const level0Policy = escalationPolicies.find(p => p.escalation_level === 0);

            // Create alert in database
            const alert = await this.createAlert(alertData, level0Policy?.auto_assign_to);

            // Create escalation record
            if (level0Policy?.auto_assign_to) {
                await escalationService.createEscalation({
                    organization_id: alertData.organization_id,
                    event_id: alertData.event_id,
                    department_id: alertData.department_id,
                    service_id: alertData.service_id,
                    alert_id: alert.id,
                    reason: 'THRESHOLD_BREACH',
                    severity: alertData.severity,
                    assigned_to: level0Policy.auto_assign_to,
                    metadata: alertData.metadata,
                });
            }

            // Send notifications based on severity
            await this.sendNotifications(alert, alertData, level0Policy);

            logger.info('Alert processed successfully', {
                alertId: alert.id,
                severity: alertData.severity,
            });

            return alert;
        } catch (err: any) {
            logger.error('Failed to process alert', { error: err.message });
            throw err;
        }
    }

    /**
     * Create alert in database
     */
    private async createAlert(alertData: AlertData, assignTo?: string | null): Promise<any> {
        return prisma.sps_alerts.create({
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
    }

    /**
     * Send notifications based on severity and policy
     */
    private async sendNotifications(
        alert: any,
        alertData: AlertData,
        policy?: EscalationPolicy
    ): Promise<void> {
        // Create system notification
        await this.createSystemNotification(alert, alertData);

        // Send email for CRITICAL and HIGH severity
        if (alertData.severity === 'CRITICAL' || alertData.severity === 'HIGH') {
            if (policy?.auto_assign_to) {
                const user = await prisma.sps_users.findUnique({
                    where: { id: policy.auto_assign_to },
                    select: { email: true, full_name: true },
                });

                if (user?.email) {
                    await emailService.sendAlertEmail({
                        to: user.email,
                        alertId: alert.id,
                        severity: alertData.severity,
                        message: alertData.message,
                        deviceCode: alertData.device_code,
                        ruleName: alertData.rule_name,
                    });
                }
            }
        }

        // Schedule escalation if policy has delay
        if (policy && policy.escalation_delay_minutes > 0) {
            this.scheduleEscalation(alert.id, policy.escalation_delay_minutes);
        }
    }

    /**
     * Create system notification
     */
    private async createSystemNotification(alert: any, alertData: AlertData): Promise<void> {
        try {
            // Map alert severity to notification type
            const notificationType = 
                alertData.severity === 'CRITICAL' ? 'CRITICAL' :
                alertData.severity === 'HIGH' ? 'WARNING' : 'INFO';

            // Determine target user(s) for notification
            let targetUserIds: string[] = [];

            // Primary target: assigned user from escalation policy
            if (alert.auto_assigned_to) {
                targetUserIds.push(alert.auto_assigned_to);
            }

            // If no assigned user, find organization admin(s)
            if (targetUserIds.length === 0) {
                // Find users with ORG_ADMIN or SUPER_ADMIN role assignments in this organization
                const adminAssignments = await prisma.sps_role_assignments.findMany({
                    where: {
                        role: { in: ['ORG_ADMIN', 'SUPER_ADMIN'] },
                        OR: [
                            { org_id: alertData.organization_id },
                            { org_id: null } // Global admins
                        ]
                    },
                    include: { 
                        sps_users: {
                            select: { 
                                id: true, 
                                organization_id: true,
                                is_active: true 
                            }
                        }
                    },
                    take: 10, // Limit to prevent too many notifications
                });
                
                // Filter to active users in this organization
                targetUserIds = adminAssignments
                    .filter(a => 
                        a.sps_users?.is_active && 
                        (a.sps_users?.organization_id === alertData.organization_id || !a.sps_users?.organization_id)
                    )
                    .map(a => a.user_id)
                    .slice(0, 5); // Limit to 5 admins max
            }

            // If still no targets found, log warning and skip
            if (targetUserIds.length === 0) {
                logger.warn('No target users found for system notification', { 
                    alertId: alert.id, 
                    organizationId: alertData.organization_id 
                });
                return;
            }

            // Create notification for each target user
            for (const targetUserId of targetUserIds) {
                await prisma.sps_system_notifications.create({
                    data: {
                        organization_id: alertData.organization_id,
                        target_user_id: targetUserId,
                        type: notificationType,
                        title: `Alert: ${alertData.rule_name}`,
                        message: alertData.message,
                        source: 'alert',
                        source_id: alert.id,
                        source_name: alertData.rule_name,
                        action_url: `/alerts?id=${alert.id}`,
                        action_label: 'View Alert',
                        metadata: {
                            alert_id: alert.id,
                            device_code: alertData.device_code,
                            rule_id: alertData.rule_id,
                            severity: alertData.severity,
                        },
                    },
                });
            }
            logger.debug('System notification(s) created', { alertId: alert.id, targetCount: targetUserIds.length });
        } catch (err: any) {
            logger.error('Failed to create system notification', { error: err.message, stack: err.stack });
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
            include: {
                sps_events: { select: { id: true, name: true } },
                sps_departments: { select: { id: true, name: true } },
            },
        });

        if (!alert || alert.status !== 'ACTIVE') {
            return;
        }

        const currentLevel = alert.escalation_level || 0;
        const nextLevel = currentLevel + 1;

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

        // Create new escalation record for the new level
        if (nextPolicy.auto_assign_to) {
            await escalationService.createEscalation({
                organization_id: alert.organization_id,
                event_id: alert.event_id || undefined,
                department_id: alert.department_id || undefined,
                service_id: alert.service_id,
                alert_id: alertId,
                reason: 'TIMEOUT',
                severity: alert.severity as Severity,
                assigned_to: nextPolicy.auto_assign_to,
                metadata: {
                    escalation_level: nextLevel,
                    previous_level: currentLevel,
                },
            });
        }

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
            // Skip if no user assigned
            if (!policy.auto_assign_to) {
                logger.warn('Escalation policy has no assigned user', { policyId: policy.id });
                return;
            }

            await prisma.sps_system_notifications.create({
                data: {
                    organization_id: alert.organization_id,
                    target_user_id: policy.auto_assign_to,
                    type: 'CRITICAL',
                    title: `Alert Escalated to Level ${policy.escalation_level}`,
                    message: alert.message,
                    metadata: {
                        alert_id: alert.id,
                        escalation_level: policy.escalation_level,
                    },
                },
            });

            // Send email if email is the notify method
            if (policy.notify_method === 'EMAIL' && policy.auto_assign_to) {
                const user = await prisma.sps_users.findUnique({
                    where: { id: policy.auto_assign_to },
                    select: { email: true, full_name: true },
                });

                if (user?.email) {
                    await emailService.sendEscalationEmail({
                        to: user.email,
                        alertId: alert.id,
                        escalationLevel: policy.escalation_level,
                        message: alert.message,
                        severity: alert.severity,
                    });
                }
            }
        } catch (err: any) {
            logger.error('Failed to create escalation notification', { error: err.message });
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
     * Invalidate escalation cache
     */
    invalidateCache(): void {
        this.escalationCache.clear();
        logger.debug('Escalation cache invalidated');
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

export const alertService = new AlertService();
