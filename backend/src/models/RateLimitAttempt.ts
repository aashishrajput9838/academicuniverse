import { Schema, model, Document, Types } from 'mongoose';

export interface IRateLimitAttempt extends Document {
  organizationId: Types.ObjectId;
  endpoint: string;
  attempts: number;
  windowCreatedAt: Date;
  lastAttemptAt: Date;
}

const RateLimitAttemptSchema = new Schema<IRateLimitAttempt>({
  organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization', index: true } as any,
  endpoint: { type: String, required: true, index: true },
  attempts: { type: Number, required: true, default: 1 },
  windowCreatedAt: { type: Date, required: true, index: true, description: 'Timestamp when this rate-limit window record was created' },
  lastAttemptAt: { type: Date, required: true, default: Date.now },
}, { timestamps: false });

RateLimitAttemptSchema.index({ organizationId: 1, endpoint: 1, windowCreatedAt: -1 }, { unique: true } as any);
RateLimitAttemptSchema.index({ windowCreatedAt: 1 }, { expireAfterSeconds: 0 } as any);

export const RateLimitAttempt = model<IRateLimitAttempt>('RateLimitAttempt', RateLimitAttemptSchema);
