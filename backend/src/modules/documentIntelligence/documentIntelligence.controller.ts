/**
 * documentIntelligence.controller.ts
 *
 * HTTP controller for the Document Intelligence Center (DIC) module.
 * All endpoints require authentication and organization isolation.
 */

import { Request, Response, NextFunction } from 'express';
import { sendError, sendResponse } from '../../utils/response';
import { DocumentIntelligenceService } from './documentIntelligence.service';
import type { DicListQueryParams, DicReviewStatus, DicSortField, DicSortOrder } from './documentIntelligence.types';

const VALID_STATUSES = new Set<string>([
  'ALL',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'NOT_READY',
]);

const VALID_SORT_FIELDS = new Set<string>([
  'createdAt',
  'fileName',
  'documentCategory',
  'confidenceScore',
]);

export class DocumentIntelligenceController {
  constructor(
    private readonly service: DocumentIntelligenceService = new DocumentIntelligenceService()
  ) {}

  /**
   * GET /api/document-intelligence/documents
   * Returns paginated, filtered document list for the authenticated organization.
   */
  public listDocuments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = (req as any).organizationId as string;
      if (!organizationId) {
        res.status(403).json({ success: false, message: 'Organization context required' });
        return;
      }

      const rawStatus = Array.isArray(req.query.status)
        ? req.query.status[0]
        : req.query.status;
      const rawSortBy = Array.isArray(req.query.sortBy)
        ? req.query.sortBy[0]
        : req.query.sortBy;
      const rawSortOrder = Array.isArray(req.query.sortOrder)
        ? req.query.sortOrder[0]
        : req.query.sortOrder;
      const rawLimit = Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit;
      const rawCursor = Array.isArray(req.query.cursor)
        ? req.query.cursor[0]
        : req.query.cursor;
      const rawCategory = Array.isArray(req.query.category)
        ? req.query.category[0]
        : req.query.category;
      const rawSearch = Array.isArray(req.query.search)
        ? req.query.search[0]
        : req.query.search;

      const status =
        typeof rawStatus === 'string' && VALID_STATUSES.has(rawStatus)
          ? (rawStatus as DicReviewStatus | 'ALL')
          : undefined;

      const sortBy =
        typeof rawSortBy === 'string' && VALID_SORT_FIELDS.has(rawSortBy)
          ? (rawSortBy as DicSortField)
          : 'createdAt';

      const sortOrder =
        rawSortOrder === 'asc' || rawSortOrder === 'desc'
          ? (rawSortOrder as DicSortOrder)
          : 'desc';

      const limit = rawLimit ? Math.min(Number(rawLimit), 100) : 25;

      const params: DicListQueryParams = {
        status,
        category: typeof rawCategory === 'string' ? rawCategory : undefined,
        search: typeof rawSearch === 'string' ? rawSearch : undefined,
        sortBy,
        sortOrder,
        limit: Number.isFinite(limit) ? limit : 25,
        cursor: typeof rawCursor === 'string' ? rawCursor : undefined,
      };

      const result = await this.service.listDocuments(organizationId, params);
      sendResponse(res, 200, result, 'Documents retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/document-intelligence/analytics
   * Returns analytics summary for the authenticated organization.
   */
  public getAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = (req as any).organizationId as string;
      if (!organizationId) {
        res.status(403).json({ success: false, message: 'Organization context required' });
        return;
      }

      const analytics = await this.service.getAnalytics(organizationId);
      sendResponse(res, 200, analytics, 'Analytics retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/document-intelligence/documents/:processingId
   * Returns full detail for a single document, scoped by organizationId.
   */
  public getDocumentDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = (req as any).organizationId as string;
      if (!organizationId) {
        res.status(403).json({ success: false, message: 'Organization context required' });
        return;
      }

      const { processingId } = req.params;
      if (!processingId) {
        res.status(400).json({ success: false, message: 'processingId is required' });
        return;
      }

      const doc = await this.service.getDocumentDetail(organizationId, processingId);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Document not found' });
        return;
      }

      sendResponse(res, 200, doc, 'Document detail retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/document-intelligence/documents/:processingId
   * Soft-deletes workflow records only. Canonical collections are never touched.
   */
  public deleteDocument = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = (req as any).organizationId as string;
      const deletedBy = (req as any).user?.userId as string;
      const { processingId } = req.params;

      if (!organizationId) {
        sendError(res, 403, 'Organization context required');
        return;
      }
      if (!deletedBy) {
        sendError(res, 401, 'Authentication required');
        return;
      }
      if (!processingId) {
        sendError(res, 400, 'processingId is required');
        return;
      }

      const result = await this.service.softDeleteDocument(
        organizationId,
        processingId,
        deletedBy
      );

      if (result.outcome === 'NOT_FOUND') {
        sendError(res, 404, 'Document not found');
        return;
      }
      if (result.outcome === 'APPROVED') {
        sendError(
          res,
          409,
          'This document has already produced canonical records. Perform a rollback before deletion.'
        );
        return;
      }
      if (result.outcome === 'NOT_DELETABLE') {
        sendError(res, 409, 'Only documents in PENDING_REVIEW, DRAFT, or REJECTED status can be deleted.');
        return;
      }

      sendResponse(res, 200, result, 'Document deleted successfully');
    } catch (err) {
      next(err);
    }
  };
}
