import { ExperienceRecord, IExperienceRecord } from '../../models/ExperienceRecord';
import { Types } from 'mongoose';

export class ExperienceRecordRepository {
  /**
   * Upsert an experience record. Duplicate title+company per person is prevented by unique index.
   */
  async upsert(record: Partial<IExperienceRecord>, organizationId: string): Promise<{doc: IExperienceRecord; action: 'create' | 'update'}> {
    const filter = {
      organizationId: new Types.ObjectId(organizationId),
      personId: record.personId,
      title: record.title,
      company: record.company,
    } as any;

    const existing = await ExperienceRecord.findOne(filter);
    if (existing) {
      await ExperienceRecord.updateOne({ _id: existing._id }, record);
      const updated = await ExperienceRecord.findById(existing._id) as IExperienceRecord;
      return { doc: updated, action: 'update' };
    }
    const created = await ExperienceRecord.create(record as IExperienceRecord);
    return { doc: created, action: 'create' };
  }

  async findByPerson(personId: string) {
    return ExperienceRecord.find({ personId: new Types.ObjectId(personId) });
  }
}
