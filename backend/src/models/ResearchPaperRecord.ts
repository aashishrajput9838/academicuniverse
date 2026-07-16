import { Schema, model, Document, Types } from 'mongoose';

export interface IResearchPaperRecord extends Document {
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;
  title?: string;
  authors?: string[];
  journal?: string;
  abstract?: string;
  sourceDocumentId: Types.ObjectId;
  rawConfidence: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchPaperRecordSchema = new Schema<IResearchPaperRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' } as any,
    title: { type: String },
    authors: { type: [String], default: [] } as any,
    journal: { type: String },
    abstract: { type: String },
    sourceDocumentId: { type: Schema.Types.ObjectId, required: true } as any,
    rawConfidence: { type: Number, required: true },
  },
  { timestamps: true }
);

export const ResearchPaperRecord = model<IResearchPaperRecord>('ResearchPaperRecord', ResearchPaperRecordSchema);
