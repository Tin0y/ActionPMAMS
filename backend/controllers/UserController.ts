import { Router, Response } from 'express';
import { userRepository } from '../repositories/UserRepository';
import { ApiResponse } from '../entities/types';
import { UserAccount } from '../../src/types';
import {
  AuthenticatedRequest,
  authService,
  dedupeOfficialRoles,
  hashPassword,
  isAdminRole,
  isOfficialEndUserRole,
  normalizeOfficialRole,
  requireAdmin,
  requireAuth,
  toPublicUser,
  validatePasswordPolicy
} from '../services/AuthService';
import { rejectImpersonationAttempt } from '../services/AuthorizationService';

export const userController = Router();

/**
 * GET /api/users
 * Restricted strictly to System Administrators.
 */
userController.get('/', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const users = userRepository.findAll().map(u => toPublicUser(u));
  const response: ApiResponse<UserAccount[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${users.length} user accounts`,
    data: users
  };
  return res.status(200).json(response);
});

/**
 * GET /api/users/:id
 * Allowed for System Administrator or the user themselves inspecting their own account.
 */
userController.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const callerRole = req.authUser?.activeRole || req.authUser?.role;
  const callerIsAdmin = isAdminRole(callerRole);
  const callerIsSelf = req.authUser?.id === req.params.id;

  if (!callerIsAdmin && !callerIsSelf) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'FORBIDDEN',
      message: 'Forbidden: You cannot inspect another user account.'
    });
  }

  const user = userRepository.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `User ${req.params.id} not found.`
    });
  }
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'User retrieved',
    data: toPublicUser(user)
  });
});

/**
 * POST /api/users
 * Restricted strictly to System Administrators.
 */
userController.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const body = req.body || {};
    const rawPassword =
      typeof body.password === 'string'
        ? body.password
        : typeof body.newPassword === 'string'
          ? body.newPassword
          : '';

    const policy = validatePasswordPolicy(rawPassword);
    if (!policy.valid) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        code: 'INVALID_PASSWORD',
        message: policy.message || 'A valid password of at least 8 characters is required.'
      });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const fullName =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : `${firstName} ${lastName}`.trim();

    if (!email || !email.includes('@') || !fullName) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Full name and a valid institutional email address are required.'
      });
    }

    const primaryRole = typeof body.role === 'string' ? body.role.trim() : '';
    const rawRoles: string[] =
      Array.isArray(body.roles) && body.roles.length > 0
        ? body.roles.map((r: any) => String(r).trim()).filter(Boolean)
        : primaryRole
          ? [primaryRole]
          : [];

    if (!primaryRole || rawRoles.length === 0 || !rawRoles.every(r => isOfficialEndUserRole(r))) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        code: 'INVALID_ROLE',
        message: 'Accounts must be assigned one or more of the six official APMAMS end-user roles.'
      });
    }

    const username =
      typeof body.username === 'string' && body.username.trim()
        ? body.username.trim().toLowerCase()
        : email.split('@')[0];

    const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
    if (!studentId || !/^\d{5,10}$/.test(studentId)) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        code: 'INVALID_ID_NUMBER',
        message: 'ID Number is required and must be between 5 and 10 numeric digits.'
      });
    }

    const duplicateStudentId = await userRepository.existsDuplicateStudentId(studentId);
    if (duplicateStudentId) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        status: 409,
        success: false,
        code: 'DUPLICATE_ID_NUMBER',
        message: `An account with ID Number "${studentId}" already exists.`
      });
    }

    const duplicate = await userRepository.existsDuplicateEmailOrUsername(email, username);
    if (duplicate.conflict) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        status: 409,
        success: false,
        code: 'DUPLICATE_ACCOUNT',
        message:
          duplicate.field === 'email'
            ? `An account with email "${email}" already exists.`
            : `An account with username "${username}" already exists.`
      });
    }

    const appUserId =
      typeof body.id === 'string' && body.id.trim()
        ? body.id.trim()
        : `usr-${Date.now().toString(36)}`;

    const canonicalPrimary = normalizeOfficialRole(primaryRole) || primaryRole;
    const canonicalRoles = dedupeOfficialRoles(rawRoles);
    const passwordHash = await hashPassword(rawPassword);
    const newUser = toPublicUser({
      ...body,
      id: appUserId,
      name: fullName,
      firstName: firstName || fullName.split(' ')[0],
      lastName: lastName || fullName.split(' ').slice(1).join(' '),
      username,
      studentId,
      email,
      role: canonicalPrimary,
      roles: canonicalRoles,
      activeRole: canonicalPrimary,
      isActive: body.isActive !== false
    });

    const saved = await userRepository.createWithPasswordHash(
      newUser,
      passwordHash,
      Boolean(body.mustChangePassword)
    );

    return res.status(201).json({
      timestamp: new Date().toISOString(),
      status: 201,
      success: true,
      message: 'User account created successfully.',
      data: toPublicUser(saved)
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: 'Failed to create user account.'
    });
  }
});

/**
 * PUT /api/users/:id
 * Admin can update any account; non-admin can update only their own profile (with privilege escalation blocked).
 */
userController.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  console.log(`[UserController.put] ID: ${req.params.id}, authUser: ${req.authUser?.id}, role: ${req.authUser?.role}`);
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const targetId = req.params.id;
    const existing = userRepository.findById(targetId);
    if (!existing) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: `User ${targetId} not found.`
      });
    }

    const callerRole = req.authUser?.activeRole || req.authUser?.role;
    const callerIsAdmin = isAdminRole(callerRole);
    const callerIsSelf = req.authUser?.id === targetId;

    if (!callerIsAdmin && !callerIsSelf) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'FORBIDDEN',
        message: 'Forbidden: you cannot modify another user account.'
      });
    }

    const body = req.body || {};

    // Non-admin self-profile update: restrict strictly to non-privileged personal fields (bio, avatar, name)
    if (!callerIsAdmin) {
      if (body.password !== undefined || body.newPassword !== undefined) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          status: 400,
          success: false,
          code: 'PASSWORD_CHANGE_ENDPOINT_REQUIRED',
          message: 'Password updates must be performed using the security change-password feature.'
        });
      }

      // Check for illegal modification of system-controlled fields
      if (
        (body.isActive !== undefined && Boolean(body.isActive) !== existing.isActive) ||
        (body.orgId !== undefined && body.orgId && body.orgId !== existing.orgId)
      ) {
        return res.status(403).json({
          timestamp: new Date().toISOString(),
          status: 403,
          success: false,
          code: 'PRIVILEGE_ESCALATION_BLOCKED',
          message: 'Forbidden: You cannot modify assigned organizations or account active status.'
        });
      }

      const cleanBodyRole = body.role ? (normalizeOfficialRole(body.role) || body.role) : undefined;
      const cleanExistingRole = normalizeOfficialRole(existing.role) || existing.role;
      if (cleanBodyRole && cleanBodyRole !== cleanExistingRole) {
        return res.status(403).json({
          timestamp: new Date().toISOString(),
          status: 403,
          success: false,
          code: 'PRIVILEGE_ESCALATION_BLOCKED',
          message: 'Forbidden: You cannot modify assigned roles.'
        });
      }

      const firstName =
        typeof body.firstName === 'string' ? body.firstName.trim() : existing.firstName || '';
      const lastName =
        typeof body.lastName === 'string' ? body.lastName.trim() : existing.lastName || '';
      const fullName =
        typeof body.name === 'string' && body.name.trim()
          ? body.name.trim()
          : `${firstName} ${lastName}`.trim() || existing.name;

      const selfUpdated = toPublicUser({
        ...existing,
        firstName,
        lastName,
        name: fullName,
        avatar: typeof body.avatar === 'string' ? body.avatar : existing.avatar,
        bio: typeof body.bio === 'string' ? body.bio : (existing.bio || '')
      });

      const saved = await userRepository.updateExisting(targetId, selfUpdated);
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        status: 200,
        success: true,
        message: 'Profile updated successfully.',
        data: toPublicUser({
          ...saved,
          activeRole: req.authUser?.activeRole || saved.role
        })
      });
    }

    // Admin update path
    const nextEmail =
      typeof body.email === 'string' && body.email.trim()
        ? body.email.trim().toLowerCase()
        : existing.email;
    const nextUsername =
      typeof body.username === 'string' && body.username.trim()
        ? body.username.trim().toLowerCase()
        : existing.username || nextEmail.split('@')[0];

    const duplicate = await userRepository.existsDuplicateEmailOrUsername(
      nextEmail,
      nextUsername,
      targetId
    );
    if (duplicate.conflict) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        status: 409,
        success: false,
        code: 'DUPLICATE_ACCOUNT',
        message:
          duplicate.field === 'email'
            ? `Another account already uses email "${nextEmail}".`
            : `Another account already uses username "${nextUsername}".`
      });
    }

    const nextStudentId = typeof body.studentId === 'string' ? body.studentId.trim() : existing.studentId;
    if (nextStudentId) {
      if (!/^\d{5,10}$/.test(nextStudentId)) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          status: 400,
          success: false,
          code: 'INVALID_ID_NUMBER',
          message: 'ID Number must be between 5 and 10 numeric digits.'
        });
      }
      const duplicateStudentId = await userRepository.existsDuplicateStudentId(nextStudentId, targetId);
      if (duplicateStudentId) {
        return res.status(409).json({
          timestamp: new Date().toISOString(),
          status: 409,
          success: false,
          code: 'DUPLICATE_ID_NUMBER',
          message: `Another account already uses ID Number "${nextStudentId}".`
        });
      }
    }

    const nextRole = typeof body.role === 'string' && body.role.trim() ? body.role.trim() : existing.role;
    const nextRoles: string[] =
      Array.isArray(body.roles) && body.roles.length > 0
        ? Array.from(new Set(body.roles.map((r: any) => String(r).trim()).filter(Boolean)))
        : existing.roles && existing.roles.length > 0
          ? existing.roles
          : [nextRole];

    // Validate role changes against the 6 official end-user roles
    if (body.role !== undefined || body.roles !== undefined) {
      if (!isOfficialEndUserRole(nextRole) || !nextRoles.every(r => isOfficialEndUserRole(r))) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          status: 400,
          success: false,
          code: 'INVALID_ROLE',
          message: 'Only the six official APMAMS end-user roles may be assigned.'
        });
      }
    }

    let newPasswordHash: string | undefined;
    let mustChangePassword: boolean | undefined;
    const rawResetPassword =
      typeof body.newPassword === 'string' && body.newPassword.length > 0
        ? body.newPassword
        : typeof body.password === 'string' && body.password.length > 0
          ? body.password
          : '';

    if (rawResetPassword) {
      const policy = validatePasswordPolicy(rawResetPassword);
      if (!policy.valid) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          status: 400,
          success: false,
          code: 'INVALID_PASSWORD',
          message: policy.message || 'Reset password must be at least 8 characters long.'
        });
      }
      newPasswordHash = await hashPassword(rawResetPassword);
      mustChangePassword = body.mustChangePassword !== undefined ? Boolean(body.mustChangePassword) : true;
    }

    const canonicalNextRoles = dedupeOfficialRoles(nextRoles);
    const canonicalNextRole =
      normalizeOfficialRole(nextRole) || canonicalNextRoles[0] || nextRole;
    const finalSavedRoles =
      canonicalNextRoles.length > 0 ? canonicalNextRoles : [canonicalNextRole];

    const updatedUser = toPublicUser({
      ...existing,
      ...body,
      id: targetId,
      email: nextEmail,
      username: nextUsername,
      studentId: nextStudentId,
      role: canonicalNextRole,
      roles: finalSavedRoles,
      activeRole: canonicalNextRole,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive
    });

    const saved = await userRepository.updateExisting(targetId, updatedUser, {
      newPasswordHash,
      mustChangePassword
    });

    // Immediately terminate active sessions if the account was deactivated or had its password reset
    if (saved.isActive === false || newPasswordHash) {
      await authService.revokeAllSessionsForUser(targetId);
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: newPasswordHash
        ? 'Account and password hash updated successfully.'
        : 'User account updated successfully.',
      data: toPublicUser(saved)
    });
  } catch (err: any) {
    console.error('[UserController.put] Error:', err);
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err?.message || 'Failed to update user account.'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Restricted strictly to System Administrators.
 */
userController.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    if (req.authUser?.id === req.params.id) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'Cannot delete the currently signed-in administrator account.'
      });
    }
    const deleted = await userRepository.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: `User ${req.params.id} not found.`
      });
    }
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: 'User deleted'
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: 'Failed to delete user account.'
    });
  }
});
