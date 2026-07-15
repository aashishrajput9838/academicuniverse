// src/models/AuthMethod.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IAuthMethod extends Document {
  userId: Types.ObjectId; // reference to User stub
  provider: string; // e.g., 'password', 'google'
  providerUserId: string; // provider unique id (email for password, sub for OIDC)
  email: string;
  emailVerified: boolean;
  isPrimary?: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  linkedAt?: Date;
  failedLoginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AuthMethodSchema = new Schema<IAuthMethod>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true },
    providerUserId: { type: String, required: true },
    email: { type: String, required: true },
    emailVerified: { type: Boolean, required: true },
    isPrimary: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    linkedAt: { type: Date },
    failedLoginCount: { type: Number, default: 0 },
  } as any,
  { timestamps: true }
);

// Unique index for provider + providerUserId
AuthMethodSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });
// Unique index for verified email per provider (sparse, only when emailVerified is true)
AuthMethodSchema.index({ email: 1, provider: 1 }, { unique: true, partialFilterExpression: { emailVerified: true } } as any);

export const AuthMethod = model<IAuthMethod>('AuthMethod', AuthMethodSchema);
