import { CanonicalSkill, ICanonicalSkill } from '../../models/CanonicalSkill';
import { toObjectId } from '../../utils/mongooseHelpers';

export class CanonicalSkillRepository {
  async create(data: Partial<ICanonicalSkill>): Promise<ICanonicalSkill> {
    const created = await CanonicalSkill.create(data as ICanonicalSkill);
    return created;
  }

  async findByCanonicalId(canonicalId: string): Promise<ICanonicalSkill | null> {
    return CanonicalSkill.findOne({ canonicalId }) as any;
  }

  async findByName(canonicalName: string): Promise<ICanonicalSkill | null> {
    return CanonicalSkill.findOne({ canonicalName: { $regex: `^${this.escapeRegex(canonicalName)}$`, $options: 'i' } }) as any;
  }

  async upsertByCanonicalId(canonicalId: string, data: Partial<ICanonicalSkill>): Promise<ICanonicalSkill> {
    const existing = await CanonicalSkill.findOne({ canonicalId });
    if (existing) {
      await CanonicalSkill.updateOne({ canonicalId }, { $set: data });
      return CanonicalSkill.findOne({ canonicalId }) as any;
    }
    return CanonicalSkill.create({ canonicalId, ...data } as ICanonicalSkill);
  }

  async findAll(organizationId?: string): Promise<ICanonicalSkill[]> {
    const filter: any = {};
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return CanonicalSkill.find(filter).sort({ canonicalName: 1 }) as any;
  }

  async updateStatus(canonicalId: string, status: string): Promise<void> {
    await CanonicalSkill.updateOne({ canonicalId }, { status });
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
