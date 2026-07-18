import { SkillRecord, ISkillRecord } from '../../models/SkillRecord';
import { Types } from 'mongoose';
import { toObjectId } from '../../utils/mongooseHelpers';

export class SkillRecordRepository {
  async upsert(record: Partial<ISkillRecord>, organizationId: string): Promise<{doc: ISkillRecord; action: 'create' | 'update'}> {
    const filter = {
      organizationId: toObjectId(organizationId),
      personId: record.personId,
      skillId: record.skillId,
    } as any;

    const existing = await SkillRecord.findOne(filter);
    if (existing) {
      await SkillRecord.updateOne({ _id: existing._id }, record);
      const updated = await SkillRecord.findById(existing._id) as ISkillRecord;
      return { doc: updated, action: 'update' };
    }
    const created = await SkillRecord.create(record as ISkillRecord);
    return { doc: created, action: 'create' };
  }

  async findByPerson(personId: string, organizationId?: string): Promise<ISkillRecord[]> {
    const filter: any = { personId: toObjectId(personId) };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillRecord.find(filter).sort({ proficiencyScore: -1 });
  }

  async findByPersonAndCategory(personId: string, category: string, organizationId?: string): Promise<ISkillRecord[]> {
    const filter: any = { personId: toObjectId(personId), skillCategory: category };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillRecord.find(filter).sort({ proficiencyScore: -1 });
  }

  async findBySkill(personId: string, skillId: string, organizationId?: string): Promise<ISkillRecord | null> {
    const filter: any = { personId: toObjectId(personId), skillId };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillRecord.findOne(filter);
  }

  async archiveSkill(skillId: string, organizationId: string): Promise<void> {
    await SkillRecord.updateMany(
      { organizationId: toObjectId(organizationId), skillId },
      { status: 'ARCHIVED' }
    );
  }

  async mergeSkills(sourceSkillId: string, targetSkillId: string, organizationId: string): Promise<void> {
    const sourceRecords = await SkillRecord.find({
      organizationId: toObjectId(organizationId),
      skillId: sourceSkillId,
    });

    for (const source of sourceRecords) {
      const existing = await SkillRecord.findOne({
        organizationId: source.organizationId,
        personId: source.personId,
        skillId: targetSkillId,
      });

      if (existing) {
        await SkillRecord.updateOne(
          { _id: existing._id },
          {
            $inc: { evidenceCount: source.evidenceCount },
            $set: {
              lastVerifiedAt: new Date(),
              status: 'ACTIVE',
            },
          }
        );
        await SkillRecord.updateOne(
          { _id: source._id },
          {
            status: 'SUPERSEDED',
            supersededBy: existing._id,
          }
        );
      } else {
        await SkillRecord.updateOne(
          { _id: source._id },
          {
            skillId: targetSkillId,
            status: 'ACTIVE',
          }
        );
      }
    }
  }

  async rebuildProjection(record: Partial<ISkillRecord>, organizationId: string): Promise<ISkillRecord> {
    const filter = {
      organizationId: toObjectId(organizationId),
      personId: record.personId,
      skillId: record.skillId,
    } as any;

    const existing = await SkillRecord.findOne(filter);
    if (existing) {
      await SkillRecord.updateOne({ _id: existing._id }, record);
      const updated = await SkillRecord.findById(existing._id) as ISkillRecord;
      return updated;
    }

    const created = await SkillRecord.create(record as ISkillRecord);
    return created;
  }
}
