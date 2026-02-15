/**
 * Async route handler wrapper
 * Automatically catches errors and passes to next middleware
 */
export const catchAsync = (fn: Function) => {
  return (...args: any[]) => {
    Promise.resolve(fn(...args)).catch(args[args.length - 1]);
  };
};

/**
 * Format API response
 */
export const sendResponse = (
  res: any,
  statusCode: number,
  data: any,
  message: string = 'Success'
) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  });
};

/**
 * Format API error response
 */
export const sendError = (
  res: any,
  statusCode: number,
  message: string,
  error?: any
) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
  });
};
