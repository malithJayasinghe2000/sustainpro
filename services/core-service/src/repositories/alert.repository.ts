import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// =============================================
// TYPE DEFINITIONS
// =============================================

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED' | 'VERIFIED';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Alert {
    id: string;
    organization_id: string;
    event_id: string | null;
    department_id: string | null;
    service_id: string | null;
    device_id: number | null;
    rule_id: string;
    severity: AlertSeverity;
    status: AlertStatus;
    message: string;
    value: any;
    threshold: any;
    acknowledged_by: string | null;
    acknowledged_at: Date | null;
    resolved_by: string | null;
    resolved_at: Date | null;
    escalation_level: number;
    auto_assigned_to: string | null;
    metadata: Record<string, any> | null;
    created_at: Date;
    updated_at: Date;
    // Relations
    device?: {
        id: number;
        name: string;
        type: string | null;
    };
    rule?: {
        id: string;
        name: string;
    };
    organization?: {
        id: string;
        name: string;
    };
    event?: {
        id: string;
        name: string;
    };
    department?: {
        id: string;
        name: string;
    };
    service?: {
        id: string;
        service_template?: {
            id: string;
            name: string;
        };
    };
    acknowledged_by_user?: {
        id: string;
        name: string;
        email: string;
    };
    resolved_by_user?: {
        id: string;
        name: string;
        email: string;
    };
    assigned_to_user?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface CreateAlertDTO {
    organization_id: string;
    event_id?: string;
    department_id?: string;
    service_id?: string;
    device_id: number;
    rule_id: string;
    severity: AlertSeverity;
    status?: AlertStatus;
    message: string;
    value: any;
    threshold: any;
    escalation_level?: number;
    auto_assigned_to?: string;
    metadata?: Record<string, any>;
}

export interface UpdateAlertDTO {
    status?: AlertStatus;
    acknowledged_by?: string;
    acknowledged_at?: Date;
    resolved_by?: string;
    resolved_at?: Date;
    escalation_level?: number;
    auto_assigned_to?: string;
    metadata?: Record<string, any>;
}

export interface AlertFilters {
    organization_id?: string;
    event_id?: string;
    event_ids?: string[];  // For users with multiple event assignments
    department_id?: string;
    department_ids?: string[];  // For users with multiple department assignments
    service_id?: string;
    service_ids?: string[];  // For users with multiple service assignments
    device_id?: number;
    status?: AlertStatus | AlertStatus[];
    severity?: AlertSeverity | AlertSeverity[];
    assigned_to?: string;
    from_date?: Date;
    to_date?: Date;
}

export interface AlertStats {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    verified: number;
    expired: number;
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

export class AlertRepository {
    /**
     * Find all alerts with filters
     */
    async findAll(filters: AlertFilters, page = 1, limit = 50): Promise<{ alerts: Alert[]; total: number }> {
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
        if (filters.device_id) {
            whereClause.device_id = filters.device_id;
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
            whereClause.auto_assigned_to = filters.assigned_to;
        }
        if (filters.from_date || filters.to_date) {
            whereClause.created_at = {};
            if (filters.from_date) {
                whereClause.created_at.gte = filters.from_date;
            }
            if (filters.to_date) {
                whereClause.created_at.lte = filters.to_date;
            }
        }

        const [alerts, total] = await Promise.all([
            prisma.sps_alerts.findMany({
                where: whereClause,
                include: {
                    sps_devices: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                    sps_alert_rules: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    sps_organizations: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    sps_events: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    sps_departments: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    sps_department_services: {
                        select: {
                            id: true,
                            sps_service_templates: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    alert_acknowledged_by: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true,
                        },
                    },
                    alert_resolved_by: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true,
                        },
                    },
                    alert_assigned_to: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true,
                        },
                    },
                },
                orderBy: [
                    { severity: 'asc' }, // CRITICAL first
                    { created_at: 'desc' },
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.sps_alerts.count({ where: whereClause }),
        ]);

        return {
            alerts: alerts.map(this.mapToAlert),
            total,
        };
    }

    /**
     * Find alert by ID
     */
    async findById(id: string): Promise<Alert | null> {
        const alert = await prisma.sps_alerts.findUnique({
            where: { id },
            include: {
                sps_devices: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                sps_alert_rules: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                sps_organizations: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                sps_events: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                sps_departments: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                sps_department_services: {
                    select: {
                        id: true,
                        sps_service_templates: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                alert_acknowledged_by: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
                alert_resolved_by: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
                alert_assigned_to: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
        });

        return alert ? this.mapToAlert(alert) : null;
    }

    /**
     * Create a new alert
     */
    async create(data: CreateAlertDTO): Promise<Alert> {
        const alert = await prisma.sps_alerts.create({
            data: {
                organization_id: data.organization_id,
                event_id: data.event_id || null,
                department_id: data.department_id || null,
                service_id: data.service_id || null,
                device_id: data.device_id,
                rule_id: data.rule_id,
                severity: data.severity,
                status: data.status || 'ACTIVE',
                message: data.message,
                value: data.value,
                threshold: data.threshold,
                escalation_level: data.escalation_level || 0,
                auto_assigned_to: data.auto_assigned_to || null,
                metadata: data.metadata || undefined,
            },
            include: {
                sps_devices: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                sps_alert_rules: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return this.mapToAlert(alert);
    }

    /**
     * Update an alert
     */
    async update(id: string, data: UpdateAlertDTO): Promise<Alert | null> {
        const updateData: any = {};

        if (data.status !== undefined) updateData.status = data.status;
        if (data.acknowledged_by !== undefined) updateData.acknowledged_by = data.acknowledged_by;
        if (data.acknowledged_at !== undefined) updateData.acknowledged_at = data.acknowledged_at;
        if (data.resolved_by !== undefined) updateData.resolved_by = data.resolved_by;
        if (data.resolved_at !== undefined) updateData.resolved_at = data.resolved_at;
        if (data.escalation_level !== undefined) updateData.escalation_level = data.escalation_level;
        if (data.auto_assigned_to !== undefined) updateData.auto_assigned_to = data.auto_assigned_to;
        if (data.metadata !== undefined) updateData.metadata = data.metadata;

        const alert = await prisma.sps_alerts.update({
            where: { id },
            data: updateData,
            include: {
                sps_devices: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                sps_alert_rules: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return this.mapToAlert(alert);
    }

    /**
     * Acknowledge an alert
     */
    async acknowledge(id: string, userId: string): Promise<Alert | null> {
        return this.update(id, {
            status: 'ACKNOWLEDGED',
            acknowledged_by: userId,
            acknowledged_at: new Date(),
        });
    }

    /**
     * Resolve an alert
     */
    async resolve(id: string, userId: string): Promise<Alert | null> {
        return this.update(id, {
            status: 'RESOLVED',
            resolved_by: userId,
            resolved_at: new Date(),
        });
    }

    /**
     * Dismiss an alert (expire without resolving)
     */
    async dismiss(id: string, userId: string): Promise<Alert | null> {
        return this.update(id, {
            status: 'EXPIRED',
            resolved_by: userId,
            resolved_at: new Date(),
            metadata: { dismissed_by: userId, dismissed_at: new Date().toISOString() },
        });
    }

    /**
     * Escalate an alert to next level
     */
    async escalate(id: string, newLevel: number, assignToUserId?: string): Promise<Alert | null> {
        return this.update(id, {
            escalation_level: newLevel,
            auto_assigned_to: assignToUserId,
        });
    }

    /**
     * Get alert statistics
     */
    async getStats(filters: AlertFilters): Promise<AlertStats> {
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
        if (filters.assigned_to) {
            whereClause.auto_assigned_to = filters.assigned_to;
        }

        const [total, active, acknowledged, resolved, verified, expired, critical, high, medium, low] = await Promise.all([
            prisma.sps_alerts.count({ where: whereClause }),
            prisma.sps_alerts.count({ where: { ...whereClause, status: 'ACTIVE' } }),
            prisma.sps_alerts.count({ where: { ...whereClause, status: 'ACKNOWLEDGED' } }),
            prisma.sps_alerts.count({ where: { ...whereClause, status: 'RESOLVED' } }),
            prisma.sps_alerts.count({ where: { ...whereClause, status: 'VERIFIED' } }),
            prisma.sps_alerts.count({ where: { ...whereClause, status: 'EXPIRED' } }),
            prisma.sps_alerts.count({ where: { ...whereClause, severity: 'CRITICAL' } }),
            prisma.sps_alerts.count({ where: { ...whereClause, severity: 'HIGH' } }),
            prisma.sps_alerts.count({ where: { ...whereClause, severity: 'MEDIUM' } }),
            prisma.sps_alerts.count({ where: { ...whereClause, severity: 'LOW' } }),
        ]);

        return {
            total,
            active,
            acknowledged,
            resolved,
            verified, // Return verified count
            expired,
            by_severity: {
                critical,
                high,
                medium,
                low,
            },
        };
    }

    /**
     * Delete an alert
     */
    async delete(id: string): Promise<boolean> {
        await prisma.sps_alerts.delete({ where: { id } });
        return true;
    }

    /**
     * Map database record to Alert interface
     */
    private mapToAlert(record: any): Alert {
        return {
            id: record.id,
            organization_id: record.organization_id,
            event_id: record.event_id,
            department_id: record.department_id,
            service_id: record.service_id,
            device_id: record.device_id,
            rule_id: record.rule_id,
            severity: record.severity as AlertSeverity,
            status: record.status as AlertStatus,
            message: record.message,
            value: record.value,
            threshold: record.threshold,
            acknowledged_by: record.acknowledged_by,
            acknowledged_at: record.acknowledged_at,
            resolved_by: record.resolved_by,
            resolved_at: record.resolved_at,
            escalation_level: record.escalation_level || 0,
            auto_assigned_to: record.auto_assigned_to,
            metadata: record.metadata as Record<string, any> | null,
            created_at: record.created_at,
            updated_at: record.updated_at,
            // Relations
            device: record.sps_devices,
            rule: record.sps_alert_rules,
            organization: record.sps_organizations,
            event: record.sps_events,
            department: record.sps_departments,
            service: record.sps_department_services ? {
                id: record.sps_department_services.id,
                service_template: record.sps_department_services.sps_service_templates,
            } : undefined,
            acknowledged_by_user: record.alert_acknowledged_by,
            resolved_by_user: record.alert_resolved_by,
            assigned_to_user: record.alert_assigned_to,
        };
    }
}

export const alertRepository = new AlertRepository();
