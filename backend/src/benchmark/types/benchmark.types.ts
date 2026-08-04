/**
 * benchmark.types.ts
 *
 * Core domain type definitions for the AU DIC Benchmark Evaluation Framework.
 * Completely isolated from production MongoDB models and API route handlers.
 */

export type DocumentCategory = 'certificate' | 'marksheet' | 'student_id';
export type QualityProfile = 'clean' | 'scanner_copy' | 'mobile_camera' | 'rotated_90';

export type ErrorCategory =
  | 'OCR_ERROR'
  | 'NORMALIZATION_ERROR'
  | 'FORMAT_ERROR'
  | 'HALLUCINATION'
  | 'FIELD_MISSING'
  | 'FIELD_EXTRA'
  | 'PARTIAL_MATCH'
  | 'LOW_CONFIDENCE'
  | 'CATEGORY_ERROR';

export interface SubjectItemGT {
  code?: string;
  name?: string;
  credits?: number;
  grade?: string;
  gradePoints?: number;
  term?: string;
  academicYear?: number;
  gradingStatus?: string;
}

export interface BenchmarkGroundTruth {
  sampleId: string;
  documentId: string;
  documentType: DocumentCategory;
  qualityProfile: QualityProfile;
  pngPath: string;
  pdfPath: string;
  gtPath: string;
  metadataPath: string;
  extractedFields: Record<string, any>;
  subjects: SubjectItemGT[];
  rawGtDict: Record<string, any>;
}

export interface TargetModuleRec {
  id: string;
  name?: string;
  confidence: number;
  reason?: string;
}

export interface BenchmarkPrediction {
  sampleId: string;
  documentCategory: string;
  confidenceScore: number;
  summary: string;
  primaryTargetModule?: TargetModuleRec | null;
  secondaryTargetModules?: TargetModuleRec[];
  extractedEntities: Record<string, any>;
  candidateFields: Record<string, any>;
  rawResponse?: Record<string, any>;
  executionTimeMs: number;
  isMock?: boolean;
  modelName?: string;
  modelVersion?: string;
  inferenceTimestamp?: string;
  requestId?: string;
}

export interface FieldComparisonDetail {
  field: string;
  expected: any;
  actual: any;
  matched: boolean;
  cer?: number;
  wer?: number;
  errorCategory?: ErrorCategory;
}

export interface EvaluationMetrics {
  cer: number;
  wer: number;
  exactMatch: boolean;
  precision: number;
  recall: number;
  f1Score: number;
  matchedFieldsCount: number;
  totalFieldsCount: number;
}

export interface SampleComparisonResult {
  sampleId: string;
  documentType: DocumentCategory;
  qualityProfile: QualityProfile;
  categoryMatch: boolean;
  predictionConfidence: number;
  metrics: EvaluationMetrics;
  discrepancies: FieldComparisonDetail[];
  groundTruthSummary: {
    category: string;
    fieldsCount: number;
  };
  predictionSummary: {
    category: string;
    confidence: number;
    fieldsCount: number;
  };
}

export interface ConfidenceMetrics {
  averageConfidence: number;
  averageConfidenceCorrect: number;
  averageConfidenceIncorrect: number;
  overconfidenceGap: number;
}

export interface ProfileMetricsSummary {
  totalSamples: number;
  categoryAccuracy: number;
  meanCer: number;
  meanWer: number;
  meanF1: number;
  exactMatchRate: number;
  confidenceMetrics: ConfidenceMetrics;
}

export interface CategoryMetricsSummary {
  totalSamples: number;
  categoryAccuracy: number;
  meanCer: number;
  meanWer: number;
  meanF1: number;
  exactMatchRate: number;
  confidenceMetrics: ConfidenceMetrics;
}

export interface ConfusionMatrixEntry {
  expectedCategory: string;
  predictedCategory: string;
  count: number;
}

export interface FieldProfileMetric {
  precision: number;
  recall: number;
  f1Score: number;
  meanCer: number;
  totalErrors: number;
}

export interface RobustnessAnalysis {
  bestPerformingProfile: QualityProfile;
  worstPerformingProfile: QualityProfile;
  mostDifficultField: string;
  mostCommonErrorCategory: ErrorCategory;
  fieldRobustnessMatrix: Record<string, Record<QualityProfile, FieldProfileMetric>>;
  errorHeatmap: Record<string, Record<QualityProfile, number>>;
}

export interface BenchmarkRunMetadata {
  runId: string;
  timestamp: string;
  datasetHash: string;
  benchmarkVersion: string;
  gitCommit: string;
}

export interface ExecutionPerformance {
  durationSeconds: number;
  throughputSamplesPerSec: number;
  meanLatencyMsPerSample: number;
}

export interface CheckpointData {
  runId: string;
  lastUpdated: string;
  completedSampleIds: string[];
  results: SampleComparisonResult[];
  predictions: BenchmarkPrediction[];
}

export interface BenchmarkRunReport {
  metadata: BenchmarkRunMetadata;
  performance: ExecutionPerformance;
  runId: string;
  timestamp: string;
  datasetPath: string;
  durationSeconds: number;
  totalSamples: number;
  successfulEvaluations: number;
  failedEvaluations: number;
  overallCategoryAccuracy: number;
  overallMeanPrecision: number;
  overallMeanRecall: number;
  overallMeanF1: number;
  overallMeanCer: number;
  overallMeanWer: number;
  overallExactMatchRate: number;
  confidenceMetrics: ConfidenceMetrics;
  errorTaxonomySummary: Record<ErrorCategory, number>;
  confusionMatrix: ConfusionMatrixEntry[];
  robustnessAnalysis: RobustnessAnalysis;
  profileBreakdown: Record<QualityProfile, ProfileMetricsSummary>;
  categoryBreakdown: Record<DocumentCategory, CategoryMetricsSummary>;
}
