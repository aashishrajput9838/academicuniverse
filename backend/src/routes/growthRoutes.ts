import express from 'express';
import { getMyGrowthHub } from '../controllers/growthController';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';

const router = express.Router();

router.use(authenticateUser, enforceOrgIsolation);
router.get('/me', getMyGrowthHub);

export default router;
