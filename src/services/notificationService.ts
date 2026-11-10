import { Activity, AppNotification, SentEmail, UserAccount, formatUserRole } from '../types';
import { INITIAL_USER_ACCOUNTS } from '../data/initialData';

const LS_NOTIFICATIONS_KEY = 'msun_user_notifications';
const LS_EMAILS_KEY = 'msun_sent_emails';
const CHANNEL_NAME = 'msun_realtime_notifications';

// Initial pre-seeded notifications so the system feels alive immediately
const SEED_NOTIFICATIONS: AppNotification[] = [];

const SEED_EMAILS: SentEmail[] = [];

class NotificationService {
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initRealtimeListeners();
  }

  public connectStream(): void {
    if (typeof window === 'undefined') return;
    if (this.eventSource) {
      this.disconnectStream();
    }
    try {
      if ('EventSource' in window) {
        this.eventSource = new EventSource('/api/notifications/stream', { withCredentials: true });
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
        let sseErrorCount = 0;
        this.eventSource.onerror = () => {
          sseErrorCount++;
          // On static hosting (like Vercel) where SSE 404s, disconnect cleanly to prevent infinite polling
          if (sseErrorCount >= 2 || this.eventSource?.readyState === EventSource.CLOSED) {
            this.disconnectStream();
          }
        };
      }
    } catch (e) {
      console.warn('[NotificationService] EventSource unavailable:', e);
    }
  }

  public disconnectStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
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

  private writeStorage<T extends { id?: string }>(key: string, data: T[]): void {
    try {
      const seen = new Set<string>();
      const deduped: T[] = [];
      for (const item of data) {
        if (item && item.id) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            deduped.push(item);
          }
        } else {
          deduped.push(item);
        }
      }
      localStorage.setItem(key, JSON.stringify(deduped));
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('msun-notifications-updated'));
      }
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
    if (typeof window === 'undefined' || !window.location?.origin) return;
    try {
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        credentials: 'include',
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

    const role = (currentUser.activeRole || currentUser.role || '').trim();
    const isAdmin = role === 'ROLE_ADMIN' || role === 'System Administrator';

    // 1. System Administrator: Full platform audit visibility
    if (isAdmin) {
      return all;
    }

    const userId = currentUser.id;
    const orgId = (currentUser.orgId || '').toUpperCase().trim();
    const collegeId = (((currentUser as any).collegeId) || orgId).toUpperCase().trim();

    // Determine category
    const isAdviser = role === 'ROLE_ADVISER' || role.includes('Adviser');
    const isDean = role === 'ROLE_DEAN' || role.includes('Dean');
    const isOSD = role === 'ROLE_OSD' || role.includes('OSD');
    const isOVCSAS = role === 'ROLE_OVCSAS' || role.includes('OVCSAS');
    const isApprover = isAdviser || isDean || isOSD || isOVCSAS;

    const isOrgOfficer = role === 'ROLE_ORGANIZATION' || role.includes('President') || role.includes('Treasurer');

    return all.filter((n) => {
      // Direct recipient by user ID
      if (n.userId && n.userId === userId) {
        if (isApprover) {
          // Approvers ONLY receive SUBMISSION notifications requiring their endorsement
          return n.type === 'SUBMISSION';
        }
        return true;
      }

      // If notification has a specific userId that does NOT match this user, skip it
      if (n.userId && n.userId !== userId) {
        return false;
      }

      // -------------------------------------------------------------
      // APPROVER RULE: Only receive a notification if an activity is submitted to them
      // -------------------------------------------------------------
      if (isApprover) {
        // Approvers NEVER receive APPROVAL or DEFERRAL notifications
        if (n.type !== 'SUBMISSION') {
          return false;
        }

        const targetRole = (n.targetRole || '').toUpperCase();
        const stageName = (n.stageName || '').toUpperCase();
        const title = (n.title || '').toUpperCase();
        const notifOrg = (n.targetOrgId || '').toUpperCase().trim();

        // Must be an action required item, not an org submission receipt
        const isActionRequired =
          title.includes('ACTION REQUIRED') ||
          title.includes('AWAITING') ||
          title.includes('ENDORSEMENT') ||
          title.includes('SIGN-OFF');

        if (!isActionRequired && targetRole === 'ROLE_ORGANIZATION') {
          return false;
        }

        // Adviser routing
        if (isAdviser) {
          if (!notifOrg || notifOrg !== orgId) return false;
          if (targetRole === 'ROLE_ORGANIZATION') return false;
          const matchesRole = targetRole === 'ROLE_ADVISER' || targetRole.includes('ADVISER');
          const isAdviserStage =
            stageName.includes('ADVISER') ||
            stageName.includes('SIGN-OFF') ||
            stageName.includes('STAGE 2') ||
            stageName.includes('STAGE 6') ||
            stageName.includes('STAGE 7');
          return Boolean(matchesRole || isAdviserStage);
        }

        // Dean routing
        if (isDean) {
          if (!notifOrg || (notifOrg !== collegeId && notifOrg !== orgId)) return false;
          if (targetRole === 'ROLE_ORGANIZATION' || targetRole === 'ROLE_ADVISER') return false;
          const matchesRole = targetRole === 'ROLE_DEAN' || targetRole.includes('DEAN');
          const isDeanStage = stageName.includes('DEAN') || stageName.includes('STAGE 3');
          return Boolean(matchesRole || isDeanStage);
        }

        // OSD routing
        if (isOSD) {
          if (targetRole === 'ROLE_ORGANIZATION' || targetRole === 'ROLE_ADVISER' || targetRole === 'ROLE_DEAN') return false;
          const matchesRole = targetRole === 'ROLE_OSD' || targetRole.includes('OSD');
          const isOsdStage =
            stageName.includes('OSD') ||
            (stageName.includes('STAGE 3') && !stageName.includes('DEAN')) ||
            stageName.includes('STAGE 4');
          return Boolean(matchesRole || (isActionRequired && isOsdStage));
        }

        // OVCSAS routing
        if (isOVCSAS) {
          if (targetRole === 'ROLE_ORGANIZATION' || targetRole === 'ROLE_ADVISER' || targetRole === 'ROLE_DEAN' || targetRole === 'ROLE_OSD') return false;
          const matchesRole = targetRole === 'ROLE_OVCSAS' || targetRole.includes('OVCSAS');
          const isOvcsasStage = stageName.includes('OVCSAS') || stageName.includes('STAGE 4') || stageName.includes('STAGE 5');
          return Boolean(matchesRole || (isActionRequired && isOvcsasStage));
        }

        return false;
      }

      // -------------------------------------------------------------
      // STUDENT ORGANIZATION RULE:
      // -------------------------------------------------------------
      if (isOrgOfficer) {
        const notifOrg = (n.targetOrgId || '').toUpperCase().trim();
        if (notifOrg && notifOrg !== orgId) {
          return false;
        }

        const targetRole = (n.targetRole || '').toUpperCase();
        if (['ROLE_ADVISER', 'ROLE_DEAN', 'ROLE_OSD', 'ROLE_OVCSAS'].includes(targetRole)) {
          return false;
        }

        const title = (n.title || '').toUpperCase();
        if (title.includes('ACTION REQUIRED') && !title.includes('REVISION')) {
          return false;
        }

        if (n.type === 'APPROVAL' || n.type === 'DEFERRAL') {
          return true;
        }

        if (n.type === 'SUBMISSION') {
          return targetRole === 'ROLE_ORGANIZATION' || title.includes('SUBMITTED');
        }

        return true;
      }

      // Default role fallback
      if (n.targetRole && n.targetRole !== role) {
        return false;
      }
      if (n.targetOrgId && n.targetOrgId.toUpperCase().trim() !== orgId) {
        return false;
      }

      return true;
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
    const role = currentUser?.activeRole || currentUser?.role || '';
    if (!currentUser || role === 'ROLE_ADMIN' || role === 'System Administrator') {
      const updated = all.map((n) => ({ ...n, isRead: true }));
      this.writeStorage(LS_NOTIFICATIONS_KEY, updated);
      return;
    }
    const userNotifs = this.getNotifications(currentUser);
    const userNotifIds = new Set(userNotifs.map((n) => n.id));
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

    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const role = currentUser.activeRole || currentUser.role || '';
    const isOrgUser = role === 'ROLE_ORGANIZATION' || role.includes('ORGANIZATION');
    const orgEmail = currentUser.orgId ? `${currentUser.orgId.toLowerCase().trim()}.org@msunaawan.edu.ph` : '';

    return all.filter((e) => {
      const to = (e.toEmail || '').toLowerCase().trim();
      if (userEmail && to === userEmail) return true;
      if (isOrgUser && orgEmail && to === orgEmail) return true;
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
      targetRole: 'ROLE_ORGANIZATION',
      userId: submitter.id,
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
      userId: orgAdviser?.id,
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
   * Helper to resolve the designated recipient and role for any workflow stage
   */
  public getWorkflowRecipientForStage(
    activity: Activity,
    stageId: number
  ): { user: UserAccount; roleLabel: string; actionDesc: string } | null {
    const isCollegeOrg = Boolean(
      activity.collegeId ||
      activity.organizationType === 'COLLEGE' ||
      ['CBIT', 'CELS', 'CESS', 'CMFS'].includes(activity.orgId?.toUpperCase())
    );

    let accounts = INITIAL_USER_ACCOUNTS;
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('msun_user_accounts');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            accounts = parsed;
          }
        }
      }
    } catch {}

    if (isCollegeOrg) {
      // 7-Stage College Workflow
      if (stageId === 1 || stageId === 6) {
        // Stage 1: DAD, Stage 6: Accomplishment Report Submission -> Org Officer
        const u = accounts.find(
          (a) => a.orgId?.toUpperCase() === activity.orgId?.toUpperCase() && (a.role === 'ROLE_ORGANIZATION' || a.roles?.includes('ROLE_ORGANIZATION'))
        );
        return u
          ? {
              user: u,
              roleLabel: 'Student Organization Officer',
              actionDesc: stageId === 1 ? 'Complete and submit Detailed Activity Design (DAD)' : 'Prepare and submit Accomplishment Report and Financial Liquidation'
            }
          : null;
      }
      if (stageId === 2 || stageId === 7) {
        // Stage 2: Adviser Review, Stage 7: Adviser Accomplishment Review -> Assigned Adviser
        const u = accounts.find(
          (a) => a.orgId?.toUpperCase() === activity.orgId?.toUpperCase() && (a.role === 'ROLE_ADVISER' || a.roles?.includes('ROLE_ADVISER'))
        );
        return u
          ? {
              user: u,
              roleLabel: 'Organization Faculty Adviser',
              actionDesc: stageId === 2 ? 'Review and endorse Activity Design (DAD)' : 'Review liquidation documents and grant Final Accomplishment Sign-Off'
            }
          : null;
      }
      if (stageId === 3) {
        // Stage 3: College Dean Endorsement
        const college = activity.collegeId || activity.orgId;
        const u = accounts.find(
          (a) =>
            (a.collegeId?.toUpperCase() === college?.toUpperCase() || a.orgId?.toUpperCase() === college?.toUpperCase()) &&
            (a.role === 'ROLE_DEAN' || a.roles?.includes('ROLE_DEAN'))
        );
        return u
          ? {
              user: u,
              roleLabel: 'College Dean',
              actionDesc: 'Review and endorse College Activity proposal'
            }
          : null;
      }
      if (stageId === 4) {
        // Stage 4: OSD Approval
        const u = accounts.find((a) => a.role === 'ROLE_OSD' || a.roles?.includes('ROLE_OSD'));
        return u
          ? {
              user: u,
              roleLabel: 'Office of Student Development (OSD)',
              actionDesc: 'Review activity guidelines, handbook compliance, and university calendar clearing'
            }
          : null;
      }
      if (stageId === 5) {
        // Stage 5: OVCSAS Final Approval
        const u = accounts.find((a) => a.role === 'ROLE_OVCSAS' || a.roles?.includes('ROLE_OVCSAS'));
        return u
          ? {
              user: u,
              roleLabel: 'Office of the Vice Chancellor for Student Affairs and Services',
              actionDesc: 'Review and grant Executive Institutional Approval'
            }
          : null;
      }
    } else {
      // 6-Stage Central Workflow (SSC, KAABAG, SENSSO)
      if (stageId === 1 || stageId === 5) {
        // Stage 1: DAD, Stage 5: Accomplishment Report Submission -> Org Officer
        const u = accounts.find(
          (a) => a.orgId?.toUpperCase() === activity.orgId?.toUpperCase() && (a.role === 'ROLE_ORGANIZATION' || a.roles?.includes('ROLE_ORGANIZATION'))
        );
        return u
          ? {
              user: u,
              roleLabel: 'Student Organization Officer',
              actionDesc: stageId === 1 ? 'Complete and submit Detailed Activity Design (DAD)' : 'Prepare and submit Accomplishment Report and Financial Liquidation'
            }
          : null;
      }
      if (stageId === 2 || stageId === 6) {
        // Stage 2: Adviser Review, Stage 6: Adviser Accomplishment Review -> Assigned Adviser
        const u = accounts.find(
          (a) => a.orgId?.toUpperCase() === activity.orgId?.toUpperCase() && (a.role === 'ROLE_ADVISER' || a.roles?.includes('ROLE_ADVISER'))
        );
        return u
          ? {
              user: u,
              roleLabel: 'Organization Faculty Adviser',
              actionDesc: stageId === 2 ? 'Review and endorse Activity Design (DAD)' : 'Review liquidation documents and grant Final Accomplishment Sign-Off'
            }
          : null;
      }
      if (stageId === 3) {
        // Stage 3: OSD Approval (Dean bypassed)
        const u = accounts.find((a) => a.role === 'ROLE_OSD' || a.roles?.includes('ROLE_OSD'));
        return u
          ? {
              user: u,
              roleLabel: 'Office of Student Development (OSD)',
              actionDesc: 'Review activity guidelines, handbook compliance, and university calendar clearing'
            }
          : null;
      }
      if (stageId === 4) {
        // Stage 4: OVCSAS Final Approval
        const u = accounts.find((a) => a.role === 'ROLE_OVCSAS' || a.roles?.includes('ROLE_OVCSAS'));
        return u
          ? {
              user: u,
              roleLabel: 'Office of the Vice Chancellor for Student Affairs and Services',
              actionDesc: 'Review and grant Executive Institutional Approval'
            }
          : null;
      }
    }
    return null;
  }

  /**
   * EVENT 2: Triggered when an activity receives approval at any stage (Adviser, Dean, OSD, OVCSAS).
   * Notifies the organization AND automatically sends an email & notification to the next approver in line!
   */
  public sendApprovalNotificationAndEmail(params: {
    activity: Activity;
    approver: UserAccount;
    stageName: string;
    isFinal: boolean;
    remarks?: string;
  }): { notification: AppNotification; email: SentEmail } {
    const { activity, approver, stageName, isFinal, remarks } = params;

    // 1. Find destination email for the activity's organization
    const orgUser = INITIAL_USER_ACCOUNTS.find(
      (u) => u.orgId?.toUpperCase() === activity.orgId.toUpperCase() && u.role === 'ROLE_ORGANIZATION'
    );
    const orgEmail = orgUser?.email || `${activity.orgId.toLowerCase()}.org@msunaawan.edu.ph`;
    const orgName = orgUser?.name || `${activity.orgId} Leadership / ${activity.proposedBy}`;

    const orgEmailId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const orgNotifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const notifTitle = isFinal
      ? '🎉 Activity Fully Approved!'
      : `✅ Activity Approved: ${stageName}`;

    const notifMessage = isFinal
      ? `All workflow stages for "${activity.title}" have been completed and officially approved by ${approver.name}.`
      : `Your activity proposal was approved at "${stageName}" by ${approver.name} (${formatUserRole(approver)}). ${remarks ? `Remarks: "${remarks}"` : ''}`;

    const orgNotification: AppNotification = {
      id: orgNotifId,
      targetOrgId: activity.orgId,
      targetRole: 'ROLE_ORGANIZATION',
      userId: orgUser?.id,
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
      emailId: orgEmailId,
      deliveryStatus: 'DELIVERED'
    };

    const orgEmailSubject = isFinal
      ? `[MSUN ACTION PLAN] Final Approval & Liquidation Clearance: ${activity.title} (${activity.id})`
      : `[MSUN ACTION PLAN] Workflow Approved: ${stageName} — ${activity.title}`;

    const orgEmailRecord: SentEmail = {
      id: orgEmailId,
      toEmail: orgEmail,
      toName: orgName,
      fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
      fromName: `MSU at Naawan — ${formatUserRole(approver)} Desk`,
      subject: orgEmailSubject,
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

    orgEmailRecord.gmailComposeUrl = this.getGmailComposeUrl(orgEmailRecord);
    orgNotification.gmailComposeUrl = orgEmailRecord.gmailComposeUrl;

    const notificationsToSave = [orgNotification];
    const emailsToSave = [orgEmailRecord];

    // 2. If NOT final, find the NEXT APPROVER and automatically send them an email & notification!
    if (!isFinal) {
      const currentTimeline = activity.timeline || [];
      const inProgressStep = currentTimeline.find((s) => s.status === 'in_progress');
      const nextStageId = inProgressStep ? inProgressStep.id : undefined;

      if (nextStageId) {
        const nextRecipient = this.getWorkflowRecipientForStage(activity, nextStageId);
        if (nextRecipient && nextRecipient.user.email !== orgEmail) {
          const nextEmailId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const nextNotifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const stepTitle = inProgressStep?.title || `Stage ${nextStageId}`;

          const nextNotification: AppNotification = {
            id: nextNotifId,
            targetOrgId: activity.orgId,
            targetRole: nextRecipient.user.role,
            userId: nextRecipient.user.id,
            activityId: activity.id,
            activityTitle: activity.title,
            type: 'SUBMISSION',
            title: `Action Required: Activity Proposal Awaiting Endorsement 📋`,
            message: `"${activity.title}" (${activity.orgId}) was endorsed by ${approver.name} (${formatUserRole(approver)}) and forwarded to your desk. Action required: ${nextRecipient.actionDesc}.`,
            actorName: approver.name,
            actorRole: formatUserRole(approver),
            stageName: stepTitle,
            timestamp: new Date().toISOString(),
            isRead: false,
            emailId: nextEmailId,
            deliveryStatus: 'DELIVERED'
          };

          const nextEmailSubject = `[MSUN ACTION PLAN] Action Required: ${activity.title} (${activity.orgId}) awaiting your review`;
          const nextEmailRecord: SentEmail = {
            id: nextEmailId,
            toEmail: nextRecipient.user.email,
            toName: nextRecipient.user.name,
            fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
            fromName: `MSU at Naawan — ${formatUserRole(approver)} Desk`,
            subject: nextEmailSubject,
            previewText: `Activity proposal was approved by ${approver.name} and forwarded to you for ${stepTitle}.`,
            activityId: activity.id,
            activityTitle: activity.title,
            stageName: stepTitle,
            approverName: approver.name,
            approverRole: formatUserRole(approver),
            remarks: remarks || `Endorsed by ${approver.name}. Awaiting your official sign-off.`,
            timestamp: new Date().toISOString(),
            isRead: false,
            statusBadge: 'Awaiting Your Sign-Off',
            deliveryMethod: 'GMAIL_SMTP',
            deliveryStatus: 'DELIVERED'
          };

          nextEmailRecord.gmailComposeUrl = this.getGmailComposeUrl(nextEmailRecord);
          nextNotification.gmailComposeUrl = nextEmailRecord.gmailComposeUrl;

          notificationsToSave.unshift(nextNotification);
          emailsToSave.unshift(nextEmailRecord);
        }
      }
    }

    // Save notifications & emails
    const notifications = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    this.writeStorage(LS_NOTIFICATIONS_KEY, [...notificationsToSave, ...notifications]);

    const emails = this.readStorage<SentEmail>(LS_EMAILS_KEY, SEED_EMAILS);
    this.writeStorage(LS_EMAILS_KEY, [...emailsToSave, ...emails]);

    // Dispatch external Gmails
    for (const email of emailsToSave) {
      this.dispatchExternalGmail(email);
    }

    // Broadcast in real-time
    for (const notif of notificationsToSave) {
      this.handleIncomingRealtimeNotification(notif, true);
    }

    return { notification: orgNotification, email: orgEmailRecord };
  }

  /**
   * EVENT 3: Triggered when an organization submits their post-activity Accomplishment Report.
   * Notifies the assigned Adviser for final liquidation sign-off.
   */
  public notifyAccomplishmentSubmission(params: {
    activity: Activity;
    submitter: UserAccount;
    stageId?: number;
  }): { orgNotification: AppNotification; approverNotification: AppNotification; email: SentEmail } {
    const { activity, submitter } = params;
    const isCol = Boolean(
      activity.collegeId ||
      activity.organizationType === 'COLLEGE' ||
      ['CBIT', 'CELS', 'CESS', 'CMFS'].includes(activity.orgId?.toUpperCase())
    );

    const orgAdviser = INITIAL_USER_ACCOUNTS.find(
      (u) => u.orgId?.toUpperCase() === activity.orgId.toUpperCase() && (u.role === 'ROLE_ADVISER' || u.roles?.includes('ROLE_ADVISER'))
    );
    const approverName = orgAdviser?.name || `${activity.orgId} Faculty Adviser`;
    const approverEmail = orgAdviser?.email || `${activity.orgId.toLowerCase()}.adviser@msunaawan.edu.ph`;

    const emailId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const notifOrgId = `notif-accomp-${Date.now()}-org`;
    const notifAppId = `notif-accomp-${Date.now()}-app`;

    const stageTitle = isCol
      ? 'Stage 7: Adviser Accomplishment Review & Sign-Off'
      : 'Stage 6: Adviser Accomplishment Review & Sign-Off';

    const orgNotification: AppNotification = {
      id: notifOrgId,
      targetOrgId: activity.orgId,
      targetRole: 'ROLE_ORGANIZATION',
      userId: submitter.id,
      activityId: activity.id,
      activityTitle: activity.title,
      type: 'SUBMISSION',
      title: `Accomplishment Report Submitted 📄`,
      message: `Post-activity Accomplishment Report for "${activity.title}" was submitted by ${submitter.name}. Forwarded to ${approverName} for final liquidation sign-off.`,
      actorName: submitter.name,
      actorRole: formatUserRole(submitter),
      stageName: isCol ? 'Stage 6: Accomplishment Report Submission' : 'Stage 5: Accomplishment Report Submission',
      timestamp: new Date().toISOString(),
      isRead: false,
      emailId,
      deliveryStatus: 'DELIVERED'
    };

    const approverNotification: AppNotification = {
      id: notifAppId,
      targetOrgId: activity.orgId,
      targetRole: 'ROLE_ADVISER',
      userId: orgAdviser?.id,
      activityId: activity.id,
      activityTitle: activity.title,
      type: 'SUBMISSION',
      title: `Action Required: Accomplishment Report Awaiting Final Sign-Off 📋`,
      message: `${activity.orgId} submitted post-activity Accomplishment Report & Liquidation for "${activity.title}". Please verify documents and grant final institutional sign-off.`,
      actorName: submitter.name,
      actorRole: formatUserRole(submitter),
      stageName: stageTitle,
      timestamp: new Date().toISOString(),
      isRead: false,
      emailId,
      deliveryStatus: 'DELIVERED'
    };

    const newEmail: SentEmail = {
      id: emailId,
      toEmail: approverEmail,
      toName: `${approverName} (${activity.orgId} Adviser)`,
      fromEmail: 'no-reply-actionplan@msunaawan.edu.ph',
      fromName: `MSU at Naawan — ${activity.orgId} Leadership`,
      subject: `[MSUN ACTION PLAN] Action Required: Accomplishment Report Awaiting Final Sign-Off — ${activity.title} (${activity.orgId})`,
      previewText: `Accomplishment report and financial liquidation submitted by ${submitter.name}. Awaiting your final sign-off.`,
      activityId: activity.id,
      activityTitle: activity.title,
      stageName: stageTitle,
      approverName,
      approverRole: 'Faculty Adviser',
      remarks: `Accomplishment report, attendee logs, and liquidation receipts filed by ${submitter.name} (${formatUserRole(submitter)}).`,
      timestamp: new Date().toISOString(),
      isRead: false,
      statusBadge: 'Awaiting Final Sign-Off',
      deliveryMethod: 'GMAIL_SMTP',
      deliveryStatus: 'DELIVERED'
    };

    newEmail.gmailComposeUrl = this.getGmailComposeUrl(newEmail);
    orgNotification.gmailComposeUrl = newEmail.gmailComposeUrl;
    approverNotification.gmailComposeUrl = newEmail.gmailComposeUrl;

    const notifications = this.readStorage<AppNotification>(LS_NOTIFICATIONS_KEY, SEED_NOTIFICATIONS);
    this.writeStorage(LS_NOTIFICATIONS_KEY, [approverNotification, orgNotification, ...notifications]);

    const emails = this.readStorage<SentEmail>(LS_EMAILS_KEY, SEED_EMAILS);
    this.writeStorage(LS_EMAILS_KEY, [newEmail, ...emails]);

    // Dispatch automated email to the Adviser
    this.dispatchExternalGmail(newEmail);

    this.handleIncomingRealtimeNotification(orgNotification, true);
    this.handleIncomingRealtimeNotification(approverNotification, true);

    return { orgNotification, approverNotification, email: newEmail };
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
      targetRole: 'ROLE_ORGANIZATION',
      userId: orgUser?.id,
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
