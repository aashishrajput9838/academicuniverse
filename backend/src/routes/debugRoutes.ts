import { Router } from 'express';
import { getRolePermissions, getUserByEmail } from '../controllers/debugController';

const router = Router();

// GET /api/debug/role-permissions/:roleId
router.get('/role-permissions/:roleId', getRolePermissions);

// GET /api/debug/user/:email
router.get('/user/:email', getUserByEmail);

export default router;
