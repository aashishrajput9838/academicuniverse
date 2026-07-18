import { Person } from '../../models/Person';

export interface SemesterResolutionInput {
  admissionYear?: number;
  academicYear: number;
  term: string;
}

export interface SemesterResolutionResult {
  semesterNumber: number | null;
  isResolvable: boolean;
  reason?: string;
}

export class SemesterResolutionService {
  /**
   * Resolve the overall semester number from admission year, academic year, and term.
   *
   * Business rules:
   * 1. If admissionYear is missing, semester number cannot be resolved.
   * 2. academicYear must be >= admissionYear.
   * 3. term must be recognizable as Term 1 or Term 2 (or equivalent).
   * 4. Formula: (academicYear - admissionYear) * 2 + termOffset
   *
   * @param input - The resolution input
   * @returns The resolved semester number, or null if unresolvable
   */
  static resolve(input: SemesterResolutionInput): SemesterResolutionResult {
    const { admissionYear, academicYear, term } = input;

    // Rule 1: admissionYear is required
    if (admissionYear === undefined || admissionYear === null || isNaN(admissionYear)) {
      return {
        semesterNumber: null,
        isResolvable: false,
        reason: 'Admission year is not set in student profile',
      };
    }

    // Rule 2: academicYear must be valid
    if (isNaN(academicYear) || academicYear < 1900 || academicYear > new Date().getFullYear() + 1) {
      return {
        semesterNumber: null,
        isResolvable: false,
        reason: 'Invalid academic year',
      };
    }

    // Rule 3: academicYear must be >= admissionYear
    if (academicYear < admissionYear) {
      return {
        semesterNumber: null,
        isResolvable: false,
        reason: `Academic year ${academicYear} is before admission year ${admissionYear}`,
      };
    }

    // Rule 4: term must be recognizable
    const normalizedTerm = String(term || '').trim().toLowerCase();
    if (!normalizedTerm) {
      return {
        semesterNumber: null,
        isResolvable: false,
        reason: 'Term is missing',
      };
    }

    const termOffset = this.getTermOffset(normalizedTerm);
    if (termOffset === null) {
      return {
        semesterNumber: null,
        isResolvable: false,
        reason: `Unrecognized term format: ${term}`,
      };
    }

    const yearOffset = academicYear - admissionYear;
    const semesterNumber = yearOffset * 2 + termOffset;

    return {
      semesterNumber,
      isResolvable: true,
    };
  }

  /**
   * Get the term offset (1 for Term 1, 2 for Term 2).
   * Returns null if the term is not recognizable.
   */
  private static getTermOffset(term: string): number | null {
    // Normalize: remove spaces, convert to lowercase
    const normalized = term.toLowerCase().replace(/\s+/g, '');

    // Check for Term 1 patterns
    if (
      normalized === 'term1' ||
      normalized === 'term-1' ||
      normalized === 'term_1' ||
      normalized === '1' ||
      normalized === 'i' ||
      normalized === 'semester1' ||
      normalized === 'semester-1' ||
      normalized === 'semester_1'
    ) {
      return 1;
    }

    // Check for Term 2 patterns
    if (
      normalized === 'term2' ||
      normalized === 'term-2' ||
      normalized === 'term_2' ||
      normalized === '2' ||
      normalized === 'ii' ||
      normalized === 'semester2' ||
      normalized === 'semester-2' ||
      normalized === 'semester_2' ||
      normalized === 'semesterii'
    ) {
      return 2;
    }

    return null;
  }

  /**
   * Validate that an extracted semester number matches the derived semester number.
   * Returns a warning message if they differ, or null if they match or cannot be compared.
   */
  static validateExtractedSemester(
    extractedSemester: string | undefined | null,
    derivedSemesterNumber: number | null
  ): string | null {
    // If we can't derive the semester, we can't validate
    if (derivedSemesterNumber === null) {
      return null;
    }

    // If no semester was extracted, no validation needed
    if (!extractedSemester) {
      return null;
    }

    // Try to parse the extracted semester as a number
    const extractedNumber = parseInt(extractedSemester.trim(), 10);

    // If it's not a pure number, we can't compare (e.g., "Semester A", "Unknown")
    if (isNaN(extractedNumber)) {
      return null;
    }

    // Compare extracted vs derived
    if (extractedNumber !== derivedSemesterNumber) {
      return `Extracted Semester (${extractedNumber}) does not match the derived Semester (${derivedSemesterNumber}) based on student's admission year, academic year, and term. Please verify before approval.`;
    }

    return null;
  }
}
