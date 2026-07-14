import express from 'express';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { DocumentRegistryController } from '../modules/growth/documentRegistry.controller';

const router = express.Router();
const controller = new DocumentRegistryController();

router.use(authenticateUser, enforceOrgIsolation);
router.get('/', controller.getAll);

export default router;
