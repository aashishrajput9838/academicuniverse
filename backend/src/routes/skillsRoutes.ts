import express from 'express';
import {
  getMySkills,
  getMySkillEvidence,
  getMySkillSummary,
  addSkillsController,
  updateSkillController,
  deleteSkillController,
  createSkillMapping,
  getMappingsForSubject,
} from '../controllers/skillsController';
import { authenticateUser, enforceOrgIsolation, authorize } from '../middleware/auth';

const router = express.Router();

router.use(authenticateUser, enforceOrgIsolation);

router.get('/me', getMySkills);
router.post('/me', addSkillsController);
router.put('/me/:skillId', updateSkillController);
router.delete('/me/:skillId', deleteSkillController);
router.get('/me/:skillId/evidence', getMySkillEvidence);
router.get('/me/summary', getMySkillSummary);

router.post('/mappings', authorize('MANAGE_SKILL_MAPPINGS'), createSkillMapping);
router.get('/mappings/:subjectCode', authorize('VIEW_SKILL_MAPPINGS'), getMappingsForSubject);

export default router;
