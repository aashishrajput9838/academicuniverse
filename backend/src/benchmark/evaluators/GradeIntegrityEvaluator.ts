/**
 * GradeIntegrityEvaluator.ts
 *
 * Evaluates subject grade point formula integrity and grade string extraction precision.
 */

import type { SubjectItemGT, FieldComparisonDetail } from '../types/benchmark.types';

export class GradeIntegrityEvaluator {
  public static evaluateGradeIntegrity(
    expectedSubjects: SubjectItemGT[],
    actualSubjects: any[]
  ): { totalGrades: number; correctGrades: number; gradePointDiscrepancies: FieldComparisonDetail[] } {
    let totalGrades = 0;
    let correctGrades = 0;
    const discrepancies: FieldComparisonDetail[] = [];

    const exp = expectedSubjects || [];
    const act = actualSubjects || [];

    for (let i = 0; i < Math.max(exp.length, act.length); i++) {
      const expSub = exp[i] || {};
      const actSub = act[i] || {};

      if (expSub.grade) {
        totalGrades++;
        const matched = String(expSub.grade).trim().toUpperCase() === String(actSub.grade || '').trim().toUpperCase();
        if (matched) correctGrades++;

        discrepancies.push({
          field: `subject[${i}].grade`,
          expected: expSub.grade,
          actual: actSub.grade,
          matched,
          cer: matched ? 0.0 : 1.0,
          wer: matched ? 0.0 : 1.0,
        });
      }
    }

    return {
      totalGrades,
      correctGrades,
      gradePointDiscrepancies: discrepancies,
    };
  }
}
