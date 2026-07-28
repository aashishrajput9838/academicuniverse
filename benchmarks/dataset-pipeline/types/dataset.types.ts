/**
 * Academic Universe — Dataset Pipeline Types
 * All shared TypeScript interfaces for the Dataset & Ground Truth system.
 */

export type DocumentCategory = 'MARKSHEET' | 'CERTIFICATE' | 'TIMETABLE' | 'EDGE_CASE';
export type FileFormat = 'pdf' | 'png' | 'jpeg' | 'jpg';
export type QualityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'SCANNED';
export type AnnotationStatus = 'PENDING' | 'IN_PROGRESS' | 'ANNOTATED' | 'VERIFIED' | 'CONFLICT';
export type ConsentStatus = 'SYNTHETIC' | 'CONSENTED' | 'PUBLIC_DOMAIN' | 'ANONYMIZED';

// ─── Metadata ──────────────────────────────────────────────────────────────

export interface DocumentMetadata {
  documentId: string;
  originalFilename: string;
  category: DocumentCategory;
  fileFormat: FileFormat;
  fileSizeBytes: number;
  checksumSha256: string;
  qualityLevel: QualityLevel;
  resolution?: string;             // e.g. "2480x3508"
  pageCount?: number;
  universityOrigin: string;        // e.g. "Synthetic" or "University A"
  academicYear?: string;           // e.g. "2024-25"
  language: string;                // e.g. "en"
  layoutVariant: string;           // e.g. "single-column-grid", "multi-column"
  scanMethod?: string;             // e.g. "flatbed-scanner", "phone-camera", "native-pdf"
  consentStatus: ConsentStatus;
  consentRef?: string;             // Consent form ID or "SYNTHETIC"
  piiMasked: boolean;
  importedAt: string;              // ISO timestamp
  importedBy: string;              // annotator ID or "system"
  notes?: string;
}

// ─── Ground Truth ───────────────────────────────────────────────────────────

export interface CourseMarkEntry {
  courseCode: string;
  courseName: string;
  marksObtained: number;
  maxMarks: number;
  grade?: string | null;
}

export interface GroundTruthRecord {
  // Schema version
  schemaVersion: string;
  // Identity
  documentId: string;
  category: DocumentCategory;
  // Extracted fields
  studentName: string | null;
  rollNumber: string | null;
  semester: string | null;
  academicYear: string | null;
  institutionName: string | null;
  courseName: string | null;     // For certificates: the course/program name
  sgpa: number | null;
  cgpa: number | null;
  issueDate: string | null;      // ISO 8601 date string "YYYY-MM-DD"
  courseMarks: CourseMarkEntry[];
  // Annotation provenance
  annotatedBy: string;           // Annotator ID
  annotatedAt: string;           // ISO timestamp
  verifiedBy?: string | null;    // Second-pass verifier ID
  verifiedAt?: string | null;
  annotationStatus: AnnotationStatus;
  annotationNotes?: string;
  // Confidence flags
  lowConfidenceFields?: string[]; // Field names the annotator was uncertain about
}

// ─── Manifest ───────────────────────────────────────────────────────────────

export interface ManifestEntry {
  documentId: string;
  category: DocumentCategory;
  relativeFilePath: string;       // Relative to dataset root
  groundTruthPath: string;        // Relative to ground-truth root
  metadataPath: string;           // Relative to metadata root
  checksumSha256: string;
  annotationStatus: AnnotationStatus;
  qualityLevel: QualityLevel;
  importedAt: string;
}

export interface DatasetManifest {
  manifestVersion: string;
  datasetVersion: string;
  createdAt: string;
  updatedAt: string;
  totalDocuments: number;
  entries: ManifestEntry[];
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ValidationIssue {
  documentId: string;
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
}

export interface ValidationReport {
  generatedAt: string;
  totalChecked: number;
  errorCount: number;
  warningCount: number;
  passCount: number;
  issues: ValidationIssue[];
}

// ─── QA ─────────────────────────────────────────────────────────────────────

export interface AnnotationProgress {
  total: number;
  pending: number;
  inProgress: number;
  annotated: number;
  verified: number;
  conflict: number;
  completionPct: number;
}

export interface DatasetQAReport {
  generatedAt: string;
  datasetVersion: string;
  totalDocuments: number;
  categoryDistribution: Record<DocumentCategory, number>;
  qualityDistribution: Record<QualityLevel, number>;
  annotationProgress: AnnotationProgress;
  duplicateGroups: number;
  piiRisks: number;
  schemaViolations: number;
  incompleteAnnotations: number;
}

// ─── Snapshot / Versioning ───────────────────────────────────────────────────

export interface DatasetSnapshot {
  snapshotId: string;
  datasetVersion: string;
  createdAt: string;
  createdBy: string;
  totalDocuments: number;
  manifestChecksum: string;
  notes: string;
}
