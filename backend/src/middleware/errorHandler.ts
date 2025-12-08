import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });
  
  // Determine status code
  let status = 500;
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    status = 400;
  } else if (err.message.includes('not found') || err.message.includes('Not Found')) {
    status = 404;
  }
  
  res.status(status).json({
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

