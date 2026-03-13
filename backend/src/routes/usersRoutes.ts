import { Router } from 'express';
import { authenticateUser, authorize } from '../middleware/auth';
import { getAllUsersController } from '../controllers/usersController';

const usersRouter = Router();

// Only admins should see all users in the system list
usersRouter.get(
    '/',
    authenticateUser,
    authorize('MANAGE_USERS'),
    getAllUsersController
);

export default usersRouter;
