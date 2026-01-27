import { Request, Response, NextFunction } from 'express';
import { AlertRuleRepository, CreateAlertRuleDTO, UpdateAlertRuleDTO } from '../repositories/alert-rule.repository';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'alert-rule-controller' });
const alertRuleRepo = new AlertRuleRepository();

/**
 * Get all alert rules
 * GET /alert-rules
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

        const rules = await alertRuleRepo.findAll(user.organization_id, {
            service_id: service_id as string | undefined,
            event_id: event_id as string | undefined,
            is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
        });

        res.json({
            success: true,
            data: rules,
        });
    } catch (error) {
        logger.error('Error fetching alert rules', { error });
        next(error);
    }
};

/**
 * Get alert rule by ID
 * GET /alert-rules/:id
 */
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const rule = await alertRuleRepo.findById(id);

        if (!rule) {
            res.status(404).json({
                success: false,
                error: 'Alert rule not found',
            });
            return;
        }

        res.json({
            success: true,
            data: rule,
        });
    } catch (error) {
        logger.error('Error fetching alert rule', { error });
        next(error);
    }
};

/**
 * Get alert rules by service
 * GET /alert-rules/service/:serviceId
 */
export const getByService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { serviceId } = req.params;
        const rules = await alertRuleRepo.findByService(serviceId);

        res.json({
            success: true,
            data: rules,
        });
    } catch (error) {
        logger.error('Error fetching alert rules by service', { error });
        next(error);
    }
};

/**
 * Create a new alert rule
 * POST /alert-rules
 * Body: { name, description?, device_type?, condition, actions?, severity, is_active?, priority?, cooldown_seconds?, event_id?, service_id? }
 */
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { name, description, device_type, condition, actions, severity, is_active, priority, cooldown_seconds, event_id, service_id } = req.body;

        // Validate required fields
        if (!name || !condition || !severity) {
            res.status(400).json({
                success: false,
                error: 'name, condition, and severity are required',
            });
            return;
        }

        // Validate severity
        if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severity)) {
            res.status(400).json({
                success: false,
                error: 'severity must be one of: CRITICAL, HIGH, MEDIUM, LOW',
            });
            return;
        }

        // Validate condition structure
        if (!condition.metric || !condition.operator || condition.threshold === undefined) {
            res.status(400).json({
                success: false,
                error: 'condition must have metric, operator, and threshold',
            });
            return;
        }

        const ruleData: CreateAlertRuleDTO = {
            organization_id: req.body.organization_id || user?.organization_id,
            name,
            description,
            device_type,
            condition,
            actions,
            severity,
            is_active,
            priority,
            cooldown_seconds,
            event_id,
            service_id,
        };

        const rule = await alertRuleRepo.create(ruleData);

        logger.info('Alert rule created', {
            id: rule.id,
            name: rule.name,
            severity: rule.severity,
            createdBy: user?.id,
        });

        res.status(201).json({
            success: true,
            data: rule,
        });
    } catch (error) {
        logger.error('Error creating alert rule', { error });
        next(error);
    }
};

/**
 * Create multiple alert rules (bulk)
 * POST /alert-rules/bulk
 * Body: { rules: CreateAlertRuleDTO[] }
 */
export const createBulk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { rules } = req.body;

        if (!rules || !Array.isArray(rules) || rules.length === 0) {
            res.status(400).json({
                success: false,
                error: 'rules array is required and must not be empty',
            });
            return;
        }

        // Validate each rule
        for (const ruleData of rules) {
            if (!ruleData.name || !ruleData.condition || !ruleData.severity) {
                res.status(400).json({
                    success: false,
                    error: 'Each rule must have name, condition, and severity',
                });
                return;
            }
        }

        // Ensure organization_id is set for all rules
        const rulesWithOrg = rules.map((rule: any) => ({
            ...rule,
            organization_id: rule.organization_id || user?.organization_id,
        }));

        const createdRules = await alertRuleRepo.createBulk(rulesWithOrg);

        logger.info('Alert rules created (bulk)', {
            count: createdRules.length,
            createdBy: user?.id,
        });

        res.status(201).json({
            success: true,
            data: createdRules,
        });
    } catch (error) {
        logger.error('Error creating alert rules (bulk)', { error });
        next(error);
    }
};

/**
 * Update an alert rule
 * PUT /alert-rules/:id
 * Body: { name?, description?, device_type?, condition?, actions?, severity?, is_active?, priority?, cooldown_seconds? }
 */
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
        const updateData: UpdateAlertRuleDTO = req.body;

        // Validate severity if provided
        if (updateData.severity && !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(updateData.severity)) {
            res.status(400).json({
                success: false,
                error: 'severity must be one of: CRITICAL, HIGH, MEDIUM, LOW',
            });
            return;
        }

        const rule = await alertRuleRepo.update(id, updateData);

        if (!rule) {
            res.status(404).json({
                success: false,
                error: 'Alert rule not found',
            });
            return;
        }

        logger.info('Alert rule updated', { id, updatedBy: user?.id });

        res.json({
            success: true,
            data: rule,
        });
    } catch (error) {
        logger.error('Error updating alert rule', { error });
        next(error);
    }
};

/**
 * Delete an alert rule
 * DELETE /alert-rules/:id
 */
export const deleteRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { id } = req.params;

        const deleted = await alertRuleRepo.delete(id);

        if (!deleted) {
            res.status(404).json({
                success: false,
                error: 'Alert rule not found',
            });
            return;
        }

        logger.info('Alert rule deleted', { id, deletedBy: user?.id });

        res.json({
            success: true,
            message: 'Alert rule deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting alert rule', { error });
        next(error);
    }
};

/**
 * Toggle alert rule active status
 * PATCH /alert-rules/:id/toggle
 * Body: { is_active: boolean }
 */
export const toggleActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
        const { is_active } = req.body;

        logger.info('Toggling alert rule active status', { id, is_active, userId: user?.id });

        if (typeof is_active !== 'boolean') {
            logger.warn('Invalid is_active value for toggle', { id, is_active });
            res.status(400).json({
                success: false,
                error: 'is_active must be a boolean',
            });
            return;
        }

        const rule = await alertRuleRepo.toggleActive(id, is_active);

        if (!rule) {
            logger.warn('Alert rule not found for toggle', { id });
            res.status(404).json({
                success: false,
                error: 'Alert rule not found',
            });
            return;
        }

        logger.info('Alert rule toggled successfully', { id, is_active, updatedBy: user?.id });

        res.json({
            success: true,
            data: rule,
        });
    } catch (error) {
        logger.error('Error toggling alert rule', { error });
        next(error);
    }
};

/**
 * Test an alert rule with sample data
 * POST /alert-rules/:id/test
 * Body: { sample_data: { metric_name: value } }
 */
export const testRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = (req as any).user;
        const { id } = req.params;
        const { sample_data } = req.body;

        logger.info('Testing alert rule', { id, userId: user?.id, sample_data });

        if (!sample_data || typeof sample_data !== 'object') {
            logger.warn('Invalid sample_data for rule test', { id });
            res.status(400).json({
                success: false,
                error: 'sample_data object is required',
            });
            return;
        }

        const rule = await alertRuleRepo.findById(id);

        if (!rule) {
            logger.warn('Alert rule not found for test', { id });
            res.status(404).json({
                success: false,
                error: 'Alert rule not found',
            });
            return;
        }

        // Evaluate the condition
        const condition = rule.condition as any;
        const metricValue = sample_data[condition.metric];
        
        if (metricValue === undefined) {
            logger.warn('Metric not found in sample_data', { id, metric: condition.metric, sample_data });
            res.status(400).json({
                success: false,
                error: `Metric '${condition.metric}' not found in sample_data`,
                expected_metric: condition.metric,
            });
            return;
        }

        // Evaluate the condition
        let triggered = false;
        const threshold = condition.threshold;
        
        switch (condition.operator) {
            case '>':
                triggered = metricValue > threshold;
                break;
            case '>=':
                triggered = metricValue >= threshold;
                break;
            case '<':
                triggered = metricValue < threshold;
                break;
            case '<=':
                triggered = metricValue <= threshold;
                break;
            case '==':
            case '=':
                triggered = metricValue == threshold;
                break;
            case '!=':
            case '<>':
                triggered = metricValue != threshold;
                break;
            case 'contains':
                triggered = String(metricValue).includes(String(threshold));
                break;
            case 'in':
                triggered = Array.isArray(threshold) ? threshold.includes(metricValue) : false;
                break;
            default:
                logger.warn('Unknown operator in rule condition', { id, operator: condition.operator });
                res.status(400).json({
                    success: false,
                    error: `Unknown operator: ${condition.operator}`,
                });
                return;
        }

        const result = {
            rule_id: rule.id,
            rule_name: rule.name,
            condition: {
                metric: condition.metric,
                operator: condition.operator,
                threshold: threshold,
            },
            sample_value: metricValue,
            triggered: triggered,
            severity: rule.severity,
            would_create_alert: triggered && rule.is_active,
            message: triggered
                ? `Alert WOULD be triggered: ${condition.metric} (${metricValue}) ${condition.operator} ${threshold}`
                : `Alert would NOT be triggered: ${condition.metric} (${metricValue}) does not satisfy ${condition.operator} ${threshold}`,
        };

        logger.info('Alert rule test completed', { id, triggered, userId: user?.id });

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        logger.error('Error testing alert rule', { error });
        next(error);
    }
};
