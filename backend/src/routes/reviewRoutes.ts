import express from 'express';
import { authenticateUser, enforceOrgIsolation, authorize } from '../middleware/auth';
import {
  getCandidateState,
  saveDraft,
  rejectDocument,
  approveDocument,
  rollbackDocument,
  canRollback,
  getReviewHistory,
  getRoutingInfo,
  overridePerson,
  getSuggestion,
} from '../controllers/reviewController';

const router = express.Router();

// All review endpoints require authentication + org isolation
router.use(authenticateUser, enforceOrgIsolation);

/**
 * GET /review/:processingId
 * Returns current candidate state (candidateFields, reviewStatus, version)
 * Accessible by: STUDENT (own), FACULTY, ADMIN
 */
router.get('/:processingId', getCandidateState);

/**
 * POST /review/:processingId/draft
 * Body: { editedFields: Record<string, any> }
 * Saves edits without changing review status. Bumps version. Logs audit entry.
 * Accessible by: STUDENT (own), FACULTY, ADMIN
 */
router.post('/:processingId/draft', saveDraft);

/**
 * POST /review/:processingId/reject
 * Body: { reason: string }
 * Marks document as REJECTED. No canonical writes.
 * Accessible by: FACULTY, ADMIN
 */
router.post('/:processingId/reject', rejectDocument);

/**
 * POST /review/:processingId/approve
 * Body: { editedFields?: Record<string, any> }
 * Runs DB transaction → writes canonical collections → publishes events.
 * AI NEVER reaches this endpoint. Only human-reviewed data is committed.
 * Accessible by: FACULTY, ADMIN
 */
router.post('/:processingId/approve', approveDocument);

/**
 * POST /review/:processingId/rollback
 * No body required.
 * Admin or document owner: deletes canonical records created by the approval, reverts status to PENDING_REVIEW.
 * Accessible by: ADMIN, SUPER_ADMIN, or document owner
 */
router.post('/:processingId/rollback', rollbackDocument);

/**
 * GET /review/:processingId/can-rollback
 * Returns whether the current user can rollback this document.
 * Accessible by: STUDENT (own), FACULTY, ADMIN
 */
router.get('/:processingId/can-rollback', canRollback);

/**
 * GET /review/:processingId/history
 * Returns full immutable audit trail for the document.
 * Accessible by: STUDENT (own), FACULTY, ADMIN
 */
router.get('/:processingId/history', getReviewHistory);

/**
 * GET /review/:processingId/routing
 * Returns AI routing decision + module registry for review UI.
 * Accessible by: STUDENT (own), FACULTY, ADMIN
 */
router.get('/:processingId/routing', getRoutingInfo);

/**
 * POST /review/:processingId/override-person
 * Body: { suggestedPersonId: string, expectedVersion: number, idempotencyKey?: string }
 * Reviewer overrides the AI-suggested person match.
 * Accessible by: FACULTY, ADMIN with REVIEW_RESUME and OVERRIDE_PERSON_MATCH permissions
 */
router.post('/:processingId/override-person', authorize('REVIEW_RESUME', 'OVERRIDE_PERSON_MATCH'), overridePerson);

/**
 * GET /review/:processingId/suggestion
 * Returns current ResumePersonSuggestion with match details.
 * Accessible by: STUDENT (own), FACULTY, ADMIN
 */
router.get('/:processingId/suggestion', getSuggestion);

export default router;
