/**
 * CanonicalNormalizer.ts
 *
 * Central Normalization Layer Orchestrator.
 * Transforms raw ground truths and predictions into canonical representations
 * prior to comparator evaluation.
 */

import { StringNormalizer } from './StringNormalizer';
import { DateNormalizer } from './DateNormalizer';
import { RollNumberNormalizer } from './RollNumberNormalizer';
import { NumericNormalizer } from './NumericNormalizer';
import { DegreeNameNormalizer } from './DegreeNameNormalizer';
import { UniversityAliasNormalizer } from './UniversityAliasNormalizer';

export interface CanonicalFields {
  [key: string]: any;
}

export class CanonicalNormalizer {
  /**
   * Normalizes a dictionary of fields using semantic domain normalizers.
   */
  public static normalizeFields(fields: Record<string, any>): CanonicalFields {
    if (!fields || typeof fields !== 'object') return {};

    const canonical: CanonicalFields = {};

    for (const [rawKey, val] of Object.entries(fields)) {
      if (val === null || val === undefined) continue;

      const normKey = this.normalizeKey(rawKey);
      const lowerKey = normKey.toLowerCase();

      if (lowerKey.includes('date')) {
        canonical[normKey] = DateNormalizer.normalize(val);
      } else if (lowerKey.includes('roll') || lowerKey.includes('enrollment')) {
        canonical[normKey] = RollNumberNormalizer.normalize(val);
      } else if (lowerKey.includes('gpa') || lowerKey.includes('cgpa') || lowerKey.includes('credits') || lowerKey.includes('marks')) {
        canonical[normKey] = NumericNormalizer.normalize(val);
      } else if (lowerKey.includes('degree') || lowerKey.includes('title') || lowerKey.includes('course')) {
        canonical[normKey] = DegreeNameNormalizer.normalize(val);
      } else if (lowerKey.includes('university') || lowerKey.includes('issuer') || lowerKey.includes('institution')) {
        canonical[normKey] = UniversityAliasNormalizer.normalize(val);
      } else if (typeof val === 'string') {
        canonical[normKey] = StringNormalizer.normalize(val, true);
      } else {
        canonical[normKey] = val;
      }
    }

    return canonical;
  }

  /**
   * Normalize key names from snake_case to canonical camelCase.
   */
  public static normalizeKey(key: string): string {
    return key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()).trim();
  }
}
