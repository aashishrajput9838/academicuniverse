// src/events/UaipEvents.ts
export enum UaipEvent {
  Uploaded = "UPLOADED",
  Classified = "CLASSIFIED",
  Parsed = "PARSED",
  ParseFailed = "PARSE_FAILED",
  OCR_COMPLETED = "OCR_COMPLETED",
  OCR_FAILED = "OCR_FAILED",
  // Resume Parser events
  ResumeClassified = "RESUME_CLASSIFIED",
  ResumeClassificationFailed = "RESUME_CLASSIFICATION_FAILED",
  ResumeStageRetry = "RESUME_STAGE_RETRY",
  ResumeParseDeadLetter = "RESUME_PARSE_DEAD_LETTER",
  ResumeSectionDetected = "RESUME_SECTION_DETECTED",
  ResumeSectionDetectionFailed = "RESUME_SECTION_DETECTION_FAILED",
  ResumeEntityExtracted = "RESUME_ENTITY_EXTRACTED",
  ResumeEntityExtractionFailed = "RESUME_ENTITY_EXTRACTION_FAILED",
  ResumeAIEnhanced = "RESUME_AI_ENHANCED",
  ResumeAIEnhancementFailed = "RESUME_AI_ENHANCEMENT_FAILED",
  // Human-in-the-Loop review workflow events
  CandidateDraftSaved = "CANDIDATE_DRAFT_SAVED",
  CandidateSubmitted = "CANDIDATE_SUBMITTED",
  CandidateApproved = "CANDIDATE_APPROVED",
  CandidateRejected = "CANDIDATE_REJECTED",
  CanonicalUpdated = "CANONICAL_UPDATED",
  GrowthProjectionUpdated = "GROWTH_PROJECTION_UPDATED",
  ModuleUpdated = "MODULE_UPDATED",
  DocumentApproved = "DocumentApproved",
  RoutingCompleted = "RoutingCompleted",
  // Skills Tracker events
  AcademicRecordUpdated = "ACADEMIC_RECORD_UPDATED",
  CertificateApproved = "CERTIFICATE_APPROVED",
  GithubUpdated = "GITHUB_UPDATED",
  ResearchUpdated = "RESEARCH_UPDATED",
  SkillUpdated = "SKILL_UPDATED",
  SkillProfileRebuilt = "SKILL_PROFILE_REBUILT",
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
  targetModules?: string[];
  version?: number;
  canonicalCollection?: string;
  canonicalRecordId?: string;
  // Skills Tracker fields
  personId?: string;
  correlationId?: string;
  eventId?: string;
  occurredAt?: Date;
  source?: string;
  skillId?: string;
  skillName?: string;
  aliases?: string[];
  primarySource?: string;
  sourceType?: string;
  sourceSubtype?: string;
  payload?: Record<string, any>;
  confidence?: number;
  extractedBy?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  proficiencyScore?: number;
  evidenceCount?: number;
  skillsRebuilt?: number;
  // GitHub-specific fields
  repositories?: any[];
  languages?: Record<string, number>;
  contributions?: Record<string, number>;
}
