import { Activity, UserAccount } from '../types';
import {
  clientApproveActivity,
  clientRejectActivity,
  clientDeferActivity,
  clientResubmitActivity,
  clientSetToDraft,
  clientAdvanceWorkflowStep,
  clientConfirmExternalClearance,
  clientRequestRevision,
  clientConfirmActionPlan,
  clientBatchSaveActivities,
  clientGetOrganization,
  clientGetOrganizationMembers,
  clientGetOrganizationAttachments
} from '../utils/workflowTransitions';

export class ApiService {
  private baseUrl = '/api';

  public async approveActivity(
    activityOrId: Activity | string,
    currentUser: UserAccount,
    remarks?: string
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const id = typeof activityOrId === 'string' ? activityOrId : activityOrId.id;
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role,
          remarks
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, activity: data.data, message: data.message };
        }
      }

      // Check for explicit institutional authorization or business logic errors from backend
      if ((res.status === 400 || res.status === 401 || res.status === 403) && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          return { success: false, message: data.message };
        }
      }

      // Fallback for static hosting (404 Not Found on Vercel) or serverless outages
      return await clientApproveActivity(activityOrId, currentUser, remarks);
    } catch {
      return await clientApproveActivity(activityOrId, currentUser, remarks);
    }
  }

  public async rejectActivity(
    activityOrId: Activity | string,
    currentUser: UserAccount,
    remarks: string,
    stageId?: number
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const id = typeof activityOrId === 'string' ? activityOrId : activityOrId.id;
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role,
          remarks,
          stageId
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, activity: data.data, message: data.message };
        }
      }

      if ((res.status === 400 || res.status === 401 || res.status === 403) && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          return { success: false, message: data.message };
        }
      }

      return await clientRejectActivity(activityOrId, currentUser, remarks, stageId);
    } catch {
      return await clientRejectActivity(activityOrId, currentUser, remarks, stageId);
    }
  }

  public async setActivityToDraft(
    activityOrId: Activity | string,
    currentUser: UserAccount
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const id = typeof activityOrId === 'string' ? activityOrId : activityOrId.id;
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(id)}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, activity: data.data, message: data.message };
        }
      }

      if ((res.status === 400 || res.status === 401 || res.status === 403) && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          return { success: false, message: data.message };
        }
      }

      return await clientSetToDraft(activityOrId, currentUser);
    } catch {
      return await clientSetToDraft(activityOrId, currentUser);
    }
  }

  public async confirmActionPlan(
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
    try {
      const res = await fetch(`${this.baseUrl}/activities/confirm-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgId,
          fiscalYear,
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, data: data.data, message: data.message };
        }
      }

      if ((res.status === 400 || res.status === 401 || res.status === 403) && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          return { success: false, message: data.message };
        }
      }

      return await clientConfirmActionPlan(orgId, fiscalYear, currentUser);
    } catch {
      return await clientConfirmActionPlan(orgId, fiscalYear, currentUser);
    }
  }

  public async batchSaveActivities(
    activities: Activity[]
  ): Promise<{ success: boolean; data?: Activity[]; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/activities/batch-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(activities)
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, data: data.data, message: data.message };
        }
      }

      return await clientBatchSaveActivities(activities);
    } catch {
      return await clientBatchSaveActivities(activities);
    }
  }

  public async advanceWorkflowStep(
    activity: Activity,
    currentUser: UserAccount,
    stepId: number
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(activity.id)}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role,
          orgId: currentUser.orgId,
          stepId
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, activity: data.data, message: data.message };
        }
      }

      if ((res.status === 400 || res.status === 401 || res.status === 403) && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          return { success: false, message: data.message };
        }
      }

      return await clientAdvanceWorkflowStep(activity, currentUser, stepId);
    } catch {
      return await clientAdvanceWorkflowStep(activity, currentUser, stepId);
    }
  }

  public async confirmExternalClearance(
    activity: Activity,
    currentUser: UserAccount
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(activity.id)}/external-clearance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role,
          orgId: currentUser.orgId,
          clearedByOvcsas: true,
          clearedByChancellor: true
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, activity: data.data, message: data.message };
        }
      }

      return await clientConfirmExternalClearance(activity, currentUser);
    } catch {
      return await clientConfirmExternalClearance(activity, currentUser);
    }
  }

  public async deferActivity(
    activity: Activity,
    currentUser: UserAccount,
    reason: string,
    stageId?: number
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const id = typeof activity === 'string' ? activity : activity.id;
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(id)}/defer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role,
          reason,
          stageId
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, activity: data.data, message: data.message };
        }
      }

      if ((res.status === 400 || res.status === 401 || res.status === 403) && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          return { success: false, message: data.message };
        }
      }

      return await clientDeferActivity(activity, currentUser, reason, stageId);
    } catch {
      return await clientDeferActivity(activity, currentUser, reason, stageId);
    }
  }

  public async resubmitActivity(
    activity: Activity,
    currentUser: UserAccount,
    notes?: string
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const id = typeof activity === 'string' ? activity : activity.id;
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(id)}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role,
          notes
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, activity: data.data, message: data.message };
        }
      }

      if ((res.status === 400 || res.status === 401 || res.status === 403) && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.message) {
          return { success: false, message: data.message };
        }
      }

      return await clientResubmitActivity(activity, currentUser, notes);
    } catch {
      return await clientResubmitActivity(activity, currentUser, notes);
    }
  }

  public async requestRevision(
    activity: Activity,
    currentUser: UserAccount,
    reason: string
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(activity.id)}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.activeRole || currentUser.role,
          reason
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.data) {
          return { success: true, activity: data.data, message: data.message };
        }
      }

      return await clientRequestRevision(activity, currentUser, reason);
    } catch {
      return await clientRequestRevision(activity, currentUser, reason);
    }
  }

  public async getOrganization(
    orgId: string
  ): Promise<{ success: boolean; data?: any; message: string; status: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: true, data: data.data, message: data.message, status: res.status };
      }
      return await clientGetOrganization(orgId);
    } catch {
      return await clientGetOrganization(orgId);
    }
  }

  public async getOrganizationMembers(
    orgId: string
  ): Promise<{ success: boolean; data?: any[]; message: string; status: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}/members`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: true, data: data.data, message: data.message, status: res.status };
      }
      return await clientGetOrganizationMembers(orgId);
    } catch {
      return await clientGetOrganizationMembers(orgId);
    }
  }

  public async getOrganizationAttachments(
    orgId: string
  ): Promise<{ success: boolean; data?: any[]; message: string; status: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}/attachments`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: true, data: data.data, message: data.message, status: res.status };
      }
      return await clientGetOrganizationAttachments(orgId);
    } catch {
      return await clientGetOrganizationAttachments(orgId);
    }
  }
}

export const apiService = new ApiService();
