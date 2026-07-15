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

/** All Academic Universe modules available for AI module-routing recommendations. */
export const ACADEMIC_UNIVERSE_MODULES = [
  { id: 'growth_hub',       name: 'Growth Hub' },
  { id: 'academic_records', name: 'Academic Records' },
  { id: 'career_profile',   name: 'Career Profile' },
  { id: 'certificates',     name: 'Certificates' },
  { id: 'experience',       name: 'Experience' },
  { id: 'research_wing',    name: 'Research Wing' },
  { id: 'code_arena',       name: 'Code Arena' },
  { id: 'skills_tracker',   name: 'Skills Tracker' },
  { id: 'resume_builder',   name: 'Resume Builder' },
  { id: 'academic_schedule',name: 'Academic Schedule' },
  { id: 'faculty_cabin',    name: 'Faculty Cabin' },
  { id: 'mail_explorer',    name: 'Mail Explorer' },
  { id: 'emotional_support',name: 'Emotional Support' },
] as const;

export type AcademicUniverseModuleId = typeof ACADEMIC_UNIVERSE_MODULES[number]['id'];
