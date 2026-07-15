import { Schema, model, Document, Types } from 'mongoose';

export interface IExperienceRecord extends Document {
  organizationId: Types.ObjectId; // tenant
  personId: Types.ObjectId;       // canonical person
  sourceDocumentId: Types.ObjectId; // the uploaded document that generated this record
  rawConfidence: number;          // 0‑1 confidence from AI extraction
  title: string;                  // Position title
  company: string;                // Company / organization
  startDate: Date;                // Start date of the experience
  endDate?: Date;                 // End date (optional, for current positions)
  createdAt: Date;
  updatedAt: Date;
}

const ExperienceRecordSchema = new Schema<IExperienceRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' },
    sourceDocumentId: { type: Schema.Types.ObjectId, required: true, ref: 'Document' },
    rawConfidence: { type: Number, required: true },
    title: { type: String, required: true },
    company: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
  } as any,
  { timestamps: true }
);

// Ensure a person cannot have duplicate experience entries with same title and company
ExperienceRecordSchema.index(
  { organizationId: 1, personId: 1, title: 1, company: 1 },
  { unique: true, name: 'uniqueExperience' } as any
);

export const ExperienceRecord = model<IExperienceRecord>('ExperienceRecord', ExperienceRecordSchema);
