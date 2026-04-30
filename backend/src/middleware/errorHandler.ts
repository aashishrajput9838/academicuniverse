import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { AppError } from '../utils/errors';
import { forwardErrorToAI } from '../services/logForwarder';
import logger from '../utils/logger';

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
  logger.error('Request error', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    error: error.message,
    stack: error.stack,
  });

  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.message) {
    message = error.message;
  }

  // Forward to AI Log Analyzer
  if (statusCode >= 400) {
    forwardErrorToAI(req.originalUrl, req.method, statusCode, message, error.stack);
  }

  return sendError(res, statusCode, message, error);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response
) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
  });
  return sendError(res, 404, `Route ${req.originalUrl} not found`);
};
