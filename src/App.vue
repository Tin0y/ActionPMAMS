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
  INITIAL_ORGANIZATIONS,
  isActivityVisibleForUser,
  isCollegeOrg,
  getWorkflowTimelineForOrg,
  getInitialTimelineForActionPlan
} from './data/initialData';
import { isSameOrg, getUserAssignedRoles, formatRoleLabel } from './utils/organizationUtils';
import { isActivityEligibleForActivityView, isActionPlanActivityApproved, isActivityRejectedStatus } from './utils/activityVisibility';
import { resolveActivityDates } from './utils/activityDate';
import { exportActionPlanToPdf } from './utils/actionPlanReports';
import {
  initializeDatabaseCollections,
  getFiscalYears,
  subscribeToActivities,
  subscribeToUserAccounts,
  subscribeToActionPlanFolders,
  subscribeToOrganizations,
  saveActivityToDb,
  deleteActivityFromDb,
  batchSaveActivitiesToDb,
  writeAllActivitiesToDb,
  saveUserAccountToDb,
  saveActionPlanFolderToDb,
  deleteActionPlanFolderFromDb,
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
  sanitizeUserAccount,
  isCustomAvatarUrl
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
import { LogOut, X, User } from 'lucide-vue-next';

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
const CURRENT_APP_VERSION = 'v2026.11.26_clean_cache';
try {
  localStorage.removeItem('msun_active_user_id');
  if (localStorage.getItem('msun_data_version') !== CURRENT_APP_VERSION) {
    localStorage.removeItem('msun_user_accounts');
    localStorage.removeItem('msun_action_plan_activities');
    localStorage.removeItem('msun_activities');
    localStorage.removeItem('msun_student_organizations');
    localStorage.removeItem('msun_action_plan_folders');
    localStorage.removeItem('msun_fiscal_years');
    localStorage.removeItem('msun_action_plan_templates');
    localStorage.removeItem('msun_system_options');
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
const isCheckingSession = ref(true);

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

// Student Organizations state
const organizations = ref<StudentOrganization[]>(
  (() => {
    try {
      const raw = localStorage.getItem('msun_student_organizations');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return JSON.parse(JSON.stringify(INITIAL_ORGANIZATIONS));
  })()
);

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
  a.title = a.title || a.programActivity || 'Untitled Activity';
  a.orgId = (a.orgId || 'CBIT') as OrgId;
  a.venue = a.venue || a.designForm?.venue || 'MSU Naawan Campus';
  a.description = a.description || a.strategicObjectives || a.designForm?.rationale || '';
  a.proposedBy = a.proposedBy || a.personAssigned || a.designForm?.preparedByName || `${a.orgId} Officer`;
  a.budget = Number(a.budget ?? a.amount ?? 0);
  const resolvedDates = resolveActivityDates(a);
  a.startDate = resolvedDates.startDate;
  a.endDate = resolvedDates.endDate;
  (a as any).date = resolvedDates.startDate;
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
  if (!a.approvalStatus || a.approvalStatus === 'Draft') {
    a.approvalStatus = 'Pending Review';
  }

  // Ensure proper active step in timeline if missing
  if (!a.timeline || a.timeline.length === 0) {
    a.timeline = getWorkflowTimelineForOrg(a.orgId, true);
  }

  // Dynamically synchronize active approvalStageIndex and role from timeline
  const inProgressStep = a.timeline.find(s => s.status === 'in_progress');
  if (inProgressStep) {
    a.approvalStageIndex = inProgressStep.id;
    a.approvalStage = inProgressStep.title;
    a.currentApproverRole = inProgressStep.role;
  } else {
    const lastCompleted = [...a.timeline].reverse().find(s => s.status === 'completed');
    if (lastCompleted) {
      const nextId = Math.min(lastCompleted.id + 1, max);
      a.approvalStageIndex = nextId;
      const nextStep = a.timeline.find(s => s.id === nextId);
      if (nextStep) {
        a.approvalStage = nextStep.title;
        a.currentApproverRole = nextStep.role;
      }
    }
  }

  return a;
};

const getSavedActivities = (): Activity[] => {
  const normalizeList = (acts: Activity[]): Activity[] => acts.filter(a => !isSenssoFy2027Activity(a)).map(normalizeActivity);

  try {
    const saved = localStorage.getItem('msun_action_plan_activities');
    if (saved !== null) {
      const parsed: Activity[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return normalizeList(parsed);
      }
    }
  } catch (e) {
    // ignore
  }
  return normalizeList(INITIAL_ACTIVITIES);
};

const activities = ref<Activity[]>(getSavedActivities());

// Persist activities to localStorage with debounce so typing/form updates don't block the UI thread
let persistActivitiesTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  activities,
  (newVal) => {
    if (persistActivitiesTimer) clearTimeout(persistActivitiesTimer);
    persistActivitiesTimer = setTimeout(() => {
      try {
        const cleaned = newVal.filter(a => !isSenssoFy2027Activity(a));
        localStorage.setItem('msun_action_plan_activities', JSON.stringify(cleaned));
      } catch {
        // ignore
      }
    }, 350);
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
  const eligible = activities.value.filter(isActivityEligibleForActivityView);
  if (activeUserOrg.value) {
    return eligible.filter(a => isSameOrg(a.orgId, activeUserOrg.value)).length;
  }
  return eligible.length;
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
const activeAdminFiscalYear = ref('FY 2027');

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
let unsubOrgs: Unsubscribe | null = null;

const handleResize = () => {
  if (typeof window !== 'undefined' && window.innerWidth < 1024 && isSidebarOpen.value) {
    isSidebarOpen.value = false;
  }
};

onMounted(async () => {
  // 1. Validate server-side HttpOnly session cookie first
  let sessionUser: UserAccount | null = null;
  try {
    sessionUser = await fetchSessionUser();
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
  } finally {
    isCheckingSession.value = false;
  }

  // 2. Initialize collections
  await initializeDatabaseCollections();

  // Listen to live updates from backend sync & local storage
  unsubActivities = subscribeToActivities((data) => {
    activities.value = (data || []).filter(a => !isSenssoFy2027Activity(a)).map(normalizeActivity);
  });

  unsubUsers = subscribeToUserAccounts((data) => {
    if (Array.isArray(data) && data.length > 0) {
      userAccounts.value = data.map(sanitizeUserAccount);
    }
  });

  if (sessionUser) {
    const isAdmin = sessionUser.activeRole === 'ROLE_ADMIN' || sessionUser.role === 'ROLE_ADMIN' || sessionUser.role === 'System Administrator';
    notificationService.connectStream();
    await Promise.all([syncFromBackendApi(isAdmin), syncOptionsWithBackend()]);
    if (isAdmin && userAccounts.value.length === 0) {
      const serverUsers = await fetchSanitizedUsersFromApi();
      if (serverUsers && serverUsers.length > 0) {
        userAccounts.value = serverUsers;
        try {
          localStorage.setItem('msun_user_accounts', JSON.stringify(serverUsers));
        } catch {}
      }
    }

    // Ensure sessionUser's fresh database profile attributes (avatar, bio, role) are reflected in userAccounts
    const currentIdx = userAccounts.value.findIndex(
      u => u.id === sessionUser.id || u.email.toLowerCase() === sessionUser.email.toLowerCase()
    );
    if (currentIdx !== -1) {
      userAccounts.value[currentIdx] = {
        ...userAccounts.value[currentIdx],
        ...sessionUser
      };
    }
  }

  unsubFolders = subscribeToActionPlanFolders((data) => {
    if (Array.isArray(data)) {
      actionPlanFolders.value = data;
    }
  });

  unsubOrgs = subscribeToOrganizations((data) => {
    if (Array.isArray(data)) {
      organizations.value = data;
    }
  });

  // If user is already authenticated and inside workspace on load, prime history so Back button is active
  if (currentUser.value && !isLandingPageOpen.value) {
    pushAppSessionHistory();
  }

let lastFocusSyncAt = 0;
const handleRealtimeAlert = (e: Event) => {
  const customEvent = e as CustomEvent;
  const notif = customEvent.detail;
  if (!notif) return;

  addToast(
    `🔔 ${notif.title}`,
    notif.message,
    notif.type === 'APPROVAL' ? 'success' : notif.type === 'DEFERRAL' ? 'warning' : 'info'
  );

  if (currentUser.value) {
    const role = currentUser.value.activeRole || currentUser.value.role;
    const isAdmin = role === 'ROLE_ADMIN' || role === 'System Administrator';
    syncFromBackendApi(isAdmin).catch(() => {});
  }
};

const handleWindowFocusRefresh = () => {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (!currentUser.value) return;
  const now = Date.now();
  if (now - lastFocusSyncAt < 15000) return;
  lastFocusSyncAt = now;
  const role = currentUser.value.activeRole || currentUser.value.role;
  const isAdmin = role === 'ROLE_ADMIN' || role === 'System Administrator';
  syncFromBackendApi(isAdmin).catch(() => {});
  syncOptionsWithBackend().catch(() => {});
};

  window.addEventListener('resize', handleResize);
  window.addEventListener('msun-realtime-alert', handleRealtimeAlert);
  window.addEventListener('focus', handleWindowFocusRefresh);
  document.addEventListener('visibilitychange', handleWindowFocusRefresh);
  window.addEventListener('popstate', handlePopState);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  if (unsubActivities) unsubActivities();
  if (unsubUsers) unsubUsers();
  if (unsubFolders) unsubFolders();
  if (unsubOrgs) unsubOrgs();
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('msun-realtime-alert', handleRealtimeAlert);
  window.removeEventListener('focus', handleWindowFocusRefresh);
  document.removeEventListener('visibilitychange', handleWindowFocusRefresh);
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
  const cleanTitle = title.trim().toLowerCase().replace(/[^\w\s]/g, '');
  const cleanMsg = (message || '').trim().toLowerCase().replace(/[^\w\s]/g, '');

  // Prevent duplicate toast notifications within the active toast queue
  const isDuplicate = toasts.value.some((t) => {
    const existingTitle = t.title.trim().toLowerCase().replace(/[^\w\s]/g, '');
    const existingMsg = (t.message || '').trim().toLowerCase().replace(/[^\w\s]/g, '');

    // 1. Exact match on title and message
    if (existingTitle === cleanTitle && existingMsg === cleanMsg) return true;

    // 2. Matching title (e.g., duplicate "Account Deactivated" or "Account Activated")
    if (existingTitle === cleanTitle) return true;

    // 3. Same category match (e.g. account activation/deactivation, status updates)
    if (existingTitle.includes('account') && cleanTitle.includes('account')) return true;
    if (existingTitle.includes('status updated') && cleanTitle.includes('status updated')) return true;

    return false;
  });

  if (isDuplicate) {
    return;
  }

  // Cap max simultaneous toasts to 3 to keep UI uncluttered
  if (toasts.value.length >= 3) {
    toasts.value.shift();
  }

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
    console.error('[DB] Failed to save activity to PostgreSQL:', err);
    activities.value = activities.value.filter(a => a.id !== normalizedNew.id);
    addToast('Database Save Failed', err?.message || 'Could not save activity to PostgreSQL.', 'warning');
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
    console.error('[DB] Failed to save imported activities to database:', err);
    addToast('Database Import Error', err?.message || 'Could not persist imported activities to database.', 'warning');
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

  if (target.status === 'Approved' || target.workflowStatus === 'COMPLETED') {
    addToast(
      'Status Locked 🔒',
      `"${target.title}" is already approved and its status cannot be changed.`,
      'warning'
    );
    return;
  }

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
      console.error('[DB] Failed to update activity status:', err);
      addToast('Database Sync Error', err?.message || 'Could not update activity status.', 'warning');
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


const persistActivitiesCache = (list: Activity[]) => {
  try {
    const cleaned = list.filter(a => !isSenssoFy2027Activity(a));
    localStorage.setItem('msun_action_plan_activities', JSON.stringify(cleaned));
  } catch {
    // ignore
  }
};

const handleBatchSaveActivities = (batch: Activity[], skipBackendCrud = false, deletedIds: string[] = []) => {
  const normBatch = batch.map(normalizeActivity);
  const deletedSet = new Set(
    (deletedIds || []).filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
  );
  const map = new Map<string, Activity>();
  activities.value.forEach(a => {
    if (!deletedSet.has(a.id)) {
      map.set(a.id, a);
    }
  });
  normBatch.forEach(a => map.set(a.id, a));
  activities.value = Array.from(map.values());
  persistActivitiesCache(activities.value);
  if (!skipBackendCrud) {
    batchSaveActivitiesToDb(normBatch, Array.from(deletedSet)).catch(err => {
      console.error('[DB] Failed to batch save activities:', err);
      addToast('Database Save Error', err?.message || 'Could not batch save Action Plan activities.', 'warning');
    });
  }
};

const handleDeleteActivity = (activityId: string) => {
  if (!activityId) return;
  const previous = [...activities.value];
  activities.value = activities.value.filter(a => a.id !== activityId);
  if (selectedActivityForModal.value?.id === activityId) {
    selectedActivityForModal.value = null;
  }
  persistActivitiesCache(activities.value);
  deleteActivityFromDb(activityId).catch(err => {
    activities.value = previous;
    persistActivitiesCache(activities.value);
    console.error('[DB] Failed to delete activity:', err);
    addToast('Database Delete Error', err?.message || 'Could not delete activity from database.', 'warning');
  });
};

const handleUpdateActivity = (updated: Activity, skipBackendCrud = false) => {
  const norm = normalizeActivity(updated);
  const exists = activities.value.some((act) => act.id === norm.id);
  activities.value = exists
    ? activities.value.map((act) => (act.id === norm.id ? norm : act))
    : [norm, ...activities.value];
  if (selectedActivityForModal.value?.id === norm.id) {
    selectedActivityForModal.value = norm;
  }
  persistActivitiesCache(activities.value);
  if (!skipBackendCrud) {
    saveActivityToDb(norm).catch((err) => {
      console.error('[DB] Failed to update activity:', err);
      addToast('Database Sync Error', err?.message || 'Could not save activity changes to database.', 'warning');
    });
  }
};

const handleOpenActivityModal = (act: Activity) => {
  selectedActivityForModal.value = act;
};

const handleDownloadCalendar = async (options?: {
  orgFilter?: OrgId | 'ALL';
  fiscalYear?: string;
  activities?: Activity[];
}) => {
  try {
    const fiscalYears = getFiscalYears();
    const activeFy = fiscalYears.find(f => f.status === 'Open' || f.isSubmissionActive) || fiscalYears[0];
    const targetFiscalYear =
      options?.fiscalYear ||
      activeFy?.name ||
      activeFy?.fiscalYear ||
      (currentModule.value === 'system_admin' ? activeAdminFiscalYear.value : importTargetFiscalYear.value) ||
      'FY 2027';

    const orgScope: OrgId | 'ALL' =
      options?.orgFilter ||
      (currentUser.value?.orgId && currentUser.value.orgId !== 'ADMIN' && currentUser.value.orgId !== 'COLLEGE'
        ? (currentUser.value.orgId as OrgId)
        : 'ALL');

    // Export strictly approved plan activities matching what is reflected in the calendar
    const rawSource = Array.isArray(options?.activities)
      ? options.activities
      : activities.value.filter(act => orgScope === 'ALL' || isSameOrg(act.orgId, orgScope));
    const exportList = rawSource.filter(act => Boolean(act) && !isActivityRejectedStatus(act) && isActionPlanActivityApproved(act));

    if (exportList.length === 0) {
      addToast(
        'No Approved Plan Activities to Download',
        `No approved plan activities are reflected on the calendar${orgScope !== 'ALL' ? ` for ${orgScope}` : ''}.`,
        'warning'
      );
      return;
    }

    const matchedOrg =
      orgScope === 'ALL'
        ? null
        : organizations.value.find(o => isSameOrg(o.id, orgScope) || isSameOrg(o.acronym, orgScope));

    await exportActionPlanToPdf({
      reportType: 'calendar',
      orgName: orgScope === 'ALL' ? 'ALL' : (matchedOrg?.name || orgScope),
      orgId: orgScope,
      fiscalYear: targetFiscalYear,
      activities: exportList
    });

    addToast(
      'Calendar PDF Downloaded 📄',
      `Exported ${exportList.length} approved plan ${exportList.length === 1 ? 'activity' : 'activities'} reflected in the calendar (${targetFiscalYear}).`,
      'success'
    );
  } catch (err: any) {
    console.error('[FiscalYearPlanExport] Failed:', err);
    addToast('Download Failed', err?.message || 'Unable to generate Calendar PDF.', 'warning');
  }
};

const handleSelectOrgFilterFromView = (orgId: OrgId) => {
  selectedOrgFilter.value = orgId;
  currentTab.value = 'activity';
  addToast(`Filter Applied: ${orgId}`, `Now viewing activities for ${orgId}.`, 'info');
};

// Admin Account actions (persisted via authenticated bcrypt backend endpoints)
const isSavingAccount = ref(false);

const handleCreateAccount = async (
  newAcc: Omit<UserAccount, 'id' | 'createdDate'>,
  plainPassword: string
) => {
  const newId = `usr-${Date.now().toString(36)}`;
  const todayStr = new Date().toISOString().split('T')[0];
  const account: UserAccount = sanitizeUserAccount({
    ...newAcc,
    id: newId,
    createdDate: todayStr,
    lastActive: 'Just now'
  });

  isSavingAccount.value = true;
  try {
    const res = await createUserAccountApi(account, plainPassword);
    if (!res.ok || !res.user) {
      addToast('Account Creation Failed', res.message || 'Unable to create user account in PostgreSQL.', 'error');
      return;
    }
    const createdUser: UserAccount = {
      ...res.user,
      createdDate: res.user.createdDate || todayStr
    };

    userAccounts.value.unshift(createdUser);
    try {
      localStorage.setItem('msun_user_accounts', JSON.stringify(userAccounts.value));
    } catch {}
    addToast(
      'Account Created',
      `User account for "${createdUser.name}" (${createdUser.displayRole || createdUser.role}) was created with a bcrypt-hashed password.`,
      'success'
    );
  } finally {
    isSavingAccount.value = false;
  }
};

const handleUpdateAccount = async (updatedAcc: UserAccount, resetPassword?: string) => {
  isSavingAccount.value = true;
  try {
    const res = await updateUserAccountApi(
      sanitizeUserAccount(updatedAcc),
      resetPassword ? { newPassword: resetPassword, mustChangePassword: true } : undefined
    );
    if (!res.ok) {
      addToast('Update Failed', res.message || 'Failed to update user account.', 'error');
      return;
    }
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
      try {
        localStorage.setItem('msun_active_session_user', JSON.stringify(authenticatedUser.value));
      } catch {}
    }
    addToast(
      resetPassword ? 'Account & Password Reset' : 'Account Updated',
      resetPassword
        ? `Details and password hash for ${effectiveUser.name} have been updated.`
        : `Details for ${effectiveUser.name} have been saved.`,
      'success'
    );
  } finally {
    isSavingAccount.value = false;
  }
};

const handleToggleAccountStatus = async (accountId: string) => {
  const acc = userAccounts.value.find(a => a.id === accountId);
  if (!acc) return;

  const targetStatus = !acc.isActive;
  const res = await updateUserAccountApi({ ...acc, isActive: targetStatus });
  if (!res.ok) {
    addToast('Status Update Failed', res.message || 'Failed to update account status.', 'error');
    return;
  }
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
const handleCreateFolder = async (folderData: Omit<ActionPlanFolder, 'id' | 'createdAt' | 'totalActivitiesCount' | 'approvedCount' | 'pendingCount'>) => {
  const prevFolders = [...actionPlanFolders.value];
  const prevActiveFy = activeAdminFiscalYear.value;
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
  try {
    await saveActionPlanFolderToDb(newFolder);
    addToast('Action Plan Folder Created', `Institutional repository for ${newFolder.fiscalYear} created successfully.`, 'success');
  } catch (err: any) {
    actionPlanFolders.value = prevFolders;
    activeAdminFiscalYear.value = prevActiveFy;
    importTargetFiscalYear.value = prevActiveFy;
    addToast('Database Save Error', err?.message || `Failed to save Action Plan folder for ${newFolder.fiscalYear}.`, 'warning');
  }
};

const handleDeleteFolder = async (fiscalYearOrId: string) => {
  const prevFolders = [...actionPlanFolders.value];
  const prevActiveFy = activeAdminFiscalYear.value;
  actionPlanFolders.value = actionPlanFolders.value.filter(
    (f) => f.fiscalYear !== fiscalYearOrId && f.id !== fiscalYearOrId && f.id !== `AP-${fiscalYearOrId.replace(/\s+/g, '')}`
  );
  if (activeAdminFiscalYear.value === fiscalYearOrId) {
    activeAdminFiscalYear.value = actionPlanFolders.value[0]?.fiscalYear || 'FY 2027';
    importTargetFiscalYear.value = activeAdminFiscalYear.value;
  }
  try {
    await deleteActionPlanFolderFromDb(fiscalYearOrId);
    addToast('Action Plan Folder Deleted', `Removed Action Plan folder "${fiscalYearOrId}".`, 'info');
  } catch (err: any) {
    actionPlanFolders.value = prevFolders;
    activeAdminFiscalYear.value = prevActiveFy;
    importTargetFiscalYear.value = prevActiveFy;
    addToast('Delete Failed', err?.message || `Unable to delete Action Plan folder "${fiscalYearOrId}".`, 'warning');
  }
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
      Boolean(a.designForm?.isCompleted) &&
      (
        a.status === 'Pending' ||
        a.status === 'IN_REVIEW' ||
        a.status === 'Under Review' ||
        a.status === 'SUBMITTED' ||
        a.status === 'Accomplishment Submitted' ||
        a.status === 'Needs Approval' ||
        a.approvalStatus === 'Pending Review' ||
        a.approvalStatus === 'Approved at Current Stage' ||
        Boolean(a.accomplishmentForm?.isCompleted)
      ) &&
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
  const effectiveUser = sanitizeUserAccount(account);
  const roleToUse = effectiveUser.activeRole || effectiveUser.role;
  authenticatedUser.value = {
    ...effectiveUser,
    role: roleToUse,
    activeRole: roleToUse
  };

  const targetModule = getInitialModule(authenticatedUser.value);
  currentModule.value = targetModule;
  currentTab.value = 'dashboard';
  currentApprovalTab.value = 'dashboard';
  currentAdminTab.value = 'dashboard';

  const userIdx = userAccounts.value.findIndex(u => u.id === effectiveUser.id);
  if (userIdx !== -1) {
    userAccounts.value[userIdx] = effectiveUser;
  }
  try {
    localStorage.setItem('msun_user_accounts', JSON.stringify(userAccounts.value));
    localStorage.setItem('msun_active_session_user', JSON.stringify(authenticatedUser.value));
  } catch {}
  if (effectiveUser.orgId && effectiveUser.orgId !== 'ADMIN' && effectiveUser.orgId !== 'COLLEGE') {
    selectedOrgFilter.value = effectiveUser.orgId as OrgId;
  }
  isLandingPageOpen.value = false;

  const isAdmin = roleToUse === 'ROLE_ADMIN' || roleToUse === 'System Administrator';
  notificationService.connectStream();
  addToast('Session Activated', `Signed in as ${effectiveUser.name} (${formatRoleLabel(roleToUse)}).`, 'info');

  await Promise.all([syncFromBackendApi(isAdmin), syncOptionsWithBackend()]);

  try {
    const rawOrgs = localStorage.getItem('msun_student_organizations');
    if (!rawOrgs || rawOrgs === '[]') {
      const seed = (INITIAL_ORGANIZATIONS && INITIAL_ORGANIZATIONS.length > 0) ? INITIAL_ORGANIZATIONS : ORGANIZATIONS;
      localStorage.setItem('msun_student_organizations', JSON.stringify(seed));
      organizations.value = seed;
    }
  } catch {}
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
const isSavingProfile = ref(false);

const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => {
  if (!currentUser.value) return;
  isSavingProfile.value = true;
  try {
    const candidate = sanitizeUserAccount({
      ...currentUser.value,
      ...updatedData
    });

    const res = await updateUserAccountApi(candidate);
    if (!res.ok || !res.user) {
      addToast('Profile Update Failed', res.message || 'Unable to save profile changes to the database.', 'error');
      return;
    }

    const updatedSessionUser: UserAccount = {
      ...res.user,
      role: currentUser.value.role,
      activeRole: currentUser.value.activeRole
    };
    authenticatedUser.value = updatedSessionUser;

    const idx = userAccounts.value.findIndex(u => u.id === res.user!.id);
    if (idx !== -1) {
      userAccounts.value[idx] = res.user;
    } else {
      userAccounts.value.unshift(res.user);
    }

    try {
      localStorage.setItem('msun_active_session_user', JSON.stringify(updatedSessionUser));
    } catch {}
    try {
      localStorage.setItem('msun_user_accounts', JSON.stringify(userAccounts.value));
    } catch {}

    if (res.user.orgId && res.user.orgId !== 'ADMIN' && res.user.orgId !== 'COLLEGE') {
      selectedOrgFilter.value = res.user.orgId as OrgId;
    }

    const title = updatedData.avatar === ''
      ? 'Default Picture Restored'
      : updatedData.avatar !== undefined && updatedData.bio === undefined
        ? 'Profile Picture Saved'
        : 'Profile Updated';
    addToast(title, 'Your profile details were saved successfully.', 'success');
  } finally {
    isSavingProfile.value = false;
  }
};

const handleLogout = async () => {
  isProfileModalOpen.value = false;
  isLogoutPromptOpen.value = false;
  notificationService.disconnectStream();
  await logoutSession();
  authenticatedUser.value = null;
  try {
    const raw = localStorage.getItem('msun_user_accounts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        userAccounts.value = parsed.map(sanitizeUserAccount);
      }
    }
  } catch {}
  try {
    localStorage.removeItem('msun_action_plan_activities');
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
    
    <!-- Session Hydration Splash (prevents brief flash of landing page on refresh) -->
    <div
      v-if="isCheckingSession"
      class="fixed inset-0 flex flex-col items-center justify-center bg-[#F1F4FA] text-slate-700 z-50"
    >
      <div class="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p class="text-xs font-bold tracking-wide text-slate-600">Restoring session...</p>
    </div>

    <!-- Landing Page -->
    <LandingPageView
      v-else-if="isLandingPageOpen || !currentUser"
      :current-user="currentUser"
      :user-accounts="userAccounts"
      @continue-as-user="handleContinueAsUser"
      @close-landing="handleCloseLanding"
    />

    <!-- Main Workspace Application when Landing Page is closed and user is authenticated -->
    <div v-else-if="currentUser" class="fixed inset-0 h-screen supports-[height:100dvh]:h-dvh w-full max-w-full overflow-hidden flex flex-col bg-[#F1F4FA]">
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
        :activities-count="scopedActivitiesCount"
        :action-plans-count="importedActionPlansCountForActiveYear"
        :fiscal-year="activeAdminFiscalYear"
        @select-tab="(tab) => { currentAdminTab = tab; if (typeof window !== 'undefined' && window.innerWidth < 1024) isSidebarOpen = false; }"
        @close="isSidebarOpen = false"
      />

      <!-- Dynamic Content Workspace -->
      <main class="flex-1 min-w-0 max-w-full h-full overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 pb-12 sm:pb-16 bg-[#F1F4FA] touch-scroll">
        <template v-if="currentModule === 'activity_management'">
          <DashboardView
            v-if="currentTab === 'dashboard'"
            :activities="activities"
            :organizations="organizations"
            :selected-org-filter="selectedOrgFilter"
            :current-user="currentUser"
            :hide-view-all="false"
            @download-calendar="handleDownloadCalendar"
            @select-activity="handleOpenActivityModal"
            @navigate-to-tab="(tab) => currentTab = tab"
          />

          <ActionPlanView
            v-else-if="currentTab === 'action_plan'"
            :activities="activities"
            :organizations="organizations"
            :folders="actionPlanFolders"
            :selected-org-filter="selectedOrgFilter"
            :current-user="currentUser"
            :fiscal-year="importTargetFiscalYear"
            @add-activity-click="isAddActivityOpen = true"
            @import-click="(fy) => { if (fy && typeof fy === 'string') importTargetFiscalYear = fy; isImportOpen = true; }"
            @select-activity="handleOpenActivityModal"
            @toggle-status="handleToggleStatus"
            @select-org-filter="(org) => selectedOrgFilter = org"
            @update-activity="handleUpdateActivity"
            @batch-update-activities="handleBatchSaveActivities"
            @delete-activity="handleDeleteActivity"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <ActivityView
            v-else-if="currentTab === 'activity'"
            :activities="activities"
            :organizations="organizations"
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
            :organizations="organizations"
            @select-activity="handleOpenActivityModal"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <OrganizationsView
            v-else-if="currentTab === 'organizations'"
            :activities="activities"
            :organizations="organizations"
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
            :organizations="organizations"
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
            :organizations="organizations"
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
            :organizations="organizations"
            @select-activity="handleOpenActivityModal"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 4. Organizations (Manage and monitor all student organizations at MSUN - Same as Activity Management Organizations View) -->
          <OrganizationsView
            v-else-if="currentApprovalTab === 'organizations'"
            :activities="activities"
            :organizations="organizations"
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
            :organizations="organizations"
            :selected-org-filter="'ALL'"
            :current-user="currentUser"
            :hide-view-all="true"
            @download-calendar="handleDownloadCalendar"
            @select-activity="handleOpenActivityModal"
          />

          <!-- 2. Accounts View (Manage user accounts, roles, permissions, create, search, view, edit, deactivate) -->
          <AccountsView
            v-else-if="currentAdminTab === 'accounts'"
            :accounts="userAccounts"
            :activities="activities"
            :organizations="organizations"
            :is-saving="isSavingAccount"
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
            :organizations="organizations"
            :active-fiscal-year="activeAdminFiscalYear"
            @select-fiscal-year="(fy) => { activeAdminFiscalYear = fy; importTargetFiscalYear = fy; }"
            @create-folder="handleCreateFolder"
            @delete-folder="handleDeleteFolder"
            @select-activity="handleOpenActivityModal"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 4. Organizations View (Same as Activity Management Organizations View, but with Manage button enabled) -->
          <OrganizationsView
            v-else-if="currentAdminTab === 'organizations'"
            :activities="activities"
            :organizations="organizations"
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
      :is-saving="isSavingProfile"
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
          <div class="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
            <img
              v-if="isCustomAvatarUrl(currentUser.avatar)"
              :src="currentUser.avatar"
              :alt="currentUser.name || 'User'"
              class="w-full h-full object-cover"
            />
            <User v-else class="w-4.5 h-4.5 text-white" />
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
