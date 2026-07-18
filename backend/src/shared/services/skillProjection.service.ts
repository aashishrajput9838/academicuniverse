import { AuditEntry } from '../../models/AuditEntry';
import { SkillRecordRepository } from '../repositories/skillRecord.repository';
import { SkillEvidenceRepository } from '../repositories/skillEvidence.repository';
import { ISkillRecord } from '../../models/SkillRecord';
import { ISkillEvidence } from '../../models/SkillEvidence';
import { ProficiencyLevel, SkillSource, SkillStatus, SkillCategory } from '../../shared/enums/skills.enum';
import { toObjectId } from '../../utils/mongooseHelpers';
import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';

export interface ProficiencyResult {
  score: number;
  level: ProficiencyLevel;
  firstSeenAt: Date;
  lastVerifiedAt: Date;
  evidenceCount: number;
}

export class SkillProjectionService {
  private repo = new SkillRecordRepository();
  private evidenceRepo = new SkillEvidenceRepository();

  private readonly SOURCE_WEIGHTS: Record<SkillSource, number> = {
    [SkillSource.CERTIFICATE]: 1.0,
    [SkillSource.ACADEMIC]: 0.9,
    [SkillSource.RESEARCH]: 0.85,
    [SkillSource.PROJECT]: 0.8,
    [SkillSource.GITHUB]: 0.7,
    [SkillSource.MANUAL]: 0.95,
    [SkillSource.AI_INFERENCE]: 0.6,
  };

  private readonly RECENCY_WEIGHTS = [
    { maxAgeMs: 6 * 30 * 24 * 60 * 60 * 1000, factor: 1.0 },
    { maxAgeMs: 12 * 30 * 24 * 60 * 60 * 1000, factor: 0.9 },
    { maxAgeMs: 24 * 30 * 24 * 60 * 60 * 1000, factor: 0.75 },
    { maxAgeMs: Infinity, factor: 0.6 },
  ];

  computeProficiency(evidence: ISkillEvidence[]): ProficiencyResult {
    const now = Date.now();
    let weightedSum = 0;
    let weightTotal = 0;
    let firstSeen: Date | undefined;
    let lastVerified: Date | undefined;
    let activeCount = 0;

    for (const e of evidence) {
      if (e.status !== 'ACTIVE') continue;
      if (e.effectiveTo && new Date(e.effectiveTo).getTime() < now) continue;

      const ageMs = now - new Date(e.effectiveFrom).getTime();
      const recency = this.getRecencyFactor(ageMs);
      const sourceWeight = this.SOURCE_WEIGHTS[e.primarySource] ?? 0.5;
      const confidence = Math.max(0, Math.min(1, e.confidence));

      const weight = confidence * sourceWeight * recency;
      weightedSum += weight;
      weightTotal += weight;
      activeCount++;

      const effectiveFrom = new Date(e.effectiveFrom);
      if (!firstSeen || effectiveFrom < firstSeen) firstSeen = effectiveFrom;
      if (!lastVerified || effectiveFrom > lastVerified) lastVerified = effectiveFrom;
    }

    const rawScore = activeCount > 0 ? (weightedSum / activeCount) * 100 : 0;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const level = this.scoreToLevel(score);

    return {
      score,
      level,
      firstSeenAt: firstSeen ?? new Date(0),
      lastVerifiedAt: lastVerified ?? new Date(0),
      evidenceCount: activeCount,
    };
  }

  async rebuildSkillRecord(organizationId: string, personId: string, skillId: string): Promise<ISkillRecord> {
    const evidence = await this.evidenceRepo.findActiveByPersonAndSkill(personId, skillId, organizationId);
    const projection = this.computeProficiency(evidence);

    const existing = await this.repo.findBySkill(personId, skillId, organizationId);

    const projectionData: Partial<ISkillRecord> = {
      organizationId: toObjectId(organizationId),
      personId: toObjectId(personId),
      skillId,
      skillName: evidence[0]?.skillName || skillId,
      aliases: evidence[0]?.aliases || [],
      skillCategory: SkillCategory.TECHNICAL,
      proficiencyLevel: projection.level,
      proficiencyScore: projection.score,
      evidenceCount: projection.evidenceCount,
      firstSeenAt: projection.firstSeenAt,
      lastVerifiedAt: projection.lastVerifiedAt,
      status: SkillStatus.ACTIVE,
    };

    const result = await this.repo.rebuildProjection(projectionData, organizationId);

    await AuditEntry.create({
      organizationId,
      recordId: result._id.toString(),
      collectionName: 'skill_records',
      action: existing ? 'update' : 'create',
      performedBy: 'projection',
      metadata: { domain: 'skills', skillId },
    });

    void eventBus.publish(UaipEvent.SkillUpdated, {
      processingId: `skill-projection-${result._id.toString()}`,
      organizationId,
      personId,
      skillId,
      skillName: projectionData.skillName,
      proficiencyScore: projection.score,
      evidenceCount: projection.evidenceCount,
      occurredAt: new Date(),
      source: 'skills_tracker',
      primarySource: 'PROJECTION',
    });

    return result;
  }

  async rebuildAllSkillRecords(organizationId: string, personId: string): Promise<void> {
    const evidence = await this.evidenceRepo.findByPerson(personId, organizationId);
    const skillIds = new Set(evidence.map(e => e.skillId));

    for (const skillId of skillIds) {
      await this.rebuildSkillRecord(organizationId, personId, skillId);
    }

    void eventBus.publish(UaipEvent.SkillProfileRebuilt, {
      processingId: `skill-profile-${personId}-${Date.now()}`,
      organizationId,
      personId,
      occurredAt: new Date(),
      source: 'skills_tracker',
      skillsRebuilt: skillIds.size,
    });
  }

  private getRecencyFactor(ageMs: number): number {
    for (const bucket of this.RECENCY_WEIGHTS) {
      if (ageMs <= bucket.maxAgeMs) {
        return bucket.factor;
      }
    }
    return 0.6;
  }

  private scoreToLevel(score: number): ProficiencyLevel {
    if (score >= 76) return ProficiencyLevel.EXPERT;
    if (score >= 51) return ProficiencyLevel.ADVANCED;
    if (score >= 26) return ProficiencyLevel.INTERMEDIATE;
    return ProficiencyLevel.BEGINNER;
  }
}
