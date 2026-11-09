import { Request, Response, NextFunction } from 'express';
import { extractSessionToken, generateCsrfToken, SESSION_COOKIE_NAME } from '../services/AuthService';

const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

/**
 * Resolves the list of approved application origins from environment variables
 * and standard local development ports.
 */
export function resolveAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();

  for (const local of DEFAULT_LOCAL_ORIGINS) {
    allowed.add(local.toLowerCase().trim());
  }

  const envOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.APP_URL,
    process.env.FRONTEND_URL
  ];

  for (const entry of envOrigins) {
    if (typeof entry === 'string' && entry.trim()) {
      const parts = entry.split(',');
      for (const p of parts) {
        const cleaned = p.trim().replace(/\/+$/, '').toLowerCase();
        if (cleaned) allowed.add(cleaned);
      }
    }
  }

  return allowed;
}

/**
 * Checks whether an incoming request Origin is permitted under application policy.
 */
export function isOriginAllowed(origin?: string | null): boolean {
  if (!origin || typeof origin !== 'string') return true;
  const normalized = origin.trim().replace(/\/+$/, '').toLowerCase();
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(normalized)) {
    return true;
  }
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(normalized)) {
    return true;
  }
  const allowed = resolveAllowedOrigins();
  return allowed.has(normalized);
}

/**
 * Applies strict enterprise HTTP security headers to all responses.
 */
export function applySecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // 1. Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 2. Prevent clickjacking / frame embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 3. Cross-Site Scripting (XSS) filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 4. Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 5. Restrict dangerous browser features
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

  // 6. Content Security Policy (CSP)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'self'"
  );

  // 7. HTTP Strict Transport Security (HSTS) in production or HTTPS
  const isHttps =
    process.env.NODE_ENV === 'production' ||
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https';

  if (isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Express CORS middleware enforcing approved application origins.
 * Rejects unauthorized cross-origin requests and preflights with HTTP 403.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): any {
  const origin = req.headers.origin;

  if (origin) {
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Role, X-User-Id, X-Org-Id'
      );
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours preflight cache

      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
    } else {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'CORS_ORIGIN_DENIED',
        message: `CORS policy violation: Origin "${origin}" is not authorized.`
      });
    }
  } else if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

/**
 * State-changing CSRF protection middleware.
 * Verifies Origin, Referer, and CSRF token on cookie-authenticated mutating requests.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): any {
  const method = req.method.toUpperCase();
  const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  if (!isMutating) {
    return next();
  }

  // Exempt public unauthenticated sign-in endpoint
  const path = req.path || req.url || '';
  if (path.endsWith('/auth/login') || path === '/login') {
    return next();
  }

  // 1. Origin header verification
  const origin = req.headers.origin;
  if (origin) {
    if (!isOriginAllowed(origin)) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'CSRF_ORIGIN_DENIED',
        message: `Cross-site request blocked: Origin "${origin}" is not an approved application origin.`
      });
    }
  }

  // 2. Referer header fallback verification
  const referer = req.headers.referer;
  if (!origin && referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!isOriginAllowed(refOrigin)) {
        return res.status(403).json({
          timestamp: new Date().toISOString(),
          status: 403,
          success: false,
          code: 'CSRF_REFERER_DENIED',
          message: `Cross-site request blocked: Referer "${refOrigin}" is not an approved application origin.`
        });
      }
    } catch {
      // Unparseable referer on a mutating request is rejected
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'CSRF_INVALID_REFERER',
        message: 'Cross-site request blocked: Malformed Referer header.'
      });
    }
  }

  // 3. Double-Submit CSRF Token Check for cookie-authenticated mutating calls
  const token = extractSessionToken(req);
  const providedCsrf = req.headers['x-csrf-token'];
  if (token && typeof providedCsrf === 'string' && providedCsrf.trim()) {
    const expectedCsrf = generateCsrfToken(token);
    if (providedCsrf.trim() !== expectedCsrf) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token provided for authenticated session.'
      });
    }
  }

  next();
}

/**
 * Global sanitized production error handler.
 * Conceals database errors, stack traces, and internal secrets from clients.
 */
export function sanitizeErrorResponse(err: any, _req: Request, res: Response, next: NextFunction): any {
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;

  // Log error internally for administrators
  console.error('[API Error Sanitizer]', err.message || err);

  const safeMessage = isProduction
    ? (status >= 500 ? 'An internal server error occurred. Please contact the administrator.' : err.message)
    : (err.message || 'An error occurred.');

  return res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    success: false,
    code: err.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
    message: safeMessage
  });
}

