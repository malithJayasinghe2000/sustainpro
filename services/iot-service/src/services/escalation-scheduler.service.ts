/**
 * Escalation Scheduler Service (Optimized for 100+ devices)
 * 
 * This service runs as a background cron job to:
 * 1. Check all ACTIVE alerts that need escalation
 * 2. Automatically escalate alerts based on escalation policies
 * 3. Runs independently of browser - true server-side cron job
 * 
 * Optimizations:
 * - Batch processing with configurable batch size
 * - Caches escalation policies to reduce DB queries
 * - Uses efficient bulk updates where possible
 * - Implements error isolation to prevent single failure from affecting others
 */

import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger, auditLogger, AuditCategory, AuditAction } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'escalation-scheduler' });

// =============================================
// TYPES
// =============================================

interface PolicyCache {
    [serviceId: string]: {
        policies: any[];
        cachedAt: number;
    };
}

// =============================================
// ESCALATION SCHEDULER SERVICE
// =============================================

class EscalationSchedulerService {
    private isRunning = false;
    private isProcessing = false; // Lock to prevent overlapping runs
    private intervalId: NodeJS.Timeout | null = null;
    private checkIntervalMs = 60 * 1000; // Check every 1 minute

    // Optimization: Batch size for processing alerts
    private batchSize = 50;

    // Optimization: Policy cache to reduce DB queries
    private policyCache: PolicyCache = {};
    private policyCacheTTL = 5 * 60 * 1000; // 5 minutes cache TTL

    /**
     * Start the escalation scheduler
     * This runs like a cron job every minute
     */
    start(): void {
        if (this.isRunning) {
            logger.warn('Escalation scheduler is already running');
            return;
        }

        logger.info('🚀 Starting Escalation Scheduler (Optimized)...');
        this.isRunning = true;

        // Run immediately on start (with delay to let DB warm up)
        setTimeout(() => {
            this.runSafeCheck();
        }, 5000);

        // Then run every minute
        this.intervalId = setInterval(() => {
            this.runSafeCheck();
        }, this.checkIntervalMs);

        logger.info('✅ Escalation Scheduler started - checking every 1 minute');
    }

    /**
     * Safe wrapper that prevents overlapping runs
     */
    private runSafeCheck(): void {
        if (this.isProcessing) {
            logger.debug('Previous escalation check still running, skipping...');
            return;
        }

        this.checkAndEscalateAlerts().catch(err => {
            logger.error('Escalation check failed', { error: err.message });
        });
    }

    /**
     * Stop the escalation scheduler
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        this.clearPolicyCache();
        logger.info('⏹️ Escalation Scheduler stopped');
    }

    /**
     * Clear the policy cache
     */
    clearPolicyCache(): void {
        this.policyCache = {};
        logger.debug('Policy cache cleared');
    }

    /**
     * Main job: Check all ACTIVE alerts and escalate if needed
     * Optimized with batching for 100+ alerts
     */
    private async checkAndEscalateAlerts(): Promise<void> {
        this.isProcessing = true;
        const startTime = Date.now();

        try {
            logger.debug('🔍 Checking for alerts that need escalation...');

            // Count total active alerts first
            const totalCount = await prisma.sps_alerts.count({
                where: { status: 'ACTIVE' },
            });

            if (totalCount === 0) {
                logger.debug('No active alerts found');
                return;
            }

            logger.info(`📋 Found ${totalCount} active alerts to check`);

            // Process in batches to avoid memory issues
            let processedCount = 0;
            let escalatedCount = 0;
            let errorCount = 0;
            let skip = 0;

            while (skip < totalCount) {
                // Fetch batch of alerts
                const alerts = await prisma.sps_alerts.findMany({
                    where: { status: 'ACTIVE' },
                    select: {
                        id: true,
                        service_id: true,
                        organization_id: true,
                        event_id: true,
                        department_id: true,
                        escalation_level: true,
                        severity: true,
                        message: true,
                        created_at: true,
                    },
                    orderBy: { created_at: 'asc' },
                    skip,
                    take: this.batchSize,
                });

                if (alerts.length === 0) break;

                // Group alerts by service_id for efficient policy lookup
                const alertsByService = this.groupByService(alerts);

                // Process each service group
                for (const [serviceId, serviceAlerts] of Object.entries(alertsByService)) {
                    if (!serviceId || serviceId === 'null') continue;

                    try {
                        const policies = await this.getCachedPolicies(serviceId);
                        if (policies.length === 0) continue;

                        // Process alerts for this service
                        for (const alert of serviceAlerts) {
                            try {
                                const escalated = await this.processAlertEscalation(alert, policies);
                                if (escalated) escalatedCount++;
                                processedCount++;
                            } catch (err: any) {
                                errorCount++;
                                logger.error('Failed to process alert escalation', {
                                    alertId: alert.id,
                                    error: err.message,
                                });
                            }
                        }
                    } catch (err: any) {
                        logger.error('Failed to process service alerts', {
                            serviceId,
                            error: err.message,
                        });
                    }
                }

                skip += this.batchSize;
            }

            const duration = Date.now() - startTime;
            logger.info('✅ Escalation check completed', {
                totalAlerts: totalCount,
                processed: processedCount,
                escalated: escalatedCount,
                errors: errorCount,
                durationMs: duration,
            });

        } catch (err: any) {
            logger.error('Error in checkAndEscalateAlerts', { error: err.message });
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Group alerts by service_id for efficient batch processing
     */
    private groupByService(alerts: any[]): { [serviceId: string]: any[] } {
        return alerts.reduce((acc, alert) => {
            const key = alert.service_id || 'null';
            if (!acc[key]) acc[key] = [];
            acc[key].push(alert);
            return acc;
        }, {} as { [serviceId: string]: any[] });
    }

    /**
     * Get escalation policies with caching
     */
    private async getCachedPolicies(serviceId: string): Promise<any[]> {
        const now = Date.now();
        const cached = this.policyCache[serviceId];

        // Return cached policies if still valid
        if (cached && (now - cached.cachedAt) < this.policyCacheTTL) {
            return cached.policies;
        }

        // Fetch from database
        const policies = await prisma.sps_escalation_policies.findMany({
            where: {
                service_id: serviceId,
                is_active: true,
            },
            orderBy: { escalation_level: 'asc' },
        });

        // Cache the result
        this.policyCache[serviceId] = {
            policies,
            cachedAt: now,
        };

        return policies;
    }

    /**
     * Process escalation for a single alert (returns true if escalated)
     */
    /**
     * Process escalation for a single alert (returns true if escalated)
     */
    private async processAlertEscalation(alert: any, policies: any[]): Promise<boolean> {
        if (policies.length === 0) return false;

        const currentLevel = alert.escalation_level || 0;

        // Find next level policy
        const nextPolicy = policies.find(p => p.escalation_level === currentLevel + 1);

        // If no next level, we are at max level
        if (!nextPolicy) return false;

        // Calculate if escalation is due
        const alertCreatedAt = new Date(alert.created_at);
        const now = new Date();
        const minutesSinceAlert = (now.getTime() - alertCreatedAt.getTime()) / (1000 * 60);

        // Calculate total delay required to reach the NEXT level
        // Threshold = Sum of delays of all levels up to and including the NEXT level
        // e.g. To reach Level 1: Wait Level 1 delay
        // e.g. To reach Level 2: Wait (Level 1 delay + Level 2 delay)
        let escalationThreshold = 0;

        for (const policy of policies) {
            if (policy.escalation_level <= nextPolicy.escalation_level) {
                escalationThreshold += policy.escalation_delay_minutes;
            }
        }

        // Check if time condition meets threshold
        if (minutesSinceAlert >= escalationThreshold) {
            // Time to escalate!
            await this.escalateAlert(alert, nextPolicy);
            return true;
        }

        return false;
    }

    /**
     * Escalate an alert to the next level
     */
    private async escalateAlert(alert: any, nextPolicy: any): Promise<void> {
        const previousLevel = alert.escalation_level || 0;
        const nextLevel = nextPolicy.escalation_level;

        logger.info('⬆️ Escalating alert', {
            alertId: alert.id,
            fromLevel: previousLevel,
            toLevel: nextLevel,
            assignedTo: nextPolicy.auto_assign_to,
        });

        // Use transaction to ensure atomic operations
        await prisma.$transaction(async (tx) => {
            // Update alert with new escalation level
            await tx.sps_alerts.update({
                where: { id: alert.id },
                data: {
                    escalation_level: nextLevel,
                    auto_assigned_to: nextPolicy.auto_assign_to,
                },
            });

            // Create escalation record
            await tx.sps_escalations.create({
                data: {
                    organization_id: alert.organization_id,
                    event_id: alert.event_id,
                    department_id: alert.department_id,
                    service_id: alert.service_id,
                    alert_id: alert.id,
                    reason: 'TIMEOUT',
                    severity: alert.severity,
                    status: 'OPEN',
                    assigned_to: nextPolicy.auto_assign_to,
                    escalated_at: new Date(),
                    metadata: {
                        from_level: previousLevel,
                        to_level: nextLevel,
                        policy_id: nextPolicy.id,
                        policy_name: nextPolicy.name,
                    },
                    evidence_urls: [],
                },
            });

            // Determine notification targets
            let targetUserIds: string[] = [];
            if (nextPolicy.auto_assign_to) {
                targetUserIds.push(nextPolicy.auto_assign_to);
            } else {
                // Determine org admins as fallback
                try {
                    const adminAssignments = await tx.sps_role_assignments.findMany({
                        where: {
                            role: 'ORG_ADMIN',
                            OR: [
                                { org_id: alert.organization_id },
                                {
                                    org_id: null,
                                    sps_users: {
                                        organization_id: alert.organization_id
                                    }
                                }
                            ]
                        },
                        select: { user_id: true }
                    });
                    targetUserIds = adminAssignments.map(a => a.user_id);
                } catch (err) {
                    logger.warn('Failed to fetch org admins for escalation notification', { error: err });
                }
            }

            // Create system notification for targets
            if (targetUserIds.length > 0) {
                await tx.sps_system_notifications.createMany({
                    data: targetUserIds.map(userId => ({
                        target_user_id: userId,
                        organization_id: alert.organization_id,
                        type: 'CRITICAL',
                        title: `🚨 Alert Escalated to Level ${nextLevel}`,
                        message: alert.message || 'Alert requires attention',
                        source: 'system',
                        metadata: {
                            alert_id: alert.id,
                            escalation_level: nextLevel,
                            policy_name: nextPolicy.name,
                        },
                    })),
                });

                logger.info('📧 Escalation notification created', {
                    alertId: alert.id,
                    recipientCount: targetUserIds.length,
                    level: nextLevel,
                });
            }
        });

        // Log to audit log
        auditLogger.logSystemAction(
            AuditCategory.ALERT,
            'ESCALATION_CREATED',
            {
                organizationId: alert.organization_id,
                targetResource: 'escalation',
                targetId: alert.id,
                description: `Alert escalated to level ${nextLevel}`,
                metadata: {
                    alertId: alert.id,
                    fromLevel: previousLevel,
                    toLevel: nextLevel,
                    policyId: nextPolicy.id
                }
            }
        );
    }

    /**
     * Get scheduler status
     */
    getStatus(): { isRunning: boolean; isProcessing: boolean; checkIntervalMs: number; batchSize: number } {
        return {
            isRunning: this.isRunning,
            isProcessing: this.isProcessing,
            checkIntervalMs: this.checkIntervalMs,
            batchSize: this.batchSize,
        };
    }
}

// Singleton instance
export const escalationScheduler = new EscalationSchedulerService();
