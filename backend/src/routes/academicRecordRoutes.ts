import express from 'express';
import { getMyAcademicRecords } from '../controllers/academicRecordController';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';

const router = express.Router();

// GET /api/academic-records/me
router.use(authenticateUser, enforceOrgIsolation);
router.get('/me', getMyAcademicRecords);

export default router;
