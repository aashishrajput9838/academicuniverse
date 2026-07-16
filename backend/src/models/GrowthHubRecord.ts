import { Schema, model, Document, Types } from 'mongoose';

export interface IGrowthHubRecord extends Document {
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;
  marks?: any;
  attendance?: any;
  schedule?: any;
  certificates?: any;
  experience?: any;
  sourceDocumentId: Types.ObjectId;
  rawConfidence: number;
  createdAt: Date;
  updatedAt: Date;
}

const GrowthHubRecordSchema = new Schema<IGrowthHubRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' } as any,
    marks: { type: Schema.Types.Mixed },
    attendance: { type: Schema.Types.Mixed },
    schedule: { type: Schema.Types.Mixed },
    certificates: { type: Schema.Types.Mixed },
    experience: { type: Schema.Types.Mixed },
    sourceDocumentId: { type: Schema.Types.ObjectId, required: true } as any,
    rawConfidence: { type: Number, required: true },
  },
  { timestamps: true }
);

export const GrowthHubRecord = model<IGrowthHubRecord>('GrowthHubRecord', GrowthHubRecordSchema);
