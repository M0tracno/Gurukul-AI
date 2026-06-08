import { Request, Response, NextFunction } from 'express';

/**
 * HTML entity encoding map. Only encodes the 5 characters that have special
 * meaning in HTML, which ensures idempotence — encoded forms like &amp; won't
 * be double-encoded because & is encoded to &amp; only when it's a raw &.
 *
 * To guarantee idempotence we decode first, then re-encode. This means
 * sanitize(sanitize(x)) === sanitize(x) regardless of input.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const ENTITY_TO_CHAR: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

/**
 * Sanitizes a string by removing HTML/script content and encoding entities.
 * This function is pure and idempotent: sanitize(sanitize(x)) === sanitize(x).
 *
 * Steps:
 * 1. Remove <script> tags and their content
 * 2. Remove <style> tags and their content
 * 3. Remove all remaining HTML tags
 * 4. Remove javascript: protocol URIs
 * 5. Decode existing HTML entities (to avoid double-encoding)
 * 6. Encode HTML entities
 */
export function sanitizeInput(input: string): string {
  let result = input;

  // 1. Remove script tags and their content (case-insensitive, handles attributes)
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Remove style tags and their content
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 3. Remove all remaining HTML tags (including self-closing, comments, etc.)
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  result = result.replace(/<[^>]*>/g, '');

  // 4. Remove javascript: protocol patterns (case-insensitive, with optional whitespace)
  result = result.replace(/javascript\s*:/gi, '');

  // 5. Decode existing HTML entities to normalize (prevents double-encoding)
  result = result.replace(
    /&(?:amp|lt|gt|quot|#x27|#39);/gi,
    (match) => ENTITY_TO_CHAR[match.toLowerCase()] ?? match
  );

  // 6. Encode HTML special characters
  result = result.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);

  return result;
}

/**
 * Recursively sanitizes all string values in an object or array.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeInput(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Express middleware that sanitizes all string values in req.body, req.query,
 * and req.params by stripping HTML tags, script content, and encoding entities.
 * Mutates the request objects in place before passing to next().
 */
export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitizeValue(req.query) as Record<string, unknown>;
    for (const [key, val] of Object.entries(sanitizedQuery)) {
      (req.query as Record<string, unknown>)[key] = val;
    }
  }

  if (req.params && typeof req.params === 'object') {
    const sanitizedParams = sanitizeValue(req.params) as Record<string, string>;
    for (const [key, val] of Object.entries(sanitizedParams)) {
      req.params[key] = val;
    }
  }

  next();
}
