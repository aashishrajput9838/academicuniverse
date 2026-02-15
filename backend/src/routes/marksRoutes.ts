import express from 'express';
import {
  MarksController,
} from '../controllers';
import { authenticateUser, authorize, enforceOrgIsolation } from '../middleware/auth';

const router = express.Router();

/**
 * All marks routes require authentication and organization isolation
 */
router.use(authenticateUser, enforceOrgIsolation);

/**
 * POST /api/marks
 * Add marks for a student
 * Requires: ADD_MARKS permission
 */
router.post(
  '/',
  authorize('ADD_MARKS'),
  MarksController.addMarksController
);

/**
 * GET /api/marks
 * Get all marks for the organization (admin)
 * Requires: VIEW_ALL_MARKS permission
 */
router.get(
  '/',
  authorize('VIEW_ALL_MARKS'),
  MarksController.getAllMarksController
);

/**
 * GET /api/marks/:studentId
 * Get marks for a specific student
 * Requires: VIEW_MARKS permission
 */
router.get(
  '/:studentId',
  authorize('VIEW_MARKS'),
  MarksController.getStudentMarksController
);

/**
 * PUT /api/marks/:markId
 * Update marks
 * Requires: EDIT_MARKS permission
 */
router.put(
  '/:markId',
  authorize('EDIT_MARKS'),
  MarksController.updateMarksController
);

/**
 * DELETE /api/marks/:markId
 * Delete marks
 * Requires: DELETE_MARKS permission
 */
router.delete(
  '/:markId',
  authorize('DELETE_MARKS'),
  MarksController.deleteMarksController
);

export default router;
