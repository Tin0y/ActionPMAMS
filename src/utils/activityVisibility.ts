import { Activity } from '../types';

/**
 * Returns true if an activity has been rejected in the Action Plan or review workflow.
 */
export function isActivityRejectedStatus(act: Activity): boolean {
  if (!act) return false;
  return (
    act.actionPlanStatus === 'Rejected' ||
    act.actionPlanDecision === 'Rejected' ||
    act.status === 'Rejected' ||
    act.status === 'REJECTED' ||
    act.approvalStatus === 'Rejected' ||
    act.workflowStatus === 'REJECTED'
  );
}

/**
 * Returns true once an activity has been approved (in the Action Plan or full review workflow).
 * Approved activities are locked from status/detail edits and included in official exports.
 */
export function isActionPlanActivityApproved(act: Activity): boolean {
  if (!act || isActivityRejectedStatus(act)) return false;

  return Boolean(
    act.actionPlanStatus === 'Approved' ||
      act.actionPlanDecision === 'Approved' ||
      act.isPlanConfirmed === true ||
      act.status === 'Approved' ||
      act.status === 'APPROVED' ||
      act.status === 'COMPLETED' ||
      act.approvalStatus === 'Fully Approved' ||
      act.workflowStatus === 'COMPLETED'
  );
}

/**
 * Returns true if an activity has been approved out of proposed/draft Action Plan
 * status (or has already entered/completed DAD workflow) and should appear in Activity View.
 * Newly proposed draft activities in the Action Plan stay hidden from Activity View until approved.
 */
export function isActivityEligibleForActivityView(act: Activity): boolean {
  if (!act || isActivityRejectedStatus(act)) return false;
  return isActionPlanActivityApproved(act) || Boolean(act.designForm?.isCompleted);
}
