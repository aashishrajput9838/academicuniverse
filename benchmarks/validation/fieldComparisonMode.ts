/**
 * Academic Universe — Field Comparison Mode
 * Determines how courseMarks arrays are compared and counted for metrics.
 */

export enum CourseMarksComparisonMode {
  /**
   * Each course in the array is treated as a separate field.
   * Results in field count = 7 + N_courses.
   * Use case: Fine-grained per-course error analysis.
   */
  PER_COURSE = 'PER_COURSE',

  /**
   * The entire courseMarks array is treated as a single atomic field.
   * Exact match required: all courses must match exactly.
   * Results in field count = 7.
   * Use case: Paper-level precision/recall over 7 core fields.
   */
  PER_ARRAY = 'PER_ARRAY',
}
