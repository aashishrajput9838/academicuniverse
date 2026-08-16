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
    const usedActualIndices = new Set<number>();

    // Helper to normalize course code for indexing
    const getCodeKey = (obj: any): string => {
      const raw = obj?.code || obj?.subjectCode || obj?.courseCode || '';
      return String(raw).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // Index actual subjects by normalized course code
    const actualByCodeMap = new Map<string, { item: any; index: number }[]>();
    for (let idx = 0; idx < act.length; idx++) {
      const key = getCodeKey(act[idx]);
      if (key) {
        if (!actualByCodeMap.has(key)) actualByCodeMap.set(key, []);
        actualByCodeMap.get(key)!.push({ item: act[idx], index: idx });
      }
    }

    for (let i = 0; i < Math.max(exp.length, act.length); i++) {
      const expSub = exp[i] || {};
      let actSub: any = {};
      let matchedActualIdx = -1;

      // 1. Direct index check first
      if (i < act.length && !usedActualIndices.has(i)) {
        const directKey = getCodeKey(act[i]);
        const expKey = getCodeKey(expSub);
        if (expKey && directKey && expKey === directKey) {
          actSub = act[i];
          matchedActualIdx = i;
        }
      }

      // 2. Course-code keyed lookup fallback if direct index does not match
      if (matchedActualIdx === -1 && expSub) {
        const expKey = getCodeKey(expSub);
        if (expKey && actualByCodeMap.has(expKey)) {
          const candidates = actualByCodeMap.get(expKey)!;
          const candidate = candidates.find(c => !usedActualIndices.has(c.index));
          if (candidate) {
            actSub = candidate.item;
            matchedActualIdx = candidate.index;
          }
        }
      }

      // 3. Positional fallback if no code match found
      if (matchedActualIdx === -1 && i < act.length && !usedActualIndices.has(i)) {
        actSub = act[i];
        matchedActualIdx = i;
      }

      if (matchedActualIdx !== -1) {
        usedActualIndices.add(matchedActualIdx);
      }

      const codeMatch = ExactMatchComparator.compareField(`subject[${i}].code`, expSub.code, actSub.code || actSub.subjectCode || actSub.courseCode);
      const gradeMatch = ExactMatchComparator.compareField(`subject[${i}].grade`, expSub.grade, actSub.grade);
      const creditsMatch = ExactMatchComparator.compareField(`subject[${i}].credits`, expSub.credits, actSub.credits);

      details.push(codeMatch, gradeMatch, creditsMatch);

      if (codeMatch.matched && gradeMatch.matched) {
        matchedCount++;
      }
    }

    const precision = act.length > 0 ? Math.min(1.0, matchedCount / act.length) : 0.0;
    const recall = exp.length > 0 ? Math.min(1.0, matchedCount / exp.length) : 0.0;
    const f1Score = precision + recall > 0 ? Math.min(1.0, (2 * precision * recall) / (precision + recall)) : 0.0;

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
