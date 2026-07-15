/**
 * UAIP Pipeline Configuration Options
 */

export const CONFIDENCE_THRESHOLD = 0.8;

export const SUPPORTED_CATEGORIES = [
  'MARKSHEET',
  'TRANSCRIPT',
  'ACADEMIC_TIMETABLE',
  'SYLLABUS',
  'CERTIFICATE',
  'RESUME',
  'INTERNSHIP',
  'OFFER_LETTER',
  'RESEARCH_PAPER',
  'ASSIGNMENT',
  'LAB_RECORD',
  'FEE_RECEIPT',
  'IDENTITY_CARD',
  'OTHER',
] as const;

export type SupportedCategory = typeof SUPPORTED_CATEGORIES[number];

// Parser strategies or document MIME types that always require Stage 2 semantic processing
export const SEMANTIC_DOCUMENT_TYPES = [
  'EXCEL_PARSER',
  'CSV_PARSER',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
];
