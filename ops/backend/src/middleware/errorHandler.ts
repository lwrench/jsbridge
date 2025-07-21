import { Request, Response, NextFunction } from 'express';

export interface ErrorWithCode extends Error {
  code?: number;
  statusCode?: number;
}

export const errorHandler = (
  err: ErrorWithCode,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const code = err.code || err.statusCode || 2001;
  const message = err.message || 'Internal server error';
  
  console.error(`Error ${code}:`, message, err.stack);

  res.status(code >= 2000 ? 500 : 400).json({
    code,
    message,
    data: null,
    timestamp: Date.now(),
    requestId: (req.headers['x-request-id'] as string) || 'unknown'
  });
};