import { Types } from 'mongoose';
import { CodeArenaWallet, ICodeArenaWallet } from '../../models/CodeArenaWallet';
import { CodeArenaTransaction, ICodeArenaTransaction, TransactionType } from '../../models/CodeArenaTransaction';
import { toObjectId } from '../../utils/mongooseHelpers';

export class CodeArenaWalletService {
  /**
   * Get or create wallet for user.
   * NOTE: Initial balance is strictly 0.
   */
  public async getOrCreateWallet(organizationId: string | Types.ObjectId, userId: string): Promise<ICodeArenaWallet> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    
    let wallet = await CodeArenaWallet.findOne({
      organizationId: orgObjId,
      userId,
    });

    if (!wallet) {
      wallet = await CodeArenaWallet.create({
        organizationId: orgObjId,
        userId,
        balance: 0,
        lockedBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
      });
    }

    return wallet;
  }

  /**
   * Deposit real funds into user wallet (e.g. via payment gateway or faculty top-up).
   */
  public async deposit(
    organizationId: string | Types.ObjectId,
    userId: string,
    amount: number,
    description: string = 'Wallet Deposit'
  ): Promise<{ wallet: ICodeArenaWallet; transaction: ICodeArenaTransaction }> {
    if (amount <= 0) {
      throw new Error('Deposit amount must be greater than zero');
    }

    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;

    // Atomically increment balance
    const wallet = await CodeArenaWallet.findOneAndUpdate(
      { organizationId: orgObjId, userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true }
    );

    const transaction = await CodeArenaTransaction.create({
      organizationId: orgObjId,
      userId,
      type: 'DEPOSIT',
      amount,
      balanceAfter: wallet.balance,
      description,
    });

    return { wallet, transaction };
  }

  /**
   * Lock reward in escrow upon issue creation.
   * Atomically checks available balance >= rewardAmount.
   */
  public async lockEscrow(
    organizationId: string | Types.ObjectId,
    userId: string,
    issueId: Types.ObjectId | string,
    rewardAmount: number
  ): Promise<ICodeArenaTransaction> {
    if (rewardAmount <= 0) {
      throw new Error('Reward amount must be greater than zero');
    }

    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    // Atomically deduct from balance and increment lockedBalance IF balance >= rewardAmount
    const wallet = await CodeArenaWallet.findOneAndUpdate(
      {
        organizationId: orgObjId,
        userId,
        balance: { $gte: rewardAmount },
      },
      {
        $inc: {
          balance: -rewardAmount,
          lockedBalance: rewardAmount,
          totalSpent: rewardAmount,
        },
      },
      { new: true }
    );

    if (!wallet) {
      const currentWallet = await this.getOrCreateWallet(orgObjId, userId);
      throw new Error(
        `Insufficient wallet balance. Available: ${currentWallet.balance} credits, Required: ${rewardAmount} credits.`
      );
    }

    const transaction = await CodeArenaTransaction.create({
      organizationId: orgObjId,
      userId,
      type: 'LOCK',
      amount: rewardAmount,
      balanceAfter: wallet.balance,
      issueId: issueObjId,
      description: `Escrow locked for Issue #${issueObjId}`,
    });

    return transaction;
  }

  /**
   * Release escrow reward to solver on solution acceptance.
   */
  public async releaseEscrow(
    organizationId: string | Types.ObjectId,
    posterId: string,
    solverId: string,
    issueId: Types.ObjectId | string,
    solutionId: Types.ObjectId | string,
    rewardAmount: number
  ): Promise<{ posterTx: ICodeArenaTransaction; solverTx: ICodeArenaTransaction }> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;
    const solutionObjId = typeof solutionId === 'string' ? toObjectId(solutionId) : solutionId;

    // 1. Deduct from poster's lockedBalance
    const posterWallet = await CodeArenaWallet.findOneAndUpdate(
      {
        organizationId: orgObjId,
        userId: posterId,
        lockedBalance: { $gte: rewardAmount },
      },
      {
        $inc: { lockedBalance: -rewardAmount },
      },
      { new: true }
    );

    if (!posterWallet) {
      throw new Error('Escrow release failed: Locked balance insufficient or already released.');
    }

    const posterTx = await CodeArenaTransaction.create({
      organizationId: orgObjId,
      userId: posterId,
      type: 'REWARD_SENT',
      amount: rewardAmount,
      balanceAfter: posterWallet.balance,
      issueId: issueObjId,
      solutionId: solutionObjId,
      counterpartyUserId: solverId,
      description: `Reward of ${rewardAmount} credits transferred to solver for Issue #${issueObjId}`,
    });

    // 2. Credit solver's wallet
    const solverWallet = await CodeArenaWallet.findOneAndUpdate(
      { organizationId: orgObjId, userId: solverId },
      {
        $inc: {
          balance: rewardAmount,
          totalEarned: rewardAmount,
        },
      },
      { new: true, upsert: true }
    );

    const solverTx = await CodeArenaTransaction.create({
      organizationId: orgObjId,
      userId: solverId,
      type: 'REWARD_RECEIVED',
      amount: rewardAmount,
      balanceAfter: solverWallet.balance,
      issueId: issueObjId,
      solutionId: solutionObjId,
      counterpartyUserId: posterId,
      description: `Reward of ${rewardAmount} credits received for solving Issue #${issueObjId}`,
    });

    return { posterTx, solverTx };
  }

  /**
   * Refund escrow to poster upon issue cancellation.
   */
  public async refundEscrow(
    organizationId: string | Types.ObjectId,
    posterId: string,
    issueId: Types.ObjectId | string,
    rewardAmount: number
  ): Promise<ICodeArenaTransaction> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    const posterWallet = await CodeArenaWallet.findOneAndUpdate(
      {
        organizationId: orgObjId,
        userId: posterId,
        lockedBalance: { $gte: rewardAmount },
      },
      {
        $inc: {
          balance: rewardAmount,
          lockedBalance: -rewardAmount,
          totalSpent: -rewardAmount,
        },
      },
      { new: true }
    );

    if (!posterWallet) {
      throw new Error('Escrow refund failed: Locked balance is zero or already refunded.');
    }

    const transaction = await CodeArenaTransaction.create({
      organizationId: orgObjId,
      userId: posterId,
      type: 'REFUND',
      amount: rewardAmount,
      balanceAfter: posterWallet.balance,
      issueId: issueObjId,
      description: `Escrow refunded for cancelled Issue #${issueObjId}`,
    });

    return transaction;
  }

  /**
   * Get user transaction history with pagination.
   */
  public async getTransactions(
    organizationId: string | Types.ObjectId,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: ICodeArenaTransaction[]; total: number; page: number; totalPages: number }> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CodeArenaTransaction.find({ organizationId: orgObjId, userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CodeArenaTransaction.countDocuments({ organizationId: orgObjId, userId }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
