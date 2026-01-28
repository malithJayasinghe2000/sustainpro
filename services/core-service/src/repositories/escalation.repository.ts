import { getPrismaClient } from '@sustainpro/shared-database';
import { AlertSeverity } from './alert.repository';

const prisma = getPrismaClient();

// =============================================
// TYPE DEFINITIONS
// =============================================

export type EscalationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLOSED';

export interface Escalation {
    id: string;
    organization_id: string;
    event_id: string | null;
    department_id: string | null;
    service_id: string | null;
    alert_id: string;
    reason: string | null;
    severity: AlertSeverity;
    status: EscalationStatus;
    assigned_to: string | null;
    escalated_at: Date;
    resolved_at: Date | null;
    resolved_by: string | null;
    resolution_notes: string | null;
    metadata: Record<string, any> | null;
    evidence_urls: string[];
    created_at: Date;
    updated_at: Date;

    // Relations
    sps_alerts?: {
        id: string;
        message: string;
        device_id: number | null;
        sps_devices?: {
            id: number;
            name: string;
            type: string | null;
        } | null;
    } | null;
    assigned_user?: {
        id: string;
        full_name: string | null;
        email: string;
    } | null;
    sps_organizations?: {
        id: string;
        name: string;
    } | null;
    sps_events?: {
        id: string;
        name: string;
    } | null;
    sps_departments?: {
        id: string;
        name: string;
    } | null;
    sps_department_services?: {
        id: string;
        sps_service_templates?: {
            id: string;
            name: string;
        } | null;
    } | null;
}

export interface EscalationFilters {
    organization_id?: string;
    event_id?: string;
    event_ids?: string[];
    department_id?: string;
    department_ids?: string[];
    service_id?: string;
    service_ids?: string[];
    device_id?: number | string; // Device ID might be string in query but number in DB
    status?: EscalationStatus | EscalationStatus[];
    severity?: AlertSeverity | AlertSeverity[];
    assigned_to?: string;
    from_date?: Date;
    to_date?: Date;
}

export interface EscalationStats {
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    closed: number;
    by_severity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}

// =============================================
// REPOSITORY CLASS
// =============================================

export class EscalationRepository {
    /**
     * Find all escalations with filters
     */
    async findAll(filters: EscalationFilters, page = 1, limit = 50): Promise<{ escalations: Escalation[]; total: number }> {
        const whereClause: any = {};

        if (filters.organization_id) {
            whereClause.organization_id = filters.organization_id;
        }

        if (filters.event_id) {
            whereClause.event_id = filters.event_id;
        } else if (filters.event_ids && filters.event_ids.length > 0) {
            whereClause.event_id = { in: filters.event_ids };
        }

        if (filters.department_id) {
            whereClause.department_id = filters.department_id;
        } else if (filters.department_ids && filters.department_ids.length > 0) {
            whereClause.department_id = { in: filters.department_ids };
        }

        if (filters.service_id) {
            whereClause.service_id = filters.service_id;
        } else if (filters.service_ids && filters.service_ids.length > 0) {
            whereClause.service_id = { in: filters.service_ids };
        }

        // Device filtering requires joining with Alerts table
        if (filters.device_id) {
            whereClause.sps_alerts = {
                device_id: Number(filters.device_id)
            };
        }

        if (filters.status) {
            whereClause.status = Array.isArray(filters.status)
                ? { in: filters.status }
                : filters.status;
        }

        if (filters.severity) {
            whereClause.severity = Array.isArray(filters.severity)
                ? { in: filters.severity }
                : filters.severity;
        }

        if (filters.assigned_to) {
            whereClause.assigned_to = filters.assigned_to;
        }

        if (filters.from_date || filters.to_date) {
            whereClause.escalated_at = {};
            if (filters.from_date) {
                whereClause.escalated_at.gte = filters.from_date;
            }
            if (filters.to_date) {
                whereClause.escalated_at.lte = filters.to_date;
            }
        }

        const [escalations, total] = await Promise.all([
            prisma.sps_escalations.findMany({
                where: whereClause,
                include: {
                    sps_alerts: {
                        select: {
                            id: true,
                            message: true,
                            device_id: true,
                            sps_devices: {
                                select: {
                                    id: true,
                                    name: true,
                                    type: true,
                                }
                            }
                        }
                    },
                    assigned_user: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true,
                        }
                    },
                    sps_organizations: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    sps_events: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    sps_departments: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    sps_department_services: {
                        select: {
                            id: true,
                            sps_service_templates: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            }
                        }
                    }
                },
                orderBy: [
                    { escalated_at: 'desc' }
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.sps_escalations.count({ where: whereClause }),
        ]);

        return {
            escalations: escalations as unknown as Escalation[], // Type assertion due to Prisma flexibility
            total,
        };
    }

    /**
     * Get escalation statistics
     */
    async getStats(filters: EscalationFilters): Promise<EscalationStats> {
        const whereClause: any = {};

        if (filters.organization_id) whereClause.organization_id = filters.organization_id;

        if (filters.event_id) whereClause.event_id = filters.event_id;
        else if (filters.event_ids && filters.event_ids.length > 0) whereClause.event_id = { in: filters.event_ids };

        if (filters.department_id) whereClause.department_id = filters.department_id;
        else if (filters.department_ids && filters.department_ids.length > 0) whereClause.department_id = { in: filters.department_ids };

        if (filters.service_id) whereClause.service_id = filters.service_id;
        else if (filters.service_ids && filters.service_ids.length > 0) whereClause.service_id = { in: filters.service_ids };

        if (filters.assigned_to) whereClause.assigned_to = filters.assigned_to;

        const [total, open, acknowledged, resolved, closed, critical, high, medium, low] = await Promise.all([
            prisma.sps_escalations.count({ where: whereClause }),
            prisma.sps_escalations.count({ where: { ...whereClause, status: 'OPEN' } }),
            prisma.sps_escalations.count({ where: { ...whereClause, status: 'ACKNOWLEDGED' } }),
            prisma.sps_escalations.count({ where: { ...whereClause, status: 'RESOLVED' } }),
            prisma.sps_escalations.count({ where: { ...whereClause, status: 'CLOSED' } }),
            prisma.sps_escalations.count({ where: { ...whereClause, severity: 'CRITICAL' } }),
            prisma.sps_escalations.count({ where: { ...whereClause, severity: 'HIGH' } }),
            prisma.sps_escalations.count({ where: { ...whereClause, severity: 'MEDIUM' } }),
            prisma.sps_escalations.count({ where: { ...whereClause, severity: 'LOW' } }),
        ]);

        return {
            total,
            open,
            acknowledged,
            resolved,
            closed,
            by_severity: {
                critical,
                high,
                medium,
                low,
            },
        };
    }

    /**
     * Get pending count (Open + Acknowledged)
     */
    async getPendingCount(filters: EscalationFilters): Promise<number> {
        const whereClause: any = {};

        if (filters.organization_id) whereClause.organization_id = filters.organization_id;
        if (filters.assigned_to) whereClause.assigned_to = filters.assigned_to;

        // Add pending status filter
        whereClause.status = { in: ['OPEN', 'ACKNOWLEDGED'] };

        return prisma.sps_escalations.count({ where: whereClause });
    }
}

export const escalationRepository = new EscalationRepository();
