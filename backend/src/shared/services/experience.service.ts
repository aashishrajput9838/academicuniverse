import { Types } from 'mongoose';
import { ExperienceRecordRepository } from '../repositories/experienceRecord.repository';
import { AuditEntry } from '../../models/AuditEntry';
import { IExperienceRecord } from '../../models/ExperienceRecord';
import { toObjectId } from '../../utils/mongooseHelpers';

export class ExperienceService {
  private repo = new ExperienceRecordRepository();

  /** Merge (upsert) an experience record */
  async merge(payload: {
    organizationId: string;
    personId: string;
    sourceDocumentId: string;
    rawConfidence: number;
    title: string;
    company: string;
    startDate: string; // ISO
    endDate?: string; // ISO optional
    correlationId?: string;
  }): Promise<IExperienceRecord> {
    const { organizationId, personId, sourceDocumentId, rawConfidence, title, company, startDate, endDate, correlationId } = payload;

    const { doc, action } = await this.repo.upsert(
      {
        organizationId: toObjectId(organizationId),
        personId: toObjectId(personId),
        sourceDocumentId: toObjectId(sourceDocumentId),
        rawConfidence,
        title,
        company,
        startDate: new Date(startDate),
        ...(endDate && { endDate: new Date(endDate) }),
      },
      organizationId,
    );

    await AuditEntry.create({
      organizationId,
      recordId: doc._id.toString(),
      collectionName: 'experience_records',
      action,
      performedBy: 'dispatcher',
      metadata: { domain: 'experience', rawConfidence, correlationId },
    });

    return doc;
  }

  async findByPerson(personId: string) {
    return this.repo.findByPerson(personId);
  }
}
