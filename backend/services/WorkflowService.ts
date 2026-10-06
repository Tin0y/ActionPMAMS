import { Activity, TimelineStep, UserAccount, WorkflowHistoryRecord } from '../../src/types';
import { isCollegeOrg, getWorkflowTimelineForOrg, evaluateStepPermission } from '../../src/data/initialData';

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
  public getStagesForOrg(orgId: string): TimelineStep[] {
    return getWorkflowTimelineForOrg(orgId);
  }

  /**
   * Calculate the current active stage index (1-based)
   */
  public getCurrentStageIndex(activity: Activity): number {
    const isCollege = this.isCollege(activity.orgId);
    const maxStages = isCollege ? 8 : 7;
    const finalAdviserStage = isCollege ? 8 : 7;

    const finalStep = activity.timeline?.find((s: TimelineStep) => s.id === maxStages);
    if (finalStep?.status === 'completed' || activity.status === 'COMPLETED' || activity.workflowStatus === 'COMPLETED') {
      return maxStages;
    }
    if ((activity.status === 'APPROVED' || activity.status === 'Approved') && !activity.accomplishmentForm?.isCompleted) {
      return maxStages;
    }

    // If organization has finished submitting the accomplishment report, it's forwarded to the adviser
    if (activity.accomplishmentForm?.isCompleted) {
      return finalAdviserStage;
    }

    const stage = activity.approvalStage?.toLowerCase() || '';
    if (stage.includes('sign-off') || stage.includes('final review') || stage.includes('adviser accomplishment') || stage.includes('adviser final')) return isCollege ? 8 : 7;
    if (stage.includes('accomplishment') || stage.includes('liquidation')) return isCollege ? 7 : 6;

    if (activity.timeline && activity.timeline.length > 0) {
      const inProgress = activity.timeline.find((s: TimelineStep) => s.status === 'in_progress');
      if (inProgress) return Math.min(inProgress.id, maxStages);
      const lastCompleted = [...activity.timeline].reverse().find((s: TimelineStep) => s.status === 'completed');
      if (lastCompleted) return Math.min(lastCompleted.id + 1, maxStages);
    }
    if (stage.includes('chancellor') || stage.includes('oc')) return isCollege ? 6 : 5;
    if (stage.includes('ovcsas')) return isCollege ? 5 : 4;
    if (stage.includes('osd')) return isCollege ? 4 : 3;
    if (stage.includes('dean')) return 3;
    if (stage.includes('adviser')) return 2;
    return 1;
  }

  /**
   * Advance activity to the next stage
   * CENTRAL: Org Submission (1) -> Adviser (2) -> OSD (3) -> OVCSAS (4) -> Chancellor (5) -> Accomplishment Report (6) -> Adviser Sign-Off (7) -> APPROVED
   * COLLEGE: Org Submission (1) -> Adviser (2) -> Dean (3) -> OSD (4) -> OVCSAS (5) -> Chancellor (6) -> Accomplishment Report (7) -> Adviser Sign-Off (8) -> APPROVED
   */
  public advanceStep(
    activity: Activity,
    currentUser: UserAccount,
    requestedStepId?: number,
    remarks?: string
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    const isCollege = this.isCollege(activity.orgId);
    const maxStages = isCollege ? 8 : 7;
    const currentStage = requestedStepId || this.getCurrentStageIndex(activity);

    const isAccomplishmentPhase = currentStage >= (isCollege ? 7 : 6);
    if ((activity.status === 'APPROVED' || activity.status === 'Approved') && !isAccomplishmentPhase) {
      return {
        success: false,
        message: 'Activity has already received final approval and is completed.',
        statusCode: 400
      };
    }

    // Evaluate user permissions for this step
    const perm = evaluateStepPermission(currentUser, activity, currentStage);
    if (!perm.canApprove) {
      return {
        success: false,
        message: `Permission Denied: ${perm.reason}`,
        statusCode: 403
      };
    }

    // Get current timeline
    const stages = this.getStagesForOrg(activity.orgId);
    const currentTimeline: TimelineStep[] = (activity.timeline && activity.timeline.length > 0)
      ? [...activity.timeline]
      : JSON.parse(JSON.stringify(stages));

    const currentStepObj = currentTimeline.find((s: TimelineStep) => s.id === currentStage);
    const currentStepTitle = currentStepObj ? currentStepObj.title : `Stage ${currentStage}`;

    const isFinalStage = currentStage >= maxStages;

    // Update timeline steps: ensure all steps up to currentStage are marked completed
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

    // Append history record
    const historyRecord: WorkflowHistoryRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: currentStage,
      stageName: currentStepTitle,
      action: isFinalStage ? 'FINAL_APPROVE' : (currentStage === 1 ? 'SUBMIT' : 'APPROVE'),
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      remark: remarks || (isFinalStage ? 'Final accomplishment approval and liquidation sign-off granted by Faculty Adviser.' : (currentStage === (isCollege ? 6 : 5) ? 'Chancellor approval granted. Forwarded to Organization to file Accomplishment Report.' : `Approved and forwarded to next stage.`)),
      timestamp: new Date().toISOString()
    };

    const existingHistory = activity.workflowHistory || [];
    const updatedHistory = [...existingHistory, historyRecord];

    const updatedActivity: Activity = {
      ...activity,
      status: isFinalStage ? 'APPROVED' : 'Pending',
      approvalStage: isFinalStage ? 'APPROVED / COMPLETED' : nextStageTitle,
      timeline: updatedTimeline,
      workflowHistory: updatedHistory,
      accomplishmentForm: (isFinalStage || currentStage === (isCollege ? 7 : 6)) 
        ? { ...(activity.accomplishmentForm || {}), isCompleted: true }
        : activity.accomplishmentForm,
      deferReason: undefined,
      deferredBy: undefined,
      deferredAt: undefined
    };

    return {
      success: true,
      updatedActivity,
      message: isFinalStage
        ? `Accomplishment Report approved and finalized! All workflow stages completed.`
        : (currentStage === (isCollege ? 6 : 5) 
          ? `Chancellor approval granted! Forwarded to Organization to file Accomplishment Report.` 
          : `Successfully endorsed/approved! Forwarded to: ${nextStageTitle}.`),
      statusCode: 200
    };
  }

  /**
   * Defer activity for revision (Replaces "Reject")
   * 1. Approver MUST provide a remark/reason.
   * 2. The activity becomes DEFERRED (DEFERRED FOR REVISION).
   * 3. Returned to the Organization User.
   * 4. History is strictly preserved.
   */
  public deferActivity(
    activity: Activity,
    currentUser: UserAccount,
    reason: string,
    requestedStepId?: number
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: 'A detailed reason/remark is mandatory when deferring an activity for revision.',
        statusCode: 400
      };
    }

    const currentStage = requestedStepId || this.getCurrentStageIndex(activity);
    const perm = evaluateStepPermission(currentUser, activity, currentStage);

    if (!perm.canDefer) {
      return {
        success: false,
        message: `Permission Denied: ${perm.reason}`,
        statusCode: 403
      };
    }

    const stages = this.getStagesForOrg(activity.orgId);
    const currentTimeline: TimelineStep[] = (activity.timeline && activity.timeline.length > 0)
      ? [...activity.timeline]
      : JSON.parse(JSON.stringify(stages));

    const currentStepObj = currentTimeline.find((s: TimelineStep) => s.id === currentStage);
    const stageTitle = currentStepObj ? currentStepObj.title : `Stage ${currentStage}`;

    // Append to workflow history preserving all previous history
    const historyRecord: WorkflowHistoryRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: currentStage,
      stageName: stageTitle,
      action: 'DEFER',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      remark: reason.trim(),
      timestamp: new Date().toISOString()
    };

    const existingHistory = activity.workflowHistory || [];
    const updatedHistory = [...existingHistory, historyRecord];

    const updatedActivity: Activity = {
      ...activity,
      status: 'DEFERRED',
      approvalStage: 'DEFERRED FOR REVISION',
      deferReason: reason.trim(),
      deferredBy: `${currentUser.name} (${currentUser.role})`,
      deferredAt: new Date().toISOString(),
      timeline: currentTimeline,
      workflowHistory: updatedHistory
    };

    return {
      success: true,
      updatedActivity,
      message: `Activity has been deferred for revision and returned to the organization.`,
      statusCode: 200
    };
  }

  /**
   * Resubmit activity after organization revision
   */
  public resubmitActivity(
    activity: Activity,
    currentUser: UserAccount,
    notes?: string
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    // Only organization user can resubmit
    const isOrgUser = (currentUser.role === 'ROLE_ORGANIZATION' || currentUser.role === 'Org President') && 
      currentUser.orgId === activity.orgId;
    const isAdmin = currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'System Administrator';

    if (!isOrgUser && !isAdmin) {
      return {
        success: false,
        message: `Only the ${activity.orgId} Organization User can resubmit this deferred activity.`,
        statusCode: 403
      };
    }

    const currentStage = this.getCurrentStageIndex(activity);
    const stages = this.getStagesForOrg(activity.orgId);
    const currentTimeline: TimelineStep[] = (activity.timeline && activity.timeline.length > 0)
      ? [...activity.timeline]
      : JSON.parse(JSON.stringify(stages));

    const currentStepObj = currentTimeline.find((s: TimelineStep) => s.id === currentStage);
    const stageTitle = currentStepObj ? currentStepObj.title : 'Adviser Review';

    // Append to history
    const historyRecord: WorkflowHistoryRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: currentStage,
      stageName: stageTitle,
      action: 'RESUBMIT',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      remark: notes || 'Revised proposal and corrected documents resubmitted by organization.',
      timestamp: new Date().toISOString()
    };

    const existingHistory = activity.workflowHistory || [];
    const updatedHistory = [...existingHistory, historyRecord];

    const updatedActivity: Activity = {
      ...activity,
      status: 'Pending',
      approvalStage: stageTitle,
      deferReason: undefined,
      deferredBy: undefined,
      deferredAt: undefined,
      timeline: currentTimeline,
      workflowHistory: updatedHistory
    };

    return {
      success: true,
      updatedActivity,
      message: `Activity successfully resubmitted to workflow for review!`,
      statusCode: 200
    };
  }

  /**
   * Backward compatibility: requestRevision forwards to deferActivity
   */
  public requestRevision(
    activity: Activity,
    currentUser: UserAccount,
    reason: string
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    return this.deferActivity(activity, currentUser, reason);
  }

  /**
   * Backward compatibility: confirmExternalClearance
   */
  public confirmExternalClearance(
    activity: Activity,
    currentUser: UserAccount
  ): { success: boolean; updatedActivity?: Activity; message: string; statusCode: number } {
    const updatedActivity: Activity = {
      ...activity,
      status: 'Approved',
      approvalStage: 'APPROVED / COMPLETED'
    };
    return {
      success: true,
      updatedActivity,
      message: 'Official approval confirmed.',
      statusCode: 200
    };
  }
}

export const workflowService = new WorkflowService();

