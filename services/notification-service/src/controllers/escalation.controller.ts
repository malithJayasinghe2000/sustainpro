import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@sustainpro/shared-utils';
import { escalationService, EscalationFilters } from '../services/escalation.service';
import { alertService } from '../services/alert.service';

const logger = createLogger({ service: 'notification-service' });

// =============================================
// TYPE DEFINITIONS FOR SWAGGER
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Escalation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         organization_id:
 *           type: string
 *           format: uuid
 *         event_id:
 *           type: string
 *           format: uuid
 *         department_id:
 *           type: string
 *           format: uuid
 *         service_id:
 *           type: string
 *           format: uuid
 *         alert_id:
 *           type: string
 *           format: uuid
 *         task_id:
 *           type: string
 *           format: uuid
 *         reason:
 *           type: string
 *           enum: [THRESHOLD_BREACH, TIMEOUT, MANUAL, SLA_VIOLATION]
 *         status:
 *           type: string
 *           enum: [OPEN, ACKNOWLEDGED, RESOLVED]
 *         severity:
 *           type: string
 *           enum: [CRITICAL, HIGH, MEDIUM, LOW]
 *         assigned_to:
 *           type: string
 *           format: uuid
 *         escalated_at:
 *           type: string
 *           format: date-time
 *         acknowledged_at:
 *           type: string
 *           format: date-time
 *         resolved_at:
 *           type: string
 *           format: date-time
 *         resolution_notes:
 *           type: string
 *         evidence_urls:
 *           type: array
 *           items:
 *             type: string
 */

// =============================================
// ESCALATION CONTROLLER
// =============================================

export class EscalationController {
    /**
     * @swagger
     * /api/v1/escalations:
     *   get:
     *     summary: Get all escalations with filters
     *     tags: [Escalations]
     *     parameters:
     *       - in: query
     *         name: organization_id
     *         schema:
     *           type: string
     *       - in: query
     *         name: event_id
     *         schema:
     *           type: string
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [OPEN, ACKNOWLEDGED, RESOLVED]
     *       - in: query
     *         name: severity
     *         schema:
     *           type: string
     *           enum: [CRITICAL, HIGH, MEDIUM, LOW]
     *       - in: query
     *         name: assigned_to
     *         schema:
     *           type: string
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 20
     *     responses:
     *       200:
     *         description: List of escalations
     */
    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            logger.info('Getting all escalations', { userId: user?.id, roles: user?.roles, isSuperAdmin: user?.isSuperAdmin });

            const filters: EscalationFilters = {};

            // Apply role-based filtering
            if (user.isSuperAdmin || user.is_super_admin) {
                // Super admin sees all - can optionally filter by org
                if (req.query.organization_id) {
                    filters.organization_id = req.query.organization_id as string;
                }
            } else if (user.roles?.includes('ORG_ADMIN')) {
                // Org admin sees organization escalations
                filters.organization_id = user.organization_id;
            } else if (user.roles?.includes('EVENT_MANAGER') && user.eventIds?.length > 0) {
                // Event manager sees event escalations
                if (req.query.event_id && user.eventIds.includes(req.query.event_id as string)) {
                    filters.event_id = req.query.event_id as string;
                } else {
                    filters.event_id = user.eventIds[0]; // Default to first event
                }
            } else if (user.roles?.includes('DEPT_HEAD') && user.deptIds?.length > 0) {
                // Dept head sees department escalations
                if (req.query.department_id && user.deptIds.includes(req.query.department_id as string)) {
                    filters.department_id = req.query.department_id as string;
                } else {
                    filters.department_id = user.deptIds[0];
                }
            } else if ((user.roles?.includes('SERVICE_SUPERVISOR') || user.roles?.includes('TECHNICIAN') || user.roles?.includes('SERVICE_SUPPLIER')) && user.serviceIds?.length > 0) {
                // Service-level roles see service escalations OR assigned escalations
                if (req.query.service_id && user.serviceIds.includes(req.query.service_id as string)) {
                    filters.service_id = req.query.service_id as string;
                } else {
                    // Show escalations assigned to them
                    filters.assigned_to = user.id;
                }
            } else {
                // Default: only see assigned escalations
                filters.assigned_to = user.id;
            }

            // Apply additional query filters (if allowed by role)
            if (req.query.event_id && !filters.event_id) {
                filters.event_id = req.query.event_id as string;
            }
            if (req.query.department_id && !filters.department_id) {
                filters.department_id = req.query.department_id as string;
            }
            if (req.query.service_id && !filters.service_id) {
                filters.service_id = req.query.service_id as string;
            }
            if (req.query.status) {
                filters.status = req.query.status as any;
            }
            if (req.query.severity) {
                filters.severity = req.query.severity as any;
            }
            if (req.query.assigned_to && (user.isSuperAdmin || user.is_super_admin || user.roles?.includes('ORG_ADMIN'))) {
                filters.assigned_to = req.query.assigned_to as string;
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const result = await escalationService.getEscalations(filters, page, limit);

            logger.debug('Escalations retrieved', { count: result.data.length, total: result.total });

            res.json({
                success: true,
                data: result.data,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        } catch (error) {
            logger.error('Failed to get escalations', { error });
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/escalations/my:
     *   get:
     *     summary: Get escalations assigned to current user
     *     tags: [Escalations]
     *     responses:
     *       200:
     *         description: List of user's escalations
     */
    async getMyEscalations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                logger.warn('Unauthorized access to my escalations');
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            logger.info('Getting my escalations', { userId });

            const filters: EscalationFilters = {
                assigned_to: userId,
                status: req.query.status as any,
            };

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const result = await escalationService.getEscalations(filters, page, limit);

            logger.debug('My escalations retrieved', { userId, count: result.data.length });

            res.json({
                success: true,
                data: result.data,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            });
        } catch (error) {
            logger.error('Failed to get my escalations', { error });
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/escalations/pending-count:
     *   get:
     *     summary: Get pending escalation count for current user
     *     tags: [Escalations]
     *     responses:
     *       200:
     *         description: Pending count
     */
    async getPendingCount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const count = await escalationService.getPendingCount(userId);

            res.json({
                success: true,
                data: { count },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/escalations/statistics:
     *   get:
     *     summary: Get escalation statistics
     *     tags: [Escalations]
     *     responses:
     *       200:
     *         description: Escalation statistics
     */
    async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = (req as any).user;
            logger.info('Getting escalation statistics', { userId: user?.id });

            const filters: EscalationFilters = {
                organization_id: req.query.organization_id as string,
                event_id: req.query.event_id as string,
                assigned_to: req.query.assigned_to as string,
            };

            const stats = await escalationService.getStatistics(filters);

            logger.debug('Escalation statistics retrieved', { stats });

            res.json({
                success: true,
                data: stats,
            });
        } catch (error) {
            logger.error('Failed to get escalation statistics', { error });
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/escalations/{id}:
     *   get:
     *     summary: Get escalation by ID
     *     tags: [Escalations]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Escalation details
     *       404:
     *         description: Escalation not found
     */
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const user = (req as any).user;
            logger.info('Getting escalation by ID', { escalationId: id, userId: user?.id });

            const escalation = await escalationService.getEscalationById(id);

            if (!escalation) {
                logger.warn('Escalation not found', { escalationId: id });
                res.status(404).json({ success: false, error: 'Escalation not found' });
                return;
            }

            logger.debug('Escalation retrieved', { escalationId: id });

            res.json({
                success: true,
                data: escalation,
            });
        } catch (error) {
            logger.error('Failed to get escalation', { error, escalationId: req.params.id });
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/escalations/{id}/acknowledge:
     *   post:
     *     summary: Acknowledge an escalation
     *     tags: [Escalations]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Escalation acknowledged
     */
    async acknowledge(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;

            logger.info('Acknowledging escalation', { escalationId: id, userId });

            if (!userId) {
                logger.warn('Unauthorized acknowledgment attempt', { escalationId: id });
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const escalation = await escalationService.acknowledgeEscalation(id, userId);

            logger.info('Escalation acknowledged successfully', { escalationId: id, userId });

            res.json({
                success: true,
                message: 'Escalation acknowledged',
                data: escalation,
            });
        } catch (error: any) {
            if (error.message === 'Escalation not found') {
                logger.warn('Escalation not found for acknowledgment', { escalationId: req.params.id });
                res.status(404).json({ success: false, error: error.message });
                return;
            }
            if (error.message.includes('Only OPEN')) {
                logger.warn('Cannot acknowledge escalation - invalid status', { escalationId: req.params.id, error: error.message });
                res.status(400).json({ success: false, error: error.message });
                return;
            }
            logger.error('Failed to acknowledge escalation', { error, escalationId: req.params.id });
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/escalations/{id}/resolve:
     *   post:
     *     summary: Resolve an escalation
     *     tags: [Escalations]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               resolution_notes:
     *                 type: string
     *               evidence_urls:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       200:
     *         description: Escalation resolved
     */
    async resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.id;
            const { resolution_notes, evidence_urls } = req.body;

            logger.info('Resolving escalation', { escalationId: id, userId, hasNotes: !!resolution_notes, evidenceCount: evidence_urls?.length || 0 });

            if (!userId) {
                logger.warn('Unauthorized resolve attempt', { escalationId: id });
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const escalation = await escalationService.resolveEscalation(
                id,
                userId,
                resolution_notes,
                evidence_urls
            );

            logger.info('Escalation resolved successfully', { escalationId: id, userId });

            res.json({
                success: true,
                message: 'Escalation resolved',
                data: escalation,
            });
        } catch (error: any) {
            if (error.message === 'Escalation not found') {
                logger.warn('Escalation not found for resolution', { escalationId: req.params.id });
                res.status(404).json({ success: false, error: error.message });
                return;
            }
            if (error.message.includes('already resolved')) {
                logger.warn('Escalation already resolved', { escalationId: req.params.id });
                res.status(400).json({ success: false, error: error.message });
                return;
            }
            logger.error('Failed to resolve escalation', { error, escalationId: req.params.id });
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/escalations/{id}/evidence:
     *   post:
     *     summary: Add evidence to an escalation
     *     tags: [Escalations]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - evidence_urls
     *             properties:
     *               evidence_urls:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       200:
     *         description: Evidence added
     */
    async addEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { evidence_urls } = req.body;
            const user = (req as any).user;

            logger.info('Adding evidence to escalation', { escalationId: id, userId: user?.id, evidenceCount: evidence_urls?.length || 0 });

            if (!evidence_urls || !Array.isArray(evidence_urls)) {
                logger.warn('Invalid evidence_urls for escalation', { escalationId: id });
                res.status(400).json({ success: false, error: 'evidence_urls array is required' });
                return;
            }

            const escalation = await escalationService.addEvidence(id, evidence_urls);

            logger.info('Evidence added to escalation successfully', { escalationId: id, evidenceCount: evidence_urls.length });

            res.json({
                success: true,
                message: 'Evidence added',
                data: escalation,
            });
        } catch (error: any) {
            if (error.message === 'Escalation not found') {
                logger.warn('Escalation not found for evidence', { escalationId: req.params.id });
                res.status(404).json({ success: false, error: error.message });
                return;
            }
            logger.error('Failed to add evidence to escalation', { error, escalationId: req.params.id });
            next(error);
        }
    }

    /**
     * Process incoming alert (internal endpoint from IoT service)
     */
    async processAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const alertData = req.body;

            logger.info('Processing incoming alert', { 
                ruleId: alertData.rule_id, 
                deviceCode: alertData.device_code, 
                severity: alertData.severity 
            });

            const alert = await alertService.processAlert(alertData);

            logger.info('Alert processed successfully', { alertId: alert.id, severity: alertData.severity });

            res.json({
                success: true,
                message: 'Alert processed',
                data: { alertId: alert.id },
            });
        } catch (error) {
            logger.error('Failed to process alert', { error, alertData: req.body });
            next(error);
        }
    }
}

export const escalationController = new EscalationController();
