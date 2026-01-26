import { Request, Response } from 'express';
import { injectSimulatedMessage } from '../iot';

export const simulateTelemetry = async (req: Request, res: Response): Promise<void> => {
    try {
        const { topic, message } = req.body;

        if (!topic || !message) {
            res.status(400).json({ error: 'Topic and message are required' });
            return;
        }

        injectSimulatedMessage(topic, message);

        res.json({ success: true, message: 'Simulated telemetry injected' });
    } catch (error) {
        console.error('Simulation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
