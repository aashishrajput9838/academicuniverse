import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const performanceMonitorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    logger.http(`${method} ${originalUrl}`, {
      requestId: req.requestId,
      method,
      url: originalUrl,
      statusCode,
      durationMs: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  });

  next();
};
