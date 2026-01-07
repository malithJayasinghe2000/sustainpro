import { Router } from 'express';
import { requireRole } from '@sustainpro/shared-middleware';
import * as deviceController from '../controllers/device.controller';

const router = Router();

// GET /devices - List all devices (filtered by org for non-super-admin)
router.get('/', deviceController.getAll);

// GET /devices/stats - Get device statistics
router.get('/stats', deviceController.getStats);

// GET /devices/by-org/:orgId - Get devices by organization
router.get('/by-org/:orgId', deviceController.getByOrganization);

// GET /devices/by-service/:serviceId - Get devices by department service
router.get('/by-service/:serviceId', deviceController.getByDepartmentService);

// GET /devices/:id - Get device by ID
router.get('/:id', deviceController.getById);

// POST /devices - Create device (ORG_ADMIN+)
router.post(
    '/',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    deviceController.create
);

// PUT /devices/:id - Update device (ORG_ADMIN+)
router.put(
    '/:id',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    deviceController.update
);

// DELETE /devices/:id - Delete device (ORG_ADMIN+)
router.delete(
    '/:id',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    deviceController.remove
);

// POST /devices/:id/assign - Assign device to service (ORG_ADMIN+)
router.post(
    '/:id/assign',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    deviceController.assignToService
);

// POST /devices/:id/unassign - Unassign device from service (ORG_ADMIN+)
router.post(
    '/:id/unassign',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    deviceController.unassignFromService
);

// POST /devices/:id/provision-iot - Provision device for AWS IoT (ORG_ADMIN+)
router.post(
    '/:id/provision-iot',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    deviceController.provisionIoT
);

// POST /devices/:id/regenerate-api-key - Regenerate device API key (ORG_ADMIN+)
router.post(
    '/:id/regenerate-api-key',
    requireRole('SUPER_ADMIN', 'ORG_ADMIN'),
    deviceController.regenerateApiKey
);

export default router;
