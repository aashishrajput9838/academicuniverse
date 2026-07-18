import { SemesterResolutionService } from '../semesterResolution.service';

describe('SemesterResolutionService', () => {
  describe('resolve', () => {
    it('should return semester 1 for admission 2023, academicYear 2023, term 1', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: 2023,
        academicYear: 2023,
        term: 'Term 1',
      });
      expect(result.semesterNumber).toBe(1);
      expect(result.isResolvable).toBe(true);
    });

    it('should return semester 2 for admission 2023, academicYear 2023, term 2', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: 2023,
        academicYear: 2023,
        term: 'Term 2',
      });
      expect(result.semesterNumber).toBe(2);
      expect(result.isResolvable).toBe(true);
    });

    it('should return semester 3 for admission 2023, academicYear 2024, term 1', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: 2023,
        academicYear: 2024,
        term: 'Term 1',
      });
      expect(result.semesterNumber).toBe(3);
      expect(result.isResolvable).toBe(true);
    });

    it('should return semester 4 for admission 2023, academicYear 2024, term 2', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: 2023,
        academicYear: 2024,
        term: 'Term 2',
      });
      expect(result.semesterNumber).toBe(4);
      expect(result.isResolvable).toBe(true);
    });

    it('should handle term 2 with "ii" suffix', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: 2023,
        academicYear: 2023,
        term: 'Semester II',
      });
      expect(result.semesterNumber).toBe(2);
      expect(result.isResolvable).toBe(true);
    });

    it('should return not resolvable when admissionYear is missing', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: undefined,
        academicYear: 2023,
        term: 'Term 1',
      });
      expect(result.semesterNumber).toBeNull();
      expect(result.isResolvable).toBe(false);
      expect(result.reason).toBe('Admission year is not set in student profile');
    });

    it('should return not resolvable when academicYear is before admissionYear', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: 2024,
        academicYear: 2023,
        term: 'Term 1',
      });
      expect(result.semesterNumber).toBeNull();
      expect(result.isResolvable).toBe(false);
      expect(result.reason).toBe('Academic year 2023 is before admission year 2024');
    });

    it('should return not resolvable when term is missing', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: 2023,
        academicYear: 2023,
        term: '',
      });
      expect(result.semesterNumber).toBeNull();
      expect(result.isResolvable).toBe(false);
      expect(result.reason).toBe('Term is missing');
    });

    it('should return not resolvable when term is unrecognized', () => {
      const result = SemesterResolutionService.resolve({
        admissionYear: 2023,
        academicYear: 2023,
        term: 'Summer',
      });
      expect(result.semesterNumber).toBeNull();
      expect(result.isResolvable).toBe(false);
      expect(result.reason).toBe('Unrecognized term format: Summer');
    });
  });

  describe('validateExtractedSemester', () => {
    it('should return null when extracted semester matches derived semester', () => {
      const warning = SemesterResolutionService.validateExtractedSemester('1', 1);
      expect(warning).toBeNull();
    });

    it('should return warning when extracted semester differs from derived semester', () => {
      const warning = SemesterResolutionService.validateExtractedSemester('6', 5);
      expect(warning).toContain('Extracted Semester (6) does not match the derived Semester (5)');
    });

    it('should return null when derived semester is null', () => {
      const warning = SemesterResolutionService.validateExtractedSemester('1', null);
      expect(warning).toBeNull();
    });

    it('should return null when extracted semester is missing', () => {
      const warning = SemesterResolutionService.validateExtractedSemester(undefined, 1);
      expect(warning).toBeNull();
    });

    it('should return null when extracted semester is not a number', () => {
      const warning = SemesterResolutionService.validateExtractedSemester('A', 1);
      expect(warning).toBeNull();
    });
  });
});
