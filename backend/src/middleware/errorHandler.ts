import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { AppError } from '../utils/errors';

/**
 * Global error handling middleware
 * Must be the last middleware registered
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  // AppError instances have custom status codes
  if (error instanceof AppError) {
    return sendError(res, error.statusCode, error.message, error);
  }

  // Default: Internal Server Error
  return sendError(res, 500, 'Internal server error', error);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response
) => {
  return sendError(res, 404, `Route ${req.originalUrl} not found`);
};
