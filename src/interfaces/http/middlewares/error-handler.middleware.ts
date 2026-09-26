import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { AppError } from '../../../domain/errors';

export const errorHandlerMiddleware: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle Body-Parser JSON syntax errors
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON payload provided in request body.'
      }
    });
    return;
  }

  // Handle Domain / Application AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  console.error('[Unhandled Internal Error]:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred.'
    }
  });
};
