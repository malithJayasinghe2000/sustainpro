import { OrganizationRepository } from '../repositories/organization.repository';
import { Organization, CreateOrganizationDto, UpdateOrganizationDto } from '@sustainpro/shared-types';
import {
    NotFoundError,
    ConflictError,
    createLogger,
    auditLogger,
    AuditAction,
    AuditCategory,
    AuditStatus,
    AuditSourceType,
    calculateChanges,
    maskSensitiveData,
} from '@sustainpro/shared-utils';
import { publishEvent } from '../messaging/publisher';
import { getPrismaClient } from '@sustainpro/shared-database';
import argon2 from 'argon2';

const logger = createLogger({ service: 'core-service' });
const prisma = getPrismaClient();

/**
 * Audit context passed from controllers
 */
export interface AuditContext {
    actorUserId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestPath?: string;
}

export class OrganizationService {
    private repo = new OrganizationRepository();

    /**
     * Get all organizations
     */
    async getAll(
        organizationId?: string | null,
        params?: { page?: number; limit?: number; search?: string }
    ): Promise<{ data: Organization[]; total: number }> {
        return this.repo.findAll(organizationId, params);
    }

    /**
     * Get organization by ID
     */
    async getById(id: string): Promise<Organization> {
        const org = await this.repo.findById(id);
        if (!org) {
            throw new NotFoundError('Organization', id);
        }
        return org;
    }

    /**
     * Create new organization with optional admin user
     */
    async create(data: CreateOrganizationDto, createdBy?: string, auditCtx?: AuditContext): Promise<Organization> {
        const startTime = Date.now();

        // Check for duplicate slug
        const slug = data.slug || this.generateSlug(data.name);
        const existing = await this.repo.findBySlug(slug);
        if (existing) {
            // Log failed creation attempt
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.ORGANIZATION,
                action: AuditAction.CREATE,
                actorUserId: auditCtx?.actorUserId || createdBy,
                status: AuditStatus.FAILURE,
                errorMessage: 'Organization with this slug already exists',
                newValues: maskSensitiveData({ name: data.name, slug }),
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw new ConflictError('Organization with this slug already exists');
        }

        // Generate code
        const code = await this.repo.generateCode();

        const org = await this.repo.create({ ...data, slug, code });

        logger.info('Organization created', { orgId: org.id, name: org.name });

        // Log organization creation
        await auditLogger.log({
            sourceType: AuditSourceType.USER,
            category: AuditCategory.ORGANIZATION,
            action: AuditAction.CREATE,
            actorUserId: auditCtx?.actorUserId || createdBy,
            organizationId: org.id,
            targetResource: 'organization',
            targetId: org.id,
            targetName: org.name,
            status: AuditStatus.SUCCESS,
            newValues: maskSensitiveData({
                name: org.name,
                slug: org.slug,
                code: org.code,
                type: org.type,
                industry: org.industry,
            }),
            ipAddress: auditCtx?.ipAddress,
            userAgent: auditCtx?.userAgent,
            description: `Organization "${org.name}" created`,
            durationMs: Date.now() - startTime,
        });

        // Create admin user if admin details are provided
        if (data.admin_email && data.admin_password) {
            try {
                // Check if email already exists
                const existingUser = await prisma.sps_users.findUnique({
                    where: { email: data.admin_email }
                });

                if (existingUser) {
                    logger.warn('Admin email already exists, skipping user creation', { email: data.admin_email });
                } else {
                    // Hash password
                    const passwordHash = await argon2.hash(data.admin_password);

                    // Generate user code
                    const userCode = `SPS-USR-${Date.now().toString(36).toUpperCase()}`;

                    // Create the admin user
                    const adminUser = await prisma.sps_users.create({
                        data: {
                            email: data.admin_email,
                            password_hash: passwordHash,
                            full_name: data.admin_name || 'Organization Admin',
                            organization_id: org.id,
                            code: userCode,
                            is_active: true,
                            is_super_admin: false,
                            timezone: data.timezone || 'UTC',
                        }
                    });

                    // Assign ORG_ADMIN role to the user
                    await prisma.sps_role_assignments.create({
                        data: {
                            user_id: adminUser.id,
                            role: 'ORG_ADMIN',
                            org_id: org.id,
                        }
                    });

                    logger.info('Admin user created for organization', {
                        userId: adminUser.id,
                        email: adminUser.email,
                        orgId: org.id
                    });

                    // Log admin user creation
                    await auditLogger.log({
                        sourceType: AuditSourceType.USER,
                        category: AuditCategory.USER,
                        action: AuditAction.CREATE,
                        actorUserId: auditCtx?.actorUserId || createdBy,
                        organizationId: org.id,
                        targetResource: 'user',
                        targetId: adminUser.id,
                        targetName: adminUser.email,
                        status: AuditStatus.SUCCESS,
                        newValues: {
                            email: adminUser.email,
                            full_name: adminUser.full_name,
                            role: 'ORG_ADMIN',
                        },
                        ipAddress: auditCtx?.ipAddress,
                        userAgent: auditCtx?.userAgent,
                        description: `Admin user "${adminUser.email}" created for organization "${org.name}"`,
                        metadata: { createdWithOrganization: true },
                    });
                }
            } catch (error) {
                logger.error('Failed to create admin user', { error, orgId: org.id });

                // Log failed user creation
                await auditLogger.log({
                    sourceType: AuditSourceType.USER,
                    category: AuditCategory.USER,
                    action: AuditAction.CREATE,
                    actorUserId: auditCtx?.actorUserId || createdBy,
                    organizationId: org.id,
                    status: AuditStatus.FAILURE,
                    errorMessage: (error as Error).message,
                    ipAddress: auditCtx?.ipAddress,
                    userAgent: auditCtx?.userAgent,
                    metadata: { attemptedEmail: data.admin_email },
                });
            }
        }

        // Publish event
        await publishEvent('organization.created', {
            organization_id: org.id,
            name: org.name,
            created_by: createdBy,
        });

        return org;
    }

    /**
     * Update organization
     */
    async update(id: string, data: UpdateOrganizationDto, auditCtx?: AuditContext): Promise<Organization> {
        const startTime = Date.now();

        // Get old values for change tracking
        const oldOrg = await this.repo.findById(id);
        if (!oldOrg) {
            // Log failed update attempt
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.ORGANIZATION,
                action: AuditAction.UPDATE,
                actorUserId: auditCtx?.actorUserId,
                targetResource: 'organization',
                targetId: id,
                status: AuditStatus.FAILURE,
                errorMessage: `Organization not found: ${id}`,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw new NotFoundError('Organization', id);
        }

        const org = await this.repo.update(id, data);
        if (!org) {
            throw new NotFoundError('Organization', id);
        }

        logger.info('Organization updated', { orgId: id });

        // Calculate what changed
        const changes = calculateChanges(oldOrg as any, org as any);

        // Log organization update
        await auditLogger.log({
            sourceType: AuditSourceType.USER,
            category: AuditCategory.ORGANIZATION,
            action: AuditAction.UPDATE,
            actorUserId: auditCtx?.actorUserId,
            organizationId: id,
            targetResource: 'organization',
            targetId: id,
            targetName: org.name,
            status: AuditStatus.SUCCESS,
            oldValues: maskSensitiveData(oldOrg as any),
            newValues: maskSensitiveData(org as any),
            changes,
            ipAddress: auditCtx?.ipAddress,
            userAgent: auditCtx?.userAgent,
            description: `Organization "${org.name}" updated (fields: ${Object.keys(data).join(', ')})`,
            durationMs: Date.now() - startTime,
        });

        await publishEvent('organization.updated', {
            organization_id: id,
            updates: Object.keys(data),
        });

        return org;
    }

    /**
     * Delete organization
     */
    async delete(id: string, auditCtx?: AuditContext): Promise<void> {
        const startTime = Date.now();

        // Get org info before deletion
        const org = await this.repo.findById(id);
        if (!org) {
            // Log failed delete attempt
            await auditLogger.log({
                sourceType: AuditSourceType.USER,
                category: AuditCategory.ORGANIZATION,
                action: AuditAction.DELETE,
                actorUserId: auditCtx?.actorUserId,
                targetResource: 'organization',
                targetId: id,
                status: AuditStatus.FAILURE,
                errorMessage: `Organization not found: ${id}`,
                ipAddress: auditCtx?.ipAddress,
                userAgent: auditCtx?.userAgent,
                durationMs: Date.now() - startTime,
            });
            throw new NotFoundError('Organization', id);
        }

        const deleted = await this.repo.delete(id);
        if (!deleted) {
            throw new NotFoundError('Organization', id);
        }

        logger.info('Organization deleted', { orgId: id });

        // Log organization deletion
        await auditLogger.log({
            sourceType: AuditSourceType.USER,
            category: AuditCategory.ORGANIZATION,
            action: AuditAction.DELETE,
            actorUserId: auditCtx?.actorUserId,
            organizationId: id,
            targetResource: 'organization',
            targetId: id,
            targetName: org.name,
            status: AuditStatus.SUCCESS,
            oldValues: maskSensitiveData({
                name: org.name,
                slug: org.slug,
                code: org.code,
            }),
            ipAddress: auditCtx?.ipAddress,
            userAgent: auditCtx?.userAgent,
            description: `Organization "${org.name}" deleted`,
            durationMs: Date.now() - startTime,
        });

        await publishEvent('organization.deleted', { organization_id: id });
    }

    /**
     * Get full organization structure
     */
    async getFullStructure(id: string): Promise<any> {
        const structure = await this.repo.getFullStructure(id);
        if (!structure) {
            throw new NotFoundError('Organization', id);
        }
        return structure;
    }

    /**
     * Get organization statistics
     */
    async getStats() {
        return this.repo.getStats();
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}

