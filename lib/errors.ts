/**
 * Typed application errors. Their messages are safe to show to users;
 * anything else is logged and replaced with a generic message.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the highlighted fields.", fieldErrors?: Record<string, string[]>) {
    super(message, 422, fieldErrors);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to do that.") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find what you were looking for.") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "That already exists.") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts. Please wait a moment and try again.") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

export const GENERIC_ERROR = "Something went wrong. Please try again.";
