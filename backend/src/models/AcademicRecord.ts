import { Schema, model, Document, Types } from 'mongoose';

export interface IAcademicRecord extends Document {
  organizationId: Types.ObjectId; // tenant
  personId: Types.ObjectId;       // canonical person
  sourceDocumentId: Types.ObjectId; // the uploaded document that generated this record
  rawConfidence: number;          // 0‑1 confidence from AI extraction
  subjectCode: string;
  subjectName: string;
  semester: string;
  year: number;
  term: string;
  academicYear: number;
  semesterNumber?: number;
  grade: string;
  gradePoints: number;
  gradingStatus: string;
  credits: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicRecordSchema = new Schema<IAcademicRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' } as any,
    sourceDocumentId: { type: Schema.Types.ObjectId, required: true, ref: 'Document' } as any,
    rawConfidence: { type: Number, required: true },
    subjectCode: { type: String, required: true },
    subjectName: { type: String, required: true },
    semester: { type: String, required: true },
    year: { type: Number, required: true },
    term: { type: String, required: false },
    academicYear: { type: Number, required: false },
    semesterNumber: { type: Number, required: false },
    grade: { type: String, required: true },
    gradePoints: { type: Number, required: true },
    gradingStatus: { type: String, required: false },
    credits: { type: Number, required: true },
    status: { type: String, required: true },
  },
  { timestamps: true }
);

// Ensure a unique academic record per person‑subject‑semester‑year
AcademicRecordSchema.index(
  { organizationId: 1, personId: 1, subjectCode: 1, semester: 1, year: 1 },
  { unique: true, name: 'uniqueAcademicRecord' } as any
);

AcademicRecordSchema.index({ organizationId: 1, subjectName: 1 }, { name: 'academic_org_subject_1' });

export const AcademicRecord = model<IAcademicRecord>('AcademicRecord', AcademicRecordSchema);
