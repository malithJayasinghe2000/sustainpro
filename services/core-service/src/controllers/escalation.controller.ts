import { Request, Response } from 'express';
import { escalationRepository, EscalationFilters, EscalationStatus } from '../repositories/escalation.repository';
import { AlertSeverity } from '../repositories/alert.repository';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });

// Role hierarchy for determining primary role
const ROLE_HIERARCHY = [
    'SUPER_ADMIN',
    'ORG_ADMIN',
    'EVENT_MANAGER',
    'DEPT_HEAD',
    'SERVICE_SUPERVISOR',
    'TECHNICIAN',
    'SERVICE_SUPPLIER',
    'VIEWER',
];

/**
 * Get the highest (most privileged) role from user's roles array
 */
function getPrimaryRole(user: any): string {
    if (user.isSuperAdmin || user.is_super_admin) {
        return 'SUPER_ADMIN';
    }
    const roles = user.roles || [];
    for (const role of ROLE_HIERARCHY) {
        if (roles.includes(role)) return role;
    }
    return 'VIEWER';
}

/**
 * Get all escalations with role-based filtering
 */
export async function getAll(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const {
            status,
            severity,
            organization_id,
            event_id,
            department_id,
            service_id,
            device_id,
            from_date,
            to_date,
            page = '1',
            limit = '50',
        } = req.query;

        // Build filters based on user role
        const filters: EscalationFilters = {};
        const primaryRole = getPrimaryRole(user);

        logger.debug('Escalation getAll - User access check', {
            userId: user.id,
            primaryRole,
            filters: req.query
        });

        // Role-based access control
        switch (primaryRole) {
            case 'SUPER_ADMIN':
                if (organization_id) filters.organization_id = organization_id as string;
                if (event_id) filters.event_id = event_id as string;
                if (department_id) filters.department_id = department_id as string;
                if (service_id) filters.service_id = service_id as string;
                break;

            case 'ORG_ADMIN':
                if (!user.organization_id) {
                    return res.status(403).json({ success: false, error: 'Organization admin must belong to an organization' });
                }
                filters.organization_id = user.organization_id;
                if (event_id) filters.event_id = event_id as string;
                if (department_id) filters.department_id = department_id as string;
                if (service_id) filters.service_id = service_id as string;
                break;

            case 'EVENT_MANAGER':
                if (user.eventIds && user.eventIds.length > 0) {
                    if (event_id) {
                        if (user.eventIds.includes(event_id as string)) {
                            filters.event_id = event_id as string;
                        } else {
                            return res.status(403).json({ success: false, error: 'Access denied to this event' });
                        }
                    } else {
                        filters.event_ids = user.eventIds;
                    }
                } else {
                    return res.status(403).json({ success: false, error: 'Event manager must be assigned to at least one event' });
                }
                if (department_id) filters.department_id = department_id as string;
                if (service_id) filters.service_id = service_id as string;
                break;

            case 'DEPT_HEAD':
                if (user.deptIds && user.deptIds.length > 0) {
                    if (department_id) {
                        if (user.deptIds.includes(department_id as string)) {
                            filters.department_id = department_id as string;
                        } else {
                            return res.status(403).json({ success: false, error: 'Access denied to this department' });
                        }
                    } else {
                        filters.department_ids = user.deptIds;
                    }
                } else {
                    return res.status(403).json({ success: false, error: 'Department head must be assigned to at least one department' });
                }
                if (service_id) filters.service_id = service_id as string;
                break;

            case 'SERVICE_SUPERVISOR':
            case 'TECHNICIAN':
            case 'SERVICE_SUPPLIER':
                if (user.serviceIds && user.serviceIds.length > 0) {
                    if (service_id) {
                        if (user.serviceIds.includes(service_id as string)) {
                            filters.service_id = service_id as string;
                        } else {
                            return res.status(403).json({ success: false, error: 'Access denied to this service' });
                        }
                    } else {
                        filters.service_ids = user.serviceIds;
                    }
                } else {
                    // Fallback to assigned only if no service scope
                    filters.assigned_to = user.id;
                }
                break;

            default:
                filters.assigned_to = user.id;
        }

        // Apply additional filters
        if (status) {
            const statusArray = (status as string).split(',') as EscalationStatus[];
            filters.status = statusArray.length === 1 ? statusArray[0] : statusArray;
        }
        if (severity) {
            const severityArray = (severity as string).split(',') as AlertSeverity[];
            filters.severity = severityArray.length === 1 ? severityArray[0] : severityArray;
        }
        if (device_id) {
            filters.device_id = device_id as string;
        }
        if (from_date) {
            filters.from_date = new Date(from_date as string);
        }
        if (to_date) {
            filters.to_date = new Date(to_date as string);
        }

        const result = await escalationRepository.findAll(
            filters,
            parseInt(page as string),
            parseInt(limit as string)
        );

        return res.json({
            success: true,
            data: result.escalations,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total: result.total,
                totalPages: Math.ceil(result.total / parseInt(limit as string)),
            },
        });
    } catch (error: any) {
        logger.error('Failed to fetch escalations', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch escalations',
        });
    }
}

/**
 * Get pending escalations count
 */
export async function getPendingCount(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const primaryRole = getPrimaryRole(user);
        const filters: EscalationFilters = {};

        // Simplified role check for count (usually strictly for dashboard/notification)
        if (primaryRole === 'SUPER_ADMIN') {
            if (req.query.organization_id) filters.organization_id = req.query.organization_id as string;
        } else if (primaryRole === 'ORG_ADMIN') {
            filters.organization_id = user.organization_id;
        } else {
            filters.assigned_to = user.id;
        }

        const count = await escalationRepository.getPendingCount(filters);

        return res.json({
            success: true,
            data: { count }
        });

    } catch (error: any) {
        logger.error('Failed to fetch pending escalation count', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch pending count',
        });
    }
}

/**
 * Get my assigned escalations
 */
export async function getMyEscalations(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const {
            status,
            priority, // using priority as severity alias if needed
            severity,
            page = '1',
            limit = '50'
        } = req.query;

        const filters: EscalationFilters = {
            assigned_to: user.id
        };

        if (status) {
            const statusArray = (status as string).split(',') as EscalationStatus[];
            filters.status = statusArray.length === 1 ? statusArray[0] : statusArray;
        }
        if (severity || priority) {
            const s = (severity || priority) as string;
            const severityArray = s.split(',') as AlertSeverity[];
            filters.severity = severityArray.length === 1 ? severityArray[0] : severityArray;
        }

        const result = await escalationRepository.findAll(
            filters,
            parseInt(page as string),
            parseInt(limit as string)
        );

        return res.json({
            success: true,
            data: result.escalations,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total: result.total,
                totalPages: Math.ceil(result.total / parseInt(limit as string)),
            },
        });
    } catch (error: any) {
        logger.error('Failed to fetch my escalations', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch my escalations',
        });
    }
}
