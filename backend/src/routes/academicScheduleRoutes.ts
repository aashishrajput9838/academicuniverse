import express from 'express';
import { getMyAcademicSchedule } from '../controllers/academicScheduleController';

const router = express.Router();

// GET /api/academic-schedule/me
router.get('/me', getMyAcademicSchedule);

export default router;
