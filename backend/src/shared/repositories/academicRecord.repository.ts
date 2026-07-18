import { AcademicRecord, IAcademicRecord } from '../../models/AcademicRecord';
import { AuditEntry } from '../../models/AuditEntry';
import { Types } from 'mongoose';
import { toObjectId } from '../../utils/mongooseHelpers';

export class AcademicRecordRepository {
  /**
   * Upsert an academic record. If a record with the same unique key exists, it is replaced.
   * Returns the saved record and a flag indicating whether this was a create or update.
   */
  async upsert(record: Partial<IAcademicRecord>, organizationId: string): Promise<{doc: IAcademicRecord; action: 'create' | 'update'}> {
    const filter = {
      organizationId: toObjectId(organizationId),
      personId: record.personId,
      subjectCode: record.subjectCode,
      semester: record.semester,
      year: record.year,
    } as any;

    const existing = await AcademicRecord.findOne(filter);
    if (existing) {
      await AcademicRecord.updateOne({ _id: existing._id }, record);
      const updated = await AcademicRecord.findById(existing._id) as IAcademicRecord;
      return { doc: updated, action: 'update' };
    }
    const created = await AcademicRecord.create(record as IAcademicRecord);
    return { doc: created, action: 'create' };
  }

  async findByPerson(personId: string, organizationId?: string) {
    const filter: any = { personId: toObjectId(personId) };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return AcademicRecord.find(filter).sort({ year: 1, semester: 1 });
  }
}
