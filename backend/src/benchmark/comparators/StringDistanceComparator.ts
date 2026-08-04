/**
 * StringDistanceComparator.ts
 *
 * Implements Character Error Rate (CER), Word Error Rate (WER),
 * Levenshtein Edit Distance, and Exact Match string metrics.
 */

export class StringDistanceComparator {
  /**
   * Computes exact Levenshtein distance matrix between two strings or word arrays.
   */
  public static levenshteinDistance<T extends string | string[]>(
    seq1: T,
    seq2: T
  ): number {
    const len1 = seq1.length;
    const len2 = seq2.length;

    const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
      Array(len2 + 1).fill(0)
    );

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = seq1[i - 1] === seq2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    return dp[len1][len2];
  }

  /**
   * Compute Character Error Rate (CER).
   * CER = Levenshtein(expected, actual) / max(1, length(expected))
   */
  public static computeCer(expected: string, actual: string): number {
    const s1 = String(expected || '').trim();
    const s2 = String(actual || '').trim();

    if (s1 === s2) return 0.0;
    if (s1.length === 0) return s2.length > 0 ? 1.0 : 0.0;

    const dist = this.levenshteinDistance(s1, s2);
    return Math.min(1.0, dist / s1.length);
  }

  /**
   * Compute Word Error Rate (WER).
   * WER = Levenshtein(expectedWords, actualWords) / max(1, count(expectedWords))
   */
  public static computeWer(expected: string, actual: string): number {
    const words1 = String(expected || '').trim().split(/\s+/).filter(Boolean);
    const words2 = String(actual || '').trim().split(/\s+/).filter(Boolean);

    if (words1.length === 0) return words2.length > 0 ? 1.0 : 0.0;

    const dist = this.levenshteinDistance(words1, words2);
    return Math.min(1.0, dist / words1.length);
  }

  /**
   * Check exact match normalized for case and surrounding whitespace.
   */
  public static isExactMatch(expected: any, actual: any): boolean {
    const s1 = String(expected ?? '').trim().toLowerCase();
    const s2 = String(actual ?? '').trim().toLowerCase();
    return s1 === s2;
  }
}
