import { Types } from 'mongoose';
import { CodeArenaIssue, ICodeArenaIssue, IssueStatus } from '../../models/CodeArenaIssue';
import { CodeArenaSolution, ICodeArenaSolution } from '../../models/CodeArenaSolution';
import { CodeArenaReputation, ICodeArenaReputation, ReputationBadge } from '../../models/CodeArenaReputation';
import { CodeArenaWalletService } from './codeArena.wallet.service';
import { CodeArenaAIService } from './codeArena.ai.service';
import { CreateIssueDTO, UpdateIssueDTO, SubmitSolutionDTO, IssueFilterQuery } from './codeArena.types';
import { toObjectId } from '../../utils/mongooseHelpers';
import User from '../../models/User';
import { Logger } from '../../utils/logger';

const logger = new Logger('codeArenaService');

export class CodeArenaService {
  constructor(
    private readonly walletService = new CodeArenaWalletService(),
    private readonly aiService = new CodeArenaAIService()
  ) {}

  /**
   * Helper to fetch user name safely
   */
  private async getUserName(userId: string): Promise<string> {
    try {
      const user = await User.findById(userId).select('name');
      return user?.name || 'Anonymous Student';
    } catch {
      return 'Student User';
    }
  }

  /**
   * 1. Create a new technical issue & lock escrow reward.
   */
  public async createIssue(
    organizationId: string | Types.ObjectId,
    posterId: string,
    dto: CreateIssueDTO
  ): Promise<ICodeArenaIssue> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const posterName = await this.getUserName(posterId);

    if (!dto.rewardAmount || dto.rewardAmount < 1) {
      throw new Error('Reward amount must be at least 1 credit.');
    }

    // 1a. Create pending issue document
    const issue = new CodeArenaIssue({
      organizationId: orgObjId,
      visibility: 'ORG_ONLY', // Future-proof for global marketplace
      posterId,
      posterName,
      title: dto.title,
      description: dto.description,
      expectedOutput: dto.expectedOutput,
      currentOutput: dto.currentOutput,
      errorLogs: dto.errorLogs,
      category: dto.category,
      difficulty: dto.difficulty || 'MEDIUM',
      tags: dto.tags || [dto.category.toLowerCase()],
      programmingLanguage: dto.programmingLanguage,
      framework: dto.framework,
      techStack: dto.techStack || [],
      projectType: dto.projectType,
      status: 'OPEN',
      rewardAmount: dto.rewardAmount,
      escrowStatus: 'PENDING',
      githubRepo: dto.githubRepo,
      externalLinks: dto.externalLinks || [],
      attachments: dto.attachments || [],
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
    });

    await issue.save();

    // 1b. Lock escrow from poster wallet (atomically verifies available balance >= rewardAmount)
    try {
      await this.walletService.lockEscrow(orgObjId, posterId, issue._id, dto.rewardAmount);
      issue.escrowStatus = 'LOCKED';
      issue.escrowLockedAt = new Date();
      await issue.save();
    } catch (err: any) {
      // If wallet lock fails, clean up pending issue document
      await CodeArenaIssue.deleteOne({ _id: issue._id });
      throw err;
    }

    // 1c. Trigger AI analysis in background (non-blocking)
    this.aiService
      .analyzeIssue(dto.title, dto.description, dto.errorLogs, dto.category)
      .then(async (aiSuggestions) => {
        const currentIssue = await CodeArenaIssue.findById(issue._id);
        if (currentIssue) {
          currentIssue.aiSuggestions = aiSuggestions;
          if (aiSuggestions.generatedTags?.length > 0) {
            currentIssue.tags = Array.from(new Set([...currentIssue.tags, ...aiSuggestions.generatedTags]));
          }
          if (aiSuggestions.detectedTechnologies?.length > 0) {
            currentIssue.techStack = Array.from(new Set([...currentIssue.techStack, ...aiSuggestions.detectedTechnologies]));
          }
          await currentIssue.save();
        }
      })
      .catch((err) => logger.warn('Background AI issue analysis warning', { error: err }));

    // 1d. Update poster reputation (issuesPosted + 1)
    await this.updateReputationOnIssuePosted(orgObjId, posterId);

    return issue;
  }

  /**
   * 2. Browse & filter issues with pagination
   */
  public async getIssues(
    organizationId: string | Types.ObjectId,
    userId: string,
    query: IssueFilterQuery
  ): Promise<{ issues: ICodeArenaIssue[]; total: number; page: number; totalPages: number }> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const filter: any = {
      organizationId: orgObjId,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.difficulty) {
      filter.difficulty = query.difficulty;
    }

    if (query.myIssuesOnly) {
      filter.posterId = userId;
    }

    if (query.mySolutionsOnly) {
      filter.solverId = userId;
    }

    if (query.savedOnly) {
      filter.savedBy = userId;
    }

    if (query.tags) {
      const tagList = Array.isArray(query.tags) ? query.tags : [query.tags];
      filter.tags = { $in: tagList };
    }

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    let sort: any = { createdAt: -1 };
    if (query.sortBy === 'rewardAmount') {
      sort = { rewardAmount: query.sortOrder === 'asc' ? 1 : -1, createdAt: -1 };
    } else if (query.sortBy === 'viewCount') {
      sort = { viewCount: -1, createdAt: -1 };
    } else if (query.sortBy === 'solutionCount') {
      sort = { solutionCount: -1, createdAt: -1 };
    }

    const [issues, total] = await Promise.all([
      CodeArenaIssue.find(filter).sort(sort).skip(skip).limit(limit),
      CodeArenaIssue.countDocuments(filter),
    ]);

    return {
      issues,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 3. Get single issue detail & increment view count
   */
  public async getIssueById(
    organizationId: string | Types.ObjectId,
    issueId: string | Types.ObjectId
  ): Promise<ICodeArenaIssue> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    const issue = await CodeArenaIssue.findOneAndUpdate(
      { _id: issueObjId, organizationId: orgObjId },
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!issue) {
      throw new Error('Issue not found or access denied.');
    }

    return issue;
  }

  /**
   * 4. Update an OPEN issue (poster only)
   */
  public async updateIssue(
    organizationId: string | Types.ObjectId,
    posterId: string,
    issueId: string | Types.ObjectId,
    dto: UpdateIssueDTO
  ): Promise<ICodeArenaIssue> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    const issue = await CodeArenaIssue.findOne({ _id: issueObjId, organizationId: orgObjId });
    if (!issue) throw new Error('Issue not found.');

    if (issue.posterId !== posterId) {
      throw new Error('Unauthorized: Only the issue poster can edit this issue.');
    }

    if (issue.status !== 'OPEN') {
      throw new Error('Cannot modify an issue that is no longer OPEN.');
    }

    Object.assign(issue, {
      ...(dto.title && { title: dto.title }),
      ...(dto.description && { description: dto.description }),
      ...(dto.expectedOutput !== undefined && { expectedOutput: dto.expectedOutput }),
      ...(dto.currentOutput !== undefined && { currentOutput: dto.currentOutput }),
      ...(dto.errorLogs !== undefined && { errorLogs: dto.errorLogs }),
      ...(dto.category && { category: dto.category }),
      ...(dto.difficulty && { difficulty: dto.difficulty }),
      ...(dto.tags && { tags: dto.tags }),
      ...(dto.programmingLanguage !== undefined && { programmingLanguage: dto.programmingLanguage }),
      ...(dto.framework !== undefined && { framework: dto.framework }),
      ...(dto.techStack && { techStack: dto.techStack }),
      ...(dto.projectType !== undefined && { projectType: dto.projectType }),
      ...(dto.githubRepo !== undefined && { githubRepo: dto.githubRepo }),
      ...(dto.externalLinks && { externalLinks: dto.externalLinks }),
      ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : undefined }),
    });

    await issue.save();
    return issue;
  }

  /**
   * 5. Cancel issue & refund locked escrow to poster
   */
  public async cancelIssue(
    organizationId: string | Types.ObjectId,
    posterId: string,
    issueId: string | Types.ObjectId
  ): Promise<ICodeArenaIssue> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    const issue = await CodeArenaIssue.findOne({ _id: issueObjId, organizationId: orgObjId });
    if (!issue) throw new Error('Issue not found.');

    if (issue.posterId !== posterId) {
      throw new Error('Unauthorized: Only the issue poster can cancel this issue.');
    }

    if (issue.status === 'SOLVED' || issue.status === 'CANCELLED') {
      throw new Error(`Cannot cancel issue with status ${issue.status}.`);
    }

    if (issue.escrowStatus === 'LOCKED') {
      await this.walletService.refundEscrow(orgObjId, posterId, issue._id, issue.rewardAmount);
      issue.escrowStatus = 'REFUNDED';
    }

    issue.status = 'CANCELLED';
    await issue.save();

    await CodeArenaReputation.findOneAndUpdate(
      { organizationId: orgObjId, userId: posterId },
      { $inc: { issuesCancelled: 1 } }
    );

    return issue;
  }

  /**
   * 6. Toggle save / bookmark issue
   */
  public async toggleSaveIssue(
    organizationId: string | Types.ObjectId,
    userId: string,
    issueId: string | Types.ObjectId
  ): Promise<{ saved: boolean }> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    const issue = await CodeArenaIssue.findOne({ _id: issueObjId, organizationId: orgObjId });
    if (!issue) throw new Error('Issue not found.');

    const alreadySaved = issue.savedBy.includes(userId);
    if (alreadySaved) {
      issue.savedBy = issue.savedBy.filter((id) => id !== userId);
    } else {
      issue.savedBy.push(userId);
    }

    await issue.save();
    return { saved: !alreadySaved };
  }

  /**
   * 7. Submit a solution to an open issue
   */
  public async submitSolution(
    organizationId: string | Types.ObjectId,
    submitterId: string,
    issueId: string | Types.ObjectId,
    dto: SubmitSolutionDTO
  ): Promise<ICodeArenaSolution> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    const issue = await CodeArenaIssue.findOne({ _id: issueObjId, organizationId: orgObjId });
    if (!issue) throw new Error('Issue not found.');

    if (issue.status !== 'OPEN' && issue.status !== 'IN_PROGRESS') {
      throw new Error('This issue is closed for new solution submissions.');
    }

    if (issue.posterId === submitterId) {
      throw new Error('You cannot submit a solution to your own issue.');
    }

    // Check if user already submitted a solution
    const existing = await CodeArenaSolution.findOne({ issueId: issueObjId, submitterId });
    if (existing) {
      throw new Error('You have already submitted a solution for this issue.');
    }

    const submitterName = await this.getUserName(submitterId);

    const solution = await CodeArenaSolution.create({
      issueId: issueObjId,
      organizationId: orgObjId,
      submitterId,
      submitterName,
      explanation: dto.explanation,
      codeSnippets: dto.codeSnippets || [],
      githubCommitUrl: dto.githubCommitUrl,
      githubPrUrl: dto.githubPrUrl,
      references: dto.references || [],
      attachments: dto.attachments || [],
    });

    // Update issue state and denormalized solution count
    issue.solutionCount += 1;
    if (issue.status === 'OPEN') {
      issue.status = 'IN_PROGRESS';
    }
    await issue.save();

    // Update submitter reputation
    await this.updateReputationOnSolutionSubmitted(orgObjId, submitterId);

    return solution;
  }

  /**
   * 8. List solutions for an issue
   */
  public async getSolutionsForIssue(
    organizationId: string | Types.ObjectId,
    issueId: string | Types.ObjectId
  ): Promise<ICodeArenaSolution[]> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const issueObjId = typeof issueId === 'string' ? toObjectId(issueId) : issueId;

    return CodeArenaSolution.find({ issueId: issueObjId, organizationId: orgObjId }).sort({
      isAccepted: -1,
      createdAt: 1,
    });
  }

  /**
   * 9. Accept solution (Poster only) -> Release Escrow -> Mark Solved -> Award Reputation
   */
  public async acceptSolution(
    organizationId: string | Types.ObjectId,
    posterId: string,
    solutionId: string | Types.ObjectId
  ): Promise<{ issue: ICodeArenaIssue; solution: ICodeArenaSolution }> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const solutionObjId = typeof solutionId === 'string' ? toObjectId(solutionId) : solutionId;

    const solution = await CodeArenaSolution.findOne({ _id: solutionObjId, organizationId: orgObjId });
    if (!solution) throw new Error('Solution not found.');

    const issue = await CodeArenaIssue.findOne({ _id: solution.issueId, organizationId: orgObjId });
    if (!issue) throw new Error('Associated issue not found.');

    if (issue.posterId !== posterId) {
      throw new Error('Unauthorized: Only the issue poster can accept a solution.');
    }

    if (issue.status === 'SOLVED') {
      throw new Error('This issue has already been solved and closed.');
    }

    if (issue.escrowStatus !== 'LOCKED') {
      throw new Error('Escrow reward is not currently locked for this issue.');
    }

    // 9a. Release escrow reward (Poster locked -> Solver balance)
    await this.walletService.releaseEscrow(
      orgObjId,
      posterId,
      solution.submitterId,
      issue._id,
      solution._id,
      issue.rewardAmount
    );

    // 9b. Update solution & issue state
    solution.isAccepted = true;
    solution.acceptedAt = new Date();
    await solution.save();

    issue.status = 'SOLVED';
    issue.escrowStatus = 'RELEASED';
    issue.acceptedSolutionId = solution._id;
    issue.solverId = solution.submitterId;
    issue.solvedAt = new Date();
    await issue.save();

    // 9c. Award reputation & badges to poster and solver
    await this.updateReputationOnSolutionAccepted(
      orgObjId,
      posterId,
      solution.submitterId,
      issue.rewardAmount,
      issue.tags
    );

    return { issue, solution };
  }

  /**
   * 10. Get User Reputation & Developer Stats
   */
  public async getReputation(
    organizationId: string | Types.ObjectId,
    userId: string
  ): Promise<ICodeArenaReputation> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;

    let rep = await CodeArenaReputation.findOne({ organizationId: orgObjId, userId });

    if (!rep) {
      rep = await CodeArenaReputation.create({
        organizationId: orgObjId,
        userId,
        totalPoints: 0,
        issuesPosted: 0,
        issuesSolved: 0,
        issuesCancelled: 0,
        solutionsSubmitted: 0,
        solutionsAccepted: 0,
        acceptanceRate: 0,
        totalRewardsEarned: 0,
        totalRewardsSpent: 0,
        favoriteTechnologies: [],
        badges: [],
      });
    }

    return rep;
  }

  /**
   * 11. Get Dashboard Module Metrics
   */
  public async getDashboardStats(
    organizationId: string | Types.ObjectId,
    userId: string
  ): Promise<{
    openIssues: number;
    solvedToday: number;
    activeDevelopers: number;
    totalRewardPool: number;
    myWallet: any;
    myReputation: any;
  }> {
    const orgObjId = typeof organizationId === 'string' ? toObjectId(organizationId) : organizationId;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [openIssues, solvedToday, rewardPoolAgg, activeDevs, myWallet, myReputation] = await Promise.all([
      CodeArenaIssue.countDocuments({ organizationId: orgObjId, status: 'OPEN' }),
      CodeArenaIssue.countDocuments({ organizationId: orgObjId, status: 'SOLVED', solvedAt: { $gte: startOfToday } }),
      CodeArenaIssue.aggregate([
        { $match: { organizationId: orgObjId, status: { $in: ['OPEN', 'IN_PROGRESS'] } } },
        { $group: { _id: null, total: { $sum: '$rewardAmount' } } },
      ]),
      CodeArenaReputation.countDocuments({ organizationId: orgObjId }),
      this.walletService.getOrCreateWallet(orgObjId, userId),
      this.getReputation(orgObjId, userId),
    ]);

    const totalRewardPool = rewardPoolAgg[0]?.total || 0;

    return {
      openIssues,
      solvedToday,
      activeDevelopers: activeDevs || 1,
      totalRewardPool,
      myWallet,
      myReputation,
    };
  }

  // ──────────────────────────────────────────────
  // Internal Reputation Mechanics
  // ──────────────────────────────────────────────

  private async updateReputationOnIssuePosted(orgObjId: Types.ObjectId, posterId: string): Promise<void> {
    const rep = await this.getReputation(orgObjId, posterId);
    rep.issuesPosted += 1;
    rep.totalPoints += 10; // +10 points for posting an issue

    if (!rep.badges.includes('FIRST_ISSUE') && rep.issuesPosted >= 1) {
      rep.badges.push('FIRST_ISSUE');
    }
    if (!rep.badges.includes('ACTIVE_POSTER') && rep.issuesPosted >= 10) {
      rep.badges.push('ACTIVE_POSTER');
    }

    await rep.save();
  }

  private async updateReputationOnSolutionSubmitted(orgObjId: Types.ObjectId, submitterId: string): Promise<void> {
    const rep = await this.getReputation(orgObjId, submitterId);
    rep.solutionsSubmitted += 1;
    rep.totalPoints += 5; // +5 points for attempting a solution
    rep.acceptanceRate = Math.round((rep.solutionsAccepted / rep.solutionsSubmitted) * 100);
    await rep.save();
  }

  private async updateReputationOnSolutionAccepted(
    orgObjId: Types.ObjectId,
    posterId: string,
    solverId: string,
    rewardAmount: number,
    tags: string[]
  ): Promise<void> {
    // 1. Poster gets points for closing issue
    const posterRep = await this.getReputation(orgObjId, posterId);
    posterRep.totalPoints += 15;
    posterRep.totalRewardsSpent += rewardAmount;
    await posterRep.save();

    // 2. Solver gets reputation points + badges
    const solverRep = await this.getReputation(orgObjId, solverId);
    solverRep.solutionsAccepted += 1;
    solverRep.issuesSolved += 1;
    solverRep.totalRewardsEarned += rewardAmount;
    solverRep.totalPoints += 50 + Math.floor(rewardAmount / 10); // +50 points base + 1 point per 10 credits
    solverRep.acceptanceRate = Math.round((solverRep.solutionsAccepted / Math.max(1, solverRep.solutionsSubmitted)) * 100);

    // Update favorite technologies
    const updatedTechs = Array.from(new Set([...solverRep.favoriteTechnologies, ...tags])).slice(0, 10);
    solverRep.favoriteTechnologies = updatedTechs;

    // Badges evaluation
    const newBadges: ReputationBadge[] = [];
    if (!solverRep.badges.includes('FIRST_SOLVE') && solverRep.solutionsAccepted >= 1) newBadges.push('FIRST_SOLVE');
    if (!solverRep.badges.includes('HELPFUL_MEMBER') && solverRep.solutionsAccepted >= 5) newBadges.push('HELPFUL_MEMBER');
    if (!solverRep.badges.includes('PROBLEM_SOLVER') && solverRep.solutionsAccepted >= 10) newBadges.push('PROBLEM_SOLVER');
    if (!solverRep.badges.includes('TOP_CONTRIBUTOR') && solverRep.solutionsAccepted >= 25) newBadges.push('TOP_CONTRIBUTOR');
    if (!solverRep.badges.includes('EXPERT_SOLVER') && solverRep.solutionsAccepted >= 50) newBadges.push('EXPERT_SOLVER');
    if (!solverRep.badges.includes('COMMUNITY_PILLAR') && solverRep.solutionsAccepted >= 100) newBadges.push('COMMUNITY_PILLAR');
    if (!solverRep.badges.includes('HIGH_EARNER') && solverRep.totalRewardsEarned >= 5000) newBadges.push('HIGH_EARNER');

    if (newBadges.length > 0) {
      solverRep.badges = Array.from(new Set([...solverRep.badges, ...newBadges]));
    }

    await solverRep.save();
  }
}
