import { Request, Response, NextFunction } from 'express';
import { EscalationPolicyRepository, CreateEscalationPolicyDTO, UpdateEscalationPolicyDTO } from '../repositories/escalation-policy.repository';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'escalation-policy-controller' });
const escalationPolicyRepo = new EscalationPolicyRepository();

/**
 * Get all escalation policies
 * GET /escalation-policies
 * Query: service_id?, event_id?, is_active?
 */
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { service_id, event_id, is_active } = req.query;

        if (!user?.organization_id) {
            res.status(403).json({
                success: false,
                error: 'Organization context required',
            });
            return;
        }

        const policies = await escalationPolicyRepo.findAll(user.organization_id, {
            service_id: service_id as string | undefined,
            event_id: event_id as string | undefined,
            is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        });

        res.json({
            success: true,
            data: policies,
        });
    } catch (error) {
        logger.error('Error fetching escalation policies', { error });
        next(error);
    }
};

/**
 * Get escalation policy by ID
 * GET /escalation-policies/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const policy = await escalationPolicyRepo.findById(id);

        if (!policy) {
            res.status(404).json({
                success: false,
                error: 'Escalation policy not found',
            });
            return;
        }

        res.json({
            success: true,
            data: policy,
        });
    } catch (error) {
        logger.error('Error fetching escalation policy', { error });
        next(error);
    }
};

/**
 * Get escalation policies by service
 * GET /escalation-policies/service/:serviceId
 */
export const getByService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const policies = await escalationPolicyRepo.findByService(serviceId);

        res.json({
            success: true,
            data: policies,
        });
    } catch (error) {
        logger.error('Error fetching escalation policies by service', { error });
        next(error);
    }
};

/**
 * Create a new escalation policy
 * POST /escalation-policies
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { name, description, escalation_level, escalation_delay_minutes, auto_assign_to, notify_method, is_active, event_id, service_id } = req.body;

        // Validate required fields
        if (!name || escalation_level === undefined) {
            res.status(400).json({
                success: false,
                error: 'name and escalation_level are required',
            });
            return;
        }

        const policyData: CreateEscalationPolicyDTO = {
            organization_id: req.body.organization_id || user?.organization_id,
            name,
            description,
            escalation_level,
            escalation_delay_minutes,
            auto_assign_to,
            notify_method,
            is_active,
            event_id,
            service_id,
        };

        const policy = await escalationPolicyRepo.create(policyData);

        logger.info('Escalation policy created', {
            id: policy.id,
            name: policy.name,
            level: policy.escalation_level,
            createdBy: user?.id,
        });

        res.status(201).json({
            success: true,
            data: policy,
        });
    } catch (error) {
        logger.error('Error creating escalation policy', { error });
        next(error);
    }
};

/**
 * Create multiple escalation policies (bulk)
 * POST /escalation-policies/bulk
 */
export const createBulk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { policies } = req.body;

        if (!policies || !Array.isArray(policies) || policies.length === 0) {
            res.status(400).json({
                success: false,
                error: 'policies array is required and must not be empty',
            });
            return;
        }

        // Add organization_id to each policy if not provided
        const policiesToCreate: CreateEscalationPolicyDTO[] = policies.map((policy: any) => ({
            ...policy,
            organization_id: policy.organization_id || user?.organization_id,
        }));

        const createdPolicies = await escalationPolicyRepo.createBulk(policiesToCreate);

        logger.info('Bulk escalation policies created', {
            count: createdPolicies.length,
            createdBy: user?.id,
        });

        res.status(201).json({
            success: true,
            data: createdPolicies,
        });
    } catch (error) {
        logger.error('Error creating bulk escalation policies', { error });
        next(error);
    }
};

/**
 * Update an escalation policy
 * PUT /escalation-policies/:id
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const updateData: UpdateEscalationPolicyDTO = req.body;

        const existing = await escalationPolicyRepo.findById(id);
        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Escalation policy not found',
            });
            return;
        }

        const updated = await escalationPolicyRepo.update(id, updateData);

        logger.info('Escalation policy updated', {
            id,
            updatedBy: user?.id,
        });

        res.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        logger.error('Error updating escalation policy', { error });
        next(error);
    }
};

/**
 * Delete an escalation policy
 * DELETE /escalation-policies/:id
 */
export const deletePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const existing = await escalationPolicyRepo.findById(id);
        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Escalation policy not found',
            });
            return;
        }

        await escalationPolicyRepo.delete(id);

        logger.info('Escalation policy deleted', {
            id,
            deletedBy: user?.id,
        });

        res.json({
            success: true,
            message: 'Escalation policy deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting escalation policy', { error });
        next(error);
    }
};
