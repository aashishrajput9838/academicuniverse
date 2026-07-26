import { Request, Response, NextFunction } from 'express';
import { RateLimitAttempt } from '../models/RateLimitAttempt';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export interface RateLimitOptions {
  maxAttempts: number;
  windowMinutes: number;
  endpoint: string;
}

export const rateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const organizationId = (req as any).organizationId;
    if (!organizationId) {
      return sendError(res, 403, 'Organization context required');
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - options.windowMinutes * 60 * 1000);

    try {
      const record = await RateLimitAttempt.findOne({
        organizationId,
        endpoint: options.endpoint,
        windowStart: { $gte: windowStart },
      });

      if (record) {
        if (record.attempts >= options.maxAttempts) {
          const retryAfter = Math.ceil((record.windowStart.getTime() + options.windowMinutes * 60 * 1000 - now.getTime()) / 1000);
          return sendError(res, 429, 'Rate limit exceeded', { retryAfter: Math.max(0, retryAfter) });
        }

        await RateLimitAttempt.findOneAndUpdate(
          { _id: record._id },
          { $inc: { attempts: 1 }, lastAttemptAt: now }
        );
      } else {
        await RateLimitAttempt.create({
          organizationId,
          endpoint: options.endpoint,
          attempts: 1,
          windowStart: now,
          lastAttemptAt: now,
        });
      }

      next();
    } catch (error: any) {
      logger.error('[RateLimit] Middleware error', { error: error.message });
      next(error);
    }
  };
};
