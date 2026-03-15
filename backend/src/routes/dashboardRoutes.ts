import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { getStudentDashboard, getFacultyDashboard } from '../controllers/dashboardController';

const dashboardRouter = Router();

dashboardRouter.get(
    '/student',
    authenticateUser,
    getStudentDashboard
);

dashboardRouter.get(
    '/faculty',
    authenticateUser,
    getFacultyDashboard
);

export default dashboardRouter;
