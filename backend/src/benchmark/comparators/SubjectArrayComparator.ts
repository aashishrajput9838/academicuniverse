/**
 * SubjectArrayComparator.ts
 *
 * Compares ground truth mark sheet subject rows against prediction subjects array.
 */

import { ExactMatchComparator } from './ExactMatchComparator';
import type { SubjectItemGT, FieldComparisonDetail } from '../types/benchmark.types';

export interface SubjectArrayMatchResult {
  totalExpectedSubjects: number;
  totalActualSubjects: number;
  matchedSubjectsCount: number;
  precision: number;
  recall: number;
  f1Score: number;
  details: FieldComparisonDetail[];
}

export class SubjectArrayComparator {
  /**
   * Evaluates array of subject records.
   */
  public static compareSubjects(
    expectedSubjects: SubjectItemGT[],
    actualSubjects: any[]
  ): SubjectArrayMatchResult {
    const exp = Array.isArray(expectedSubjects) ? expectedSubjects : [];
    const act = Array.isArray(actualSubjects) ? actualSubjects : [];

    if (exp.length === 0 && act.length === 0) {
      return {
        totalExpectedSubjects: 0,
        totalActualSubjects: 0,
        matchedSubjectsCount: 0,
        precision: 1.0,
        recall: 1.0,
        f1Score: 1.0,
        details: [],
      };
    }

    let matchedCount = 0;
    const details: FieldComparisonDetail[] = [];

    for (let i = 0; i < Math.max(exp.length, act.length); i++) {
      const expSub = exp[i] || {};
      const actSub = act[i] || {};

      const codeMatch = ExactMatchComparator.compareField(`subject[${i}].code`, expSub.code, actSub.code || actSub.subjectCode);
      const gradeMatch = ExactMatchComparator.compareField(`subject[${i}].grade`, expSub.grade, actSub.grade);
      const creditsMatch = ExactMatchComparator.compareField(`subject[${i}].credits`, expSub.credits, actSub.credits);

      details.push(codeMatch, gradeMatch, creditsMatch);

      if (codeMatch.matched && gradeMatch.matched) {
        matchedCount++;
      }
    }

    const precision = act.length > 0 ? matchedCount / act.length : 0.0;
    const recall = exp.length > 0 ? matchedCount / exp.length : 0.0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;

    return {
      totalExpectedSubjects: exp.length,
      totalActualSubjects: act.length,
      matchedSubjectsCount: matchedCount,
      precision,
      recall,
      f1Score,
      details,
    };
  }
}
