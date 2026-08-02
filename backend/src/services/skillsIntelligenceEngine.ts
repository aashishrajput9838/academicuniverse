import {
  SkillCategory,
  ProficiencyLevel,
  SkillVerificationStatus,
  SkillSource,
} from '../shared/enums/skills.enum';
import { NormalizedEvidencePayload, SOURCE_RELIABILITY_WEIGHTS } from './evidenceNormalizationLayer';

export interface ScoreBreakdown {
  volume: number;
  recency: number;
  ownership: number;
  complexity: number;
  dominance: number;
}

export interface DynamicTimelineEntry {
  year: number;
  evidenceCount: number;
  proficiencyScore: number;
}

export interface CalculatedSkillIntelligence {
  skillId: string;
  skillName: string;
  category: SkillCategory;
  scoringModelVersion: string;
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  confidenceScore: number; // 0.0 to 1.0
  verificationStatus: SkillVerificationStatus;
  scoreBreakdown: ScoreBreakdown;
  recruiterExplanation: string;
  evidenceCount: number;
  evidenceSources: SkillSource[];
  timelineData: DynamicTimelineEntry[];
  firstSeenAt: Date;
  lastVerifiedAt: Date;
}

export class SkillsIntelligenceEngine {
  public readonly scoringModelVersion = 'SIE-1.0';

  /**
   * Calculates explainable, scientific skill metrics from immutable normalized evidence
   */
  public evaluateSkill(
    skillId: string,
    skillName: string,
    category: SkillCategory,
    evidenceItems: NormalizedEvidencePayload[]
  ): CalculatedSkillIntelligence {
    if (!evidenceItems || evidenceItems.length === 0) {
      const now = new Date();
      return {
        skillId,
        skillName,
        category,
        scoringModelVersion: this.scoringModelVersion,
        proficiencyLevel: ProficiencyLevel.BEGINNER,
        proficiencyScore: 10,
        confidenceScore: 0.2,
        verificationStatus: SkillVerificationStatus.PENDING_EVIDENCE,
        scoreBreakdown: { volume: 10, recency: 0, ownership: 0, complexity: 1.0, dominance: 0.5 },
        recruiterExplanation: `Basic foundational knowledge recorded with minimal verified evidence.`,
        evidenceCount: 0,
        evidenceSources: [],
        timelineData: [{ year: now.getFullYear(), evidenceCount: 0, proficiencyScore: 10 }],
        firstSeenAt: now,
        lastVerifiedAt: now,
      };
    }

    const now = new Date();
    const sortedEvidence = [...evidenceItems].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const firstSeenAt = new Date(sortedEvidence[0].timestamp);
    const lastVerifiedAt = new Date(sortedEvidence[sortedEvidence.length - 1].timestamp);

    // 1. Calculate Score Components
    let totalVolumeScore = 0;
    let totalRecencyWeight = 0;
    let ownedCount = 0;
    let totalDominanceSum = 0;
    const sourcesSet = new Set<SkillSource>();

    for (const item of evidenceItems) {
      sourcesSet.add(item.source);
      if (item.isOwned) ownedCount++;

      // Recency Decay: e^(-lambda * months)
      const monthsOld = Math.max(
        0,
        (now.getTime() - new Date(item.timestamp).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      const recencyWeight = Math.exp(-0.05 * monthsOld); // Half life ~14 months
      totalRecencyWeight += recencyWeight;

      // Volume Score Contribution
      const volumeContribution = Math.min(25, Math.log10(item.volumeMetric + 1) * 8);
      totalVolumeScore += volumeContribution * recencyWeight;
      totalDominanceSum += item.languageDominanceRatio;
    }

    const n = evidenceItems.length;
    const ownershipRatio = ownedCount / n;
    const avgDominance = totalDominanceSum / n;
    const avgRecency = totalRecencyWeight / n;

    // Project Complexity Multiplier (1.0 to 1.4)
    const complexityFactor = Math.min(1.4, 1.0 + Math.min(n, 10) * 0.04);

    // Raw Proficiency Score (Scale: 1 to 100)
    const baseProficiency = Math.min(
      98,
      (totalVolumeScore * (0.6 + 0.4 * ownershipRatio) * avgDominance * complexityFactor) / Math.max(1, Math.sqrt(n)) +
        n * 3
    );
    const proficiencyScore = Math.max(15, Math.min(99, Math.round(baseProficiency)));

    // 2. Proficiency Level Mapping
    let proficiencyLevel = ProficiencyLevel.BEGINNER;
    if (proficiencyScore >= 85) proficiencyLevel = ProficiencyLevel.EXPERT;
    else if (proficiencyScore >= 70) proficiencyLevel = ProficiencyLevel.ADVANCED;
    else if (proficiencyScore >= 45) proficiencyLevel = ProficiencyLevel.INTERMEDIATE;

    // 3. Mathematical Confidence Score (Independent of Proficiency)
    // C = Evidence Volume (35%) + Source Reliability (35%) + Freshness (20%) + Consistency (10%)
    const maxReliabilityWeight = Math.max(
      ...Array.from(sourcesSet).map((s) => SOURCE_RELIABILITY_WEIGHTS[s] || 0.5)
    );

    const volumeConfidence = Math.min(0.35, Math.log10(n + 1) * 0.25);
    const reliabilityConfidence = maxReliabilityWeight * 0.35;
    const freshnessConfidence = avgRecency * 0.20;
    const multiSourceBonus = sourcesSet.size > 1 ? 0.10 : 0.05;

    const confidenceScore = Math.min(
      0.99,
      Math.max(0.15, parseFloat((volumeConfidence + reliabilityConfidence + freshnessConfidence + multiSourceBonus).toFixed(2)))
    );

    // 4. Verification Status Determination
    let verificationStatus = SkillVerificationStatus.PENDING_EVIDENCE;
    if (confidenceScore >= 0.85 && maxReliabilityWeight >= 0.90) {
      verificationStatus = SkillVerificationStatus.VERIFIED;
    } else if (confidenceScore >= 0.75) {
      verificationStatus = SkillVerificationStatus.HIGH_CONFIDENCE;
    } else if (confidenceScore >= 0.50) {
      verificationStatus = SkillVerificationStatus.MEDIUM_CONFIDENCE;
    } else {
      verificationStatus = SkillVerificationStatus.LOW_CONFIDENCE;
    }

    // 5. Score Breakdown Storage
    const scoreBreakdown: ScoreBreakdown = {
      volume: Math.round(totalVolumeScore),
      recency: parseFloat(avgRecency.toFixed(2)),
      ownership: parseFloat(ownershipRatio.toFixed(2)),
      complexity: parseFloat(complexityFactor.toFixed(2)),
      dominance: parseFloat(avgDominance.toFixed(2)),
    };

    // 6. Dynamic Timeline Generation (Spans from earliest evidence year to current year)
    const timelineData = this.generateDynamicTimeline(sortedEvidence, proficiencyScore);

    // 7. Recruiter Explanation Synthesis
    const monthsActive = Math.max(
      1,
      Math.round((now.getTime() - firstSeenAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    );
    const recruiterExplanation = `${proficiencyLevel.charAt(0) + proficiencyLevel.slice(1).toLowerCase()} proficiency (${proficiencyScore}%) supported by ${n} verified evidence artifact${
      n === 1 ? '' : 's'
    } across ${Array.from(sourcesSet).join(', ')} over ${monthsActive} month${
      monthsActive === 1 ? '' : 's'
    } of active usage (Confidence: ${Math.round(confidenceScore * 100)}%).`;

    return {
      skillId,
      skillName,
      category,
      scoringModelVersion: this.scoringModelVersion,
      proficiencyLevel,
      proficiencyScore,
      confidenceScore,
      verificationStatus,
      scoreBreakdown,
      recruiterExplanation,
      evidenceCount: n,
      evidenceSources: Array.from(sourcesSet),
      timelineData,
      firstSeenAt,
      lastVerifiedAt,
    };
  }

  /**
   * Generates dynamic year-by-year evolution timeline spanning from earliest evidence to current year
   */
  private generateDynamicTimeline(
    sortedEvidence: NormalizedEvidencePayload[],
    finalScore: number
  ): DynamicTimelineEntry[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = sortedEvidence.length > 0 ? new Date(sortedEvidence[0].timestamp).getFullYear() : currentYear;

    const yearlyCounts: Record<number, number> = {};
    for (let yr = startYear; yr <= currentYear; yr++) {
      yearlyCounts[yr] = 0;
    }

    for (const item of sortedEvidence) {
      const yr = new Date(item.timestamp).getFullYear();
      if (yearlyCounts[yr] !== undefined) {
        yearlyCounts[yr]++;
      }
    }

    const timeline: DynamicTimelineEntry[] = [];
    const years = Object.keys(yearlyCounts).map(Number).sort((a, b) => a - b);
    let accumulatedEvidence = 0;

    for (const yr of years) {
      accumulatedEvidence += yearlyCounts[yr];
      const progressRatio = accumulatedEvidence / Math.max(1, sortedEvidence.length);
      const yearlyProficiency = Math.max(15, Math.round(finalScore * (0.3 + 0.7 * progressRatio)));

      timeline.push({
        year: yr,
        evidenceCount: yearlyCounts[yr],
        proficiencyScore: yearlyProficiency,
      });
    }

    return timeline;
  }
}

export default new SkillsIntelligenceEngine();
