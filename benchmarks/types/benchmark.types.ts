/**
 * Academic Universe — Benchmark & Evaluation Framework Types
 * Strict TypeScript Interfaces for Experimental Evaluation of DIC Subsystem
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
  fieldMatches: FieldMatchResult[];
  fieldScores: {
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  hitlMetrics: {
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
    meanReviewDurationSec: number;
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
  completedDocumentIds: string[];
  pendingDocumentIds: string[];
  results: DocumentEvaluationResult[];
}
