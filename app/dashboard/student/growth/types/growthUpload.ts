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
  size: number | null;
  status: GrowthUploadStatus;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  reviewStatus: GrowthReviewStatus;
  documentCategory: string | null;
  confidenceScore: number | null;
  parserStrategy: string | null;
  errorMessage: string | null;
  fileHash?: string;
}

/** Paginated upload history response */
export interface GrowthUploadHistory {
  items: GrowthUploadHistoryItem[];
  nextCursor: string | null;
}

/** AI module routing recommendation */
export interface TargetModuleRecommendation {
  id: string;
  name?: string;
  confidence: number;
  reason?: string;
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
  summary?: string;
  suggestedModule?: string;
  primaryTargetModule?: TargetModuleRecommendation | null;
  secondaryTargetModules?: TargetModuleRecommendation[];
  extractedEntities?: Record<string, unknown>;
  candidateFields?: Record<string, unknown>;
}

/** Candidate data summary */
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
        { label: 'Classifying', state: 'waiting' },
        { label: 'AI Extraction', state: 'waiting' },
        { label: 'Pending Review', state: 'waiting' },
      ];
    case 'PROCESSING':
      return [
        { label: 'Stored', state: 'completed' },
        { label: 'Classifying', state: 'running' },
        { label: 'AI Extraction', state: 'waiting' },
        { label: 'Pending Review', state: 'waiting' },
      ];
    case 'SUCCESS':
      return [
        { label: 'Stored', state: 'completed' },
        { label: 'Classifying', state: 'completed' },
        { label: 'AI Extraction', state: 'completed' },
        { label: 'Pending Review', state: 'completed' },
      ];
    case 'FAILED':
      return [
        { label: 'Stored', state: 'completed' },
        { label: 'Classifying', state: 'failed' },
        { label: 'AI Extraction', state: 'waiting' },
        { label: 'Pending Review', state: 'waiting' },
      ];
    case 'VALIDATION_ERROR':
      return [
        { label: 'Validation', state: 'failed' },
        { label: 'Classifying', state: 'waiting' },
        { label: 'AI Extraction', state: 'waiting' },
        { label: 'Pending Review', state: 'waiting' },
      ];
    default:
      return [
        { label: 'Stored', state: 'waiting' },
        { label: 'Classifying', state: 'waiting' },
        { label: 'AI Extraction', state: 'waiting' },
        { label: 'Pending Review', state: 'waiting' },
      ];
  }
}

/** Format document category for display */
export function formatDocumentCategory(category: string | null): string {
  if (!category) return 'Unknown';
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format file size for display */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format duration in ms to a human readable string */
export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
