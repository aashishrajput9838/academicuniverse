import { Schema, model, Document, Types } from 'mongoose';

export interface IRateLimitAttempt extends Document {
  organizationId: Types.ObjectId;
  endpoint: string;
  attempts: number;
  windowStart: Date;
  lastAttemptAt: Date;
}

const RateLimitAttemptSchema = new Schema<IRateLimitAttempt>({
  organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization', index: true } as any,
  endpoint: { type: String, required: true, index: true },
  attempts: { type: Number, required: true, default: 1 },
  windowStart: { type: Date, required: true, index: true },
  lastAttemptAt: { type: Date, required: true, default: Date.now },
}, { timestamps: false });

RateLimitAttemptSchema.index({ organizationId: 1, endpoint: 1, windowStart: -1 }, { unique: true });
RateLimitAttemptSchema.index({ windowStart: 1 }, { expireAfterSeconds: 0 } as any);

export const RateLimitAttempt = model<IRateLimitAttempt>('RateLimitAttempt', RateLimitAttemptSchema);
