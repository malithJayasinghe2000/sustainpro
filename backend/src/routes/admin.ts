import { Router, Request, Response } from 'express';
import os from 'os';
import { requireSuperAdmin } from '../middleware/rbac';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireSuperAdmin);

// Helper to calculate CPU usage
const getCpuUsage = async (): Promise<number> => {
    const cpusInitial = os.cpus();

    await new Promise(resolve => setTimeout(resolve, 100)); // Sample for 100ms

    const cpusFinal = os.cpus();

    let idleDiff = 0;
    let totalDiff = 0;

    for (let i = 0; i < cpusInitial.length; i++) {
        const start = cpusInitial[i].times;
        const end = cpusFinal[i].times;

        const startTotal = start.user + start.nice + start.sys + start.idle + start.irq;
        const endTotal = end.user + end.nice + end.sys + end.idle + end.irq;

        idleDiff += (end.idle - start.idle);
        totalDiff += (endTotal - startTotal);
    }

    if (totalDiff === 0) return 0;

    return 100 - Math.round((idleDiff / totalDiff) * 100);
};

// Get System Health Stats
router.get('/system-health', async (req: Request, res: Response) => {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const processMem = process.memoryUsage().rss;
        const cpus = os.cpus();
        // Calculate real CPU usage for Windows compatibility
        const cpuPercent = await getCpuUsage();

        const stats = {
            memory: {
                total_mb: Math.round(totalMem / 1024 / 1024),
                free_mb: Math.round(freeMem / 1024 / 1024),
                used_mb: Math.round(usedMem / 1024 / 1024),
                process_rss_mb: Math.round(processMem / 1024 / 1024),
                percent_used: Math.round((usedMem / totalMem) * 100)
            },
            cpu: {
                cores: cpus.length,
                model: cpus[0].model,
                load_avg_1m: cpuPercent, // Using calculated percent as "load"
                percent_used: cpuPercent
            },
            uptime_seconds: os.uptime(),
            process_uptime_seconds: process.uptime(),
            platform: os.platform() + ' ' + os.release()
        };

        res.json(stats);
    } catch (error) {
        console.error('System Health API Error:', error);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});

export default router;
