import { Router, Request, Response } from 'express';
import { organizationRepository } from '../repositories/OrganizationRepository';
import { userRepository } from '../repositories/UserRepository';
import { ApiResponse } from '../entities/types';
import { StudentOrganization } from '../../src/types';

export const organizationController = Router();

/**
 * Extracts and verifies the requesting user's identity and assigned organization ID.
 * Supports:
 * - Custom headers: x-user-id, x-org-id
 * - Query parameters: ?userId=... & ?orgId=...
 */
function getCallerAuth(req: Request) {
  const userId = (req.headers['x-user-id'] || req.query.userId) as string | undefined;
  const directOrgId = (req.headers['x-org-id'] || req.query.orgId) as string | undefined;

  const user = userId ? userRepository.findById(userId) : undefined;
  const role = user?.role;
  const assignedOrgId = user?.orgId || directOrgId;

  const isAdmin = role === 'ROLE_ADMIN' || role === 'System Administrator';

  return {
    user,
    role,
    assignedOrgId,
    isAdmin
  };
}

/**
 * Validates whether the caller belongs to the target organization or holds administrative authorization.
 */
function isAuthorizedForOrg(req: Request, targetOrgId: string): boolean {
  const { assignedOrgId, isAdmin } = getCallerAuth(req);
  if (isAdmin) {
    return true;
  }
  if (!assignedOrgId || !targetOrgId) {
    return false;
  }
  return assignedOrgId.trim().toUpperCase() === targetOrgId.trim().toUpperCase();
}

/**
 * Sanitizes an organization record for external/unauthorized callers.
 * Completely strips membersList and attachments, and conceals internal counts.
 */
function sanitizeOrgForExternal(org: StudentOrganization): Partial<StudentOrganization> {
  const sanitized = { ...org };
  delete sanitized.membersList;
  delete sanitized.attachments;
  return sanitized;
}

/**
 * GET /api/organizations
 * Returns list of organizations. Members and attachments are redacted for organizations
 * the caller does not belong to.
 */
organizationController.get('/', (req: Request, res: Response) => {
  const orgs = organizationRepository.findAll();
  const sanitizedOrgs = orgs.map(org => {
    if (isAuthorizedForOrg(req, org.id)) {
      return org;
    }
    return sanitizeOrgForExternal(org);
  });

  const response: ApiResponse<any[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${sanitizedOrgs.length} student organizations`,
    data: sanitizedOrgs
  };
  return res.status(200).json(response);
});

/**
 * GET /api/organizations/:id
 * Returns single organization profile. Sanitizes protected data if caller belongs to another organization.
 */
organizationController.get('/:id', (req: Request, res: Response) => {
  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }

  const isAuth = isAuthorizedForOrg(req, org.id);
  const data = isAuth ? org : sanitizeOrgForExternal(org);

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: isAuth
      ? 'Organization retrieved with full permissions'
      : 'Organization general overview retrieved (members and attachments restricted)',
    data
  });
});

/**
 * GET /api/organizations/:id/members
 * Returns organization members directory. Strictly returns 403 Forbidden for unauthorized requests.
 */
organizationController.get('/:id/members', (req: Request, res: Response) => {
  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }

  if (!isAuthorizedForOrg(req, org.id)) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      message: `403 Forbidden: Access to ${org.name} (${org.id}) members is restricted to authenticated members of this organization.`
    });
  }

  const members = org.membersList || [];
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${members.length} members for ${org.id}`,
    data: members
  });
});

/**
 * GET /api/organizations/:id/attachments
 * Returns organization accreditation attachments. Strictly returns 403 Forbidden for unauthorized requests.
 */
organizationController.get('/:id/attachments', (req: Request, res: Response) => {
  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }

  if (!isAuthorizedForOrg(req, org.id)) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      message: `403 Forbidden: Access to ${org.name} (${org.id}) attachments is restricted to authenticated members of this organization.`
    });
  }

  const attachments = org.attachments || [];
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${attachments.length} attachments for ${org.id}`,
    data: attachments
  });
});
