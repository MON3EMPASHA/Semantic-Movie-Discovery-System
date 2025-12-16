import { logger as defaultLogger } from './logger';
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const validateInput = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      const message = error.errors?.[0]?.message || 'Invalid input';
      defaultLogger.warn('Input validation failed', { error: message, body: req.body });
      throw new AppError(400, `Validation error: ${message}`);
    }
  };
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .slice(0, 1000) // Limit length
    .replace(/<script|<iframe|javascript:/gi, '') // Remove dangerous tags
    .replace(/[<>]/g, ''); // Remove angle brackets
};

export const createErrorResponse = (error: Error | AppError, isDevelopment: boolean) => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      ...(isDevelopment && { stack: error.stack }),
    };
  }

  // Unknown error
  return {
    statusCode: 500,
    message: 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
  };
};
