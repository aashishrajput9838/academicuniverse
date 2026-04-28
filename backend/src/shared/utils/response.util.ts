/**
 * Response Utility
 * Standardized API response formatting
 */

import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Send success response
 */
export function sendResponse<T>(
  res: Response,
  statusCode: number,
  data: T,
  message: string = 'Success'
): void {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  error?: string
): void {
  const response: ApiResponse = {
    success: false,
    message,
    error,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}
