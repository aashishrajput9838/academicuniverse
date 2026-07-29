/**
 * Academic Universe — Benchmark & Evaluation Framework Types
 * Strict TypeScript Interfaces for Experimental Evaluation of DIC Subsystem
 *
 * CANONICAL HITL SEMANTICS (locked — do not change):
 *   Decision 1: reviewRequired=true && fieldsCorrected=0 is VALID.
 *               A reviewer may inspect without correcting.
 *   Decision 2: fieldsCorrected > 0 → reviewRequired MUST be true.
 *   Decision 3: reviewDurationSec measures human review time, NOT correction time.
 *   Decision 4: fallbackTriggered does NOT imply reviewRequired.
 */

export type DocumentCategory =
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
  | 'UNKNOWN'
  | 'EDGE_CASE';

export type SupportedFileFormat = 'pdf' | 'png' | 'jpeg' | 'jpg';
export type BaselineSystemId = 'SYS-BASE-1' | 'SYS-BASE-2' | 'SYS-BASE-3' | 'SYS-PROP';
import { CourseMarksComparisonMode } from '../validation/fieldComparisonMode';
export { CourseMarksComparisonMode };

export interface BenchmarkDocument {
  documentId: string;
  category: DocumentCategory;
  filePath: string;
  fileFormat: SupportedFileFormat;
  fileSizeBytes: number;
  checksumSha256: string;
  qualityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'SCANNED';
  universityOrigin?: string;
  groundTruthPath: string;
}

export interface ExtractedCourseMark {
  courseCode: string;
  courseName: string;
  marksObtained: number;
  maxMarks: number;
}

export interface GroundTruthSchema {
  documentId: string;
  category: DocumentCategory;
  studentName?: string | null;
  rollNumber?: string | null;
  semester?: string | null;
  courseMarks?: ExtractedCourseMark[];
  sgpa?: number | null;
  cgpa?: number | null;
  issueDate?: string | null;
  customFields?: Record<string, unknown>;
}

export interface ExtractionPrediction {
  studentName?: string | null;
  rollNumber?: string | null;
  semester?: string | null;
  courseMarks?: ExtractedCourseMark[];
  sgpa?: number | null;
  cgpa?: number | null;
  issueDate?: string | null;
  rawText?: string;
  customFields?: Record<string, unknown>;
}

export interface FieldMatchResult {
  fieldName: string;
  expected: unknown;
  actual: unknown;
  isMatch: boolean;
  matchScore: number; // 0.0 to 1.0
  reason?: string;
}

/**
 * Canonical document evaluation result.
 * fieldMatches is the single source of truth.
 * fieldScores MUST always be computed from fieldMatches — never manually set.
 *
 * hitlMetrics.reviewRequired semantics:
 *   true  → human reviewed this document (duration > 0, corrections may be 0 or more)
 *   false → no human review performed (duration = 0, corrections = 0)
 */
export interface DocumentEvaluationResult {
  experimentId: string;
  documentId: string;
  category: DocumentCategory;
  systemId: BaselineSystemId;
  timestamp: string;
  primaryProvider: string;
  fallbackTriggered: boolean;
  fallbackProvider?: string | null;
  latencyMs: {
    uploadMs: number;
    aiInferenceMs: number;
    dbStagingMs: number;
    totalPipelineMs: number;
  };
  /** Single source of truth for all field-level metrics */
  fieldMatches: FieldMatchResult[];
  /**
   * DERIVED from fieldMatches. Must always match computeFieldMetrics(fieldMatches).
   * Stored for serialization convenience only — never set independently.
   */
  fieldScores: {
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  hitlMetrics: {
    /**
     * true  → human reviewed this evaluation (reviewDurationSec > 0)
     * false → no human review performed
     * NOTE: reviewRequired=true with fieldsCorrected=0 is VALID (review without correction).
     */
    reviewRequired: boolean;
    reviewDurationSec: number;
    fieldsCorrected: number;
    finalAction: 'APPROVED' | 'REJECTED';
  };
  success: boolean;
  errorMessage?: string;
}

export interface AggregateMetrics {
  totalDocuments: number;
  successfulEvaluations: number;
  failedEvaluations: number;
  overallPrecision: number;
  overallRecall: number;
  overallF1Score: number;
  latencyStats: {
    meanMs: number;
    medianMs: number;
    p95Ms: number;
    p99Ms: number;
    minMs: number;
    maxMs: number;
  };
  fallbackMetrics: {
    totalFallbackAttempts: number;
    successfulFallbacks: number;
    fallbackRecoveryRate: number; // percentage 0 - 100
  };
  hitlMetrics: {
    totalDocsWithReview: number;
    totalDocsWithCorrections: number;
    totalReviewDurationSec: number;
    meanReviewDurationSec: number;  // mean over ALL successful docs (0 for non-reviewed)
    totalFieldsCorrected: number;
    humanCorrectionRate: number; // percentage 0 - 100
  };
  categoryBreakdown: Record<DocumentCategory, {
    count: number;
    precision: number;
    recall: number;
    f1Score: number;
    meanLatencyMs: number;
  }>;
}

export interface StatisticalTestResult {
  metricName: string;
  baselineSystem: BaselineSystemId;
  proposedSystem: BaselineSystemId;
  sampleSize: number;
  baselineMean: number;
  proposedMean: number;
  meanDifference: number;
  shapiroWilkBaselineP: number;
  shapiroWilkProposedP: number;
  isNormal: boolean;
  testUsed: 'Paired t-test' | 'Wilcoxon signed-rank test';
  statistic: number;
  pValue: number;
  isStatisticallySignificant: boolean; // p < alpha
  cohensD: number;
  effectSizeRating: 'Negligible' | 'Small' | 'Medium' | 'Large';
}

export interface BenchmarkManifest {
  manifestVersion: string;
  createdAt: string;
  totalDocuments: number;
  documents: BenchmarkDocument[];
}

export interface ExperimentRunCheckpoint {
  experimentId: string;
  startTime: string;
  lastUpdated: string;
  /** Random seed used for any stochastic operations in this run */
  seed: string;
  completedDocumentIds: string[];
  pendingDocumentIds: string[];
  results: DocumentEvaluationResult[];
}

/**
 * Benchmark Certification — generated after every successful benchmark execution.
 * Only produced when ALL validation rules pass.
 */
export interface BenchmarkCertificate {
  certificateVersion: '1.0';
  experimentId: string;
  generatedAt: string;
  datasetVersion: string;
  datasetHash: string;
  manifestHash: string;
  randomSeed: string;
  gitCommit: string;
  executionEnvironment: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  configuration: Record<string, unknown>;
  validationRulesExecuted: string[];
  validationStatus: 'PASS' | 'FAIL';
  validationErrorCount: number;
  validationWarningCount: number;
  artifactVersions: Record<string, string>;
  certifiedAt: string;
}
