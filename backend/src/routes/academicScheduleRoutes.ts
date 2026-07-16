import express from 'express';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { getMyAcademicSchedule } from '../controllers/academicScheduleController';

const router = express.Router();

router.use(authenticateUser, enforceOrgIsolation);

router.get('/me', getMyAcademicSchedule);

export default router;
