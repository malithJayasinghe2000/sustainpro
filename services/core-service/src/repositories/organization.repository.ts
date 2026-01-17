import { getPrismaClient } from '@sustainpro/shared-database';
import { Organization, CreateOrganizationDto, UpdateOrganizationDto } from '@sustainpro/shared-types';

const prisma = getPrismaClient();

export class OrganizationRepository {
    /**
     * Get all organizations
     */
    async findAll(
        organizationId?: string | null,
        params?: { page?: number; limit?: number; search?: string }
    ): Promise<{ data: Organization[]; total: number }> {
        const where: any = organizationId ? { id: organizationId } : {};

        if (params?.search) {
            const searchLower = params.search.toLowerCase();
            if (!organizationId) {
                // Only filter by fields if not fetching a specific ID (or combine?)
                // If specific ID is requested, search is redundant but harmless unless filtered out
                where.OR = [
                    { name: { contains: params.search, mode: 'insensitive' } },
                    { code: { contains: params.search, mode: 'insensitive' } },
                    { industry: { contains: params.search, mode: 'insensitive' } },
                    { slug: { contains: params.search, mode: 'insensitive' } }
                ];
            }
        }

        // Default pagination
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const skip = (page - 1) * limit;

        const [orgs, total] = await Promise.all([
            prisma.sps_organizations.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
                include: {
                    _count: {
                        select: {
                            sps_users: true,
                            sps_devices: true
                        }
                    }
                }
            }),
            prisma.sps_organizations.count({ where })
        ]);

        const data = orgs.map(org => ({
            ...org,
            user_count: org._count.sps_users,
            device_count: org._count.sps_devices,
        })) as any as Organization[];

        return { data, total };
    }

    /**
     * Get organization by ID or Code
     */
    async findById(idOrCode: string): Promise<Organization | null> {
        // Check if it looks like a UUID or an organization code
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);

        let org;
        if (isUuid) {
            org = await prisma.sps_organizations.findUnique({
                where: { id: idOrCode },
                include: {
                    _count: {
                        select: {
                            sps_users: true,
                            sps_devices: true
                        }
                    }
                }
            });
        } else {
            // Try finding by code
            org = await prisma.sps_organizations.findFirst({
                where: { code: idOrCode },
                include: {
                    _count: {
                        select: {
                            sps_users: true,
                            sps_devices: true
                        }
                    }
                }
            });
        }

        if (!org) return null;

        return {
            ...org,
            user_count: org._count.sps_users,
            device_count: org._count.sps_devices
        } as any as Organization;
    }

    /**
     * Get organization by slug
     */
    async findBySlug(slug: string): Promise<Organization | null> {
        const org = await prisma.sps_organizations.findFirst({
            where: { slug },
            include: {
                _count: {
                    select: {
                        sps_users: true,
                        sps_devices: true
                    }
                }
            }
        });

        if (!org) return null;

        return {
            ...org,
            user_count: org._count.sps_users,
            device_count: org._count.sps_devices
        } as any as Organization;
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
                website: data.website || null,
                logo_url: data.logo_url || null,
                timezone: data.timezone || 'UTC',
                address: data.address || null,
                city: data.city || null,
                country: data.country || null,
                phone: data.phone || null,
                contact_email: data.contact_email || null,
                theme_config: data.theme_config || undefined,
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
                updateData[field] = data[field];
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

        // Format flat lists for frontend dropdowns
        const departments = allDepartments.map((d: any) => {
            const event = events.find((e: any) => e.id === d.event_id);
            return {
                id: d.id,
                name: d.name,
                event_id: d.event_id,
                event_name: event?.name
            };
        });

        const services = allServices.map((s: any) => {
            const dept = allDepartments.find((d: any) => d.id === s.department_id);
            return {
                id: s.id,
                name: s.name,
                department_id: s.department_id,
                department_name: dept?.name,
                definition_name: s.definition_name || s.template_name || 'Service'
            };
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

    /**
     * Get organization statistics
     */
    async getStats() {
        const [total, providers, partners, clients] = await Promise.all([
            prisma.sps_organizations.count(),
            prisma.sps_organizations.count({ where: { type: 'PROVIDER' } }),
            prisma.sps_organizations.count({ where: { type: 'PARTNER' } }),
            prisma.sps_organizations.count({ where: { type: 'CLIENT' } })
        ]);

        return {
            total,
            providers,
            partners,
            clients
        };
    }
}
