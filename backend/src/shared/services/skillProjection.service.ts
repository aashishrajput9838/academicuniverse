import { AuditEntry } from '../../models/AuditEntry';
import { SkillRecordRepository } from '../repositories/skillRecord.repository';
import { SkillEvidenceRepository } from '../repositories/skillEvidence.repository';
import { ISkillRecord } from '../../models/SkillRecord';
import { ISkillEvidence } from '../../models/SkillEvidence';
import { ProficiencyLevel, SkillSource, SkillStatus, SkillCategory } from '../../shared/enums/skills.enum';
import { toObjectId } from '../../utils/mongooseHelpers';
import { eventBus } from '../../events/EventBus';
import { UaipEvent } from '../../events/UaipEvents';
import { Logger } from '../../utils/logger';
import { ProficiencyExplanationDTO, ConfidenceExplanationDTO } from '../../shared/dtos/skills.dto';

const logger = new Logger('SkillProjectionService');

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

  getSourceWeight(source: SkillSource): number {
    return this.SOURCE_WEIGHTS[source] ?? 0.5;
  }

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
      if (!lastVerified || effectiveFrom > lastVerified) lastVerified = effectiveFrom;

      const acquisitionDate = this.getAcquisitionDate(e);
      if (acquisitionDate) {
        if (!firstSeen || acquisitionDate < firstSeen) firstSeen = acquisitionDate;
      }
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

  generateProficiencyExplanation(evidence: ISkillEvidence[]): ProficiencyExplanationDTO {
    const now = Date.now();
    let weightedSum = 0;
    let weightTotal = 0;
    let activeCount = 0;
    const sourceWeights: Record<string, { count: number; totalWeight: number; sourceWeight: number; isSourceDefault: boolean }> = {};

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

      const sourceKey = e.primarySource;
      if (!sourceWeights[sourceKey]) {
        sourceWeights[sourceKey] = { count: 0, totalWeight: 0, sourceWeight, isSourceDefault: true };
      }
      sourceWeights[sourceKey].count++;
      sourceWeights[sourceKey].totalWeight += weight;
    }

    const rawScore = activeCount > 0 ? (weightedSum / activeCount) * 100 : 0;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const level = this.scoreToLevel(score);

    const sourceBreakdown = Object.entries(sourceWeights).map(([source, data]) => ({
      source,
      count: data.count,
      avgWeight: data.count > 0 ? data.totalWeight / data.count : 0,
      sourceWeight: data.sourceWeight,
      isSourceDefault: data.isSourceDefault,
    }));

    return {
      score,
      level,
      thresholds: {
        BEGINNER: 0,
        INTERMEDIATE: 26,
        ADVANCED: 51,
        EXPERT: 76,
      },
      formula: 'weighted_average',
      evidenceCount: evidence.length,
      activeEvidenceCount: activeCount,
      description: `Proficiency is calculated as the weighted average of all active evidence. Each evidence item contributes a weight based on its confidence, source authority, and recency. The final score is normalized to 0-100.`,
      sourceBreakdown,
    };
  }

  generateConfidenceExplanation(evidence: ISkillEvidence[]): ConfidenceExplanationDTO {
    const now = Date.now();
    const activeEvidence = evidence.filter(e => {
      if (e.status !== 'ACTIVE') return false;
      if (e.effectiveTo && new Date(e.effectiveTo).getTime() < now) return false;
      return true;
    });

    if (activeEvidence.length === 0) {
      return {
        overallConfidence: 0,
        isSourceDefault: false,
        source: 'NONE',
        sourceDefaultConfidence: 0,
        description: 'No active evidence available.',
        perSourceBreakdown: [],
      };
    }

    const totalConfidence = activeEvidence.reduce((sum, e) => sum + e.confidence, 0);
    const overallConfidence = totalConfidence / activeEvidence.length;

    const sourceConfidences: Record<string, { count: number; total: number; isSourceDefault: boolean; defaultConfidence: number }> = {};
    for (const e of activeEvidence) {
      const source = e.primarySource;
      if (!sourceConfidences[source]) {
        const defaultConf = this.SOURCE_WEIGHTS[source] ?? 0.5;
        sourceConfidences[source] = { count: 0, total: 0, isSourceDefault: true, defaultConfidence: defaultConf };
      }
      sourceConfidences[source].count++;
      sourceConfidences[source].total += e.confidence;
    }

    const perSourceBreakdown = Object.entries(sourceConfidences).map(([source, data]) => ({
      source,
      count: data.count,
      avgConfidence: data.count > 0 ? data.total / data.count : 0,
      isSourceDefault: data.isSourceDefault,
    }));

    const primarySource = activeEvidence[0].primarySource;
    const sourceDefaultConfidence = this.SOURCE_WEIGHTS[primarySource] ?? 0.5;
    const isSourceDefault = activeEvidence.every(e => Math.abs(e.confidence - sourceDefaultConfidence) < 0.01);

    let description = '';
    if (isSourceDefault) {
      description = `All evidence comes from ${primarySource}, which uses a default confidence value of ${Math.round(sourceDefaultConfidence * 100)}%. This reflects the reliability of the source type, not the quality of individual evidence items.`;
    } else {
      description = `Confidence values vary across evidence items. This indicates that some evidence was assigned custom confidence values rather than using source defaults.`;
    }

    return {
      overallConfidence,
      isSourceDefault,
      source: primarySource,
      sourceDefaultConfidence,
      description,
      perSourceBreakdown,
    };
  }

  private getAcquisitionDate(evidence: ISkillEvidence): Date | null {
    if (evidence.primarySource === SkillSource.GITHUB) {
      const repoDate = evidence.firstCommitDate || (evidence.payload as any)?.firstCommitDate;
      if (repoDate) {
        const d = new Date(repoDate);
        if (!isNaN(d.getTime())) return d;
      }
    }

    const effectiveFrom = new Date(evidence.effectiveFrom);
    if (!isNaN(effectiveFrom.getTime())) return effectiveFrom;

    return null;
  }

  async rebuildSkillRecord(organizationId: string, personId: string, skillId: string): Promise<ISkillRecord> {
    const evidence = await this.getEvidenceForProjectionKey(organizationId, personId, skillId);
    const projection = this.computeProficiency(evidence);

    const existing = await this.repo.findBySkill(personId, skillId, organizationId);

    const projectionSkillName = evidence[0]?.payload?.canonicalName || evidence[0]?.skillName || skillId;

    const projectionData: Partial<ISkillRecord> = {
      organizationId: toObjectId(organizationId),
      personId: toObjectId(personId),
      skillId,
      skillName: projectionSkillName,
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

    logger.info('SkillRecord projection rebuilt', {
      organizationId,
      personId,
      skillId,
      proficiencyScore: projection.score,
      evidenceCount: projection.evidenceCount,
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

    const useOntology = process.env.USE_ONTOLOGY_RESOLUTION === 'true';
    const skillGroups = new Map<string, ISkillEvidence[]>();

    for (const e of evidence) {
      const key = useOntology ? (e.payload?.canonicalId || e.skillId) : e.skillId;
      if (!skillGroups.has(key)) {
        skillGroups.set(key, []);
      }
      skillGroups.get(key)!.push(e);
    }

    const sortedKeys = Array.from(skillGroups.keys()).sort();

    for (const skillId of sortedKeys) {
      await this.rebuildSkillRecord(organizationId, personId, skillId);
    }

    logger.info('All SkillRecord projections rebuilt', {
      organizationId,
      personId,
      skillsRebuilt: sortedKeys.length,
    });

    void eventBus.publish(UaipEvent.SkillProfileRebuilt, {
      processingId: `skill-profile-${personId}-${Date.now()}`,
      organizationId,
      personId,
      occurredAt: new Date(),
      source: 'skills_tracker',
      skillsRebuilt: sortedKeys.length,
    });
  }

  private async getEvidenceForProjectionKey(
    organizationId: string,
    personId: string,
    projectionKey: string
  ): Promise<ISkillEvidence[]> {
    const useOntology = process.env.USE_ONTOLOGY_RESOLUTION === 'true';

    if (useOntology) {
      const canonicalEvidence = await this.evidenceRepo.findActiveByPersonAndCanonical(
        personId,
        projectionKey,
        organizationId
      );
      if (canonicalEvidence.length > 0) {
        return canonicalEvidence;
      }
    }

    return this.evidenceRepo.findActiveByPersonAndSkill(personId, projectionKey, organizationId);
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
