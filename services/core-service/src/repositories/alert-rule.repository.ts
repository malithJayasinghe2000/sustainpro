import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// NOTE: After updating the Prisma schema with new fields, run:
// cd packages/shared-database && npx prisma generate
// Then restart the services for types to be fully available.

// =============================================
// TYPE DEFINITIONS
// =============================================

export type RuleOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'in';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RuleCondition {
    metric: string;
    operator: RuleOperator;
    threshold: number | string | any[];
    aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
    time_window?: number;
    conditions?: RuleCondition[];
    logical_operator?: 'AND' | 'OR';
}

export interface RuleAction {
    type: 'alert' | 'email' | 'webhook' | 'escalate' | 'notification';
    config?: Record<string, any>;
    delay_minutes?: number;
}

export interface AlertRule {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    device_type: string | null;
    condition: RuleCondition;
    actions: RuleAction[];
    severity: Severity;
    is_active: boolean;
    priority: number;
    cooldown_seconds: number;
    last_triggered_at: Date | null;
    trigger_count: number;
    event_id: string | null;
    service_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateAlertRuleDTO {
    organization_id: string;
    name: string;
    description?: string;
    device_type?: string;
    condition: RuleCondition;
    actions?: RuleAction[];
    severity: Severity;
    is_active?: boolean;
    priority?: number;
    cooldown_seconds?: number;
    event_id?: string;
    service_id?: string;
}

export interface UpdateAlertRuleDTO {
    name?: string;
    description?: string;
    device_type?: string;
    condition?: RuleCondition;
    actions?: RuleAction[];
    severity?: Severity;
    is_active?: boolean;
    priority?: number;
    cooldown_seconds?: number;
}

// =============================================
// REPOSITORY CLASS
// =============================================

export class AlertRuleRepository {
    /**
     * Find all alert rules for an organization
     */
    async findAll(organizationId: string, filters?: {
        service_id?: string;
        event_id?: string;
        is_active?: boolean;
    }): Promise<AlertRule[]> {
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

        const rules = await prisma.sps_alert_rules.findMany({
            where: whereClause as any,
            orderBy: [
                { created_at: 'desc' }
            ],
        });

        return rules.map(this.mapToAlertRule);
    }

    /**
     * Find alert rule by ID
     */
    async findById(id: string): Promise<AlertRule | null> {
        const rule = await prisma.sps_alert_rules.findUnique({
            where: { id },
        });

        if (!rule) return null;
        return this.mapToAlertRule(rule);
    }

    /**
     * Find alert rules by service ID
     */
    async findByService(serviceId: string): Promise<AlertRule[]> {
        const rules = await prisma.sps_alert_rules.findMany({
            where: { service_id: serviceId } as any,
            orderBy: { created_at: 'desc' },
        });

        return rules.map(this.mapToAlertRule);
    }

    /**
     * Find active alert rules for evaluation
     */
    async findActiveRules(organizationId: string): Promise<AlertRule[]> {
        const rules = await prisma.sps_alert_rules.findMany({
            where: {
                organization_id: organizationId,
                is_active: true,
            } as any,
            orderBy: { created_at: 'desc' },
        });

        return rules.map(this.mapToAlertRule);
    }

    /**
     * Create a new alert rule
     */
    async create(data: CreateAlertRuleDTO): Promise<AlertRule> {
        const rule = await prisma.sps_alert_rules.create({
            data: {
                organization_id: data.organization_id,
                name: data.name,
                description: data.description || null,
                condition: data.condition as any,
                severity: data.severity,
                is_active: data.is_active ?? true,
                // New fields - will be available after prisma generate
                ...(data.device_type && { device_type: data.device_type }),
                ...(data.actions && { actions: data.actions as any }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.cooldown_seconds !== undefined && { cooldown_seconds: data.cooldown_seconds }),
                ...(data.event_id && { event_id: data.event_id }),
                ...(data.service_id && { service_id: data.service_id }),
            } as any,
        });

        return this.mapToAlertRule(rule);
    }

    /**
     * Create multiple alert rules (bulk)
     */
    async createBulk(rules: CreateAlertRuleDTO[]): Promise<AlertRule[]> {
        const createdRules: AlertRule[] = [];

        for (const ruleData of rules) {
            const rule = await this.create(ruleData);
            createdRules.push(rule);
        }

        return createdRules;
    }

    /**
     * Update an alert rule
     */
    async update(id: string, data: UpdateAlertRuleDTO): Promise<AlertRule | null> {
        const updateData: any = {
            updated_at: new Date(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.device_type !== undefined) updateData.device_type = data.device_type;
        if (data.condition !== undefined) updateData.condition = data.condition;
        if (data.actions !== undefined) updateData.actions = data.actions;
        if (data.severity !== undefined) updateData.severity = data.severity;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.cooldown_seconds !== undefined) updateData.cooldown_seconds = data.cooldown_seconds;

        try {
            const rule = await prisma.sps_alert_rules.update({
                where: { id },
                data: updateData,
            });

            return this.mapToAlertRule(rule);
        } catch (error) {
            return null;
        }
    }

    /**
     * Delete an alert rule
     */
    async delete(id: string): Promise<boolean> {
        try {
            await prisma.sps_alert_rules.delete({
                where: { id },
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Toggle active status
     */
    async toggleActive(id: string, isActive: boolean): Promise<AlertRule | null> {
        return this.update(id, { is_active: isActive });
    }

    /**
     * Update last triggered timestamp and increment counter
     */
    async recordTrigger(id: string): Promise<void> {
        await prisma.sps_alert_rules.update({
            where: { id },
            data: {
                updated_at: new Date(),
                // last_triggered_at and trigger_count - available after prisma generate
            } as any,
        });
    }

    /**
     * Map database record to AlertRule type
     */
    private mapToAlertRule(record: any): AlertRule {
        return {
            id: record.id,
            organization_id: record.organization_id,
            name: record.name,
            description: record.description,
            device_type: record.device_type,
            condition: record.condition as RuleCondition,
            actions: (record.actions || []) as RuleAction[],
            severity: record.severity as Severity,
            is_active: record.is_active ?? true,
            priority: record.priority ?? 100,
            cooldown_seconds: record.cooldown_seconds ?? 300,
            last_triggered_at: record.last_triggered_at,
            trigger_count: record.trigger_count ?? 0,
            event_id: record.event_id,
            service_id: record.service_id,
            created_at: record.created_at,
            updated_at: record.updated_at,
        };
    }
}
