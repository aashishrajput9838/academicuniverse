"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendResponse = exports.catchAsync = void 0;
/**
 * Async route handler wrapper
 * Automatically catches errors and passes to next middleware
 */
const catchAsync = (fn) => {
    return (...args) => {
        Promise.resolve(fn(...args)).catch(args[args.length - 1]);
    };
};
exports.catchAsync = catchAsync;
/**
 * Format API response
 */
const sendResponse = (res, statusCode, data, message = 'Success') => {
    return res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data,
    });
};
exports.sendResponse = sendResponse;
/**
 * Format API error response
 */
const sendError = (res, statusCode, message, error) => {
    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
};
exports.sendError = sendError;
