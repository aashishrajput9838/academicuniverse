/**
 * ReviewController
 *
 * Exposes HTTP endpoints for the Human-in-the-Loop review workflow.
 * Always derives identity from the authenticated JWT — never trusts client-supplied IDs.
 *
 * Routes (all authenticated):
 *   GET    /review/:processingId          → getCandidateState
 *   POST   /review/:processingId/draft    → saveDraft
 *   POST   /review/:processingId/reject   → reject
 *   POST   /review/:processingId/approve  → approve
 *   POST   /review/:processingId/rollback → rollback  (ADMIN or document owner)
 *   GET    /review/:processingId/history  → getHistory
 */

import { Response, NextFunction } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { ReviewService } from '../shared/services/review.service';

const reviewService = new ReviewService();

function getReviewerContext(req: any) {
  const userId = req.user?.userId;
  const organizationId = req.organizationId;
  const role = req.user?.role ?? 'STUDENT';
  return { userId, organizationId, role };
}

export const getCandidateState = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const { userId, organizationId } = getReviewerContext(req);

    if (!userId) return sendError(res, 401, 'Authentication required');
    if (!organizationId) return sendError(res, 403, 'Organization context required');

    const state = await reviewService.getCandidateState(processingId, organizationId);
    return sendResponse(res, 200, state, 'Candidate state retrieved');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    next(err);
  }
};

export const saveDraft = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const { editedFields } = req.body;
    const reviewer = getReviewerContext(req);

    if (!reviewer.userId) return sendError(res, 401, 'Authentication required');
    if (!reviewer.organizationId) return sendError(res, 403, 'Organization context required');
    if (!editedFields || typeof editedFields !== 'object') {
      return sendError(res, 400, 'editedFields object is required');
    }

    const result = await reviewService.saveDraft({ processingId, editedFields, reviewer });
    return sendResponse(res, 200, result, 'Draft saved successfully');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    next(err);
  }
};

export const rejectDocument = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const { reason } = req.body;
    const reviewer = getReviewerContext(req);

    if (!reviewer.userId) return sendError(res, 401, 'Authentication required');
    if (!reviewer.organizationId) return sendError(res, 403, 'Organization context required');
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return sendError(res, 400, 'A rejection reason is required');
    }

    await reviewService.reject({ processingId, reason: reason.trim(), reviewer });
    return sendResponse(res, 200, { processingId, status: 'REJECTED' }, 'Document rejected');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    next(err);
  }
};

export const approveDocument = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const { editedFields, routingDecisionOverride } = req.body;
    const reviewer = getReviewerContext(req);

    if (!reviewer.userId) return sendError(res, 401, 'Authentication required');
    if (!reviewer.organizationId) return sendError(res, 403, 'Organization context required');

    const result = await reviewService.approve({ processingId, editedFields, reviewer, routingDecisionOverride });
    return sendResponse(res, 200, { processingId, status: 'APPROVED', ...result }, 'Document approved successfully');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    if (err.message?.includes('already approved')) return sendError(res, 409, err.message);
    next(err);
  }
};

export const rollbackDocument = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const reviewer = getReviewerContext(req);

    if (!reviewer.userId) return sendError(res, 401, 'Authentication required');
    if (!reviewer.organizationId) return sendError(res, 403, 'Organization context required');

    await reviewService.rollback({ processingId, reviewer });
    return sendResponse(res, 200, { processingId, status: 'PENDING_REVIEW' }, 'Approval rolled back');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    next(err);
  }
};

export const canRollback = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const reviewer = getReviewerContext(req);

    if (!reviewer.userId) return sendError(res, 401, 'Authentication required');
    if (!reviewer.organizationId) return sendError(res, 403, 'Organization context required');

    const result = await reviewService.canRollback(processingId, reviewer);
    return sendResponse(res, 200, result, 'Rollback eligibility checked');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    next(err);
  }
};

export const getReviewHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const { userId, organizationId } = getReviewerContext(req);

    if (!userId) return sendError(res, 401, 'Authentication required');
    if (!organizationId) return sendError(res, 403, 'Organization context required');

    const history = await reviewService.getHistory(processingId, organizationId);
    return sendResponse(res, 200, history, 'Review history retrieved');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    next(err);
  }
};

/**
 * GET /review/:processingId/routing
 * Returns the AI routing decision and module registry for this document.
 * Allows the review UI to display routing recommendations and offer manual override.
 */
export const getRoutingInfo = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const { userId, organizationId } = getReviewerContext(req);

    if (!userId) return sendError(res, 401, 'Authentication required');
    if (!organizationId) return sendError(res, 403, 'Organization context required');

    const state = await reviewService.getCandidateState(processingId, organizationId);
    const personSuggestion = await reviewService.getPersonSuggestion(processingId, organizationId);
    const { moduleRegistry } = require('../shared/application/routingEngine');

    return sendResponse(res, 200, {
      processingId,
      routingDecision: state.routingDecision,
      routingStatus: state.routingStatus,
      documentCategory: state.documentCategory,
      moduleRegistry: moduleRegistry.map((m: any) => ({
        moduleId: m.moduleId,
        moduleName: m.moduleName,
        description: m.description,
        acceptedDocumentCategories: m.acceptedDocumentCategories,
        canonicalCollection: m.canonicalCollection,
        priority: m.priority,
      })),
      personSuggestion,
    }, 'Routing info retrieved');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    next(err);
  }
};

export const overridePerson = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const { suggestedPersonId, expectedVersion, idempotencyKey } = req.body;
    const reviewer = getReviewerContext(req);

    if (!reviewer.userId) return sendError(res, 401, 'Authentication required');
    if (!reviewer.organizationId) return sendError(res, 403, 'Organization context required');
    if (!suggestedPersonId || typeof suggestedPersonId !== 'string') {
      return sendError(res, 400, 'suggestedPersonId is required');
    }
    if (expectedVersion === undefined || expectedVersion === null) {
      return sendError(res, 400, 'expectedVersion is required');
    }

    const result = await reviewService.applyPersonOverride({
      processingId,
      organizationId: reviewer.organizationId,
      reviewer,
      suggestedPersonId,
      expectedVersion,
      idempotencyKey,
    });

    return sendResponse(res, 200, result, 'Person override applied successfully');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    if (err.message?.includes('Conflict')) return sendError(res, 409, err.message);
    if (err.message?.includes('version mismatch') || err.message?.includes('concurrent update')) {
      return sendError(res, 409, err.message);
    }
    next(err);
  }
};

export const getSuggestion = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { processingId } = req.params;
    const { userId, organizationId } = getReviewerContext(req);

    if (!userId) return sendError(res, 401, 'Authentication required');
    if (!organizationId) return sendError(res, 403, 'Organization context required');

    const suggestion = await reviewService.getPersonSuggestion(processingId, organizationId);
    if (!suggestion) {
      return sendError(res, 404, 'ResumePersonSuggestion not found for processingId: ' + processingId);
    }

    return sendResponse(res, 200, suggestion, 'Person suggestion retrieved');
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) return sendError(res, 403, err.message);
    if (err.message?.includes('not found')) return sendError(res, 404, err.message);
    next(err);
  }
};

