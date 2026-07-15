/**
 * documentIntelligence.repository.ts
 *
 * Data access layer for the Document Intelligence Center.
 * All queries are strictly scoped by organizationId for tenant isolation.
 * Never exposes documents from a different organization.
 */

import { UaipUpload } from '../../models/UaipUpload';
import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';
import { ReviewHistory } from '../../models/ReviewHistory';
import type {
  DicDocument,
  DicDocumentListResponse,
  DicAnalytics,
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
    const uploadFilter: Record<string, any> = { organizationId };

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
    }).lean();

    const krByPid = new Map(
      knowledgeRecords.map((kr: any) => [String(kr.processingId), kr])
    );

    // Batch-fetch last ReviewHistory entries for these processingIds
    const reviewHistories = await ReviewHistory.find({
      processingId: { $in: processingIds },
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
    const total = await UaipUpload.countDocuments({ organizationId });

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
    const allUploads = await UaipUpload.find({ organizationId }).lean();
    const processingIds = allUploads.map((u: any) => String(u.processingId));

    const knowledgeRecords = await KnowledgeRecordModel.find({
      processingId: { $in: processingIds },
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
    }).lean();

    if (!upload) return null;

    const kr: any = await KnowledgeRecordModel.findOne({ processingId }).lean();
    const latestReview: any = await ReviewHistory.findOne({ processingId })
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
}
