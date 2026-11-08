import type { Response, NextFunction } from 'express';
import { Activity, TimelineStep, UserAccount, UserRole, WorkflowHistoryRecord } from '../../src/types';
import {
  getInitialTimelineForActionPlan,
  getWorkflowTimelineForOrg,
  isCollegeOrg
} from '../../src/data/initialData';
import { canonicalOrgId, isSameOrg } from '../../src/utils/organizationUtils';
import {
  AuthenticatedRequest,
  isAdminRole,
  normalizeOfficialRole,
  requireAuth
} from './AuthService';

export const SIX_OFFICIAL_END_USER_ROLES: readonly UserRole[] = [
  'ROLE_ORGANIZATION',
  'ROLE_ADVISER',
  'ROLE_DEAN',
  'ROLE_OSD',
  'ROLE_OVCSAS',
  'ROLE_ADMIN'
] as const;

/**
 * Returns the server-validated active role for the current session user.
 * Never reads role information from request bodies, query strings, or headers.
 */
export function getActiveSessionRole(user?: UserAccount | null): UserRole | null {
  if (!user) return null;
  return normalizeOfficialRole(user.activeRole || user.role);
}

/**
 * Express middleware enforcing that the authenticated user's ACTIVE session role
 * is one of the allowed official APMAMS roles.
 * - Unauthenticated requests -> 401 Unauthorized
 * - Authenticated requests without active role permission -> 403 Forbidden
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  const normalizedAllowed = new Set(
    allowedRoles.map(r => normalizeOfficialRole(r)).filter((r): r is UserRole => Boolean(r))
  );

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    return requireAuth(req, res, () => {
      const user = req.authUser;
      const activeRole = getActiveSessionRole(user);

      if (!user || !activeRole || !normalizedAllowed.has(activeRole)) {
        const assignedRoles = Array.isArray(user?.roles)
          ? user!.roles.map(r => normalizeOfficialRole(r)).filter((r): r is UserRole => Boolean(r))
          : [];
        const holdsInactiveRequiredRole = assignedRoles.some(r => normalizedAllowed.has(r));

        return res.status(403).json({
          timestamp: new Date().toISOString(),
          status: 403,
          success: false,
          code: holdsInactiveRequiredRole ? 'ROLE_SWITCH_REQUIRED' : 'FORBIDDEN',
          message: holdsInactiveRequiredRole
            ? 'Forbidden: Your account holds the required role, but you must switch your active session role before performing this action.'
            : 'Forbidden: Your active role does not have permission to access this resource.'
        });
      }

      return next();
    });
  };
}

/**
 * Detects and blocks attempts to impersonate another user, role, or organization
 * through untrusted request headers, query parameters, or body fields.
 * Returns true if an impersonation response (403) was sent.
 */
export function rejectImpersonationAttempt(
  req: AuthenticatedRequest,
  res: Response,
  options?: {
    checkBodyUserId?: boolean;
    checkBodyRole?: boolean;
    checkHeaderOrgId?: boolean;
  }
): boolean {
  const user = req.authUser;
  if (!user) return false;

  const activeRole = getActiveSessionRole(user);
  const callerIsAdmin = isAdminRole(activeRole);

  // 1. Custom identity headers (x-user-id, x-role, x-org-id)
  const headerUserId = req.headers['x-user-id'];
  if (typeof headerUserId === 'string' && headerUserId.trim() && headerUserId.trim() !== user.id) {
    res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'IMPERSONATION_BLOCKED',
      message: 'Forbidden: User identity cannot be overridden via x-user-id header.'
    });
    return true;
  }

  const headerRole = req.headers['x-role'];
  if (typeof headerRole === 'string' && headerRole.trim()) {
    const normHeaderRole = normalizeOfficialRole(headerRole);
    if (!normHeaderRole || normHeaderRole !== activeRole) {
      res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'IMPERSONATION_BLOCKED',
        message: 'Forbidden: Active role cannot be overridden via request headers.'
      });
      return true;
    }
  }

  if (options?.checkHeaderOrgId !== false && !callerIsAdmin) {
    const headerOrgId = req.headers['x-org-id'];
    if (
      typeof headerOrgId === 'string' &&
      headerOrgId.trim() &&
      (!user.orgId || !isSameOrg(headerOrgId.trim(), user.orgId))
    ) {
      res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'IMPERSONATION_BLOCKED',
        message: 'Forbidden: Organization scope cannot be overridden via x-org-id header.'
      });
      return true;
    }
  }

  // 2. Query string userId override
  const queryUserId = req.query?.userId;
  if (typeof queryUserId === 'string' && queryUserId.trim() && queryUserId.trim() !== user.id) {
    res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      success: false,
      code: 'IMPERSONATION_BLOCKED',
      message: 'Forbidden: User identity cannot be overridden via query parameters.'
    });
    return true;
  }

  // 3. Body userId / actorId override
  if (options?.checkBodyUserId !== false && req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const bodyUserId = req.body.userId;
    if (typeof bodyUserId === 'string' && bodyUserId.trim() && bodyUserId.trim() !== user.id) {
      res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'IMPERSONATION_BLOCKED',
        message: 'Forbidden: Actor userId in request body does not match authenticated session.'
      });
      return true;
    }

    const bodyActorId = req.body.actorId;
    if (typeof bodyActorId === 'string' && bodyActorId.trim() && bodyActorId.trim() !== user.id) {
      res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        success: false,
        code: 'IMPERSONATION_BLOCKED',
        message: 'Forbidden: actorId in request body does not match authenticated session.'
      });
      return true;
    }
  }

  // 4. Body role override on workflow actions
  if (options?.checkBodyRole && req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const bodyRole = req.body.role;
    if (typeof bodyRole === 'string' && bodyRole.trim()) {
      const normBodyRole = normalizeOfficialRole(bodyRole);
      if (!normBodyRole || normBodyRole !== activeRole) {
        res.status(403).json({
          timestamp: new Date().toISOString(),
          status: 403,
          success: false,
          code: 'IMPERSONATION_BLOCKED',
          message: 'Forbidden: Role in request body does not match active session role.'
        });
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves the canonical college code (CBIT, CELS, CFMS, CESS) for a College Dean account.
 */
export function resolveDeanCollegeId(user: UserAccount): string {
  if (user.collegeId && user.collegeId !== 'COLLEGE') {
    return canonicalOrgId(user.collegeId);
  }
  if (user.orgId && user.orgId !== 'COLLEGE' && user.orgId !== 'ALL') {
    return canonicalOrgId(user.orgId);
  }
  const hint = `${user.displayRole || ''} ${user.actualOrg || ''} ${user.email || ''}`.toUpperCase();
  if (hint.includes('CBIT')) return 'CBIT';
  if (hint.includes('CELS') || hint.includes('ELSSA')) return 'CELS';
  if (hint.includes('CFMS') || hint.includes('CMFS') || hint.includes('FIMSSO')) return 'CFMS';
  if (hint.includes('CESS')) return 'CESS';
  return '';
}

/**
 * Determines whether the authenticated user is permitted to view an organization's
 * private internal data (members list, accreditation attachments, restricted activity forms/remarks).
 */
export function canViewOrgPrivateData(
  user: UserAccount | null | undefined,
  targetOrgId?: string | null
): boolean {
  if (!user || !targetOrgId) return false;
  const activeRole = getActiveSessionRole(user);
  if (!activeRole) return false;

  // Institutional oversight and system administration
  if (activeRole === 'ROLE_ADMIN' || activeRole === 'ROLE_OSD' || activeRole === 'ROLE_OVCSAS') {
    return true;
  }

  // College Dean: only college organizations belonging to their assigned college
  if (activeRole === 'ROLE_DEAN') {
    if (!isCollegeOrg(targetOrgId)) return false;
    const deanCollege = resolveDeanCollegeId(user);
    return Boolean(deanCollege) && isSameOrg(deanCollege, targetOrgId);
  }

  // Organization Adviser or Organization Officer: strictly their own assigned organization
  if (activeRole === 'ROLE_ADVISER' || activeRole === 'ROLE_ORGANIZATION') {
    if (!user.orgId || user.orgId === 'ALL' || user.orgId === 'ADMIN' || user.orgId === 'COLLEGE') {
      return false;
    }
    return isSameOrg(user.orgId, targetOrgId);
  }

  return false;
}

/**
 * Determines whether the authenticated user can create, update, or delete activity records
 * belonging to targetOrgId through generic CRUD endpoints.
 */
export function canModifyOrgActivity(
  user: UserAccount | null | undefined,
  targetOrgId?: string | null
): boolean {
  if (!user || !targetOrgId) return false;
  const activeRole = getActiveSessionRole(user);
  if (activeRole === 'ROLE_ADMIN') return true;
  if (activeRole === 'ROLE_ORGANIZATION') {
    if (!user.orgId || user.orgId === 'ALL' || user.orgId === 'ADMIN' || user.orgId === 'COLLEGE') {
      return false;
    }
    return isSameOrg(user.orgId, targetOrgId);
  }
  return false;
}

/**
 * Redacts restricted internal fields (DAD forms, accomplishment/liquidation forms,
 * budget line items, reviewer decisions, and internal remarks) from another organization's
 * activity so campus-wide calendar scheduling & venue conflict detection remain functional
 * without leaking internal organization records.
 */
export function sanitizeActivityForCrossOrgCalendar(act: Activity): Activity {
  const redacted: any = {
    id: act.id,
    title: act.title,
    programActivity: act.programActivity || act.title,
    orgId: act.orgId,
    office: act.office || act.orgId,
    fiscalYear: act.fiscalYear,
    timeframe: act.timeframe,
    timeframeMonth: act.timeframeMonth,
    timeframeWeek: act.timeframeWeek,
    startDate: act.startDate,
    endDate: act.endDate,
    startTime: act.startTime,
    endTime: act.endTime,
    venue: act.venue,
    status: act.status,
    approvalStatus: act.approvalStatus,
    workflowStatus: act.workflowStatus,
    approvalStage: act.approvalStage,
    approvalStageIndex: act.approvalStageIndex,
    isActionPlanItem: act.isActionPlanItem,
    source: act.source,
    proposedBy: `${act.orgId} Organization`,
    description: '',
    budget: 0,
    amount: 0,
    totalBudget: 0,
    targetParticipants: 0
  };
  return redacted as Activity;
}

function isApprovedLikeStatus(act?: Partial<Activity> | null): boolean {
  if (!act) return false;
  const s = (act.status || '').toUpperCase();
  const as = act.approvalStatus || '';
  const ws = (act.workflowStatus || '').toUpperCase();
  return (
    s === 'APPROVED' ||
    as === 'Fully Approved' ||
    ws === 'COMPLETED'
  );
}

/**
 * Validates and normalizes an activity create/update payload submitted through generic CRUD
 * endpoints (POST /api/activities, PUT /api/activities/:id, POST /api/activities/batch-save).
 *
 * Enforces:
 * 1. Only active ROLE_ORGANIZATION (for own org) or active ROLE_ADMIN may write activities.
 * 2. Cross-organization creation/modification is rejected with 403 Forbidden.
 * 3. Non-admins cannot set adminOverride flags.
 * 4. Generic endpoints CANNOT forge approval status, skip stages, or alter approvalDecisions.
 */
export function enforceGenericActivityWritePolicy(
  caller: UserAccount,
  incoming: Partial<Activity>,
  existing?: Activity
): { ok: true; activity: Activity } | { ok: false; status: 400 | 403; code: string; message: string } {
  const activeRole = getActiveSessionRole(caller);
  const callerIsAdmin = activeRole === 'ROLE_ADMIN';
  const callerIsOrgOfficer = activeRole === 'ROLE_ORGANIZATION';

  if (!callerIsAdmin && !callerIsOrgOfficer) {
    return {
      ok: false,
      status: 403,
      code: 'FORBIDDEN_ROLE',
      message: 'Forbidden: Only Organization Officers (for their own organization) or System Administrators may create or edit activity records.'
    };
  }

  // Determine target organization and block cross-org writes
  const requestedOrg = (incoming.orgId || incoming.office || '').trim();
  const targetOrg = existing ? existing.orgId : (requestedOrg || caller.orgId || '');

  if (!targetOrg) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed: Organization (orgId) is required.'
    };
  }

  if (callerIsOrgOfficer) {
    if (!caller.orgId || !isSameOrg(caller.orgId, targetOrg)) {
      return {
        ok: false,
        status: 403,
        code: 'CROSS_ORG_FORBIDDEN',
        message: `Forbidden: Organization Officers of ${caller.orgId || 'unassigned'} cannot create or modify records belonging to ${targetOrg}.`
      };
    }
    if (requestedOrg && !isSameOrg(caller.orgId, requestedOrg)) {
      return {
        ok: false,
        status: 403,
        code: 'CROSS_ORG_FORBIDDEN',
        message: `Forbidden: Cannot assign or transfer an activity to unauthorized organization "${requestedOrg}".`
      };
    }
  } else if (existing && requestedOrg && !isSameOrg(existing.orgId, requestedOrg)) {
    return {
      ok: false,
      status: 403,
      code: 'ORG_IMMUTABLE',
      message: 'Forbidden: Cannot reassign an existing activity to a different organization.'
    };
  }

  // Block unauthorized adminOverride flags on DAD venue conflicts
  const incomingOverride = Boolean(
    (incoming.designForm as any)?.adminOverride?.isOverridden || (incoming as any)?.adminOverrideReason
  );
  const existingOverride = Boolean(
    (existing?.designForm as any)?.adminOverride?.isOverridden || (existing as any)?.adminOverrideReason
  );
  if (incomingOverride && !existingOverride && !callerIsAdmin) {
    return {
      ok: false,
      status: 403,
      code: 'ADMIN_OVERRIDE_FORBIDDEN',
      message: 'Forbidden: Only System Administrators may apply a venue conflict override.'
    };
  }

  const canonicalOrg = existing ? existing.orgId : canonicalOrgId(targetOrg);
  const isCol = isCollegeOrg(canonicalOrg);
  const isActionPlan = Boolean(
    incoming.isActionPlanItem ||
    incoming.source === 'ACTION_PLAN' ||
    incoming.isPlanConfirmed !== undefined ||
    incoming.timeframeMonth ||
    incoming.id?.startsWith('ACT-2027-') ||
    incoming.fiscalYear?.includes('2027') ||
    existing?.isActionPlanItem ||
    existing?.source === 'ACTION_PLAN' ||
    existing?.isPlanConfirmed !== undefined ||
    existing?.timeframeMonth ||
    existing?.id?.startsWith('ACT-2027-') ||
    existing?.fiscalYear?.includes('2027')
  );

  // =========================================================================
  // CASE 1: Brand-New Activity Creation (!existing)
  // =========================================================================
  if (!existing) {
    // If it's an Action Plan activity, the organization directly sets Approved, Rejected, or Draft
    if (isActionPlan && canModifyOrgActivity(caller, canonicalOrg)) {
      const isApprovedChoice = incoming.status === 'Approved' || incoming.approvalStatus === 'Fully Approved';
      const isRejectedChoice = incoming.status === 'Rejected' || incoming.approvalStatus === 'Rejected';
      const stage1Title = isCol
        ? 'Stage 1: College Organization Submission'
        : 'Stage 1: Organization Submission';

      const cleanNew: Activity = {
        ...(incoming as Activity),
        id: incoming.id || `ACT-${new Date().getFullYear()}-${canonicalOrg}-${Math.floor(100 + Math.random() * 900)}`,
        orgId: canonicalOrg as any,
        office: incoming.office || canonicalOrg,
        status: isApprovedChoice ? 'Approved' : (isRejectedChoice ? 'Rejected' : 'Draft'),
        workflowStatus: isApprovedChoice ? 'COMPLETED' : (isRejectedChoice ? 'REJECTED' : 'DRAFT'),
        approvalStatus: isApprovedChoice ? 'Fully Approved' : (isRejectedChoice ? 'Rejected' : 'Draft'),
        approvalStageIndex: 1,
        approvalStage: isApprovedChoice ? 'Approved by Organization' : (isRejectedChoice ? 'Rejected by Organization' : stage1Title),
        currentApproverRole: isApprovedChoice || isRejectedChoice ? undefined : 'ROLE_ORGANIZATION',
        timeline: getInitialTimelineForActionPlan(canonicalOrg),
        approvalDecisions: isApprovedChoice ? [
          {
            id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            activityId: incoming.id || '',
            approverId: caller.id,
            approverName: caller.name,
            approverRole: activeRole || 'ROLE_ORGANIZATION',
            stageName: 'Organization Approval',
            decision: 'APPROVE',
            remarks: incoming.rejectionRemarks || 'Approved by Organization Officer',
            timestamp: new Date().toISOString()
          }
        ] : (isRejectedChoice ? [
          {
            id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            activityId: incoming.id || '',
            approverId: caller.id,
            approverName: caller.name,
            approverRole: activeRole || 'ROLE_ORGANIZATION',
            stageName: 'Organization Review',
            decision: 'REJECT',
            remarks: incoming.rejectionRemarks || 'Rejected by Organization',
            timestamp: new Date().toISOString()
          }
        ] : []),
        workflowHistory: [],
        rejectedBy: isRejectedChoice ? caller.name : undefined,
        rejectedAt: isRejectedChoice ? new Date().toISOString() : undefined,
        rejectionRemarks: isRejectedChoice ? (incoming.rejectionRemarks || 'Rejected by Organization') : undefined,
        deferredBy: undefined,
        deferredAt: undefined,
        deferReason: undefined,
        deferredRemarks: undefined
      };

      return { ok: true, activity: cleanNew };
    }

    // Reject attempts to create an activity with forged approvals, advanced stages, or fake decisions
    if (
      isApprovedLikeStatus(incoming) ||
      incoming.approvalStatus === 'Approved at Current Stage' ||
      (typeof incoming.approvalStageIndex === 'number' && incoming.approvalStageIndex > 2) ||
      (Array.isArray(incoming.approvalDecisions) && incoming.approvalDecisions.length > 0) ||
      (Array.isArray(incoming.timeline) &&
        incoming.timeline.some((s: TimelineStep) => s.id >= 2 && s.status === 'completed'))
    ) {
      return {
        ok: false,
        status: 403,
        code: 'WORKFLOW_BYPASS_BLOCKED',
        message: 'Forbidden: Approval status, stage progression, and approver decisions cannot be set via generic activity creation.'
      };
    }

    if (incoming.accomplishmentForm?.isCompleted) {
      return {
        ok: false,
        status: 403,
        code: 'STAGE_BYPASS_BLOCKED',
        message: 'Forbidden: Accomplishment report cannot be submitted before proposal approval stages are completed.'
      };
    }

    const dadDone = Boolean(incoming.designForm?.isCompleted);
    const stage1Title = isCol
      ? 'Stage 1: College Organization Submission'
      : 'Stage 1: Organization Submission';

    const initialHistory: WorkflowHistoryRecord[] = dadDone
      ? [
          {
            id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            stageId: 1,
            stageName: stage1Title,
            action: 'SUBMIT',
            actorId: caller.id,
            actorName: caller.name,
            actorRole: activeRole || 'ROLE_ORGANIZATION',
            remark: 'Detailed Activity Design (DAD) form submitted.',
            timestamp: new Date().toISOString()
          }
        ]
      : [];

    const cleanNew: Activity = {
      ...(incoming as Activity),
      id: incoming.id || `ACT-${new Date().getFullYear()}-${canonicalOrg}-${Math.floor(100 + Math.random() * 900)}`,
      orgId: canonicalOrg as any,
      office: canonicalOrg,
      status: dadDone ? 'Pending' : 'Draft',
      workflowStatus: dadDone ? 'IN_PROGRESS' : 'DRAFT',
      approvalStatus: dadDone ? 'Pending Review' : 'Draft',
      approvalStageIndex: dadDone ? 2 : 1,
      approvalStage: dadDone ? 'Stage 2: Assigned Adviser Review' : stage1Title,
      currentApproverRole: dadDone ? 'ROLE_ADVISER' : 'ROLE_ORGANIZATION',
      timeline: dadDone
        ? getWorkflowTimelineForOrg(canonicalOrg, true)
        : getInitialTimelineForActionPlan(canonicalOrg),
      approvalDecisions: [],
      workflowHistory: initialHistory,
      rejectedBy: undefined,
      rejectedAt: undefined,
      rejectionRemarks: undefined,
      deferredBy: undefined,
      deferredAt: undefined,
      deferReason: undefined,
      deferredRemarks: undefined
    };

    return { ok: true, activity: cleanNew };
  }

  // =========================================================================
  // CASE 2: Updating an Existing Activity (existing !== undefined)
  // =========================================================================
  const existingWasApproved = isApprovedLikeStatus(existing);
  const existingWasRejected =
    existing.status === 'Rejected' || existing.approvalStatus === 'Rejected';

  if (!callerIsAdmin && !isActionPlan && (existingWasApproved || existingWasRejected)) {
    return {
      ok: false,
      status: 403,
      code: 'LOCKED_ACTIVITY',
      message: 'Forbidden: Activities that have already been finally approved or rejected cannot be modified.'
    };
  }

  // 2a. Block tampering with approvalDecisions
  if (incoming.approvalDecisions !== undefined) {
    const existingDecisionsJson = JSON.stringify(existing.approvalDecisions || []);
    const incomingDecisionsJson = JSON.stringify(incoming.approvalDecisions || []);
    if (incomingDecisionsJson !== existingDecisionsJson) {
      return {
        ok: false,
        status: 403,
        code: 'DECISION_TAMPER_BLOCKED',
        message: 'Forbidden: Approver decisions cannot be modified through generic update endpoints.'
      };
    }
  }

  // 2b. Block forging Approved / Completed status when existing was not approved (non-action-plan only)
  if (!isActionPlan && !existingWasApproved && isApprovedLikeStatus(incoming)) {
    return {
      ok: false,
      status: 403,
      code: 'WORKFLOW_BYPASS_BLOCKED',
      message: 'Forbidden: Cannot change activity status to Approved through generic update endpoints.'
    };
  }

  if (
    incoming.approvalStatus === 'Approved at Current Stage' &&
    existing.approvalStatus !== 'Approved at Current Stage'
  ) {
    return {
      ok: false,
      status: 403,
      code: 'WORKFLOW_BYPASS_BLOCKED',
      message: 'Forbidden: Cannot set stage approval status through generic update endpoints.'
    };
  }

  const existingDadDone = Boolean(existing.designForm?.isCompleted);
  const nextDesignForm = incoming.designForm !== undefined ? incoming.designForm : existing.designForm;
  const nextDadDone = Boolean(nextDesignForm?.isCompleted);

  const existingAccompDone = Boolean(existing.accomplishmentForm?.isCompleted);
  const nextAccompForm =
    incoming.accomplishmentForm !== undefined ? incoming.accomplishmentForm : existing.accomplishmentForm;
  const nextAccompDone = Boolean(nextAccompForm?.isCompleted);

  const ovcsasStageId = isCol ? 5 : 4;
  const accompStageId = isCol ? 6 : 5;
  const finalAdviserStageId = isCol ? 7 : 6;
  const ovcsasAlreadyCompleted = Boolean(
    existing.timeline?.find(s => s.id === ovcsasStageId)?.status === 'completed'
  );

  // Block submitting Accomplishment Report before OVCSAS stage is completed
  if (!existingAccompDone && nextAccompDone && !ovcsasAlreadyCompleted) {
    return {
      ok: false,
      status: 403,
      code: 'STAGE_BYPASS_BLOCKED',
      message: 'Forbidden: Accomplishment report cannot be submitted until OVCSAS approval is completed.'
    };
  }

  const existingStageIdx = existing.approvalStageIndex || 1;
  const isTransitionStage1To2 = nextDadDone && existingStageIdx <= 1;
  const isTransitionAccomplishment = !existingAccompDone && nextAccompDone && ovcsasAlreadyCompleted;

  // Block arbitrary approvalStageIndex jumps or timeline tampering
  if (
    typeof incoming.approvalStageIndex === 'number' &&
    incoming.approvalStageIndex > existingStageIdx &&
    !(isTransitionStage1To2 && incoming.approvalStageIndex === 2) &&
    !(isTransitionAccomplishment && incoming.approvalStageIndex === finalAdviserStageId)
  ) {
    return {
      ok: false,
      status: 403,
      code: 'STAGE_BYPASS_BLOCKED',
      message: 'Forbidden: Cannot advance workflow stage index through generic update endpoints.'
    };
  }

  if (Array.isArray(incoming.timeline) && !isTransitionStage1To2 && !isTransitionAccomplishment) {
    const newlyCompletedApproverStep = incoming.timeline.some((incStep: TimelineStep) => {
      if (incStep.status !== 'completed') return false;
      const oldStep = existing.timeline?.find(s => s.id === incStep.id);
      return oldStep?.status !== 'completed';
    });
    if (newlyCompletedApproverStep) {
      return {
        ok: false,
        status: 403,
        code: 'WORKFLOW_BYPASS_BLOCKED',
        message: 'Forbidden: Cannot mark workflow stages completed through generic update endpoints.'
      };
    }
  }

  // Construct server-authoritative workflow fields
  let nextStatus = existing.status;
  let nextWorkflowStatus = existing.workflowStatus;
  let nextApprovalStatus = existing.approvalStatus;
  let nextApprovalStage = existing.approvalStage;
  let nextApprovalStageIndex = existingStageIdx;
  let nextCurrentApproverRole = existing.currentApproverRole;
  let nextTimeline = existing.timeline || getWorkflowTimelineForOrg(canonicalOrg, nextDadDone);
  let nextHistory = [...(existing.workflowHistory || [])];

  if (isTransitionStage1To2) {
    nextStatus = 'Pending';
    nextWorkflowStatus = 'IN_PROGRESS';
    nextApprovalStatus = 'Pending Review';
    nextApprovalStage = 'Stage 2: Assigned Adviser Review';
    nextApprovalStageIndex = 2;
    nextCurrentApproverRole = 'ROLE_ADVISER';
    nextTimeline = getWorkflowTimelineForOrg(canonicalOrg, true);
    nextHistory.push({
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      stageId: 1,
      stageName: isCol ? 'Stage 1: College Organization Submission' : 'Stage 1: Organization Submission',
      action: 'SUBMIT',
      actorId: caller.id,
      actorName: caller.name,
      actorRole: activeRole || 'ROLE_ORGANIZATION',
      remark: 'Detailed Activity Design (DAD) form submitted. Forwarded to Assigned Adviser.',
      timestamp: new Date().toISOString()
    });
  } else if (isTransitionAccomplishment) {
    nextStatus = 'Pending';
    nextWorkflowStatus = 'IN_PROGRESS';
    nextApprovalStatus = 'Approved at Current Stage';
    nextApprovalStage = `Stage ${finalAdviserStageId}: Adviser Accomplishment Review & Final Sign-Off`;
    nextApprovalStageIndex = finalAdviserStageId;
    nextCurrentApproverRole = 'ROLE_ADVISER';
    nextTimeline = (existing.timeline || getWorkflowTimelineForOrg(canonicalOrg, true)).map(step => {
      if (step.id <= accompStageId) {
        return { ...step, status: 'completed' as const, updatedAt: step.updatedAt || new Date().toISOString().split('T')[0] };
      }
      if (step.id === finalAdviserStageId) {
        return { ...step, status: 'in_progress' as const };
      }
      return step;
    });
    nextHistory.push({
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      stageId: accompStageId,
      stageName: `Stage ${accompStageId}: Accomplishment Report Submission`,
      action: 'SUBMIT',
      actorId: caller.id,
      actorName: caller.name,
      actorRole: activeRole || 'ROLE_ORGANIZATION',
      remark: 'Accomplishment and liquidation report submitted to Adviser for final sign-off.',
      timestamp: new Date().toISOString()
    });
  } else if (isActionPlan && canModifyOrgActivity(caller, canonicalOrg) && !nextDadDone) {
    const isApprovedChoice = incoming.status === 'Approved' || incoming.approvalStatus === 'Fully Approved' || incoming.actionPlanStatus === 'Approved';
    const isRejectedChoice = incoming.status === 'Rejected' || incoming.approvalStatus === 'Rejected' || incoming.actionPlanStatus === 'Rejected';
    const isDraftChoice = incoming.status === 'Draft' || incoming.approvalStatus === 'Draft';

    if (isApprovedChoice) {
      // NOTE: Approved in Action Plan does NOT complete workflow. It stays Draft at Stage 1 so org can fill DAD form!
      nextStatus = 'Draft';
      nextWorkflowStatus = 'DRAFT';
      nextApprovalStatus = 'Draft';
      nextApprovalStage = isCol
        ? 'Stage 1: College Organization Submission'
        : 'Stage 1: Organization Submission';
      nextApprovalStageIndex = 1;
      nextCurrentApproverRole = 'ROLE_ORGANIZATION';
    } else if (isRejectedChoice) {
      nextStatus = 'Rejected';
      nextWorkflowStatus = 'REJECTED';
      nextApprovalStatus = 'Rejected';
      nextApprovalStage = 'Rejected by Organization';
      nextApprovalStageIndex = 1;
      nextCurrentApproverRole = undefined;
    } else if (isDraftChoice) {
      nextStatus = 'Draft';
      nextWorkflowStatus = 'DRAFT';
      nextApprovalStatus = 'Draft';
      nextApprovalStage = isCol
        ? 'Stage 1: College Organization Submission'
        : 'Stage 1: Organization Submission';
      nextApprovalStageIndex = 1;
      nextCurrentApproverRole = 'ROLE_ORGANIZATION';
    }
  } else if (!nextDadDone && !existingWasRejected && !isActionPlan) {
    nextStatus = 'Draft';
    nextWorkflowStatus = 'DRAFT';
    nextApprovalStatus = 'Draft';
    nextApprovalStageIndex = 1;
    nextApprovalStage = isCol
      ? 'Stage 1: College Organization Submission'
      : 'Stage 1: Organization Submission';
    nextCurrentApproverRole = 'ROLE_ORGANIZATION';
    nextTimeline = getInitialTimelineForActionPlan(canonicalOrg);
  }

  const safeUpdated: Activity = {
    ...existing,
    ...incoming,
    id: existing.id,
    orgId: existing.orgId,
    office: existing.office || existing.orgId,
    designForm: nextDesignForm,
    accomplishmentForm: nextAccompForm,
    status: nextStatus,
    workflowStatus: nextWorkflowStatus,
    approvalStatus: nextApprovalStatus,
    approvalStage: nextApprovalStage,
    approvalStageIndex: nextApprovalStageIndex,
    currentApproverRole: nextCurrentApproverRole,
    timeline: nextTimeline,
    approvalDecisions: existing.approvalDecisions || [],
    workflowHistory: nextHistory,
    rejectedBy: existing.rejectedBy,
    rejectedAt: existing.rejectedAt,
    rejectionRemarks: existing.rejectionRemarks,
    deferredBy: existing.deferredBy,
    deferredAt: existing.deferredAt,
    deferReason: existing.deferReason,
    deferredRemarks: existing.deferredRemarks
  };

  return { ok: true, activity: safeUpdated };
}

