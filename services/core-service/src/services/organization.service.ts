import { OrganizationRepository } from '../repositories/organization.repository';
import { Organization, CreateOrganizationDto, UpdateOrganizationDto } from '@sustainpro/shared-types';
import { NotFoundError, ConflictError, createLogger } from '@sustainpro/shared-utils';
import { publishEvent } from '../messaging/publisher';
import { getPrismaClient } from '@sustainpro/shared-database';
import argon2 from 'argon2';

const logger = createLogger({ service: 'core-service' });
const prisma = getPrismaClient();

export class OrganizationService {
    private repo = new OrganizationRepository();

    /**
     * Get all organizations
     */
    async getAll(organizationId?: string | null): Promise<Organization[]> {
        return this.repo.findAll(organizationId);
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
    async create(data: CreateOrganizationDto, createdBy?: string): Promise<Organization> {
        // Check for duplicate slug
        const slug = data.slug || this.generateSlug(data.name);
        const existing = await this.repo.findBySlug(slug);
        if (existing) {
            throw new ConflictError('Organization with this slug already exists');
        }

        // Generate code
        const code = await this.repo.generateCode();

        const org = await this.repo.create({ ...data, slug, code });

        logger.info('Organization created', { orgId: org.id, name: org.name });

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
                }
            } catch (error) {
                logger.error('Failed to create admin user', { error, orgId: org.id });
                // Don't fail the whole operation if user creation fails
                // The org is already created
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
    async update(id: string, data: UpdateOrganizationDto): Promise<Organization> {
        const org = await this.repo.update(id, data);
        if (!org) {
            throw new NotFoundError('Organization', id);
        }

        logger.info('Organization updated', { orgId: id });

        await publishEvent('organization.updated', {
            organization_id: id,
            updates: Object.keys(data),
        });

        return org;
    }

    /**
     * Delete organization
     */
    async delete(id: string): Promise<void> {
        const deleted = await this.repo.delete(id);
        if (!deleted) {
            throw new NotFoundError('Organization', id);
        }

        logger.info('Organization deleted', { orgId: id });

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

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
