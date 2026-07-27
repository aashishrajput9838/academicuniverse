import { AuditEntry } from '../../models/AuditEntry';
import { SkillEvidenceRepository } from '../repositories/skillEvidence.repository';
import { ISkillEvidence } from '../../models/SkillEvidence';
import { EvidenceStatus, SkillSource } from '../../shared/enums/skills.enum';
import { SkillIdentityResolver, ResolvedSkill } from './skillIdentityResolver.service';
import { Logger } from '../../utils/logger';
import { ontologyResolutionMetrics } from './ontologyResolutionMetrics.service';
import { AliasType } from '../enums/skillAlias.enum';
import { toObjectId } from '../../utils/mongooseHelpers';

const logger = new Logger('SkillEvidenceService');

export class SkillEvidenceService {
  private repo = new SkillEvidenceRepository();
  private resolver = new SkillIdentityResolver();

  async ingestEvidence(payload: {
    organizationId: string;
    personId: string;
    sourceDocumentId?: string;
    skillId: string;
    skillName: string;
    aliases: string[];
    primarySource: SkillSource;
    sourceType: string;
    sourceSubtype?: string;
    payload: Record<string, any>;
    confidence: number;
    extractedBy: string;
    correlationId?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
  }): Promise<ISkillEvidence> {
    const {
      organizationId,
      personId,
      sourceDocumentId,
      skillId,
      skillName,
      aliases,
      primarySource,
      sourceType,
      sourceSubtype,
      payload: evidencePayload,
      confidence,
      extractedBy,
      correlationId,
      effectiveFrom,
      effectiveTo,
    } = payload;

    let resolvedSkill: ResolvedSkill | null = null;
    const ontologyResolutionEnabled = process.env.USE_ONTOLOGY_RESOLUTION === 'true';

    if (ontologyResolutionEnabled) {
      try {
        resolvedSkill = await this.resolver.resolve({
          rawSkillId: skillId,
          rawSkillName: skillName,
          source: primarySource,
          organizationId,
          aliasType: AliasType.SKILL_ID,
          confidence,
          extractedBy,
          correlationId,
        });
        ontologyResolutionMetrics.recordSuccess();
      } catch (err: any) {
        ontologyResolutionMetrics.recordFailure();
        logger.error('Ontology resolution failed, falling back to raw skillId', {
          error: err.message,
          skillId,
          skillName,
          organizationId,
          personId,
          correlationId,
          primarySource,
        });
        ontologyResolutionMetrics.recordFallback();
      }
    }

    const enrichedPayload: Record<string, any> = { ...evidencePayload };

    if (ontologyResolutionEnabled && resolvedSkill && resolvedSkill.canonicalId) {
      enrichedPayload.canonicalId = resolvedSkill.canonicalId;
      enrichedPayload.canonicalName = resolvedSkill.canonicalName;
    }

    if (ontologyResolutionEnabled) {
      enrichedPayload.ontologyResolutionEnabled = true;
      enrichedPayload.ontologyResolutionSucceeded = resolvedSkill !== null;
    }

    const isGitHub = primarySource === SkillSource.GITHUB && correlationId;
    const repoId = (enrichedPayload as any).repositoryId as string | undefined;

    if (correlationId) {
      let existing: ISkillEvidence | null = null;

      if (isGitHub && repoId) {
        existing = await this.repo.findActiveByCorrelationIdAndRepository(
          correlationId,
          repoId,
          organizationId
        );
      } else {
        existing = await this.repo.findActiveByCorrelationIdAndSkill(
          correlationId,
          skillId,
          organizationId
        );
      }

      if (existing) {
        const existingPayload = existing.payload || {};
        const payloadMatch =
          JSON.stringify(existingPayload) === JSON.stringify(enrichedPayload);

        if (payloadMatch) {
          logger.info('Idempotent evidence hit — returning existing document', {
            evidenceId: existing._id.toString(),
            skillId,
            correlationId,
            primarySource,
            sourceType,
            repositoryId: repoId,
          });
          return existing as ISkillEvidence;
        }

        logger.info('Superseding existing evidence with changed payload', {
          existingId: existing._id.toString(),
          skillId,
          correlationId,
          primarySource,
          sourceType,
          repositoryId: repoId,
        });

        await this.repo.supersede(
          existing._id.toString(),
          existing._id.toString(),
          organizationId
        );

        await AuditEntry.create({
          organizationId,
          recordId: existing._id.toString(),
          collectionName: 'skill_evidence',
          action: 'update',
          performedBy: extractedBy,
          metadata: {
            domain: 'skills',
            reason: 'superseded_by_idempotency',
            correlationId,
            primarySource,
            sourceType,
            repositoryId: repoId,
          },
        });
      }
    }

    let evidence: ISkillEvidence;
    try {
      evidence = await this.repo.create(
        {
          organizationId: toObjectId(organizationId),
          personId: toObjectId(personId),
          sourceDocumentId: sourceDocumentId ? toObjectId(sourceDocumentId) : undefined,
          skillId,
          skillName,
          aliases,
          primarySource,
          sourceType,
          sourceSubtype,
          payload: enrichedPayload,
          confidence,
          extractedBy,
          correlationId,
          effectiveFrom: effectiveFrom || new Date(),
          effectiveTo,
          status: EvidenceStatus.ACTIVE,
        },
        organizationId
      );
    } catch (err: any) {
      if (err.code === 11000 || err.message?.includes('duplicate key')) {
        logger.info('Duplicate evidence prevented by unique index — treating as idempotent success', {
          skillId,
          correlationId,
          primarySource,
          sourceType,
        });
        const existing = await this.repo.findActiveByCorrelationIdAndSkill(
          correlationId,
          skillId,
          organizationId
        );
        if (existing) {
          return existing as ISkillEvidence;
        }
        throw err;
      }
      throw err;
    }

    await AuditEntry.create({
      organizationId,
      recordId: evidence._id.toString(),
      collectionName: 'skill_evidence',
      action: 'create',
      performedBy: extractedBy,
      metadata: {
        domain: 'skills',
        rawConfidence: confidence,
        correlationId,
        primarySource,
        sourceType,
        canonicalId: resolvedSkill?.canonicalId || null,
        ontologyResolutionEnabled,
        ontologyResolutionSucceeded: resolvedSkill !== null,
      },
    });

    return evidence;
  }

  async revokeEvidence(evidenceId: string, organizationId: string, reason?: string): Promise<void> {
    await this.repo.revoke(evidenceId, organizationId);

    await AuditEntry.create({
      organizationId,
      recordId: evidenceId,
      collectionName: 'skill_evidence',
      action: 'update',
      performedBy: 'system',
      metadata: {
        domain: 'skills',
        errorMessage: reason,
      },
    });
  }
}
