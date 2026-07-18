import express from 'express';
import { getMyAcademicRecords, getAcademicRecordDocument } from '../controllers/academicRecordController';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';

const router = express.Router();

// GET /api/academic-records/me
router.use(authenticateUser, enforceOrgIsolation);
router.get('/me', getMyAcademicRecords);

// GET /api/academic-records/documents/:sourceDocumentId
router.get('/documents/:sourceDocumentId', getAcademicRecordDocument);

export default router;
