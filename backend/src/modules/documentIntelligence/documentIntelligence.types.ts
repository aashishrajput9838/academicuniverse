/**
 * documentIntelligence.types.ts
 *
 * Shared TypeScript types for the Document Intelligence Center (DIC) module.
 * All query params, response shapes, and enums live here.
 */

export type DicReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NOT_READY';

export type DicSortField = 'createdAt' | 'fileName' | 'documentCategory' | 'confidenceScore';
export type DicSortOrder = 'asc' | 'desc';

/** A single document entry as returned by the DIC list API */
export interface DicDocument {
  processingId: string;
  fileName: string;
  mimeType: string;
  size: number | null;
  uploadStatus: string;
  reviewStatus: DicReviewStatus;
  documentCategory: string | null;
  documentSubtype: string | null;
  confidenceScore: number | null;
  parserStrategy: string | null;
  language: string | null;
  isScanned: boolean | null;
  suggestedModule: string | null;
  summary: string | null;
  fileHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  /** Whether candidate fields are available for review */
  hasCandidateFields: boolean;
  /** Reviewer info (populated if APPROVED or REJECTED) */
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

/** Paginated response for document list */
export interface DicDocumentListResponse {
  items: DicDocument[];
  total: number;
  nextCursor: string | null;
}

export type DicDeleteDocumentOutcome = 'DELETED' | 'NOT_FOUND' | 'APPROVED' | 'NOT_DELETABLE';

/** Result of a soft-delete attempt. No canonical collection is ever modified. */
export interface DicDeleteDocumentResult {
  outcome: DicDeleteDocumentOutcome;
  processingId: string;
  deletedAt?: string;
}

/** Analytics summary */
export interface DicAnalytics {
  totalDocuments: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  notReady: number;
  byCategory: Array<{ category: string; count: number }>;
  averageConfidenceScore: number | null;
  recentActivity: Array<{
    processingId: string;
    fileName: string;
    action: string;
    timestamp: string;
  }>;
}

/** Query params for the list endpoint */
export interface DicListQueryParams {
  status?: DicReviewStatus | 'ALL';
  category?: string;
  search?: string;
  sortBy?: DicSortField;
  sortOrder?: DicSortOrder;
  limit?: number;
  cursor?: string;
}
