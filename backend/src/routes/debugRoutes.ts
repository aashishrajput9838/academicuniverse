import { Router } from 'express';
import { getRolePermissions } from '../controllers/debugController';

const router = Router();

// GET /api/debug/role-permissions/:roleId
router.get('/role-permissions/:roleId', getRolePermissions);

export default router;
