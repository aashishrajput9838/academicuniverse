// src/events/UaipEvents.ts
export enum UaipEvent {
  Uploaded = "UPLOADED",
  Classified = "CLASSIFIED",
  Parsed = "PARSED",
  ParseFailed = "PARSE_FAILED",
  OCR_COMPLETED = "OCR_COMPLETED",
  OCR_FAILED = "OCR_FAILED",
  // Human-in-the-Loop review workflow events
  CandidateDraftSaved = "CANDIDATE_DRAFT_SAVED",
  CandidateSubmitted = "CANDIDATE_SUBMITTED",
  CandidateApproved = "CANDIDATE_APPROVED",
  CandidateRejected = "CANDIDATE_REJECTED",
  CanonicalUpdated = "CANONICAL_UPDATED",
  GrowthProjectionUpdated = "GROWTH_PROJECTION_UPDATED",
  ModuleUpdated = "MODULE_UPDATED",
}

export interface UaipEventPayload {
  processingId: string;
  documentCategory?: string;
  documentSubtype?: string;
  language?: string;
  isScanned?: boolean;
  parserStrategy?: string;
  confidenceScore?: number;
  rawContent?: string; // added for parsing stage
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  timestamp?: Date;
  errorMessage?: string; // for ParseFailed
  // OCR fields
  ocrText?: string;
  ocrErrorMessage?: string;
  storageId?: string; // to locate file for OCR
  userId?: string;
  organizationId?: string;
  // Review workflow fields
  reviewerId?: string;
  reviewAction?: 'draft' | 'submit' | 'approve' | 'reject' | 'rollback';
  rejectionReason?: string;
  targetModule?: string;
  version?: number;
  canonicalCollection?: string;
  canonicalRecordId?: string;
}
