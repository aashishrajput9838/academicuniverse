import express from 'express';
import { getMyAcademicRecords } from '../controllers/academicRecordController';

const router = express.Router();

// GET /api/academic-records/me
router.get('/me', getMyAcademicRecords);

export default router;
