import { ref } from 'vue';
import { Activity, UserAccount, ActionPlanFolder, StudentOrganization } from '../types';
import { 
  INITIAL_ACTIVITIES, 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_ACTION_PLAN_FOLDERS, 
  ORGANIZATIONS,
  DEFAULT_WORKFLOW_TIMELINE
} from '../data/initialData';

// LocalStorage keys
const LS_ACTIVITIES = 'msun_action_plan_activities';
const LS_USERS = 'msun_user_accounts';
const LS_FOLDERS = 'msun_action_plan_folders';
const LS_ORGANIZATIONS = 'msun_student_organizations';

// Generic helpers
function readLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    // ignore
  }
  return [];
}

function writeLS<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export type DbStatus = 'connecting' | 'connected' | 'syncing' | 'error' | 'offline';

// Unsubscribe type — kept for API compatibility with callers
export type Unsubscribe = () => void;

export const dbStatus = ref<DbStatus>('connected');
export const dbErrorMessage = ref<string>('');
export const lastSyncTime = ref<Date | null>(new Date());

// Strip undefined recursively
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return data;
  }
  return JSON.parse(JSON.stringify(data));
}

/**
 * Initialize and seed initial data if localStorage collections are empty.
 */
export async function initializeDatabaseCollections(): Promise<void> {
  dbStatus.value = 'syncing';

  // 1. Activities
  const acts = readLS<Activity>(LS_ACTIVITIES);
  if (acts.length === 0) {
    writeLS(LS_ACTIVITIES, INITIAL_ACTIVITIES);
  }

  // 2. User accounts
  const users = readLS<UserAccount>(LS_USERS);
  const existingIds = new Set(users.map((u) => u.id));
  const missingUsers = INITIAL_USER_ACCOUNTS.filter((u) => !existingIds.has(u.id));
  if (users.length === 0 || missingUsers.length > 0) {
    const merged = new Map<string, UserAccount>();
    INITIAL_USER_ACCOUNTS.forEach((u) => merged.set(u.id, u));
    users.forEach((u) => merged.set(u.id, u));
    INITIAL_USER_ACCOUNTS.filter(u => u.role === 'ROLE_OSD' || u.orgId === 'OSD')
      .forEach((u) => merged.set(u.id, u));
    writeLS(LS_USERS, Array.from(merged.values()));
  }

  // 3. Action plan folders
  const folders = readLS<ActionPlanFolder>(LS_FOLDERS);
  if (folders.length === 0) {
    writeLS(LS_FOLDERS, INITIAL_ACTION_PLAN_FOLDERS);
  }

  // 4. Organizations
  const orgs = readLS<StudentOrganization>(LS_ORGANIZATIONS);
  if (orgs.length === 0) {
    writeLS(LS_ORGANIZATIONS, ORGANIZATIONS);
  }

  dbStatus.value = 'connected';
  lastSyncTime.value = new Date();
}

/**
 * Subscription to Activities — immediately calls onData with localStorage data.
 * Returns a no-op Unsubscribe for API compatibility.
 */
export function subscribeToActivities(
  onData: (activities: Activity[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const data = readLS<Activity>(LS_ACTIVITIES);
  onData(data.length > 0 ? data : INITIAL_ACTIVITIES);
  return () => {};
}

/**
 * Subscription to User Accounts.
 */
export function subscribeToUserAccounts(
  onData: (users: UserAccount[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const data = readLS<UserAccount>(LS_USERS);
  onData(data.length > 0 ? data : INITIAL_USER_ACCOUNTS);
  return () => {};
}

/**
 * Subscription to Action Plan Folders.
 */
export function subscribeToActionPlanFolders(
  onData: (folders: ActionPlanFolder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const data = readLS<ActionPlanFolder>(LS_FOLDERS);
  onData(data.length > 0 ? data : INITIAL_ACTION_PLAN_FOLDERS);
  return () => {};
}

/**
 * Subscription to Organizations.
 */
export function subscribeToOrganizations(
  onData: (orgs: StudentOrganization[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const data = readLS<StudentOrganization>(LS_ORGANIZATIONS);
  onData(data.length > 0 ? data : ORGANIZATIONS);
  return () => {};
}

/**
 * Save or update an Activity in localStorage.
 */
export async function saveActivityToDb(activity: Activity): Promise<void> {
  const list = readLS<Activity>(LS_ACTIVITIES);
  const idx = list.findIndex((a) => a.id === activity.id);
  if (idx !== -1) {
    list[idx] = sanitizeForFirestore(activity);
  } else {
    list.unshift(sanitizeForFirestore(activity));
  }
  writeLS(LS_ACTIVITIES, list);
  lastSyncTime.value = new Date();
}

/**
 * Delete an Activity from localStorage.
 */
export async function deleteActivityFromDb(activityId: string): Promise<void> {
  const list = readLS<Activity>(LS_ACTIVITIES).filter((a) => a.id !== activityId);
  writeLS(LS_ACTIVITIES, list);
  lastSyncTime.value = new Date();
}

/**
 * Save multiple activities in batch.
 */
export async function batchSaveActivitiesToDb(activities: Activity[]): Promise<void> {
  const existing = readLS<Activity>(LS_ACTIVITIES);
  const map = new Map<string, Activity>();
  existing.forEach((a) => map.set(a.id, a));
  activities.forEach((a) => map.set(a.id, sanitizeForFirestore(a)));
  writeLS(LS_ACTIVITIES, Array.from(map.values()));
  lastSyncTime.value = new Date();
}

/**
 * Save or update a User Account in localStorage.
 */
export async function saveUserAccountToDb(account: UserAccount): Promise<void> {
  const list = readLS<UserAccount>(LS_USERS);
  const idx = list.findIndex((u) => u.id === account.id);
  if (idx !== -1) {
    list[idx] = sanitizeForFirestore(account);
  } else {
    list.unshift(sanitizeForFirestore(account));
  }
  writeLS(LS_USERS, list);
  lastSyncTime.value = new Date();
}

/**
 * Save or update an Action Plan Folder in localStorage.
 */
export async function saveActionPlanFolderToDb(folder: ActionPlanFolder): Promise<void> {
  const list = readLS<ActionPlanFolder>(LS_FOLDERS);
  const idx = list.findIndex((f) => f.id === folder.id);
  if (idx !== -1) {
    list[idx] = sanitizeForFirestore(folder);
  } else {
    list.unshift(sanitizeForFirestore(folder));
  }
  writeLS(LS_FOLDERS, list);
  lastSyncTime.value = new Date();
}

/**
 * Save or update a Student Organization in localStorage.
 */
export async function saveOrganizationToDb(org: StudentOrganization): Promise<void> {
  const list = readLS<StudentOrganization>(LS_ORGANIZATIONS);
  const idx = list.findIndex((o) => o.id === org.id);
  if (idx !== -1) {
    list[idx] = sanitizeForFirestore(org);
  } else {
    list.unshift(sanitizeForFirestore(org));
  }
  writeLS(LS_ORGANIZATIONS, list);
  lastSyncTime.value = new Date();
}

/**
 * Reset and reseed database back to defaults.
 */
export async function resetDatabaseToDefaults(): Promise<void> {
  dbStatus.value = 'syncing';
  writeLS(LS_ACTIVITIES, INITIAL_ACTIVITIES);
  writeLS(LS_USERS, INITIAL_USER_ACCOUNTS);
  writeLS(LS_FOLDERS, INITIAL_ACTION_PLAN_FOLDERS);
  writeLS(LS_ORGANIZATIONS, ORGANIZATIONS);
  dbStatus.value = 'connected';
  lastSyncTime.value = new Date();
}

/**
 * Reset all activities to Stage 1 and user accounts to required workflow accounts.
 */
export async function resetAllActivitiesToStageOne(): Promise<void> {
  dbStatus.value = 'syncing';

  const resetActivities = INITIAL_ACTIVITIES.map((act) => {
    const resetAct: Activity = {
      ...act,
      status: 'Pending',
      approvalStage: 'Stage 1: Proposal & Activity Design',
      timeline: JSON.parse(JSON.stringify(DEFAULT_WORKFLOW_TIMELINE))
    };
    delete resetAct.accomplishmentForm;
    return sanitizeForFirestore(resetAct);
  });
  writeLS(LS_ACTIVITIES, resetActivities);
  writeLS(LS_USERS, INITIAL_USER_ACCOUNTS);
  writeLS(LS_FOLDERS, INITIAL_ACTION_PLAN_FOLDERS);

  dbStatus.value = 'connected';
  lastSyncTime.value = new Date();
}

export function getDatabaseMetadata() {
  return {
    projectId: 'local-storage',
    databaseId: 'browser-local',
    status: dbStatus.value
  };
}

/**
 * Ensure OSD accounts exist in localStorage.
 */
export async function ensureOsdAccountsInDb(): Promise<UserAccount[]> {
  const osdAccounts = INITIAL_USER_ACCOUNTS.filter(u => u.role === 'ROLE_OSD' || u.orgId === 'OSD');
  const list = readLS<UserAccount>(LS_USERS);
  const map = new Map<string, UserAccount>();
  list.forEach((u) => map.set(u.id, u));
  osdAccounts.forEach((u) => map.set(u.id, sanitizeForFirestore(u)));
  writeLS(LS_USERS, Array.from(map.values()));
  lastSyncTime.value = new Date();
  return osdAccounts;
}
