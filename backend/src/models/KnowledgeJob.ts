import { Schema, model, Document as MongooseDocument } from 'mongoose';
import { KnowledgeJobStatus } from '../shared/enums/knowledgeJobStatus.enum';

export interface IKnowledgeJob extends MongooseDocument {
  personId: string; // reference to Person
  sourceDocumentId: string; // originating Document ID
  domain: string; // e.g., 'Certificate', 'Experience', etc.
  payload: unknown; // normalized domain‑specific payload
  status: KnowledgeJobStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  nextRetryAt?: Date;
  startedAt?: Date; // when job processing first started
  lastAttemptAt?: Date; // timestamp of most recent attempt
  completedAt?: Date; // when job reached COMPLETED or FAILED
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeJobSchema = new Schema<IKnowledgeJob>(
  {
    personId: { type: String, required: true },
    sourceDocumentId: { type: String, required: true },
    domain: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true }, // unknown at compile‑time, stored as Mixed
    status: { type: String, enum: Object.values(KnowledgeJobStatus), default: KnowledgeJobStatus.PENDING },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    lastError: { type: String },
    nextRetryAt: { type: Date },
    startedAt: { type: Date },
    lastAttemptAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for efficient polling of pending jobs
KnowledgeJobSchema.index({ status: 1, nextRetryAt: 1 });
KnowledgeJobSchema.index({ personId: 1, status: 1 });

export const KnowledgeJobModel = model<IKnowledgeJob>('KnowledgeJob', KnowledgeJobSchema);
