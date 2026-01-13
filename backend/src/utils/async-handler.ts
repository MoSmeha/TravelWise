/**
 * Async Handler Utility
 * Wraps async route handlers to eliminate repetitive try-catch blocks
 * Errors are automatically passed to Express error handling middleware
 */

import { NextFunction, Request, Response } from 'express';

/**
 * Type for async request handlers
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Wraps an async route handler to catch errors and forward them to error middleware
 * 
 * Before:
 * ```typescript
 * export async function getUsers(req, res) {
 *   try {
 *     const users = await userService.getAll();
 *     res.json(users);
 *   } catch (error) {
 *     console.error('Error:', error);
 *     res.status(500).json({ error: 'Failed' });
 *   }
 * }
 * ```
 * 
 * After:
 * ```typescript
 * export const getUsers = asyncHandler(async (req, res) => {
 *   const users = await userService.getAll();
 *   res.json(users);
 * });
 * ```
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Standard API error class for consistent error responses
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: any) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message: string = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  static internal(message: string = 'Internal server error') {
    return new ApiError(500, message);
  }
}

/**
 * Express error handling middleware
 * Add this at the end of your middleware chain:
 * app.use(errorHandler);
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(`Error: ${err.message}`, err.stack);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Default to 500 for unknown errors
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
