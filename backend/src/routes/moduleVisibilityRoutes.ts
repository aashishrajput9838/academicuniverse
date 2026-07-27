import { Router } from 'express';
import {
  getAllModulesController,
  getModuleController,
  updateModuleController,
  batchUpdateModulesController,
  toggleModuleController,
  registerModuleController,
} from '../controllers/moduleVisibilityController';
import { authenticateUser } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = Router();

router.use(authenticateUser);

router.get('/', authorize('MANAGE_MODULES'), getAllModulesController);
router.get('/:key', authorize('MANAGE_MODULES'), getModuleController);

router.post('/register', authorize('MANAGE_MODULES'), registerModuleController);
router.post('/batch', authorize('MANAGE_MODULES'), batchUpdateModulesController);
router.patch('/:key', authorize('MANAGE_MODULES'), updateModuleController);
router.post('/:key/toggle', authorize('MANAGE_MODULES'), toggleModuleController);

export default router;
