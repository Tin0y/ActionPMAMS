import { Router, Response } from 'express';
import { fiscalYearRepository } from '../repositories/FiscalYearRepository';
import { ApiResponse } from '../entities/types';
import { FiscalYear, OrganizationFiscalYearPlan } from '../../src/types';
import {
  AuthenticatedRequest,
  requireAdmin,
  requireAuth
} from '../services/AuthService';
import {
  canViewOrgPrivateData,
  rejectImpersonationAttempt
} from '../services/AuthorizationService';

export const fiscalYearController = Router();

// Require authenticated session for all fiscal-year endpoints
fiscalYearController.use(requireAuth);

// GET all fiscal years
fiscalYearController.get('/', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const list = fiscalYearRepository.findAll();
  const response: ApiResponse<FiscalYear[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${list.length} fiscal years`,
    data: list
  };
  return res.status(200).json(response);
});

// GET fiscal year by ID
fiscalYearController.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const fy = fiscalYearRepository.findById(req.params.id);
  if (!fy) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Fiscal Year "${req.params.id}" not found`
    });
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Fiscal year retrieved successfully',
    data: fy
  });
});

// GET organizations organized under a fiscal year
fiscalYearController.get('/:id/organizations', (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const fy = fiscalYearRepository.findById(req.params.id);
  if (!fy) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Fiscal Year "${req.params.id}" not found`
    });
  }

  const queryOrgId = req.query.orgId as string | undefined;
  if (queryOrgId && !canViewOrgPrivateData(req.authUser, queryOrgId)) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'FORBIDDEN',
      message: `Forbidden: You do not have permission to view organization action plans for "${queryOrgId}".`
    });
  }

  let orgPlans = fiscalYearRepository.getOrganizationsInFiscalYear(fy.id);
  if (queryOrgId) {
    orgPlans = orgPlans.filter(p => p.orgId.toUpperCase() === queryOrgId.toUpperCase());
  } else {
    orgPlans = orgPlans.filter(p => canViewOrgPrivateData(req.authUser, p.orgId));
  }

  const response: ApiResponse<OrganizationFiscalYearPlan[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${orgPlans.length} organization action plans for ${fy.name}`,
    data: orgPlans
  };
  return res.status(200).json(response);
});

// POST create new fiscal year - Admin only
fiscalYearController.post('/', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const raw = req.body;
    if (!raw.name || !raw.startDate || !raw.endDate) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'Fiscal year name, start date, and end date are required'
      });
    }

    const yearDigits = raw.name.replace(/\D/g, '') || new Date(raw.startDate).getFullYear().toString();
    const normalizedId = raw.id || `FY-${yearDigits}`;

    // Check duplicate
    const existing = fiscalYearRepository.findById(normalizedId);
    if (existing) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        status: 409,
        success: false,
        message: `Fiscal Year with ID "${normalizedId}" already exists`
      });
    }

    const toSave: FiscalYear = {
      id: normalizedId,
      name: raw.name.startsWith('FY') ? raw.name : `FY ${raw.name}`,
      fiscalYear: raw.fiscalYear || raw.name,
      startDate: raw.startDate,
      endDate: raw.endDate,
      submissionStartDate: raw.submissionStartDate || raw.startDate,
      submissionDeadline: raw.submissionDeadline || raw.endDate,
      submissionOpenDate: raw.submissionStartDate || raw.startDate,
      submissionCloseDate: raw.submissionDeadline || raw.endDate,
      status: raw.status || 'Draft',
      templateId: raw.templateId || 'TEMPLATE-MSUN-DEFAULT',
      periodCovered: raw.periodCovered || `January–December ${yearDigits}`,
      isSubmissionActive: raw.status === 'Open' || Boolean(raw.isSubmissionActive),
      publishedAt: raw.status === 'Open' ? new Date().toISOString() : undefined,
      notes: raw.notes || '',
      participatingOrgs: raw.participatingOrgs || ['ALL'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = fiscalYearRepository.save(toSave);
    return res.status(201).json({
      timestamp: new Date().toISOString(),
      status: 201,
      success: true,
      message: `Fiscal Year "${saved.name}" provisioned successfully`,
      data: saved
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err.message || 'Failed to create fiscal year'
    });
  }
});

// PUT update fiscal year - Admin only
fiscalYearController.put('/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  try {
    const existing = fiscalYearRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        success: false,
        message: `Fiscal Year "${req.params.id}" not found`
      });
    }

    const updated = fiscalYearRepository.save({
      ...existing,
      ...req.body,
      id: existing.id
    });

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Fiscal Year "${updated.name}" updated successfully`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err.message || 'Failed to update fiscal year'
    });
  }
});

// POST activate fiscal year (sets to Open) - Admin only
fiscalYearController.post('/:id/activate', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const activated = fiscalYearRepository.activate(req.params.id);
  if (!activated) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Fiscal Year "${req.params.id}" not found`
    });
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Fiscal Year "${activated.name}" is now Activated and Open for Submissions`,
    data: activated
  });
});

// POST close fiscal year (sets to Under Review / Finalized) - Admin only
fiscalYearController.post('/:id/close', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const closed = fiscalYearRepository.close(req.params.id, req.body?.status || 'Under Review');
  if (!closed) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Fiscal Year "${req.params.id}" not found`
    });
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Fiscal Year "${closed.name}" closed (Status: ${closed.status})`,
    data: closed
  });
});

// POST archive fiscal year - Admin only
fiscalYearController.post('/:id/archive', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const archived = fiscalYearRepository.archive(req.params.id);
  if (!archived) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Fiscal Year "${req.params.id}" not found`
    });
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Fiscal Year "${archived.name}" has been archived. All records preserved.`,
    data: archived
  });
});
