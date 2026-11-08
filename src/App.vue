<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { 
  ModuleType, 
  SidebarTab, 
  AdminTab,
  ApprovalTab,
  OrgId, 
  Activity, 
  ActivityStatus,
  UserAccount,
  UserRole,
  ActionPlanFolder,
  formatUserRole
} from './types';
import { 
  INITIAL_ACTIVITIES, 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_ACTION_PLAN_FOLDERS,
  ORGANIZATIONS,
  isActivityVisibleForUser,
  isCollegeOrg,
  getWorkflowTimelineForOrg,
  getInitialTimelineForActionPlan
} from './data/initialData';
import { isSameOrg, getUserAssignedRoles, formatRoleLabel } from './utils/organizationUtils';
import {
  initializeDatabaseCollections,
  subscribeToActivities,
  subscribeToUserAccounts,
  subscribeToActionPlanFolders,
  saveActivityToDb,
  batchSaveActivitiesToDb,
  writeAllActivitiesToDb,
  saveUserAccountToDb,
  saveActionPlanFolderToDb,
  ensureOsdAccountsInDb,
  isSenssoFy2027Activity,
  syncFromBackendApi,
  dbStatus
} from './services/db';
import { syncOptionsWithBackend } from './services/optionsService';
import {
  fetchSessionUser,
  switchSessionRole,
  logoutSession,
  fetchSanitizedUsersFromApi,
  createUserAccountApi,
  updateUserAccountApi,
  sanitizeUserAccount
} from './services/auth';
import type { Unsubscribe } from './services/db';
import Header from './components/Header.vue';
import Sidebar from './components/Sidebar.vue';
import AdminSidebar from './components/AdminSidebar.vue';
import ApprovalSidebar from './components/ApprovalSidebar.vue';
import DashboardView from './components/DashboardView.vue';
import ActionPlanView from './components/ActionPlanView.vue';
import ActivityView from './components/ActivityView.vue';
import FinancialView from './components/FinancialView.vue';
import OrganizationsView from './components/OrganizationsView.vue';
import ApprovalDashboardView from './components/ApprovalDashboardView.vue';
import PlansApprovalsView from './components/PlansApprovalsView.vue';
import AccountsView from './components/AccountsView.vue';
import AdminActionPlanView from './components/AdminActionPlanView.vue';
import OptionsManagementView from './components/OptionsManagementView.vue';
import AddActivityModal from './components/AddActivityModal.vue';
import ImportExcelModal from './components/ImportExcelModal.vue';
import ActivityDetailsModal from './components/ActivityDetailsModal.vue';
import CalendarModal from './components/CalendarModal.vue';
import LandingPageView from './components/LandingPageView.vue';
import ProfileSettingsModal from './components/ProfileSettingsModal.vue';
import EmailInboxModal from './components/EmailInboxModal.vue';
import ToastContainer, { ToastMessage } from './components/Toast.vue';
import { notificationService } from './services/notificationService';
import { SentEmail } from './types';
import { LogOut, X } from 'lucide-vue-next';

// Initial authorized module resolution based on active user
const getInitialModule = (user?: UserAccount): ModuleType => {
  if (!user) return 'activity_management';
  const role = user.activeRole || user.role;
  if (role === 'ROLE_ADMIN' || role === 'System Administrator' || role === 'SysAd') {
    return 'system_admin';
  }
  if ([
    'ROLE_ADVISER',
    'ROLE_DEAN',
    'ROLE_OSD',
    'ROLE_OVCSAS',
    'ROLE_OC',
    'Faculty Adviser',
    'Organization Adviser',
    'College Dean',
    'Dean / College Reviewer',
    'OSD Officer',
    'OSD Staff',
    'OSD Director',
    'OVCSAS Officer',
    'Office of the Chancellor',
    'Vice Chancellor / Chancellor',
    'Chancellor'
  ].includes(role)) {
    return 'approval_management';
  }
  return 'activity_management';
};

// Scrub any legacy client-side auth keys on load; authentication is strictly server-session driven
const CURRENT_APP_VERSION = 'v2026.11.08_fresh_test_accounts';
try {
  localStorage.removeItem('msun_active_user_id');
  if (localStorage.getItem('msun_data_version') !== CURRENT_APP_VERSION) {
    localStorage.removeItem('msun_user_accounts');
    localStorage.removeItem('msun_action_plan_activities');
    localStorage.removeItem('msun_activities');
    localStorage.removeItem('msun_user_notifications');
    localStorage.removeItem('msun_sent_emails');
    localStorage.setItem('msun_data_version', CURRENT_APP_VERSION);
  }
} catch (e) {
  // ignore
}

// User Accounts state (populated from PostgreSQL /api/users after authentication, initialized from local cache or seed)
const userAccounts = ref<UserAccount[]>(
  (() => {
    try {
      const raw = localStorage.getItem('msun_user_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, UserAccount>();
          INITIAL_USER_ACCOUNTS.forEach(u => map.set(u.id, sanitizeUserAccount(u)));
          parsed.forEach((u: UserAccount) => map.set(u.id, sanitizeUserAccount(u)));
          return Array.from(map.values());
        }
      }
    } catch {}
    return INITIAL_USER_ACCOUNTS.map(sanitizeUserAccount);
  })()
);

// Active Logged-in User Account: populated strictly via /api/auth/login or /api/auth/me
const authenticatedUser = ref<UserAccount | null>(null);

const currentUser = computed<UserAccount | null>(() => authenticatedUser.value);

// Primary Module (Strictly tied to user role)
const currentModule = ref<ModuleType>(getInitialModule(currentUser.value));

// Sidebar Tab inside Activity Management
const currentTab = ref<SidebarTab>('dashboard');

// Sidebar Tab inside System Administrator
const currentAdminTab = ref<AdminTab>('dashboard');

// Sidebar Tab inside Approval Management
const currentApprovalTab = ref<ApprovalTab>('dashboard');

// Action Plan Folders state (System Administration)
const actionPlanFolders = ref<ActionPlanFolder[]>(INITIAL_ACTION_PLAN_FOLDERS);

// Organization Filter: Defaults to logged-in user's council (e.g. 'CBIT')
const selectedOrgFilter = ref<OrgId | 'ALL'>(
  (currentUser.value?.orgId && currentUser.value.orgId !== 'ADMIN' && currentUser.value.orgId !== 'COLLEGE')
    ? (currentUser.value.orgId as OrgId)
    : 'CBIT'
);

const isRoleAuthorizedForModule = (role: string, module: ModuleType): boolean => {
  if (module === 'system_admin') {
    return role === 'ROLE_ADMIN' || role === 'System Administrator' || role === 'SysAd';
  }
  if (module === 'approval_management') {
    return [
      'ROLE_ADVISER',
      'ROLE_DEAN',
      'ROLE_OSD',
      'ROLE_OVCSAS',
      'ROLE_OC',
      'Faculty Adviser',
      'Organization Adviser',
      'College Dean',
      'Dean / College Reviewer',
      'OSD Officer',
      'OSD Staff',
      'OSD Director',
      'OVCSAS Officer',
      'Office of the Chancellor',
      'Vice Chancellor / Chancellor',
      'Chancellor'
    ].includes(role);
  }
  if (module === 'activity_management') {
    return [
      'ROLE_ORGANIZATION',
      'Org President',
      'Org Treasurer'
    ].includes(role) || !['ROLE_ADMIN', 'ROLE_OSD', 'ROLE_DEAN', 'ROLE_OVCSAS', 'ROLE_OC', 'ROLE_ADVISER'].includes(role);
  }
  return false;
};

const handleSelectModule = (mod: ModuleType) => {
  if (!currentUser.value) return;
  const currentRole = currentUser.value.activeRole || currentUser.value.role;
  if (!isRoleAuthorizedForModule(currentRole, mod)) {
    addToast('Access Restricted', `Role ${formatRoleLabel(currentRole)} is not authorized to access ${mod.replace('_', ' ')}.`, 'warning');
    return;
  }
  currentModule.value = mod;
};

const normalizeActivity = (act: Activity): Activity => {
  const a = { ...act };
  const isCol = isCollegeOrg(a.orgId);
  const max = isCol ? 7 : 6;

  // Action Plan relationship:
  // Proposing in the Action Plan -> either Approved or Rejected in the Action Plan
  // If Rejected in Action Plan: stores in Action Plan as rejected
  // If Approved in Action Plan: placed into Activity Management as status 'Draft'
  // where the student org fills out the DAD form to route through the approval workflow!
  if (a.isActionPlanItem || a.source === 'ACTION_PLAN' || a.isPlanConfirmed !== undefined) {
    a.isActionPlanItem = true;
    a.source = 'ACTION_PLAN';
    
    // Explicitly track Action Plan decision
    if (a.actionPlanStatus === 'Rejected' || (a.isPlanConfirmed && (a.status === 'Rejected' || a.approvalStatus === 'Rejected'))) {
      a.actionPlanStatus = 'Rejected';
      a.status = 'Rejected';
      a.workflowStatus = 'REJECTED';
      a.approvalStatus = 'Rejected';
      return a;
    }

    if (a.isPlanConfirmed || a.actionPlanStatus === 'Approved' || a.approvalStatus === 'Fully Approved') {
      a.actionPlanStatus = 'Approved';
    }
  }

  // Strict rule: An activity CANNOT be Approved or advance past Stage 1 in Activity Management
  // if its DAD form has not been completed and submitted!
  if (!a.designForm?.isCompleted && a.status !== 'Rejected' && a.approvalStatus !== 'Rejected') {
    a.status = 'Draft';
    a.workflowStatus = 'DRAFT';
    a.approvalStatus = 'Draft';
    a.approvalStageIndex = 1;
    a.approvalStage = isCol
      ? 'Stage 1: College Organization Submission'
      : 'Stage 1: Organization Submission';
    if (!a.timeline || a.timeline.length === 0 || a.timeline.every(s => s.status === 'completed')) {
      a.timeline = getInitialTimelineForActionPlan(a.orgId);
    }
    return a;
  }

  // If DAD is completed, check the actual timeline progress
  const allTimelineCompleted = !!(a.timeline && a.timeline.length > 0 && a.timeline.every(s => s.status === 'completed'));
  const finalStepCompleted = !!(a.timeline && a.timeline.find(s => s.id === max)?.status === 'completed');

  if (allTimelineCompleted || finalStepCompleted) {
    a.status = 'Approved';
    a.workflowStatus = 'COMPLETED';
    a.approvalStage = 'Approved & Completed';
    a.approvalStatus = 'Fully Approved';
    return a;
  }

  if (a.status === 'DEFERRED' || a.approvalStatus === 'Deferred' || a.status === 'DEFERRED FOR REVISION') {
    a.status = 'DEFERRED';
    a.approvalStage = 'DEFERRED FOR REVISION';
    a.approvalStatus = 'Deferred';
    return a;
  }

  if (a.status === 'Rejected' || a.approvalStatus === 'Rejected' || a.workflowStatus === 'REJECTED') {
    a.status = 'Rejected';
    a.workflowStatus = 'REJECTED';
    a.approvalStage = 'REJECTED';
    a.approvalStatus = 'Rejected';
    return a;
  }

  // Otherwise, DAD form is completed and activity is in progress through the review routing
  a.status = 'Pending';
  a.workflowStatus = 'IN_PROGRESS';
  a.approvalStatus = 'Pending Review';

  // Ensure proper active step in timeline if missing
  if (!a.timeline || a.timeline.length === 0) {
    a.timeline = getWorkflowTimelineForOrg(a.orgId, true);
  }

  return a;
};

const getSavedActivities = (): Activity[] => {
  const normalizeList = (acts: Activity[]): Activity[] => acts.filter(a => !isSenssoFy2027Activity(a)).map(normalizeActivity);

  try {
    const saved = localStorage.getItem('msun_action_plan_activities');
    if (saved) {
      const parsed: Activity[] = JSON.parse(saved);
      // Clean up outdated seeded states for newly configured 2027 test activities
      const updatedList = parsed.map(p => {
        const initial = INITIAL_ACTIVITIES.find(i => i.id === p.id);
        if (initial && (p.id === 'ACT-2027-SSC-001' || p.id === 'ACT-2027-SSC-002' || p.id === 'ACT-2027-CBIT-001' || p.id === 'ACT-2027-CBIT-002')) {
          if (!p.workflowHistory || p.workflowHistory.length === 0) {
            return { ...initial };
          }
        }
        return p;
      });
      const existingIds = new Set(updatedList.map(a => a.id));
      const missing = INITIAL_ACTIVITIES.filter(a => !existingIds.has(a.id));
      if (missing.length > 0) {
        return normalizeList([...missing, ...updatedList]);
      }
      return normalizeList(updatedList);
    }
  } catch (e) {
    // ignore
  }
  return normalizeList(INITIAL_ACTIVITIES);
};

const activities = ref<Activity[]>(getSavedActivities());

// Persist to localStorage
watch(
  activities,
  (newVal) => {
    try {
      const cleaned = newVal.filter(a => !isSenssoFy2027Activity(a));
      localStorage.setItem('msun_action_plan_activities', JSON.stringify(cleaned));
    } catch (e) {
      // ignore
    }
  },
  { deep: true }
);

// Modal and navigation states (default open for desktop, closed for mobile/tablet)
const isSidebarOpen = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
const isAddActivityOpen = ref(false);
const isImportOpen = ref(false);
const importTargetFiscalYear = ref('Fiscal Year 2027');
const isCalendarModalOpen = ref(false);
const selectedActivityForModal = ref<Activity | null>(null);

// Scoped counts for active user's council
const activeUserOrg = computed(() => {
  if (currentUser.value?.orgId && currentUser.value.orgId !== 'ADMIN' && currentUser.value.orgId !== 'COLLEGE') {
    return currentUser.value.orgId;
  }
  if (selectedOrgFilter.value !== 'ALL') {
    return selectedOrgFilter.value;
  }
  return null;
});

const scopedActivitiesCount = computed(() => {
  if (activeUserOrg.value) {
    return activities.value.filter(a => isSameOrg(a.orgId, activeUserOrg.value)).length;
  }
  return activities.value.length;
});

const scopedActionPlanCount = computed(() => {
  const fyDigits = importTargetFiscalYear.value?.replace(/\D/g, '') || '2027';
  return activities.value.filter(act => {
    const isActionPlanRecord = Boolean(
      act.isActionPlanItem || 
      act.source === 'ACTION_PLAN' || 
      act.status === 'Approved' || 
      act.status === 'APPROVED' || 
      act.workflowStatus === 'COMPLETED'
    );
    if (!isActionPlanRecord) return false;
    if (activeUserOrg.value && !isSameOrg(act.orgId, activeUserOrg.value)) return false;
    const actYearNumber = (act.fiscalYear || '').replace(/\D/g, '');
    return !fyDigits || actYearNumber === fyDigits || (act.startDate && act.startDate.startsWith(fyDigits));
  }).length;
});

// Active Fiscal Year for Admin module and action plans count in side menu
const activeAdminFiscalYear = ref('FY 2026');

// Total Action Plan Sheets imported in the active Fiscal Year folder
const importedActionPlansCountForActiveYear = computed(() => {
  const fy = activeAdminFiscalYear.value || 'FY 2026';
  const fyDigits = fy.replace(/\D/g, '');
  if (!fyDigits) return 0;

  const yearActs = activities.value.filter(act => {
    const actYearDigits = (act.fiscalYear || '').replace(/\D/g, '');
    if (actYearDigits) return actYearDigits === fyDigits;
    if (act.startDate) return act.startDate.startsWith(fyDigits);
    return false;
  });

  const orgs = new Set(
    yearActs
      .filter(a => a.orgId && a.orgId !== 'ADMIN' && a.orgId !== 'COLLEGE')
      .map(a => a.orgId)
  );

  return orgs.size;
});

// Email Inbox Modal state
const isEmailInboxOpen = ref(false);
const selectedEmailIdForModal = ref<string | undefined>(undefined);
const emailsList = ref<SentEmail[]>(notificationService.getEmails(currentUser.value));

const refreshEmails = () => {
  emailsList.value = notificationService.getEmails(currentUser.value);
};

const handleOpenEmailInbox = (emailId?: string) => {
  selectedEmailIdForModal.value = emailId;
  refreshEmails();
  isEmailInboxOpen.value = true;
};

const handleOpenActivityFromNotification = (activityId: string) => {
  const target = activities.value.find(a => a.id === activityId);
  if (target) {
    const role = currentUser.value?.role || '';
    const isApprover = [
      'ROLE_ADVISER',
      'ROLE_DEAN',
      'ROLE_OSD',
      'ROLE_OVCSAS',
      'Faculty Adviser',
      'College Dean',
      'Dean / College Reviewer',
      'OSD Officer',
      'OSD Director',
      'OVCSAS Officer'
    ].includes(role);

    if (isApprover) {
      currentModule.value = 'approval_management';
    } else if (role !== 'ROLE_ADMIN') {
      currentModule.value = 'activity_management';
      currentTab.value = 'activity';
    }
    selectedActivityForModal.value = target;
    addToast('Activity Record Opened', `Viewing "${target.title}".`, 'info');
  }
};

const handleReferToActivityFromEmail = (activityId: string) => {
  handleOpenActivityFromNotification(activityId);
  addToast('Referred from Email 🚀', `Successfully directed from official email to activity record ${activityId}.`, 'success');
};

const handleSimulateApprovalEmail = () => {
  if (!currentUser.value) return;
  const sampleActivity = activities.value.find(a => a.orgId === currentUser.value?.orgId) || activities.value[0];
  if (!sampleActivity) return;

  const simulatedApprover = INITIAL_USER_ACCOUNTS.find(u => u.role === 'ROLE_ADVISER' || u.role === 'ROLE_OSD') || {
    id: 'usr-sim-01',
    name: 'DINAH KENDRA A. LUMACTAD',
    email: 'adviser.osd@msunaawan.edu.ph',
    isActive: true,
    role: 'ROLE_ADVISER' as const
  };

  notificationService.sendApprovalNotificationAndEmail({
    activity: sampleActivity,
    approver: simulatedApprover,
    stageName: 'Stage 6: Adviser Accomplishment Review & Final Sign-Off',
    isFinal: true,
    remarks: 'Official verification complete. All deliverables and liquidation receipts endorsed with full clearance.'
  });

  refreshEmails();
  addToast('Approval Email Dispatched 📨', `Sent official clearance notification to ${currentUser.value.email || 'organization account'}.`, 'success');
};

// Database lifecycle and real-time syncing
let unsubActivities: Unsubscribe | null = null;
let unsubUsers: Unsubscribe | null = null;
let unsubFolders: Unsubscribe | null = null;

const handleResize = () => {
  if (typeof window !== 'undefined' && window.innerWidth < 1024 && isSidebarOpen.value) {
    isSidebarOpen.value = false;
  }
};

onMounted(async () => {
  // 1. Validate server-side HttpOnly session cookie first
  const sessionUser = await fetchSessionUser();
  if (sessionUser) {
    authenticatedUser.value = sessionUser;
    currentModule.value = getInitialModule(sessionUser);
    if (sessionUser.orgId && sessionUser.orgId !== 'ADMIN' && sessionUser.orgId !== 'COLLEGE') {
      selectedOrgFilter.value = sessionUser.orgId as OrgId;
    }
    isLandingPageOpen.value = false;
  } else {
    authenticatedUser.value = null;
    isLandingPageOpen.value = true;
  }

  // 2. Initialize collections
  await initializeDatabaseCollections();

  // Listen to live updates from local storage
  unsubActivities = subscribeToActivities((data) => {
    if (data && data.length > 0) {
      activities.value = data.filter(a => !isSenssoFy2027Activity(a)).map(normalizeActivity);
    }
  });

  if (sessionUser) {
    const isAdmin = sessionUser.activeRole === 'ROLE_ADMIN' || sessionUser.role === 'ROLE_ADMIN' || sessionUser.role === 'System Administrator';
    notificationService.connectStream();
    await syncFromBackendApi(isAdmin);
    await syncOptionsWithBackend();
    if (isAdmin) {
      const serverUsers = await fetchSanitizedUsersFromApi();
      if (serverUsers && serverUsers.length > 0) {
        userAccounts.value = serverUsers;
        try {
          localStorage.setItem('msun_user_accounts', JSON.stringify(serverUsers));
        } catch {}
      } else {
        unsubUsers = subscribeToUserAccounts((data) => {
          userAccounts.value = (data && data.length > 0 ? data : INITIAL_USER_ACCOUNTS).map(sanitizeUserAccount);
        });
      }
    } else {
      unsubUsers = subscribeToUserAccounts((data) => {
        userAccounts.value = (data && data.length > 0 ? data : INITIAL_USER_ACCOUNTS).map(sanitizeUserAccount);
      });
    }
  }

  unsubFolders = subscribeToActionPlanFolders((data) => {
    if (data && data.length > 0) {
      actionPlanFolders.value = data;
    }
  });

  // If user is already authenticated and inside workspace on load, prime history so Back button is active
  if (currentUser.value && !isLandingPageOpen.value) {
    pushAppSessionHistory();
  }

  // Real-time alert listener across tabs and server stream
  const handleRealtimeAlert = (e: Event) => {
    const customEvent = e as CustomEvent;
    const notif = customEvent.detail;
    if (!notif) return;

    addToast(
      `🔔 ${notif.title}`,
      notif.message,
      notif.type === 'APPROVAL' ? 'success' : notif.type === 'DEFERRAL' ? 'warning' : 'info'
    );
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('msun-realtime-alert', handleRealtimeAlert);
  window.addEventListener('popstate', handlePopState);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (unsubActivities) unsubActivities();
  if (unsubUsers) unsubUsers();
  if (unsubFolders) unsubFolders();
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('popstate', handlePopState);
  window.removeEventListener('keydown', handleKeydown);
});

// Toasts
const toasts = ref<ToastMessage[]>([]);

const addToast = (
  title: string,
  message?: string,
  type: 'success' | 'info' | 'warning' = 'success'
) => {
  const id = `${Date.now()}-${Math.random()}`;
  toasts.value.push({ id, title, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, 4500);
};

const removeToast = (id: string) => {
  toasts.value = toasts.value.filter((t) => t.id !== id);
};

// Actions
const handleAddActivity = (newActivity: Activity) => {
  const normalizedNew = normalizeActivity(newActivity);
  activities.value.unshift(normalizedNew);
  saveActivityToDb(normalizedNew).catch((err) => {
    console.warn('Failed to save activity to local storage:', err);
  });

  if (normalizedNew.designForm?.isCompleted) {
    // Real-time notification & external Gmail dispatch to adviser and organization
    if (currentUser.value) {
      notificationService.notifyActivitySubmission({
        activity: normalizedNew,
        submitter: currentUser.value
      });
    }

    addToast(
      'Activity Submitted for Approval 🚀',
      `"${normalizedNew.title}" was submitted under ${normalizedNew.orgId}. Real-time notice & Gmail dispatched to Adviser.`,
      'success'
    );
  } else {
    addToast(
      'Action Plan Activity Added 📋',
      `"${normalizedNew.title}" saved under ${normalizedNew.orgId} at Stage 1. Fill out its Detailed Activity Design (DAD) form to submit for approval.`,
      'info'
    );
  }
};

const handleImportActivities = (newBatch: Activity[]) => {
  if (!newBatch || newBatch.length === 0) return;

  const firstItem = newBatch[0];
  const targetOrg = firstItem?.orgId || currentUser.value?.orgId || 'SENSSO';
  const targetFiscalYear = firstItem?.fiscalYear || importTargetFiscalYear.value || 'Fiscal Year 2027';
  const targetYearDigits = (targetFiscalYear.match(/\d{4}/) || [])[0] || '2027';

  // Helper to determine if an activity belongs to the same organization and fiscal year folder
  const isMatchingOrgAndYear = (act: Activity) => {
    if (!isSameOrg(act.orgId, targetOrg)) return false;
    const actYearDigits = (act.fiscalYear || '').match(/\d{4}/)?.[0] || '';
    if (actYearDigits && targetYearDigits) {
      return actYearDigits === targetYearDigits;
    }
    if (act.startDate && targetYearDigits) {
      return act.startDate.startsWith(targetYearDigits);
    }
    return true;
  };

  const existingOrgYearActs = activities.value.filter(isMatchingOrgAndYear);
  const otherActivities = activities.value.filter(a => !isMatchingOrgAndYear(a));

  const updatedOrgYearActs: Activity[] = [];
  const matchedExistingIds = new Set<string>();

  for (const newItem of newBatch) {
    const normNewTitle = (newItem.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const normNewProg = (newItem.programActivity || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const existing = existingOrgYearActs.find(e => {
      if (e.id === newItem.id) return true;
      const normE = (e.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const normEProg = (e.programActivity || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return (normE && (normE === normNewTitle || normE === normNewProg)) ||
             (normEProg && (normEProg === normNewTitle || normEProg === normNewProg));
    });

    const stage1Label = isCollegeOrg(targetOrg)
      ? 'Stage 1: College Organization Submission'
      : 'Stage 1: Organization Submission';

    if (existing) {
      matchedExistingIds.add(existing.id);
      const hasCompletedDad = Boolean(existing.designForm?.isCompleted);
      const hasProgress = hasCompletedDad && Boolean(existing.workflowHistory && existing.workflowHistory.length > 0);
      const wasApproved = hasCompletedDad && (existing.status === 'Approved' || existing.status === 'APPROVED' || existing.workflowStatus === 'COMPLETED');

      updatedOrgYearActs.push({
        ...existing,
        title: newItem.title,
        programActivity: newItem.programActivity || newItem.title,
        timeframe: newItem.timeframe,
        startDate: newItem.startDate,
        endDate: newItem.endDate || newItem.startDate,
        startTime: newItem.startTime,
        endTime: newItem.endTime,
        venue: newItem.venue,
        description: newItem.description,
        strategicObjectives: newItem.strategicObjectives,
        expectedOutput: newItem.expectedOutput,
        kpiOutcome: newItem.kpiOutcome,
        lineItemBudget: newItem.lineItemBudget,
        amount: newItem.amount,
        budget: newItem.budget,
        totalBudget: newItem.totalBudget,
        fundSource: newItem.fundSource,
        personAssigned: newItem.personAssigned,
        proposedBy: newItem.proposedBy,
        targetParticipants: newItem.targetParticipants,
        strategicPillar: newItem.strategicPillar,
        fiscalYear: targetFiscalYear,
        isActionPlanItem: true,
        source: 'ACTION_PLAN' as const,
        status: !hasCompletedDad ? 'Draft' : (wasApproved ? 'Approved' : (hasProgress ? existing.status : 'Pending')),
        approvalStatus: !hasCompletedDad ? 'Draft' : existing.approvalStatus,
        approvalStageIndex: !hasCompletedDad ? 1 : (existing.approvalStageIndex || 2),
        approvalStage: !hasCompletedDad ? stage1Label : (wasApproved ? existing.approvalStage : (hasProgress ? existing.approvalStage : 'Stage 2: Assigned Adviser Review')),
        workflowStatus: !hasCompletedDad ? 'DRAFT' : (wasApproved ? 'COMPLETED' : (hasProgress ? existing.workflowStatus : 'IN_PROGRESS')),
        timeline: !hasCompletedDad ? getInitialTimelineForActionPlan(targetOrg) : (hasProgress ? existing.timeline : getInitialTimelineForActionPlan(targetOrg))
      });
    } else {
      updatedOrgYearActs.push({
        ...newItem,
        orgId: targetOrg,
        office: targetOrg,
        fiscalYear: targetFiscalYear,
        isActionPlanItem: true,
        source: 'ACTION_PLAN' as const,
        status: 'Draft' as const,
        approvalStatus: 'Draft' as const,
        approvalStageIndex: 1,
        workflowStatus: 'DRAFT' as const,
        approvalStage: stage1Label,
        timeline: getInitialTimelineForActionPlan(targetOrg)
      });
    }
  }

  // Preserve any previously in-progress activities (with real workflow history) or ad-hoc activities not in the re-uploaded sheet
  for (const oldAct of existingOrgYearActs) {
    if (!matchedExistingIds.has(oldAct.id)) {
      if (oldAct.id === 'ACT-2027-CMFS-001' || oldAct.title?.includes('Coastal Stewards Assembly')) {
        continue;
      }
      const hasRealUserSubmission = Boolean(
        oldAct.workflowHistory && 
        oldAct.workflowHistory.some(h => !h.id.startsWith('wf-init-'))
      );
      const isAdHocActivity = !oldAct.isActionPlanItem && oldAct.source !== 'ACTION_PLAN' && !oldAct.id?.includes('ACT-2027-');
      if (hasRealUserSubmission || isAdHocActivity) {
        updatedOrgYearActs.push(oldAct);
      }
    }
  }

  // Update activities in-place
  activities.value = [...updatedOrgYearActs, ...otherActivities];

  // Persist imported activities strictly for the caller's organization
  batchSaveActivitiesToDb(updatedOrgYearActs).catch((err) => {
    console.warn('Failed to save imported activities to database:', err);
  });

  // Sync Action Plan Folder statistics
  const folder = actionPlanFolders.value.find(f => {
    const fYearDigits = (f.fiscalYear || '').match(/\d{4}/)?.[0] || '';
    return fYearDigits === targetYearDigits;
  });

  if (folder) {
    const yearActs = activities.value.filter(a => {
      const aYearDigits = (a.fiscalYear || '').match(/\d{4}/)?.[0] || '';
      return aYearDigits === targetYearDigits;
    });
    folder.totalActivitiesCount = yearActs.length;
    folder.allocatedBudget = yearActs.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
    folder.approvedCount = yearActs.filter(a => a.status === 'Approved' || a.workflowStatus === 'COMPLETED').length;
    folder.pendingCount = yearActs.length - folder.approvedCount;
    const activeRole = currentUser.value?.activeRole || currentUser.value?.role;
    if (activeRole === 'ROLE_ADMIN' || activeRole === 'System Administrator') {
      saveActionPlanFolderToDb(folder).catch((err) => {
        console.warn('Failed to update action plan folder in local storage:', err);
      });
    }
  }

  // Synchronize viewed organization and fiscal year so the imported activities immediately display
  if (targetOrg && targetOrg !== 'ALL') {
    selectedOrgFilter.value = targetOrg as any;
  }
  if (targetFiscalYear) {
    importTargetFiscalYear.value = targetFiscalYear;
  }

  addToast(
    'Action Plan Updated',
    `Updated ${updatedOrgYearActs.length} activities for ${targetOrg} in ${targetFiscalYear}. Activities updated in-place without duplicates.`,
    'success'
  );
};

const handleToggleStatus = (activityId: string) => {
  const target = activities.value.find((act) => act.id === activityId);
  if (!target) return;

  if (!target.designForm?.isCompleted && target.status !== 'Approved') {
    addToast(
      'DAD Form Required ⚠️',
      `"${target.title}" cannot be approved until the Detailed Activity Design (DAD) form is filled out and submitted.`,
      'warning'
    );
    return;
  }

  let updatedActivity: Activity | null = null;
  activities.value = activities.value.map((act) => {
    if (act.id === activityId) {
      const nextStatus: ActivityStatus = act.status === 'Approved' ? 'Pending' : 'Approved';
      addToast(
        `Status Updated: ${nextStatus}`,
        `"${act.title}" is now marked as ${nextStatus}.`,
        nextStatus === 'Approved' ? 'success' : 'info'
      );
      updatedActivity = {
        ...act,
        status: nextStatus,
        approvalStage: nextStatus === 'Approved' ? 'Approved' : 'Dean Review'
      };
      return updatedActivity;
    }
    return act;
  });

  if (updatedActivity) {
    saveActivityToDb(updatedActivity).catch((err) => {
      console.warn('Failed to update activity status in local storage:', err);
    });
  }

  if (selectedActivityForModal.value && selectedActivityForModal.value.id === activityId) {
    const nextStatus: ActivityStatus = selectedActivityForModal.value.status === 'Approved' ? 'Pending' : 'Approved';
    selectedActivityForModal.value = {
      ...selectedActivityForModal.value,
      status: nextStatus,
      approvalStage: nextStatus === 'Approved' ? 'Approved' : 'Dean Review'
    };
  }
};


const handleBatchSaveActivities = (batch: Activity[]) => {
  const normBatch = batch.map(normalizeActivity);
  const map = new Map<string, Activity>();
  activities.value.forEach(a => map.set(a.id, a));
  normBatch.forEach(a => map.set(a.id, a));
  activities.value = Array.from(map.values());
  batchSaveActivitiesToDb(normBatch).catch(err => {
    console.warn('Failed to batch save activities:', err);
  });
};

const handleUpdateActivity = (updated: Activity, skipBackendCrud = false) => {
  const norm = normalizeActivity(updated);
  activities.value = activities.value.map((act) => (act.id === norm.id ? norm : act));
  if (selectedActivityForModal.value?.id === norm.id) {
    selectedActivityForModal.value = norm;
  }
  const activeRole = currentUser.value?.activeRole || currentUser.value?.role;
  const canCrud = activeRole === 'ROLE_ADMIN' || (activeRole === 'ROLE_ORGANIZATION' && isSameOrg(currentUser.value?.orgId, norm.orgId));
  if (canCrud && !skipBackendCrud) {
    saveActivityToDb(norm).catch((err) => {
      console.warn('Failed to update activity in local storage:', err);
    });
  }
  addToast('Workflow Updated', `Activity timeline and form details updated for "${norm.title}".`, 'success');
};

const handleOpenActivityModal = (act: Activity) => {
  selectedActivityForModal.value = act;
};

const handleDownloadCalendar = () => {
  const calendarEvents = activities.value
    .map((act) => {
      const cleanStart = act.startDate.replace(/-/g, '');
      const cleanEnd = act.endDate.replace(/-/g, '');
      return [
        'BEGIN:VEVENT',
        `SUMMARY:[${act.orgId}] ${act.title}`,
        `DESCRIPTION:${act.description} (Status: ${act.status} | Budget: PHP ${act.budget})`,
        `LOCATION:${act.venue}`,
        `DTSTART;VALUE=DATE:${cleanStart}`,
        `DTEND;VALUE=DATE:${cleanEnd}`,
        `STATUS:${act.status === 'Approved' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT'
      ].join('\r\n');
    })
    .join('\r\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MSU Naawan//Action Plan Calendar 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MSUN Action Plan FY 2026',
    calendarEvents,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `MSUN_Action_Plan_Schedule_2026.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  addToast(
    'Calendar Downloaded',
    'Institutional Action Plan schedule exported as standard iCalendar (.ics) format.',
    'success'
  );
};

const handleSelectOrgFilterFromView = (orgId: OrgId) => {
  selectedOrgFilter.value = orgId;
  currentTab.value = 'activity';
  addToast(`Filter Applied: ${orgId}`, `Now viewing activities for ${orgId}.`, 'info');
};

// Admin Account actions (persisted via authenticated bcrypt backend endpoints)
const handleCreateAccount = async (
  newAcc: Omit<UserAccount, 'id' | 'createdDate'>,
  plainPassword: string
) => {
  const newId = `usr-${Date.now().toString(36)}`;
  const account: UserAccount = sanitizeUserAccount({
    ...newAcc,
    id: newId,
    createdDate: new Date().toISOString().split('T')[0],
    lastActive: 'Just now'
  });

  const res = await createUserAccountApi(account, plainPassword);
  const createdUser = (res.ok && res.user) ? res.user : account;
  if (!res.ok) {
    console.warn('[CreateAccount] API error, saving to local cache:', res.message);
  }

  userAccounts.value.unshift(createdUser);
  try {
    localStorage.setItem('msun_user_accounts', JSON.stringify(userAccounts.value));
  } catch {}
  addToast(
    'Account Created',
    `User account for "${createdUser.name}" (${createdUser.displayRole || createdUser.role}) was created with a bcrypt-hashed password.`,
    'success'
  );
};

const handleUpdateAccount = async (updatedAcc: UserAccount, resetPassword?: string) => {
  const res = await updateUserAccountApi(
    sanitizeUserAccount(updatedAcc),
    resetPassword ? { newPassword: resetPassword, mustChangePassword: true } : undefined
  );
  const effectiveUser = (res.ok && res.user) ? res.user : sanitizeUserAccount(updatedAcc);

  const index = userAccounts.value.findIndex(a => a.id === updatedAcc.id);
  if (index !== -1) {
    userAccounts.value[index] = effectiveUser;
  }
  try {
    localStorage.setItem('msun_user_accounts', JSON.stringify(userAccounts.value));
  } catch {}
  if (authenticatedUser.value && authenticatedUser.value.id === effectiveUser.id) {
    if (!effectiveUser.isActive) {
      await handleLogout();
      return;
    }
    authenticatedUser.value = {
      ...effectiveUser,
      role: authenticatedUser.value.role,
      activeRole: authenticatedUser.value.activeRole
    };
  }
  addToast(
    resetPassword ? 'Account & Password Reset' : 'Account Updated',
    resetPassword
      ? `Details and password hash for ${effectiveUser.name} have been updated.`
      : `Details for ${effectiveUser.name} have been saved.`,
    'success'
  );
};

const handleToggleAccountStatus = async (accountId: string) => {
  const acc = userAccounts.value.find(a => a.id === accountId);
  if (!acc) return;

  const targetStatus = !acc.isActive;
  const res = await updateUserAccountApi({ ...acc, isActive: targetStatus });
  const effectiveUser = (res.ok && res.user) ? res.user : { ...acc, isActive: targetStatus };

  const idx = userAccounts.value.findIndex(a => a.id === accountId);
  if (idx !== -1) {
    userAccounts.value[idx] = effectiveUser;
  }
  try {
    localStorage.setItem('msun_user_accounts', JSON.stringify(userAccounts.value));
  } catch {}

  if (authenticatedUser.value?.id === accountId && !effectiveUser.isActive) {
    await handleLogout();
    return;
  }

  addToast(
    effectiveUser.isActive ? 'Account Activated' : 'Account Deactivated',
    `User account "${effectiveUser.name}" is now ${effectiveUser.isActive ? 'Active' : 'Deactivated'}.`,
    effectiveUser.isActive ? 'success' : 'warning'
  );
};

// Admin Action Plan Folder actions
const handleCreateFolder = (folderData: Omit<ActionPlanFolder, 'id' | 'createdAt' | 'totalActivitiesCount' | 'approvedCount' | 'pendingCount'>) => {
  const newFolder: ActionPlanFolder = {
    ...folderData,
    id: `AP-${folderData.fiscalYear.replace(/\s+/g, '')}`,
    createdAt: new Date().toISOString().split('T')[0],
    totalActivitiesCount: 0,
    approvedCount: 0,
    pendingCount: 0
  };
  actionPlanFolders.value.unshift(newFolder);
  activeAdminFiscalYear.value = newFolder.fiscalYear;
  importTargetFiscalYear.value = newFolder.fiscalYear;
  saveActionPlanFolderToDb(newFolder).catch((err) => {
    console.warn('Failed to save folder to local storage:', err);
  });
  addToast('Action Plan Folder Created', `Institutional repository for ${newFolder.fiscalYear} created successfully.`, 'success');
};

const handleEnsureOsdAccounts = async () => {
  const osdAccs = await ensureOsdAccountsInDb();
  for (const acc of osdAccs) {
    if (!userAccounts.value.some((u) => u.id === acc.id)) {
      userAccounts.value.push(acc);
    }
  }
  addToast('OSD Accounts Synchronized', 'OSD Officer and Director accounts verified in system.', 'success');
};

const handleOpenFolderActivities = (fiscalYear: string) => {
  currentModule.value = 'activity_management';
  currentTab.value = 'action_plan';
  addToast('Navigated to Action Plan', `Viewing organization activities submitted under ${fiscalYear}.`, 'info');
};

const pendingApprovalCount = computed(
  () => {
    if (!currentUser.value) return 0;
    return activities.value.filter((a) => 
      (a.status === 'Pending' || a.status === 'Under Review' || a.status === 'Needs Approval') && 
      isActivityVisibleForUser(a, currentUser.value, 'pending')
    ).length;
  }
);

// Landing Page display state (defaults to true if logged out)
const isLandingPageOpen = ref<boolean>(!authenticatedUser.value);

const handleCloseLanding = () => {
  if (!currentUser.value) {
    addToast('Sign In Required', 'Please sign in with an authorized account to enter the dashboard.', 'warning');
    return;
  }
  isLandingPageOpen.value = false;
};

const handleContinueAsUser = async (account: UserAccount) => {
  const cleanAccount = sanitizeUserAccount(account);
  const roleToUse = cleanAccount.activeRole || cleanAccount.role;
  authenticatedUser.value = {
    ...cleanAccount,
    role: roleToUse,
    activeRole: roleToUse
  };

  const targetModule = getInitialModule(authenticatedUser.value);
  currentModule.value = targetModule;
  currentTab.value = 'dashboard';
  currentApprovalTab.value = 'dashboard';
  currentAdminTab.value = 'dashboard';
  if (cleanAccount.orgId && cleanAccount.orgId !== 'ADMIN' && cleanAccount.orgId !== 'COLLEGE') {
    selectedOrgFilter.value = cleanAccount.orgId as OrgId;
  }
  isLandingPageOpen.value = false;

  const isAdmin = roleToUse === 'ROLE_ADMIN' || roleToUse === 'System Administrator';
  notificationService.connectStream();
  await syncFromBackendApi(isAdmin);
  await syncOptionsWithBackend();
  if (isAdmin) {
    const serverUsers = await fetchSanitizedUsersFromApi();
    if (serverUsers && serverUsers.length > 0) {
      userAccounts.value = serverUsers;
      try {
        localStorage.setItem('msun_user_accounts', JSON.stringify(serverUsers));
      } catch {}
    } else {
      try {
        const raw = localStorage.getItem('msun_user_accounts');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            userAccounts.value = parsed.map(sanitizeUserAccount);
          }
        }
      } catch {}
      if (userAccounts.value.length === 0) {
        userAccounts.value = INITIAL_USER_ACCOUNTS.map(sanitizeUserAccount);
      }
    }
  } else {
    try {
      const raw = localStorage.getItem('msun_user_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          userAccounts.value = parsed.map(sanitizeUserAccount);
        }
      }
    } catch {}
    if (userAccounts.value.length === 0) {
      userAccounts.value = INITIAL_USER_ACCOUNTS.map(sanitizeUserAccount);
    }
  }

  addToast('Session Activated', `Signed in as ${cleanAccount.name} (${formatRoleLabel(roleToUse)}).`, 'info');
};

const handleSwitchRole = async (newRole: UserRole) => {
  if (!currentUser.value) return;
  const assigned = getUserAssignedRoles(currentUser.value);
  if (!assigned.includes(newRole)) {
    addToast('Access Denied', `You are not assigned to the role: ${formatRoleLabel(newRole)}.`, 'warning');
    return;
  }

  const res = await switchSessionRole(newRole);
  if (!res.ok || !res.user) {
    addToast('Role Switch Failed', res.message || 'Unable to switch active role.', 'warning');
    return;
  }

  authenticatedUser.value = res.user;
  const idx = userAccounts.value.findIndex(u => u.id === res.user!.id);
  if (idx !== -1) {
    userAccounts.value[idx] = {
      ...userAccounts.value[idx],
      activeRole: newRole
    };
  }

  const targetModule = getInitialModule(res.user);
  currentModule.value = targetModule;
  currentTab.value = 'dashboard';
  currentApprovalTab.value = 'dashboard';
  currentAdminTab.value = 'dashboard';

  const isAdmin = newRole === 'ROLE_ADMIN' || newRole === 'System Administrator';
  await syncFromBackendApi(isAdmin);
  if (isAdmin) {
    const serverUsers = await fetchSanitizedUsersFromApi();
    if (serverUsers && serverUsers.length > 0) {
      userAccounts.value = serverUsers;
      try {
        localStorage.setItem('msun_user_accounts', JSON.stringify(serverUsers));
      } catch {}
    } else {
      try {
        const raw = localStorage.getItem('msun_user_accounts');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            userAccounts.value = parsed.map(sanitizeUserAccount);
          }
        }
      } catch {}
      if (userAccounts.value.length === 0) {
        userAccounts.value = INITIAL_USER_ACCOUNTS.map(sanitizeUserAccount);
      }
    }
  } else {
    try {
      const raw = localStorage.getItem('msun_user_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          userAccounts.value = parsed.map(sanitizeUserAccount);
        }
      }
    } catch {}
    if (userAccounts.value.length === 0) {
      userAccounts.value = INITIAL_USER_ACCOUNTS.map(sanitizeUserAccount);
    }
  }

  addToast(
    'Role Switched',
    `Switched active role to ${formatRoleLabel(newRole)}. Workspace refreshed.`,
    'success'
  );
};

// Profile Settings Modal state (Images 3, 4, 5)
const isProfileModalOpen = ref(false);

const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => {
  if (!currentUser.value) return;
  const candidate = sanitizeUserAccount({
    ...currentUser.value,
    ...updatedData
  });

  const res = await updateUserAccountApi(candidate);
  if (!res.ok || !res.user) {
    addToast('Profile Update Failed', res.message || 'Could not update profile.', 'warning');
    return;
  }

  authenticatedUser.value = {
    ...res.user,
    role: currentUser.value.role,
    activeRole: currentUser.value.activeRole
  };

  const idx = userAccounts.value.findIndex(u => u.id === res.user!.id);
  if (idx !== -1) {
    userAccounts.value[idx] = res.user;
  }

  if (res.user.orgId && res.user.orgId !== 'ADMIN' && res.user.orgId !== 'COLLEGE') {
    selectedOrgFilter.value = res.user.orgId as OrgId;
  }

  addToast('Profile Updated', 'Your profile details and preferences were saved successfully.', 'success');
};

const handleLogout = async () => {
  isProfileModalOpen.value = false;
  isLogoutPromptOpen.value = false;
  notificationService.disconnectStream();
  await logoutSession();
  authenticatedUser.value = null;
  userAccounts.value = INITIAL_USER_ACCOUNTS.map(sanitizeUserAccount);
  try {
    localStorage.removeItem('msun_action_plan_activities');
    localStorage.removeItem('msun_student_organizations');
  } catch (e) {
    // ignore
  }
  isLandingPageOpen.value = true;
  addToast('Logged Out', 'You have been safely signed out and returned to the landing page.', 'info');
};

// Logout confirmation prompt state when clicking browser back button after signing in
const isLogoutPromptOpen = ref(false);

const pushAppSessionHistory = () => {
  if (typeof window === 'undefined') return;
  try {
    if (!window.history.state || !window.history.state.msunSession) {
      window.history.pushState({ msunSession: true, timestamp: Date.now() }, '', window.location.href);
    }
  } catch (e) {
    // ignore
  }
};

// Watch for authentication state: ensure session history entry is pushed right after signing in
watch(
  () => [currentUser.value, isLandingPageOpen.value],
  ([user, isLanding]) => {
    if (user && !isLanding) {
      pushAppSessionHistory();
    }
  }
);

const handlePopState = (e: PopStateEvent) => {
  // Whenever the user clicks to go back after signing in
  if (currentUser.value && !isLandingPageOpen.value) {
    // Re-push history entry so the browser doesn't exit the application page
    try {
      window.history.pushState({ msunSession: true, timestamp: Date.now() }, '', window.location.href);
    } catch (err) {
      // ignore
    }
    // Prompt the user: "Do you want to logout?"
    isLogoutPromptOpen.value = true;
  }
};

const handleCancelLogoutPrompt = () => {
  isLogoutPromptOpen.value = false;
  pushAppSessionHistory();
};

const handleConfirmLogoutPrompt = () => {
  isLogoutPromptOpen.value = false;
  handleLogout();
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isLogoutPromptOpen.value) {
    handleCancelLogoutPrompt();
  }
};

const handleOpenLandingRequested = () => {
  if (currentUser.value) {
    isLogoutPromptOpen.value = true;
  } else {
    isLandingPageOpen.value = true;
  }
};
</script>

<template>
  <div class="h-full w-full bg-[#F1F4FA] flex flex-col text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900" :class="{ 'overflow-hidden': currentUser && !isLandingPageOpen }">
    
    <!-- Landing Page -->
    <LandingPageView
      v-if="isLandingPageOpen || !currentUser"
      :current-user="currentUser"
      :user-accounts="userAccounts"
      @continue-as-user="handleContinueAsUser"
      @close-landing="handleCloseLanding"
    />

    <!-- Main Workspace Application when Landing Page is closed and user is authenticated -->
    <div v-else-if="currentUser" class="fixed inset-0 h-screen w-screen overflow-hidden flex flex-col bg-[#F1F4FA]">
      <!-- Global Application Header -->
      <Header
        class="shrink-0 z-40"
        :current-module="currentModule"
        :pending-approval-count="pendingApprovalCount"
        :is-sidebar-open="isSidebarOpen"
        :current-user="currentUser"
        :user-accounts="userAccounts"
        @select-module="handleSelectModule"
        @toggle-sidebar="isSidebarOpen = !isSidebarOpen"
        @quick-add-activity="isAddActivityOpen = true"
        @switch-role="handleSwitchRole"
        @logout="handleLogout"
        @open-landing="handleOpenLandingRequested"
        @open-profile="isProfileModalOpen = true"
        @open-activity="handleOpenActivityFromNotification"
        @open-email-inbox="handleOpenEmailInbox"
      />

      <!-- Main Layout Area (Screen Docked Layout) -->
      <div class="flex-1 flex flex-row w-full min-w-0 min-h-0 overflow-hidden bg-[#F1F4FA] relative">
      
      <!-- Mobile Backdrop for Sidebar Drawer -->
      <div
        v-if="isSidebarOpen"
        @click="isSidebarOpen = false"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-25 lg:hidden"
      ></div>

      <!-- Collapsible SPA Sidebar when inside Activity Management module -->
      <Sidebar
        v-if="currentModule === 'activity_management'"
        :is-open="isSidebarOpen"
        :current-tab="currentTab"
        :selected-org-filter="selectedOrgFilter"
        :activities-count="scopedActivitiesCount"
        :action-plan-count="scopedActionPlanCount"
        :fiscal-year="importTargetFiscalYear"
        @select-tab="(tab) => { currentTab = tab; if (typeof window !== 'undefined' && window.innerWidth < 1024) isSidebarOpen = false; }"
        @select-org-filter="(org) => selectedOrgFilter = org"
        @close="isSidebarOpen = false"
      />

      <!-- Collapsible SPA Sidebar when inside Approval Management module -->
      <ApprovalSidebar
        v-else-if="currentModule === 'approval_management'"
        :is-open="isSidebarOpen"
        :current-tab="currentApprovalTab"
        :pending-approvals-count="pendingApprovalCount"
        :total-plans-count="actionPlanFolders.length"
        @select-tab="(tab) => { currentApprovalTab = tab; if (typeof window !== 'undefined' && window.innerWidth < 1024) isSidebarOpen = false; }"
        @close="isSidebarOpen = false"
      />

      <!-- Collapsible SPA Sidebar when inside System Administrator module -->
      <AdminSidebar
        v-else-if="currentModule === 'system_admin'"
        :is-open="isSidebarOpen"
        :current-tab="currentAdminTab"
        :accounts-count="userAccounts.length"
        :action-plans-count="importedActionPlansCountForActiveYear"
        :fiscal-year="activeAdminFiscalYear"
        @select-tab="(tab) => { currentAdminTab = tab; if (typeof window !== 'undefined' && window.innerWidth < 1024) isSidebarOpen = false; }"
        @close="isSidebarOpen = false"
      />

      <!-- Dynamic Content Workspace -->
      <main class="flex-1 min-w-0 h-full overflow-y-auto p-3 sm:p-6 lg:p-8 pb-12 sm:pb-16 bg-[#F1F4FA] touch-scroll">
        <template v-if="currentModule === 'activity_management'">
          <DashboardView
            v-if="currentTab === 'dashboard'"
            :activities="activities"
            :selected-org-filter="selectedOrgFilter"
            @download-calendar="handleDownloadCalendar"
            @select-activity="handleOpenActivityModal"
            @navigate-to-tab="(tab) => currentTab = tab"
          />

          <ActionPlanView
            v-else-if="currentTab === 'action_plan'"
            :activities="activities"
            :selected-org-filter="selectedOrgFilter"
            :current-user="currentUser"
            :fiscal-year="importTargetFiscalYear"
            @add-activity-click="isAddActivityOpen = true"
            @import-click="(fy) => { if (fy && typeof fy === 'string') importTargetFiscalYear = fy; isImportOpen = true; }"
            @select-activity="handleOpenActivityModal"
            @toggle-status="handleToggleStatus"
            @select-org-filter="(org) => selectedOrgFilter = org"
            @update-activity="handleUpdateActivity"
            @updateActivity="handleUpdateActivity"
            @batch-update-activities="handleBatchSaveActivities"
            @batchUpdateActivities="handleBatchSaveActivities"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <ActivityView
            v-else-if="currentTab === 'activity'"
            :activities="activities"
            :selected-org-filter="selectedOrgFilter"
            :current-user="currentUser"
            :fiscal-year="importTargetFiscalYear"
            @select-org-filter="(org) => selectedOrgFilter = org"
            @open-calendar-modal="isCalendarModalOpen = true"
            @add-activity-click="isAddActivityOpen = true"
            @select-activity="handleOpenActivityModal"
            @toggle-status="handleToggleStatus"
          />

          <FinancialView
            v-else-if="currentTab === 'financial'"
            :activities="activities"
            @select-activity="handleOpenActivityModal"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <OrganizationsView
            v-else-if="currentTab === 'organizations'"
            :activities="activities"
            :current-user="currentUser"
            @select-org="handleSelectOrgFilterFromView"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />
        </template>

        <template v-else-if="currentModule === 'approval_management'">
          <!-- 1. Approval Dashboard (Summary of pending activities requiring approval, calendar schedule) -->
          <ApprovalDashboardView
            v-if="currentApprovalTab === 'dashboard'"
            :activities="activities"
            :current-user="currentUser"
            @download-calendar="handleDownloadCalendar"
            @open-calendar-modal="isCalendarModalOpen = true"
            @select-activity="handleOpenActivityModal"
            @toggle-status="handleToggleStatus"
            @navigate-to-tab="(tab) => currentApprovalTab = tab"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 2. Plans & Approvals (Beginner-friendly, list of all action plans, activities to approve, approval timeline) -->
          <PlansApprovalsView
            v-else-if="currentApprovalTab === 'plans_approvals'"
            :activities="activities"
            :action-plans="actionPlanFolders"
            :current-user="currentUser"
            :user-accounts="userAccounts"
            @toggle-status="handleToggleStatus"
            @update-activity="handleUpdateActivity"
            @select-activity="handleOpenActivityModal"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 3. Financial (Track budgets, expenses, and financial reports across all organizations - Same as Activity Management Financial View) -->
          <FinancialView
            v-else-if="currentApprovalTab === 'financial'"
            :activities="activities"
            @select-activity="handleOpenActivityModal"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 4. Organizations (Manage and monitor all student organizations at MSUN - Same as Activity Management Organizations View) -->
          <OrganizationsView
            v-else-if="currentApprovalTab === 'organizations'"
            :activities="activities"
            :current-user="currentUser"
            @select-org="handleSelectOrgFilterFromView"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />
        </template>

        <template v-else-if="currentModule === 'system_admin'">
          <!-- 1. Admin Dashboard (Same as Activity Management Dashboard View) -->
          <DashboardView
            v-if="currentAdminTab === 'dashboard'"
            :activities="activities"
            :selected-org-filter="'ALL'"
            @download-calendar="handleDownloadCalendar"
            @select-activity="handleOpenActivityModal"
            @navigate-to-tab="(tab) => currentAdminTab = (tab === 'organizations' ? 'organizations' : (tab === 'action_plan' ? 'action_plan' : 'dashboard'))"
          />

          <!-- 2. Accounts View (Manage user accounts, roles, permissions, create, search, view, edit, deactivate) -->
          <AccountsView
            v-else-if="currentAdminTab === 'accounts'"
            :accounts="userAccounts"
            :activities="activities"
            @create-account="handleCreateAccount"
            @update-account="handleUpdateAccount"
            @toggle-account-status="handleToggleAccountStatus"
            @ensure-osd-account="handleEnsureOsdAccounts"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 3. Action Plan View (Manage Institutional Strategic Initiatives, Create fiscal year folder, list all action plans) -->
          <AdminActionPlanView
            v-else-if="currentAdminTab === 'action_plan'"
            :folders="actionPlanFolders"
            :activities="activities"
            :active-fiscal-year="activeAdminFiscalYear"
            @select-fiscal-year="(fy) => { activeAdminFiscalYear = fy; importTargetFiscalYear = fy; }"
            @create-folder="handleCreateFolder"
            @select-activity="handleOpenActivityModal"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 4. Organizations View (Same as Activity Management Organizations View, but with Manage button enabled) -->
          <OrganizationsView
            v-else-if="currentAdminTab === 'organizations'"
            :activities="activities"
            :current-user="currentUser"
            :show-manage-button="true"
            @select-org="handleSelectOrgFilterFromView"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 5. Options Management View (System Dropdown & Options Configuration) -->
          <OptionsManagementView
            v-else-if="currentAdminTab === 'options'"
            :activities="activities"
            :organizations="organizations"
            :current-user="currentUser"
          />
        </template>
      </main>
    </div>

    <!-- MODALS -->
    
    <!-- 1. Add Activity Modal (Don Norman Constraints & Form Feedback) -->
    <AddActivityModal
      :is-open="isAddActivityOpen"
      :default-org-id="selectedOrgFilter"
      :current-user="currentUser"
      :all-activities="activities"
      @close="isAddActivityOpen = false"
      @add-activity="handleAddActivity"
    />

    <!-- 2. Import Excel Modal (.xlsx Constraint & Affordance) -->
    <ImportExcelModal
      :is-open="isImportOpen"
      :default-org-id="currentUser?.orgId || (selectedOrgFilter !== 'ALL' ? selectedOrgFilter : 'SENSSO')"
      :fiscal-year="importTargetFiscalYear"
      @close="isImportOpen = false"
      @import-activities="handleImportActivities"
    />

    <!-- 3. Activity Full Details & Approval Modal -->
    <ActivityDetailsModal
      :activity="selectedActivityForModal"
      :current-module="currentModule"
      :current-user="currentUser"
      :user-accounts="userAccounts"
      :all-activities="activities"
      @close="selectedActivityForModal = null"
      @toggle-status="handleToggleStatus"
      @update-activity="handleUpdateActivity"
      @show-toast="(title, msg, type) => addToast(title, msg, type)"
    />

    <!-- 4. Calendar Feature Modal -->
    <CalendarModal
      :is-open="isCalendarModalOpen"
      :activities="activities"
      :current-user="currentUser"
      @close="isCalendarModalOpen = false"
      @select-activity="(act) => selectedActivityForModal = act"
      @download-calendar="handleDownloadCalendar"
    />


    <!-- 6. Profile Settings Modal (Images 3, 4, 5) -->
    <ProfileSettingsModal
      :is-open="isProfileModalOpen"
      :current-user="currentUser"
      @close="isProfileModalOpen = false"
      @logout="handleLogout"
      @update-profile="handleUpdateProfile"
      @switch-role="handleSwitchRole"
    />

    <!-- 6b. Official MSUN Email Inbox Modal (Referred directly to system on click) -->
    <EmailInboxModal
      v-if="isEmailInboxOpen"
      :emails="emailsList"
      :current-user="currentUser"
      :selected-email-id="selectedEmailIdForModal"
      @close="isEmailInboxOpen = false"
      @mark-email-as-read="notificationService.markEmailAsRead($event); refreshEmails()"
      @refer-to-activity="handleReferToActivityFromEmail"
      @simulate-approval-email="handleSimulateApprovalEmail"
    />

    <!-- 7. Logout Confirmation Prompt Modal (Whenever user clicks to go back after signing in) -->
    <div
      v-if="isLogoutPromptOpen"
      class="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click.self="handleCancelLogoutPrompt"
    >
      <div
        class="bg-white rounded-3xl max-w-md w-full border border-slate-200/90 shadow-2xl p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150 relative text-left"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-prompt-title"
        aria-describedby="logout-prompt-desc"
      >
        <!-- Top Close (X) button -->
        <button
          type="button"
          @click="handleCancelLogoutPrompt"
          class="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Stay Signed In"
          aria-label="Close"
        >
          <X class="w-5 h-5" />
        </button>

        <div class="flex items-start gap-4">
          <!-- Amber/Rose Warning Icon badge -->
          <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <LogOut class="w-6 h-6 stroke-[2.2]" />
          </div>

          <div class="flex-1 min-w-0 pr-4">
            <!-- Exact title requested by user -->
            <h3 id="logout-prompt-title" class="text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight leading-snug">
              Do you want to logout?
            </h3>
            <p id="logout-prompt-desc" class="text-xs sm:text-sm text-slate-600 font-medium mt-1.5 leading-relaxed">
              You clicked to go back. Are you sure you want to end your current session and return to the sign-in page?
            </p>
          </div>
        </div>

        <!-- Active User Details Badge -->
        <div v-if="currentUser" class="mt-4.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {{ currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U' }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-xs font-extrabold text-slate-900 truncate">{{ currentUser.name }}</div>
            <div class="text-[11px] text-slate-500 font-medium truncate">
              {{ formatUserRole(currentUser) }} &bull; {{ currentUser.orgName || currentUser.orgId || 'MSUN' }}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            id="cancel-logout-prompt-btn"
            @click="handleCancelLogoutPrompt"
            class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-logout-prompt-btn"
            @click="handleConfirmLogoutPrompt"
            class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <LogOut class="w-4 h-4" />
            <span>Yes, Logout</span>
          </button>
        </div>
      </div>
    </div>
    </div>

    <!-- Floating Immediate Feedback Toasts -->
    <ToastContainer :toasts="toasts" @dismiss="removeToast" />
  </div>
</template>
