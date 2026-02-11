import { Request, Response, NextFunction } from 'express';
import { OperationalError } from './errorHandler';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * DNS-compliant name validator
 * Regex: ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$
 */
export function validateWebsiteName(name: string): ValidationResult {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Website name is required' };
  }

  if (name.length > 63) {
    return { valid: false, error: 'Website name must be 63 characters or less' };
  }

  const dnsRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!dnsRegex.test(name)) {
    return {
      valid: false,
      error: 'Website name must be lowercase, start and end with alphanumeric, and contain only alphanumeric and hyphens',
    };
  }

  return { valid: true };
}

/**
 * HTML content size validator (max 100KB)
 */
export function validateHtmlContent(content: string): ValidationResult {
  if (!content || content.length === 0) {
    return { valid: false, error: 'HTML content is required' };
  }

  const maxSize = 102400; // 100KB in bytes
  const byteSize = Buffer.byteLength(content, 'utf8');

  if (byteSize > maxSize) {
    return {
      valid: false,
      error: `HTML content must be ${maxSize} bytes (100KB) or less. Current size: ${byteSize} bytes`,
    };
  }

  return { valid: true };
}

/**
 * Middleware to validate website creation request
 */
export const validateWebsiteCreation = (req: Request, res: Response, next: NextFunction): void => {
  const { websiteName, websiteTitle, htmlContent } = req.body;

  // Validate website name
  const nameValidation = validateWebsiteName(websiteName);
  if (!nameValidation.valid) {
    throw new OperationalError(nameValidation.error!, 400);
  }

  // Validate website title
  if (!websiteTitle || websiteTitle.trim().length === 0) {
    throw new OperationalError('Website title is required', 400);
  }

  if (websiteTitle.length > 255) {
    throw new OperationalError('Website title must be 255 characters or less', 400);
  }

  // Validate HTML content
  const contentValidation = validateHtmlContent(htmlContent);
  if (!contentValidation.valid) {
    throw new OperationalError(contentValidation.error!, 400);
  }

  next();
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
