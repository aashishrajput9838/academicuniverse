/**
 * RollNumberNormalizer.ts
 *
 * Normalizes roll numbers and enrollment numbers into canonical uppercase alphanumeric format.
 */

export class RollNumberNormalizer {
  /**
   * Normalize roll number string.
   */
  public static normalize(rawRoll: any): string {
    if (!rawRoll) return '';
    let str = String(rawRoll).trim().toUpperCase();

    // Strip hyphens, slashes, dots, and spaces
    str = str.replace(/[\s\-\/\.]/g, '');

    return str;
  }
}
