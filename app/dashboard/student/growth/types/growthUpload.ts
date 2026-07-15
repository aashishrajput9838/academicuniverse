/** Status values from the UaipUpload model */
export type GrowthUploadStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'VALIDATION_ERROR';

/** Review readiness derived from processing status */
export type GrowthReviewStatus =
  | 'NOT_READY'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

/** Shape of a single upload item from GET /api/growth/uploads */
export interface GrowthUploadHistoryItem {
  processingId: string;
  fileName: string;
  mimeType: string;
  status: GrowthUploadStatus;
  createdAt: string;
  completedAt: string | null;
  reviewStatus: GrowthReviewStatus;
}

/** Paginated upload history response */
export interface GrowthUploadHistory {
  items: GrowthUploadHistoryItem[];
  nextCursor: string | null;
}

/** Classification detail from KnowledgeRecord */
export interface GrowthClassificationDetail {
  documentCategory: string;
  documentSubtype?: string;
  language: string;
  isScanned: boolean;
  parserStrategy: string;
  confidenceScore: number;
  createdAt: string;
}

/** Candidate data summary — Phase-2 only, always unavailable in Phase-1 */
export interface GrowthCandidateSummary {
  available: boolean;
  reasonCode: 'REVIEW_WORKFLOW_PENDING' | 'NOT_READY';
}

/** Full processing status from GET /api/growth/uploads/:processingId */
export interface GrowthProcessingStatus {
  processingId: string;
  fileName: string;
  mimeType: string;
  status: GrowthUploadStatus;
  createdAt: string;
  completedAt: string | null;
  classification: GrowthClassificationDetail | null;
  candidateSummary: GrowthCandidateSummary;
  reviewStatus: GrowthReviewStatus;
  errorMessage: string | null;
}

/** Upload response from POST /api/growth/documents */
export interface GrowthUploadResponse {
  processingId: string;
}

/** Visual step in the processing timeline UI */
export type ProcessingStepState = 'completed' | 'running' | 'waiting' | 'failed';

export interface ProcessingTimelineStep {
  label: string;
  state: ProcessingStepState;
}

/** Terminal statuses that should stop polling */
export const TERMINAL_STATUSES: ReadonlySet<GrowthUploadStatus> = new Set([
  'SUCCESS',
  'FAILED',
  'VALIDATION_ERROR',
]);

/**
 * Derives timeline steps from the actual UAIP processing status.
 * Never fakes intermediate progress — only reflects what the pipeline reports.
 */
export function deriveTimelineSteps(status: GrowthUploadStatus, errorMessage: string | null): ProcessingTimelineStep[] {
  switch (status) {
    case 'PENDING':
      return [
        { label: 'Stored', state: 'completed' },
        { label: 'Processing', state: 'waiting' },
        { label: 'Extraction', state: 'waiting' },
        { label: 'Review', state: 'waiting' },
      ];
    case 'PROCESSING':
      return [
        { label: 'Stored', state: 'completed' },
        { label: 'Processing', state: 'running' },
        { label: 'Extraction', state: 'waiting' },
        { label: 'Review', state: 'waiting' },
      ];
    case 'SUCCESS':
      return [
        { label: 'Stored', state: 'completed' },
        { label: 'Processing', state: 'completed' },
        { label: 'Extraction', state: 'completed' },
        { label: 'Review', state: 'completed' },
      ];
    case 'FAILED':
      return [
        { label: 'Stored', state: 'completed' },
        { label: 'Processing', state: 'failed' },
        { label: 'Extraction', state: 'waiting' },
        { label: 'Review', state: 'waiting' },
      ];
    case 'VALIDATION_ERROR':
      return [
        { label: 'Validation', state: 'failed' },
        { label: 'Processing', state: 'waiting' },
        { label: 'Extraction', state: 'waiting' },
        { label: 'Review', state: 'waiting' },
      ];
    default:
      return [
        { label: 'Stored', state: 'waiting' },
        { label: 'Processing', state: 'waiting' },
        { label: 'Extraction', state: 'waiting' },
        { label: 'Review', state: 'waiting' },
      ];
  }
}
