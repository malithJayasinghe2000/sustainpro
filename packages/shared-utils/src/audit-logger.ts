/**
 * Centralized Audit Logger for SustainPro Platform
 * 
 * This utility provides a simple, centralized way to log audit events across all services.
 * It supports logging for:
 * - User authentication events (login, logout, failed attempts)
 * - Administrative actions (CRUD operations)
 * - IoT device requests (telemetry, commands)
 * - System operations (scheduled tasks, background jobs)
 * - API requests (external access)
 * 
 * Usage:
 * ```typescript
 * import { auditLogger, AuditCategory, AuditSourceType } from '@sustainpro/shared-utils';
 * 
 * // User login
 * await auditLogger.log({
 *   sourceType: AuditSourceType.USER,
 *   category: AuditCategory.AUTH,
 *   action: 'LOGIN',
 *   actorUserId: user.id,
 *   organizationId: user.organization_id,
 *   status: 'SUCCESS',
 *   ipAddress: req.ip,
 * });
 * 
 * // Device telemetry
 * await auditLogger.log({
 *   sourceType: AuditSourceType.DEVICE,
 *   category: AuditCategory.TELEMETRY,
 *   action: 'SEND_DATA',
 *   actorDeviceId: device.id,
 *   actorDeviceCode: device.device_code,
 *   organizationId: device.organization_id,
 * });
 * ```
 */

import { PrismaClient } from '@sustainpro/shared-database';
import { createLogger } from './logger';

const logger = createLogger({ service: 'audit-logger' });

// =============================================
// Enums and Types
// =============================================

/**
 * Source types for audit log entries
 */
export enum AuditSourceType {
    USER = 'USER',           // Action performed by a logged-in user
    DEVICE = 'DEVICE',       // Action performed by an IoT device
    SYSTEM = 'SYSTEM',       // Action performed by the system (scheduled jobs, etc.)
    API = 'API',             // Action performed via external API (API keys)
}

/**
 * Categories for organizing audit log entries
 */
export enum AuditCategory {
    AUTH = 'AUTH',                   // Authentication events
    USER = 'USER',                   // User management
    ORGANIZATION = 'ORGANIZATION',   // Organization management
    EVENT = 'EVENT',                 // Event management
    DEPARTMENT = 'DEPARTMENT',       // Department management
    SERVICE = 'SERVICE',             // Service management
    DEVICE = 'DEVICE',               // Device management
    TELEMETRY = 'TELEMETRY',         // Telemetry data events
    ALERT = 'ALERT',                 // Alert events
    TASK = 'TASK',                   // Task management
    SETTINGS = 'SETTINGS',           // System settings changes
    RBAC = 'RBAC',                   // Role and permission changes
    API = 'API',                     // API key management
    REPORT = 'REPORT',               // Report generation
    EXPORT = 'EXPORT',               // Data export events
    NOTIFICATION = 'NOTIFICATION',   // Notification events
}

/**
 * Common actions for audit logging
 */
export enum AuditAction {
    // Authentication
    LOGIN = 'LOGIN',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET = 'PASSWORD_RESET',
    TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
    TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
    TWO_FACTOR_VERIFIED = 'TWO_FACTOR_VERIFIED',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    TOKEN_REFRESH = 'TOKEN_REFRESH',

    // CRUD Operations
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LIST = 'LIST',

    // Status Changes
    ACTIVATE = 'ACTIVATE',
    DEACTIVATE = 'DEACTIVATE',
    SUSPEND = 'SUSPEND',
    ARCHIVE = 'ARCHIVE',
    RESTORE = 'RESTORE',

    // Device-specific
    REGISTER = 'REGISTER',
    SEND_TELEMETRY = 'SEND_TELEMETRY',
    RECEIVE_COMMAND = 'RECEIVE_COMMAND',
    STATUS_CHANGE = 'STATUS_CHANGE',
    CONNECT = 'CONNECT',
    DISCONNECT = 'DISCONNECT',

    // Role/Permission
    ASSIGN_ROLE = 'ASSIGN_ROLE',
    REMOVE_ROLE = 'REMOVE_ROLE',
    GRANT_PERMISSION = 'GRANT_PERMISSION',
    REVOKE_PERMISSION = 'REVOKE_PERMISSION',

    // Export/Report
    EXPORT = 'EXPORT',
    GENERATE_REPORT = 'GENERATE_REPORT',

    // Alerts
    ALERT_TRIGGERED = 'ALERT_TRIGGERED',
    ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
    ALERT_RESOLVED = 'ALERT_RESOLVED',
}

/**
 * Status of the audited action
 */
export enum AuditStatus {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    PARTIAL = 'PARTIAL',
}

/**
 * Input parameters for logging an audit entry
 */
export interface AuditLogInput {
    // === Required Fields ===
    sourceType: AuditSourceType;
    category: AuditCategory | string;
    action: AuditAction | string;

    // === Actor Identification ===
    actorUserId?: string;
    actorDeviceId?: number;
    actorDeviceCode?: string;
    actorApiKeyId?: string;

    // === Context (Multi-tenant) ===
    organizationId?: string;
    eventId?: string;
    departmentId?: string;
    serviceId?: string;

    // === Action Details ===
    subAction?: string;

    // === Target Resource ===
    targetResource?: string;
    targetId?: string;
    targetName?: string;

    // === Change Tracking ===
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changes?: Record<string, any>;

    // === Request Context ===
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestPath?: string;
    requestId?: string;

    // === Result ===
    status?: AuditStatus | string;
    errorMessage?: string;
    errorCode?: string;

    // === Performance ===
    durationMs?: number;

    // === Additional Data ===
    metadata?: Record<string, any>;
    description?: string;
}

/**
 * Context extracted from Express request
 */
export interface RequestContext {
    userId?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestPath?: string;
    requestId?: string;
}

// =============================================
// Audit Logger Class
// =============================================

class AuditLogger {
    private prisma: PrismaClient | null = null;
    private isInitialized = false;
    private pendingLogs: AuditLogInput[] = [];
    private flushInterval: NodeJS.Timeout | null = null;
    private batchSize = 50;
    private flushIntervalMs = 5000;

    /**
     * Initialize the audit logger with Prisma client
     * Call this once during application startup
     */
    initialize(prismaClient: PrismaClient): void {
        this.prisma = prismaClient;
        this.isInitialized = true;

        // Start background flush for pending logs
        this.startBackgroundFlush();

        logger.info('Audit logger initialized');
    }

    /**
     * Start background flush timer for batch inserts
     */
    private startBackgroundFlush(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }

        this.flushInterval = setInterval(() => {
            this.flushPendingLogs().catch(err => {
                logger.error('Error flushing audit logs:', err);
            });
        }, this.flushIntervalMs);
    }

    /**
     * Flush pending logs to database
     */
    private async flushPendingLogs(): Promise<void> {
        if (this.pendingLogs.length === 0 || !this.prisma) return;

        const logsToFlush = this.pendingLogs.splice(0, this.batchSize);

        try {
            await this.prisma.sps_audit_logs.createMany({
                data: logsToFlush.map(log => this.transformToDbRecord(log)),
            });
            logger.debug(`Flushed ${logsToFlush.length} audit logs`);
        } catch (error) {
            // Put logs back at the beginning of the queue
            this.pendingLogs.unshift(...logsToFlush);
            logger.error('Failed to flush audit logs, will retry', { error: error instanceof Error ? error.message : String(error) });
        }
    }

    /**
     * Transform input to database record format
     */
    private transformToDbRecord(input: AuditLogInput): any {
        return {
            source_type: input.sourceType,
            actor_user_id: input.actorUserId || null,
            actor_device_id: input.actorDeviceId || null,
            actor_device_code: input.actorDeviceCode || null,
            actor_api_key_id: input.actorApiKeyId || null,
            organization_id: input.organizationId || null,
            event_id: input.eventId || null,
            department_id: input.departmentId || null,
            service_id: input.serviceId || null,
            category: input.category,
            action: input.action,
            sub_action: input.subAction || null,
            target_resource: input.targetResource || null,
            target_id: input.targetId || null,
            target_name: input.targetName || null,
            old_values: input.oldValues || null,
            new_values: input.newValues || null,
            changes: input.changes || null,
            ip_address: input.ipAddress || null,
            user_agent: input.userAgent || null,
            request_method: input.requestMethod || null,
            request_path: input.requestPath || null,
            request_id: input.requestId || null,
            status: input.status || AuditStatus.SUCCESS,
            error_message: input.errorMessage || null,
            error_code: input.errorCode || null,
            duration_ms: input.durationMs || null,
            metadata: input.metadata || {},
            description: input.description || this.generateDescription(input),
        };
    }

    /**
     * Generate a human-readable description of the action
     */
    private generateDescription(input: AuditLogInput): string {
        const actor = input.actorUserId
            ? `User ${input.actorUserId.substring(0, 8)}...`
            : input.actorDeviceCode
                ? `Device ${input.actorDeviceCode}`
                : 'System';

        const target = input.targetName
            ? input.targetName
            : input.targetId
                ? `${input.targetResource || 'resource'} ${input.targetId.substring(0, 8)}...`
                : input.targetResource || '';

        return `${actor} performed ${input.action} on ${target}`.trim();
    }

    /**
     * Log an audit entry
     * This is the main method to call for logging audit events
     * 
     * @param input - The audit log input parameters
     * @param immediate - If true, write immediately instead of batching (default: false)
     */
    async log(input: AuditLogInput, immediate = false): Promise<void> {
        if (!this.isInitialized || !this.prisma) {
            logger.warn('Audit logger not initialized, queueing log for later');
            this.pendingLogs.push(input);
            return;
        }

        // Validate required fields
        if (!input.sourceType || !input.category || !input.action) {
            logger.error('Missing required audit log fields:', { sourceType: input.sourceType, category: input.category, action: input.action });
            return;
        }

        if (immediate) {
            // Write immediately for critical events
            try {
                await this.prisma.sps_audit_logs.create({
                    data: this.transformToDbRecord(input),
                });
            } catch (error) {
                logger.error('Failed to write immediate audit log', { error: error instanceof Error ? error.message : String(error) });
                // Queue for retry
                this.pendingLogs.push(input);
            }
        } else {
            // Add to batch queue
            this.pendingLogs.push(input);

            // Flush if batch is full
            if (this.pendingLogs.length >= this.batchSize) {
                await this.flushPendingLogs();
            }
        }
    }

    /**
     * Log a user action (convenience method)
     */
    async logUserAction(
        userId: string,
        category: AuditCategory | string,
        action: AuditAction | string,
        options: Partial<AuditLogInput> = {}
    ): Promise<void> {
        await this.log({
            sourceType: AuditSourceType.USER,
            category,
            action,
            actorUserId: userId,
            ...options,
        });
    }

    /**
     * Log a device action (convenience method)
     */
    async logDeviceAction(
        deviceId: number,
        deviceCode: string,
        organizationId: string,
        action: AuditAction | string,
        options: Partial<AuditLogInput> = {}
    ): Promise<void> {
        await this.log({
            sourceType: AuditSourceType.DEVICE,
            category: AuditCategory.DEVICE,
            action,
            actorDeviceId: deviceId,
            actorDeviceCode: deviceCode,
            organizationId,
            ...options,
        });
    }

    /**
     * Log a system action (convenience method)
     */
    async logSystemAction(
        category: AuditCategory | string,
        action: AuditAction | string,
        options: Partial<AuditLogInput> = {}
    ): Promise<void> {
        await this.log({
            sourceType: AuditSourceType.SYSTEM,
            category,
            action,
            ...options,
        });
    }

    /**
     * Log authentication event (convenience method)
     */
    async logAuth(
        action: AuditAction | string,
        options: Partial<AuditLogInput> = {}
    ): Promise<void> {
        await this.log({
            sourceType: AuditSourceType.USER,
            category: AuditCategory.AUTH,
            action,
            ...options,
        }, true); // Auth events are immediate
    }

    /**
     * Extract request context from Express request object
     */
    extractRequestContext(req: any): RequestContext {
        return {
            userId: req.user?.id,
            organizationId: req.user?.organization_id,
            ipAddress: req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for'],
            userAgent: req.headers?.['user-agent'],
            requestMethod: req.method,
            requestPath: req.originalUrl || req.url,
            requestId: req.headers?.['x-request-id'] || req.id,
        };
    }

    /**
     * Create audit log with request context (convenience method)
     */
    async logWithRequest(
        req: any,
        category: AuditCategory | string,
        action: AuditAction | string,
        options: Partial<AuditLogInput> = {}
    ): Promise<void> {
        const ctx = this.extractRequestContext(req);

        await this.log({
            sourceType: ctx.userId ? AuditSourceType.USER : AuditSourceType.API,
            category,
            action,
            actorUserId: ctx.userId,
            organizationId: options.organizationId || ctx.organizationId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            requestMethod: ctx.requestMethod,
            requestPath: ctx.requestPath,
            requestId: ctx.requestId,
            ...options,
        });
    }

    /**
     * Shutdown the audit logger gracefully
     */
    async shutdown(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }

        // Final flush
        await this.flushPendingLogs();

        logger.info('Audit logger shutdown complete');
    }

    /**
     * Get pending logs count (for monitoring)
     */
    getPendingLogsCount(): number {
        return this.pendingLogs.length;
    }
}

// =============================================
// Singleton Export
// =============================================

/**
 * Singleton audit logger instance
 * Initialize once during application startup:
 * ```typescript
 * import { auditLogger } from '@sustainpro/shared-utils';
 * import { getPrismaClient } from '@sustainpro/shared-database';
 * 
 * auditLogger.initialize(getPrismaClient());
 * ```
 */
export const auditLogger = new AuditLogger();

// =============================================
// Helper Functions
// =============================================

/**
 * Calculate diff between old and new values
 * Returns only the changed fields
 */
export function calculateChanges(
    oldValues: Record<string, any>,
    newValues: Record<string, any>
): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    // Check all keys in new values
    for (const key of Object.keys(newValues)) {
        const oldVal = oldValues[key];
        const newVal = newValues[key];

        // Compare as JSON strings for objects/arrays
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes[key] = { old: oldVal, new: newVal };
        }
    }

    // Check for removed keys
    for (const key of Object.keys(oldValues)) {
        if (!(key in newValues)) {
            changes[key] = { old: oldValues[key], new: undefined };
        }
    }

    return changes;
}

/**
 * Mask sensitive fields in data for logging
 * Replaces values of sensitive fields with '***MASKED***'
 */
export function maskSensitiveData(
    data: Record<string, any>,
    sensitiveFields: string[] = ['password', 'password_hash', 'secret', 'token', 'api_key', 'credit_card', 'ssn']
): Record<string, any> {
    const masked = { ...data };

    for (const key of Object.keys(masked)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
            masked[key] = '***MASKED***';
        } else if (typeof masked[key] === 'object' && masked[key] !== null) {
            masked[key] = maskSensitiveData(masked[key], sensitiveFields);
        }
    }

    return masked;
}

// Default export
export default auditLogger;
