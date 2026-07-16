import { Schema, model, Document, Types } from 'mongoose';

export interface ICareerRecord extends Document {
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;
  skills?: string[];
  experience?: any;
  projects?: any;
  education?: any;
  sourceDocumentId: Types.ObjectId;
  rawConfidence: number;
  createdAt: Date;
  updatedAt: Date;
}

const CareerRecordSchema = new Schema<ICareerRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' } as any,
    skills: { type: [String], default: [] } as any,
    experience: { type: Schema.Types.Mixed },
    projects: { type: Schema.Types.Mixed },
    education: { type: Schema.Types.Mixed },
    sourceDocumentId: { type: Schema.Types.ObjectId, required: true } as any,
    rawConfidence: { type: Number, required: true },
  },
  { timestamps: true }
);

export const CareerRecord = model<ICareerRecord>('CareerRecord', CareerRecordSchema);
