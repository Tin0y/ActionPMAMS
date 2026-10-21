import { Activity, AppNotification, SentEmail, UserAccount, formatUserRole } from '../types';
import { INITIAL_USER_ACCOUNTS } from '../data/initialData';

const LS_NOTIFICATIONS_KEY = 'msun_user_notifications';
const LS_EMAILS_KEY = 'msun_sent_emails';
const CHANNEL_NAME = 'msun_realtime_notifications';

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
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    isRead: false,
    emailId: 'email-ssc-001',
    deliveryStatus: 'DELIVERED'
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
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    isRead: false,
    emailId: 'email-ssc-002',
    deliveryStatus: 'DELIVERED'
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
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: true,
    emailId: 'email-ssc-003',
    deliveryStatus: 'DELIVERED'
  },
  {
    id: 'notif-sys-001',
    type: 'SYSTEM',
    title: 'FY 2027 Action Plan Call for Proposals',
    message: 'The Office of Student Development (OSD) has opened the synchronization calendar for FY 2027 student activities.',
    actorName: 'OSD Central Office',
    actorRole: 'System Administration',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isRead: true,
    deliveryStatus: 'DELIVERED'
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
    statusBadge: 'Approved',
    deliveryMethod: 'GMAIL_SMTP',
    deliveryStatus: 'DELIVERED'
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
    statusBadge: 'Approved',
    deliveryMethod: 'GMAIL_SMTP',
    deliveryStatus: 'DELIVERED'
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
    statusBadge: 'Archived',
    deliveryMethod: 'GMAIL_SMTP',
    deliveryStatus: 'DELIVERED'
  }
];

class NotificationService {
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initRealtimeListeners();
  }

  private initRealtimeListeners() {
    if (typeof window === 'undefined') return;

    // 1. BroadcastChannel for zero-latency multi-tab sync
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'NEW_NOTIFICATION') {
            this.handleIncomingRealtimeNotification(event.data.notification, false);
          }
        };
      }
    } catch (e) {
      console.warn('[NotificationService] BroadcastChannel unavailable:', e);
    }

    // 2. Server-Sent Events (SSE) for real-time live server push across devices
    try {
      if ('EventSource' in window) {
        this.eventSource = new EventSource('/api/notifications/stream');
        this.eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'NOTIFICATION' && parsed.data) {
              this.handleIncomingRealtimeNotification(parsed.data, false);
            }
          } catch {
            // Heartbeat or malformed data
          }
        };
        this.eventSource.onerror = () => {
          // SSE auto-reconnects natively
        };
      }
    } catch (e) {
      console.warn('[NotificationService] EventSource unavailable:', e);
    }
  }

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

  /**
   * Gentle Web Audio API chime on new incoming live notification
   */
  public playChime(): void {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Note 1 (E5 - 659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2 (A5 - 880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.1, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch {
      // Audio playback blocked or unavailable
    }
  }

  /**
   * Request browser permission for OS-level desktop push notifications
   */
  public async requestDesktopNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Shows an OS-level desktop notification if permission is granted
   */
  private showDesktopNotification(title: string, message: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
      } catch {
        // Notification constructor blocked
      }
    }
  }

  /**
   * Handles an incoming real-time notification received over SSE or BroadcastChannel
   */
  private handleIncomingRealtimeNotification(notif: AppNotification, shouldBroadcast = true) {
    const notifications = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    const exists = notifications.some((n) => n.id === notif.id);

    if (!exists) {
      this.writeStorage(LS_NOTIFICATIONS_KEY, [notif, ...notifications]);
      this.playChime();
      this.showDesktopNotification(notif.title, notif.message);

      // Emit real-time alert event so App.vue or active views can show an instant toast popup
      window.dispatchEvent(new CustomEvent('msun-realtime-alert', { detail: notif }));
    }

    if (shouldBroadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'NEW_NOTIFICATION', notification: notif });
      } catch (e) {
        console.warn('Failed to broadcast notification:', e);
      }
    }
  }

  /**
   * Dispatches an external notification via the backend Gmail service
   */
  public async dispatchExternalGmail(emailData: SentEmail): Promise<void> {
    try {
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: emailData.toEmail,
          toName: emailData.toName,
          fromName: emailData.fromName,
          subject: emailData.subject,
          previewText: emailData.previewText,
          activityId: emailData.activityId,
          activityTitle: emailData.activityTitle,
          stageName: emailData.stageName,
          actorName: emailData.approverName || 'MSUN Official',
          actorRole: emailData.approverRole || 'Designated Signatory',
          remarks: emailData.remarks,
          statusBadge: emailData.statusBadge || 'Approved',
          eventType: 'APPROVAL'
        })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.data?.gmailWebComposeUrl) {
          emailData.gmailComposeUrl = json.data.gmailWebComposeUrl;
          emailData.deliveryMethod = json.data.method;
          emailData.deliveryStatus = 'DELIVERED';
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Backend Gmail dispatch notice (handled locally):', err);
    }
  }

  /**
   * Generate Gmail web compose URL for quick opening
   */
  public getGmailComposeUrl(email: SentEmail): string {
    if (email.gmailComposeUrl) return email.gmailComposeUrl;

    const plainText = [
      `Official Notice: ${email.subject}`,
      `Activity: ${email.activityTitle} (${email.activityId || 'N/A'})`,
      `Stage: ${email.stageName || 'N/A'}`,
      `Approver: ${email.approverName || 'N/A'} (${email.approverRole || ''})`,
      email.remarks ? `Remarks: "${email.remarks}"` : '',
      `Access Portal: http://localhost:3000`
    ].filter(Boolean).join('\n\n');

    const params = new URLSearchParams({
      to: email.toEmail,
      su: email.subject,
      body: plainText
    });
    return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
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
      if (!n.userId && !n.targetOrgId && !n.targetRole) return true;
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
   * EVENT 1: Triggered when an activity is submitted for approval (by an org officer/member).
   * Notifies both the organization members/officers and the initial approver (Adviser / Dean / OSD).
   * Also sends external Gmail notification.
   */
  public notifyActivitySubmission(params: {
    activity: Activity;
    submitter: UserAccount;
  }): { orgNotification: AppNotification; approverNotification: AppNotification; email: SentEmail } {
    const { activity, submitter } = params;

    // 1. Resolve first-line approver (Adviser)
    const orgAdviser = INITIAL_USER_ACCOUNTS.find(
      (u) => u.orgId?.toUpperCase() === activity.orgId.toUpperCase() && (u.role === 'ROLE_ADVISER' || u.role.includes('Adviser'))
    );
    const approverName = orgAdviser?.name || `${activity.orgId} Faculty Adviser`;
    const approverEmail = orgAdviser?.email || `${activity.orgId.toLowerCase()}.adviser@msunaawan.edu.ph`;

    // 2. Resolve organization recipient
    const orgOfficer = INITIAL_USER_ACCOUNTS.find(
      (u) => u.orgId?.toUpperCase() === activity.orgId.toUpperCase() && u.role === 'ROLE_ORGANIZATION'
    );
    const orgEmail = submitter.email || orgOfficer?.email || `${activity.orgId.toLowerCase()}.org@msunaawan.edu.ph`;

    const emailId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const notifOrgId = `notif-sub-${Date.now()}-org`;
    const notifAppId = `notif-sub-${Date.now()}-app`;

    // Notification for Organization members
    const orgNotification: AppNotification = {
      id: notifOrgId,
      targetOrgId: activity.orgId,
      activityId: activity.id,
      activityTitle: activity.title,
      type: 'SUBMISSION',
      title: `New Activity Proposal Submitted 📄`,
      message: `"${activity.title}" was submitted by ${submitter.name} (${formatUserRole(submitter)}). Forwarded to ${approverName} for endorsement.`,
      actorName: submitter.name,
      actorRole: formatUserRole(submitter),
      stageName: 'Stage 1: Organization Submission',
      timestamp: new Date().toISOString(),
      isRead: false,
      emailId,
      deliveryStatus: 'DELIVERED'
    };

    // Notification for Initial Approver
    const approverNotification: AppNotification = {
      id: notifAppId,
      targetOrgId: activity.orgId,
      targetRole: 'ROLE_ADVISER',
      activityId: activity.id,
      activityTitle: activity.title,
      type: 'SUBMISSION',
      title: `Action Required: New Activity Awaiting Endorsement 📋`,
      message: `${activity.orgId} submitted proposal "${activity.title}". Please review the Activity Design and provide official sign-off.`,
      actorName: submitter.name,
      actorRole: formatUserRole(submitter),
      stageName: 'Stage 2: Adviser Review',
      timestamp: new Date().toISOString(),
      isRead: false,
      emailId,
      deliveryStatus: 'DELIVERED'
    };

    // External Gmail notification to the approver
    const emailSubject = `[MSUN ACTION PLAN] Action Required: New Activity Proposal — ${activity.title} (${activity.orgId})`;
    const newEmail: SentEmail = {
      id: emailId,
      toEmail: approverEmail,
      toName: `${approverName} (${activity.orgId} Adviser)`,
      fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
      fromName: `MSU at Naawan — ${activity.orgId} Leadership`,
      subject: emailSubject,
      previewText: `New proposal submitted by ${submitter.name} for ${activity.orgId}. Awaiting your official review and endorsement.`,
      activityId: activity.id,
      activityTitle: activity.title,
      stageName: 'Stage 2: Adviser Review',
      approverName: approverName,
      approverRole: 'Faculty Adviser',
      remarks: `Submitted by ${submitter.name} (${formatUserRole(submitter)}) with estimated budget of ₱${(activity.budget || 0).toLocaleString()}. Please review proposal details in the system.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      statusBadge: 'Awaiting Endorsement',
      deliveryMethod: 'GMAIL_SMTP',
      deliveryStatus: 'DELIVERED'
    };

    newEmail.gmailComposeUrl = this.getGmailComposeUrl(newEmail);
    orgNotification.gmailComposeUrl = newEmail.gmailComposeUrl;
    approverNotification.gmailComposeUrl = newEmail.gmailComposeUrl;

    // Persist and broadcast
    const notifications = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    this.writeStorage(LS_NOTIFICATIONS_KEY, [orgNotification, approverNotification, ...notifications]);

    const emails = this.readStorage<SentEmail>(LS_EMAILS_KEY, SEED_EMAILS);
    this.writeStorage(LS_EMAILS_KEY, [newEmail, ...emails]);

    // Dispatch external Gmail via backend
    this.dispatchExternalGmail(newEmail);

    // Broadcast in real-time
    this.handleIncomingRealtimeNotification(orgNotification, true);
    this.handleIncomingRealtimeNotification(approverNotification, true);

    return { orgNotification, approverNotification, email: newEmail };
  }

  /**
   * EVENT 2: Triggered when an activity receives approval at any stage (Adviser, Dean, OSD, OVCSAS).
   * Notifies the organization and the next approver in line, and dispatches external Gmail.
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
      emailId,
      deliveryStatus: 'DELIVERED'
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
      statusBadge: isFinal ? 'Approved / Cleared' : 'In Progress',
      deliveryMethod: 'GMAIL_SMTP',
      deliveryStatus: 'DELIVERED'
    };

    newEmail.gmailComposeUrl = this.getGmailComposeUrl(newEmail);
    newNotification.gmailComposeUrl = newEmail.gmailComposeUrl;

    // Save notification & email
    const notifications = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    this.writeStorage(LS_NOTIFICATIONS_KEY, [newNotification, ...notifications]);

    const emails = this.readStorage<SentEmail>(LS_EMAILS_KEY, SEED_EMAILS);
    this.writeStorage(LS_EMAILS_KEY, [newEmail, ...emails]);

    // Dispatch external Gmail via backend
    this.dispatchExternalGmail(newEmail);

    // Broadcast in real-time across tabs & SSE
    this.handleIncomingRealtimeNotification(newNotification, true);

    return { notification: newNotification, email: newEmail };
  }

  /**
   * EVENT 3: Triggered when an activity is deferred / returned for revision
   */
  public notifyActivityDeferral(params: {
    activity: Activity;
    actor: UserAccount;
    reason: string;
    stageId: number;
  }): { notification: AppNotification; email: SentEmail } {
    const { activity, actor, reason, stageId } = params;

    const orgUser = INITIAL_USER_ACCOUNTS.find(
      (u) => u.orgId?.toUpperCase() === activity.orgId.toUpperCase() && u.role === 'ROLE_ORGANIZATION'
    );
    const toEmail = orgUser?.email || `${activity.orgId.toLowerCase()}.org@msunaawan.edu.ph`;
    const toName = orgUser?.name || `${activity.orgId} Leadership / ${activity.proposedBy}`;

    const emailId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const notifId = `notif-def-${Date.now()}`;

    const notifTitle = `⚠️ Activity Returned for Revision`;
    const notifMessage = `"${activity.title}" was returned by ${actor.name} (${formatUserRole(actor)}). Reason: "${reason}". Please revise and resubmit.`;

    const newNotification: AppNotification = {
      id: notifId,
      targetOrgId: activity.orgId,
      activityId: activity.id,
      activityTitle: activity.title,
      type: 'DEFERRAL',
      title: notifTitle,
      message: notifMessage,
      actorName: actor.name,
      actorRole: formatUserRole(actor),
      stageName: `Stage ${stageId}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      emailId,
      deliveryStatus: 'DELIVERED'
    };

    const newEmail: SentEmail = {
      id: emailId,
      toEmail,
      toName,
      fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
      fromName: `MSU at Naawan — ${formatUserRole(actor)} Desk`,
      subject: `[MSUN ACTION PLAN] Action Required: Activity Returned for Revision — ${activity.title}`,
      previewText: `Your activity was returned for revision by ${actor.name}. Reason: ${reason}`,
      activityId: activity.id,
      activityTitle: activity.title,
      stageName: `Stage ${stageId}`,
      approverName: actor.name,
      approverRole: formatUserRole(actor),
      remarks: reason,
      timestamp: new Date().toISOString(),
      isRead: false,
      statusBadge: 'Revision Required',
      deliveryMethod: 'GMAIL_SMTP',
      deliveryStatus: 'DELIVERED'
    };

    newEmail.gmailComposeUrl = this.getGmailComposeUrl(newEmail);
    newNotification.gmailComposeUrl = newEmail.gmailComposeUrl;

    const notifications = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    this.writeStorage(LS_NOTIFICATIONS_KEY, [newNotification, ...notifications]);

    const emails = this.readStorage<SentEmail>(LS_EMAILS_KEY, SEED_EMAILS);
    this.writeStorage(LS_EMAILS_KEY, [newEmail, ...emails]);

    this.dispatchExternalGmail(newEmail);
    this.handleIncomingRealtimeNotification(newNotification, true);

    return { notification: newNotification, email: newEmail };
  }
}

export const notificationService = new NotificationService();
