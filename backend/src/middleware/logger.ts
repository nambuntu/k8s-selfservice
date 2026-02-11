import { Request, Response, NextFunction } from 'express';

/**
 * Simple request logging middleware
 * Logs HTTP method, path, status code, and response time
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Capture original end function
  const originalEnd = res.end;

  // Override end function to log after response is sent
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusEmoji = statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✓';

    console.log(
      `${statusEmoji} ${req.method} ${req.path} - ${statusCode} - ${duration}ms`
    );

    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * Log application events (info, warn, error)
 */
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`ℹ️ [INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },

  warn: (message: string, meta?: any) => {
    console.warn(`⚠️ [WARN] ${message}`, meta ? JSON.stringify(meta) : '');
  },

  error: (message: string, error?: any) => {
    console.error(`❌ [ERROR] ${message}`, error?.message || error || '');
    if (error?.stack && process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
  },
};
