/**
 * documentIntelligence.repository.ts
 *
 * Data access layer for the Document Intelligence Center.
 * All queries are strictly scoped by organizationId for tenant isolation.
 * Never exposes documents from a different organization.
 */

import mongoose from 'mongoose';
import { UaipUpload } from '../../models/UaipUpload';
import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';
import { ReviewHistory } from '../../models/ReviewHistory';
import { GridFSProvider } from '../../storage/GridFSProvider';
import { OCRService } from '../../services/ocr/OCRService';
import { logger } from '../../utils/logger';
import type {
  DicDocument,
  DicDocumentListResponse,
  DicAnalytics,
  DicDeleteDocumentResult,
  DicBulkDeleteResult,
  DicListQueryParams,
  DicReviewStatus,
} from './documentIntelligence.types';

const toIso = (value: Date | string | undefined | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const resolveReviewStatus = (
  uploadStatus: string,
  krReviewStatus?: string | null
): DicReviewStatus => {
  if (krReviewStatus === 'APPROVED') return 'APPROVED';
  if (krReviewStatus === 'REJECTED') return 'REJECTED';
  if (uploadStatus === 'SUCCESS') return 'PENDING_REVIEW';
  return 'NOT_READY';
};

const isDocumentDeletable = (
  uploadStatus: string,
  krReviewStatus?: string | null
): boolean => {
  // Block active processing states
  if (uploadStatus === 'PENDING' || uploadStatus === 'PROCESSING') {
    return false;
  }

  // Block approved documents — canonical records exist, rollback required first
  if (krReviewStatus === 'APPROVED') {
    return false;
  }

  // All other terminal states are deletable:
  // FAILED, VALIDATION_ERROR, SUCCESS+PENDING_REVIEW, SUCCESS+REJECTED, NOT_READY, etc.
  return true;
};

export class DocumentIntelligenceRepository {
  /**
   * List documents with filtering, sorting, and cursor-based pagination.
   * Scoped strictly by organizationId.
   */
  async listDocuments(
    organizationId: string,
    params: DicListQueryParams
  ): Promise<DicDocumentListResponse> {
    const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);

    // Build UaipUpload query filter
    const uploadFilter: Record<string, any> = {
      organizationId,
      status: { $ne: 'DELETED' },
    };

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        uploadFilter.createdAt = { $lt: cursorDate };
      }
    }

    // Determine sort order
    const sortField = params.sortBy === 'createdAt' || !params.sortBy ? 'createdAt' : 'createdAt';
    const sortDir = params.sortOrder === 'asc' ? 1 : -1;

    const uploads = await UaipUpload.find(uploadFilter)
      .sort({ [sortField]: sortDir })
      .limit(limit + 1)
      .lean();

    const page = uploads.slice(0, limit);

    // Batch-fetch KnowledgeRecords
    const processingIds = page.map((u: any) => String(u.processingId));
    const knowledgeRecords = await KnowledgeRecordModel.find({
      processingId: { $in: processingIds },
      status: { $ne: 'DELETED' },
    }).lean();

    const krByPid = new Map(
      knowledgeRecords.map((kr: any) => [String(kr.processingId), kr])
    );

    // Batch-fetch last ReviewHistory entries for these processingIds
    const reviewHistories = await ReviewHistory.find({
      processingId: { $in: processingIds },
      status: { $ne: 'DELETED' },
    })
      .sort({ timestamp: -1 })
      .lean();

    // Build a map: processingId → latest review action
    const latestReviewByPid = new Map<string, any>();
    for (const rh of reviewHistories) {
      const pid = String((rh as any).processingId);
      if (!latestReviewByPid.has(pid)) {
        latestReviewByPid.set(pid, rh);
      }
    }

    let items: DicDocument[] = page.map((upload: any) => {
      const kr: any = krByPid.get(String(upload.processingId));
      const latestReview: any = latestReviewByPid.get(String(upload.processingId));
      const uploadStatus = String(upload.status);
      const krReviewStatus = kr ? String(kr.reviewStatus ?? '') : null;
      const reviewStatus = resolveReviewStatus(uploadStatus, krReviewStatus);

      const createdAt = toIso(upload.createdAt) ?? new Date(0).toISOString();
      const completedAt = toIso(upload.completedAt);
      const durationMs =
        upload.createdAt && upload.completedAt
          ? new Date(upload.completedAt).getTime() -
            new Date(upload.createdAt).getTime()
          : null;

      return {
        processingId: String(upload.processingId),
        fileName: String(upload.fileName),
        mimeType: String(upload.mimeType),
        size: typeof upload.size === 'number' ? upload.size : null,
        uploadStatus,
        reviewStatus,
        documentCategory: kr ? String(kr.documentCategory ?? '') : null,
        documentSubtype: kr ? (kr.documentSubtype ?? null) : null,
        confidenceScore: kr ? Number(kr.confidenceScore ?? 0) : null,
        parserStrategy: kr ? String(kr.parserStrategy ?? '') : null,
        language: kr ? String(kr.language ?? '') : null,
        isScanned: kr ? Boolean(kr.isScanned) : null,
        suggestedModule: kr ? (kr.suggestedModule ?? null) : null,
        summary: kr ? (kr.summary ?? null) : null,
        fileHash: upload.fileHash ?? null,
        errorMessage: upload.errorMessage ?? null,
        createdAt,
        completedAt,
        durationMs,
        hasCandidateFields:
          !!(kr &&
            kr.candidateFields &&
            Object.keys(kr.candidateFields).length > 0),
        reviewedBy: latestReview ? (latestReview.reviewerId ?? null) : null,
        reviewedAt: latestReview ? toIso(latestReview.timestamp) : null,
        rejectionReason:
          latestReview?.action === 'REJECTED'
            ? (latestReview.rejectionReason ?? null)
            : null,
      };
    });

    // Apply status filter (post-processing since reviewStatus is derived)
    if (params.status && params.status !== 'ALL') {
      items = items.filter((item) => item.reviewStatus === params.status);
    }

    // Apply category filter
    if (params.category) {
      items = items.filter(
        (item) =>
          item.documentCategory?.toLowerCase() ===
          params.category!.toLowerCase()
      );
    }

    // Apply search filter (filename)
    if (params.search) {
      const term = params.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.fileName.toLowerCase().includes(term) ||
          (item.documentCategory ?? '').toLowerCase().includes(term) ||
          (item.summary ?? '').toLowerCase().includes(term)
      );
    }

    // Total count for this org (without pagination)
    const total = await UaipUpload.countDocuments({
      organizationId,
      status: { $ne: 'DELETED' },
    });

    const nextCursor =
      uploads.length > limit
        ? toIso((uploads[limit] as any).createdAt)
        : null;

    return { items, total, nextCursor };
  }

  /**
   * Get analytics summary for the organization.
   */
  async getAnalytics(organizationId: string): Promise<DicAnalytics> {
    // All uploads for this org
    const allUploads = await UaipUpload.find({
      organizationId,
      status: { $ne: 'DELETED' },
    }).lean();
    const processingIds = allUploads.map((u: any) => String(u.processingId));

    const knowledgeRecords = await KnowledgeRecordModel.find({
      processingId: { $in: processingIds },
      status: { $ne: 'DELETED' },
    }).lean();

    const krByPid = new Map(
      knowledgeRecords.map((kr: any) => [String(kr.processingId), kr])
    );

    let pendingReview = 0;
    let approved = 0;
    let rejected = 0;
    let notReady = 0;
    const categoryCount = new Map<string, number>();
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const upload of allUploads) {
      const kr: any = krByPid.get(String((upload as any).processingId));
      const status = resolveReviewStatus(
        String((upload as any).status),
        kr ? String(kr.reviewStatus ?? '') : null
      );

      if (status === 'PENDING_REVIEW') pendingReview++;
      else if (status === 'APPROVED') approved++;
      else if (status === 'REJECTED') rejected++;
      else notReady++;

      if (kr) {
        const cat = String(kr.documentCategory ?? 'UNKNOWN');
        categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
        if (typeof kr.confidenceScore === 'number') {
          totalConfidence += kr.confidenceScore;
          confidenceCount++;
        }
      }
    }

    const byCategory = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Recent review activity (last 10 review actions for this org)
    const recentReviews = await ReviewHistory.find({
      processingId: { $in: processingIds },
      status: { $ne: 'DELETED' },
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const uploadNameMap = new Map(
      allUploads.map((u: any) => [String(u.processingId), String(u.fileName)])
    );

    const recentActivity = recentReviews.map((rh: any) => ({
      processingId: String(rh.processingId),
      fileName: uploadNameMap.get(String(rh.processingId)) ?? 'Unknown',
      action: String(rh.action ?? ''),
      timestamp: toIso(rh.timestamp) ?? new Date(0).toISOString(),
    }));

    return {
      totalDocuments: allUploads.length,
      pendingReview,
      approved,
      rejected,
      notReady,
      byCategory,
      averageConfidenceScore:
        confidenceCount > 0 ? totalConfidence / confidenceCount : null,
      recentActivity,
    };
  }

  /**
   * Get a single document detail by processingId, scoped by organizationId.
   */
  async getDocumentDetail(
    organizationId: string,
    processingId: string
  ): Promise<DicDocument | null> {
    const upload = await UaipUpload.findOne({
      processingId,
      organizationId,
      status: { $ne: 'DELETED' },
    }).lean();

    if (!upload) return null;

    const kr: any = await KnowledgeRecordModel.findOne({
      processingId,
      status: { $ne: 'DELETED' },
    }).lean();
    const latestReview: any = await ReviewHistory.findOne({
      processingId,
      status: { $ne: 'DELETED' },
    })
      .sort({ timestamp: -1 })
      .lean();

    const uploadStatus = String((upload as any).status);
    const krReviewStatus = kr ? String(kr.reviewStatus ?? '') : null;
    const reviewStatus = resolveReviewStatus(uploadStatus, krReviewStatus);

    const createdAt =
      toIso((upload as any).createdAt) ?? new Date(0).toISOString();
    const completedAt = toIso((upload as any).completedAt);
    const durationMs =
      (upload as any).createdAt && (upload as any).completedAt
        ? new Date((upload as any).completedAt).getTime() -
          new Date((upload as any).createdAt).getTime()
        : null;

    return {
      processingId: String((upload as any).processingId),
      fileName: String((upload as any).fileName),
      mimeType: String((upload as any).mimeType),
      size:
        typeof (upload as any).size === 'number' ? (upload as any).size : null,
      uploadStatus,
      reviewStatus,
      documentCategory: kr ? String(kr.documentCategory ?? '') : null,
      documentSubtype: kr ? (kr.documentSubtype ?? null) : null,
      confidenceScore: kr ? Number(kr.confidenceScore ?? 0) : null,
      parserStrategy: kr ? String(kr.parserStrategy ?? '') : null,
      language: kr ? String(kr.language ?? '') : null,
      isScanned: kr ? Boolean(kr.isScanned) : null,
      suggestedModule: kr ? (kr.suggestedModule ?? null) : null,
      summary: kr ? (kr.summary ?? null) : null,
      fileHash: (upload as any).fileHash ?? null,
      errorMessage: (upload as any).errorMessage ?? null,
      createdAt,
      completedAt,
      durationMs,
      hasCandidateFields: !!(
        kr &&
        kr.candidateFields &&
        Object.keys(kr.candidateFields).length > 0
      ),
      reviewedBy: latestReview ? (latestReview.reviewerId ?? null) : null,
      reviewedAt: latestReview ? toIso(latestReview.timestamp) : null,
      rejectionReason:
        latestReview?.action === 'REJECTED'
          ? (latestReview.rejectionReason ?? null)
          : null,
    };
  }

  /**
   * Soft-delete an eligible document and its non-canonical workflow records.
   * A saved review draft is represented by ReviewHistory.action === DRAFT_SAVED.
   */
  async softDeleteDocument(
    organizationId: string,
    processingId: string,
    deletedBy: string
  ): Promise<DicDeleteDocumentResult> {
    let result: DicDeleteDocumentResult;

    // Detect replica set support for transactions
    let supportsTransactions = false;
    try {
      if (mongoose.connection && mongoose.connection.db) {
        const isMasterResult = await mongoose.connection.db.admin().command({ isMaster: 1 });
        supportsTransactions = !!(isMasterResult.setName || isMasterResult.hosts);
      }
    } catch (err) {
      logger.warn('[DIC] Failed to query MongoDB isMaster command; assuming standalone mode', err);
    }

    if (supportsTransactions) {
      logger.info('[DIC] MongoDB transaction mode');
      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        const upload: any = await UaipUpload.findOne({
          processingId,
          organizationId,
          status: { $ne: 'DELETED' },
        }).session(session);

        if (!upload) {
          result = { outcome: 'NOT_FOUND', processingId };
        } else {
          const knowledgeRecord: any = await KnowledgeRecordModel.findOne({
            processingId,
            status: { $ne: 'DELETED' },
          }).session(session);

          if (knowledgeRecord && String(knowledgeRecord.reviewStatus) === 'APPROVED') {
            result = { outcome: 'APPROVED', processingId };
          } else if (!isDocumentDeletable(String(upload.status), knowledgeRecord ? String(knowledgeRecord.reviewStatus ?? '') : null)) {
            result = { outcome: 'NOT_DELETABLE', processingId };
          } else {
            const deletedAt = new Date();

            if (upload.fileHash) {
              upload.deletedFileHash = upload.fileHash;
            }
            upload.fileHash = `deleted-${processingId}`;
            upload.status = 'DELETED';
            upload.deletedAt = deletedAt;
            upload.deletedBy = deletedBy;
            await upload.save({ session });

            await KnowledgeRecordModel.updateMany(
              { processingId, status: { $ne: 'DELETED' } },
              {
                $set: {
                  status: 'DELETED',
                  deletedAt,
                  deletedBy,
                },
              },
              { session }
            );

            await ReviewHistory.updateMany(
              {
                processingId,
                action: 'DRAFT_SAVED',
                status: { $ne: 'DELETED' },
              },
              {
                $set: {
                  status: 'DELETED',
                  deletedAt,
                  deletedBy,
                },
              },
              { session }
            );

            // Cleanup external artifacts outside the transaction
            const storageId = (upload as any).storageId as string | undefined;
            if (storageId) {
              try {
                const gridFs = new GridFSProvider();
                await gridFs.delete(storageId);
              } catch (err) {
                logger.warn(`[DIC] Failed to delete GridFS file ${storageId} for ${processingId}:`, err);
              }
            }

            try {
              await OCRService.clearProcessingId(processingId);
            } catch (err) {
              logger.warn(`[DIC] Failed to clear OCR idempotency for ${processingId}:`, err);
            }

            result = {
              outcome: 'DELETED',
              processingId,
              deletedAt: deletedAt.toISOString(),
            };
          }
        }

        await session.commitTransaction();
        return result;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        await session.endSession();
      }
    } else {
      logger.info('[DIC] MongoDB standalone fallback mode');
      // Sequential soft deletes with manual rollbacks if fails midway
      const upload: any = await UaipUpload.findOne({
        processingId,
        organizationId,
        status: { $ne: 'DELETED' },
      });

      if (!upload) {
        return { outcome: 'NOT_FOUND', processingId };
      }

      const knowledgeRecord: any = await KnowledgeRecordModel.findOne({
        processingId,
        status: { $ne: 'DELETED' },
      });
      const reviewStatus = resolveReviewStatus(
        String(upload.status),
        knowledgeRecord ? String(knowledgeRecord.reviewStatus ?? '') : null
      );

      if (reviewStatus === 'APPROVED') {
        return { outcome: 'APPROVED', processingId };
      }
      if (!isDocumentDeletable(String(upload.status), knowledgeRecord ? String(knowledgeRecord.reviewStatus ?? '') : null)) {
        return { outcome: 'NOT_DELETABLE', processingId };
      }

      const deletedAt = new Date();

      try {
        // Step 1: Update ReviewHistory (DRAFT_SAVED entries)
        await ReviewHistory.updateMany(
          {
            processingId,
            action: 'DRAFT_SAVED',
            status: { $ne: 'DELETED' },
          },
          {
            $set: {
              status: 'DELETED',
              deletedAt,
              deletedBy,
            },
          }
        );

        // Step 2: Update KnowledgeRecord(s)
        try {
          await KnowledgeRecordModel.updateMany(
            { processingId, status: { $ne: 'DELETED' } },
            {
              $set: {
                status: 'DELETED',
                deletedAt,
                deletedBy,
              },
            }
          );

          // Step 3: Update UaipUpload (Final persistence step, keeping fileHash untouched in memory until here)
          try {
            const updateFields: any = {
              status: 'DELETED',
              deletedAt,
              deletedBy,
              fileHash: `deleted-${processingId}`,
            };
            if (upload.fileHash) {
              updateFields.deletedFileHash = upload.fileHash;
            }

            await UaipUpload.updateOne({ _id: upload._id }, updateFields);
          } catch (uploadErr) {
            // Rollback KnowledgeRecord
            await KnowledgeRecordModel.updateMany(
              { processingId, status: 'DELETED', deletedAt, deletedBy },
              {
                $set: { status: 'ACTIVE' },
                $unset: { deletedAt: 1, deletedBy: 1 },
              }
            );
            // Rollback ReviewHistory
            await ReviewHistory.updateMany(
              {
                processingId,
                action: 'DRAFT_SAVED',
                status: 'DELETED',
                deletedAt,
                deletedBy,
              },
              {
                $unset: { status: 1, deletedAt: 1, deletedBy: 1 },
              }
            );
            throw uploadErr;
          }
        } catch (krErr) {
          // Rollback ReviewHistory
          await ReviewHistory.updateMany(
            {
              processingId,
              action: 'DRAFT_SAVED',
              status: 'DELETED',
              deletedAt,
              deletedBy,
            },
            {
              $unset: { status: 1, deletedAt: 1, deletedBy: 1 },
            }
          );
          throw krErr;
        }

        // Cleanup external artifacts after successful DB soft-delete
        const storageId = (upload as any).storageId as string | undefined;
        if (storageId) {
          try {
            const gridFs = new GridFSProvider();
            await gridFs.delete(storageId);
          } catch (err) {
            logger.warn(`[DIC] Failed to delete GridFS file ${storageId} for ${processingId}:`, err);
          }
        }

        try {
          await OCRService.clearProcessingId(processingId);
        } catch (err) {
          logger.warn(`[DIC] Failed to clear OCR idempotency for ${processingId}:`, err);
        }

        return {
          outcome: 'DELETED',
          processingId,
          deletedAt: deletedAt.toISOString(),
        };
      } catch (err: any) {
        throw new Error(`Sequential soft delete failed midway. Rollback performed. Error: ${err.message}`);
      }
    }
  }

  /**
   * Bulk soft-delete all Review Required documents for a specific user within an organization.
   * Strictly validates organizationId and uploadedBy/userId ownership.
   * Wrapped in a transaction where supported, with bulkWrite/updateMany performance.
   */
  async bulkDeleteReviewRequired(
    organizationId: string,
    userId: string,
    requestId?: string
  ): Promise<DicBulkDeleteResult> {
    const startTime = Date.now();

    // 1. Fetch candidate uploads for this org and user
    const userFilter = {
      organizationId,
      status: { $ne: 'DELETED' },
      $or: [{ uploadedBy: userId }, { userId: userId }],
    };

    const candidateUploads = await UaipUpload.find(userFilter).lean();

    if (candidateUploads.length === 0) {
      return {
        totalMatched: 0,
        successfullyDeleted: 0,
        failedCount: 0,
        failedProcessingIds: [],
        deletedProcessingIds: [],
        durationMs: Date.now() - startTime,
      };
    }

    const candidatePids = candidateUploads.map((u: any) => String(u.processingId));

    // 2. Fetch KnowledgeRecords for these candidate processingIds
    const knowledgeRecords = await KnowledgeRecordModel.find({
      processingId: { $in: candidatePids },
      status: { $ne: 'DELETED' },
    }).lean();

    const krByPid = new Map(
      knowledgeRecords.map((kr: any) => [String(kr.processingId), kr])
    );

    // 3. Filter strictly for REVIEW_REQUIRED / PENDING_REVIEW documents that are deletable
    const eligibleUploads = candidateUploads.filter((upload: any) => {
      const kr: any = krByPid.get(String(upload.processingId));
      const uploadStatus = String(upload.status);
      const krReviewStatus = kr ? String(kr.reviewStatus ?? '') : null;
      const reviewStatus = resolveReviewStatus(uploadStatus, krReviewStatus);

      // Must be PENDING_REVIEW (or reviewStatus PENDING_REVIEW) and deletable (not APPROVED, not PROCESSING)
      const isReviewRequired =
        reviewStatus === 'PENDING_REVIEW' ||
        krReviewStatus === 'PENDING_REVIEW' ||
        upload.reviewStatus === 'PENDING_REVIEW';

      return isReviewRequired && isDocumentDeletable(uploadStatus, krReviewStatus);
    });

    const totalMatched = eligibleUploads.length;
    if (totalMatched === 0) {
      return {
        totalMatched: 0,
        successfullyDeleted: 0,
        failedCount: 0,
        failedProcessingIds: [],
        deletedProcessingIds: [],
        durationMs: Date.now() - startTime,
      };
    }

    const eligiblePids = eligibleUploads.map((u: any) => String(u.processingId));
    const deletedAt = new Date();

    // Check transaction support
    let supportsTransactions = false;
    try {
      if (mongoose.connection && mongoose.connection.db) {
        const isMasterResult = await mongoose.connection.db.admin().command({ isMaster: 1 });
        supportsTransactions = !!(isMasterResult.setName || isMasterResult.hosts);
      }
    } catch (err) {
      logger.warn('[DIC] Failed to query MongoDB isMaster command; assuming standalone mode', err);
    }

    const performDatabaseSoftDelete = async (session?: mongoose.ClientSession) => {
      // BulkWrite for UaipUpload to update status, deletedAt, deletedBy and unique fileHash
      const bulkOps = eligibleUploads.map((upload: any) => {
        const pid = String(upload.processingId);
        const updateFields: Record<string, any> = {
          status: 'DELETED',
          deletedAt,
          deletedBy: userId,
          fileHash: `deleted-${pid}`,
        };
        if (upload.fileHash) {
          updateFields.deletedFileHash = upload.fileHash;
        }

        return {
          updateOne: {
            filter: { _id: upload._id, status: { $ne: 'DELETED' } },
            update: { $set: updateFields },
          },
        };
      });

      const options = session ? { session } : {};
      await UaipUpload.bulkWrite(bulkOps, options);

      await KnowledgeRecordModel.updateMany(
        { processingId: { $in: eligiblePids }, status: { $ne: 'DELETED' } },
        {
          $set: {
            status: 'DELETED',
            deletedAt,
            deletedBy: userId,
          },
        },
        options
      );

      await ReviewHistory.updateMany(
        {
          processingId: { $in: eligiblePids },
          action: 'DRAFT_SAVED',
          status: { $ne: 'DELETED' },
        },
        {
          $set: {
            status: 'DELETED',
            deletedAt,
            deletedBy: userId,
          },
        },
        options
      );
    };

    if (supportsTransactions) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        await performDatabaseSoftDelete(session);
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        logger.error('[DIC] Bulk delete transaction failed and aborted:', err);
        throw err;
      } finally {
        await session.endSession();
      }
    } else {
      await performDatabaseSoftDelete();
    }

    // External artifact cleanup (GridFS, Cloudinary, OCR cache)
    const failedProcessingIds: string[] = [];
    const successfullyDeletedPids: string[] = [];

    for (const upload of eligibleUploads) {
      const pid = String(upload.processingId);
      let artifactFailed = false;

      const storageId = (upload as any).storageId as string | undefined;
      if (storageId) {
        try {
          const gridFs = new GridFSProvider();
          await gridFs.delete(storageId);
        } catch (err) {
          logger.warn(`[DIC] Failed to delete GridFS file ${storageId} for ${pid} during bulk delete:`, err);
          artifactFailed = true;
        }
      }

      try {
        await OCRService.clearProcessingId(pid);
      } catch (err) {
        logger.warn(`[DIC] Failed to clear OCR idempotency for ${pid} during bulk delete:`, err);
        artifactFailed = true;
      }

      if (artifactFailed) {
        failedProcessingIds.push(pid);
      }
      successfullyDeletedPids.push(pid);
    }

    const durationMs = Date.now() - startTime;

    logger.info('[DIC] Bulk delete Review Required files completed', {
      userId,
      organizationId,
      totalMatched,
      successfullyDeleted: successfullyDeletedPids.length,
      failedCount: failedProcessingIds.length,
      durationMs,
      requestId,
      timestamp: deletedAt.toISOString(),
    });

    return {
      totalMatched,
      successfullyDeleted: successfullyDeletedPids.length,
      failedCount: failedProcessingIds.length,
      failedProcessingIds,
      deletedProcessingIds: successfullyDeletedPids,
      durationMs,
    };
  }
}

