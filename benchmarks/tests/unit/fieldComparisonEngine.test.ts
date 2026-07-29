/**
 * Academic Universe — Field Comparison Engine Unit Tests
 * Tests PER_ARRAY and PER_COURSE comparison modes.
 */

import { FieldComparisonEngine, CourseMarksComparisonMode } from '../../evaluators/fieldComparisonEngine';

describe('FieldComparisonEngine', () => {
  describe('PER_ARRAY mode (default)', () => {
    let engine: FieldComparisonEngine;

    beforeEach(() => {
      engine = new FieldComparisonEngine({
        numericTolerancePct: 0.01,
        caseInsensitive: true,
        normalizeWhitespace: true,
        normalizeDates: true,
        courseMarksMode: CourseMarksComparisonMode.PER_ARRAY,
      });
    });

    it('should return exactly 1 result for courseMarks when all match', () => {
      const expected = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
        { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
      ];
      const actual = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
        { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
      ];

      const results = engine.compareCourseMarks(expected, actual);
      expect(results).toHaveLength(1);
      expect(results[0].fieldName).toBe('courseMarks');
      expect(results[0].isMatch).toBe(true);
      expect(results[0].matchScore).toBeCloseTo(1.0);
    });

    it('should return exactly 1 result for courseMarks when array mismatches', () => {
      const expected = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
        { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
      ];
      const actual = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
      ];

      const results = engine.compareCourseMarks(expected, actual);
      expect(results).toHaveLength(1);
      expect(results[0].fieldName).toBe('courseMarks');
      expect(results[0].isMatch).toBe(false);
    });

    it('should return exactly 1 result when course names differ', () => {
      const expected = [
        { courseCode: 'CS101', courseName: 'Mathematics', marksObtained: 90, maxMarks: 100 },
      ];
      const actual = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
      ];

      const results = engine.compareCourseMarks(expected, actual);
      expect(results).toHaveLength(1);
      expect(results[0].isMatch).toBe(false);
    });

    it('should return exactly 1 result when marks differ beyond tolerance', () => {
      const expected = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
      ];
      const actual = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 50, maxMarks: 100 },
      ];

      const results = engine.compareCourseMarks(expected, actual);
      expect(results).toHaveLength(1);
      expect(results[0].isMatch).toBe(false);
    });

    it('should handle empty arrays as match', () => {
      const results = engine.compareCourseMarks([], []);
      expect(results).toHaveLength(1);
      expect(results[0].isMatch).toBe(true);
    });

    it('should handle null expected as match when actual is also null', () => {
      const results = engine.compareCourseMarks(
        [] as any,
        undefined as any
      );
      expect(results).toHaveLength(1);
      expect(results[0].isMatch).toBe(true);
    });
  });

  describe('PER_COURSE mode (legacy)', () => {
    const engine = new FieldComparisonEngine({
      courseMarksMode: CourseMarksComparisonMode.PER_COURSE,
    });

    it('should return one result per course', () => {
      const expected = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
        { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
      ];
      const actual = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
        { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
      ];

      const results = engine.compareCourseMarks(expected, actual);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.isMatch)).toBe(true);
    });

    it('should return one result per expected course even if missing from actual', () => {
      const expected = [
        { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
        { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
      ];
      const actual: any[] = [];

      const results = engine.compareCourseMarks(expected, actual);
      expect(results).toHaveLength(2);
      expect(results.every(r => !r.isMatch)).toBe(true);
    });
  });

  describe('compareAll with 7-field semantics', () => {
    it('should return exactly 7 results for a document with 5 courses in PER_ARRAY mode', () => {
      const engine = new FieldComparisonEngine({
        courseMarksMode: CourseMarksComparisonMode.PER_ARRAY,
      });

      const expected = {
        studentName: 'Alice',
        rollNumber: '001',
        semester: '1',
        sgpa: 8.5,
        cgpa: 8.0,
        issueDate: '2024-01-01',
        courseMarks: [
          { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
          { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
          { courseCode: 'CS103', courseName: 'Chem', marksObtained: 80, maxMarks: 100 },
          { courseCode: 'CS104', courseName: 'Bio', marksObtained: 75, maxMarks: 100 },
          { courseCode: 'CS105', courseName: 'CS', marksObtained: 95, maxMarks: 100 },
        ],
      };

      const actual = { ...expected };

      const results = engine.compareAll(expected, actual, ['studentName', 'rollNumber', 'semester', 'sgpa', 'cgpa', 'issueDate']);
      expect(results).toHaveLength(7); // 6 scalar + 1 array
    });

    it('should return 7 results in PER_COURSE mode for document with 5 courses', () => {
      const engine = new FieldComparisonEngine({
        courseMarksMode: CourseMarksComparisonMode.PER_COURSE,
      });

      const expected = {
        studentName: 'Alice',
        rollNumber: '001',
        semester: '1',
        sgpa: 8.5,
        cgpa: 8.0,
        issueDate: '2024-01-01',
        courseMarks: [
          { courseCode: 'CS101', courseName: 'Math', marksObtained: 90, maxMarks: 100 },
          { courseCode: 'CS102', courseName: 'Physics', marksObtained: 85, maxMarks: 100 },
        ],
      };

      const actual = { ...expected };

      const results = engine.compareAll(expected, actual, ['studentName', 'rollNumber', 'semester', 'sgpa', 'cgpa', 'issueDate']);
      expect(results).toHaveLength(8); // 6 scalar + 2 courses
    });
  });
});
