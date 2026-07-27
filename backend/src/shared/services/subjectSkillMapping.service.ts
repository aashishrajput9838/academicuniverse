import { AuditEntry } from '../../models/AuditEntry';
import { SubjectSkillMappingRepository } from '../repositories/subjectSkillMapping.repository';
import { ISubjectSkillMapping } from '../../models/SubjectSkillMapping';
import { SkillCategory } from '../../shared/enums/skills.enum';
import { normalizeDate } from '../../shared/utils/dateNormalizer';
import { toObjectId } from '../../utils/mongooseHelpers';

export class SubjectSkillMappingService {
  private repo = new SubjectSkillMappingRepository();

  async upsertMapping(payload: {
    organizationId: string;
    subjectCode: string;
    subjectName: string;
    skillId: string;
    skillName: string;
    skillCategory: SkillCategory;
    relevanceWeight: number;
    isCore: boolean;
    effectiveFrom: string | Date;
    effectiveTo?: string | Date;
    version?: number;
    createdBy?: string;
  }): Promise<ISubjectSkillMapping> {
    const {
      organizationId,
      subjectCode,
      subjectName,
      skillId,
      skillName,
      skillCategory,
      relevanceWeight,
      isCore,
      effectiveFrom,
      effectiveTo,
      version,
      createdBy,
    } = payload;

    const normalizedFrom = normalizeDate(effectiveFrom);
    const normalizedTo = effectiveTo ? normalizeDate(effectiveTo) : null;

    if (!normalizedFrom.isValid) {
      throw new Error('Invalid effectiveFrom date');
    }
    if (normalizedTo && !normalizedTo.isValid) {
      throw new Error('Invalid effectiveTo date');
    }

    const { doc, action } = await this.repo.upsert(
      {
        organizationId: toObjectId(organizationId),
        subjectCode,
        subjectName,
        skillId,
        skillName,
        skillCategory,
        relevanceWeight,
        isCore,
        effectiveFrom: new Date(normalizedFrom.isoDateTime!),
        effectiveTo: normalizedTo ? new Date(normalizedTo.isoDateTime!) : undefined,
        version: version ?? 1,
        createdBy,
      },
      organizationId
    );

    await AuditEntry.create({
      organizationId,
      recordId: doc._id.toString(),
      collectionName: 'subject_skill_mappings',
      action,
      performedBy: createdBy || 'system',
      metadata: {
        domain: 'skills',
        subjectCode,
        skillId,
        version: doc.version,
      },
    });

    return doc;
  }

  async getMappingsForSubject(subjectCode: string, organizationId: string, atDate?: Date): Promise<ISubjectSkillMapping[]> {
    const mappings = await this.repo.findBySubject(subjectCode, organizationId, atDate);
    return this.resolveConflicts(mappings);
  }

  async getMappingsForSkill(skillId: string, organizationId: string): Promise<ISubjectSkillMapping[]> {
    return this.repo.findBySkill(skillId, organizationId);
  }

  private resolveConflicts(mappings: ISubjectSkillMapping[]): ISubjectSkillMapping[] {
    const best = new Map<string, ISubjectSkillMapping>();

    for (const mapping of mappings) {
      const key = mapping.skillId;
      const existing = best.get(key);

      if (!existing) {
        best.set(key, mapping);
        continue;
      }

      if (mapping.version > existing.version) {
        best.set(key, mapping);
      } else if (mapping.version === existing.version && mapping.effectiveFrom > existing.effectiveFrom) {
        best.set(key, mapping);
      }
    }

    return Array.from(best.values()).sort((a, b) => b.version - a.version);
  }
}
