/**
 * Ground Truth JSON Schema — v1.0.0
 * JSON Schema (Draft-07) for programmatic validation of annotation files.
 */

export const GROUND_TRUTH_SCHEMA_VERSION = '1.0.0';

export const GROUND_TRUTH_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://academicuniverse.com/schemas/ground-truth/v1.0.0',
  title: 'AcademicUniverseGroundTruth',
  description: 'Ground truth annotation record for DIC benchmark documents',
  type: 'object',
  required: ['schemaVersion', 'documentId', 'category', 'annotatedBy', 'annotatedAt', 'annotationStatus'],
  additionalProperties: false,
  properties: {
    schemaVersion: {
      type: 'string',
      enum: ['1.0.0'],
      description: 'Schema version — must match current schema version',
    },
    documentId: {
      type: 'string',
      minLength: 1,
      pattern: '^[A-Za-z0-9_\\-]+$',
      description: 'Unique document identifier matching the filename without extension',
    },
    category: {
      type: 'string',
      enum: ['MARKSHEET', 'CERTIFICATE', 'TIMETABLE', 'EDGE_CASE'],
    },
    studentName: {
      type: ['string', 'null'],
      maxLength: 200,
    },
    rollNumber: {
      type: ['string', 'null'],
      maxLength: 100,
    },
    semester: {
      type: ['string', 'null'],
      maxLength: 50,
    },
    academicYear: {
      type: ['string', 'null'],
      maxLength: 20,
    },
    institutionName: {
      type: ['string', 'null'],
      maxLength: 300,
    },
    courseName: {
      type: ['string', 'null'],
      maxLength: 300,
    },
    sgpa: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 10,
    },
    cgpa: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 10,
    },
    issueDate: {
      type: ['string', 'null'],
      // ISO 8601 date
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    },
    courseMarks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['courseCode', 'courseName', 'marksObtained', 'maxMarks'],
        additionalProperties: false,
        properties: {
          courseCode: { type: 'string', minLength: 1, maxLength: 30 },
          courseName: { type: 'string', minLength: 1, maxLength: 200 },
          marksObtained: { type: 'number', minimum: 0 },
          maxMarks: { type: 'number', minimum: 1 },
          grade: { type: ['string', 'null'], maxLength: 5 },
        },
      },
    },
    annotatedBy: {
      type: 'string',
      minLength: 1,
      description: 'Annotator ID (e.g. A1, A2)',
    },
    annotatedAt: {
      type: 'string',
      format: 'date-time',
    },
    verifiedBy: {
      type: ['string', 'null'],
    },
    verifiedAt: {
      type: ['string', 'null'],
    },
    annotationStatus: {
      type: 'string',
      enum: ['PENDING', 'IN_PROGRESS', 'ANNOTATED', 'VERIFIED', 'CONFLICT'],
    },
    annotationNotes: {
      type: 'string',
      maxLength: 1000,
    },
    lowConfidenceFields: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

/**
 * Blank annotation template for a new document.
 * Annotators fill this in for each document.
 */
export function createBlankAnnotation(documentId: string, category: string, annotatorId: string): object {
  return {
    schemaVersion: GROUND_TRUTH_SCHEMA_VERSION,
    documentId,
    category,
    studentName: null,
    rollNumber: null,
    semester: null,
    academicYear: null,
    institutionName: null,
    courseName: null,
    sgpa: null,
    cgpa: null,
    issueDate: null,
    courseMarks: [],
    annotatedBy: annotatorId,
    annotatedAt: new Date().toISOString(),
    verifiedBy: null,
    verifiedAt: null,
    annotationStatus: 'IN_PROGRESS',
    annotationNotes: '',
    lowConfidenceFields: [],
  };
}
