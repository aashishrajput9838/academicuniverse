import { Router } from 'express';
import { getRolePermissions, getUserByEmail, getRoleByName } from '../controllers/debugController';

const router = Router();

// GET /api/debug/role-permissions/:roleId
router.get('/role-permissions/:roleId', getRolePermissions);

// GET /api/debug/user/:email
router.get('/user/:email', getUserByEmail);
// GET /api/debug/role/:name
router.get('/role/:name', getRoleByName);

export default router;
