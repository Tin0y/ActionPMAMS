import { Router, Response } from 'express';
import { activityRepository } from '../repositories/ActivityRepository';
import { workflowService } from '../services/WorkflowService';
import { ApiResponse, WorkflowAdvanceDTO, RevisionRequestDTO } from '../entities/types';
import { Activity } from '../../src/types';
import { isSameOrg } from '../../src/utils/organizationUtils';
import {
  detectDadVenueConflicts,
  detectActionPlanConflicts,
  checkVenueAvailability
} from '../../src/utils/conflictDetection';
import {
  AuthenticatedRequest,
  isAdminRole,
  normalizeOfficialRole,
  requireAdmin,
  requireAuth
} from '../services/AuthService';
import {
  canModifyOrgActivity,
  canViewOrgPrivateData,
  enforceGenericActivityWritePolicy,
  getActiveSessionRole,
  rejectImpersonationAttempt,
  sanitizeActivityForCrossOrgCalendar
} from '../services/AuthorizationService';

export const activityController = Router();

/**
 * POST /api/activities/check-conflict
 * Pre-flight conflict check for Action Plan creation and DAD submissions
 */
activityController.post('/check-conflict', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  const { activity, designForm } = req.body || {};
  const allActs = activityRepository.findAll();
  let conflicts: any[] = [];
  if (designForm) {
    conflicts = detectDadVenueConflicts(
      designForm,
      activity?.id || '',
      activity?.orgId || req.authUser?.orgId || '',
      allActs
    );
  } else if (activity) {
    conflicts = detectActionPlanConflicts(activity, allActs);
  }
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    data: conflicts
  });
});

/**
 * GET /api/activities/venues/availability
 * Retrieves venue schedule breakdown and availability status
 */
activityController.get('/venues/availability', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  const { venue, date, timeRange } = req.query;
  const allActs = activityRepository.findAll();
  const result = checkVenueAvailability(
    typeof venue === 'string' ? venue : '',
    typeof date === 'string' ? date : '',
    allActs,
    typeof timeRange === 'string' ? timeRange : undefined
  );
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    data: result
  });
});

/**
 * GET /api/activities
 * Returns activities with server-enforced organization isolation:
 * - Cross-org ?orgId= query requests from unauthorized callers are rejected with 403 Forbidden.
 * - Cross-org items returned in global calendar views have restricted internal forms/decisions redacted.
 */
activityController.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  const { orgId, fiscalYear, status } = req.query;
  const caller = req.authUser!;

  if (typeof orgId === 'string' && orgId.trim() && orgId.trim().toUpperCase() !== 'ALL') {
    if (!canViewOrgPrivateData(caller, orgId.trim())) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'CROSS_ORG_FORBIDDEN',
        message: `Forbidden: You are not authorized to access internal activity records for organization "${orgId}".`
      });
    }
  }

  const rawActivities = activityRepository.findAll({
    orgId: typeof orgId === 'string' ? orgId : undefined,
    fiscalYear: typeof fiscalYear === 'string' ? fiscalYear : undefined,
    status: typeof status === 'string' ? status : undefined
  });

  const scopedActivities = rawActivities.map(act =>
    canViewOrgPrivateData(caller, act.orgId)
      ? act
      : sanitizeActivityForCrossOrgCalendar(act)
  );

  const response: ApiResponse<Activity[]> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Retrieved ${scopedActivities.length} activities`,
    data: scopedActivities
  };
  return res.status(200).json(response);
});

/**
 * POST /api/activities/batch-save
 * Batch create or update activities for an authorized organization
 */
activityController.post('/batch-save', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  try {
    const list = req.body as Activity[];
    if (!Array.isArray(list)) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        success: false,
        message: 'Expected an array of activities'
      });
    }

    const caller = req.authUser!;
    const validatedList: Activity[] = [];

    for (const item of list) {
      const existing = item?.id ? activityRepository.findById(item.id) : undefined;
      const check = enforceGenericActivityWritePolicy(caller, item || {}, existing);
      if (!check.ok) {
        return res.status(check.status).json({
          timestamp: new Date().toISOString(),
          status: check.status,
          success: false,
          code: check.code,
          message: check.message
        });
      }
      validatedList.push(check.activity);
    }

    const savedList = activityRepository.batchSave(validatedList);
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Successfully saved ${savedList.length} activities.`,
      data: savedList
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err.message || 'Failed to batch save activities'
    });
  }
});

/**
 * POST /api/activities/confirm-plan
 * Finalizes and confirms all decided (Approved / Rejected) activities for an authorized organization & fiscal year
 */
activityController.post('/confirm-plan', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  try {
    const caller = req.authUser!;
    const { orgId, fiscalYear } = req.body || {};
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Missing organization identifier (orgId)' });
    }

    // Role isolation: Only org officer of that org or SysAd can confirm
    const activeRole = normalizeOfficialRole(caller.activeRole || caller.role);
    const callerRoles = (caller.roles || []).map(r => normalizeOfficialRole(r));
    const isSysAdmin = activeRole === 'ROLE_ADMIN' || callerRoles.includes('ROLE_ADMIN');
    const isOrgOfficer = (activeRole === 'ROLE_ORGANIZATION' || callerRoles.includes('ROLE_ORGANIZATION')) &&
      isSameOrg(caller.orgId, orgId);

    if (!isSysAdmin && !isOrgOfficer) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        message: `Forbidden: You are not authorized to confirm Action Plan for organization ${orgId}.`
      });
    }

    const allActs = activityRepository.findAll();
    const fyDigits = fiscalYear ? String(fiscalYear).replace(/\D/g, '') : '';
    const targetActs = allActs.filter(a => {
      const matchOrg = isSameOrg(a.orgId, orgId);
      if (!matchOrg) return false;
      if (!fyDigits || fiscalYear === 'ALL') return true;
      const actFyDigits = (a.fiscalYear || '').replace(/\D/g, '');
      return actFyDigits === fyDigits;
    });

    let approvedCount = 0;
    let rejectedCount = 0;
    let draftCount = 0;
    let totalApprovedBudget = 0;

    const updatedList: Activity[] = [];
    const timestamp = new Date().toISOString();

    for (const act of targetActs) {
      const isApproved = act.status === 'Approved' || act.approvalStatus === 'Fully Approved';
      const isRejected = act.status === 'Rejected' || act.approvalStatus === 'Rejected';

      if (isApproved) {
        approvedCount++;
        totalApprovedBudget += Number(act.budget || 0);
        const updated: Activity = {
          ...act,
          status: 'Approved',
          approvalStatus: 'Fully Approved',
          workflowStatus: 'COMPLETED',
          isActionPlanItem: true,
          source: 'ACTION_PLAN',
          isPlanConfirmed: true,
          confirmedBy: caller.name,
          confirmedAt: timestamp
        };
        activityRepository.save(updated);
        updatedList.push(updated);
      } else if (isRejected) {
        rejectedCount++;
        const updated: Activity = {
          ...act,
          status: 'Rejected',
          approvalStatus: 'Rejected',
          workflowStatus: 'REJECTED',
          isActionPlanItem: true,
          source: 'ACTION_PLAN',
          isPlanConfirmed: true,
          confirmedBy: caller.name,
          confirmedAt: timestamp,
          rejectionRemarks: act.rejectionRemarks || 'Rejected by Organization'
        };
        activityRepository.save(updated);
        updatedList.push(updated);
      } else {
        draftCount++;
        updatedList.push(act);
      }
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      status: 200,
      success: true,
      message: `Action plan confirmed successfully. ${approvedCount} activities approved, ${rejectedCount} rejected.`,
      data: {
        orgId,
        fiscalYear,
        approvedCount,
        rejectedCount,
        draftCount,
        totalApprovedBudget,
        activities: updatedList
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      success: false,
      message: err.message || 'Failed to confirm action plan'
    });
  }
});

/**
 * POST /api/activities/reset-stage-one
 * Administrative reset endpoint (strictly System Administrator active role)
 */
activityController.post('/reset-stage-one', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const resetList = activityRepository.resetAllToStageOne();
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'All activities successfully reset to Stage 1.',
    data: resetList
  });
});

/**
 * GET /api/activities/:id
 * Returns full activity details ONLY to callers authorized for the activity's organization
 */
activityController.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: false })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity with id "${req.params.id}" not found`
    });
  }

  if (!canViewOrgPrivateData(req.authUser, activity.orgId)) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'CROSS_ORG_FORBIDDEN',
      message: `Forbidden: You do not have permission to view restricted internal details of ${activity.orgId} activities.`
    });
  }

  const response: ApiResponse<Activity> = {
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Activity retrieved successfully',
    data: activity
  };
  return res.status(200).json(response);
});

/**
 * POST /api/activities
 * Creates a new activity (or updates an existing own-org activity) with strict org & workflow isolation
 */
activityController.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const rawBody = (req.body || {}) as Partial<Activity>;
  const existing = rawBody.id ? activityRepository.findById(rawBody.id) : undefined;

  if (!existing && (!rawBody.title || !String(rawBody.title).trim())) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      success: false,
      message: 'Validation failed: Activity title is required.'
    });
  }

  const check = enforceGenericActivityWritePolicy(req.authUser!, rawBody, existing);
  if (!check.ok) {
    return res.status(check.status).json({
      timestamp: new Date().toISOString(),
      status: check.status,
      success: false,
      code: check.code,
      message: check.message
    });
  }

  const toSave = check.activity;
  const allActsForPost = activityRepository.findAll();
  const isDadActivePost = Boolean(toSave.designForm?.isCompleted);
  const callerIsAdmin = isAdminRole(getActiveSessionRole(req.authUser));
  const hasAdminOverridePost =
    callerIsAdmin &&
    Boolean((toSave.designForm as any)?.adminOverride?.isOverridden || (toSave as any)?.adminOverrideReason);

  if (isDadActivePost && !hasAdminOverridePost) {
    const dadConflicts = detectDadVenueConflicts(
      toSave.designForm!,
      toSave.id || '',
      toSave.orgId,
      allActsForPost
    );
    if (dadConflicts.length > 0) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        status: 409,
        success: false,
        message: `Venue Scheduling Conflict: The selected venue is already requested by ${dadConflicts[0].conflictingOrgId} during your proposed implementation schedule.`,
        conflict: dadConflicts[0],
        conflicts: dadConflicts
      });
    }
  }

  const saved = activityRepository.save(toSave);
  const statusCode = existing ? 200 : 201;
  return res.status(statusCode).json({
    timestamp: new Date().toISOString(),
    status: statusCode,
    success: true,
    message: existing
      ? `Activity "${saved.title}" updated successfully.`
      : `Activity "${saved.title}" created successfully.`,
    data: saved
  });
});

/**
 * PUT /api/activities/:id
 * Updates an existing activity without permitting cross-org edits or approval state tampering
 */
activityController.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const existing = activityRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const check = enforceGenericActivityWritePolicy(req.authUser!, req.body || {}, existing);
  if (!check.ok) {
    return res.status(check.status).json({
      timestamp: new Date().toISOString(),
      status: check.status,
      success: false,
      code: check.code,
      message: check.message
    });
  }

  const toSave = check.activity;
  const allActsForPut = activityRepository.findAll();
  const isDadActivePut = Boolean(toSave.designForm?.isCompleted);
  const callerIsAdmin = isAdminRole(getActiveSessionRole(req.authUser));
  const hasAdminOverridePut =
    callerIsAdmin &&
    Boolean((toSave.designForm as any)?.adminOverride?.isOverridden || (req.body as any)?.adminOverrideReason);

  if (isDadActivePut && !hasAdminOverridePut) {
    const dadConflicts = detectDadVenueConflicts(
      toSave.designForm!,
      req.params.id,
      toSave.orgId,
      allActsForPut
    );
    if (dadConflicts.length > 0) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        status: 409,
        success: false,
        message: `Venue Scheduling Conflict: The selected venue is already requested by ${dadConflicts[0].conflictingOrgId} during your proposed implementation schedule.`,
        conflict: dadConflicts[0],
        conflicts: dadConflicts
      });
    }
  }

  const updated = activityRepository.save(toSave);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: 'Activity updated successfully',
    data: updated
  });
});

/**
 * DELETE /api/activities/:id
 * Deletes an activity (only owning Organization Officer for unapproved records, or System Administrator)
 */
activityController.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res)) return;

  const existing = activityRepository.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const caller = req.authUser!;
  if (!canModifyOrgActivity(caller, existing.orgId)) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'CROSS_ORG_FORBIDDEN',
      message: `Forbidden: You do not have permission to delete activities belonging to ${existing.orgId}.`
    });
  }

  const callerIsAdmin = isAdminRole(getActiveSessionRole(caller));
  if (
    !callerIsAdmin &&
    (existing.status === 'Approved' ||
      existing.approvalStatus === 'Fully Approved' ||
      existing.workflowStatus === 'COMPLETED')
  ) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'LOCKED_ACTIVITY',
      message: 'Forbidden: Approved activities cannot be deleted by organization officers.'
    });
  }

  activityRepository.deleteById(req.params.id);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: `Activity "${req.params.id}" deleted successfully.`
  });
});

/**
 * POST /api/activities/:id/approve
 * Approves an activity at its current stage using the server-authenticated actor
 */
activityController.post('/:id/approve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const remarks = typeof req.body?.remarks === 'string' ? req.body.remarks : undefined;
  const result = workflowService.approveActivity(activity, req.authUser!, remarks);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/reject
 * Issues final rejection with mandatory remarks using the server-authenticated actor
 */
activityController.post('/:id/reject', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const { remarks, stageId } = req.body || {};
  if (!remarks || !String(remarks).trim()) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      success: false,
      message: 'A mandatory remark/reason explaining the final rejection is required under institutional policy.'
    });
  }

  const result = workflowService.rejectActivity(activity, req.authUser!, String(remarks), stageId);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/draft
 * Sets an activity status back to Draft by authorized organization officer
 */
activityController.post('/:id/draft', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const result = workflowService.setToDraft(activity, req.authUser!);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/advance
 * Advances workflow stage strictly for the designated approver at the current stage
 */
activityController.post('/:id/advance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const payload = (req.body || {}) as WorkflowAdvanceDTO;
  const result = workflowService.advanceStep(activity, req.authUser!, payload.stepId, payload.remarks);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/defer
 * Defers an activity at its active stage with mandatory remarks
 */
activityController.post('/:id/defer', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const { reason, stageId } = req.body || {};
  const result = workflowService.deferActivity(activity, req.authUser!, String(reason || ''), stageId);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/resubmit
 * Allows owning Organization Officer to resubmit a deferred activity after revision
 */
activityController.post('/:id/resubmit', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;
  const result = workflowService.resubmitActivity(activity, req.authUser!, notes);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/external-clearance
 * Confirms clearance strictly through the designated stage approver
 */
activityController.post('/:id/external-clearance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const result = workflowService.confirmExternalClearance(activity, req.authUser!);
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});

/**
 * POST /api/activities/:id/revision
 * Requests revision (defers activity) strictly for the designated stage approver
 */
activityController.post('/:id/revision', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (rejectImpersonationAttempt(req, res, { checkBodyUserId: true, checkBodyRole: true })) return;

  const activity = activityRepository.findById(req.params.id);
  if (!activity) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      success: false,
      message: `Activity ${req.params.id} not found.`
    });
  }

  const payload = (req.body || {}) as RevisionRequestDTO;
  const result = workflowService.requestRevision(activity, req.authUser!, payload.reason || '');
  if (!result.success || !result.updatedActivity) {
    return res.status(result.statusCode).json({
      timestamp: new Date().toISOString(),
      status: result.statusCode,
      success: false,
      message: result.message
    });
  }

  const saved = activityRepository.save(result.updatedActivity);
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    status: 200,
    success: true,
    message: result.message,
    data: saved
  });
});
