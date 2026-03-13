import { Router } from 'express';
import { authenticateFirebaseUser } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { getStudentDashboard, getFacultyDashboard } from '../controllers/dashboardController';

const dashboardRouter = Router();

dashboardRouter.get(
    '/student',
    authenticateFirebaseUser,
    authorize('STUDENT'),
    getStudentDashboard
);

dashboardRouter.get(
    '/faculty',
    authenticateFirebaseUser,
    authorize('FACULTY', 'ADMIN'), // Admin can also view faculty specific data if needed, or just FACULTY
    getFacultyDashboard
);

export default dashboardRouter;
