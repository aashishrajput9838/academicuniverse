"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const response_1 = require("../utils/response");
const errors_1 = require("../utils/errors");
/**
 * Global error handling middleware
 * Must be the last middleware registered
 */
const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);
    // AppError instances have custom status codes
    if (error instanceof errors_1.AppError) {
        return (0, response_1.sendError)(res, error.statusCode, error.message, error);
    }
    // Default: Internal Server Error
    return (0, response_1.sendError)(res, 500, 'Internal server error', error);
};
exports.errorHandler = errorHandler;
/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
    return (0, response_1.sendError)(res, 404, `Route ${req.originalUrl} not found`);
};
exports.notFoundHandler = notFoundHandler;
