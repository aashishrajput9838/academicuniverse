import { SubjectSkillMapping, ISubjectSkillMapping } from '../../models/SubjectSkillMapping';
import { Types } from 'mongoose';
import { toObjectId } from '../../utils/mongooseHelpers';

export class SubjectSkillMappingRepository {
  async upsert(mapping: Partial<ISubjectSkillMapping>, organizationId: string): Promise<{doc: ISubjectSkillMapping; action: 'create' | 'update'}> {
    const filter = {
      organizationId: toObjectId(organizationId),
      subjectCode: mapping.subjectCode,
      skillId: mapping.skillId,
    } as any;

    const existing = await SubjectSkillMapping.findOne(filter);
    if (existing) {
      await SubjectSkillMapping.updateOne({ _id: existing._id }, mapping);
      const updated = await SubjectSkillMapping.findById(existing._id) as ISubjectSkillMapping;
      return { doc: updated, action: 'update' };
    }
    const created = await SubjectSkillMapping.create(mapping as ISubjectSkillMapping);
    return { doc: created, action: 'create' };
  }

  async findBySubject(subjectCode: string, organizationId: string, atDate?: Date): Promise<ISubjectSkillMapping[]> {
    const filter: any = {
      organizationId: toObjectId(organizationId),
      subjectCode,
    };

    if (atDate) {
      filter.effectiveFrom = { $lte: atDate };
      filter.$or = [
        { effectiveTo: { $exists: false } },
        { effectiveTo: { $gte: atDate } },
      ];
    }

    return SubjectSkillMapping.find(filter).sort({ version: -1 });
  }

  async findBySkill(skillId: string, organizationId: string): Promise<ISubjectSkillMapping[]> {
    const filter: any = {
      organizationId: toObjectId(organizationId),
      skillId,
    };
    return SubjectSkillMapping.find(filter).sort({ subjectCode: 1, version: -1 });
  }

  async findValidMappings(organizationId: string, atDate?: Date): Promise<ISubjectSkillMapping[]> {
    const filter: any = { organizationId: toObjectId(organizationId) };

    if (atDate) {
      filter.effectiveFrom = { $lte: atDate };
      filter.$or = [
        { effectiveTo: { $exists: false } },
        { effectiveTo: { $gte: atDate } },
      ];
    }

    return SubjectSkillMapping.find(filter).sort({ subjectCode: 1, skillId: 1 });
  }

  async bulkUpsert(mappings: Partial<ISubjectSkillMapping>[], organizationId: string): Promise<void> {
    for (const mapping of mappings) {
      await this.upsert(mapping, organizationId);
    }
  }
}
