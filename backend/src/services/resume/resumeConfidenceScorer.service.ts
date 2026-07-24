import { Logger } from '../../utils/logger';

const logger = new Logger('ResumeConfidenceScorer');

export interface ConfidenceScorerOutput {
  confidenceScore: number;
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  strategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  aiFallbackUsed: boolean;
  confidenceSummary: {
    sectionScore: number;
    entityScore: number;
    formatScore: number;
    aiAgreementScore: number;
    consistencyScore: number;
    rawScore: number;
    penaltyCap: number;
    finalScore: number;
  };
  improvements: {
    fieldsNormalized: number;
    fieldsCorrected: number;
  };
}

const REQUIRED_SECTIONS = ['HEADER', 'EXPERIENCE', 'EDUCATION', 'SKILLS'];
const REQUIRED_ENTITIES: Record<string, string[]> = {
  HEADER: ['name', 'email'],
  EXPERIENCE: ['title', 'company'],
  EDUCATION: ['degree', 'institution'],
  SKILLS: ['name'],
};

export class ResumeConfidenceScorer {
  async score(params: {
    processingId: string;
    rawCandidateFields: Record<string, any>;
    sectionDetectionStrategy: string;
    entityExtractionStrategy: string;
    aiProviderUsed: string;
    failedOver: boolean;
    extractionIssues: Array<{
      severity: string;
      code: string;
      message: string;
      section?: string;
    }>;
  }): Promise<ConfidenceScorerOutput> {
    const { rawCandidateFields, sectionDetectionStrategy, entityExtractionStrategy, aiProviderUsed, failedOver, extractionIssues } = params;

    if (rawCandidateFields.confidenceScore !== undefined && rawCandidateFields.confidenceScore > 0) {
      return {
        confidenceScore: rawCandidateFields.confidenceScore,
        reviewStatus: rawCandidateFields.reviewStatus || 'PENDING_REVIEW',
        strategy: rawCandidateFields.confidenceStrategy || 'heuristic',
        aiFallbackUsed: failedOver,
        confidenceSummary: rawCandidateFields.confidenceSummary || {
          sectionScore: 0,
          entityScore: 0,
          formatScore: 0,
          aiAgreementScore: 0,
          consistencyScore: 0,
          rawScore: 0,
          penaltyCap: 1.0,
          finalScore: rawCandidateFields.confidenceScore || 0,
        },
        improvements: { fieldsNormalized: 0, fieldsCorrected: 0 },
      };
    }

    const sections = Array.isArray(rawCandidateFields.sections) ? rawCandidateFields.sections : [];
    const entities = Array.isArray(rawCandidateFields.entities) ? rawCandidateFields.entities : [];

    const sectionScore = this.calculateSectionScore(sections);
    const entityScore = this.calculateEntityScore(sections, entities, rawCandidateFields);
    const formatScore = this.calculateFormatScore(entities);
    const aiAgreementScore = this.calculateAiAgreementScore(entityScore, entityExtractionStrategy, rawCandidateFields, sections, entities);
    const consistencyScore = this.calculateConsistencyScore(entities, sections);

    const rawScore =
      sectionScore * 0.3 +
      entityScore * 0.25 +
      formatScore * 0.2 +
      aiAgreementScore * 0.15 +
      consistencyScore * 0.1;

    const hasError = extractionIssues.some((issue) => issue.severity === 'error');
    const failedOverCap = failedOver ? 0.85 : 1.0;
    const aiOnlyDetection = sectionDetectionStrategy === 'ai-only' ? 0.8 : 1.0;
    const missingHeader = !sections.some((s: any) => s.title === 'HEADER');
    const missingRequiredSec = REQUIRED_SECTIONS.some((required) => !sections.some((s: any) => s.title === required));

    const missingHeaderCap = missingHeader ? 0.5 : 1.0;
    const missingRequiredSecCap = missingRequiredSec ? 0.6 : 1.0;

    const penaltyCaps = [hasError ? 0.5 : 1.0, failedOverCap, aiOnlyDetection, missingHeaderCap, missingRequiredSecCap];
    const penaltyCap = Math.min(...penaltyCaps);

    let finalScore = rawScore * penaltyCap;
    finalScore = Math.max(0.0, Math.min(1.0, finalScore));

    const reviewStatus = this.determineReviewStatus(finalScore);
    const strategy = this.determineStrategy(sectionDetectionStrategy, entityExtractionStrategy, aiProviderUsed);

    return {
      confidenceScore: finalScore,
      reviewStatus,
      strategy,
      aiFallbackUsed: failedOver,
      confidenceSummary: {
        sectionScore,
        entityScore,
        formatScore,
        aiAgreementScore,
        consistencyScore,
        rawScore,
        penaltyCap,
        finalScore,
      },
      improvements: { fieldsNormalized: 0, fieldsCorrected: 0 },
    };
  }

  private calculateSectionScore(sections: any[]): number {
    if (!sections.length) {
      return 0.0;
    }

    const titles = sections.map((s) => s.title).filter(Boolean);
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size !== titles.length) {
      logger.warn('ResumeConfidenceScorer: duplicate section titles detected', { titles });
    }

    const requiredPresent = REQUIRED_SECTIONS.filter((required) => titles.includes(required)).length;
    const presenceScore = requiredPresent / REQUIRED_SECTIONS.length;

    const expectedOrder = REQUIRED_SECTIONS;
    const actualOrder = expectedOrder.filter((expected) => titles.includes(expected));
    const correctlyOrdered = actualOrder.length === requiredPresent && actualOrder.every((val, idx) => val === REQUIRED_SECTIONS[idx]);
    const orderScore = correctlyOrdered ? 1.0 : 0.5;

    const hasBoundaryErrors = sections.some((s) => typeof s.startLine === 'number' && typeof s.endLine === 'number' && s.startLine > s.endLine);
    const boundaryScore = hasBoundaryErrors ? 0.5 : 1.0;

    return presenceScore * 0.6 + orderScore * 0.3 + boundaryScore * 0.1;
  }

  private calculateEntityScore(sections: any[], entities: any[], rawCandidateFields: Record<string, any>): number {
    if (!sections.length) {
      return 0.0;
    }

    let totalRequired = 0;
    let populatedRequired = 0;

    const sectionTitles = sections.map((s) => s.title).filter(Boolean);

    for (const sectionTitle of sectionTitles) {
      const required = REQUIRED_ENTITIES[sectionTitle];
      if (!required) {
        continue;
      }

      const sectionEntities = entities.filter((e) => e.sourceSection === sectionTitle);
      const sectionData = rawCandidateFields[sectionTitle.toLowerCase()] || rawCandidateFields[this.camelCase(sectionTitle)];

      for (const field of required) {
        totalRequired++;
        const found = sectionEntities.some((e: any) => {
          const value = e.data?.[field];
          return value !== undefined && value !== null && value !== '';
        });
        if (!found && sectionData && Array.isArray(sectionData)) {
          const dataMatch = sectionData.some((item: any) => item?.[field] !== undefined && item?.[field] !== null && item?.[field] !== '');
          if (dataMatch) {
            populatedRequired++;
            continue;
          }
        }
        if (found) {
          populatedRequired++;
        }
      }
    }

    if (totalRequired === 0) {
      return 0.0;
    }

    return populatedRequired / totalRequired;
  }

  private calculateFormatScore(entities: any[]): number {
    if (!entities.length) {
      return 0.0;
    }

    let validCount = 0;

    for (const entity of entities) {
      const data = entity.data || {};
      let valid = true;

      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        valid = false;
      }
      if (data.phone && !/^\+?[\d\s\-()]{7,20}$/.test(data.phone)) {
        valid = false;
      }
      if (data.startDate && isNaN(Date.parse(data.startDate))) {
        valid = false;
      }
      if (data.endDate && isNaN(Date.parse(data.endDate))) {
        valid = false;
      }
      if (data.linkedin && !this.isValidUrl(data.linkedin)) {
        valid = false;
      }
      if (data.github && !this.isValidUrl(data.github)) {
        valid = false;
      }

      if (valid) {
        validCount++;
      }
    }

    return validCount / entities.length;
  }

  private calculateAiAgreementScore(
    entityScore: number,
    entityExtractionStrategy: string,
    rawCandidateFields: Record<string, any>,
    sections: any[],
    entities: any[]
  ): number {
    const usedAi = entityExtractionStrategy === 'ai-only' || entityExtractionStrategy === 'regex+ner+ai' || rawCandidateFields.aiEnhanced === true;

    if (!usedAi) {
      return entityScore;
    }

    if (!entities.length) {
      return entityScore;
    }

    const heuristicEntities = entities.filter((e) => e.extractedBy === 'heuristic');
    const aiEntities = entities.filter((e) => e.extractedBy === 'ai');

    if (!heuristicEntities.length || !aiEntities.length) {
      return entityScore;
    }

    const aiMap = new Map<string, any>();
    for (const aiEntity of aiEntities) {
      const key = `${aiEntity.type}|${aiEntity.sourceSection}`;
      aiMap.set(key, aiEntity);
    }

    let agreementCount = 0;
    let comparisonCount = 0;

    for (const h of heuristicEntities) {
      const key = `${h.type}|${h.sourceSection}`;
      const a = aiMap.get(key);
      if (!a) continue;

      comparisonCount++;
      const hValues = Object.values(h.data || {}).filter((v: any) => v !== undefined && v !== null && v !== '').join('|');
      const aValues = Object.values(a.data || {}).filter((v: any) => v !== undefined && v !== null && v !== '').join('|');
      if (hValues === aValues) {
        agreementCount++;
      }
    }

    if (comparisonCount === 0) {
      return entityScore;
    }

    return agreementCount / comparisonCount;
  }

  private calculateConsistencyScore(entities: any[], sections: any[]): number {
    if (!entities.length) {
      return 0.0;
    }

    let validCount = 0;

    for (const entity of entities) {
      const data = entity.data || {};
      let consistent = true;

      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
          consistent = false;
        }
      }

      if (consistent) {
        validCount++;
      }
    }

    const dateRangeScore = entities.length > 0 ? validCount / entities.length : 0.0;

    const seen = new Set<string>();
    let duplicateCount = 0;
    for (const entity of entities) {
      const key = `${entity.type}|${entity.sourceSection}|${JSON.stringify(entity.data || {})}`;
      if (seen.has(key)) {
        duplicateCount++;
      }
      seen.add(key);
    }
    const duplicateScore = entities.length > 0 ? Math.max(0.0, 1.0 - duplicateCount / entities.length) : 1.0;

    const skillAliasConflicts = this.countSkillAliasConflicts(entities);
    const skillScore = entities.length > 0 ? Math.max(0.0, 1.0 - skillAliasConflicts / entities.length) : 1.0;

    return dateRangeScore * 0.5 + duplicateScore * 0.3 + skillScore * 0.2;
  }

  private countSkillAliasConflicts(entities: any[]): number {
    let conflicts = 0;
    const skillNames = entities
      .filter((e) => e.type === 'skill')
      .map((e) => (e.data?.name || '').toString().trim().toLowerCase())
      .filter((name) => name.length > 0);

    const canonicalMap = new Map<string, string>();
    const definedCanonical = new Set<string>(['javascript', 'typescript', 'node.js', 'python', 'react', 'vue.js', 'postgresql', 'mongodb', 'kubernetes', 'docker', 'aws', 'gcp', 'azure']);

    for (const name of skillNames) {
      const canonical = definedCanonical.has(name) ? name : name;
      const existing = canonicalMap.get(canonical);
      if (existing && existing !== name) {
        conflicts++;
      }
      canonicalMap.set(canonical, name);
    }

    return conflicts;
  }

  private determineReviewStatus(score: number): 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX' {
    if (score >= 0.85) {
      return 'AUTO_APPROVED';
    }
    if (score >= 0.6) {
      return 'PENDING_REVIEW';
    }
    return 'NEEDS_REINDEX';
  }

  private determineStrategy(sectionDetectionStrategy: string, entityExtractionStrategy: string, aiProviderUsed: string): 'heuristic' | 'heuristic+ai' | 'ai-only' {
    const sectionAi = sectionDetectionStrategy === 'heuristic+ai' || sectionDetectionStrategy === 'ai-only';
    const entityAi = entityExtractionStrategy === 'regex+ner+ai' || entityExtractionStrategy === 'ai-only';
    const usedAi = sectionAi || entityAi || aiProviderUsed !== 'none';

    if (!usedAi) {
      return 'heuristic';
    }

    const sectionAiOnly = sectionDetectionStrategy === 'ai-only';
    const entityAiOnly = entityExtractionStrategy === 'ai-only';

    if (sectionAiOnly || entityAiOnly) {
      return 'ai-only';
    }

    return 'heuristic+ai';
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url.includes('://') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  }

  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}
