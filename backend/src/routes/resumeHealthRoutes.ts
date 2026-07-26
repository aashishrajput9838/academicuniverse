import express from 'express';
import { checkResumeSubsystemHealth } from '../utils/resumeHealthCheck';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';

const router = express.Router();

router.use(authenticateUser, enforceOrgIsolation);

router.get('/health/resume', async (req, res) => {
  try {
    const health = await checkResumeSubsystemHealth();

    if (!health.healthy) {
      return res.status(503).json({
        status: 'degraded',
        message: 'Resume subsystem is unhealthy',
        dependencies: health.dependencies,
        checkedAt: health.checkedAt,
      });
    }

    return res.json({
      status: 'ok',
      message: 'Resume subsystem is healthy',
      dependencies: health.dependencies,
      checkedAt: health.checkedAt,
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      message: `Resume health check failed: ${err.message}`,
      checkedAt: new Date(),
    });
  }
});

export default router;
