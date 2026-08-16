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
      } else if (Array.isArray(val)) {
        canonical[normKey] = val.map((item) => {
          if (item && typeof item === 'object') {
            const normItem: Record<string, any> = {};
            for (const [k, v] of Object.entries(item)) {
              if (v === null || v === undefined) continue;
              const subKey = this.normalizeKey(k);
              const subLower = subKey.toLowerCase();
              if (subLower.includes('code')) {
                normItem[subKey] = typeof v === 'string' ? v.trim().toUpperCase() : v;
              } else if (subLower.includes('grade') && !subLower.includes('point')) {
                normItem[subKey] = typeof v === 'string' ? v.trim().toUpperCase() : v;
              } else if (subLower.includes('credit') || subLower.includes('point') || subLower.includes('mark')) {
                normItem[subKey] = NumericNormalizer.normalize(v);
              } else if (subLower.includes('term') || subLower.includes('sem')) {
                normItem[subKey] = StringNormalizer.normalize(v, true);
              } else if (typeof v === 'string') {
                normItem[subKey] = StringNormalizer.normalize(v, true);
              } else {
                normItem[subKey] = v;
              }
            }
            return normItem;
          }
          return item;
        });
      } else if (typeof val === 'string') {
        canonical[normKey] = StringNormalizer.normalize(val, true);
      } else {
        canonical[normKey] = val;
      }
    }

    return canonical;
  }

  /**
   * Normalize key names from snake_case / aliases to canonical camelCase.
   */
  public static normalizeKey(key: string): string {
    const camel = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase()).trim();
    const map: Record<string, string> = {
      student_name: 'studentName',
      studentName: 'studentName',
      name: 'studentName',
      roll_number: 'rollNumber',
      rollNumber: 'rollNumber',
      rollNo: 'rollNumber',
      enrollment_number: 'enrollmentNumber',
      enrollmentNumber: 'enrollmentNumber',
      enrollmentNo: 'enrollmentNumber',
      degree_name: 'degreeName',
      degreeName: 'degreeName',
      degree: 'degreeName',
      branch_name: 'branchName',
      branchName: 'branchName',
      branch: 'branchName',
      department: 'branchName',
      batch_years: 'batchYears',
      batchYears: 'batchYears',
      batch: 'batchYears',
      father_name: 'fatherName',
      fatherName: 'fatherName',
      mother_name: 'motherName',
      motherName: 'motherName',
      date_of_birth: 'dateOfBirth',
      dateOfBirth: 'dateOfBirth',
      dob: 'dateOfBirth',
    };
    return map[camel] || map[key] || camel;
  }
}
