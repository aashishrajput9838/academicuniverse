/**
 * Academic Universe — Field Comparison Engine
 * Performs intelligent comparison between extracted predictions and ground truth.
 * Supports exact match, case-insensitive, numeric tolerance, date normalization,
 * whitespace normalization, and configurable courseMarks comparison modes.
 */

import { FieldMatchResult, ExtractedCourseMark, CourseMarksComparisonMode } from '../types/benchmark.types';
export { CourseMarksComparisonMode };

export interface ComparisonOptions {
  numericTolerancePct: number;
  caseInsensitive: boolean;
  normalizeWhitespace: boolean;
  normalizeDates: boolean;
  courseMarksMode: CourseMarksComparisonMode;
}

const DEFAULT_OPTIONS: ComparisonOptions = {
  numericTolerancePct: 0.01,
  caseInsensitive: true,
  normalizeWhitespace: true,
  normalizeDates: true,
  courseMarksMode: CourseMarksComparisonMode.PER_ARRAY,
};

export class FieldComparisonEngine {
  private options: ComparisonOptions;

  constructor(options: Partial<ComparisonOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Compare a single scalar field value.
   */
  compareField(fieldName: string, expected: unknown, actual: unknown): FieldMatchResult {
    if (this.isNullish(expected) && this.isNullish(actual)) {
      return { fieldName, expected, actual, isMatch: true, matchScore: 1.0 };
    }
    if (this.isNullish(expected) !== this.isNullish(actual)) {
      const reason = this.isNullish(expected)
        ? 'Extracted a field that is not in ground truth (false positive)'
        : 'Missed a field present in ground truth (false negative)';
      return { fieldName, expected, actual, isMatch: false, matchScore: 0.0, reason };
    }

    if (typeof expected === 'number' && typeof actual === 'number') {
      return this.compareNumeric(fieldName, expected, actual);
    }

    if (typeof expected === 'string' && typeof actual === 'string') {
      return this.compareString(fieldName, expected, actual);
    }

    const isMatch = expected === actual;
    return {
      fieldName, expected, actual, isMatch,
      matchScore: isMatch ? 1.0 : 0.0,
      reason: isMatch ? undefined : 'Type or value mismatch',
    };
  }

  /**
   * Compare course marks arrays.
   * Mode determines whether the array is treated as a single field or per-course.
   */
  compareCourseMarks(
    expected: ExtractedCourseMark[],
    actual: ExtractedCourseMark[]
  ): FieldMatchResult[] {
    if (this.options.courseMarksMode === CourseMarksComparisonMode.PER_ARRAY) {
      return this.compareCourseMarksAsSingleField(expected, actual);
    }
    return this.compareCourseMarksPerCourse(expected, actual);
  }

  /**
   * Compare course marks as a single atomic field.
   * isMatch = true only if ALL courses match exactly.
   */
  private compareCourseMarksAsSingleField(
    expected: ExtractedCourseMark[] = [],
    actual: ExtractedCourseMark[] = []
  ): FieldMatchResult[] {
    const expList = expected || [];
    const actList = actual || [];

    const expMap = new Map<string, ExtractedCourseMark>();
    for (const cm of expList) {
      expMap.set(this.normalizeStr(cm.courseCode), cm);
    }

    const matchedKeys = new Set<string>();
    let allMatch = true;
    const mismatchDetails: string[] = [];

    for (const act of actList) {
      const key = this.normalizeStr(act.courseCode);
      const exp = expMap.get(key);
      if (!exp) {
        allMatch = false;
        mismatchDetails.push(`Unexpected course: ${act.courseCode}`);
        continue;
      }
      matchedKeys.add(key);

      const marksMatch = this.withinTolerance(exp.marksObtained, act.marksObtained);
      const maxMatch = this.withinTolerance(exp.maxMarks, act.maxMarks);
      const nameMatch = this.normalizeStr(exp.courseName) === this.normalizeStr(act.courseName);

      if (!marksMatch || !maxMatch || !nameMatch) {
        allMatch = false;
        const parts: string[] = [];
        if (!marksMatch) parts.push(`marks: ${exp.marksObtained} vs ${act.marksObtained}`);
        if (!maxMatch) parts.push(`max: ${exp.maxMarks} vs ${act.maxMarks}`);
        if (!nameMatch) parts.push(`name: "${exp.courseName}" vs "${act.courseName}"`);
        mismatchDetails.push(`${act.courseCode}: ${parts.join('; ')}`);
      }
    }

    // Check for missing courses
    for (const [key, exp] of expMap) {
      if (!matchedKeys.has(key)) {
        allMatch = false;
        mismatchDetails.push(`Missing course: ${exp.courseCode}`);
      }
    }

    return [
      {
        fieldName: 'courseMarks',
        expected,
        actual,
        isMatch: allMatch,
        matchScore: allMatch ? 1.0 : 0.0,
        reason: allMatch ? undefined : `Array mismatch: ${mismatchDetails.join('; ')}`,
      },
    ];
  }

  /**
   * Compare course marks per individual course (legacy behavior).
   */
  private compareCourseMarksPerCourse(
    expected: ExtractedCourseMark[],
    actual: ExtractedCourseMark[]
  ): FieldMatchResult[] {
    const results: FieldMatchResult[] = [];
    const expectedMap = new Map<string, ExtractedCourseMark>();
    for (const cm of expected) {
      expectedMap.set(this.normalizeStr(cm.courseCode), cm);
    }
    const matchedKeys = new Set<string>();

    for (const act of actual) {
      const key = this.normalizeStr(act.courseCode);
      const exp = expectedMap.get(key);
      if (!exp) {
        results.push({
          fieldName: `courseMarks.${act.courseCode}`,
          expected: null,
          actual: act,
          isMatch: false,
          matchScore: 0.0,
          reason: `Extracted course "${act.courseCode}" not present in ground truth`,
        });
        continue;
      }
      matchedKeys.add(key);

      const marksMatch = this.withinTolerance(exp.marksObtained, act.marksObtained);
      const maxMatch = this.withinTolerance(exp.maxMarks, act.maxMarks);
      const nameMatch = this.normalizeStr(exp.courseName) === this.normalizeStr(act.courseName);
      const allMatch = marksMatch && maxMatch;
      const score = [marksMatch, maxMatch, nameMatch].filter(Boolean).length / 3;

      results.push({
        fieldName: `courseMarks.${act.courseCode}`,
        expected: exp,
        actual: act,
        isMatch: allMatch,
        matchScore: score,
        reason: allMatch ? undefined : this.buildMismatchReason(exp, act),
      });
    }

    for (const [key, exp] of expectedMap) {
      if (!matchedKeys.has(key)) {
        results.push({
          fieldName: `courseMarks.${exp.courseCode}`,
          expected: exp,
          actual: null,
          isMatch: false,
          matchScore: 0.0,
          reason: `Ground truth course "${exp.courseCode}" not extracted (false negative)`,
        });
      }
    }

    return results;
  }

  /**
   * Run full comparison between all scalar fields and course marks arrays.
   */
  compareAll(
    expected: Record<string, unknown>,
    actual: Record<string, unknown>,
    scalarFields: string[]
  ): FieldMatchResult[] {
    const results: FieldMatchResult[] = [];

    for (const field of scalarFields) {
      results.push(this.compareField(field, expected[field], actual[field]));
    }

    if (expected['courseMarks'] || actual['courseMarks']) {
      const expMarks = (expected['courseMarks'] as ExtractedCourseMark[]) || [];
      const actMarks = (actual['courseMarks'] as ExtractedCourseMark[]) || [];
      results.push(...this.compareCourseMarks(expMarks, actMarks));
    }

    return results;
  }

  // --- Private Helpers ---

  private compareNumeric(fieldName: string, expected: number, actual: number): FieldMatchResult {
    const isMatch = this.withinTolerance(expected, actual);
    return {
      fieldName, expected, actual, isMatch,
      matchScore: isMatch ? 1.0 : 0.0,
      reason: isMatch ? undefined : `Numeric mismatch: expected ${expected}, got ${actual}`,
    };
  }

  private compareString(fieldName: string, expected: string, actual: string): FieldMatchResult {
    let e = expected;
    let a = actual;
    if (this.options.normalizeWhitespace) {
      e = e.replace(/\s+/g, ' ').trim();
      a = a.replace(/\s+/g, ' ').trim();
    }
    if (this.options.normalizeDates && this.looksLikeDate(e)) {
      e = this.normalizeDate(e);
      a = this.normalizeDate(a);
    }
    if (this.options.caseInsensitive) {
      e = e.toLowerCase();
      a = a.toLowerCase();
    }
    const isMatch = e === a;
    const score = isMatch ? 1.0 : this.similarity(e, a);
    return {
      fieldName, expected, actual, isMatch,
      matchScore: score,
      reason: isMatch ? undefined : `String mismatch (similarity: ${(score * 100).toFixed(1)}%)`,
    };
  }

  private withinTolerance(expected: number, actual: number): boolean {
    if (expected === 0) return actual === 0;
    return Math.abs(expected - actual) / Math.abs(expected) <= this.options.numericTolerancePct;
  }

  private looksLikeDate(val: string): boolean {
    return /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(val);
  }

  private normalizeDate(val: string): string {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch { /* ignore */ }
    return val;
  }

  private normalizeStr(val: string): string {
    return (val || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private similarity(a: string, b: string): number {
    if (a.length === 0 && b.length === 0) return 1.0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    const dist = this.levenshtein(a, b);
    return 1 - dist / maxLen;
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[m][n];
  }

  private buildMismatchReason(exp: ExtractedCourseMark, act: ExtractedCourseMark): string {
    const parts: string[] = [];
    if (exp.marksObtained !== act.marksObtained) parts.push(`marks: ${exp.marksObtained} vs ${act.marksObtained}`);
    if (exp.maxMarks !== act.maxMarks) parts.push(`maxMarks: ${exp.maxMarks} vs ${act.maxMarks}`);
    if (this.normalizeStr(exp.courseName) !== this.normalizeStr(act.courseName)) {
      parts.push(`name: "${exp.courseName}" vs "${act.courseName}"`);
    }
    return parts.join('; ');
  }

  private isNullish(val: unknown): boolean {
    return val === undefined || val === null;
  }
}
