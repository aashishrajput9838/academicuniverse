import { Request, Response } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { AcademicRecordRepository } from '../shared/repositories/academicRecord.repository';
import { PersonResolver } from '../shared/services/personResolver.service';
import { AcademicRecord } from '../models/AcademicRecord';
import { UaipUpload } from '../models/UaipUpload';
import { GridFSProvider } from '../storage/GridFSProvider';

interface SubjectDTO {
  code: string;
  name: string;
  credits: number;
  grade: string;
  gradePoints: number;
  gradingStatus: string;
}

interface SemesterDTO {
  semester: string;
  year: number;
  gpa: number;
  subjects: SubjectDTO[];
  sourceDocumentId?: string;
}

interface OverallDTO {
  cgpa: number;
  totalCredits: number;
  completedCredits: number;
  remainingCredits: number | null;
  semestersCompleted: number;
}

interface AcademicRecordsResponse {
  overall: OverallDTO;
  semesters: SemesterDTO[];
}

/**
 * Grade-point mapping for CGPA computation.
 * University rule: GPA-exempt statuses are excluded from GPA calculations
 * regardless of grade value.
 */
const GPA_EXEMPT_STATUSES = new Set(['Audit', 'In Progress', 'Fail']);

/**
 * For subjects with Graded/PASS/Qualified status, these grades still do not
 * contribute to GPA because they represent non-passing outcomes.
 */
const NON_GP_GRADES = new Set(['F']);

/**
 * Determine whether a subject record should contribute to GPA calculations.
 *
 * Rules:
 * 1. gradingStatus is authoritative. Audit / In Progress / Fail are always excluded.
 * 2. For Graded / Pass / Qualified subjects, exclude if grade is F.
 * 3. For backward compatibility with records missing gradingStatus,
 *    fall back to grade-based exclusion (only F is excluded).
 */
function isGpaEligible(record: any): boolean {
  const status = (record.gradingStatus || 'Graded').trim();
  if (GPA_EXEMPT_STATUSES.has(status)) {
    return false;
  }
  const grade = String(record.grade || '').trim();
  if (NON_GP_GRADES.has(grade)) {
    return false;
  }
  return true;
}

/**
 * Determine whether a subject counts as completed credit.
 * Audit and In Progress do not count as completed.
 */
function isCompleted(record: any): boolean {
  const status = (record.gradingStatus || 'Graded').trim();
  if (status === 'Audit' || status === 'In Progress') {
    return false;
  }
  const grade = String(record.grade || '').trim();
  if (grade === 'F' || status === 'Fail') {
    return false;
  }
  return true;
}

/**
 * GET /api/academic-records/me
 * Returns aggregated academic records for the authenticated user.
 *
 * Computed metrics:
 * - CGPA: sum(gradePoints for GPA-eligible subjects) / sum(credits for GPA-eligible subjects)
 * - Total Credits: sum of credits for ALL subjects in the canonical collection
 * - Completed Credits: sum of credits for subjects that count as completed
 * - Semester GPA: same formula scoped to one semester
 *
 * These formulas are deterministic and do not depend on UI state or
 * KnowledgeRecord fields.
 */
export const getMyAcademicRecords = async (req: any, res: Response) => {
  const { organizationId, user } = req;
  const authUserId = user?.userId;
  if (!organizationId || !authUserId) {
    return sendError(res, 401, 'Authentication required');
  }
  try {
    const personResolver = new PersonResolver();
    const personId = await personResolver.resolve(authUserId, organizationId);
    const repo = new AcademicRecordRepository();
    const records = await repo.findByPerson(personId, organizationId);

    if (!records || records.length === 0) {
      const emptyResponse: AcademicRecordsResponse = {
        overall: {
          cgpa: 0,
          totalCredits: 0,
          completedCredits: 0,
          remainingCredits: null,
          semestersCompleted: 0,
        },
        semesters: [],
      };
      return sendResponse(res, 200, emptyResponse, 'No academic records found');
    }

    const semesterMap = new Map<string, SemesterDTO>();
    let totalGradePoints = 0;
    let totalCredits = 0;
    let gpaEligibleGradePoints = 0;
    let gpaEligibleCredits = 0;
    let completedCredits = 0;

    for (const record of records) {
      const key = `${record.semester}-${record.year}`;
      if (!semesterMap.has(key)) {
        semesterMap.set(key, {
          semester: record.semester,
          year: record.year,
          gpa: 0,
          subjects: [],
          sourceDocumentId: typeof record.sourceDocumentId === 'string' ? record.sourceDocumentId : record.sourceDocumentId?.toString?.() || undefined,
        });
      }
      const semester = semesterMap.get(key)!;
      const credits = Number(record.credits ?? 0);
      const gradePoints = Number(record.gradePoints ?? 0);

      semester.subjects.push({
        code: record.subjectCode,
        name: record.subjectName,
        credits,
        grade: record.grade,
        gradePoints,
        gradingStatus: record.gradingStatus,
      });

      totalCredits += credits;

      if (isGpaEligible(record)) {
        gpaEligibleGradePoints += gradePoints;
        gpaEligibleCredits += credits;
      }

      if (isCompleted(record)) {
        completedCredits += credits;
      }
    }

    const semesters: SemesterDTO[] = [];
    for (const semester of semesterMap.values()) {
      const semesterCredits = semester.subjects.reduce((sum, s) => sum + s.credits, 0);
      const semesterGradePoints = semester.subjects.reduce((sum, s) => {
        // Recompute semester GPA using the same eligibility rules
        const subRecord = { gradingStatus: s.gradingStatus, grade: s.grade };
        return isGpaEligible(subRecord) ? sum + s.gradePoints : sum;
      }, 0);
      const semesterGpaCredits = semester.subjects.reduce((sum, s) => {
        const subRecord = { gradingStatus: s.gradingStatus, grade: s.grade };
        return isGpaEligible(subRecord) ? sum + s.credits : sum;
      }, 0);
      semester.gpa = semesterGpaCredits > 0 ? Number((semesterGradePoints / semesterGpaCredits).toFixed(3)) : 0;
      semesters.push(semester);
    }

    semesters.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.semester.localeCompare(b.semester);
    });

    const overall: OverallDTO = {
      cgpa: gpaEligibleCredits > 0 ? Number((gpaEligibleGradePoints / gpaEligibleCredits).toFixed(3)) : 0,
      totalCredits,
      completedCredits,
      remainingCredits: null,
      semestersCompleted: semesters.length,
    };

    const response: AcademicRecordsResponse = {
      overall,
      semesters,
    };

    return sendResponse(res, 200, response, 'Academic records retrieved');
  } catch (err: any) {
    console.error('Get academic records error:', err);
    return sendError(res, 500, 'Failed to fetch academic records');
  }
};

/**
 * GET /api/academic-records/documents/:sourceDocumentId
 * Streams the original uploaded document for the given AcademicRecord source document.
 */
export const getAcademicRecordDocument = async (req: any, res: Response) => {
  const { organizationId, user } = req;
  const { sourceDocumentId } = req.params;

  if (!organizationId || !user?.userId || !sourceDocumentId) {
    return sendError(res, 401, 'Authentication required');
  }

  try {
    const upload = await UaipUpload.findOne({
      _id: sourceDocumentId,
      organizationId,
      status: 'SUCCESS',
    });

    if (!upload || !upload.storageId) {
      return sendError(res, 404, 'Document not found');
    }

    const gridFs = new GridFSProvider();
    const fileBuffer = await gridFs.getFile(upload.storageId);

    res.setHeader('Content-Type', upload.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${upload.fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.send(fileBuffer);
  } catch (err: any) {
    console.error('Get academic record document error:', err);
    return sendError(res, 500, 'Failed to fetch document');
  }
};
