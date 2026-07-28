/**
 * documentIntelligenceRoutes.ts
 *
 * Express router for the Document Intelligence Center API.
 * All routes require authentication and organization isolation.
 */

import express from 'express';
import { authenticateUser, enforceOrgIsolation } from '../middleware/auth';
import { DocumentIntelligenceController } from '../modules/documentIntelligence/documentIntelligence.controller';

const router = express.Router();
const controller = new DocumentIntelligenceController();

// All DIC routes require authentication + org isolation
router.use(authenticateUser, enforceOrgIsolation);

/**
 * GET /api/document-intelligence/analytics
 * Returns document analytics for the authenticated organization.
 */
router.get('/analytics', controller.getAnalytics);

/**
 * GET /api/document-intelligence/documents
 * Query params: status, category, search, sortBy, sortOrder, limit, cursor
 */
router.get('/documents', controller.listDocuments);

/**
 * GET /api/document-intelligence/documents/:processingId
 * Returns full detail for a single document.
 */
router.get('/documents/:processingId', controller.getDocumentDetail);

/**
 * DELETE /api/document-intelligence/documents/review-required
 * Bulk soft-deletes all Review Required documents for the authenticated user and organization.
 */
router.delete('/documents/review-required', controller.bulkDeleteReviewRequired);

/**
 * DELETE /api/document-intelligence/documents/:processingId
 * Soft-deletes the upload, KnowledgeRecord, and saved review drafts only.
 */
router.delete('/documents/:processingId', controller.deleteDocument);

export default router;
