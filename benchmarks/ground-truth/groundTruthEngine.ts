/**
 * Academic Universe — Ground Truth Engine
 * Parses, validates, and serves ground truth annotation files.
 */

import fs from 'fs';
import { GroundTruthSchema, DocumentCategory, ExtractedCourseMark } from '../types/benchmark.types';

const REQUIRED_FIELDS: (keyof GroundTruthSchema)[] = ['documentId', 'category'];

const VALID_CATEGORIES: DocumentCategory[] = [
  'MARKSHEET',
  'TRANSCRIPT',
  'CERTIFICATE',
  'WORKSHOP_CERTIFICATE',
  'INTERNSHIP_CERTIFICATE',
  'HACKATHON_CERTIFICATE',
  'TIMETABLE',
  'EXAM_TIMETABLE',
  'ADMIT_CARD',
  'FEE_RECEIPT',
  'STUDENT_ID',
  'UNKNOWN',
  'EDGE_CASE',
];

export interface GroundTruthValidationResult {
  documentId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class GroundTruthEngine {
  /**
   * Parse a single ground truth JSON file from disk.
   */
  parseFile(filePath: string): GroundTruthSchema {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Ground truth file not found: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Ground truth file is not valid JSON: ${filePath}`);
    }
    return parsed as GroundTruthSchema;
  }

  /**
   * Validate a parsed ground truth record against the schema contract.
   */
  validate(gt: GroundTruthSchema): GroundTruthValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field presence
    for (const field of REQUIRED_FIELDS) {
      if (gt[field] === undefined || gt[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Category must be valid
    if (gt.category && !VALID_CATEGORIES.includes(gt.category)) {
      errors.push(`Invalid category "${gt.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    // documentId format check
    if (gt.documentId && typeof gt.documentId !== 'string') {
      errors.push('documentId must be a string');
    }

    // SGPA / CGPA range check
    if (gt.sgpa !== undefined && gt.sgpa !== null) {
      if (typeof gt.sgpa !== 'number' || gt.sgpa < 0 || gt.sgpa > 10) {
        warnings.push(`sgpa value ${gt.sgpa} is outside typical range [0, 10]`);
      }
    }
    if (gt.cgpa !== undefined && gt.cgpa !== null) {
      if (typeof gt.cgpa !== 'number' || gt.cgpa < 0 || gt.cgpa > 10) {
        warnings.push(`cgpa value ${gt.cgpa} is outside typical range [0, 10]`);
      }
    }

    // Course marks validation
    if (gt.courseMarks && Array.isArray(gt.courseMarks)) {
      for (let i = 0; i < gt.courseMarks.length; i++) {
        const cm = gt.courseMarks[i];
        if (!cm.courseCode) warnings.push(`courseMarks[${i}]: missing courseCode`);
        if (cm.marksObtained !== undefined && cm.maxMarks !== undefined) {
          if (cm.marksObtained > cm.maxMarks) {
            errors.push(`courseMarks[${i}]: marksObtained (${cm.marksObtained}) > maxMarks (${cm.maxMarks})`);
          }
        }
      }
    }

    // Date format check
    if (gt.issueDate !== undefined && gt.issueDate !== null) {
      if (typeof gt.issueDate !== 'string') {
        errors.push('issueDate must be a string');
      }
    }

    return {
      documentId: gt.documentId || 'UNKNOWN',
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate all ground truth files in a batch. Returns per-document validation results.
   */
  validateBatch(groundTruths: GroundTruthSchema[]): GroundTruthValidationResult[] {
    return groundTruths.map((gt) => this.validate(gt));
  }

  /**
   * Check consistency between two annotator ground truths for the same document.
   * Returns per-field agreement status for inter-annotator agreement calculation.
   */
  checkInterAnnotatorAgreement(
    annotatorA: GroundTruthSchema,
    annotatorB: GroundTruthSchema
  ): { fieldName: string; agrees: boolean }[] {
    const results: { fieldName: string; agrees: boolean }[] = [];

    const scalarFields: (keyof GroundTruthSchema)[] = [
      'studentName', 'rollNumber', 'semester', 'sgpa', 'cgpa', 'issueDate',
    ];

    for (const field of scalarFields) {
      const a = annotatorA[field];
      const b = annotatorB[field];
      results.push({
        fieldName: field,
        agrees: this.normalizeValue(a) === this.normalizeValue(b),
      });
    }

    // Course marks array comparison
    const aMarks = annotatorA.courseMarks || [];
    const bMarks = annotatorB.courseMarks || [];
    const maxLen = Math.max(aMarks.length, bMarks.length);
    for (let i = 0; i < maxLen; i++) {
      const am = aMarks[i];
      const bm = bMarks[i];
      if (!am || !bm) {
        results.push({ fieldName: `courseMarks[${i}]`, agrees: false });
      } else {
        const codeMatch = this.normalizeValue(am.courseCode) === this.normalizeValue(bm.courseCode);
        const marksMatch = am.marksObtained === bm.marksObtained && am.maxMarks === bm.maxMarks;
        results.push({ fieldName: `courseMarks[${i}]`, agrees: codeMatch && marksMatch });
      }
    }

    return results;
  }

  /**
   * Compute Cohen's Kappa for a set of per-field agreement observations.
   */
  computeCohensKappa(agreements: { agrees: boolean }[]): number {
    if (agreements.length === 0) return 0;
    const n = agreements.length;
    const agreeCount = agreements.filter((a) => a.agrees).length;
    const po = agreeCount / n; // observed agreement
    // For binary coding with single-rater perspective, pe is simplified
    const pe: number = 0.5; // chance agreement under random binary classification
    if (pe === 1) return 1;
    return (po - pe) / (1 - pe);
  }

  private normalizeValue(val: unknown): string {
    if (val === undefined || val === null) return '';
    return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
