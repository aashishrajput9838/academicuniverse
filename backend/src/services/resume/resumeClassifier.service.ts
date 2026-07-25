import { DocumentCategory } from '../classification/DocumentClassifier';
import { createResumeLogger, logStageEntry, logStageExit, scrubPII } from '../../utils/structuredLogging';

export interface ResumeClassificationOutput {
  documentCategory: DocumentCategory;
  confidenceScore: number;
  signals: {
    filenameMatch: boolean;
    mimeMatch: boolean;
    contentHeuristic: boolean;
  };
  reason: string;
}

const logger = createResumeLogger('ResumeClassifier');

export class ResumeClassifier {
  /**
   * Stateless resume classification.
   *
   * Input: raw text, filename, MIME type
   * Output: classification decision with confidence and signals
   *
   * No DB writes, no event publishing, no queue interaction.
   */
  classify(params: {
     rawText: string;
     fileName: string;
     mimeType: string;
   }): ResumeClassificationOutput {
      const { rawText, fileName, mimeType } = params;
      logStageEntry(logger, 'classification', { stage: 'classification' });

    // Signal 1: Filename pattern (weight 0.6)
    const filenameMatch = /resume|cv|curriculum.vitae|biodata/i.test(fileName);

    // Signal 2: MIME type (weight 0.3)
    const resumeMimes = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    const mimeMatch = resumeMimes.has(mimeType);

    // Signal 3: Content heuristic (weight 0.1)
    const contentHeuristic = this.checkResumeContent(rawText);

    // Weighted confidence calculation
    const confidence =
      (filenameMatch ? 0.6 : 0.0) +
      (mimeMatch ? 0.3 : 0.0) +
      (contentHeuristic ? 0.1 : 0.0);

    const documentCategory: DocumentCategory = confidence >= 0.5 ? 'RESUME' : 'UNKNOWN';

    let reason: string;
    if (documentCategory === 'RESUME') {
      const signals = [];
      if (filenameMatch) signals.push('filename');
      if (mimeMatch) signals.push('MIME');
      if (contentHeuristic) signals.push('content');
      reason = `Classified as RESUME based on: ${signals.join(', ')}`;
    } else {
      reason = `Confidence ${confidence.toFixed(2)} below 0.5 threshold; classified as UNKNOWN for Stage 2 AI recovery`;
    }

    logStageExit(logger, 'classification', { stage: 'classification' });

    return {
      documentCategory,
      confidenceScore: confidence,
      signals: {
        filenameMatch,
        mimeMatch,
        contentHeuristic,
      },
      reason,
    };
  }

  /**
   * Check if raw text contains resume-like section headings.
   */
  private checkResumeContent(rawText: string): boolean {
    if (!rawText || rawText.trim().length === 0) return false;

    const sectionPatterns = [
      /education/i,
      /experience/i,
      /skills/i,
      /employment/i,
      /work history/i,
      /certifications?/i,
      /projects?/i,
      /profile/i,
      /objective/i,
      /summary/i,
    ];

    const matchCount = sectionPatterns.filter((pattern) => pattern.test(rawText)).length;
    return matchCount >= 2;
  }
}

export const resumeClassifier = new ResumeClassifier();
