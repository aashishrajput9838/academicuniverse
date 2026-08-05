/**
 * AdbgGroundTruthAdapter.ts
 *
 * Ground Truth Adapter for loading and normalizing ground truth JSON files
 * produced by the Academic Document Benchmark Generator (ADBG v1.0).
 *
 * SCHEMA (real ADBG output):
 *   - document_id, sample_id, document_type, quality_profile
 *   - student: { student_name, roll_number, enrollment_number, degree_name,
 *                branch_name, batch_years, father_name, mother_name, date_of_birth,
 *                email, phone, address, blood_group }
 *   - university: { name, short_code, address, tagline, university_id }
 *   - cgpa: float
 *   - issue_date: string
 *   - semester_records: [ { semester_name, sgpa, credits_earned, course_marks: [ ... ] } ]
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

    // Extract sample metadata
    const sampleId = rawGt.sample_id || rawGt.document_id || path.basename(gtPath, '.json');
    const qualityProfile = (rawGt.quality_profile || 'clean') as QualityProfile;
    const documentType = (rawGt.document_type || 'certificate') as DocumentCategory;
    const docId = rawGt.document_id || sampleId.split('_')[0];

    // Build image/pdf paths
    const pluCat = this.getPluralCategory(documentType);
    const pngPath = path.join('images', qualityProfile, 'png', pluCat, `${sampleId}.png`);
    const pdfPath = path.join('pdf', 'clean', pluCat, `${docId}.pdf`);
    const metadataPath = path.join('metadata', qualityProfile, pluCat, `${sampleId}.json`);

    // -------------------------------------------------------
    // Parse field entities from real ADBG GT schema
    // -------------------------------------------------------
    const extractedFields: Record<string, any> = {};
    const subjects: SubjectItemGT[] = [];

    // Student fields
    const student = rawGt.student || {};
    if (student.student_name)      extractedFields['student_name']      = student.student_name;
    if (student.roll_number)       extractedFields['roll_number']        = student.roll_number;
    if (student.enrollment_number) extractedFields['enrollment_number']  = student.enrollment_number;
    if (student.degree_name)       extractedFields['degree_name']        = student.degree_name;
    if (student.branch_name)       extractedFields['branch_name']        = student.branch_name;
    if (student.batch_years)       extractedFields['batch_years']        = student.batch_years;
    if (student.father_name)       extractedFields['father_name']        = student.father_name;
    if (student.mother_name)       extractedFields['mother_name']        = student.mother_name;
    if (student.date_of_birth)     extractedFields['date_of_birth']      = student.date_of_birth;
    if (student.email)             extractedFields['email']              = student.email;
    if (student.phone)             extractedFields['phone']              = student.phone;
    if (student.blood_group)       extractedFields['blood_group']        = student.blood_group;

    // University fields
    const uni = rawGt.university || {};
    if (uni.name)       extractedFields['university_name']  = uni.name;
    if (uni.short_code) extractedFields['university_code']  = uni.short_code;
    if (uni.tagline)    extractedFields['university_tagline'] = uni.tagline;

    // Document-level fields
    if (rawGt.cgpa !== undefined)    extractedFields['cgpa']       = String(rawGt.cgpa);
    if (rawGt.issue_date)            extractedFields['issue_date'] = rawGt.issue_date;
    if (rawGt.document_type)         extractedFields['document_type'] = rawGt.document_type;

    // Semester records → subjects array (for marksheets)
    const semRecords = rawGt.semester_records || [];
    for (const sem of semRecords) {
      for (const cm of sem.course_marks || []) {
        subjects.push({
          code:         cm.course_code,
          name:         cm.course_name,
          credits:      typeof cm.credits === 'number' ? cm.credits : Number(cm.credits) || undefined,
          grade:        cm.grade,
          gradePoints:  typeof cm.grade_point === 'number' ? cm.grade_point : Number(cm.grade_point) || undefined,
          term:         sem.semester_name,
          academicYear: undefined,
          gradingStatus: 'Graded',
        });
      }
    }

    return {
      sampleId,
      documentId: docId,
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
      case 'certificate': return 'certificates';
      case 'marksheet':   return 'marksheets';
      case 'student_id':  return 'student_ids';
      default:            return 'certificates';
    }
  }
}
