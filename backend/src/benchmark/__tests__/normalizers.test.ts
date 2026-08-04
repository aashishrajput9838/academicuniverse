/**
 * normalizers.test.ts
 *
 * Unit tests for the dedicated normalization layer.
 */

import { StringNormalizer } from '../normalizers/StringNormalizer';
import { DateNormalizer } from '../normalizers/DateNormalizer';
import { RollNumberNormalizer } from '../normalizers/RollNumberNormalizer';
import { NumericNormalizer } from '../normalizers/NumericNormalizer';
import { DegreeNameNormalizer } from '../normalizers/DegreeNameNormalizer';
import { UniversityAliasNormalizer } from '../normalizers/UniversityAliasNormalizer';
import { CanonicalNormalizer } from '../normalizers/CanonicalNormalizer';

describe('Normalization Layer Unit Tests', () => {
  test('StringNormalizer should collapse whitespace and convert to lower case', () => {
    expect(StringNormalizer.normalize('   Trisha   Das  \n\t')).toBe('trisha das');
  });

  test('DateNormalizer should normalize various date formats to ISO 8601 YYYY-MM-DD', () => {
    expect(DateNormalizer.normalize('2025-07-14')).toBe('2025-07-14');
    expect(DateNormalizer.normalize('14/07/2025')).toBe('2025-07-14');
    expect(DateNormalizer.normalize('July 14, 2025')).toBe('2025-07-14');
    expect(DateNormalizer.normalize('14 July 2025')).toBe('2025-07-14');
  });

  test('RollNumberNormalizer should strip hyphens, spaces, and uppercase roll numbers', () => {
    expect(RollNumberNormalizer.normalize('2021-IT-000150')).toBe('2021IT000150');
    expect(RollNumberNormalizer.normalize('2021/IT/000150')).toBe('2021IT000150');
  });

  test('NumericNormalizer should extract float numbers and format to 2 decimal places', () => {
    expect(NumericNormalizer.normalize('4.930')).toBe(4.93);
    expect(NumericNormalizer.normalize('CGPA: 8.85 / 10')).toBe(8.85);
  });

  test('DegreeNameNormalizer should convert shorthand degree names to canonical forms', () => {
    expect(DegreeNameNormalizer.normalize('B.Tech in Information Technology')).toBe('Bachelor of Technology in Information Technology');
    expect(DegreeNameNormalizer.normalize('btech Information Technology')).toBe('Bachelor of Technology Information Technology');
  });

  test('UniversityAliasNormalizer should resolve acronyms to full canonical university names', () => {
    expect(UniversityAliasNormalizer.normalize('VTU')).toBe('Vivekananda Technical University');
    expect(UniversityAliasNormalizer.normalize('vtu new delhi')).toBe('Vivekananda Technical University');
  });

  test('CanonicalNormalizer should orchestrate field dictionary normalization', () => {
    const rawGt = {
      student_name: '  Trisha Das ',
      roll_number: '2021-IT-000150',
      cgpa: '4.93',
      issue_date: 'July 14, 2025',
      degree_name: 'B.Tech IT',
      university: 'VTU',
    };

    const canonical = CanonicalNormalizer.normalizeFields(rawGt);

    expect(canonical.studentName).toBe('trisha das');
    expect(canonical.rollNumber).toBe('2021IT000150');
    expect(canonical.cgpa).toBe(4.93);
    expect(canonical.issueDate).toBe('2025-07-14');
    expect(canonical.degreeName).toBe('Bachelor of Technology IT');
    expect(canonical.university).toBe('Vivekananda Technical University');
  });
});
