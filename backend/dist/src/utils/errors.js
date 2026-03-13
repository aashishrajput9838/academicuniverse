"use strict";
/**
 * Custom Error Classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalAPIError = exports.ConfigurationError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403);
        Object.setPrototypeOf(this, AuthorizationError.prototype);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
exports.ConflictError = ConflictError;
class ConfigurationError extends AppError {
    constructor(message) {
        super(message, 500);
        Object.setPrototypeOf(this, ConfigurationError.prototype);
    }
}
exports.ConfigurationError = ConfigurationError;
class ExternalAPIError extends AppError {
    constructor(message) {
        super(message, 502);
        Object.setPrototypeOf(this, ExternalAPIError.prototype);
    }
}
exports.ExternalAPIError = ExternalAPIError;
