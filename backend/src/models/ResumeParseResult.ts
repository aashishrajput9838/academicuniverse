import { Schema, model, Document, Types } from 'mongoose';

export interface IResumeParseResult extends Document {
  processingId: string;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  documentId?: Types.ObjectId;
  personId?: Types.ObjectId;
  documentCategory: 'RESUME';
  confidenceScore: number;
  sectionsDetected: number;
  entitiesExtracted: number;
  normalizedSkills: number;
  sectionDetectionStrategy: 'heuristic' | 'heuristic+ai' | 'ai-only';
  entityExtractionStrategy: 'regex' | 'regex+ner' | 'regex+ner+ai' | 'ai-only';
  aiProviderUsed: string;
  failedOver: boolean;
  primaryTargetModule: string;
  secondaryTargetModules: string[];
  reviewStatus: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'NEEDS_REINDEX';
  extractionIssues: {
    severity: 'info' | 'warning' | 'error';
    code: string;
    message: string;
    section?: string;
  }[];
  rawCandidateFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeParseResultSchema = new Schema<IResumeParseResult>({
  processingId: { type: String, required: true, unique: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization', index: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
  personId: { type: Schema.Types.ObjectId, ref: 'Person' },
  documentCategory: { type: String, required: true, enum: ['RESUME'], default: 'RESUME' },
  confidenceScore: { type: Number, required: true, min: 0, max: 1 },
  sectionsDetected: { type: Number, default: 0 },
  entitiesExtracted: { type: Number, default: 0 },
  normalizedSkills: { type: Number, default: 0 },
  sectionDetectionStrategy: { type: String, required: true, enum: ['heuristic', 'heuristic+ai', 'ai-only'] },
  entityExtractionStrategy: { type: String, required: true, enum: ['heuristic', 'heuristic+ai', 'ai-only'] },
  aiProviderUsed: { type: String, default: 'none' },
  failedOver: { type: Boolean, default: false },
  primaryTargetModule: { type: String, default: '' },
  secondaryTargetModules: { type: [String], default: [] },
  reviewStatus: { type: String, required: true, enum: ['AUTO_APPROVED', 'PENDING_REVIEW', 'NEEDS_REINDEX'], default: 'NEEDS_REINDEX' },
  extractionIssues: [{
    severity: { type: String, required: true, enum: ['info', 'warning', 'error'] },
    code: { type: String, required: true },
    message: { type: String, required: true },
    section: { type: String },
  }],
  rawCandidateFields: { type: Schema.Types.Mixed, default: {} },
} as any, { timestamps: true });

ResumeParseResultSchema.index({ organizationId: 1, reviewStatus: 1, createdAt: -1 });
ResumeParseResultSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

export const ResumeParseResult = model<IResumeParseResult>('ResumeParseResult', ResumeParseResultSchema);
