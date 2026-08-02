import { Router } from 'express';
import {
  searchStudents,
  findStudentOverlap,
  calculateOverlapSlots,
  getAvailableSections
} from '../controllers/overlapController';
import { authenticateFirebaseUser } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/overlap-engine/search-students
 * @desc    Search active students in the authenticated user's organization
 * @access  Private (Firebase authenticated users)
 */
router.get('/search-students', authenticateFirebaseUser, searchStudents);

/**
 * @route   POST /api/overlap-engine/find
 * @desc    Calculate AI meeting recommendations for selected students
 * @access  Private (Firebase authenticated users)
 */
router.post('/find', authenticateFirebaseUser, findStudentOverlap);

// Legacy routes for backward compatibility
router.get('/sections', authenticateFirebaseUser, getAvailableSections);
router.post('/sections', authenticateFirebaseUser, calculateOverlapSlots);

export default router;