import { Types } from 'mongoose';
import { AcademicRecordRepository } from '../repositories/academicRecord.repository';
import { AuditEntry } from '../../models/AuditEntry';
import { IAcademicRecord } from '../../models/AcademicRecord';

/**
 * Service that encapsulates the AcademicRecord merge logic.
 * It receives a fully resolved payload (including personId) and
 * performs an upsert, then records a structured audit entry.
 */
export class AcademicRecordService {
  private repo = new AcademicRecordRepository();

  /**
   * Merge (upsert) an academic record.
   * Returns the persisted record and the performed action.
   */
  async merge(payload: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    subjectCode: string;
    subjectName: string;
    semester: string;
    year: number;
    grade: string;
    credits: number;
    status: string;
    correlationId?: string;
  }): Promise<IAcademicRecord> {
    const {
      organizationId,
      personId,
      sourceDocumentId,
      rawConfidence,
      subjectCode,
      subjectName,
      semester,
      year,
      grade,
      credits,
      status,
      correlationId,
    } = payload;

    const { doc, action } = await this.repo.upsert(
      {
        organizationId: new Types.ObjectId(organizationId),
        personId: new Types.ObjectId(personId),
        sourceDocumentId: new Types.ObjectId(sourceDocumentId),
        rawConfidence,
        subjectCode,
        subjectName,
        semester,
        year,
        grade,
        credits,
        status,
      },
      organizationId
    );

    // Structured audit entry
    await AuditEntry.create({
      organizationId,
      recordId: doc._id.toString(),
      collectionName: 'academic_records',
      action,
      performedBy: 'dispatcher',
      metadata: {
        domain: 'academic',
        rawConfidence,
        correlationId,
      },
    });

    return doc;
  }
}
