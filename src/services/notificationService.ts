import { Activity, AppNotification, SentEmail, UserAccount, formatUserRole } from '../types';
import { INITIAL_USER_ACCOUNTS } from '../data/initialData';

const LS_NOTIFICATIONS_KEY = 'msun_user_notifications';
const LS_EMAILS_KEY = 'msun_sent_emails';

// Initial pre-seeded notifications so the system feels alive immediately
const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-ssc-001',
    targetOrgId: 'SSC',
    activityId: 'ACT-2027-SSC-001',
    activityTitle: '2nd Semester: University-Wide Leadership & Accreditation Summit',
    type: 'APPROVAL',
    title: 'Activity Fully Approved! 🎉',
    message: 'Your activity "2nd Semester: University-Wide Leadership & Accreditation Summit" has completed all approval workflows and is officially cleared.',
    actorName: 'DINAH KENDRA A. LUMACTAD',
    actorRole: 'OSA Coordinator / SSC Adviser',
    stageName: 'Stage 6: Adviser Accomplishment Review & Final Sign-Off',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 mins ago
    isRead: false,
    emailId: 'email-ssc-001'
  },
  {
    id: 'notif-ssc-002',
    targetOrgId: 'SSC',
    activityId: 'ACT-2027-SSC-001',
    activityTitle: '2nd Semester: University-Wide Leadership & Accreditation Summit',
    type: 'APPROVAL',
    title: 'OVCSAS Executive Clearance Granted 🏛️',
    message: 'OVCSAS has endorsed the proposal. Forwarded to SSC for activity implementation and liquidation documentation.',
    actorName: 'Dr. Remedios M. Salvador',
    actorRole: 'Vice Chancellor for Student Affairs & Services',
    stageName: 'Stage 4: OVCSAS Approval / Endorsement',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    isRead: false,
    emailId: 'email-ssc-002'
  },
  {
    id: 'notif-ssc-003',
    targetOrgId: 'SSC',
    activityId: 'ACT-2026-009',
    activityTitle: 'University-wide Student Grievance & Policy Town Hall',
    type: 'APPROVAL',
    title: 'Accomplishment Report Verified ✅',
    message: 'Official photo proofs, attendance summaries, and post-activity evaluations have been confirmed and signed by OSD.',
    actorName: 'Claire Joy Mariquit',
    actorRole: 'Monitoring and Evaluation Personnel',
    stageName: 'Accomplishment Report Review',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    isRead: true,
    emailId: 'email-ssc-003'
  },
  {
    id: 'notif-sys-001',
    type: 'SYSTEM',
    title: 'FY 2027 Action Plan Call for Proposals',
    message: 'The Office of Student Development (OSD) has opened the synchronization calendar for FY 2027 student activities.',
    actorName: 'OSD Central Office',
    actorRole: 'System Administration',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    isRead: true
  }
];

const SEED_EMAILS: SentEmail[] = [
  {
    id: 'email-ssc-001',
    toEmail: 'ssc.org@msunaawan.edu.ph',
    toName: 'Maria Clarisse Santos (SSC President)',
    fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
    fromName: 'MSU at Naawan — Office of Student Development',
    subject: '[MSUN ACTION PLAN] Official Clearance: 2nd Semester: University-Wide Leadership & Accreditation Summit (ACT-2027-SSC-001)',
    previewText: 'Your activity has been approved by DINAH KENDRA A. LUMACTAD. All stages in the workflow are now completed.',
    activityId: 'ACT-2027-SSC-001',
    activityTitle: '2nd Semester: University-Wide Leadership & Accreditation Summit',
    stageName: 'Stage 6: Adviser Accomplishment Review & Final Sign-Off',
    approverName: 'DINAH KENDRA A. LUMACTAD',
    approverRole: 'OSA Coordinator / SSC Adviser',
    remarks: 'Accomplishment report and financial liquidation verified and approved. All workflow stages completed with full institutional clearance.',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    isRead: false,
    statusBadge: 'Approved'
  },
  {
    id: 'email-ssc-002',
    toEmail: 'ssc.org@msunaawan.edu.ph',
    toName: 'Maria Clarisse Santos (SSC President)',
    fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
    fromName: 'MSU at Naawan — OVCSAS Directorate',
    subject: '[MSUN ACTION PLAN] Executive Approval Granted: 2nd Semester: University-Wide Leadership & Accreditation Summit',
    previewText: 'OVCSAS has granted final executive endorsement for your proposed activity and budget allocation.',
    activityId: 'ACT-2027-SSC-001',
    activityTitle: '2nd Semester: University-Wide Leadership & Accreditation Summit',
    stageName: 'Stage 4: OVCSAS Approval / Endorsement',
    approverName: 'Dr. Remedios M. Salvador',
    approverRole: 'Vice Chancellor for Student Affairs & Services',
    remarks: 'Approved for institutional implementation. Proceed to activity deployment in accordance with university safety protocols.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    isRead: false,
    statusBadge: 'Approved'
  },
  {
    id: 'email-ssc-003',
    toEmail: 'ssc.org@msunaawan.edu.ph',
    toName: 'Maria Clarisse Santos (SSC President)',
    fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
    fromName: 'MSU at Naawan — Monitoring & Evaluation Desk',
    subject: '[MSUN ACTION PLAN] Accomplishment Report Filed: Student Grievance & Policy Town Hall',
    previewText: 'Post-activity documentation and liquidation records have been archived into the FY 2026 registry.',
    activityId: 'ACT-2026-009',
    activityTitle: 'University-wide Student Grievance & Policy Town Hall',
    stageName: 'Accomplishment & Liquidation Sign-Off',
    approverName: 'Claire Joy Mariquit',
    approverRole: 'Monitoring and Evaluation Personnel',
    remarks: 'All liquidation receipts and evaluation surveys validated.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: true,
    statusBadge: 'Archived'
  }
];

class NotificationService {
  private readStorage<T>(key: string, defaults: T[]): T[] {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    } catch {
      return defaults;
    }
  }

  private writeStorage<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('msun-notifications-updated'));
    } catch (e) {
      console.warn('Failed to persist to localStorage:', e);
    }
  }

  public getNotifications(currentUser?: UserAccount | null): AppNotification[] {
    const all = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    if (!currentUser) return all;

    const isAdmin = currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'System Administrator';
    const isOSD = currentUser.role === 'ROLE_OSD' || currentUser.role.includes('OSD');

    if (isAdmin || isOSD) {
      return all;
    }

    return all.filter((n) => {
      if (n.userId && n.userId === currentUser.id) return true;
      if (n.targetOrgId && currentUser.orgId && n.targetOrgId.toUpperCase() === currentUser.orgId.toUpperCase()) return true;
      if (n.targetRole && n.targetRole === currentUser.role) return true;
      if (!n.userId && !n.targetOrgId && !n.targetRole) return true; // Broadcast
      return false;
    });
  }

  public getUnreadNotificationCount(currentUser?: UserAccount | null): number {
    return this.getNotifications(currentUser).filter((n) => !n.isRead).length;
  }

  public markNotificationAsRead(id: string): void {
    const all = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    const updated = all.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.writeStorage(LS_NOTIFICATIONS_KEY, updated);
  }

  public markAllNotificationsAsRead(currentUser?: UserAccount | null): void {
    const all = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    const userNotifIds = new Set(this.getNotifications(currentUser).map((n) => n.id));
    const updated = all.map((n) => (userNotifIds.has(n.id) ? { ...n, isRead: true } : n));
    this.writeStorage(LS_NOTIFICATIONS_KEY, updated);
  }

  public deleteNotification(id: string): void {
    const all = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    const updated = all.filter((n) => n.id !== id);
    this.writeStorage(LS_NOTIFICATIONS_KEY, updated);
  }

  public getEmails(currentUser?: UserAccount | null): SentEmail[] {
    const all = this.readStorage<SentEmail>(LS_EMAILS_KEY, SEED_EMAILS);
    if (!currentUser) return all;

    const isAdmin = currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'System Administrator';
    if (isAdmin) return all;

    const userEmail = (currentUser.email || '').toLowerCase();
    const orgId = (currentUser.orgId || '').toLowerCase();

    return all.filter((e) => {
      const to = e.toEmail.toLowerCase();
      if (userEmail && to.includes(userEmail)) return true;
      if (orgId && to.includes(orgId)) return true;
      return false;
    });
  }

  public getUnreadEmailCount(currentUser?: UserAccount | null): number {
    return this.getEmails(currentUser).filter((e) => !e.isRead).length;
  }

  public markEmailAsRead(id: string): void {
    const all = this.readStorage<SentEmail>(LS_EMAILS_KEY, SEED_EMAILS);
    const updated = all.map((e) => (e.id === id ? { ...e, isRead: true } : e));
    this.writeStorage(LS_EMAILS_KEY, updated);
  }

  /**
   * Dispatches both an In-App Notification and a Formal Email to the organization account
   * when an activity receives approval, endorsement, or sign-off.
   */
  public sendApprovalNotificationAndEmail(params: {
    activity: Activity;
    approver: UserAccount;
    stageName: string;
    isFinal: boolean;
    remarks?: string;
  }): { notification: AppNotification; email: SentEmail } {
    const { activity, approver, stageName, isFinal, remarks } = params;

    // Find destination email for the activity's organization
    const orgUser = INITIAL_USER_ACCOUNTS.find(
      (u) => u.orgId?.toUpperCase() === activity.orgId.toUpperCase() && u.role === 'ROLE_ORGANIZATION'
    );
    const toEmail = orgUser?.email || `${activity.orgId.toLowerCase()}.org@msunaawan.edu.ph`;
    const toName = orgUser?.name || `${activity.orgId} Leadership / ${activity.proposedBy}`;

    const emailId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const notifTitle = isFinal
      ? '🎉 Activity Fully Approved!'
      : `✅ Activity Approved: ${stageName}`;

    const notifMessage = isFinal
      ? `All workflow stages for "${activity.title}" have been completed and officially approved by ${approver.name}.`
      : `Your activity proposal was approved at "${stageName}" by ${approver.name} (${formatUserRole(approver)}). ${remarks ? `Remarks: "${remarks}"` : ''}`;

    const newNotification: AppNotification = {
      id: notifId,
      targetOrgId: activity.orgId,
      activityId: activity.id,
      activityTitle: activity.title,
      type: 'APPROVAL',
      title: notifTitle,
      message: notifMessage,
      actorName: approver.name,
      actorRole: formatUserRole(approver),
      stageName,
      timestamp: new Date().toISOString(),
      isRead: false,
      emailId
    };

    const emailSubject = isFinal
      ? `[MSUN ACTION PLAN] Final Approval & Liquidation Clearance: ${activity.title} (${activity.id})`
      : `[MSUN ACTION PLAN] Workflow Approved: ${stageName} — ${activity.title}`;

    const newEmail: SentEmail = {
      id: emailId,
      toEmail,
      toName,
      fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
      fromName: `MSU at Naawan — ${formatUserRole(approver)} Desk`,
      subject: emailSubject,
      previewText: `Approval notification for ${activity.title}. ${isFinal ? 'All workflows completed.' : `Cleared at ${stageName}.`}`,
      activityId: activity.id,
      activityTitle: activity.title,
      stageName,
      approverName: approver.name,
      approverRole: formatUserRole(approver),
      remarks: remarks || (isFinal ? 'Approved and officially liquidated. Ready for archival.' : 'Endorsed for next stage implementation.'),
      timestamp: new Date().toISOString(),
      isRead: false,
      statusBadge: isFinal ? 'Approved / Cleared' : 'In Progress'
    };

    // Save notification
    const notifications = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    this.writeStorage(LS_NOTIFICATIONS_KEY, [newNotification, ...notifications]);

    // Save email
    const emails = this.readStorage<SentEmail>(LS_EMAILS_KEY, SEED_EMAILS);
    this.writeStorage(LS_EMAILS_KEY, [newEmail, ...emails]);

    return { notification: newNotification, email: newEmail };
  }
}

export const notificationService = new NotificationService();
