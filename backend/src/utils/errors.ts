/**
 * Custom Error Classes
 */

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 500);
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string) {
    super(message, 502);
    Object.setPrototypeOf(this, ExternalAPIError.prototype);
  }
}
