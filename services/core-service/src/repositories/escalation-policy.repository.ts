import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// =============================================
// TYPE DEFINITIONS
// =============================================

export type NotifyMethod = 'email' | 'sms' | 'push' | 'all';

export interface EscalationPolicy {
    id: string;
    organization_id: string;
    event_id: string | null;
    service_id: string | null;
    name: string;
    description: string | null;
    escalation_level: number;
    escalation_delay_minutes: number;
    auto_assign_to: string | null;
    notify_method: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    // Related user info
    assigned_user?: {
        id: string;
        full_name: string | null;
        email: string;
    } | null;
}

export interface CreateEscalationPolicyDTO {
    organization_id: string;
    event_id?: string;
    service_id?: string;
    name: string;
    description?: string;
    escalation_level: number;
    escalation_delay_minutes?: number;
    auto_assign_to?: string;
    notify_method?: NotifyMethod;
    is_active?: boolean;
}

export interface UpdateEscalationPolicyDTO {
    name?: string;
    description?: string;
    escalation_level?: number;
    escalation_delay_minutes?: number;
    auto_assign_to?: string;
    notify_method?: NotifyMethod;
    is_active?: boolean;
}

// =============================================
// REPOSITORY CLASS
// =============================================

export class EscalationPolicyRepository {
    /**
     * Find all escalation policies for an organization
     */
    async findAll(organizationId: string, filters?: {
        service_id?: string;
        event_id?: string;
        is_active?: boolean;
    }): Promise<EscalationPolicy[]> {
        const whereClause: any = { organization_id: organizationId };

        if (filters?.service_id) {
            whereClause.service_id = filters.service_id;
        }
        if (filters?.event_id) {
            whereClause.event_id = filters.event_id;
        }
        if (filters?.is_active !== undefined) {
            whereClause.is_active = filters.is_active;
        }

        const policies = await prisma.sps_escalation_policies.findMany({
            where: whereClause,
            include: {
                sps_users: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { escalation_level: 'asc' },
                { created_at: 'desc' },
            ],
        });

        return policies.map(this.mapToEscalationPolicy);
    }

    /**
     * Find escalation policy by ID
     */
    async findById(id: string): Promise<EscalationPolicy | null> {
        const policy = await prisma.sps_escalation_policies.findUnique({
            where: { id },
            include: {
                sps_users: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
        });

        return policy ? this.mapToEscalationPolicy(policy) : null;
    }

    /**
     * Find escalation policies by service
     */
    async findByService(serviceId: string): Promise<EscalationPolicy[]> {
        const policies = await prisma.sps_escalation_policies.findMany({
            where: { service_id: serviceId },
            include: {
                sps_users: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
            orderBy: { escalation_level: 'asc' },
        });

        return policies.map(this.mapToEscalationPolicy);
    }

    /**
     * Create a new escalation policy
     */
    async create(data: CreateEscalationPolicyDTO): Promise<EscalationPolicy> {
        const policy = await prisma.sps_escalation_policies.create({
            data: {
                organization_id: data.organization_id,
                event_id: data.event_id || null,
                service_id: data.service_id || null,
                name: data.name,
                description: data.description || null,
                escalation_level: data.escalation_level,
                escalation_delay_minutes: data.escalation_delay_minutes ?? 15,
                auto_assign_to: data.auto_assign_to || null,
                notify_method: data.notify_method || 'email',
                is_active: data.is_active ?? true,
            },
            include: {
                sps_users: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
        });

        return this.mapToEscalationPolicy(policy);
    }

    /**
     * Create multiple escalation policies
     */
    async createBulk(policies: CreateEscalationPolicyDTO[]): Promise<EscalationPolicy[]> {
        const created: EscalationPolicy[] = [];
        
        for (const data of policies) {
            const policy = await this.create(data);
            created.push(policy);
        }
        
        return created;
    }

    /**
     * Update an escalation policy
     */
    async update(id: string, data: UpdateEscalationPolicyDTO): Promise<EscalationPolicy> {
        const policy = await prisma.sps_escalation_policies.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.escalation_level !== undefined && { escalation_level: data.escalation_level }),
                ...(data.escalation_delay_minutes !== undefined && { escalation_delay_minutes: data.escalation_delay_minutes }),
                ...(data.auto_assign_to !== undefined && { auto_assign_to: data.auto_assign_to }),
                ...(data.notify_method !== undefined && { notify_method: data.notify_method }),
                ...(data.is_active !== undefined && { is_active: data.is_active }),
                updated_at: new Date(),
            },
            include: {
                sps_users: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                    },
                },
            },
        });

        return this.mapToEscalationPolicy(policy);
    }

    /**
     * Delete an escalation policy
     */
    async delete(id: string): Promise<void> {
        await prisma.sps_escalation_policies.delete({
            where: { id },
        });
    }

    /**
     * Map database model to interface
     */
    private mapToEscalationPolicy(policy: any): EscalationPolicy {
        return {
            id: policy.id,
            organization_id: policy.organization_id,
            event_id: policy.event_id,
            service_id: policy.service_id,
            name: policy.name,
            description: policy.description,
            escalation_level: policy.escalation_level,
            escalation_delay_minutes: policy.escalation_delay_minutes,
            auto_assign_to: policy.auto_assign_to,
            notify_method: policy.notify_method,
            is_active: policy.is_active ?? true,
            created_at: policy.created_at,
            updated_at: policy.updated_at,
            assigned_user: policy.sps_users ? {
                id: policy.sps_users.id,
                full_name: policy.sps_users.full_name,
                email: policy.sps_users.email,
            } : null,
        };
    }
}
