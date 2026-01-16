import { Request, Response, NextFunction } from 'express';
import { createAuditLogRepository, AuditLogFilter } from '@sustainpro/shared-utils';
import { getPrismaClient } from '@sustainpro/shared-database';

const getAuditRepo = () => createAuditLogRepository(getPrismaClient());

/**
 * GET /api/v1/audit-logs
 * Get paginated audit logs with filters
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const isSuperAdmin = req.user?.isSuperAdmin;
        const userOrgId = req.user?.organization_id;

        // Build filter from query params
        const filter: AuditLogFilter = {
            page: parseInt(req.query.page as string) || 1,
            limit: Math.min(parseInt(req.query.limit as string) || 50, 100),
            sortBy: (req.query.sortBy as any) || 'created_at',
            sortOrder: (req.query.sortOrder as any) || 'desc',
        };

        // Organization filter - enforce for non-super admins
        if (isSuperAdmin && req.query.organization_id) {
            filter.organizationId = req.query.organization_id as string;
        } else if (!isSuperAdmin && userOrgId) {
            // Non-super admins can ONLY see their organization's logs
            filter.organizationId = userOrgId;
        }

        // Other filters
        if (req.query.source_type) filter.sourceType = req.query.source_type as string;
        if (req.query.category) filter.category = req.query.category as string;
        if (req.query.action) filter.action = req.query.action as string;
        if (req.query.status) filter.status = req.query.status as string;
        if (req.query.actor_user_id) filter.actorUserId = req.query.actor_user_id as string;
        if (req.query.target_resource) filter.targetResource = req.query.target_resource as string;
        if (req.query.search) filter.searchTerm = req.query.search as string;

        // Date range
        if (req.query.start_date) {
            filter.startDate = new Date(req.query.start_date as string);
        }
        if (req.query.end_date) {
            filter.endDate = new Date(req.query.end_date as string);
        }

        const auditRepo = getAuditRepo();
        const result = await auditRepo.findMany(filter);

        res.json({
            success: true,
            data: result.data,
            meta: {
                page: result.pagination.page,
                limit: result.pagination.limit,
                total: result.pagination.total,
                pages: result.pagination.totalPages,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/audit-logs/:id
 * Get single audit log by ID
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const isSuperAdmin = req.user?.isSuperAdmin;
        const userOrgId = req.user?.organization_id;

        const auditRepo = getAuditRepo();
        const log = await auditRepo.findById(req.params.id);

        if (!log) {
            res.status(404).json({
                success: false,
                error: 'Audit log not found',
            });
            return;
        }

        // Check org access for non-super admins
        if (!isSuperAdmin && log.organization_id !== userOrgId) {
            res.status(403).json({
                success: false,
                error: 'Access denied',
            });
            return;
        }

        res.json({
            success: true,
            data: log,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/audit-logs/stats
 * Get audit log statistics
 */
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const isSuperAdmin = req.user?.isSuperAdmin;
        const userOrgId = req.user?.organization_id;

        const filter: AuditLogFilter = {};

        // Org filter
        if (isSuperAdmin && req.query.organization_id) {
            filter.organizationId = req.query.organization_id as string;
        } else if (!isSuperAdmin && userOrgId) {
            filter.organizationId = userOrgId;
        }

        // Date range
        if (req.query.start_date) {
            filter.startDate = new Date(req.query.start_date as string);
        }
        if (req.query.end_date) {
            filter.endDate = new Date(req.query.end_date as string);
        }

        const auditRepo = getAuditRepo();
        const stats = await auditRepo.getStats(filter);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/audit-logs/export
 * Export audit logs as CSV
 */
export const exportCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const isSuperAdmin = req.user?.isSuperAdmin;
        const userOrgId = req.user?.organization_id;

        const filter: AuditLogFilter = {};

        // Org filter
        if (isSuperAdmin && req.query.organization_id) {
            filter.organizationId = req.query.organization_id as string;
        } else if (!isSuperAdmin && userOrgId) {
            filter.organizationId = userOrgId;
        }

        // Other filters
        if (req.query.source_type) filter.sourceType = req.query.source_type as string;
        if (req.query.category) filter.category = req.query.category as string;
        if (req.query.status) filter.status = req.query.status as string;

        // Date range
        if (req.query.start_date) {
            filter.startDate = new Date(req.query.start_date as string);
        }
        if (req.query.end_date) {
            filter.endDate = new Date(req.query.end_date as string);
        }

        const auditRepo = getAuditRepo();
        const csvContent = await auditRepo.exportToCSV(filter);

        // Generate filename with date
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `audit_logs_${dateStr}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/audit-logs/user/:userId
 * Get audit logs for a specific user
 */
export const getUserActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const isSuperAdmin = req.user?.isSuperAdmin;
        const userOrgId = req.user?.organization_id;
        const { userId } = req.params;

        const filter: AuditLogFilter = {
            actorUserId: userId,
            limit: parseInt(req.query.limit as string) || 100,
        };

        // Date range
        if (req.query.start_date) {
            filter.startDate = new Date(req.query.start_date as string);
        }
        if (req.query.end_date) {
            filter.endDate = new Date(req.query.end_date as string);
        }

        // Org restriction for non-super admins
        if (!isSuperAdmin && userOrgId) {
            filter.organizationId = userOrgId;
        }

        const auditRepo = getAuditRepo();
        const { data } = await auditRepo.findMany(filter);

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/audit-logs/categories
 * Get list of available categories for filtering
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
    res.json({
        success: true,
        data: [
            { code: 'AUTH', name: 'Authentication', description: 'Login, logout, password changes' },
            { code: 'USER', name: 'User Management', description: 'User CRUD operations' },
            { code: 'ORGANIZATION', name: 'Organization', description: 'Organization management' },
            { code: 'EVENT', name: 'Event', description: 'Event lifecycle' },
            { code: 'DEPARTMENT', name: 'Department', description: 'Department management' },
            { code: 'SERVICE', name: 'Service', description: 'Service management' },
            { code: 'DEVICE', name: 'Device', description: 'Device management' },
            { code: 'TELEMETRY', name: 'Telemetry', description: 'Device data events' },
            { code: 'ALERT', name: 'Alert', description: 'Alert events' },
            { code: 'TASK', name: 'Task', description: 'Task management' },
            { code: 'SETTINGS', name: 'Settings', description: 'System settings' },
            { code: 'RBAC', name: 'RBAC', description: 'Roles and permissions' },
            { code: 'API', name: 'API', description: 'API key management' },
            { code: 'REPORT', name: 'Report', description: 'Report generation' },
            { code: 'EXPORT', name: 'Export', description: 'Data exports' },
        ],
    });
};
