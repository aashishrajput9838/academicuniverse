import { Schema, model, Document, Types } from 'mongoose';

export type TransactionType =
  | 'DEPOSIT'         // user adds real money → credits
  | 'LOCK'            // issue created → credits moved to escrow
  | 'UNLOCK'          // issue cancelled → escrow returned
  | 'REWARD_SENT'     // poster side: escrow released to solver
  | 'REWARD_RECEIVED' // solver side: credits received from escrow
  | 'REFUND';         // administrative refund

export interface ICodeArenaTransaction extends Document {
  _id: Types.ObjectId;

  organizationId: Types.ObjectId;
  userId: string;           // the wallet owner this transaction belongs to

  type: TransactionType;
  amount: number;           // always positive; direction implied by type
  balanceAfter: number;     // wallet.balance after this operation (snapshot)

  // Optional references for audit traceability
  issueId?: Types.ObjectId;
  solutionId?: Types.ObjectId;
  counterpartyUserId?: string;  // solver (on REWARD_SENT) or poster (on REWARD_RECEIVED)

  description: string;

  // Transactions are immutable — no updatedAt
  createdAt: Date;
}

const CodeArenaTransactionSchema = new Schema<ICodeArenaTransaction>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
    },
    userId: { type: String, required: true },

    type: {
      type: String,
      required: true,
      enum: ['DEPOSIT', 'LOCK', 'UNLOCK', 'REWARD_SENT', 'REWARD_RECEIVED', 'REFUND'],
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true },

    issueId: { type: Schema.Types.ObjectId, ref: 'CodeArenaIssue' },
    solutionId: { type: Schema.Types.ObjectId, ref: 'CodeArenaSolution' },
    counterpartyUserId: { type: String },

    description: { type: String, required: true },
  } as any,
  {
    // Transactions are append-only — disable updatedAt
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Transaction history for a user (primary read pattern)
CodeArenaTransactionSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });

// Audit trail for an issue
CodeArenaTransactionSchema.index({ issueId: 1 });

export const CodeArenaTransaction = model<ICodeArenaTransaction>(
  'CodeArenaTransaction',
  CodeArenaTransactionSchema
);
