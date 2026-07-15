import { KnowledgeRecordModel } from '../../models/KnowledgeRecord';
import { UaipUpload } from '../../models/UaipUpload';

export type GrowthReviewStatus =
  | 'NOT_READY'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export interface GrowthUploadHistoryItem {
  processingId: string;
  fileName: string;
  mimeType: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  reviewStatus: GrowthReviewStatus;
}

export interface GrowthUploadHistory {
  items: GrowthUploadHistoryItem[];
  nextCursor: string | null;
}

export interface GrowthProcessingStatus {
  processingId: string;
  fileName: string;
  mimeType: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  classification: {
    documentCategory: string;
    documentSubtype?: string;
    language: string;
    isScanned: boolean;
    parserStrategy: string;
    confidenceScore: number;
    createdAt: string;
  } | null;
  candidateSummary: {
    available: boolean;
    reasonCode: 'REVIEW_WORKFLOW_PENDING' | 'NOT_READY';
  };
  reviewStatus: GrowthReviewStatus;
  errorMessage: string | null;
}

const toIso = (value: Date | string | undefined | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getReviewStatus = (status: string): GrowthReviewStatus => {
  if (status === 'SUCCESS') return 'PENDING_REVIEW';
  return 'NOT_READY';
};

export class GrowthUploadService {
  async getUploadHistory(params: {
    userId: string;
    organizationId: string;
    limit?: number;
    cursor?: string;
  }): Promise<GrowthUploadHistory> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const filter: any = {
      userId: params.userId,
      organizationId: params.organizationId,
    };

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        filter.createdAt = { $lt: cursorDate };
      }
    }

    const uploads = await UaipUpload.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const page = uploads.slice(0, limit);
    const items = page.map((upload: any) => ({
      processingId: String(upload.processingId),
      fileName: String(upload.fileName),
      mimeType: String(upload.mimeType),
      status: String(upload.status),
      createdAt: toIso(upload.createdAt) ?? new Date(0).toISOString(),
      completedAt: toIso(upload.completedAt),
      reviewStatus: getReviewStatus(String(upload.status)),
    }));

    const nextCursor = uploads.length > limit
      ? toIso((uploads[limit] as any).createdAt)
      : null;

    return { items, nextCursor };
  }

  async getProcessingStatus(params: {
    userId: string;
    organizationId: string;
    processingId: string;
  }): Promise<GrowthProcessingStatus | null> {
    const upload = await UaipUpload.findOne({
      processingId: params.processingId,
      userId: params.userId,
      organizationId: params.organizationId,
    }).lean();

    if (!upload) {
      return null;
    }

    const knowledgeRecord = await KnowledgeRecordModel.findOne({
      processingId: params.processingId,
    }).lean();

    const status = String((upload as any).status);
    const reviewStatus = getReviewStatus(status);

    return {
      processingId: String((upload as any).processingId),
      fileName: String((upload as any).fileName),
      mimeType: String((upload as any).mimeType),
      status,
      createdAt: toIso((upload as any).createdAt) ?? new Date(0).toISOString(),
      completedAt: toIso((upload as any).completedAt),
      classification: knowledgeRecord
        ? {
          documentCategory: String((knowledgeRecord as any).documentCategory),
          documentSubtype: (knowledgeRecord as any).documentSubtype,
          language: String((knowledgeRecord as any).language),
          isScanned: Boolean((knowledgeRecord as any).isScanned),
          parserStrategy: String((knowledgeRecord as any).parserStrategy),
          confidenceScore: Number((knowledgeRecord as any).confidenceScore),
          createdAt: toIso((knowledgeRecord as any).createdAt) ?? new Date(0).toISOString(),
        }
        : null,
      candidateSummary: {
        available: false,
        reasonCode: reviewStatus === 'PENDING_REVIEW' ? 'REVIEW_WORKFLOW_PENDING' : 'NOT_READY',
      },
      reviewStatus,
      errorMessage: (upload as any).errorMessage ?? null,
    };
  }
}
