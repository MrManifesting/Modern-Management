/**
 * Standardized error handling utilities
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Business Logic
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  INVALID_STATE = 'INVALID_STATE',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SHOPIFY_ERROR = 'SHOPIFY_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

export interface ErrorDetails {
  field?: string;
  constraint?: string;
  value?: any;
  [key: string]: any;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: ErrorDetails;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: ErrorDetails
  ) {
    super(message);

    // Ensure the name of this error is the same as the class name
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;

    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, details);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ErrorCode.UNAUTHORIZED, 401, true);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ErrorCode.FORBIDDEN, 403, true);
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, ErrorCode.NOT_FOUND, 404, true, { resource, identifier });
  }
}

/**
 * Conflict error (e.g., duplicate resource)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, ErrorCode.ALREADY_EXISTS, 409, true, details);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: Error) {
    super(
      `${service} error: ${message}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      502,
      true,
      { service, originalError: originalError?.message }
    );
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorCode.INTERNAL_ERROR,
      500,
      false
    );
  }

  return new AppError(
    'An unexpected error occurred',
    ErrorCode.INTERNAL_ERROR,
    500,
    false
  );
}

/**
 * Logger for errors (will use proper logging service in production)
 */
export function logError(error: unknown, context?: string) {
  const appError = toAppError(error);
  const logPrefix = context ? `[${context}]` : '';

  if (process.env.NODE_ENV === 'production') {
    // In production, use structured logging
    console.error(logPrefix, {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      timestamp: appError.timestamp,
      details: appError.details,
    });
  } else {
    // In development, log full error with stack
    console.error(logPrefix, appError);
  }
}
