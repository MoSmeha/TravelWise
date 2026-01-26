

import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';


type ValidationTarget = 'body' | 'query' | 'params';

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
