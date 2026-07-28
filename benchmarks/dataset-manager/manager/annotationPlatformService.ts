/**
 * Academic Universe — HITL Annotation Platform Core Orchestrator Service
 * Connects AI extraction, field editing, version control, priority review queue,
 * dataset health reporting, and benchmark readiness enforcement.
 */

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import {
  DatasetHealthSummary,
  FieldExtractionResult,
  GroundTruthVersion,
  AuditLogEntry,
} from '../types/annotationPlatform.types';
import { ExtendedCategory, GroundTruthDraftStatus, OrganizedDocumentRecord } from '../types/datasetManager.types';
import { DatasetManagerService } from './datasetManagerService';
import { ContentClassifier } from '../classifier/contentClassifier';
import { GTVersionManager } from '../versioning/gtVersionManager';
import { ReviewQueueManager } from '../queue/reviewQueueManager';

export class AnnotationPlatformService {
  private benchmarkRoot: string;
  private managerService: DatasetManagerService;
  private contentClassifier: ContentClassifier;
  private versionManager: GTVersionManager;
  private queueManager: ReviewQueueManager;

  /** Sanitize documentId to prevent path traversal */
  private sanitizeId(documentId: string): string {
    return documentId.replace(/[^A-Za-z0-9_\-]/g, '_');
  }

  /** Generate a cryptographically random audit entry ID */
  private generateAuditId(): string {
    return 'AUD_' + crypto.randomBytes(6).toString('hex');
  }

  constructor(benchmarkRoot: string) {
    this.benchmarkRoot = benchmarkRoot;
    this.managerService = new DatasetManagerService(benchmarkRoot);
    this.contentClassifier = new ContentClassifier();
    this.versionManager = new GTVersionManager(benchmarkRoot);
    this.queueManager = new ReviewQueueManager();
  }

  /** Run AI content-based extraction on a document */
  extractContent(documentId: string, rawTextSnippet?: string): {
    category: ExtendedCategory;
    categoryConfidence: number;
    fields: FieldExtractionResult[];
  } {
    const manifest = this.managerService.getManifest();
    const doc = manifest.documents.find((d) => d.documentId === documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    const result = this.contentClassifier.analyzeContent(doc.originalFilename, rawTextSnippet || '');

    // Log audit
    this.versionManager.logAudit({
      entryId: this.generateAuditId(),
      documentId,
      timestamp: new Date().toISOString(),
      action: 'AI_EXTRACTION_COMPLETED',
      actor: 'AI_EXTRACTOR',
      details: `Extracted ${result.extractedFields.length} fields with confidence ${(result.categoryConfidence * 100).toFixed(1)}%`,
    });

    return {
      category: result.category,
      categoryConfidence: result.categoryConfidence,
      fields: result.extractedFields,
    };
  }

  /** Save ground truth edit and record version history snapshot */
  saveGroundTruthEdit(
    documentId: string,
    gtData: Record<string, unknown>,
    editor: string,
    changeSummary: string
  ): GroundTruthVersion {
    const safeId = this.sanitizeId(documentId);
    const version = this.versionManager.createVersion(safeId, gtData, editor, changeSummary);

    // Update Ground Truth file on disk — ensure directory exists first
    const gtPath = path.join(this.benchmarkRoot, 'ground-truth', `${safeId}.json`);
    const gtDir = path.dirname(gtPath);
    if (!fs.existsSync(gtDir)) fs.mkdirSync(gtDir, { recursive: true });
    fs.writeFileSync(gtPath, JSON.stringify(gtData, null, 2), 'utf-8');

    this.versionManager.logAudit({
      entryId: this.generateAuditId(),
      documentId: safeId,
      timestamp: new Date().toISOString(),
      action: 'FIELD_EDITED',
      actor: editor,
      details: changeSummary,
    });

    return version;
  }

  /** Verify document ground truth (Approve) */
  verifyDocument(documentId: string, verifierId: string): OrganizedDocumentRecord {
    const updated = this.managerService.reviewDocument(documentId, 'APPROVE');

    // Create version snapshot
    const gtPath = path.join(this.benchmarkRoot, 'ground-truth', `${documentId}.json`);
    let gtData: Record<string, unknown> = {};
    if (fs.existsSync(gtPath)) {
      try { gtData = JSON.parse(fs.readFileSync(gtPath, 'utf-8')); } catch {}
    }

    this.versionManager.createVersion(documentId, gtData, verifierId, 'Document Ground Truth Verified');

    this.versionManager.logAudit({
      entryId: this.generateAuditId(),
      documentId,
      timestamp: new Date().toISOString(),
      action: 'DOCUMENT_VERIFIED',
      actor: verifierId,
      details: `Document verified by ${verifierId}`,
    });

    return updated;
  }

  /** Calculate comprehensive Dataset Health Summary */
  getDatasetHealth(): DatasetHealthSummary {
    const manifest = this.managerService.getManifest();
    const docs = manifest.documents;
    const stats = this.managerService.getStats();

    const verifiedCount = docs.filter((d) => d.groundTruthStatus === 'VERIFIED').length;
    const draftCount = docs.filter((d) => d.groundTruthStatus === 'DRAFT').length;
    const rejectedCount = docs.filter((d) => d.groundTruthStatus === 'REJECTED').length;

    const total = docs.length;
    const completionPct = total > 0 ? (verifiedCount / total) * 100 : 0;

    // Estimate ~15 seconds per remaining unverified document
    const unverifiedCount = total - verifiedCount;
    const estimatedRemainingTimeSec = unverifiedCount * 15;

    // Confidence distribution
    const confDist = { green: 0, yellow: 0, orange: 0, red: 0 };
    for (const d of docs) {
      const c = d.classificationConfidence;
      if (c >= 0.95) confDist.green++;
      else if (c >= 0.80) confDist.yellow++;
      else if (c >= 0.60) confDist.orange++;
      else confDist.red++;
    }

    // Benchmark readiness: true ONLY when 100% verified and total > 0
    const isReadyForBenchmarking = total > 0 && verifiedCount === total;

    return {
      totalDocuments: total,
      verifiedCount,
      draftCount,
      rejectedCount,
      completionPercentage: parseFloat(completionPct.toFixed(1)),
      estimatedRemainingTimeSec,
      averageConfidence: parseFloat((stats.averageConfidence * 100).toFixed(1)),
      isReadyForBenchmarking,
      categoryDistribution: stats.categoryDistribution,
      confidenceDistribution: confDist,
    };
  }

  /** Validate whether the dataset is ready for benchmark execution */
  validateBenchmarkReadiness(): { ready: boolean; reason: string } {
    const health = this.getDatasetHealth();
    if (health.totalDocuments === 0) {
      return { ready: false, reason: 'Dataset is empty. Add documents and run scan first.' };
    }
    if (!health.isReadyForBenchmarking) {
      const remaining = health.totalDocuments - health.verifiedCount;
      return {
        ready: false,
        reason: `Cannot execute benchmark: ${remaining} document(s) still pending review. All documents must be VERIFIED.`,
      };
    }
    return { ready: true, reason: 'Dataset 100% verified and ready for benchmarking!' };
  }

  /** Get priority review queue items */
  getReviewQueue(sortBy: any = 'PRIORITY', filterCategory: any = 'ALL', filterConfidenceBucket: any = 'ALL') {
    const manifest = this.managerService.getManifest();
    return this.queueManager.buildPriorityQueue(manifest.documents, sortBy, filterCategory, filterConfidenceBucket);
  }

  /** Get audit history for a document */
  getAuditLogs(documentId?: string): AuditLogEntry[] {
    return this.versionManager.getAuditLogs(documentId);
  }
}
