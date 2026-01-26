import { Router } from 'express';
import { escalationController } from '../controllers/escalation.controller';
import { authenticateToken } from '@sustainpro/shared-middleware';

const router = Router();

// Apply authentication to all escalation routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   - name: Escalations
 *     description: Escalation management endpoints
 */

// Get all escalations with filters
router.get('/', (req, res, next) => escalationController.getAll(req, res, next));

// Get my escalations (assigned to current user)
router.get('/my', (req, res, next) => escalationController.getMyEscalations(req, res, next));

// Get pending count for navbar badge
router.get('/pending-count', (req, res, next) => escalationController.getPendingCount(req, res, next));

// Get escalation statistics
router.get('/statistics', (req, res, next) => escalationController.getStatistics(req, res, next));

// Get single escalation
router.get('/:id', (req, res, next) => escalationController.getById(req, res, next));

// Acknowledge an escalation
router.post('/:id/acknowledge', (req, res, next) => escalationController.acknowledge(req, res, next));

// Resolve an escalation
router.post('/:id/resolve', (req, res, next) => escalationController.resolve(req, res, next));

// Add evidence to an escalation
router.post('/:id/evidence', (req, res, next) => escalationController.addEvidence(req, res, next));

export default router;
