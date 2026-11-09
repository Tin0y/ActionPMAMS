import { Router, Request, Response } from 'express';
import {
  authService,
  clearSessionCookie,
  extractSessionToken,
  generateCsrfToken,
  setSessionCookie,
  toPublicUser
} from '../services/AuthService';

export const authController = Router();

/**
 * GET /api/auth/csrf-token
 * Returns the CSRF token associated with the current session.
 */
authController.get('/csrf-token', async (req: Request, res: Response) => {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        status: 200,
        success: true,
        csrfToken: null,
        authenticated: false
      });
    }
    const result = await authService.validateSession(token);
    if (!result.ok) {
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        status: 200,
        success: true,
        csrfToken: null,
        authenticated: false
      });
    }
    const csrfToken = generateCsrfToken(token);
    res.setHeader('X-CSRF-Token', csrfToken);
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      csrfToken,
      authenticated: true
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: 'Failed to retrieve CSRF token.'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates a user against PostgreSQL bcrypt password hashes and issues an HttpOnly session cookie.
 */
authController.post('/login', async (req: Request, res: Response) => {
  try {
    const rawIdentifier =
      typeof req.body?.identifier === 'string'
        ? req.body.identifier
        : typeof req.body?.email === 'string'
          ? req.body.email
          : typeof req.body?.username === 'string'
            ? req.body.username
            : '';
    const plainPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const selectedRole = typeof req.body?.selectedRole === 'string' ? req.body.selectedRole : undefined;

    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : '') ||
      req.socket.remoteAddress ||
      'unknown';
    const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';

    const result = await authService.authenticate(rawIdentifier, plainPassword, selectedRole, {
      ip,
      userAgent
    });

    if (!result.ok) {
      clearSessionCookie(req, res);
      return res.status(result.status).json({
        timestamp: new Date().toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }

    setSessionCookie(req, res, result.sessionToken, result.cookieMaxAge);
    const csrfToken = generateCsrfToken(result.sessionToken);
    res.setHeader('X-CSRF-Token', csrfToken);
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      csrfToken,
      requiresRoleSelection: result.requiresRoleSelection,
      availableRoles: result.availableRoles,
      data: toPublicUser(result.user)
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: 'An unexpected error occurred during sign-in.'
    });
  }
});

/**
 * GET /api/auth/me
 * Validates the current HttpOnly session cookie and returns the active sanitized user profile.
 */
authController.get('/me', async (req: Request, res: Response) => {
  try {
    const token = extractSessionToken(req);
    const result = await authService.validateSession(token);
    if (!result.ok) {
      if (token) clearSessionCookie(req, res);
      return res.status(result.status).json({
        timestamp: new Date().toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }

    const csrfToken = generateCsrfToken(token!);
    res.setHeader('X-CSRF-Token', csrfToken);
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      csrfToken,
      data: toPublicUser(result.user)
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: 'Session check failed.'
    });
  }
});

/**
 * POST /api/auth/switch-role
 * Completes multi-role selection at login or switches active role during an active session.
 */
authController.post('/switch-role', async (req: Request, res: Response) => {
  try {
    const token = extractSessionToken(req);
    const targetRole = typeof req.body?.role === 'string' ? req.body.role : '';
    const result = await authService.switchActiveRole(token, targetRole);

    if (!result.ok) {
      return res.status(result.status).json({
        timestamp: new Date().toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }

    let csrfToken: string | undefined;
    if (token) {
      setSessionCookie(req, res, token, result.cookieMaxAge);
      csrfToken = generateCsrfToken(token);
      res.setHeader('X-CSRF-Token', csrfToken);
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      csrfToken,
      data: toPublicUser(result.user)
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: 'Failed to switch active role.'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Verifies current password via bcrypt and stores a new cost-12 bcrypt hash in PostgreSQL.
 */
authController.post('/change-password', async (req: Request, res: Response) => {
  try {
    const token = extractSessionToken(req);
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const headerUserId = typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'] : undefined;
    const bodyUserId = typeof req.body?.userId === 'string' ? req.body.userId : undefined;
    const bodyEmail = typeof req.body?.email === 'string' ? req.body.email : undefined;
    const fallbackUserId = headerUserId || bodyUserId || bodyEmail;

    const result = await authService.changePassword(token, currentPassword, newPassword, fallbackUserId);
    if (!result.ok) {
      return res.status(result.status).json({
        timestamp: new Date().toISOString(),
        status: result.status,
        success: false,
        code: result.code,
        message: result.message
      });
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: result.message
    });
  } catch (err: any) {
    console.error('[AuthController] change-password error:', err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err.message || 'Failed to update password.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Revokes the current session in PostgreSQL and clears the HttpOnly session cookie.
 */
authController.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = extractSessionToken(req);
    await authService.logout(token);
    clearSessionCookie(req, res);
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: 'Signed out successfully.'
    });
  } catch (err: any) {
    clearSessionCookie(req, res);
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: 'Signed out.'
    });
  }
});

