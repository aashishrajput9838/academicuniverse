/**
 * Academic Universe — HITL Research Dataset Annotation Platform Types
 */

import { ExtendedCategory, GroundTruthDraftStatus } from './datasetManager.types';

export type ConfidenceBucket = 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'CRITICAL';

export interface FieldExtractionResult {
  fieldName: string;
  fieldLabel: string;
  extractedValue: string | number | null;
  currentValue: string | number | null;
  confidence: number; // 0.0 to 1.0
  isEdited: boolean;
  isApproved: boolean;
  notes?: string;
}

export interface GroundTruthVersion {
  version: number;
  timestamp: string;
  updatedBy: string;
  changeSummary: string;
  gtData: Record<string, unknown>;
}

export interface AuditLogEntry {
  entryId: string;
  documentId: string;
  timestamp: string;
  action:
    | 'DOCUMENT_OPENED'
    | 'AI_EXTRACTION_COMPLETED'
    | 'FIELD_EDITED'
    | 'FIELD_APPROVED'
    | 'FIELD_DELETED'
    | 'FIELD_ADDED'
    | 'DOCUMENT_VERIFIED'
    | 'DOCUMENT_REJECTED'
    | 'DOCUMENT_RECLASSIFIED'
    | 'VERSION_RESTORED';
  actor: string;
  details: string;
  fieldName?: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export interface PriorityQueueItem {
  documentId: string;
  originalFilename: string;
  category: ExtendedCategory;
  priorityScore: number; // Higher number = higher review priority
  priorityReasons: string[];
  classificationConfidence: number;
  groundTruthStatus: GroundTruthDraftStatus;
  importedAt: string;
}

export interface DatasetHealthSummary {
  totalDocuments: number;
  verifiedCount: number;
  draftCount: number;
  rejectedCount: number;
  completionPercentage: number;
  estimatedRemainingTimeSec: number;
  averageConfidence: number;
  isReadyForBenchmarking: boolean;
  categoryDistribution: Record<ExtendedCategory, number>;
  confidenceDistribution: {
    green: number;  // 95-100%
    yellow: number; // 80-94%
    orange: number; // 60-79%
    red: number;    // <60%
  };
}
