import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { getStudentDashboard, getFacultyDashboard } from '../controllers/dashboardController';

const dashboardRouter = Router();

dashboardRouter.get(
    '/student',
    authenticateUser,
    authorize('STUDENT'),
    getStudentDashboard
);

dashboardRouter.get(
    '/faculty',
    authenticateUser,
    authorize('FACULTY', 'ADMIN'), // Admin can also view faculty specific data if needed, or just FACULTY
    getFacultyDashboard
);

export default dashboardRouter;
