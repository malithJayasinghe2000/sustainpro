import { Request, Response } from 'express';
import { alertRepository, AlertFilters, AlertStatus, AlertSeverity } from '../repositories/alert.repository';
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
    // Super admin takes priority
    if (user.isSuperAdmin || user.is_super_admin) {
        return 'SUPER_ADMIN';
    }

    // Check roles array for highest level role
    const roles = user.roles || [];
    for (const role of ROLE_HIERARCHY) {
        if (roles.includes(role)) {
            return role;
        }
    }

    return 'VIEWER'; // Default to lowest access
}

/**
 * Get all alerts with role-based filtering
 * Super Admin: All alerts
 * Org Admin: Organization alerts
 * Event Manager: Event alerts
 * Department Head: Department alerts
 * Supervisor: Service alerts
 */
export async function getAll(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const {
            status,
            severity,
            device_id,
            from_date,
            to_date,
            page = '1',
            limit = '50',
        } = req.query;

        // Build filters based on user role
        const filters: AlertFilters = {};

        // Get the primary role
        const primaryRole = getPrimaryRole(user);

        logger.debug('Alert getAll - User access check', {
            userId: user.id,
            primaryRole,
            isSuperAdmin: user.isSuperAdmin,
            roles: user.roles,
            organization_id: user.organization_id,
            eventIds: user.eventIds,
            deptIds: user.deptIds,
            serviceIds: user.serviceIds,
        });

        // Role-based access control
        switch (primaryRole) {
            case 'SUPER_ADMIN':
                // Can see all alerts, optionally filter by org
                if (req.query.organization_id) {
                    filters.organization_id = req.query.organization_id as string;
                }
                if (req.query.event_id) {
                    filters.event_id = req.query.event_id as string;
                }
                if (req.query.department_id) {
                    filters.department_id = req.query.department_id as string;
                }
                if (req.query.service_id) {
                    filters.service_id = req.query.service_id as string;
                }
                break;

            case 'ORG_ADMIN':
                // Can only see their organization's alerts
                if (!user.organization_id) {
                    return res.status(403).json({
                        success: false,
                        error: 'Organization admin must belong to an organization',
                    });
                }
                filters.organization_id = user.organization_id;
                if (req.query.event_id) {
                    filters.event_id = req.query.event_id as string;
                }
                if (req.query.department_id) {
                    filters.department_id = req.query.department_id as string;
                }
                if (req.query.service_id) {
                    filters.service_id = req.query.service_id as string;
                }
                break;

            case 'EVENT_MANAGER':
                // Can see alerts for their assigned events
                if (user.eventIds && user.eventIds.length > 0) {
                    // If specific event_id is requested, verify access
                    if (req.query.event_id) {
                        if (user.eventIds.includes(req.query.event_id as string)) {
                            filters.event_id = req.query.event_id as string;
                        } else {
                            return res.status(403).json({
                                success: false,
                                error: 'Access denied to this event',
                            });
                        }
                    } else {
                        // Show all assigned events - use the first one for now, 
                        // or we need to support multiple event_ids in filter
                        filters.event_ids = user.eventIds;
                    }
                } else {
                    return res.status(403).json({
                        success: false,
                        error: 'Event manager must be assigned to at least one event',
                    });
                }
                if (req.query.department_id) {
                    filters.department_id = req.query.department_id as string;
                }
                if (req.query.service_id) {
                    filters.service_id = req.query.service_id as string;
                }
                break;

            case 'DEPT_HEAD':
                // Can see alerts for their assigned departments
                if (user.deptIds && user.deptIds.length > 0) {
                    if (req.query.department_id) {
                        if (user.deptIds.includes(req.query.department_id as string)) {
                            filters.department_id = req.query.department_id as string;
                        } else {
                            return res.status(403).json({
                                success: false,
                                error: 'Access denied to this department',
                            });
                        }
                    } else {
                        filters.department_ids = user.deptIds;
                    }
                } else {
                    return res.status(403).json({
                        success: false,
                        error: 'Department head must be assigned to at least one department',
                    });
                }
                if (req.query.service_id) {
                    filters.service_id = req.query.service_id as string;
                }
                break;

            case 'SERVICE_SUPERVISOR':
            case 'TECHNICIAN':
            case 'SERVICE_SUPPLIER':
                // Can see alerts for their assigned services
                if (user.serviceIds && user.serviceIds.length > 0) {
                    if (req.query.service_id) {
                        if (user.serviceIds.includes(req.query.service_id as string)) {
                            filters.service_id = req.query.service_id as string;
                        } else {
                            return res.status(403).json({
                                success: false,
                                error: 'Access denied to this service',
                            });
                        }
                    } else {
                        filters.service_ids = user.serviceIds;
                    }
                } else {
                    // Fallback: show alerts assigned to them or in their organization
                    if (user.organization_id) {
                        filters.organization_id = user.organization_id;
                    } else {
                        filters.assigned_to = user.id;
                    }
                }
                break;

            default:
                // VIEWER and other roles can only see alerts assigned to them
                filters.assigned_to = user.id;
        }

        // Apply additional filters
        if (status) {
            const statusArray = (status as string).split(',') as AlertStatus[];
            filters.status = statusArray.length === 1 ? statusArray[0] : statusArray;
        }
        if (severity) {
            const severityArray = (severity as string).split(',') as AlertSeverity[];
            filters.severity = severityArray.length === 1 ? severityArray[0] : severityArray;
        }
        if (device_id) {
            filters.device_id = parseInt(device_id as string);
        }
        if (from_date) {
            filters.from_date = new Date(from_date as string);
        }
        if (to_date) {
            filters.to_date = new Date(to_date as string);
        }

        const result = await alertRepository.findAll(
            filters,
            parseInt(page as string),
            parseInt(limit as string)
        );

        logger.debug('Alerts fetched', {
            userId: user.id,
            role: user.role,
            count: result.alerts.length,
            total: result.total,
        });

        return res.json({
            success: true,
            data: result.alerts,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total: result.total,
                totalPages: Math.ceil(result.total / parseInt(limit as string)),
            },
        });
    } catch (error: any) {
        logger.error('Failed to fetch alerts', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch alerts',
        });
    }
}

/**
 * Get alert by ID
 */
export async function getById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const alert = await alertRepository.findById(id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found',
            });
        }

        // Check access based on role
        if (!hasAccessToAlert(user, alert)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this alert',
            });
        }

        return res.json({
            success: true,
            data: alert,
        });
    } catch (error: any) {
        logger.error('Failed to fetch alert', { error: error.message, id: req.params.id });
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch alert',
        });
    }
}

/**
 * Acknowledge an alert
 */
export async function acknowledge(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const existingAlert = await alertRepository.findById(id);

        if (!existingAlert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found',
            });
        }

        // Check access
        if (!hasAccessToAlert(user, existingAlert)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this alert',
            });
        }

        if (existingAlert.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                error: `Cannot acknowledge alert with status: ${existingAlert.status}`,
            });
        }

        const alert = await alertRepository.acknowledge(id, user.id);

        logger.info('Alert acknowledged', {
            alertId: id,
            userId: user.id,
        });

        return res.json({
            success: true,
            data: alert,
        });
    } catch (error: any) {
        logger.error('Failed to acknowledge alert', { error: error.message, id: req.params.id });
        return res.status(500).json({
            success: false,
            error: 'Failed to acknowledge alert',
        });
    }
}

/**
 * Resolve an alert
 */
export async function resolve(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const existingAlert = await alertRepository.findById(id);

        if (!existingAlert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found',
            });
        }

        // Check access
        if (!hasAccessToAlert(user, existingAlert)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this alert',
            });
        }

        if (existingAlert.status === 'RESOLVED' || existingAlert.status === 'EXPIRED') {
            return res.status(400).json({
                success: false,
                error: `Cannot resolve alert with status: ${existingAlert.status}`,
            });
        }

        const alert = await alertRepository.resolve(id, user.id);

        logger.info('Alert resolved', {
            alertId: id,
            userId: user.id,
        });

        return res.json({
            success: true,
            data: alert,
        });
    } catch (error: any) {
        logger.error('Failed to resolve alert', { error: error.message, id: req.params.id });
        return res.status(500).json({
            success: false,
            error: 'Failed to resolve alert',
        });
    }
}

/**
 * Dismiss an alert (expire without resolving)
 */
export async function dismiss(req: Request, res: Response): Promise<Response> {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        logger.info('Dismissing alert', { alertId: id, userId: user.id });

        const existingAlert = await alertRepository.findById(id);

        if (!existingAlert) {
            logger.warn('Alert not found for dismissal', { alertId: id });
            return res.status(404).json({
                success: false,
                error: 'Alert not found',
            });
        }

        // Check access
        if (!hasAccessToAlert(user, existingAlert)) {
            logger.warn('Access denied for alert dismissal', { alertId: id, userId: user.id });
            return res.status(403).json({
                success: false,
                error: 'Access denied to this alert',
            });
        }

        if (existingAlert.status === 'RESOLVED' || existingAlert.status === 'EXPIRED') {
            logger.warn('Cannot dismiss alert - invalid status', { alertId: id, status: existingAlert.status });
            return res.status(400).json({
                success: false,
                error: `Cannot dismiss alert with status: ${existingAlert.status}`,
            });
        }

        const alert = await alertRepository.dismiss(id, user.id);

        logger.info('Alert dismissed', {
            alertId: id,
            userId: user.id,
        });

        return res.json({
            success: true,
            data: alert,
        });
    } catch (error: any) {
        logger.error('Failed to dismiss alert', { error: error.message, id: req.params.id });
        return res.status(500).json({
            success: false,
            error: 'Failed to dismiss alert',
        });
    }
}

/**
 * Get alert statistics
 */
export async function getStats(req: Request, res: Response) {
    try {
        const user = (req as any).user;
        const primaryRole = getPrimaryRole(user);

        logger.info('Getting alert statistics', { userId: user.id, primaryRole });

        const filters: AlertFilters = {};

        // Role-based filtering (same logic as getAll)
        switch (primaryRole) {
            case 'SUPER_ADMIN':
                if (req.query.organization_id) {
                    filters.organization_id = req.query.organization_id as string;
                }
                break;
            case 'ORG_ADMIN':
                filters.organization_id = user.organization_id;
                break;
            case 'EVENT_MANAGER':
                if (user.eventIds && user.eventIds.length > 0) {
                    filters.event_ids = user.eventIds;
                }
                break;
            case 'DEPT_HEAD':
                if (user.deptIds && user.deptIds.length > 0) {
                    filters.department_ids = user.deptIds;
                }
                break;
            case 'SERVICE_SUPERVISOR':
            case 'TECHNICIAN':
            case 'SERVICE_SUPPLIER':
                if (user.serviceIds && user.serviceIds.length > 0) {
                    filters.service_ids = user.serviceIds;
                } else if (user.organization_id) {
                    filters.organization_id = user.organization_id;
                }
                break;
            default:
                filters.assigned_to = user.id;
        }

        const stats = await alertRepository.getStats(filters);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        logger.error('Failed to fetch alert stats', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch alert statistics',
        });
    }
}

/**
 * Escalate an alert
 */
export async function escalate(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { escalation_level, assign_to } = req.body;
        const user = (req as any).user;

        const existingAlert = await alertRepository.findById(id);

        if (!existingAlert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found',
            });
        }

        // Check access
        if (!hasAccessToAlert(user, existingAlert)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this alert',
            });
        }

        if (existingAlert.status === 'RESOLVED' || existingAlert.status === 'EXPIRED') {
            return res.status(400).json({
                success: false,
                error: `Cannot escalate alert with status: ${existingAlert.status}`,
            });
        }

        const alert = await alertRepository.escalate(id, escalation_level, assign_to);

        logger.info('Alert escalated', {
            alertId: id,
            userId: user.id,
            newLevel: escalation_level,
            assignedTo: assign_to,
        });

        return res.json({
            success: true,
            data: alert,
        });
    } catch (error: any) {
        logger.error('Failed to escalate alert', { error: error.message, id: req.params.id });
        return res.status(500).json({
            success: false,
            error: 'Failed to escalate alert',
        });
    }
}

/**
 * Delete an alert (Admin only)
 */
export async function deleteAlert(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const primaryRole = getPrimaryRole(user);

        // Only admins can delete alerts
        if (!['SUPER_ADMIN', 'ORG_ADMIN'].includes(primaryRole)) {
            return res.status(403).json({
                success: false,
                error: 'Only administrators can delete alerts',
            });
        }

        const existingAlert = await alertRepository.findById(id);

        if (!existingAlert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found',
            });
        }

        await alertRepository.delete(id);

        logger.info('Alert deleted', {
            alertId: id,
            userId: user.id,
        });

        return res.json({
            success: true,
            message: 'Alert deleted successfully',
        });
    } catch (error: any) {
        logger.error('Failed to delete alert', { error: error.message, id: req.params.id });
        return res.status(500).json({
            success: false,
            error: 'Failed to delete alert',
        });
    }
}

/**
 * Helper: Check if user has access to an alert
 */
function hasAccessToAlert(user: any, alert: any): boolean {
    const primaryRole = getPrimaryRole(user);

    switch (primaryRole) {
        case 'SUPER_ADMIN':
            return true;
        case 'ORG_ADMIN':
            return alert.organization_id === user.organization_id;
        case 'EVENT_MANAGER':
            return user.eventIds?.includes(alert.event_id);
        case 'DEPT_HEAD':
            return user.deptIds?.includes(alert.department_id);
        case 'SERVICE_SUPERVISOR':
        case 'TECHNICIAN':
        case 'SERVICE_SUPPLIER':
            // Can access alerts for their assigned services or alerts assigned to them
            if (user.serviceIds?.includes(alert.service_id)) {
                return true;
            }
            // Fallback: check if alert is assigned to them
            if (alert.auto_assigned_to === user.id) {
                return true;
            }
            // Fallback: check organization access
            return alert.organization_id === user.organization_id;
        default:
            // VIEWER and other roles can only access alerts assigned to them
            return alert.auto_assigned_to === user.id;
    }
}
