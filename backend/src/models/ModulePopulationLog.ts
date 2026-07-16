import { Schema, model, Document, Types } from 'mongoose';

export interface IModulePopulationLog extends Document {
  processingId: string;
  knowledgeRecordId: Types.ObjectId;
  organizationId: Types.ObjectId;
  personId: Types.ObjectId;
  moduleId: string;
  canonicalCollection: string;
  recordIds: Types.ObjectId[];
  action: 'POPULATE' | 'ROLLBACK';
  previousRecordIds?: Types.ObjectId[];
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error?: string;
  executionTimeMs: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const ModulePopulationLogSchema = new Schema<IModulePopulationLog>(
  {
    processingId: { type: String, required: true, index: true },
    knowledgeRecordId: { type: Schema.Types.ObjectId, required: true, index: true } as any,
    organizationId: { type: Schema.Types.ObjectId, required: true, index: true } as any,
    personId: { type: Schema.Types.ObjectId, required: true, index: true } as any,
    moduleId: { type: String, required: true, index: true },
    canonicalCollection: { type: String, required: true },
    recordIds: [{ type: Schema.Types.ObjectId }] as any,
    previousRecordIds: [{ type: Schema.Types.ObjectId }] as any,
    action: { type: String, enum: ['POPULATE', 'ROLLBACK'], required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'SKIPPED'], required: true, default: 'SUCCESS' },
    error: { type: String },
    executionTimeMs: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ModulePopulationLogSchema.index({ processingId: 1, moduleId: 1 }, { unique: true } as any);
ModulePopulationLogSchema.index({ organizationId: 1, personId: 1, moduleId: 1 });

export const ModulePopulationLog = model<IModulePopulationLog>('ModulePopulationLog', ModulePopulationLogSchema);
