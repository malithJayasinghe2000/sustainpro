import { OrganizationRepository } from '../repositories/organization.repository';
import { Organization, CreateOrganizationDto, UpdateOrganizationDto } from '@sustainpro/shared-types';
import { NotFoundError, ConflictError, createLogger } from '@sustainpro/shared-utils';
import { publishEvent } from '../messaging/publisher';

const logger = createLogger({ service: 'core-service' });

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
     * Create new organization
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
