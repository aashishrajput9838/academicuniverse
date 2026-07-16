import express from 'express';
import { getModuleHealth } from '../controllers/moduleHealthController';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';

const router = express.Router();

router.use(authenticateUser, enforceOrgIsolation);

router.get('/health', getModuleHealth);

export default router;
