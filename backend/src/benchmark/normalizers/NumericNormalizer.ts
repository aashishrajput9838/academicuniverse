/**
 * NumericNormalizer.ts
 *
 * Normalizes numeric inputs (GPA, CGPA, Credits, Marks) into clean float numbers.
 */

export class NumericNormalizer {
  /**
   * Normalize numeric input to float number with optional rounding.
   */
  public static normalize(raw: any, precision: number = 2): number | null {
    if (raw === null || raw === undefined || raw === '') return null;

    if (typeof raw === 'number') {
      if (isNaN(raw)) return null;
      return Number(raw.toFixed(precision));
    }

    const str = String(raw).trim();

    // Extract first floating-point or integer number from text like "8.85 / 10" or "85%"
    const match = str.match(/[-+]?\d*\.?\d+/);
    if (!match) return null;

    const parsed = parseFloat(match[0]);
    if (isNaN(parsed)) return null;

    return Number(parsed.toFixed(precision));
  }
}
