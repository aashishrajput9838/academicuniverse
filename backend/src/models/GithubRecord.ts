import { Schema, model, Document, Types } from 'mongoose';

export interface IGithubRecord extends Document {
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;
  githubUsername?: string;
  repositories?: any;
  languages?: any;
  contributions?: any;
  sourceDocumentId?: Types.ObjectId;
  rawConfidence: number;
  createdAt: Date;
  updatedAt: Date;
}

const GithubRecordSchema = new Schema<IGithubRecord>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' } as any,
    personId: { type: Schema.Types.ObjectId, required: true, ref: 'Person' } as any,
    githubUsername: { type: String },
    repositories: { type: Schema.Types.Mixed },
    languages: { type: Schema.Types.Mixed },
    contributions: { type: Schema.Types.Mixed },
    sourceDocumentId: { type: Schema.Types.ObjectId },
    rawConfidence: { type: Number, required: true },
  },
  { timestamps: true }
);

GithubRecordSchema.index({ organizationId: 1, personId: 1 });
GithubRecordSchema.index({ githubUsername: 1 });

export const GithubRecord = model<IGithubRecord>('GithubRecord', GithubRecordSchema);
