/**
 * stringComparator.test.ts
 *
 * Unit tests for StringDistanceComparator and ExactMatchComparator.
 */

import { StringDistanceComparator } from '../comparators/StringDistanceComparator';
import { ExactMatchComparator } from '../comparators/ExactMatchComparator';

describe('StringDistanceComparator', () => {
  test('should return 0.0 CER for identical strings', () => {
    expect(StringDistanceComparator.computeCer('Sharda University', 'Sharda University')).toBe(0.0);
  });

  test('should compute correct CER for edit distance', () => {
    const cer = StringDistanceComparator.computeCer('Kitten', 'Sitting');
    expect(cer).toBeCloseTo(0.5, 2);
  });

  test('should return 0.0 WER for identical word sequences', () => {
    expect(StringDistanceComparator.computeWer('Bachelor of Technology', 'Bachelor of Technology')).toBe(0.0);
  });

  test('should recognize case-insensitive exact matches', () => {
    expect(StringDistanceComparator.isExactMatch('   MARKSHEET  ', 'marksheet')).toBe(true);
  });
});

describe('ExactMatchComparator', () => {
  test('should match numbers within tolerance', () => {
    const res = ExactMatchComparator.compareField('gpa', 8.85, 8.851, 0.01);
    expect(res.matched).toBe(true);
  });

  test('should detect numeric mismatches exceeding tolerance', () => {
    const res = ExactMatchComparator.compareField('gpa', 8.85, 9.20, 0.01);
    expect(res.matched).toBe(false);
  });
});
