/**
 * Audit Log Repository
 * 
 * Provides methods for querying, filtering, and exporting audit logs.
 * Supports the comprehensive audit log schema with multi-tenant filtering.
 */

import { PrismaClient, Prisma } from '@sustainpro/shared-database';
import { AuditCategory, AuditSourceType, AuditStatus } from './audit-logger';

// =============================================
// Types
// =============================================

export interface AuditLogFilter {
    // Time range
    startDate?: Date;
    endDate?: Date;

    // Source filtering
    sourceType?: AuditSourceType | string;
    actorUserId?: string;
    actorDeviceCode?: string;
    actorApiKeyId?: string;

    // Context filtering (multi-tenant)
    organizationId?: string;
    eventId?: string;
    departmentId?: string;
    serviceId?: string;

    // Action filtering
    category?: AuditCategory | string;
    action?: string;

    // Target filtering
    targetResource?: string;
    targetId?: string;

    // Status filtering
    status?: AuditStatus | string;

    // Search
    searchTerm?: string;

    // Pagination
    page?: number;
    limit?: number;

    // Sorting
    sortBy?: 'created_at' | 'action' | 'category' | 'status';
    sortOrder?: 'asc' | 'desc';
}

export interface AuditLogResult {
    id: string;
    source_type: string;
    actor_user_id: string | null;
    actor_device_id: number | null;
    actor_device_code: string | null;
    actor_api_key_id: string | null;
    organization_id: string | null;
    event_id: string | null;
    department_id: string | null;
    service_id: string | null;
    category: string;
    action: string;
    sub_action: string | null;
    target_resource: string | null;
    target_id: string | null;
    target_name: string | null;
    old_values: any;
    new_values: any;
    changes: any;
    ip_address: string | null;
    user_agent: string | null;
    request_method: string | null;
    request_path: string | null;
    request_id: string | null;
    status: string;
    error_message: string | null;
    error_code: string | null;
    duration_ms: number | null;
    metadata: any;
    description: string | null;
    created_at: Date;
    // Joined data
    actor_user_name?: string;
    actor_user_email?: string;
    organization_name?: string;
}

export interface PaginatedAuditLogs {
    data: AuditLogResult[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AuditLogStats {
    totalLogs: number;
    byCategory: Record<string, number>;
    bySourceType: Record<string, number>;
    byStatus: Record<string, number>;
    byAction: Record<string, number>;
    recentActivity: { date: string; count: number }[];
}

// =============================================
// Repository Class
// =============================================

export class AuditLogRepository {
    private prisma: PrismaClient;

    constructor(prismaClient: PrismaClient) {
        this.prisma = prismaClient;
    }

    /**
     * Build where clause from filters
     * Note: Using 'any' type because Prisma types need to be regenerated after schema changes.
     * Run `npx prisma generate` in shared-database package after migration.
     */
    private buildWhereClause(filter: AuditLogFilter): any {
        const where: any = {};

        // Time range
        if (filter.startDate || filter.endDate) {
            where.created_at = {};
            if (filter.startDate) {
                where.created_at.gte = filter.startDate;
            }
            if (filter.endDate) {
                where.created_at.lte = filter.endDate;
            }
        }

        // Source filtering
        if (filter.sourceType) where.source_type = filter.sourceType;
        if (filter.actorUserId) where.actor_user_id = filter.actorUserId;
        if (filter.actorDeviceCode) where.actor_device_code = filter.actorDeviceCode;
        if (filter.actorApiKeyId) where.actor_api_key_id = filter.actorApiKeyId;

        // Context filtering
        if (filter.organizationId) where.organization_id = filter.organizationId;
        if (filter.eventId) where.event_id = filter.eventId;
        if (filter.departmentId) where.department_id = filter.departmentId;
        if (filter.serviceId) where.service_id = filter.serviceId;

        // Action filtering
        if (filter.category) where.category = filter.category;
        if (filter.action) where.action = { contains: filter.action, mode: 'insensitive' };

        // Target filtering
        if (filter.targetResource) where.target_resource = filter.targetResource;
        if (filter.targetId) where.target_id = filter.targetId;

        // Status filtering
        if (filter.status) where.status = filter.status;

        // Search term (searches in description, action, target_name)
        if (filter.searchTerm) {
            where.OR = [
                { description: { contains: filter.searchTerm, mode: 'insensitive' } },
                { action: { contains: filter.searchTerm, mode: 'insensitive' } },
                { target_name: { contains: filter.searchTerm, mode: 'insensitive' } },
                { target_id: { contains: filter.searchTerm, mode: 'insensitive' } },
            ];
        }

        return where;
    }

    /**
     * Find audit logs with filtering and pagination
     */
    async findMany(filter: AuditLogFilter = {}): Promise<PaginatedAuditLogs> {
        const page = filter.page || 1;
        const limit = Math.min(filter.limit || 50, 500); // Max 500 per page
        const skip = (page - 1) * limit;

        const where = this.buildWhereClause(filter);

        // Determine sort order
        const orderBy: any = {};
        orderBy[filter.sortBy || 'created_at'] = filter.sortOrder || 'desc';

        const [logs, total] = await Promise.all([
            this.prisma.sps_audit_logs.findMany({
                where,
                include: {
                    sps_users: {
                        select: {
                            full_name: true,
                            email: true,
                        },
                    },
                    sps_organizations: {
                        select: {
                            name: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            this.prisma.sps_audit_logs.count({ where }),
        ]);

        // Transform to include joined data
        const data = logs.map((log: any) => ({
            ...log,
            actor_user_name: log.sps_users?.full_name,
            actor_user_email: log.sps_users?.email,
            organization_name: log.sps_organizations?.name,
            sps_users: undefined,
            sps_organizations: undefined,
        }));

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Find a single audit log by ID
     */
    async findById(id: string): Promise<AuditLogResult | null> {
        const log = await this.prisma.sps_audit_logs.findUnique({
            where: { id },
            include: {
                sps_users: {
                    select: {
                        full_name: true,
                        email: true,
                    },
                },
                sps_organizations: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!log) return null;

        return {
            ...log,
            actor_user_name: (log as any).sps_users?.full_name,
            actor_user_email: (log as any).sps_users?.email,
            organization_name: (log as any).sps_organizations?.name,
        } as AuditLogResult;
    }

    /**
     * Get statistics for audit logs
     */
    async getStats(filter: AuditLogFilter = {}): Promise<AuditLogStats> {
        const where = this.buildWhereClause(filter);

        // Get total count
        const totalLogs = await this.prisma.sps_audit_logs.count({ where });

        // Aggregate by category
        const categoryStats = await this.prisma.sps_audit_logs.groupBy({
            by: ['category'],
            where,
            _count: { id: true },
        });
        const byCategory: Record<string, number> = {};
        categoryStats.forEach((stat: any) => {
            byCategory[stat.category] = stat._count.id;
        });

        // Aggregate by source type
        const sourceStats = await this.prisma.sps_audit_logs.groupBy({
            by: ['source_type'],
            where,
            _count: { id: true },
        });
        const bySourceType: Record<string, number> = {};
        sourceStats.forEach((stat: any) => {
            bySourceType[stat.source_type] = stat._count.id;
        });

        // Aggregate by status
        const statusStats = await this.prisma.sps_audit_logs.groupBy({
            by: ['status'],
            where,
            _count: { id: true },
        });
        const byStatus: Record<string, number> = {};
        statusStats.forEach((stat: any) => {
            byStatus[stat.status] = stat._count.id;
        });

        // Aggregate by action (top 10)
        const actionStats = await this.prisma.sps_audit_logs.groupBy({
            by: ['action'],
            where,
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });
        const byAction: Record<string, number> = {};
        actionStats.forEach((stat: any) => {
            byAction[stat.action] = stat._count.id;
        });

        // Recent activity (last 7 days by date)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentWhere = {
            ...where,
            created_at: { gte: sevenDaysAgo },
        };

        const recentLogs = await this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM sps_audit_logs
      WHERE created_at >= ${sevenDaysAgo}
      ${filter.organizationId ? Prisma.sql`AND organization_id = ${filter.organizationId}::uuid` : Prisma.sql``}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

        const recentActivity = recentLogs.map((r: any) => ({
            date: r.date.toISOString().split('T')[0],
            count: Number(r.count),
        }));

        return {
            totalLogs,
            byCategory,
            bySourceType,
            byStatus,
            byAction,
            recentActivity,
        };
    }

    /**
     * Export audit logs to CSV format
     */
    async exportToCSV(filter: AuditLogFilter = {}): Promise<string> {
        // Get all matching logs (up to 10000 for export)
        const exportFilter = { ...filter, limit: 10000, page: 1 };
        const { data } = await this.findMany(exportFilter);

        // CSV headers
        const headers = [
            'ID',
            'Timestamp',
            'Source Type',
            'Actor User',
            'Actor Device',
            'Organization',
            'Event ID',
            'Department ID',
            'Service ID',
            'Category',
            'Action',
            'Target Resource',
            'Target ID',
            'Target Name',
            'Status',
            'Error Message',
            'IP Address',
            'User Agent',
            'Request Method',
            'Request Path',
            'Duration (ms)',
            'Description',
        ];

        // Build CSV rows
        const rows = data.map(log => [
            log.id,
            log.created_at.toISOString(),
            log.source_type,
            log.actor_user_email || log.actor_user_id || '',
            log.actor_device_code || log.actor_device_id || '',
            log.organization_name || log.organization_id || '',
            log.event_id || '',
            log.department_id || '',
            log.service_id || '',
            log.category,
            log.action,
            log.target_resource || '',
            log.target_id || '',
            log.target_name || '',
            log.status,
            log.error_message || '',
            log.ip_address || '',
            log.user_agent || '',
            log.request_method || '',
            log.request_path || '',
            log.duration_ms?.toString() || '',
            log.description || '',
        ]);

        // Escape CSV values
        const escapeCSV = (value: string): string => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        // Build CSV string
        const csvLines = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(',')),
        ];

        return csvLines.join('\n');
    }

    /**
     * Get user activity timeline
     */
    async getUserActivity(
        userId: string,
        options: { limit?: number; startDate?: Date; endDate?: Date } = {}
    ): Promise<AuditLogResult[]> {
        const { data } = await this.findMany({
            actorUserId: userId,
            startDate: options.startDate,
            endDate: options.endDate,
            limit: options.limit || 100,
            sortBy: 'created_at',
            sortOrder: 'desc',
        });
        return data;
    }

    /**
     * Get device activity timeline
     */
    async getDeviceActivity(
        deviceCode: string,
        options: { limit?: number; startDate?: Date; endDate?: Date } = {}
    ): Promise<AuditLogResult[]> {
        const { data } = await this.findMany({
            actorDeviceCode: deviceCode,
            startDate: options.startDate,
            endDate: options.endDate,
            limit: options.limit || 100,
            sortBy: 'created_at',
            sortOrder: 'desc',
        });
        return data;
    }

    /**
     * Get organization activity
     */
    async getOrganizationActivity(
        organizationId: string,
        options: { limit?: number; startDate?: Date; endDate?: Date; category?: string } = {}
    ): Promise<AuditLogResult[]> {
        const { data } = await this.findMany({
            organizationId,
            startDate: options.startDate,
            endDate: options.endDate,
            category: options.category,
            limit: options.limit || 100,
            sortBy: 'created_at',
            sortOrder: 'desc',
        });
        return data;
    }

    /**
     * Find logs by action pattern (for compliance/security queries)
     */
    async findByActionPattern(
        pattern: string,
        options: { organizationId?: string; startDate?: Date; endDate?: Date; limit?: number } = {}
    ): Promise<AuditLogResult[]> {
        const { data } = await this.findMany({
            action: pattern,
            organizationId: options.organizationId,
            startDate: options.startDate,
            endDate: options.endDate,
            limit: options.limit || 100,
        });
        return data;
    }

    /**
     * Get failed actions (for security monitoring)
     */
    async getFailedActions(
        options: { organizationId?: string; startDate?: Date; endDate?: Date; limit?: number } = {}
    ): Promise<AuditLogResult[]> {
        const { data } = await this.findMany({
            status: AuditStatus.FAILURE,
            organizationId: options.organizationId,
            startDate: options.startDate,
            endDate: options.endDate,
            limit: options.limit || 100,
        });
        return data;
    }

    /**
     * Delete old audit logs (for data retention policy)
     * BE CAREFUL: This permanently deletes data!
     */
    async deleteOldLogs(olderThan: Date): Promise<number> {
        const result = await this.prisma.sps_audit_logs.deleteMany({
            where: {
                created_at: { lt: olderThan },
            },
        });
        return result.count;
    }
}

// Factory function
export function createAuditLogRepository(prismaClient: PrismaClient): AuditLogRepository {
    return new AuditLogRepository(prismaClient);
}

export default AuditLogRepository;
