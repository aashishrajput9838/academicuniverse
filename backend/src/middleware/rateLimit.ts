import { Request, Response, NextFunction } from 'express';
import { RateLimitAttempt } from '../models/RateLimitAttempt';
import { logger } from '../utils/logger';

export interface RateLimitOptions {
  maxAttempts: number;
  windowMinutes: number;
  endpoint: string;
}

export const rateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const organizationId = (req as any).organizationId;
    if (!organizationId) {
      return res.status(403).json({ success: false, message: 'Organization context required' });
    }

    const now = new Date();
    const windowThreshold = new Date(now.getTime() - options.windowMinutes * 60 * 1000);

    try {
      const record = await RateLimitAttempt.findOneAndUpdate(
        {
          organizationId,
          endpoint: options.endpoint,
          windowCreatedAt: { $gte: windowThreshold },
          attempts: { $lt: options.maxAttempts },
        },
        {
          $inc: { attempts: 1 },
          $set: { lastAttemptAt: now },
          $setOnInsert: { organizationId, endpoint: options.endpoint, windowCreatedAt: now, lastAttemptAt: now },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      if (!record || record.attempts > options.maxAttempts) {
        const retryAfter = Math.ceil((record?.windowCreatedAt?.getTime() || now.getTime()) + options.windowMinutes * 60 * 1000 - now.getTime()) / 1000;
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          retryAfter: Math.max(0, retryAfter),
        });
      }

      next();
    } catch (error: any) {
      logger.error('[RateLimit] Middleware error', { error: error.message });
      next(error);
    }
  };
};
