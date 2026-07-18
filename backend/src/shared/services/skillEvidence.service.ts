import { AuditEntry } from '../../models/AuditEntry';
import { SkillEvidenceRepository } from '../repositories/skillEvidence.repository';
import { ISkillEvidence } from '../../models/SkillEvidence';
import { EvidenceStatus, SkillSource } from '../../shared/enums/skills.enum';

export class SkillEvidenceService {
  private repo = new SkillEvidenceRepository();

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

    const evidence = await this.repo.create(
      {
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
        effectiveFrom: effectiveFrom || new Date(),
        effectiveTo,
        status: EvidenceStatus.ACTIVE,
      },
      organizationId
    );

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
