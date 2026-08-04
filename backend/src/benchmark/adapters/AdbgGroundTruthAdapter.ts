/**
 * AdbgGroundTruthAdapter.ts
 *
 * Ground Truth Adapter for loading and normalizing ground truth JSON files
 * produced by the Academic Document Benchmark Generator (ADBG v1.0).
 *
 * Strictly read-only file system operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  BenchmarkGroundTruth,
  DocumentCategory,
  QualityProfile,
  SubjectItemGT,
} from '../types/benchmark.types';

export class AdbgGroundTruthAdapter {
  /**
   * Load a single ground truth record given its path.
   */
  public loadGroundTruth(
    gtPath: string,
    baseDir: string = '.'
  ): BenchmarkGroundTruth {
    const fullGtPath = path.resolve(baseDir, gtPath);
    if (!fs.existsSync(fullGtPath)) {
      throw new Error(`Ground truth file not found: ${fullGtPath}`);
    }

    const rawContent = fs.readFileSync(fullGtPath, 'utf-8');
    const rawGt = JSON.parse(rawContent);

    // Extract metadata fields from raw GT structure
    const sampleId = rawGt.document_id || path.basename(gtPath, '.json');
    const qualityProfile = (rawGt.quality_profile || 'clean') as QualityProfile;
    const documentType = (rawGt.document_type || 'certificate') as DocumentCategory;

    // Build paths relative to base dataset directory
    const pdfPath = path.join('pdf', 'clean', this.getPluralCategory(documentType), `${sampleId.split('_')[0]}.pdf`);
    const pngPath = path.join('images', qualityProfile, 'png', this.getPluralCategory(documentType), `${sampleId}.png`);
    const metadataPath = path.join('metadata', qualityProfile, this.getPluralCategory(documentType), `${sampleId}.json`);

    // Parse extracted canonical fields & subjects
    const extractedFields: Record<string, any> = {};
    const subjects: SubjectItemGT[] = [];

    if (rawGt.fields && typeof rawGt.fields === 'object') {
      for (const [key, val] of Object.entries(rawGt.fields)) {
        if (key === 'subjects' && Array.isArray(val)) {
          for (const sub of val) {
            subjects.push({
              code: sub.code || sub.subject_code,
              name: sub.name || sub.subject_name,
              credits: typeof sub.credits === 'number' ? sub.credits : Number(sub.credits) || undefined,
              grade: sub.grade,
              gradePoints: typeof sub.grade_points === 'number' ? sub.grade_points : Number(sub.grade_points) || undefined,
              term: sub.term,
              academicYear: typeof sub.academic_year === 'number' ? sub.academic_year : Number(sub.academic_year) || undefined,
              gradingStatus: sub.grading_status || 'Graded',
            });
          }
        } else {
          extractedFields[key] = typeof val === 'object' && val !== null && 'value' in val ? (val as any).value : val;
        }
      }
    }

    return {
      sampleId,
      documentId: sampleId.split('_')[0],
      documentType,
      qualityProfile,
      pngPath,
      pdfPath,
      gtPath,
      metadataPath,
      extractedFields,
      subjects,
      rawGtDict: rawGt,
    };
  }

  private getPluralCategory(docType: DocumentCategory): string {
    switch (docType) {
      case 'certificate':
        return 'certificates';
      case 'marksheet':
        return 'marksheets';
      case 'student_id':
        return 'student_ids';
      default:
        return 'certificates';
    }
  }
}
