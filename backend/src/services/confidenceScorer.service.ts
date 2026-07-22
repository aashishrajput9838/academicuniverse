import { DetectedSection, ExtractedEntity, ExtractionIssue, Milestone2Result } from './milestone2.types';

export class ConfidenceScorerService {
  private readonly ENTITY_PRECISION_THRESHOLD = 0.5;

  score(result: Milestone2Result): number {
    const sectionScore = this.scoreSections(result.sections, result.extractionIssues);
    const entityScore = this.scoreEntities(result.entities, result.extractionIssues);
    const formattingScore = this.scoreFormatting(result.formattingMetadata);
    const completenessScore = this.scoreCompleteness(result);
    const consistencyScore = this.scoreConsistency(result);

    let confidence =
      sectionScore * 0.30 +
      entityScore * 0.25 +
      formattingScore * 0.20 +
      completenessScore * 0.15 +
      consistencyScore * 0.10;

    const hasError = result.extractionIssues.some(issue => issue.severity === 'error');
    if (hasError) {
      confidence = Math.max(0.5, confidence);
    }

    const finalConfidence = Math.round(Math.min(1.0, confidence) * 1000) / 1000;

    if (finalConfidence < 0.4) {
      result.extractionIssues.push({
        severity: 'warning',
        message: 'Low extraction confidence; manual review recommended.',
      });
    }

    return finalConfidence;
  }

  private scoreSections(sections: DetectedSection[], issues: ExtractionIssue[]): number {
    let score = 0;

    if (sections.length > 0 && sections.every(s => s.title && s.order >= 0)) {
      score += 0.5;
    }

    const hasContent = sections.some(s => s.fields.length > 0);
    if (hasContent) {
      score += 0.2;
    }

    const hasAiIssues = issues.some(i => i.message.toLowerCase().includes('ai') && i.severity === 'error');
    if (!hasAiIssues) {
      score += 0.2;
    }

    const titles = sections.map(s => s.title.toLowerCase());
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size === titles.length) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private scoreEntities(entities: ExtractedEntity[], issues: ExtractionIssue[]): number {
    let score = 0;

    if (entities.length > 0) {
      score += 0.4;
    }

    if (entities.length > 0) {
      const avgConfidence = entities.reduce((a, b) => a + b.confidence, 0) / entities.length;
      if (avgConfidence > 0.7) {
        score += 0.3;
      }
    }

    const hasEmpty = entities.some(e => !e.value || e.value.trim().length === 0);
    if (!hasEmpty) {
      score += 0.2;
    }

    const values = entities.map(e => e.value.toLowerCase().trim());
    const uniqueValues = new Set(values);
    if (uniqueValues.size === values.length) {
      score += 0.1;
    } else {
      issues.push({
        severity: 'warning',
        message: 'Duplicate entities detected; some entities may overlap.',
      });
      score = Math.max(0, score - 0.15);
    }

    const precision = this.estimateEntityPrecision(entities);
    if (precision < this.ENTITY_PRECISION_THRESHOLD) {
      issues.push({
        severity: 'warning',
        message: `Entity precision below threshold: ${(precision * 100).toFixed(0)}% < ${(this.ENTITY_PRECISION_THRESHOLD * 100).toFixed(0)}%`,
      });
      score = Math.max(0, score - 0.2);
    }

    const hasName = entities.some(e => e.type === 'name');
    if (!hasName) {
      issues.push({
        severity: 'warning',
        message: 'Expected resume name entity is missing.',
      });
      score = Math.max(0, score - 0.25);
    }

    return Math.min(1.0, score);
  }

  private estimateEntityPrecision(entities: ExtractedEntity[]): number {
    if (entities.length === 0) return 1.0;

    const highConfidenceCount = entities.filter(e => e.confidence >= 0.8).length;
    return highConfidenceCount / entities.length;
  }

  private scoreFormatting(metadata: Milestone2Result['formattingMetadata']): number {
    let score = 0;

    const styles = metadata.styles || {};
    if (Object.keys(styles).length > 0) {
      score += 0.3;
    }

    const headingLevels = metadata.headingLevels || {};
    if (Object.keys(headingLevels).length >= 2) {
      score += 0.3;
    }

    if (metadata.bulletMarker && metadata.bulletMarker.length > 0) {
      score += 0.2;
    }

    if (metadata.dateFormat && metadata.dateFormat !== 'unknown') {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  private scoreCompleteness(result: Milestone2Result): number {
    let score = 0;

    if (result.sections.length > 0) {
      score += 0.5;
    }
    
    const hasFormatting = Object.keys(result.formattingMetadata.styles || {}).length > 0;
    if (hasFormatting) {
      score += 0.3;
    }

    score += 0.2;

    return Math.min(1.0, score);
  }

  private scoreConsistency(result: Milestone2Result): number {
    let score = 0;

    const titles = result.sections.map(s => s.title.toLowerCase());
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size === titles.length) {
      score += 0.4;
    }

    score += 0.3;

    const hasError = result.extractionIssues.some(i => i.severity === 'error');
    if (!hasError) {
      score += 0.3;
    }

    return Math.min(1.0, score);
  }
}
