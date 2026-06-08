import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';

/**
 * Configured Helmet middleware with HSTS, CSP, and other security headers.
 * Requirement 12.3: Enforce HTTPS and set Strict-Transport-Security headers.
 */
export const securityHeadersMiddleware = helmet({
  // Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  // Content-Security-Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  // X-Frame-Options: DENY
  frameguard: { action: 'deny' },
  // X-Content-Type-Options: nosniff
  noSniff: true,
  // Referrer-Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: { allow: false },
});

/**
 * HTTPS redirect middleware for production environments.
 * Redirects HTTP requests to HTTPS using the x-forwarded-proto header
 * (set by reverse proxies like Nginx, ALB, etc.).
 */
export function httpsRedirectMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
    return;
  }
  next();
}
