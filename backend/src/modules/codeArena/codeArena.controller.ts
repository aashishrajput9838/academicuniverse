import { Request, Response, NextFunction } from 'express';
import { CodeArenaService } from './codeArena.service';
import { CodeArenaPointsService } from './codeArena.points.service';
import { sendResponse } from '../../utils/response';
import { GridFSProvider } from '../../storage/GridFSProvider';

export class CodeArenaController {
  constructor(
    private readonly service = new CodeArenaService(),
    private readonly pointsService = new CodeArenaPointsService()
  ) {}

  // 1. Create Issue
  public createIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      if (!userId || !organizationId) {
        return res.status(401).json({ success: false, message: 'Authentication & Organization required' });
      }

      const issue = await this.service.createIssue(organizationId, userId, req.body);
      const message = issue.rewardAmount > 0
        ? `Issue published! ${issue.rewardAmount} Arena Points deducted.`
        : 'Community Help issue published!';
      return sendResponse(res, 201, issue, message);
    } catch (err: any) {
      next(err);
    }
  };

  // 2. Browse / Search / Filter Issues
  public getIssues = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      if (!userId || !organizationId) {
        return res.status(401).json({ success: false, message: 'Authentication & Organization required' });
      }

      const result = await this.service.getIssues(organizationId, userId, req.query as any);
      return sendResponse(res, 200, result, 'Issues retrieved successfully.');
    } catch (err: any) {
      next(err);
    }
  };

  // 3. Get Issue Detail
  public getIssueById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const issue = await this.service.getIssueById(organizationId, id);
      return sendResponse(res, 200, issue, 'Issue detail retrieved successfully.');
    } catch (err: any) {
      next(err);
    }
  };

  // 4. Update Issue
  public updateIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      const issue = await this.service.updateIssue(organizationId, userId, id, req.body);
      return sendResponse(res, 200, issue, 'Issue updated successfully.');
    } catch (err: any) {
      next(err);
    }
  };

  // 5. Cancel Issue & Refund AP
  public cancelIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      const issue = await this.service.cancelIssue(organizationId, userId, id);
      const message = issue.rewardAmount > 0
        ? `Issue cancelled. ${issue.rewardAmount} AP refunded to your balance.`
        : 'Community Help issue cancelled.';
      return sendResponse(res, 200, issue, message);
    } catch (err: any) {
      next(err);
    }
  };

  // 6. Toggle Save Issue
  public toggleSaveIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const { id } = req.params;

      const result = await this.service.toggleSaveIssue(organizationId, userId, id);
      return sendResponse(res, 200, result, result.saved ? 'Issue bookmarked.' : 'Bookmark removed.');
    } catch (err: any) {
      next(err);
    }
  };

  // 7. Submit Solution
  public submitSolution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const { issueId } = req.params;

      const solution = await this.service.submitSolution(organizationId, userId, issueId, req.body);
      return sendResponse(res, 201, solution, 'Solution submitted successfully.');
    } catch (err: any) {
      next(err);
    }
  };

  // 8. List Solutions for Issue
  public getSolutionsForIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const { issueId } = req.params;

      const solutions = await this.service.getSolutionsForIssue(organizationId, issueId);
      return sendResponse(res, 200, solutions, 'Solutions retrieved successfully.');
    } catch (err: any) {
      next(err);
    }
  };

  // 9. Accept Solution & Award AP
  public acceptSolution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const { solutionId } = req.params;

      const result = await this.service.acceptSolution(organizationId, userId, solutionId);
      const message = result.issue.rewardAmount > 0
        ? `Solution accepted! ${result.issue.rewardAmount} AP transferred to solver.`
        : 'Solution accepted! Issue marked as solved.';
      return sendResponse(res, 200, result, message);
    } catch (err: any) {
      next(err);
    }
  };

  // 10. Get My Points Profile (Includes 1000 AP Welcome Bonus auto-grant)
  public getMyPointsProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      const result = await this.pointsService.getOrCreatePointsProfile(organizationId, userId);
      return sendResponse(res, 200, result, 'Points profile retrieved.');
    } catch (err: any) {
      next(err);
    }
  };

  // 11. Claim Daily Login Reward (+5 AP & Streak Bonus)
  public claimDailyReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      const result = await this.pointsService.checkAndGrantDailyReward(organizationId, userId);
      const message = result.claimed
        ? `Claimed +${result.rewardAmount} AP daily reward! Streak: ${result.currentStreak} days.`
        : 'Daily reward already claimed today.';
      return sendResponse(res, 200, result, message);
    } catch (err: any) {
      next(err);
    }
  };

  // 12. Get AP Ledger Transactions
  public getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await this.pointsService.getTransactions(organizationId, userId, page, limit);
      return sendResponse(res, 200, result, 'AP ledger transactions retrieved.');
    } catch (err: any) {
      next(err);
    }
  };

  // 13. Get Leaderboard
  public getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const limit = Number(req.query.limit) || 20;

      const leaderboard = await this.pointsService.getLeaderboard(organizationId, limit);
      return sendResponse(res, 200, leaderboard, 'Leaderboard retrieved successfully.');
    } catch (err: any) {
      next(err);
    }
  };

  // 14. Dashboard Stats
  public getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      const stats = await this.service.getDashboardStats(organizationId, userId);
      return sendResponse(res, 200, stats, 'Code Arena dashboard stats retrieved.');
    } catch (err: any) {
      next(err);
    }
  };

  // 15. Upload Attachment
  public uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      const gridFs = new GridFSProvider();
      const { fileId } = await gridFs.store(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId,
        organizationId
      );

      return sendResponse(
        res,
        201,
        {
          storageId: fileId,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
        'Attachment uploaded successfully.'
      );
    } catch (err: any) {
      next(err);
    }
  };

  // 16. Stream Attachment
  public streamAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storageId } = req.params;
      const gridFs = new GridFSProvider();
      const buffer = await gridFs.getFile(storageId);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="attachment_${storageId}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (err: any) {
      next(err);
    }
  };
}
