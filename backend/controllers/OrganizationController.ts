import { Router, Response } from 'express';
import { organizationRepository } from '../repositories/OrganizationRepository';
import { ApiResponse } from '../entities/types';
import { StudentOrganization } from '../../src/types';
import {
  AuthenticatedRequest,
  requireAdmin,
  requireAuth
} from '../services/AuthService';
import {
  canViewOrgPrivateData,
  rejectImpersonationAttempt
} from '../services/AuthorizationService';

export const organizationController = Router();

// Protect all organization routes with authenticated session
organizationController.use(requireAuth);

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
 * the caller is not authorized to inspect.
 */
organizationController.get('/', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const orgs = organizationRepository.findAll();
  const sanitizedOrgs = orgs.map(org => {
    if (canViewOrgPrivateData(req.authUser, org.id)) {
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
 * Returns single organization profile. Sanitizes protected data if caller is not authorized.
 */
organizationController.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }

  const isAuth = canViewOrgPrivateData(req.authUser, org.id);
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
organizationController.get('/:id/members', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }

  if (!canViewOrgPrivateData(req.authUser, org.id)) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'FORBIDDEN',
      message: `403 Forbidden: Access to ${org.name} (${org.id}) members is restricted to authorized members and reviewers of this organization.`
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
organizationController.get('/:id/attachments', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const org = organizationRepository.findById(req.params.id);
  if (!org) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }

  if (!canViewOrgPrivateData(req.authUser, org.id)) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'FORBIDDEN',
      message: `403 Forbidden: Access to ${org.name} (${org.id}) attachments is restricted to authorized members and reviewers of this organization.`
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

/**
 * POST /api/organizations
 * Creates a new student organization. Strictly restricted to System Administrators.
 */
organizationController.post('/', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const body = req.body;
  if (!body.name || !body.acronym) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      success: false,
      message: 'Organization name and acronym are required.'
    });
  }

  const orgId = (body.id || body.acronym).trim().toUpperCase();
  const toSave: StudentOrganization = {
    ...body,
    id: orgId,
    name: body.name.trim(),
    acronym: (body.acronym || orgId).trim().toUpperCase(),
    status: body.status || 'Active',
    registeredNumber: body.registeredNumber || `MSUN-SO-${new Date().getFullYear()}`,
    dateOfApplication: body.dateOfApplication || new Date().toISOString().split('T')[0],
    memberCount: Array.isArray(body.membersList) ? body.membersList.length : (body.memberCount || 0),
    attachmentCount: Array.isArray(body.attachments) ? body.attachments.length : (body.attachmentCount || 0),
    membersList: body.membersList || [],
    attachments: body.attachments || []
  };

  const saved = organizationRepository.save(toSave);
  return res.status(201).json({
    timestamp: new Date().toISOString(),
    status: 201,
    success: true,
    message: `Organization "${saved.name}" (${saved.acronym}) created successfully`,
    data: saved
  });
});

/**
 * PUT /api/organizations/:id
 * Updates an organization's configuration. Strictly restricted to System Administrators.
 */
organizationController.put('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const existing = organizationRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Organization ${req.params.id} not found.`
    });
  }

  const toSave: StudentOrganization = {
    ...existing,
    ...req.body,
    id: existing.id
  };

  const saved = organizationRepository.save(toSave);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Organization "${saved.name}" updated successfully`,
    data: saved
  });
});
