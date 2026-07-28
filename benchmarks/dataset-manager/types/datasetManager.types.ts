/**
 * Academic Universe — AI Research Dataset Manager Types
 * Comprehensive domain types for automated RAW ingestion, AI classification,
 * smart renaming, manifest generation, draft ground truth, and review queue.
 */

export type ExtendedCategory =
  | 'MARKSHEET'
  | 'TRANSCRIPT'
  | 'CERTIFICATE'
  | 'WORKSHOP_CERTIFICATE'
  | 'INTERNSHIP_CERTIFICATE'
  | 'HACKATHON_CERTIFICATE'
  | 'TIMETABLE'
  | 'EXAM_TIMETABLE'
  | 'ADMIT_CARD'
  | 'FEE_RECEIPT'
  | 'STUDENT_ID'
  | 'UNKNOWN';

export type GroundTruthDraftStatus = 'DRAFT' | 'VERIFIED' | 'REJECTED' | 'RECLASSIFIED';

export interface RawDocumentInfo {
  originalFilename: string;
  rawPath: string;
  fileFormat: 'pdf' | 'png' | 'jpg' | 'jpeg';
  fileSizeBytes: number;
  checksumSha256: string;
  createdAt: string;
  modifiedAt: string;
}

export interface DocumentClassification {
  category: ExtendedCategory;
  confidence: number; // 0.0 to 1.0
  reasons: string[];
  suggestedPrefix: string;
}

export interface OrganizedDocumentRecord {
  documentId: string; // e.g. "MS_001"
  originalFilename: string;
  canonicalFilename: string; // e.g. "MS_001.pdf"
  rawPath: string;
  organizedPath: string;
  category: ExtendedCategory;
  fileFormat: string;
  fileSizeBytes: number;
  checksumSha256: string;
  qualityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'SCANNED';
  classificationConfidence: number;
  importedAt: string;
  groundTruthPath: string;
  groundTruthStatus: GroundTruthDraftStatus;
}

export interface DatasetManagerManifest {
  manifestVersion: string;
  datasetVersion: string;
  createdAt: string;
  updatedAt: string;
  totalRawDocuments: number;
  totalOrganizedDocuments: number;
  categoryCounts: Record<ExtendedCategory, number>;
  documents: OrganizedDocumentRecord[];
}

export interface DuplicateGroup {
  checksumSha256: string;
  documents: Array<{
    documentId?: string;
    filename: string;
    path: string;
  }>;
}

export interface DatasetManagerStats {
  totalImported: number;
  totalClassified: number;
  averageConfidence: number;
  categoryDistribution: Record<ExtendedCategory, number>;
  statusDistribution: Record<GroundTruthDraftStatus, number>;
  duplicateCount: number;
  pendingReviewCount: number;
  verifiedCount: number;
}
