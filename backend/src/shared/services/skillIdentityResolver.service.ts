import { AliasType, AliasStatus } from '../enums/skillAlias.enum';
import { CanonicalSkillRepository } from '../repositories/canonicalSkill.repository';
import { SkillAliasRepository } from '../repositories/skillAlias.repository';
import { ICanonicalSkill } from '../../models/CanonicalSkill';
import { ISkillAlias } from '../../models/SkillAlias';
import { SkillCategory } from '../enums/skills.enum';
import { Logger } from '../../utils/logger';

const logger = new Logger('SkillIdentityResolver');

export interface ResolutionInput {
  rawSkillId: string;
  rawSkillName: string;
  source: string;
  organizationId?: string;
  aliasType?: AliasType;
  confidence?: number;
  extractedBy?: string;
  correlationId?: string;
  canonicalId?: string;
  canonicalCategory?: SkillCategory;
}

export interface ResolvedSkill {
  canonicalId: string;
  canonicalName: string;
  canonicalCategory: SkillCategory;
  confidence: number;
  aliasType: AliasType;
  isNew: boolean;
  source: string;
}

export class SkillIdentityResolver {
  private readonly defaultConfidence = 0.8;
  private readonly minConfidenceThreshold = 0.5;
  private readonly defaultCategory = SkillCategory.TECHNICAL;

  constructor(
    private canonicalRepo = new CanonicalSkillRepository(),
    private aliasRepo = new SkillAliasRepository()
  ) {}

  async resolve(input: ResolutionInput): Promise<ResolvedSkill> {
    const {
      rawSkillId,
      rawSkillName,
      source,
      organizationId,
      aliasType = AliasType.SKILL_ID,
      confidence = this.defaultConfidence,
      extractedBy = 'resolver',
      correlationId,
      canonicalId,
      canonicalCategory,
    } = input;

    const normalizedCanonicalId = canonicalId || this.normalizeToCanonicalId(rawSkillName);

    const existingAlias = await this.aliasRepo.findByAlias(rawSkillId, aliasType, organizationId);

    if (existingAlias) {
      const canonical = await this.canonicalRepo.findByCanonicalId(existingAlias.canonicalId);
      if (canonical) {
        return {
          canonicalId: canonical.canonicalId,
          canonicalName: canonical.canonicalName,
          canonicalCategory: canonical.canonicalCategory,
          confidence: existingAlias.confidence,
          aliasType: existingAlias.aliasType,
          isNew: false,
          source: canonical.source,
        };
      }
    }

    const newCanonical = await this.canonicalRepo.upsertByCanonicalId(normalizedCanonicalId, {
      canonicalName: rawSkillName,
      canonicalCategory: canonicalCategory || this.defaultCategory,
      source,
      description: `Auto-created from ${source}`,
    });

    const newAlias = await this.aliasRepo.upsert({
      organizationId,
      canonicalId: newCanonical.canonicalId,
      alias: rawSkillId,
      aliasType,
      confidence,
      source,
      extractedBy,
      correlationId,
      status: AliasStatus.ACTIVE,
    });

    logger.info('New canonical skill created', {
      canonicalId: newCanonical.canonicalId,
      rawSkillId,
      rawSkillName,
      aliasType,
      confidence,
      source,
      organizationId,
      correlationId,
    });

    return {
      canonicalId: newCanonical.canonicalId,
      canonicalName: newCanonical.canonicalName,
      canonicalCategory: newCanonical.canonicalCategory,
      confidence: newAlias.confidence,
      aliasType: newAlias.aliasType,
      isNew: true,
      source: newCanonical.source,
    };
  }

  async batchResolve(inputs: ResolutionInput[]): Promise<ResolvedSkill[]> {
    const results: ResolvedSkill[] = [];
    for (const input of inputs) {
      const resolved = await this.resolve(input);
      results.push(resolved);
    }
    return results;
  }

  async getCanonicalSkill(canonicalId: string): Promise<ICanonicalSkill | null> {
    return this.canonicalRepo.findByCanonicalId(canonicalId);
  }

  async getAliasesForCanonical(canonicalId: string): Promise<ISkillAlias[]> {
    return this.aliasRepo.findByCanonicalId(canonicalId);
  }

  async registerManualAlias(
    canonicalId: string,
    alias: string,
    organizationId: string,
    extractedBy: string,
    correlationId?: string
  ): Promise<ISkillAlias> {
    const canonical = await this.canonicalRepo.findByCanonicalId(canonicalId);
    if (!canonical) {
      throw new Error(`Canonical skill not found: ${canonicalId}`);
    }

    return this.aliasRepo.upsert({
      canonicalId,
      alias,
      aliasType: AliasType.MANUAL,
      confidence: 1.0,
      source: 'MANUAL',
      extractedBy,
      correlationId,
      organizationId,
      status: AliasStatus.ACTIVE,
    });
  }

  private normalizeToCanonicalId(rawName: string): string {
    return rawName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
