import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../../../domain/errors';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== 'object') {
      throw new ValidationError('Request body must be a valid JSON object.');
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      const message = firstError ? `${firstError.path.join('.') || 'body'}: ${firstError.message}` : 'Validation error.';
      throw new ValidationError(message);
    }

    req.body = result.data;
    next();
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const firstError = result.error.issues[0];
      const message = firstError ? `${firstError.path.join('.') || 'param'}: ${firstError.message}` : 'Invalid path parameter.';
      throw new ValidationError(message);
    }

    req.params = result.data;
    next();
  };
};

// Zod schemas matching exact specification
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export const bookSlotBodySchema = z.object({
  slotId: z
    .string({ required_error: 'slotId is required.' })
    .regex(uuidRegex, 'slotId must be a valid UUID.'),
  customerName: z
    .unknown()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(z.string().min(1, 'customerName must be a non-empty string.')),
  customerEmail: z
    .unknown()
    .transform((val) => (typeof val === 'string' ? val.trim() : ''))
    .pipe(z.string().email('customerEmail must have valid email syntax.'))
});

export const bookingIdParamSchema = z.object({
  bookingId: z
    .string({ required_error: 'bookingId is required.' })
    .regex(uuidRegex, 'bookingId must be a valid UUID.')
});
