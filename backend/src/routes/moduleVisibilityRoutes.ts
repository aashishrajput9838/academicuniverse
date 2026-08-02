import { Router } from 'express';
import {
  getAllModulesController,
  getModuleController,
  updateModuleController,
  batchUpdateModulesController,
  toggleModuleController,
  registerModuleController,
} from '../controllers/moduleVisibilityController';
import { authenticateUser, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

// Read endpoints accessible to all authenticated users
router.get('/', getAllModulesController);
router.get('/:key', getModuleController);

// Administrative mutation endpoints require MANAGE_MODULES permission
router.post('/register', authorize('MANAGE_MODULES'), registerModuleController);
router.post('/batch', authorize('MANAGE_MODULES'), batchUpdateModulesController);
router.patch('/:key', authorize('MANAGE_MODULES'), updateModuleController);
router.post('/:key/toggle', authorize('MANAGE_MODULES'), toggleModuleController);

export default router;
