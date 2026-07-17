import { IOcrQualityScorer, QualityScore } from './IOcrQualityScorer';
import { logger } from '../../../utils/logger';

export class OcrQualityScorer implements IOcrQualityScorer {
  score(text: string, engine: string, pagesProcessed: number): QualityScore {
    if (!text || text.trim().length === 0) {
      return { score: 0, isSufficient: false, reason: 'Empty OCR text' };
    }

    const trimmed = text.trim();
    const length = trimmed.length;
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    const alphanumericChars = (trimmed.match(/[a-zA-Z0-9\s]/g) || []).length;
    const alphanumericRatio = trimmed.length > 0 ? alphanumericChars / trimmed.length : 0;

    if (length < 30) {
      return { score: 0.1, isSufficient: false, reason: 'OCR text too short' };
    }

    if (wordCount < 3) {
      return { score: 0.2, isSufficient: false, reason: 'Too few words extracted' };
    }

    if (alphanumericRatio < 0.2) {
      return { score: 0.2, isSufficient: false, reason: 'Too many non-alphanumeric characters' };
    }

    const lengthScore = Math.min(0.5, (length / 1000) * 0.5);
    const qualityScore = alphanumericRatio * 0.5;
    const totalScore = Math.min(1.0, lengthScore + qualityScore);

    const isSufficient = totalScore > 0.3 && wordCount >= 5;
    
    if (!isSufficient) {
      logger.warn(`OcrQualityScorer: Low quality OCR from ${engine} - score: ${totalScore.toFixed(2)}, reason: Low quality OCR (score: ${totalScore.toFixed(2)})`);
    }
    
    return { 
      score: totalScore, 
      isSufficient,
      reason: isSufficient ? undefined : `Low quality OCR (score: ${totalScore.toFixed(2)})`
    };
  }
}
