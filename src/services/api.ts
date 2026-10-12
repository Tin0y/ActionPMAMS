import { Activity, UserAccount } from '../types';

export class ApiService {
  private baseUrl = '/api';

  public async advanceWorkflowStep(
    activity: Activity,
    currentUser: UserAccount,
    stepId: number
  ): Promise<{ success: boolean; activity?: Activity; message: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(activity.id)}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.role,
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
      console.warn('Backend API call error, using local computation:', err);
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
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.role,
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
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(activity.id)}/defer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.role,
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
      const res = await fetch(`${this.baseUrl}/activities/${encodeURIComponent(activity.id)}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.role,
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
        body: JSON.stringify({
          userId: currentUser.id,
          role: currentUser.role,
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
    orgId: string,
    currentUser?: UserAccount | null
  ): Promise<{ success: boolean; data?: any; message: string; status: number }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      if (currentUser?.orgId) headers['x-org-id'] = currentUser.orgId;

      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}`, {
        headers
      });
      const data = await res.json();
      return { success: res.ok, data: data.data, message: data.message, status: res.status };
    } catch (err) {
      return { success: false, message: 'Network error', status: 500 };
    }
  }

  public async getOrganizationMembers(
    orgId: string,
    currentUser?: UserAccount | null
  ): Promise<{ success: boolean; data?: any[]; message: string; status: number }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      if (currentUser?.orgId) headers['x-org-id'] = currentUser.orgId;

      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}/members`, {
        headers
      });
      const data = await res.json();
      return { success: res.ok, data: data.data, message: data.message, status: res.status };
    } catch (err) {
      return { success: false, message: 'Network error', status: 500 };
    }
  }

  public async getOrganizationAttachments(
    orgId: string,
    currentUser?: UserAccount | null
  ): Promise<{ success: boolean; data?: any[]; message: string; status: number }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.id) headers['x-user-id'] = currentUser.id;
      if (currentUser?.orgId) headers['x-org-id'] = currentUser.orgId;

      const res = await fetch(`${this.baseUrl}/organizations/${encodeURIComponent(orgId)}/attachments`, {
        headers
      });
      const data = await res.json();
      return { success: res.ok, data: data.data, message: data.message, status: res.status };
    } catch (err) {
      return { success: false, message: 'Network error', status: 500 };
    }
  }
}

export const apiService = new ApiService();
