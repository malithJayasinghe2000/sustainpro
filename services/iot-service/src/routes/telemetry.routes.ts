import { Router } from 'express';
import { authenticateDevice } from '../middleware/device-auth';
import { authenticateToken } from '@sustainpro/shared-middleware';
import * as telemetryController from '../controllers/telemetry.controller';

const router = Router();

// Device telemetry ingestion (uses device API key auth)
// POST /api/v1/telemetry
router.post(
    '/',
    authenticateDevice,
    telemetryController.ingest
);

// Get live data for a device (requires user auth)
// GET /api/v1/telemetry/live/:deviceCode
router.get(
    '/live/:deviceCode',
    authenticateToken,
    telemetryController.getLiveData
);

// Get live data for organization (requires user auth)
// GET /api/v1/telemetry/live/organization/:orgId
router.get(
    '/live/organization/:orgId',
    authenticateToken,
    telemetryController.getLiveDataByOrganization
);

// Get live data for event (requires user auth)
// GET /api/v1/telemetry/live/event/:eventId
router.get(
    '/live/event/:eventId',
    authenticateToken,
    telemetryController.getLiveDataByEvent
);

// Get telemetry history for a device (requires user auth)
// GET /api/v1/telemetry/history/:deviceId
router.get(
    '/history/:deviceId',
    authenticateToken,
    telemetryController.getHistory
);

// Get telemetry history within time range (requires user auth)
// GET /api/v1/telemetry/history/:deviceId/range
router.get(
    '/history/:deviceId/range',
    authenticateToken,
    telemetryController.getHistoryByRange
);

// Get dashboard statistics (requires user auth)
// GET /api/v1/telemetry/stats/dashboard
router.get(
    '/stats/dashboard',
    authenticateToken,
    telemetryController.getDashboardStats
);

// Get system-wide statistics (super admin only)
// GET /api/v1/telemetry/stats/system
router.get(
    '/stats/system',
    authenticateToken,
    telemetryController.getSystemStats
);

export default router;
