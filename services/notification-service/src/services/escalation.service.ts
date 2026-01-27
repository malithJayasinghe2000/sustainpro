import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'notification-service' });

// =============================================
// TYPE DEFINITIONS
// =============================================

export type EscalationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type EscalationReason = 'THRESHOLD_BREACH' | 'TIMEOUT' | 'MANUAL' | 'SLA_VIOLATION';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CreateEscalationData {
    organization_id: string;
    event_id?: string;
    department_id?: string;
    service_id?: string;
    alert_id?: string;
    task_id?: string;
    reason: string;
    severity?: Severity;
    assigned_to?: string;
    metadata?: Record<string, any>;
}

export interface UpdateEscalationData {
    status?: EscalationStatus;
    resolution_notes?: string;
    evidence_urls?: string[];
    acknowledged_by?: string;
    resolved_by?: string;
}

export interface EscalationFilters {
    organization_id?: string;
    event_id?: string;
    department_id?: string;
    service_id?: string;
    status?: EscalationStatus | EscalationStatus[];
    severity?: Severity | Severity[];
    assigned_to?: string;
    from_date?: Date;
    to_date?: Date;
}

// =============================================
// ESCALATION SERVICE
// =============================================

class EscalationService {
    /**
     * Create a new escalation
     */
    async createEscalation(data: CreateEscalationData): Promise<any> {
        try {
            const escalation = await prisma.sps_escalations.create({
                data: {
                    organization_id: data.organization_id,
                    event_id: data.event_id || null,
                    department_id: data.department_id || null,
                    service_id: data.service_id || null,
                    alert_id: data.alert_id || null,
                    task_id: data.task_id || null,
                    reason: data.reason,
                    severity: data.severity || 'MEDIUM',
                    status: 'OPEN',
                    assigned_to: data.assigned_to || null,
                    escalated_at: new Date(),
                    metadata: data.metadata || {},
                    evidence_urls: [],
                },
                include: {
                    sps_organizations: { select: { id: true, name: true } },
                    sps_events: { select: { id: true, name: true } },
                    sps_departments: { select: { id: true, name: true } },
                    sps_department_services: { select: { id: true, name: true } },
                    sps_alerts: { select: { id: true, message: true, severity: true } },
                    assigned_user: { select: { id: true, full_name: true, email: true } },
                },
            });

            logger.info('Escalation created', {
                escalationId: escalation.id,
                reason: data.reason,
                assignedTo: data.assigned_to,
            });

            return escalation;
        } catch (err: any) {
            logger.error('Failed to create escalation', { error: err.message });
            throw err;
        }
    }

    /**
     * Get escalations with filters
     */
    async getEscalations(filters: EscalationFilters, page = 1, limit = 20): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const where: any = {};

        if (filters.organization_id) {
            where.organization_id = filters.organization_id;
        }

        if (filters.event_id) {
            where.event_id = filters.event_id;
        }

        if (filters.department_id) {
            where.department_id = filters.department_id;
        }

        if (filters.service_id) {
            where.service_id = filters.service_id;
        }

        if (filters.status) {
            where.status = Array.isArray(filters.status) 
                ? { in: filters.status } 
                : filters.status;
        }

        if (filters.severity) {
            where.severity = Array.isArray(filters.severity)
                ? { in: filters.severity }
                : filters.severity;
        }

        if (filters.assigned_to) {
            where.assigned_to = filters.assigned_to;
        }

        if (filters.from_date || filters.to_date) {
            where.escalated_at = {};
            if (filters.from_date) {
                where.escalated_at.gte = filters.from_date;
            }
            if (filters.to_date) {
                where.escalated_at.lte = filters.to_date;
            }
        }

        const [data, total] = await Promise.all([
            prisma.sps_escalations.findMany({
                where,
                include: {
                    sps_organizations: { select: { id: true, name: true } },
                    sps_events: { select: { id: true, name: true } },
                    sps_departments: { select: { id: true, name: true } },
                    sps_department_services: { select: { id: true, name: true } },
                    sps_alerts: { select: { id: true, message: true, severity: true } },
                    assigned_user: { select: { id: true, full_name: true, email: true } },
                    acknowledged_user: { select: { id: true, full_name: true } },
                    resolved_user: { select: { id: true, full_name: true } },
                },
                orderBy: [
                    { severity: 'desc' },
                    { escalated_at: 'desc' },
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.sps_escalations.count({ where }),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get single escalation by ID
     */
    async getEscalationById(id: string): Promise<any> {
        return prisma.sps_escalations.findUnique({
            where: { id },
            include: {
                sps_organizations: { select: { id: true, name: true } },
                sps_events: { select: { id: true, name: true } },
                sps_departments: { select: { id: true, name: true } },
                sps_department_services: { select: { id: true, name: true } },
                sps_alerts: {
                    select: {
                        id: true,
                        message: true,
                        severity: true,
                        status: true,
                        value: true,
                        threshold: true,
                        created_at: true,
                    },
                },
                sps_tasks: { select: { id: true, title: true, status: true } },
                assigned_user: { select: { id: true, full_name: true, email: true } },
                acknowledged_user: { select: { id: true, full_name: true } },
                resolved_user: { select: { id: true, full_name: true } },
            },
        });
    }

    /**
     * Acknowledge an escalation
     */
    async acknowledgeEscalation(id: string, userId: string): Promise<any> {
        const escalation = await prisma.sps_escalations.findUnique({
            where: { id },
        });

        if (!escalation) {
            throw new Error('Escalation not found');
        }

        if (escalation.status !== 'OPEN') {
            throw new Error('Only OPEN escalations can be acknowledged');
        }

        const updated = await prisma.sps_escalations.update({
            where: { id },
            data: {
                status: 'ACKNOWLEDGED',
                acknowledged_at: new Date(),
                acknowledged_by: userId,
            },
            include: {
                assigned_user: { select: { id: true, full_name: true } },
                acknowledged_user: { select: { id: true, full_name: true } },
            },
        });

        logger.info('Escalation acknowledged', { escalationId: id, userId });

        return updated;
    }

    /**
     * Resolve an escalation
     */
    async resolveEscalation(
        id: string,
        userId: string,
        resolution_notes?: string,
        evidence_urls?: string[]
    ): Promise<any> {
        const escalation = await prisma.sps_escalations.findUnique({
            where: { id },
        });

        if (!escalation) {
            throw new Error('Escalation not found');
        }

        if (escalation.status === 'RESOLVED') {
            throw new Error('Escalation is already resolved');
        }

        // Merge existing evidence with new evidence
        const existingEvidence = (escalation.evidence_urls as string[]) || [];
        const allEvidence = [...existingEvidence, ...(evidence_urls || [])];

        const updated = await prisma.sps_escalations.update({
            where: { id },
            data: {
                status: 'RESOLVED',
                resolved_at: new Date(),
                resolved_by: userId,
                resolution_notes,
                evidence_urls: allEvidence,
            },
            include: {
                assigned_user: { select: { id: true, full_name: true } },
                resolved_user: { select: { id: true, full_name: true } },
            },
        });

        // Also resolve the linked alert if exists
        if (escalation.alert_id) {
            await prisma.sps_alerts.update({
                where: { id: escalation.alert_id },
                data: {
                    status: 'RESOLVED',
                    resolved_at: new Date(),
                    resolved_by: userId,
                },
            });
        }

        logger.info('Escalation resolved', { escalationId: id, userId });

        return updated;
    }

    /**
     * Add evidence to an escalation
     */
    async addEvidence(id: string, evidence_urls: string[]): Promise<any> {
        const escalation = await prisma.sps_escalations.findUnique({
            where: { id },
        });

        if (!escalation) {
            throw new Error('Escalation not found');
        }

        const existingEvidence = (escalation.evidence_urls as string[]) || [];
        const allEvidence = [...existingEvidence, ...evidence_urls];

        const updated = await prisma.sps_escalations.update({
            where: { id },
            data: {
                evidence_urls: allEvidence,
            },
        });

        logger.info('Evidence added to escalation', {
            escalationId: id,
            newEvidenceCount: evidence_urls.length,
        });

        return updated;
    }

    /**
     * Get pending escalation count for a user
     */
    async getPendingCount(userId: string): Promise<number> {
        return prisma.sps_escalations.count({
            where: {
                assigned_to: userId,
                status: { in: ['OPEN', 'ACKNOWLEDGED'] },
            },
        });
    }

    /**
     * Get escalation statistics
     */
    async getStatistics(filters: EscalationFilters): Promise<{
        total: number;
        open: number;
        acknowledged: number;
        resolved: number;
        bySeverity: Record<string, number>;
    }> {
        const where: any = {};

        if (filters.organization_id) {
            where.organization_id = filters.organization_id;
        }

        if (filters.event_id) {
            where.event_id = filters.event_id;
        }

        if (filters.assigned_to) {
            where.assigned_to = filters.assigned_to;
        }

        const [total, open, acknowledged, resolved, bySeverity] = await Promise.all([
            prisma.sps_escalations.count({ where }),
            prisma.sps_escalations.count({ where: { ...where, status: 'OPEN' } }),
            prisma.sps_escalations.count({ where: { ...where, status: 'ACKNOWLEDGED' } }),
            prisma.sps_escalations.count({ where: { ...where, status: 'RESOLVED' } }),
            prisma.sps_escalations.groupBy({
                by: ['severity'],
                where,
                _count: { severity: true },
            }),
        ]);

        const severityMap: Record<string, number> = {};
        for (const item of bySeverity) {
            if (item.severity) {
                severityMap[item.severity] = item._count.severity;
            }
        }

        return {
            total,
            open,
            acknowledged,
            resolved,
            bySeverity: severityMap,
        };
    }
}

export const escalationService = new EscalationService();
