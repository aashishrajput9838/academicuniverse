/**
 * Research Routes
 * Defines all research-related API endpoints
 */

import { Router } from 'express';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { ResearchRepository } from './research.repository';
import { AIProviderFactory } from '../../core/ai';
import { authenticateUser } from '../../shared/middleware';

const router = Router();

// Initialize dependencies (Dependency Injection)
const aiProvider = AIProviderFactory.getInstance().getDefaultProvider();
const researchRepository = new ResearchRepository();
const researchService = new ResearchService(aiProvider, researchRepository);
const researchController = new ResearchController(researchService);

// Public routes (if any)
// None for research module - all require authentication

// Protected routes
router.post('/topics', authenticateUser, researchController.generateTopics);
router.post('/outline', authenticateUser, researchController.generateOutline);
router.post('/improve', authenticateUser, researchController.improveContent);
router.post('/abstract', authenticateUser, researchController.generateAbstract);
router.post('/citations', authenticateUser, researchController.generateCitations);
router.post('/save', authenticateUser, researchController.saveResearch);
router.get('/history', authenticateUser, researchController.getResearchHistory);
router.get('/:id', authenticateUser, researchController.getResearchById);
router.delete('/:id', authenticateUser, researchController.deleteResearch);

export default router;
