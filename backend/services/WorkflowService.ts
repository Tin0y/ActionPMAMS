import { Activity, TimelineStep, UserAccount, WorkflowHistoryRecord, ActivityApprovalDecision } from '../../src/types';
import { isCollegeOrg, getWorkflowTimelineForOrg, evaluateStepPermission } from '../../src/data/initialData';
import { isSameOrg } from '../../src/utils/organizationUtils';
import { getActiveSessionRole } from './AuthorizationService';
import { normalizeOfficialRole } from './AuthService';

export class WorkflowService {
  /**
   * Determine whether an organization requires College Dean routing
   */
  public isCollege(orgId?: string): boolean {
    return isCollegeOrg(orgId);
  }

  /**
   * Return the configured workflow stages for an organization
   */
  public getStagesForOrg(orgId: string, dadCompleted = false): TimelineStep[] {
    return getWorkflowTimelineForOrg(orgId, dadCompleted);
  }

  /**
   * Maximum approval stages for the activity
   */
  public getMaxStages(orgId: string): number {
    return this.isCollege(orgId) ? 7 : 6;
  }

  /**
   * Calculate the current active stage index (1-based)
   */
  public getCurrentStageIndex(activity: Activity): number {
    if (!activity.designForm?.isCompleted) {
      return 1;
    }
    const maxStages = this.getMaxStages(activity.orgId);
    if (activity.approvalStatus === 'Fully Approved' || activity.status === 'Approved' || activity.workflowStatus === 'COMPLETED') {
      return maxStages;
    }
    if (activity.approvalStageIndex && activity.approvalStageIndex > 1) {
      return Math.min(activity.approvalStageIndex, maxStages);
    }
    if (activity.timeline && activity.timeline.length > 0) {
      const inProgress = activity.timeline.find((s: TimelineStep) => s.status === 'in_progress');
      if (inProgress && inProgress.id > 1) return Math.min(inProgress.id, maxStages);
      const lastCompleted = [...activity.timeline].reverse().find((s: TimelineStep) => s.status === 'completed');
      if (lastCompleted && lastCompleted.id >= 1) return Math.min(Math.max(lastCompleted.id + 1, 2), maxStages);
    }
    const stage = activity.approvalStage?.toLowerCase() || '';
    if (stage.includes('sign-off') || stage.includes('final')) return maxStages;
    if (stage.includes('accomplishment') || stage.includes('liquidation')) return this.isCollege(activity.orgId) ? 6 : 5;
    if (stage.includes('ovcsas')) return this.isCollege(activity.orgId) ? 5 : 4;
    if (stage.includes('osd')) return this.isCollege(activity.orgId) ? 4 : 3;
    if (stage.includes('dean')) return 3;
    if (stage.includes('adviser')) return 2;
    return 2;
  }

  private withActiveRole(user: UserAccount): UserAccount | null {
    const activeRole = getActiveSessionRole(user);
    if (!activeRole) return null;
    return {
      ...user,
      role: activeRole,
      activeRole
    };
  }

  private isDeferredState(activity: Activity): boolean {
    return (
      activity.approvalStatus === 'Deferred' ||
      activity.status === 'DEFERRED' ||
      activity.status === 'DEFERRED FOR REVISION' ||
      activity.approvalStage === 'DEFERRED FOR REVISION'
    );
  }

  /**
   * Approve an activity individually at its current stage
   */
  public approveActivity(
    activity: Activity,
    currentUser: UserAccount,
    remarks?: string
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return {
        success: false,
        message: 'Forbidden: Active session role is not authorized to perform approvals.',
        statusCode: 403
      };
    }

    const activeRole = normalizeOfficialRole(effectiveUser.activeRole || effectiveUser.role);

    if (!activity.designForm?.isCompleted) {
      return {
        success: false,
        message: 'Cannot approve activity: The Detailed Activity Design (DAD) form has not been filled out and submitted yet.',
        statusCode: 400
      };
    }

    const maxStages = this.getMaxStages(activity.orgId);
    const currentStage = this.getCurrentStageIndex(activity);

    if (activity.approvalStatus === 'Fully Approved' || activity.status === 'Approved' || activity.workflowStatus === 'COMPLETED') {
      return {
        success: false,
        message: 'Activity has already completed all approval stages.',
        statusCode: 400
      };
    }

    if (activity.approvalStatus === 'Rejected' || activity.status === 'Rejected') {
      return {
        success: false,
        message: 'Activity has been permanently rejected for this submission.',
        statusCode: 400
      };
    }

    if (this.isDeferredState(activity)) {
      return {
        success: false,
        message: 'Cannot approve activity while deferred: the organization must revise and resubmit it first.',
        statusCode: 403
      };
    }

    const perm = evaluateStepPermission(effectiveUser, activity, currentStage);
    if (!perm.canApprove) {
      return {
        success: false,
        message: `Permission Denied: ${perm.reason}`,
        statusCode: 403
      };
    }

    const stages = this.getStagesForOrg(activity.orgId, true);
    const currentTimeline: TimelineStep[] = (activity.timeline && activity.timeline.length > 0)
      ? [...activity.timeline]
      : JSON.parse(JSON.stringify(stages));

    const currentStepObj = currentTimeline.find((s: TimelineStep) => s.id === currentStage);
    const currentStepTitle = currentStepObj ? currentStepObj.title : `Stage ${currentStage}`;
    const isFinalStage = currentStage >= maxStages;

    // Advance timeline
    const updatedTimeline = currentTimeline.map((step: TimelineStep) => {
      if (step.id <= currentStage) {
        return {
          ...step,
          status: 'completed' as const,
          updatedAt: step.updatedAt || new Date().toISOString().split('T')[0]
        };
      }
      if (!isFinalStage && step.id === currentStage + 1) {
        return {
          ...step,
          status: 'in_progress' as const
        };
      }
      return step;
    });

    const nextStepObj = updatedTimeline.find((s: TimelineStep) => s.id === currentStage + 1);
    const nextStageTitle = nextStepObj ? nextStepObj.title : 'Approved / Completed';

    const decisionRecord: ActivityApprovalDecision = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activityId: activity.id,
      approverId: effectiveUser.id,
      approverName: effectiveUser.name,
      approverRole: effectiveUser.role,
      stageName: currentStepTitle,
      decision: 'APPROVE',
      remarks: remarks || (isFinalStage ? 'Final accomplishment review and sign-off granted.' : `Approved at ${currentStepTitle}.`),
      timestamp: new Date().toISOString(),
      versionReviewed: activity.version || 1
    };

    const existingDecisions = activity.approvalDecisions || [];
    const updatedDecisions = [...existingDecisions, decisionRecord];

    const historyRecord: WorkflowHistoryRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: currentStage,
      stageName: currentStepTitle,
      action: isFinalStage ? 'FINAL_APPROVE' : 'APPROVE',
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: decisionRecord.remarks,
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [...(activity.workflowHistory || []), historyRecord];

    const updatedActivity: Activity = {
      ...activity,
      approvalStatus: isFinalStage ? 'Fully Approved' : 'Approved at Current Stage',
      status: isFinalStage ? 'Approved' : 'Pending',
      workflowStatus: isFinalStage ? 'COMPLETED' : 'IN_PROGRESS',
      approvalStage: isFinalStage ? 'Approved' : nextStageTitle,
      approvalStageIndex: isFinalStage ? maxStages : currentStage + 1,
      currentApproverRole: nextStepObj?.role,
      timeline: updatedTimeline,
      approvalDecisions: updatedDecisions,
      workflowHistory: updatedHistory,
      deferReason: undefined,
      deferredBy: undefined,
      deferredAt: undefined,
      deferredRemarks: undefined
    };

    return {
      success: true,
      updatedActivity,
      message: isFinalStage
        ? 'Activity accomplishment report granted final sign-off and marked Fully Approved!'
        : `Approved at ${currentStepTitle}. Forwarded to ${nextStageTitle}.`,
      statusCode: 200
    };
  }

  /**
   * Defer activity with mandatory remarks
   */
  public deferActivity(
    activity: Activity,
    currentUser: UserAccount,
    reason: string,
    requestedStepId?: number
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return {
        success: false,
        message: 'Forbidden: Active session role is not authorized.',
        statusCode: 403
      };
    }

    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: 'A detailed reason/remark is mandatory when deferring an activity for revision.',
        statusCode: 400
      };
    }

    if (
      this.isDeferredState(activity) ||
      activity.approvalStatus === 'Rejected' ||
      activity.status === 'Rejected' ||
      activity.approvalStatus === 'Fully Approved' ||
      activity.status === 'Approved'
    ) {
      return {
        success: false,
        message: 'Forbidden: Cannot overwrite an existing decision on a deferred, rejected, or completed activity.',
        statusCode: 403
      };
    }

    const actualStage = this.getCurrentStageIndex(activity);
    if (requestedStepId !== undefined && Number(requestedStepId) !== actualStage) {
      return {
        success: false,
        message: `Stage bypass blocked: Activity is currently at stage ${actualStage}; cannot defer stage ${requestedStepId}.`,
        statusCode: 403
      };
    }

    const perm = evaluateStepPermission(effectiveUser, activity, actualStage);
    if (!perm.canDefer) {
      return {
        success: false,
        message: `Permission Denied: ${perm.reason}`,
        statusCode: 403
      };
    }

    const stages = this.getStagesForOrg(activity.orgId, true);
    const currentTimeline: TimelineStep[] = (activity.timeline && activity.timeline.length > 0)
      ? [...activity.timeline]
      : JSON.parse(JSON.stringify(stages));

    const currentStepObj = currentTimeline.find((s: TimelineStep) => s.id === actualStage);
    const stageTitle = currentStepObj ? currentStepObj.title : `Stage ${actualStage}`;

    const decisionRecord: ActivityApprovalDecision = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activityId: activity.id,
      approverId: effectiveUser.id,
      approverName: effectiveUser.name,
      approverRole: effectiveUser.role,
      stageName: stageTitle,
      decision: 'DEFER',
      remarks: reason.trim(),
      timestamp: new Date().toISOString(),
      versionReviewed: activity.version || 1
    };

    const historyRecord: WorkflowHistoryRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: actualStage,
      stageName: stageTitle,
      action: 'DEFER',
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: reason.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedActivity: Activity = {
      ...activity,
      approvalStatus: 'Deferred',
      status: 'DEFERRED',
      approvalStage: 'DEFERRED FOR REVISION',
      deferReason: reason.trim(),
      deferredRemarks: reason.trim(),
      deferredBy: `${effectiveUser.name} (${effectiveUser.role})`,
      deferredAt: new Date().toISOString(),
      timeline: currentTimeline,
      approvalDecisions: [...(activity.approvalDecisions || []), decisionRecord],
      workflowHistory: [...(activity.workflowHistory || []), historyRecord]
    };

    return {
      success: true,
      updatedActivity,
      message: `Activity has been deferred for revision and returned to ${activity.orgId}.`,
      statusCode: 200
    };
  }

  /**
   * Final rejection by authorized institutional reviewer at the active workflow stage
   */
  public rejectActivity(
    activity: Activity,
    currentUser: UserAccount,
    remarks: string,
    requestedStepId?: number
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return {
        success: false,
        message: 'Forbidden: Active session role is not authorized.',
        statusCode: 403
      };
    }

    if (!remarks || !remarks.trim()) {
      return {
        success: false,
        message: 'A mandatory remark/reason explaining the final rejection is required under institutional policy.',
        statusCode: 400
      };
    }

    const activeRole = normalizeOfficialRole(effectiveUser.activeRole || effectiveUser.role);
    const isActionPlan = Boolean(
      activity.isActionPlanItem ||
      activity.source === 'ACTION_PLAN' ||
      activity.isPlanConfirmed !== undefined ||
      activity.timeframeMonth ||
      (activity.fiscalYear && activity.fiscalYear.includes('2027')) ||
      activity.id?.startsWith('ACT-2027-')
    );
    const isOrgOfficerForOrg =
      (activeRole === 'ROLE_ORGANIZATION' ||
        effectiveUser.role === 'ROLE_ORGANIZATION' ||
        effectiveUser.role === 'Student Organization Officer' ||
        effectiveUser.role === 'Org President' ||
        effectiveUser.role === 'Org Treasurer') &&
      isSameOrg(effectiveUser.orgId, activity.orgId);
    const callerIsAdmin =
      activeRole === 'ROLE_ADMIN' ||
      effectiveUser.role === 'ROLE_ADMIN' ||
      effectiveUser.role === 'System Administrator';

    // Direct organization rejection for Action Plan activities (no routing required)
    if (isActionPlan || isOrgOfficerForOrg) {
      if (!isOrgOfficerForOrg && !callerIsAdmin) {
        return {
          success: false,
          message: `Forbidden: Only officers of ${activity.orgId} or administrators can reject this action plan activity.`,
          statusCode: 403
        };
      }

      const updatedActivity: Activity = {
        ...activity,
        status: 'Rejected',
        approvalStatus: 'Rejected',
        workflowStatus: 'REJECTED',
        approvalStage: 'Rejected by Organization',
        approvalStageIndex: 1,
        isActionPlanItem: true,
        source: 'ACTION_PLAN',
        isPlanConfirmed: activity.isPlanConfirmed ?? false,
        currentApproverRole: undefined,
        deferReason: undefined,
        deferredRemarks: undefined,
        deferredBy: undefined,
        deferredAt: undefined,
        rejectionRemarks: remarks.trim(),
        rejectedBy: effectiveUser.name,
        rejectedAt: new Date().toISOString(),
        approvalDecisions: [
          ...(activity.approvalDecisions || []),
          {
            id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            activityId: activity.id,
            approverId: effectiveUser.id,
            approverName: effectiveUser.name,
            approverRole: effectiveUser.role,
            stageName: 'Organization Review',
            decision: 'REJECT',
            remarks: remarks.trim(),
            timestamp: new Date().toISOString(),
            versionReviewed: activity.version || 1
          }
        ],
        workflowHistory: [
          ...(activity.workflowHistory || []),
          {
            id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            stageId: 1,
            stageName: 'Organization Review',
            action: 'REJECT',
            actorId: effectiveUser.id,
            actorName: effectiveUser.name,
            actorRole: effectiveUser.role,
            remark: remarks.trim(),
            timestamp: new Date().toISOString()
          }
        ]
      };

      return {
        success: true,
        updatedActivity,
        message: `Activity "${activity.title}" rejected by ${activity.orgId}.`,
        statusCode: 200
      };
    }

    if (
      this.isDeferredState(activity) ||
      activity.approvalStatus === 'Rejected' ||
      activity.status === 'Rejected' ||
      activity.approvalStatus === 'Fully Approved' ||
      activity.status === 'Approved'
    ) {
      return {
        success: false,
        message: 'Forbidden: Cannot overwrite an existing decision on a deferred, rejected, or completed activity.',
        statusCode: 403
      };
    }

    const actualStage = this.getCurrentStageIndex(activity);
    if (requestedStepId !== undefined && Number(requestedStepId) !== actualStage) {
      return {
        success: false,
        message: `Stage bypass blocked: Activity is currently at stage ${actualStage}; cannot reject stage ${requestedStepId}.`,
        statusCode: 403
      };
    }

    const perm = evaluateStepPermission(effectiveUser, activity, actualStage);
    if (!perm.canReject) {
      return {
        success: false,
        message: `Permission Denied: ${perm.reason}`,
        statusCode: 403
      };
    }

    const stages = this.getStagesForOrg(activity.orgId, true);
    const currentTimeline: TimelineStep[] = (activity.timeline && activity.timeline.length > 0)
      ? [...activity.timeline]
      : JSON.parse(JSON.stringify(stages));

    const currentStepObj = currentTimeline.find((s: TimelineStep) => s.id === actualStage);
    const stageTitle = currentStepObj ? currentStepObj.title : `Stage ${actualStage}`;

    const decisionRecord: ActivityApprovalDecision = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activityId: activity.id,
      approverId: effectiveUser.id,
      approverName: effectiveUser.name,
      approverRole: effectiveUser.role,
      stageName: stageTitle,
      decision: 'REJECT',
      remarks: remarks.trim(),
      timestamp: new Date().toISOString(),
      versionReviewed: activity.version || 1
    };

    const historyRecord: WorkflowHistoryRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: actualStage,
      stageName: stageTitle,
      action: 'DEFER',
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: `[REJECTED] ${remarks.trim()}`,
      timestamp: new Date().toISOString()
    };

    const updatedActivity: Activity = {
      ...activity,
      approvalStatus: 'Rejected',
      status: 'Rejected',
      approvalStage: 'REJECTED',
      rejectionRemarks: remarks.trim(),
      rejectedBy: `${effectiveUser.name} (${effectiveUser.role})`,
      rejectedAt: new Date().toISOString(),
      timeline: currentTimeline,
      approvalDecisions: [...(activity.approvalDecisions || []), decisionRecord],
      workflowHistory: [...(activity.workflowHistory || []), historyRecord]
    };

    return {
      success: true,
      updatedActivity,
      message: 'Activity has been permanently rejected for this submission.',
      statusCode: 200
    };
  }

  /**
   * Resubmit activity after revision by the owning Organization Officer
   */
  public resubmitActivity(
    activity: Activity,
    currentUser: UserAccount,
    notes?: string
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return {
        success: false,
        message: 'Forbidden: Active session role is not authorized.',
        statusCode: 403
      };
    }

    const isOwningOrgOfficer =
      effectiveUser.role === 'ROLE_ORGANIZATION' &&
      Boolean(effectiveUser.orgId) &&
      isSameOrg(effectiveUser.orgId, activity.orgId);

    if (!isOwningOrgOfficer) {
      return {
        success: false,
        message: `Forbidden: Only ${activity.orgId} Organization Officers can resubmit this deferred activity.`,
        statusCode: 403
      };
    }

    if (activity.approvalStatus === 'Rejected' || activity.status === 'Rejected') {
      return {
        success: false,
        message: 'Rejected activities cannot be resubmitted. Rejection is permanent for this submission.',
        statusCode: 400
      };
    }

    if (!this.isDeferredState(activity)) {
      return {
        success: false,
        message: 'Only deferred activities awaiting revision can be resubmitted.',
        statusCode: 400
      };
    }

    if (!activity.designForm?.isCompleted) {
      return {
        success: false,
        message: 'Cannot resubmit activity: Please fill out and submit the Detailed Activity Design (DAD) form first.',
        statusCode: 400
      };
    }

    const stages = this.getStagesForOrg(activity.orgId, true);
    const updatedTimeline = stages.map((s, idx) => ({
      ...s,
      status: idx === 0 ? ('completed' as const) : (idx === 1 ? ('in_progress' as const) : ('pending' as const)),
      updatedAt: idx === 0 ? new Date().toISOString().split('T')[0] : undefined
    }));

    const newVersion = (activity.version || 1) + 1;

    const historyRecord: WorkflowHistoryRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: 2,
      stageName: 'Adviser Review',
      action: 'RESUBMIT',
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: notes || `Revised proposal (v${newVersion}) resubmitted by organization.`,
      timestamp: new Date().toISOString()
    };

    const updatedActivity: Activity = {
      ...activity,
      version: newVersion,
      approvalStatus: 'Pending Review',
      status: 'Pending',
      workflowStatus: 'IN_PROGRESS',
      approvalStage: 'Stage 2: Adviser Review',
      approvalStageIndex: 2,
      currentApproverRole: 'ROLE_ADVISER',
      deferReason: undefined,
      deferredBy: undefined,
      deferredAt: undefined,
      deferredRemarks: undefined,
      timeline: updatedTimeline,
      workflowHistory: [...(activity.workflowHistory || []), historyRecord]
    };

    return {
      success: true,
      updatedActivity,
      message: `Activity proposal (v${newVersion}) resubmitted and forwarded to Adviser for review!`,
      statusCode: 200
    };
  }

  /**
   * Advance step (validates exact stage match before delegating to approveActivity)
   */
  public advanceStep(
    activity: Activity,
    currentUser: UserAccount,
    requestedStepId?: number,
    remarks?: string
  ) {
    const actualStage = this.getCurrentStageIndex(activity);
    if (requestedStepId !== undefined && Number(requestedStepId) !== actualStage) {
      return {
        success: false,
        message: `Stage bypass blocked: Activity is currently at stage ${actualStage}; cannot advance stage ${requestedStepId}.`,
        statusCode: 403
      };
    }
    return this.approveActivity(activity, currentUser, remarks);
  }

  public requestRevision(activity: Activity, currentUser: UserAccount, reason: string) {
    return this.deferActivity(activity, currentUser, reason);
  }

  public confirmExternalClearance(activity: Activity, currentUser: UserAccount) {
    return this.approveActivity(activity, currentUser, 'Official institutional clearance confirmed.');
  }

  public setToDraft(
    activity: Activity,
    currentUser: UserAccount
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    const effectiveUser = this.withActiveRole(currentUser);
    if (!effectiveUser) {
      return { success: false, message: 'Forbidden: Active session role is not authorized.', statusCode: 403 };
    }
    const activeRole = normalizeOfficialRole(effectiveUser.activeRole || effectiveUser.role);
    const isOrgOfficerForOrg =
      (activeRole === 'ROLE_ORGANIZATION' ||
        effectiveUser.role === 'ROLE_ORGANIZATION' ||
        effectiveUser.role === 'Student Organization Officer' ||
        effectiveUser.role === 'Org President' ||
        effectiveUser.role === 'Org Treasurer') &&
      isSameOrg(effectiveUser.orgId, activity.orgId);
    const callerIsAdmin =
      activeRole === 'ROLE_ADMIN' ||
      effectiveUser.role === 'ROLE_ADMIN' ||
      effectiveUser.role === 'System Administrator';

    if (!isOrgOfficerForOrg && !callerIsAdmin) {
      return {
        success: false,
        message: `Forbidden: Only officers of ${activity.orgId} or administrators can set this activity to draft.`,
        statusCode: 403
      };
    }

    const updatedActivity: Activity = {
      ...activity,
      status: 'Draft',
      approvalStatus: 'Draft',
      workflowStatus: 'DRAFT',
      approvalStage: 'Stage 1: Organization Submission',
      approvalStageIndex: 1,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      isPlanConfirmed: false,
      currentApproverRole: 'ROLE_ORGANIZATION',
      deferReason: undefined,
      deferredRemarks: undefined,
      deferredBy: undefined,
      deferredAt: undefined,
      rejectionRemarks: undefined,
      rejectedBy: undefined,
      rejectedAt: undefined
    };

    return {
      success: true,
      updatedActivity,
      message: `Activity "${activity.title}" status set to Draft.`,
      statusCode: 200
    };
  }
}

export const workflowService = new WorkflowService();
