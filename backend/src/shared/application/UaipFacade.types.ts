/**
 * UaipFacade.types.ts
 *
 * Public contract exposed by the UAIP application facade.
 * These are the ONLY types that the Growth module (or any other consumer)
 * may import from the UAIP subsystem.
 *
 * Internal UAIP details (GridFS, EventBus, PipelineOrchestrator, UploadService,
 * OCR, Parser, Classification) MUST NOT appear here.
 */

// ---------------------------------------------------------------------------
// submitDocument
// ---------------------------------------------------------------------------

export interface SubmitDocumentParams {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number; // bytes
  userId: string;
  organizationId: string;
}

export interface SubmitDocumentResult {
  /** Opaque identifier that callers use to poll status. */
  processingId: string;
}

// ---------------------------------------------------------------------------
// getDocumentStatus  (delegated from DocumentProcessingService – already shared)
// ---------------------------------------------------------------------------
// The IDocument type lives in the shared models layer so re-exporting it is
// allowed; we simply surface it through the facade so the controller never
// needs to know which service produced it.
export type { IDocument as UaipDocument } from '../../models/Document';

// ---------------------------------------------------------------------------
// getUploadHistory / getProcessingStatus
// ---------------------------------------------------------------------------
// Re-export Growth-scoped shapes that GrowthUploadService already owns.
// They are public metadata (no storage or pipeline internals).
export type {
  GrowthUploadHistory,
  GrowthUploadHistoryItem,
  GrowthProcessingStatus,
  GrowthReviewStatus,
} from '../../modules/growth/growthUpload.service';
