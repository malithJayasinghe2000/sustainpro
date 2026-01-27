import { Router } from 'express';
import { simulateTelemetry } from '../controllers/simulation.controller';

const router = Router();

router.post('/telemetry', simulateTelemetry);

export default router;
