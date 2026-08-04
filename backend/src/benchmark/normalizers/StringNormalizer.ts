/**
 * StringNormalizer.ts
 *
 * Normalizes string values by trimming whitespace, collapsing extra spaces,
 * stripping punctuation if needed, and converting to lowercase.
 */

export class StringNormalizer {
  /**
   * Normalize raw string into clean whitespace-collapsed representation.
   */
  public static normalize(raw: any, lowercase: boolean = true): string {
    if (raw === null || raw === undefined) return '';

    let str = String(raw).trim();
    // Collapse multiple whitespace/newlines into a single space
    str = str.replace(/\s+/g, ' ');

    if (lowercase) {
      str = str.toLowerCase();
    }

    return str;
  }

  /**
   * Strip non-alphanumeric characters except spaces.
   */
  public static stripPunctuation(str: string): string {
    return str.replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
  }
}
