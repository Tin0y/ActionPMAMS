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
  ActionPlanFolder
} from './types';
import { 
  INITIAL_ACTIVITIES, 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_ACTION_PLAN_FOLDERS,
  ORGANIZATIONS,
  isActivityVisibleForUser,
  isCollegeOrg,
  getWorkflowTimelineForOrg
} from './data/initialData';
import {
  initializeDatabaseCollections,
  subscribeToActivities,
  subscribeToUserAccounts,
  subscribeToActionPlanFolders,
  saveActivityToDb,
  batchSaveActivitiesToDb,
  saveUserAccountToDb,
  saveActionPlanFolderToDb,
  ensureOsdAccountsInDb,
  dbStatus
} from './services/db';
import type { Unsubscribe } from 'firebase/firestore';
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
import AddActivityModal from './components/AddActivityModal.vue';
import ImportExcelModal from './components/ImportExcelModal.vue';
import ActivityDetailsModal from './components/ActivityDetailsModal.vue';
import CalendarModal from './components/CalendarModal.vue';
import DatabaseStatusModal from './components/DatabaseStatusModal.vue';
import LandingPageView from './components/LandingPageView.vue';
import ProfileSettingsModal from './components/ProfileSettingsModal.vue';
import ToastContainer, { ToastMessage } from './components/Toast.vue';

// Initial authorized module resolution based on active user
const getInitialModule = (user?: UserAccount): ModuleType => {
  if (!user) return 'activity_management';
  if (user.role === 'ROLE_ADMIN' || user.role === 'System Administrator') return 'system_admin';
  if ([
    'ROLE_ADVISER',
    'ROLE_DEAN',
    'ROLE_OSD',
    'ROLE_OVCSAS',
    'ROLE_OC',
    'Faculty Adviser',
    'College Dean',
    'Dean / College Reviewer',
    'OSD Officer',
    'OSD Director',
    'OVCSAS Officer',
    'Office of the Chancellor',
    'OSA Director',
    'Vice Chancellor / Chancellor'
  ].includes(user.role)) {
    return 'approval_management';
  }
  return 'activity_management';
};

// Reset legacy cache if version changed so fresh Stage 1 data and accounts are loaded
const CURRENT_APP_VERSION = 'v2026.09.28_clean_status';
try {
  if (localStorage.getItem('msun_data_version') !== CURRENT_APP_VERSION) {
    localStorage.removeItem('msun_action_plan_activities');
    localStorage.removeItem('msun_active_user_id');
    localStorage.setItem('msun_data_version', CURRENT_APP_VERSION);
  }
} catch (e) {
  // ignore
}

// User Accounts state (System Administration)
const userAccounts = ref<UserAccount[]>(INITIAL_USER_ACCOUNTS);

// Active Logged-in User Account: null if not logged in
const currentUserId = ref<string | null>(
  localStorage.getItem('msun_active_user_id') || null
);

const currentUser = computed<UserAccount | null>(() => {
  if (!currentUserId.value) return null;
  return userAccounts.value.find(u => u.id === currentUserId.value) || null;
});

// Primary Module (Strictly tied to user role)
const currentModule = ref<ModuleType>(getInitialModule(currentUser.value));

// Sidebar Tab inside Activity Management
const currentTab = ref<SidebarTab>('dashboard');

// Sidebar Tab inside System Administrator
const currentAdminTab = ref<AdminTab>('dashboard');

// Sidebar Tab inside Approval Management
const currentApprovalTab = ref<ApprovalTab>('plans_approvals');

// Action Plan Folders state (System Administration)
const actionPlanFolders = ref<ActionPlanFolder[]>(INITIAL_ACTION_PLAN_FOLDERS);

// Organization Filter: Defaults to logged-in user's council (e.g. 'CBIT')
const selectedOrgFilter = ref<OrgId | 'ALL'>(
  (currentUser.value?.orgId && currentUser.value.orgId !== 'OSA' && currentUser.value.orgId !== 'ADMIN' && currentUser.value.orgId !== 'COLLEGE')
    ? (currentUser.value.orgId as OrgId)
    : 'CBIT'
);

const isRoleAuthorizedForModule = (role: string, module: ModuleType): boolean => {
  if (module === 'system_admin') {
    return role === 'ROLE_ADMIN' || role === 'System Administrator';
  }
  if (module === 'approval_management') {
    return [
      'ROLE_ADVISER',
      'ROLE_DEAN',
      'ROLE_OSD',
      'ROLE_OVCSAS',
      'ROLE_OC',
      'Faculty Adviser',
      'College Dean',
      'Dean / College Reviewer',
      'OSD Officer',
      'OSD Director',
      'OVCSAS Officer',
      'Office of the Chancellor',
      'OSA Director',
      'Vice Chancellor / Chancellor'
    ].includes(role);
  }
  if (module === 'activity_management') {
    return [
      'ROLE_ORGANIZATION',
      'Org President',
      'Org Treasurer'
    ].includes(role);
  }
  return false;
};

const handleSelectModule = (mod: ModuleType) => {
  if (!currentUser.value) return;
  if (!isRoleAuthorizedForModule(currentUser.value.role, mod)) {
    addToast('Access Restricted', `Role ${currentUser.value.role} is not authorized to access ${mod.replace('_', ' ')}.`, 'warning');
    return;
  }
  currentModule.value = mod;
};

const handleSwitchUser = (account: UserAccount) => {
  currentUserId.value = account.id;
  try {
    localStorage.setItem('msun_active_user_id', account.id);
  } catch (e) {
    // ignore
  }
  if (account.orgId && account.orgId !== 'OSA' && account.orgId !== 'ADMIN' && account.orgId !== 'COLLEGE') {
    selectedOrgFilter.value = account.orgId as OrgId;
  }

  // Strictly enforce and immediately route to the authorized module for the selected user
  if (account.role === 'ROLE_ADMIN' || account.role === 'System Administrator') {
    currentModule.value = 'system_admin';
    currentAdminTab.value = 'dashboard';
  } else if (
    [
      'ROLE_ADVISER',
      'ROLE_DEAN',
      'ROLE_OSD',
      'ROLE_OVCSAS',
      'ROLE_OC',
      'Faculty Adviser',
      'College Dean',
      'Dean / College Reviewer',
      'OSD Officer',
      'OSD Director',
      'OVCSAS Officer',
      'Office of the Chancellor',
      'OSA Director',
      'Vice Chancellor / Chancellor'
    ].includes(account.role)
  ) {
    currentModule.value = 'approval_management';
    currentApprovalTab.value = 'plans_approvals';
  } else {
    currentModule.value = 'activity_management';
    currentTab.value = 'action_plan';
  }

  addToast(`Signed In: ${account.name}`, `Active session switched to ${account.role} (${account.orgName || account.orgId || ''}).`, 'info');
};

const normalizeActivity = (act: Activity): Activity => {
  const a = { ...act };
  if (a.status === 'Under Review' || a.status === 'IN_REVIEW' || a.status === 'SUBMITTED' || a.status === 'Needs Approval') {
    a.status = 'Pending' as ActivityStatus;
  }
  // CRITICAL: If organization already submitted accomplishment report:
  // It is forwarded to their adviser for final signature (Stage 7 for Central, Stage 8 for College)!
  if (a.accomplishmentForm?.isCompleted) {
    const isCol = isCollegeOrg(a.orgId);
    const max = isCol ? 8 : 7;
    const finalAdviserStage = isCol ? 8 : 7;
    const isSignedOff = a.timeline?.find(s => s.id === max)?.status === 'completed' || a.workflowStatus === 'COMPLETED';

    if (!isSignedOff) {
      a.status = 'Pending';
      a.approvalStage = isCol 
        ? 'Stage 8: Adviser Accomplishment Review & Final Sign-Off'
        : 'Stage 7: Adviser Accomplishment Review & Final Sign-Off';

      const currentTimeline = (a.timeline && a.timeline.length > 0)
        ? a.timeline
        : getWorkflowTimelineForOrg(a.orgId);

      a.timeline = currentTimeline.map((step) => {
        if (step.id < finalAdviserStage) {
          return { ...step, status: 'completed' as const, updatedAt: step.updatedAt || '2026-11-05' };
        }
        if (step.id === finalAdviserStage) {
          return { ...step, status: 'in_progress' as const };
        }
        return step;
      });
    }
  }
  return a;
};

// Initialize activities from localStorage or default
const getSavedActivities = (): Activity[] => {
  const normalizeList = (acts: Activity[]): Activity[] => acts.map(normalizeActivity);

  try {
    const saved = localStorage.getItem('msun_action_plan_activities');
    if (saved) {
      const parsed: Activity[] = JSON.parse(saved);
      // Ensure newly added initial activities exist
      const existingIds = new Set(parsed.map(a => a.id));
      const missing = INITIAL_ACTIVITIES.filter(a => !existingIds.has(a.id));
      if (missing.length > 0) {
        return normalizeList([...missing, ...parsed]);
      }
      return normalizeList(parsed);
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
      localStorage.setItem('msun_action_plan_activities', JSON.stringify(newVal));
    } catch (e) {
      // ignore
    }
  },
  { deep: true }
);

// Modal and navigation states (default open for SPA layout)
const isSidebarOpen = ref(true);
const isAddActivityOpen = ref(false);
const isImportOpen = ref(false);
const isCalendarModalOpen = ref(false);
const isDatabaseModalOpen = ref(false);
const selectedActivityForModal = ref<Activity | null>(null);

// Database lifecycle and real-time syncing
let unsubActivities: Unsubscribe | null = null;
let unsubUsers: Unsubscribe | null = null;
let unsubFolders: Unsubscribe | null = null;

onMounted(async () => {
  // Initialize and seed collections if empty
  await initializeDatabaseCollections();

  // Listen to live updates from Firestore
  unsubActivities = subscribeToActivities((data) => {
    if (data && data.length > 0) {
      activities.value = data.map(normalizeActivity);
    }
  });

  unsubUsers = subscribeToUserAccounts((data) => {
    if (data && data.length > 0) {
      // Merge with INITIAL_USER_ACCOUNTS to guarantee OSD and all workflow roles are always present
      const map = new Map<string, UserAccount>();
      INITIAL_USER_ACCOUNTS.forEach((u) => map.set(u.id, u));
      data.forEach((u) => map.set(u.id, u));
      userAccounts.value = Array.from(map.values());
    } else {
      userAccounts.value = INITIAL_USER_ACCOUNTS;
    }
  });

  unsubFolders = subscribeToActionPlanFolders((data) => {
    if (data && data.length > 0) {
      actionPlanFolders.value = data;
    }
  });
});

onUnmounted(() => {
  if (unsubActivities) unsubActivities();
  if (unsubUsers) unsubUsers();
  if (unsubFolders) unsubFolders();
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
  activities.value.unshift(newActivity);
  saveActivityToDb(newActivity).catch((err) => {
    console.warn('Failed to save activity to Firestore:', err);
  });
  addToast(
    'Activity Added to Action Plan',
    `"${newActivity.title}" was submitted under ${newActivity.orgId} for ${newActivity.fiscalYear}.`,
    'success'
  );
};

const handleImportActivities = (newBatch: Activity[]) => {
  activities.value = [...newBatch, ...activities.value];
  batchSaveActivitiesToDb(newBatch).catch((err) => {
    console.warn('Failed to save imported activities to Firestore:', err);
  });
  addToast(
    'Excel Import Successful (.xlsx)',
    `Imported ${newBatch.length} activities into Fiscal Year 2026 Action Plan.`,
    'success'
  );
};

const handleToggleStatus = (activityId: string) => {
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
      console.warn('Failed to update activity status in Firestore:', err);
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

const handleUpdateActivity = (updated: Activity) => {
  const norm = normalizeActivity(updated);
  activities.value = activities.value.map((act) => (act.id === norm.id ? norm : act));
  if (selectedActivityForModal.value?.id === norm.id) {
    selectedActivityForModal.value = norm;
  }
  saveActivityToDb(norm).catch((err) => {
    console.warn('Failed to update activity in Firestore:', err);
  });
  addToast('Workflow Updated', `Activity timeline and form details updated for "${norm.title}".`, 'success');
};

const handleOpenActivityModal = (act: Activity) => {
  // When viewing details or history in Approval Management for a pending activity, mark as Under Review
  if (
    currentModule.value === 'approval_management' &&
    (act.status === 'Pending' || act.status === 'Needs Approval' || act.status === 'SUBMITTED' || !act.status)
  ) {
    const updated: Activity = {
      ...act,
      status: 'Under Review'
    };
    handleUpdateActivity(updated);
    selectedActivityForModal.value = updated;
  } else {
    selectedActivityForModal.value = act;
  }
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

// Admin Account actions
const handleCreateAccount = (newAcc: Omit<UserAccount, 'id' | 'createdDate'>) => {
  const newId = `USR-00${userAccounts.value.length + 1}`;
  const account: UserAccount = {
    ...newAcc,
    id: newId,
    createdDate: new Date().toISOString().split('T')[0],
    lastActive: 'Just now'
  };
  userAccounts.value.unshift(account);
  saveUserAccountToDb(account).catch((err) => {
    console.warn('Failed to save account to Firestore:', err);
  });
  addToast('Account Created', `User account for "${account.name}" (${account.role}) was created successfully.`, 'success');
};

const handleUpdateAccount = (updatedAcc: UserAccount) => {
  const index = userAccounts.value.findIndex(a => a.id === updatedAcc.id);
  if (index !== -1) {
    userAccounts.value[index] = updatedAcc;
    saveUserAccountToDb(updatedAcc).catch((err) => {
      console.warn('Failed to update account in Firestore:', err);
    });
    addToast('Account Updated', `Details for ${updatedAcc.name} have been saved.`, 'success');
  }
};

const handleToggleAccountStatus = (accountId: string) => {
  const acc = userAccounts.value.find(a => a.id === accountId);
  if (acc) {
    acc.isActive = !acc.isActive;
    saveUserAccountToDb(acc).catch((err) => {
      console.warn('Failed to update account in Firestore:', err);
    });
    addToast(
      acc.isActive ? 'Account Activated' : 'Account Deactivated',
      `User account "${acc.name}" is now ${acc.isActive ? 'Active' : 'Deactivated'}.`,
      acc.isActive ? 'success' : 'warning'
    );
  }
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
  saveActionPlanFolderToDb(newFolder).catch((err) => {
    console.warn('Failed to save folder to Firestore:', err);
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

// Landing Page display state (defaults to true if logged out or onboarding)
const isLandingPageOpen = ref<boolean>(!currentUserId.value);

const handleCloseLanding = () => {
  if (!currentUser.value) {
    addToast('Sign In Required', 'Please choose your role and sign in to enter the dashboard.', 'warning');
    return;
  }
  isLandingPageOpen.value = false;
};

const handleCompleteOnboarding = async (newAccount: UserAccount) => {
  const existingIdx = userAccounts.value.findIndex(
    u => u.email.toLowerCase() === newAccount.email.toLowerCase() || u.id === newAccount.id
  );
  if (existingIdx !== -1) {
    userAccounts.value[existingIdx] = { ...userAccounts.value[existingIdx], ...newAccount };
  } else {
    userAccounts.value.unshift(newAccount);
  }

  // Persist new user account to Firestore
  try {
    await saveUserAccountToDb(newAccount);
  } catch (err) {
    console.warn('Could not save user to Firestore:', err);
  }

  // Set active user
  currentUserId.value = newAccount.id;
  try {
    localStorage.setItem('msun_active_user_id', newAccount.id);
  } catch (e) {
    // ignore
  }

  // Set appropriate module and org filter
  const targetModule = getInitialModule(newAccount);
  currentModule.value = targetModule;
  if (newAccount.orgId && newAccount.orgId !== 'OSA' && newAccount.orgId !== 'ADMIN' && newAccount.orgId !== 'COLLEGE') {
    selectedOrgFilter.value = newAccount.orgId as OrgId;
  } else {
    selectedOrgFilter.value = 'ALL';
  }

  // Dismiss landing page
  isLandingPageOpen.value = false;

  addToast(
    `Welcome, ${newAccount.firstName || newAccount.name}!`,
    `You are now signed in as ${newAccount.role} for ${newAccount.orgName || newAccount.orgId || 'MSU Naawan'}.`,
    'success'
  );
};

const handleContinueAsUser = (account: UserAccount) => {
  currentUserId.value = account.id;
  try {
    localStorage.setItem('msun_active_user_id', account.id);
  } catch (e) {
    // ignore
  }
  const targetModule = getInitialModule(account);
  currentModule.value = targetModule;
  if (account.orgId && account.orgId !== 'OSA' && account.orgId !== 'ADMIN' && account.orgId !== 'COLLEGE') {
    selectedOrgFilter.value = account.orgId as OrgId;
  }
  isLandingPageOpen.value = false;
  addToast('Session Activated', `Switched to ${account.name} (${account.role}).`, 'info');
};

// Profile Settings Modal state (Images 3, 4, 5)
const isProfileModalOpen = ref(false);

const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => {
  if (!currentUser.value) return;
  const updatedUser: UserAccount = {
    ...currentUser.value,
    ...updatedData
  };

  const idx = userAccounts.value.findIndex(u => u.id === currentUser.value.id);
  if (idx !== -1) {
    userAccounts.value[idx] = updatedUser;
  }

  try {
    await saveUserAccountToDb(updatedUser);
  } catch (err) {
    console.warn('Could not save user profile update to Firestore:', err);
  }

  addToast('Profile Updated', 'Your profile details and preferences were saved successfully.', 'success');
};

const handleLogout = () => {
  isProfileModalOpen.value = false;
  currentUserId.value = null;
  try {
    localStorage.removeItem('msun_active_user_id');
  } catch (e) {
    // ignore
  }
  isLandingPageOpen.value = true;
  addToast('Logged Out', 'You have been safely signed out and returned to the landing page.', 'info');
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
    
    <!-- Landing Page (with Steps 1, 2, 3: Overview, Role Selection, Info Form) -->
    <LandingPageView
      v-if="isLandingPageOpen || !currentUser"
      :current-user="currentUser"
      :user-accounts="userAccounts"
      @complete-onboarding="handleCompleteOnboarding"
      @continue-as-user="handleContinueAsUser"
      @close-landing="handleCloseLanding"
    />

    <!-- Main Workspace Application when Landing Page is closed and user is authenticated -->
    <template v-else-if="currentUser">
      <!-- Global Application Header -->
      <Header
        :current-module="currentModule"
        :pending-approval-count="pendingApprovalCount"
        :is-sidebar-open="isSidebarOpen"
        :current-user="currentUser"
        :user-accounts="userAccounts"
        @select-module="handleSelectModule"
        @toggle-sidebar="isSidebarOpen = !isSidebarOpen"
        @quick-add-activity="isAddActivityOpen = true"
        @switch-user="handleSwitchUser"
        @open-landing="isLandingPageOpen = true"
        @open-profile="isProfileModalOpen = true"
      />

      <!-- Main Layout Area (Static Docked Layout) -->
    <div class="flex-1 flex flex-row w-full min-w-0">
      
      <!-- Mobile Backdrop for Sidebar Drawer -->
      <div
        v-if="isSidebarOpen"
        @click="isSidebarOpen = false"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-25 md:hidden"
      ></div>

      <!-- Collapsible SPA Sidebar when inside Activity Management module -->
      <Sidebar
        v-if="currentModule === 'activity_management'"
        :is-open="isSidebarOpen"
        :current-tab="currentTab"
        :selected-org-filter="selectedOrgFilter"
        :activities-count="activities.length"
        @select-tab="(tab) => { currentTab = tab; if (typeof window !== 'undefined' && window.innerWidth < 768) isSidebarOpen = false; }"
        @select-org-filter="(org) => selectedOrgFilter = org"
        @close="isSidebarOpen = !isSidebarOpen"
      />

      <!-- Collapsible SPA Sidebar when inside Approval Management module -->
      <ApprovalSidebar
        v-else-if="currentModule === 'approval_management'"
        :is-open="isSidebarOpen"
        :current-tab="currentApprovalTab"
        :pending-approvals-count="pendingApprovalCount"
        :total-plans-count="actionPlanFolders.length"
        @select-tab="(tab) => { currentApprovalTab = tab; if (typeof window !== 'undefined' && window.innerWidth < 768) isSidebarOpen = false; }"
        @close="isSidebarOpen = !isSidebarOpen"
      />

      <!-- Collapsible SPA Sidebar when inside System Administrator module -->
      <AdminSidebar
        v-else-if="currentModule === 'system_admin'"
        :is-open="isSidebarOpen"
        :current-tab="currentAdminTab"
        :accounts-count="userAccounts.length"
        :action-plans-count="actionPlanFolders.length"
        @select-tab="(tab) => { currentAdminTab = tab; if (typeof window !== 'undefined' && window.innerWidth < 768) isSidebarOpen = false; }"
        @close="isSidebarOpen = !isSidebarOpen"
      />

      <!-- Dynamic Content Workspace -->
      <main class="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 overflow-y-auto">
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
            @add-activity-click="isAddActivityOpen = true"
            @import-click="isImportOpen = true"
            @select-activity="handleOpenActivityModal"
            @toggle-status="handleToggleStatus"
            @select-org-filter="(org) => selectedOrgFilter = org"
          />

          <ActivityView
            v-else-if="currentTab === 'activity'"
            :activities="activities"
            :selected-org-filter="selectedOrgFilter"
            :current-user="currentUser"
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
            @switch-user="handleSwitchUser"
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
            @switch-user="handleSwitchUser"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 3. Action Plan View (Manage Institutional Strategic Initiatives, Create fiscal year folder, list all action plans) -->
          <AdminActionPlanView
            v-else-if="currentAdminTab === 'action_plan'"
            :folders="actionPlanFolders"
            :activities="activities"
            @create-folder="handleCreateFolder"
            @select-activity="handleOpenActivityModal"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />

          <!-- 4. Organizations View (Same as Activity Management Organizations View, but with Manage button enabled) -->
          <OrganizationsView
            v-else-if="currentAdminTab === 'organizations'"
            :activities="activities"
            :show-manage-button="true"
            @select-org="handleSelectOrgFilterFromView"
            @show-toast="(title, msg, type) => addToast(title, msg, type)"
          />
        </template>
      </main>
    </div>

    <!-- MODALS -->
    
    <!-- 1. Add Activity Modal (Don Norman Constraints & Form Feedback) -->
    <AddActivityModal
      :is-open="isAddActivityOpen"
      :default-org-id="selectedOrgFilter"
      @close="isAddActivityOpen = false"
      @add-activity="handleAddActivity"
    />

    <!-- 2. Import Excel Modal (.xlsx Constraint & Affordance) -->
    <ImportExcelModal
      :is-open="isImportOpen"
      @close="isImportOpen = false"
      @import-activities="handleImportActivities"
    />

    <!-- 3. Activity Full Details & Approval Modal -->
    <ActivityDetailsModal
      :activity="selectedActivityForModal"
      :current-module="currentModule"
      :current-user="currentUser"
      :user-accounts="userAccounts"
      @close="selectedActivityForModal = null"
      @toggle-status="handleToggleStatus"
      @update-activity="handleUpdateActivity"
      @switch-user="handleSwitchUser"
      @show-toast="(title, msg, type) => addToast(title, msg, type)"
    />

    <!-- 4. Calendar Feature Modal -->
    <CalendarModal
      :is-open="isCalendarModalOpen"
      :activities="activities"
      @close="isCalendarModalOpen = false"
      @select-activity="(act) => selectedActivityForModal = act"
      @download-calendar="handleDownloadCalendar"
    />

    <!-- 5. Cloud Database (Firebase Firestore) Status & Management Modal -->
    <DatabaseStatusModal
      :is-open="isDatabaseModalOpen"
      :activities-count="activities.length"
      :organizations-count="ORGANIZATIONS.length"
      :users-count="userAccounts.length"
      :folders-count="actionPlanFolders.length"
      @close="isDatabaseModalOpen = false"
      @show-toast="(title, msg, type) => addToast(title, msg, type)"
    />

    <!-- 6. Profile Settings Modal (Images 3, 4, 5) -->
    <ProfileSettingsModal
      :is-open="isProfileModalOpen"
      :current-user="currentUser"
      @close="isProfileModalOpen = false"
      @logout="handleLogout"
      @update-profile="handleUpdateProfile"
    />
    </template>

    <!-- Floating Immediate Feedback Toasts -->
    <ToastContainer :toasts="toasts" @dismiss="removeToast" />
  </div>
</template>
