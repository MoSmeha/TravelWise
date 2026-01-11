/**
 * Zod Validation Middleware
 * Validates request body, query, or params against Zod schemas
 */

import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

/**
 * Validation target - which part of the request to validate
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Create validation middleware for a Zod schema
 * @param schema - Zod schema to validate against (supports ZodObject and ZodEffects)
 * @param target - Which part of request to validate (default: 'body')
 */
export function validate(schema: ZodTypeAny, target: ValidationTarget = 'body') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[target];
      const validated = await schema.parseAsync(data);
      
      // Replace request data with parsed/transformed values
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Combine multiple validation middlewares
 */
export function validateMultiple(
  validations: Array<{ schema: ZodTypeAny; target: ValidationTarget }>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      for (const { schema, target } of validations) {
        const data = req[target];
        const validated = await schema.parseAsync(data);
        req[target] = validated;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
