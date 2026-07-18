import { SkillAlias, ISkillAlias } from '../../models/SkillAlias';
import { toObjectId } from '../../utils/mongooseHelpers';

export class SkillAliasRepository {
  async create(data: Partial<ISkillAlias>): Promise<ISkillAlias> {
    const created = await SkillAlias.create(data as ISkillAlias);
    return created;
  }

  async findByAlias(alias: string, aliasType?: string, organizationId?: string): Promise<ISkillAlias | null> {
    const filter: any = { alias: { $regex: `^${this.escapeRegex(alias)}$`, $options: 'i' }, status: 'ACTIVE' };
    if (aliasType) {
      filter.aliasType = aliasType;
    }
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    return SkillAlias.findOne(filter) as any;
  }

  async findByCanonicalId(canonicalId: string): Promise<ISkillAlias[]> {
    return SkillAlias.find({ canonicalId, status: 'ACTIVE' }) as any;
  }

  async upsert(data: Partial<ISkillAlias>): Promise<ISkillAlias> {
    const filter: any = { canonicalId: data.canonicalId, alias: data.alias };
    if (data.organizationId) {
      filter.organizationId = data.organizationId;
    }

    const existing = await SkillAlias.findOne(filter);
    if (existing) {
      await SkillAlias.updateOne({ _id: existing._id }, { $set: data });
      return SkillAlias.findById(existing._id) as any;
    }

    return SkillAlias.create(data as ISkillAlias);
  }

  async deprecate(alias: string, organizationId?: string): Promise<void> {
    const filter: any = { alias };
    if (organizationId) {
      filter.organizationId = toObjectId(organizationId);
    }
    await SkillAlias.updateMany(filter, { status: 'DEPRECATED' });
  }

  async findByOrganization(organizationId: string): Promise<ISkillAlias[]> {
    return SkillAlias.find({ organizationId: toObjectId(organizationId), status: 'ACTIVE' }) as any;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
