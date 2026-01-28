import { Router } from 'express';
import * as departmentServiceController from '../controllers/department-service.controller';
import { requireMinRole } from '@sustainpro/shared-middleware';

const router = Router();

// Generate Report
router.get('/:id/report', departmentServiceController.generateReport);

// Get department service by ID
router.get('/:id', departmentServiceController.getById);

// Manage devices
router.get('/:id/devices', departmentServiceController.getDevices);
router.post('/:id/devices', requireMinRole('EVENT_MANAGER'), departmentServiceController.addDevice);
router.delete('/:id/devices/:deviceId', requireMinRole('EVENT_MANAGER'), departmentServiceController.removeDevice);


export default router;
