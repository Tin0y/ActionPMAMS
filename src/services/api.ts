import { Activity, UserAccount } from '../types';

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
      const data = await res.json();
      return { success: res.ok, activity: data.data, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error communicating with backend' };
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
      const data = await res.json();
      return { success: res.ok, activity: data.data, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error communicating with backend' };
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
      const data = await res.json();
      return { success: res.ok, activity: data.data, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error communicating with backend' };
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
      const data = await res.json();
      return { success: res.ok, data: data.data, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error confirming action plan' };
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
      const data = await res.json();
      return { success: res.ok, data: data.data, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error communicating with backend' };
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

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Failed to advance stage' };
      }
      return { success: true, activity: data.data, message: data.message };
    } catch (err) {
      console.warn('Backend API call error:', err);
      return { success: false, message: 'Network error contacting backend API' };
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

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Failed to confirm clearance' };
      }
      return { success: true, activity: data.data, message: data.message };
    } catch (err) {
      console.warn('Backend API call error:', err);
      return { success: false, message: 'Network error contacting backend API' };
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
      const data = await res.json();
      return { success: res.ok, activity: data.data, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error communicating with backend' };
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
      const data = await res.json();
      return { success: res.ok, activity: data.data, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error communicating with backend' };
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
      const data = await res.json();
      return { success: res.ok, activity: data.data, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error' };
    }
  }

  public async getOrganization(
    orgId: string
  ): Promise<{ success: boolean; data?: any; message: string; status: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      return { success: res.ok, data: data.data, message: data.message, status: res.status };
    } catch (err) {
      return { success: false, message: 'Network error', status: 500 };
    }
  }

  public async getOrganizationMembers(
    orgId: string
  ): Promise<{ success: boolean; data?: any[]; message: string; status: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}/members`, {
        credentials: 'include'
      });
      const data = await res.json();
      return { success: res.ok, data: data.data, message: data.message, status: res.status };
    } catch (err) {
      return { success: false, message: 'Network error', status: 500 };
    }
  }

  public async getOrganizationAttachments(
    orgId: string
  ): Promise<{ success: boolean; data?: any[]; message: string; status: number }> {
    try {
      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}/attachments`, {
        credentials: 'include'
      });
      const data = await res.json();
      return { success: res.ok, data: data.data, message: data.message, status: res.status };
    } catch (err) {
      return { success: false, message: 'Network error', status: 500 };
    }
  }
}

export const apiService = new ApiService();
