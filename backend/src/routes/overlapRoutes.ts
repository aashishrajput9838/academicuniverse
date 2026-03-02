import { Router } from 'express';
import { calculateOverlapSlots, getAvailableSections } from '../controllers/overlapController';
import { authenticateFirebaseUser } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/overlap-engine/sections
 * @desc    Get available sections for organization
 * @access  Private (Firebase authenticated users)
 * @query   organizationId - Organization ID
 */
router.get('/sections', authenticateFirebaseUser, getAvailableSections);

/**
 * @route   POST /api/overlap-engine/sections
 * @desc    Calculate overlap slots for selected sections
 * @access  Private (Firebase authenticated users)
 * @body    { sections: string[], organizationId: string }
 */
router.post('/sections', authenticateFirebaseUser, calculateOverlapSlots);

export default router;