import express from 'express';
import { authenticateUser } from '../middleware/auth';
import {
    generateTopics,
    generateOutline,
    improveContent,
    generateAbstract,
    generateCitations,
    saveResearchProgress,
    getResearchHistory
} from '../controllers/researchController';

const router = express.Router();

router.use(authenticateUser);

router.post('/topic', generateTopics);
router.post('/outline', generateOutline);
router.post('/improve', improveContent);
router.post('/abstract', generateAbstract);
router.post('/citation', generateCitations);

router.post('/save', saveResearchProgress);
router.get('/history', getResearchHistory);

export default router;
