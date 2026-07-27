import { Types } from 'mongoose';
import { CodeArenaReputation, ICodeArenaReputation } from '../../models/CodeArenaReputation';
import { CodeArenaPointTransaction, ICodeArenaPointTransaction, APTransactionType } from '../../models/CodeArenaPointTransaction';
import { toObjectId } from '../../utils/mongooseHelpers';
import { Logger } from '../../utils/logger';

const logger = new Logger('codeArenaPointsService');

export class CodeArenaPointsService {
  /**
   * Get or initialize user Arena Points & Reputation Profile.
   * If this is a newly registered user accessing Code Arena for the first time,
   * automatically grants 1000 AP Welcome Bonus with a WELCOME_BONUS transaction.
   */
  public async getOrCreatePointsProfile(
    organizationId: string | Types.ObjectId,
    userId: string
  ): Promise<{ profile: ICodeArenaReputation; isNewUser: boolean }> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;

    let profile = await CodeArenaReputation.findOne({
      organizationId: orgObjId,
      userId,
    });

    let isNewUser = false;

    if (!profile) {
      isNewUser = true;
      profile = await CodeArenaReputation.create({
        organizationId: orgObjId,
        userId,
        arenaPoints: 1000,
        totalEarned: 1000,
        totalSpent: 0,
        totalPoints: 50, // Initial welcome reputation points
        issuesPosted: 0,
        issuesSolved: 0,
        issuesCancelled: 0,
        solutionsSubmitted: 0,
        solutionsAccepted: 0,
        acceptanceRate: 0,
        favoriteTechnologies: [],
        badges: [],
        loginStreak: 1,
        lastDailyRewardDate: new Date(),
      });

      // Record welcome bonus transaction in Arena Point Ledger
      await CodeArenaPointTransaction.create({
        organizationId: orgObjId,
        userId,
        type: 'WELCOME_BONUS',
        amount: 1000,
        balanceAfter: 1000,
        description: '🎉 Welcome Bonus: 1000 Arena Points added to your account',
      });

      logger.info(`Granted 1000 AP Welcome Bonus to new user ${userId}`);
    }

    return { profile, isNewUser };
  }

  /**
   * Check and claim daily login reward (+5 AP) & streak bonus (+25 AP for 7-day streak).
   */
  public async checkAndGrantDailyReward(
    organizationId: string | Types.ObjectId,
    userId: string
  ): Promise<{
    claimed: boolean;
    rewardAmount: number;
    streakBonus: boolean;
    currentStreak: number;
    newBalance: number;
  }> {
    const { profile } = await this.getOrCreatePointsProfile(organizationId, userId);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const lastRewardStr = profile.lastDailyRewardDate
      ? new Date(profile.lastDailyRewardDate).toISOString().split('T')[0]
      : null;

    if (lastRewardStr === todayStr) {
      return {
        claimed: false,
        rewardAmount: 0,
        streakBonus: false,
        currentStreak: profile.loginStreak || 1,
        newBalance: profile.arenaPoints,
      };
    }

    // Determine streak
    let newStreak = profile.loginStreak || 0;
    if (profile.lastDailyRewardDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastRewardStr === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1; // Reset streak if missed a day
      }
    } else {
      newStreak = 1;
    }

    let rewardAmount = 5;
    let streakBonus = false;

    // 7-day streak bonus (+25 AP)
    if (newStreak % 7 === 0) {
      rewardAmount += 25;
      streakBonus = true;
    }

    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;

    // Update profile
    profile.arenaPoints += rewardAmount;
    profile.totalEarned += rewardAmount;
    profile.loginStreak = newStreak;
    profile.lastDailyRewardDate = now;

    if (streakBonus && !profile.badges.includes('STREAK_MASTER')) {
      profile.badges.push('STREAK_MASTER');
    }

    await profile.save();

    // Ledger transactions
    await CodeArenaPointTransaction.create({
      organizationId: orgObjId,
      userId,
      type: 'DAILY_LOGIN',
      amount: 5,
      balanceAfter: profile.arenaPoints - (streakBonus ? 25 : 0),
      description: `📅 Daily Login Reward (+5 AP). Streak: ${newStreak} days`,
    });

    if (streakBonus) {
      await CodeArenaPointTransaction.create({
        organizationId: orgObjId,
        userId,
        type: 'STREAK_BONUS',
        amount: 25,
        balanceAfter: profile.arenaPoints,
        description: `🔥 7-Day Login Streak Bonus (+25 AP)!`,
      });
    }

    return {
      claimed: true,
      rewardAmount,
      streakBonus,
      currentStreak: newStreak,
      newBalance: profile.arenaPoints,
    };
  }

  /**
   * Deduct Arena Points when user creates an issue with a reward > 0.
   */
  public async deductPointsForIssue(
    organizationId: string | Types.ObjectId,
    userId: string,
    issueId: Types.ObjectId | string,
    rewardAmount: number
  ): Promise<ICodeArenaPointTransaction | null> {
    if (rewardAmount <= 0) {
      return null; // Community Help issue (0 AP)
    }

    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    const profile = await CodeArenaReputation.findOneAndUpdate(
      {
        organizationId: orgObjId,
        userId,
        arenaPoints: { $gte: rewardAmount },
      },
      {
        $inc: {
          arenaPoints: -rewardAmount,
          totalSpent: rewardAmount,
        },
      },
      { new: true }
    );

    if (!profile) {
      const current = await this.getOrCreatePointsProfile(orgObjId, userId);
      throw new Error(
        `Insufficient Arena Points. Current Balance: ${current.profile.arenaPoints} AP, Required: ${rewardAmount} AP.`
      );
    }

    const transaction = await CodeArenaPointTransaction.create({
      organizationId: orgObjId,
      userId,
      type: 'ISSUE_CREATED',
      amount: -rewardAmount,
      balanceAfter: profile.arenaPoints,
      issueId: issueObjId,
      description: `Posted Issue #${issueObjId} with ${rewardAmount} AP reward`,
    });

    return transaction;
  }

  /**
   * Transfer reward AP to solver on solution acceptance.
   */
  public async transferPointsToSolver(
    organizationId: string | Types.ObjectId,
    posterId: string,
    solverId: string,
    issueId: Types.ObjectId | string,
    solutionId: Types.ObjectId | string,
    rewardAmount: number
  ): Promise<{ solverTransaction: ICodeArenaPointTransaction | null }> {
    if (rewardAmount <= 0) {
      return { solverTransaction: null }; // Community Help issue (0 AP)
    }

    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;
    const solutionObjId = typeof solutionId === 'string' ? toObjectId(solutionId) : solutionId;

    // Credit solver AP balance
    const solverProfile = await CodeArenaReputation.findOneAndUpdate(
      { organizationId: orgObjId, userId: solverId },
      {
        $inc: {
          arenaPoints: rewardAmount,
          totalEarned: rewardAmount,
        },
      },
      { new: true, upsert: true }
    );

    const solverTx = await CodeArenaPointTransaction.create({
      organizationId: orgObjId,
      userId: solverId,
      type: 'ISSUE_REWARD',
      amount: rewardAmount,
      balanceAfter: solverProfile.arenaPoints,
      issueId: issueObjId,
      solutionId: solutionObjId,
      counterpartyUserId: posterId,
      description: `Earned ${rewardAmount} AP for accepted solution on Issue #${issueObjId}`,
    });

    return { solverTransaction: solverTx };
  }

  /**
   * Refund AP to poster when issue is cancelled without winner.
   */
  public async refundPointsForCancelledIssue(
    organizationId: string | Types.ObjectId,
    posterId: string,
    issueId: Types.ObjectId | string,
    rewardAmount: number
  ): Promise<ICodeArenaPointTransaction | null> {
    if (rewardAmount <= 0) {
      return null;
    }

    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    const posterProfile = await CodeArenaReputation.findOneAndUpdate(
      { organizationId: orgObjId, userId: posterId },
      {
        $inc: {
          arenaPoints: rewardAmount,
          totalSpent: -rewardAmount,
        },
      },
      { new: true }
    );

    if (!posterProfile) return null;

    const tx = await CodeArenaPointTransaction.create({
      organizationId: orgObjId,
      userId: posterId,
      type: 'ISSUE_REFUND',
      amount: rewardAmount,
      balanceAfter: posterProfile.arenaPoints,
      issueId: issueObjId,
      description: `Refunded ${rewardAmount} AP for cancelled Issue #${issueObjId}`,
    });

    return tx;
  }

  /**
   * Get Arena Point Ledger transactions for user.
   */
  public async getTransactions(
    organizationId: string | Types.ObjectId,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: ICodeArenaPointTransaction[]; total: number; page: number; totalPages: number }> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CodeArenaPointTransaction.find({ organizationId: orgObjId, userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CodeArenaPointTransaction.countDocuments({ organizationId: orgObjId, userId }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get Developer Leaderboard ranked by total AP earned, accepted solutions, and reputation score.
   */
  public async getLeaderboard(
    organizationId: string | Types.ObjectId,
    limit: number = 20
  ): Promise<ICodeArenaReputation[]> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;

    return CodeArenaReputation.find({ organizationId: orgObjId })
      .sort({ totalEarned: -1, solutionsAccepted: -1, totalPoints: -1 })
      .limit(limit);
  }
}
