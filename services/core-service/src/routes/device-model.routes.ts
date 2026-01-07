import { Router } from 'express';
import { requireRole } from '@sustainpro/shared-middleware';
import * as deviceModelController from '../controllers/device-model.controller';

const router = Router();

// GET /device-models - List all device models
router.get('/', deviceModelController.getAll);

// GET /device-models/category/:category - Get models by category
router.get('/category/:category', deviceModelController.getByCategory);

// GET /device-models/:id - Get device model by ID
router.get('/:id', deviceModelController.getById);

// POST /device-models - Create device model (SUPER_ADMIN only)
router.post(
    '/',
    requireRole('SUPER_ADMIN'),
    deviceModelController.create
);

// PUT /device-models/:id - Update device model (SUPER_ADMIN only)
router.put(
    '/:id',
    requireRole('SUPER_ADMIN'),
    deviceModelController.update
);

// DELETE /device-models/:id - Delete device model (SUPER_ADMIN only)
router.delete(
    '/:id',
    requireRole('SUPER_ADMIN'),
    deviceModelController.remove
);

// POST /device-models/:id/firmware - Add firmware version (SUPER_ADMIN only)
router.post(
    '/:id/firmware',
    requireRole('SUPER_ADMIN'),
    deviceModelController.addFirmwareVersion
);

export default router;
