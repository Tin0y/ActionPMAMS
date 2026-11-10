import {
  Activity,
  TimelineStep,
  UserAccount,
  UserRole,
  WorkflowHistoryRecord,
  ActivityApprovalDecision,
  StudentOrganization
} from '../types';
import {
  isCollegeOrg,
  getWorkflowTimelineForOrg,
  evaluateStepPermission,
  ORGANIZATIONS
} from '../data/initialData';
import { isSameOrg } from './organizationUtils';
import {
  readLS,
  writeLS,
  LS_ACTIVITIES,
  LS_ORGANIZATIONS,
  saveActivityToDb,
  batchSaveActivitiesToDb
} from '../services/db';

/**
 * Normalizes input role names to standard canonical UserRole enum
 */
export function normalizeOfficialRole(role?: string | null): UserRole | null {
  if (!role || typeof role !== 'string') return null;
  const trimmed = role.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  if (trimmed === 'ROLE_OC' || lower.includes('chancellor')) {
    return null;
  }

  const aliasMap: Record<string, UserRole> = {
    ROLE_ORGANIZATION: 'ROLE_ORGANIZATION',
    'Org President': 'ROLE_ORGANIZATION',
    'Org Treasurer': 'ROLE_ORGANIZATION',
    'Student Organization Officer': 'ROLE_ORGANIZATION',
    ROLE_ADVISER: 'ROLE_ADVISER',
    'Faculty Adviser': 'ROLE_ADVISER',
    'Organization Adviser': 'ROLE_ADVISER',
    ROLE_DEAN: 'ROLE_DEAN',
    'College Dean': 'ROLE_DEAN',
    'Dean / College Reviewer': 'ROLE_DEAN',
    ROLE_OSD: 'ROLE_OSD',
    'OSD Officer': 'ROLE_OSD',
    'OSD Staff': 'ROLE_OSD',
    'OSD Director': 'ROLE_OSD',
    ROLE_OVCSAS: 'ROLE_OVCSAS',
    'OVCSAS Officer': 'ROLE_OVCSAS',
    ROLE_ADMIN: 'ROLE_ADMIN',
    'System Administrator': 'ROLE_ADMIN',
    SysAd: 'ROLE_ADMIN'
  };

  return aliasMap[trimmed] || (aliasMap[role] ?? null);
}

function withActiveRole(user: UserAccount): UserAccount {
  const activeRole = normalizeOfficialRole(user.activeRole || user.role) || user.role;
  return {
    ...user,
    role: activeRole,
    activeRole
  };
}

function isDeferredState(activity: Activity): boolean {
  return (
    activity.approvalStatus === 'Deferred' ||
    activity.status === 'DEFERRED' ||
    activity.status === 'DEFERRED FOR REVISION' ||
    activity.approvalStage === 'DEFERRED FOR REVISION'
  );
}

export function getCurrentStageIndex(activity: Activity): number {
  if (!activity.designForm?.isCompleted) {
    return 1;
  }
  const maxStages = isCollegeOrg(activity.orgId) ? 7 : 6;
  if (
    activity.approvalStatus === 'Fully Approved' ||
    activity.status === 'Approved' ||
    activity.workflowStatus === 'COMPLETED'
  ) {
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
  if (stage.includes('accomplishment') || stage.includes('liquidation')) return isCollegeOrg(activity.orgId) ? 6 : 5;
  if (stage.includes('ovcsas')) return isCollegeOrg(activity.orgId) ? 5 : 4;
  if (stage.includes('osd')) return isCollegeOrg(activity.orgId) ? 4 : 3;
  if (stage.includes('dean')) return 3;
  if (stage.includes('adviser')) return 2;
  return 2;
}

function findActivity(activityOrId: Activity | string): Activity | null {
  if (typeof activityOrId !== 'string') {
    return activityOrId;
  }
  const activities = readLS<Activity>(LS_ACTIVITIES);
  return activities.find((a: Activity) => a.id === activityOrId) || null;
}

/**
 * Client-side approve activity fallback (for static hosting like Vercel)
 */
export async function clientApproveActivity(
  activityOrId: Activity | string,
  currentUser: UserAccount,
  remarks?: string
): Promise<{ success: boolean; activity?: Activity; message: string }> {
  const target = findActivity(activityOrId);
  if (!target) {
    return { success: false, message: 'Activity not found' };
  }

  const effectiveUser = withActiveRole(currentUser);
  const maxStages = isCollegeOrg(target.orgId) ? 7 : 6;

  // 1. Action Plan item approval (before DAD form is created/submitted)
  if (!target.designForm?.isCompleted) {
    const isCol = isCollegeOrg(target.orgId);
    const stage1Label = isCol ? 'Stage 1: College Organization Submission' : 'Stage 1: Organization Submission';
    const decisionRecord: ActivityApprovalDecision = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      activityId: target.id,
      approverId: effectiveUser.id,
      approverName: effectiveUser.name,
      approverRole: effectiveUser.role,
      stageName: 'Action Plan Approval',
      decision: 'APPROVE',
      remarks: remarks || 'Approved for inclusion in institutional Action Plan.',
      timestamp: new Date().toISOString(),
      versionReviewed: target.version || 1
    };

    const historyRecord: WorkflowHistoryRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stageId: 1,
      stageName: 'Action Plan Approval',
      action: 'APPROVE',
      actorId: effectiveUser.id,
      actorName: effectiveUser.name,
      actorRole: effectiveUser.role,
      remark: remarks || 'Approved for inclusion in institutional Action Plan.',
      timestamp: new Date().toISOString()
    };

    const updated: Activity = {
      ...target,
      actionPlanStatus: 'Approved',
      actionPlanDecision: 'Approved',
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      isPlanConfirmed: false,
      status: 'Draft',
      approvalStatus: 'Draft',
      workflowStatus: 'DRAFT',
      approvalStage: stage1Label,
      approvalStageIndex: 1,
      designForm: target.designForm ? { ...target.designForm, isCompleted: false, isSubmitted: false } : {
        controlNumber: `DAD-${new Date().getFullYear()}-${target.orgId}-001`,
        title: target.title,
        department: target.office || target.orgId,
        isCompleted: false,
        isSubmitted: false,
        venue: target.venue || '',
        targetParticipants: target.targetParticipants || 0,
        activityType: 'Institutional Activity'
      },
      timeline: getWorkflowTimelineForOrg(target.orgId, false),
      approvalDecisions: [...(target.approvalDecisions || []), decisionRecord],
      workflowHistory: [...(target.workflowHistory || []), historyRecord]
    };

    await saveActivityToDb(updated);
    return {
      success: true,
      activity: updated,
      message: `Activity "${target.title}" approved for Action Plan! Placed into Activity Management as Draft.`
    };
  }

  // 2. Proposal / DAD approval through workflow stages
  const currentStage = getCurrentStageIndex(target);

  if (target.approvalStatus === 'Fully Approved' || target.status === 'Approved' || target.workflowStatus === 'COMPLETED') {
    return { success: false, message: 'Activity has already completed all approval stages.' };
  }
  if (target.approvalStatus === 'Rejected' || target.status === 'Rejected') {
    return { success: false, message: 'Activity has been permanently rejected for this submission.' };
  }
  if (isDeferredState(target)) {
    return { success: false, message: 'Cannot approve activity while deferred: the organization must revise and resubmit it first.' };
  }

  const perm = evaluateStepPermission(effectiveUser, target, currentStage);
  if (!perm.canApprove) {
    return { success: false, message: `Permission Denied: ${perm.reason}` };
  }

  const stages = getWorkflowTimelineForOrg(target.orgId, true);
  const currentTimeline: TimelineStep[] = (target.timeline && target.timeline.length > 0)
    ? [...target.timeline]
    : JSON.parse(JSON.stringify(stages));

  const currentStepObj = currentTimeline.find(s => s.id === currentStage);
  const currentStepTitle = currentStepObj ? currentStepObj.title : `Stage ${currentStage}`;
  const isFinalStage = currentStage >= maxStages;

  const updatedTimeline = currentTimeline.map(step => {
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

  const nextStepObj = updatedTimeline.find(s => s.id === currentStage + 1);
  const nextStageTitle = nextStepObj ? nextStepObj.title : 'Approved / Completed';

  const decisionRecord: ActivityApprovalDecision = {
    id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    activityId: target.id,
    approverId: effectiveUser.id,
    approverName: effectiveUser.name,
    approverRole: effectiveUser.role,
    stageName: currentStepTitle,
    decision: 'APPROVE',
    remarks: remarks || (isFinalStage ? 'Final accomplishment review and sign-off granted.' : `Approved at ${currentStepTitle}.`),
    timestamp: new Date().toISOString(),
    versionReviewed: target.version || 1
  };

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

  const updatedActivity: Activity = {
    ...target,
    approvalStatus: isFinalStage ? 'Fully Approved' : 'Approved at Current Stage',
    status: isFinalStage ? 'Approved' : 'Pending',
    workflowStatus: isFinalStage ? 'COMPLETED' : 'IN_PROGRESS',
    approvalStage: isFinalStage ? 'Approved' : nextStageTitle,
    approvalStageIndex: isFinalStage ? maxStages : currentStage + 1,
    currentApproverRole: nextStepObj?.role,
    timeline: updatedTimeline,
    approvalDecisions: [...(target.approvalDecisions || []), decisionRecord],
    workflowHistory: [...(target.workflowHistory || []), historyRecord],
    deferReason: undefined,
    deferredBy: undefined,
    deferredAt: undefined,
    deferredRemarks: undefined
  };

  await saveActivityToDb(updatedActivity);

  return {
    success: true,
    activity: updatedActivity,
    message: isFinalStage
      ? 'Activity accomplishment report granted final sign-off and marked Fully Approved!'
      : `Approved at ${currentStepTitle}. Forwarded to ${nextStageTitle}.`
  };
}

/**
 * Client-side reject activity fallback
 */
export async function clientRejectActivity(
  activityOrId: Activity | string,
  currentUser: UserAccount,
  remarks: string,
  stageId?: number
): Promise<{ success: boolean; activity?: Activity; message: string }> {
  const target = findActivity(activityOrId);
  if (!target) return { success: false, message: 'Activity not found' };

  if (!remarks || !remarks.trim()) {
    return { success: false, message: 'A mandatory remark/reason explaining the final rejection is required.' };
  }

  const effectiveUser = withActiveRole(currentUser);
  const actualStage = stageId || getCurrentStageIndex(target);

  const decisionRecord: ActivityApprovalDecision = {
    id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    activityId: target.id,
    approverId: effectiveUser.id,
    approverName: effectiveUser.name,
    approverRole: effectiveUser.role,
    stageName: `Stage ${actualStage}`,
    decision: 'REJECT',
    remarks: remarks.trim(),
    timestamp: new Date().toISOString(),
    versionReviewed: target.version || 1
  };

  const historyRecord: WorkflowHistoryRecord = {
    id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    stageId: actualStage,
    stageName: `Stage ${actualStage}`,
    action: 'REJECT',
    actorId: effectiveUser.id,
    actorName: effectiveUser.name,
    actorRole: effectiveUser.role,
    remark: remarks.trim(),
    timestamp: new Date().toISOString()
  };

  const updatedActivity: Activity = {
    ...target,
    status: 'Rejected',
    approvalStatus: 'Rejected',
    workflowStatus: 'REJECTED',
    actionPlanStatus: 'Rejected',
    actionPlanDecision: 'Rejected',
    approvalStage: 'REJECTED',
    rejectionRemarks: remarks.trim(),
    rejectedBy: `${effectiveUser.name} (${effectiveUser.role})`,
    rejectedAt: new Date().toISOString(),
    currentApproverRole: undefined,
    deferReason: undefined,
    deferredRemarks: undefined,
    deferredBy: undefined,
    deferredAt: undefined,
    approvalDecisions: [...(target.approvalDecisions || []), decisionRecord],
    workflowHistory: [...(target.workflowHistory || []), historyRecord]
  };

  await saveActivityToDb(updatedActivity);
  return {
    success: true,
    activity: updatedActivity,
    message: `Activity "${target.title}" has been permanently rejected.`
  };
}

/**
 * Client-side defer activity fallback
 */
export async function clientDeferActivity(
  activityOrId: Activity | string,
  currentUser: UserAccount,
  reason: string,
  stageId?: number
): Promise<{ success: boolean; activity?: Activity; message: string }> {
  const target = findActivity(activityOrId);
  if (!target) return { success: false, message: 'Activity not found' };

  if (!reason || !reason.trim()) {
    return { success: false, message: 'A detailed reason/remark is mandatory when deferring an activity for revision.' };
  }

  const effectiveUser = withActiveRole(currentUser);
  const actualStage = stageId || getCurrentStageIndex(target);

  const stages = getWorkflowTimelineForOrg(target.orgId, true);
  const currentTimeline: TimelineStep[] = (target.timeline && target.timeline.length > 0)
    ? [...target.timeline]
    : JSON.parse(JSON.stringify(stages));

  const currentStepObj = currentTimeline.find(s => s.id === actualStage);
  const stageTitle = currentStepObj ? currentStepObj.title : `Stage ${actualStage}`;

  const decisionRecord: ActivityApprovalDecision = {
    id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    activityId: target.id,
    approverId: effectiveUser.id,
    approverName: effectiveUser.name,
    approverRole: effectiveUser.role,
    stageName: stageTitle,
    decision: 'DEFER',
    remarks: reason.trim(),
    timestamp: new Date().toISOString(),
    versionReviewed: target.version || 1
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
    ...target,
    approvalStatus: 'Deferred',
    status: 'DEFERRED',
    approvalStage: 'DEFERRED FOR REVISION',
    deferReason: reason.trim(),
    deferredRemarks: reason.trim(),
    deferredBy: `${effectiveUser.name} (${effectiveUser.role})`,
    deferredAt: new Date().toISOString(),
    timeline: currentTimeline,
    approvalDecisions: [...(target.approvalDecisions || []), decisionRecord],
    workflowHistory: [...(target.workflowHistory || []), historyRecord]
  };

  await saveActivityToDb(updatedActivity);
  return {
    success: true,
    activity: updatedActivity,
    message: `Activity has been deferred for revision and returned to ${target.orgId}.`
  };
}

/**
 * Client-side resubmit activity fallback
 */
export async function clientResubmitActivity(
  activityOrId: Activity | string,
  currentUser: UserAccount,
  notes?: string
): Promise<{ success: boolean; activity?: Activity; message: string }> {
  const target = findActivity(activityOrId);
  if (!target) return { success: false, message: 'Activity not found' };

  const effectiveUser = withActiveRole(currentUser);
  const stages = getWorkflowTimelineForOrg(target.orgId, true);
  const updatedTimeline = stages.map((s, idx) => ({
    ...s,
    status: idx === 0 ? ('completed' as const) : (idx === 1 ? ('in_progress' as const) : ('pending' as const)),
    updatedAt: idx === 0 ? new Date().toISOString().split('T')[0] : undefined
  }));

  const newVersion = (target.version || 1) + 1;

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
    ...target,
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
    workflowHistory: [...(target.workflowHistory || []), historyRecord]
  };

  await saveActivityToDb(updatedActivity);
  return {
    success: true,
    activity: updatedActivity,
    message: `Activity proposal (v${newVersion}) resubmitted and forwarded to Adviser for review!`
  };
}

/**
 * Client-side set activity to draft fallback
 */
export async function clientSetToDraft(
  activityOrId: Activity | string,
  currentUser: UserAccount
): Promise<{ success: boolean; activity?: Activity; message: string }> {
  const target = findActivity(activityOrId);
  if (!target) return { success: false, message: 'Activity not found' };

  const isCol = isCollegeOrg(target.orgId);
  const stage1Label = isCol ? 'Stage 1: College Organization Submission' : 'Stage 1: Organization Submission';

  const updatedActivity: Activity = {
    ...target,
    status: 'Draft',
    approvalStatus: 'Draft',
    workflowStatus: 'DRAFT',
    actionPlanStatus: 'Draft',
    actionPlanDecision: undefined,
    approvalStage: stage1Label,
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

  await saveActivityToDb(updatedActivity);
  return {
    success: true,
    activity: updatedActivity,
    message: `Activity "${target.title}" status set to Draft.`
  };
}

/**
 * Client-side advance workflow step fallback
 */
export async function clientAdvanceWorkflowStep(
  activity: Activity,
  currentUser: UserAccount,
  stepId: number
): Promise<{ success: boolean; activity?: Activity; message: string }> {
  return clientApproveActivity(activity, currentUser, undefined);
}

/**
 * Client-side confirm external clearance fallback
 */
export async function clientConfirmExternalClearance(
  activity: Activity,
  currentUser: UserAccount
): Promise<{ success: boolean; activity?: Activity; message: string }> {
  return clientApproveActivity(activity, currentUser, 'Official institutional clearance confirmed.');
}

/**
 * Client-side request revision fallback
 */
export async function clientRequestRevision(
  activity: Activity,
  currentUser: UserAccount,
  reason: string
): Promise<{ success: boolean; activity?: Activity; message: string }> {
  return clientDeferActivity(activity, currentUser, reason);
}

/**
 * Client-side confirm action plan fallback
 */
export async function clientConfirmActionPlan(
  orgId: string,
  fiscalYear: string,
  currentUser: UserAccount
): Promise<{
  success: boolean;
  data?: {
    orgId: string;
    fiscalYear: string;
    approvedCount: number;
    rejectedCount: number;
    draftCount: number;
    totalApprovedBudget: number;
    activities: Activity[];
  };
  message: string;
}> {
  const allActs = readLS<Activity>(LS_ACTIVITIES);
  const fyDigits = fiscalYear ? String(fiscalYear).replace(/\D/g, '') : '';
  const timestamp = new Date().toISOString();

  let approvedCount = 0;
  let rejectedCount = 0;
  let draftCount = 0;
  let totalApprovedBudget = 0;
  const updatedList: Activity[] = [];

  const updatedAllActs = allActs.map((act: Activity) => {
    const matchOrg = isSameOrg(act.orgId, orgId);
    if (!matchOrg) return act;
    const actFyDigits = (act.fiscalYear || '').replace(/\D/g, '');
    const matchFy = !fyDigits || fiscalYear === 'ALL' || actFyDigits === fyDigits;
    if (!matchFy) return act;

    const isApproved =
      act.status === 'Approved' ||
      act.approvalStatus === 'Fully Approved' ||
      act.actionPlanStatus === 'Approved';
    const isRejected =
      act.status === 'Rejected' ||
      act.approvalStatus === 'Rejected' ||
      act.actionPlanStatus === 'Rejected';

    if (isApproved) {
      approvedCount++;
      totalApprovedBudget += Number(act.budget || 0);
      const updated: Activity = {
        ...act,
        status: 'Approved',
        approvalStatus: 'Fully Approved',
        workflowStatus: 'COMPLETED',
        actionPlanStatus: 'Approved',
        actionPlanDecision: 'Approved',
        isActionPlanItem: true,
        source: 'ACTION_PLAN',
        isPlanConfirmed: true,
        confirmedBy: currentUser.name,
        confirmedAt: timestamp
      };
      updatedList.push(updated);
      return updated;
    } else if (isRejected) {
      rejectedCount++;
      const updated: Activity = {
        ...act,
        status: 'Rejected',
        approvalStatus: 'Rejected',
        workflowStatus: 'REJECTED',
        actionPlanStatus: 'Rejected',
        actionPlanDecision: 'Rejected',
        isActionPlanItem: true,
        source: 'ACTION_PLAN',
        isPlanConfirmed: true,
        confirmedBy: currentUser.name,
        confirmedAt: timestamp
      };
      updatedList.push(updated);
      return updated;
    } else {
      draftCount++;
      return act;
    }
  });

  writeLS(LS_ACTIVITIES, updatedAllActs);

  return {
    success: true,
    data: {
      orgId,
      fiscalYear,
      approvedCount,
      rejectedCount,
      draftCount,
      totalApprovedBudget,
      activities: updatedList
    },
    message: `Action plan successfully confirmed: ${approvedCount} approved, ${rejectedCount} rejected.`
  };
}

/**
 * Client-side batch save activities fallback
 */
export async function clientBatchSaveActivities(
  activities: Activity[]
): Promise<{ success: boolean; data?: Activity[]; message: string }> {
  await batchSaveActivitiesToDb(activities);
  return {
    success: true,
    data: activities,
    message: 'Activities saved successfully.'
  };
}

/**
 * Organization fetch fallbacks
 */
export async function clientGetOrganization(
  orgId: string
): Promise<{ success: boolean; data?: any; message: string; status: number }> {
  const orgs = readLS<StudentOrganization>(LS_ORGANIZATIONS);
  const pool = orgs.length > 0 ? orgs : ORGANIZATIONS;
  const found = pool.find((o: StudentOrganization) => isSameOrg(o.id, orgId) || isSameOrg(o.acronym, orgId));
  if (found) {
    return { success: true, data: found, message: 'Organization found', status: 200 };
  }
  return { success: false, message: 'Organization not found', status: 404 };
}

export async function clientGetOrganizationMembers(
  orgId: string
): Promise<{ success: boolean; data?: any[]; message: string; status: number }> {
  const orgResult = await clientGetOrganization(orgId);
  const members = orgResult.data?.membersList || [];
  return { success: true, data: members, message: 'Members retrieved', status: 200 };
}

export async function clientGetOrganizationAttachments(
  orgId: string
): Promise<{ success: boolean; data?: any[]; message: string; status: number }> {
  const orgResult = await clientGetOrganization(orgId);
  const attachments = orgResult.data?.attachments || [];
  return { success: true, data: attachments, message: 'Attachments retrieved', status: 200 };
}
