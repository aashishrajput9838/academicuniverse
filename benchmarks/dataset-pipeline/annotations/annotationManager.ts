/**
 * Academic Universe — Annotation Manager
 * Manages the full annotation lifecycle:
 *   • Load annotation for editing
 *   • Save partial progress (IN_PROGRESS)
 *   • Submit completed annotation (ANNOTATED)
 *   • Second-pass verification (VERIFIED)
 *   • Flag conflicts (CONFLICT)
 *   • Track annotator progress
 *   • Compute Inter-Annotator Agreement (IAA) for double-annotated documents
 */

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  GroundTruthRecord,
  AnnotationStatus,
  AnnotationProgress,
  DatasetManifest,
} from '../types/dataset.types';
import { GROUND_TRUTH_JSON_SCHEMA } from '../schemas/groundTruth.schema';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateGT = ajv.compile(GROUND_TRUTH_JSON_SCHEMA);

export interface IAAResult {
  documentId: string;
  annotatorA: string;
  annotatorB: string;
  totalFields: number;
  agreedFields: number;
  disagreedFields: string[];
  cohensKappa: number;
  requiresResolution: boolean;
}

export class AnnotationManager {
  private groundTruthDir: string;
  private secondPassDir: string; // For annotator B copies
  private auditLogPath: string;

  constructor(benchmarkRoot: string) {
    this.groundTruthDir = path.join(benchmarkRoot, 'ground-truth');
    this.secondPassDir = path.join(benchmarkRoot, 'dataset-pipeline', 'annotations', 'second-pass');
    this.auditLogPath = path.join(benchmarkRoot, 'dataset-pipeline', 'validation', 'annotation_audit.jsonl');
    [this.groundTruthDir, this.secondPassDir, path.dirname(this.auditLogPath)].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
  }

  /** Load annotation for a document (returns null if not found) */
  loadAnnotation(documentId: string): GroundTruthRecord | null {
    const filePath = path.join(this.groundTruthDir, `${documentId}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as GroundTruthRecord;
    } catch {
      return null;
    }
  }

  /** Save annotation progress (does not change status to ANNOTATED) */
  saveProgress(annotation: GroundTruthRecord): { success: boolean; errors: string[] } {
    annotation.annotatedAt = new Date().toISOString();
    annotation.annotationStatus = 'IN_PROGRESS';
    return this.writeAnnotation(annotation);
  }

  /** Submit completed annotation — validates schema before saving */
  submitAnnotation(annotation: GroundTruthRecord): { success: boolean; errors: string[] } {
    annotation.annotatedAt = new Date().toISOString();
    annotation.annotationStatus = 'ANNOTATED';

    const result = this.writeAnnotation(annotation);
    if (result.success) {
      this.writeAudit({ action: 'SUBMIT', documentId: annotation.documentId, annotatorId: annotation.annotatedBy });
    }
    return result;
  }

  /** Save annotator B's second-pass annotation (for IAA computation) */
  submitSecondPass(annotation: GroundTruthRecord, annotatorBId: string): { success: boolean; errors: string[] } {
    const secondPassCopy = { ...annotation, annotatedBy: annotatorBId };
    const filePath = path.join(this.secondPassDir, `${annotation.documentId}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(secondPassCopy, null, 2), 'utf-8');
      this.writeAudit({ action: 'SECOND_PASS', documentId: annotation.documentId, annotatorId: annotatorBId });
      return { success: true, errors: [] };
    } catch (e: any) {
      return { success: false, errors: [e.message] };
    }
  }

  /** Verify an annotated document — marks as VERIFIED */
  verifyAnnotation(documentId: string, verifierId: string): { success: boolean; error?: string } {
    const annotation = this.loadAnnotation(documentId);
    if (!annotation) return { success: false, error: `Annotation not found: ${documentId}` };
    if (annotation.annotationStatus !== 'ANNOTATED') {
      return { success: false, error: `Cannot verify — status is ${annotation.annotationStatus}, expected ANNOTATED` };
    }
    annotation.verifiedBy = verifierId;
    annotation.verifiedAt = new Date().toISOString();
    annotation.annotationStatus = 'VERIFIED';
    const result = this.writeAnnotation(annotation);
    if (result.success) this.writeAudit({ action: 'VERIFY', documentId, verifierId });
    return { success: result.success, error: result.errors[0] };
  }

  /** Flag annotation as CONFLICT — requires resolution */
  flagConflict(documentId: string, reason: string): void {
    const annotation = this.loadAnnotation(documentId);
    if (!annotation) return;
    annotation.annotationStatus = 'CONFLICT';
    annotation.annotationNotes = (annotation.annotationNotes || '') + `\n[CONFLICT] ${reason}`;
    this.writeAnnotation(annotation);
    this.writeAudit({ action: 'CONFLICT', documentId, reason });
  }

  /** Compute Inter-Annotator Agreement between annotator A (primary) and B (second-pass) */
  computeIAA(documentId: string): IAAResult | null {
    const annotationA = this.loadAnnotation(documentId);
    const secondPassPath = path.join(this.secondPassDir, `${documentId}.json`);
    if (!annotationA || !fs.existsSync(secondPassPath)) return null;

    let annotationB: GroundTruthRecord;
    try {
      annotationB = JSON.parse(fs.readFileSync(secondPassPath, 'utf-8'));
    } catch { return null; }

    const fields = ['studentName', 'rollNumber', 'semester', 'sgpa', 'cgpa', 'issueDate', 'institutionName'];
    const disagreed: string[] = [];
    let agreed = 0;

    for (const field of fields) {
      const a = this.normalizeValue((annotationA as any)[field]);
      const b = this.normalizeValue((annotationB as any)[field]);
      if (a === b) agreed++;
      else disagreed.push(field);
    }

    // Course marks comparison
    const aMarks = annotationA.courseMarks || [];
    const bMarks = annotationB.courseMarks || [];
    const aMap = new Map(aMarks.map((c) => [c.courseCode.trim().toLowerCase(), c]));
    const bMap = new Map(bMarks.map((c) => [c.courseCode.trim().toLowerCase(), c]));
    const allCodes = new Set([...aMap.keys(), ...bMap.keys()]);

    for (const code of allCodes) {
      const a = aMap.get(code);
      const b = bMap.get(code);
      if (a && b && a.marksObtained === b.marksObtained && a.maxMarks === b.maxMarks) agreed++;
      else { disagreed.push(`courseMarks.${code}`); }
    }

    const total = fields.length + allCodes.size;
    const po = total > 0 ? agreed / total : 1;
    const pe = 0.5;
    const kappa = pe < 1 ? (po - pe) / (1 - pe) : 1;

    return {
      documentId,
      annotatorA: annotationA.annotatedBy,
      annotatorB: annotationB.annotatedBy,
      totalFields: total,
      agreedFields: agreed,
      disagreedFields: disagreed,
      cohensKappa: kappa,
      requiresResolution: kappa < 0.9,
    };
  }

  /** Compute annotation progress statistics across all documents in a manifest */
  computeProgress(manifest: DatasetManifest): AnnotationProgress {
    const counts = { PENDING: 0, IN_PROGRESS: 0, ANNOTATED: 0, VERIFIED: 0, CONFLICT: 0 };
    for (const entry of manifest.entries) {
      const annotation = this.loadAnnotation(entry.documentId);
      const status: AnnotationStatus = annotation ? annotation.annotationStatus : 'PENDING';
      counts[status] = (counts[status] || 0) + 1;
    }
    const total = manifest.totalDocuments;
    const done = counts.ANNOTATED + counts.VERIFIED;
    return {
      total,
      pending: counts.PENDING,
      inProgress: counts.IN_PROGRESS,
      annotated: counts.ANNOTATED,
      verified: counts.VERIFIED,
      conflict: counts.CONFLICT,
      completionPct: total > 0 ? (done / total) * 100 : 0,
    };
  }

  /** List all documents needing annotation */
  getPendingDocuments(manifest: DatasetManifest): string[] {
    return manifest.entries
      .filter((e) => {
        const gt = this.loadAnnotation(e.documentId);
        return !gt || gt.annotationStatus === 'PENDING' || gt.annotationStatus === 'IN_PROGRESS';
      })
      .map((e) => e.documentId);
  }

  /** List all documents with conflicts */
  getConflictDocuments(manifest: DatasetManifest): string[] {
    return manifest.entries
      .filter((e) => {
        const gt = this.loadAnnotation(e.documentId);
        return gt && gt.annotationStatus === 'CONFLICT';
      })
      .map((e) => e.documentId);
  }

  // --- Private Helpers ---

  private writeAnnotation(annotation: GroundTruthRecord): { success: boolean; errors: string[] } {
    // Schema validation before write
    const valid = validateGT(annotation as unknown);
    if (!valid && validateGT.errors) {
      return {
        success: false,
        errors: validateGT.errors.map((e) => `${e.instancePath}: ${e.message}`),
      };
    }
    const filePath = path.join(this.groundTruthDir, `${annotation.documentId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(annotation, null, 2), 'utf-8');
    return { success: true, errors: [] };
  }

  private normalizeValue(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private writeAudit(entry: Record<string, unknown>): void {
    const log = { ...entry, timestamp: new Date().toISOString() };
    fs.appendFileSync(this.auditLogPath, JSON.stringify(log) + '\n', 'utf-8');
  }
}
