import { Schema, model, Document, Types } from 'mongoose';

export type APTransactionType =
  | 'WELCOME_BONUS'     // Initial 1000 AP credited on account creation
  | 'DAILY_LOGIN'       // +5 AP daily login reward
  | 'STREAK_BONUS'      // +25 AP 7-day streak bonus
  | 'ISSUE_CREATED'     // AP deducted when student posts an issue with reward
  | 'ISSUE_REWARD'      // AP transferred to solver when solution is accepted
  | 'ISSUE_REFUND'      // AP refunded to poster when issue is cancelled without winner
  | 'ADMIN_ADJUSTMENT'; // Administrative points adjustment

export interface ICodeArenaPointTransaction extends Document {
  _id: Types.ObjectId;

  organizationId: Types.ObjectId;
  userId: string; // User._id string

  type: APTransactionType;
  amount: number; // Signed integer: positive for gains (+1000, +5, +100), negative for deductions (-100)
  balanceAfter: number; // Snapshot of user AP balance after this transaction

  // Optional references for traceability
  issueId?: Types.ObjectId;
  solutionId?: Types.ObjectId;
  counterpartyUserId?: string; // solverId or posterId

  description: string;
  referenceId?: string;

  createdAt: Date;
}

const CodeArenaPointTransactionSchema = new Schema<ICodeArenaPointTransaction>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },
    userId: { type: String, required: true, index: true },

    type: {
      type: String,
      required: true,
      enum: [
        'WELCOME_BONUS',
        'DAILY_LOGIN',
        'STREAK_BONUS',
        'ISSUE_CREATED',
        'ISSUE_REWARD',
        'ISSUE_REFUND',
        'ADMIN_ADJUSTMENT',
      ],
      index: true,
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },

    issueId: { type: Schema.Types.ObjectId, ref: 'CodeArenaIssue' },
    solutionId: { type: Schema.Types.ObjectId, ref: 'CodeArenaSolution' },
    counterpartyUserId: { type: String },

    description: { type: String, required: true },
    referenceId: { type: String },
  } as any,
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Ledger history queries (user audit trail)
CodeArenaPointTransactionSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

// Issue transaction queries
CodeArenaPointTransactionSchema.index({ issueId: 1 });

// Deduplication check index for welcome bonus and daily login
CodeArenaPointTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const CodeArenaPointTransaction = model<ICodeArenaPointTransaction>(
  'CodeArenaPointTransaction',
  CodeArenaPointTransactionSchema
);
