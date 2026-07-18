import express from 'express';
import {
  getMySkills,
  getMySkillEvidence,
  getMySkillSummary,
  createSkillMapping,
  getMappingsForSubject,
} from '../controllers/skillsController';
import { authenticateUser, enforceOrgIsolation, authorize } from '../middleware/auth';

const router = express.Router();

router.use(authenticateUser, enforceOrgIsolation);

router.get('/me', getMySkills);
router.get('/me/:skillId/evidence', getMySkillEvidence);
router.get('/me/summary', getMySkillSummary);

router.post('/mappings', authorize('MANAGE_SKILL_MAPPINGS'), createSkillMapping);
router.get('/mappings/:subjectCode', authorize('VIEW_SKILL_MAPPINGS'), getMappingsForSubject);

export default router;
