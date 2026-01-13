import { getPrismaClient } from '@sustainpro/shared-database';
import { Organization, CreateOrganizationDto, UpdateOrganizationDto } from '@sustainpro/shared-types';

const prisma = getPrismaClient();

export class OrganizationRepository {
    /**
     * Get all organizations
     */
    async findAll(organizationId?: string | null): Promise<Organization[]> {
        const where = organizationId ? { id: organizationId } : {};
        
        const orgs = await prisma.sps_organizations.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });

        return orgs as any as Organization[];
    }

    /**
     * Get organization by ID
     */
    async findById(id: string): Promise<Organization | null> {
        const org = await prisma.sps_organizations.findUnique({
            where: { id }
        });
        
        return org as any as Organization | null;
    }

    /**
     * Get organization by slug
     */
    async findBySlug(slug: string): Promise<Organization | null> {
        const org = await prisma.sps_organizations.findFirst({
            where: { slug }
        });
        
        return org as any as Organization | null;
    }

    /**
     * Create a new organization
     */
    async create(data: CreateOrganizationDto & { code: string }): Promise<Organization> {
        const org = await prisma.sps_organizations.create({
            data: {
                name: data.name,
                slug: data.slug || this.generateSlug(data.name),
                code: data.code,
                type: data.type || 'CLIENT',
                description: data.description || null,
                industry: data.industry || null,
                timezone: data.timezone || 'UTC',
                contact_email: data.contact_email || null,
            }
        });
        
        return org as any as Organization;
    }

    /**
     * Update organization
     */
    async update(id: string, data: UpdateOrganizationDto): Promise<Organization | null> {
        const updateData: any = {};
        
        const allowedFields: (keyof UpdateOrganizationDto)[] = [
            'name', 'description', 'industry', 'website', 'logo_url',
            'timezone', 'address', 'city', 'country', 'phone',
            'contact_email', 'theme_config'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updateData[field] = field === 'theme_config' 
                    ? JSON.stringify(data[field]) 
                    : data[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return this.findById(id);
        }

        const org = await prisma.sps_organizations.update({
            where: { id },
            data: updateData
        });
        
        return org as any as Organization;
    }

    /**
     * Delete organization
     */
    async delete(id: string): Promise<boolean> {
        try {
            await prisma.sps_organizations.delete({
                where: { id }
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Generate next organization code
     */
    async generateCode(): Promise<string> {
        const lastOrg = await prisma.sps_organizations.findFirst({
            where: {
                code: {
                    startsWith: 'SPS-ORG-'
                }
            },
            orderBy: { code: 'desc' },
            select: { code: true }
        });

        let nextId = 1;
        if (lastOrg?.code) {
            const parts = lastOrg.code.split('-');
            const lastNum = parseInt(parts[2]);
            if (!isNaN(lastNum)) {
                nextId = lastNum + 1;
            }
        }

        return `SPS-ORG-${nextId.toString().padStart(3, '0')}`;
    }

    /**
     * Get organization with full structure (events, departments)
     */
    async getFullStructure(id: string): Promise<any> {
        const org = await this.findById(id);
        if (!org) return null;

        // Get events with departments
        const events = await prisma.sps_events.findMany({
            where: { organization_id: id },
            orderBy: { created_at: 'desc' }
        });

        // Get departments for each event with service count
        const eventsWithDepts = await Promise.all(
            events.map(async (event: any) => {
                const departments = await prisma.$queryRaw`
                    SELECT d.*, 
                        (SELECT COUNT(*) FROM sps_department_services ds WHERE ds.department_id = d.id)::int as services_count
                    FROM sps_departments d 
                    WHERE d.event_id = ${event.id}
                ` as any[];
                
                return { ...event, departments };
            })
        );

        // Get all departments across all events
        const allDepartments = await prisma.sps_departments.findMany({
            where: {
                event_id: { in: events.map(e => e.id) }
            }
        });

        // Get all services across all departments
        const allServices = await prisma.sps_department_services.findMany({
            where: {
                department_id: { in: allDepartments.map(d => d.id) }
            },
            include: {
                sps_service_templates: {
                    select: {
                        name: true
                    }
                }
            }
        });

        // Map services with their definition names
        const servicesWithDetails = allServices.map((svc: any) => ({
            ...svc,
            definition_name: svc.sps_service_templates?.name
        }));

        // Get user count
        const userCount = await prisma.sps_users.count({
            where: { organization_id: id }
        });

        // Get device count
        const deviceCount = await prisma.sps_devices.count({
            where: { organization_id: id }
        });

        return {
            ...org,
            events: eventsWithDepts,
            departments: allDepartments,
            services: servicesWithDetails,
            user_count: userCount,
            device_count: deviceCount,
        };
    }

    /**
     * Generate slug from name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
