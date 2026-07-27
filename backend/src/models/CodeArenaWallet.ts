import { Schema, model, Document, Types } from 'mongoose';

export interface ICodeArenaWallet extends Document {
  _id: Types.ObjectId;

  organizationId: Types.ObjectId;
  userId: string;             // User._id string

  /**
   * Available credits the user can spend.
   * Starts at 0. Credits are added only via explicit deposits.
   * Academic Universe never auto-generates free credits.
   */
  balance: number;

  /**
   * Credits currently locked in escrow for open issues.
   * Cannot be spent or withdrawn while locked.
   */
  lockedBalance: number;

  /**
   * Lifetime aggregate: total credits received as solver rewards.
   */
  totalEarned: number;

  /**
   * Lifetime aggregate: total credits posted as issue rewards.
   * Includes credits still locked in escrow for open issues.
   */
  totalSpent: number;

  createdAt: Date;
  updatedAt: Date;
}

const CodeArenaWalletSchema = new Schema<ICodeArenaWallet>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
    },
    userId: { type: String, required: true },

    balance: { type: Number, default: 0, min: 0 },
    lockedBalance: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  } as any,
  { timestamps: true }
);

// Unique wallet per user per org
CodeArenaWalletSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true, name: 'uniqueWalletPerUserPerOrg' } as any
);

export const CodeArenaWallet = model<ICodeArenaWallet>('CodeArenaWallet', CodeArenaWalletSchema);
