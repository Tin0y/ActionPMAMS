import { ref } from 'vue';
import { Activity, UserAccount, ActionPlanFolder, StudentOrganization } from '../types';
import { 
  INITIAL_ACTIVITIES, 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_ACTION_PLAN_FOLDERS, 
  ORGANIZATIONS,
  DEFAULT_WORKFLOW_TIMELINE,
  isOrgMatch
} from '../data/initialData';
import { getDadControlNo } from '../utils/dadSignatories';
import { detectAccountParentOrgAndRole } from '../utils/organizationUtils';

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
/**
 * Detects whether an activity belongs to SENSSO (or SenSo/SENSO) in Fiscal Year 2027.
 */
export function isSenssoFy2027Activity(act: Activity): boolean {
  if (!act) return false;
  if (act.id && (act.id.includes("2027-SENSSO") || act.id.includes("SENSSO-2027"))) {
    return true;
  }
  const org = (act.orgId || "").toUpperCase();
  const office = (act.office || "").toUpperCase();
  const isSensso = 
    org === "SENSSO" || 
    org === "SENSO" || 
    office === "SENSSO" || 
    office === "SENSO" || 
    isOrgMatch(act.orgId, "SENSSO") || 
    isOrgMatch(act.office, "SENSSO");

  if (!isSensso) return false;

  const fy = (act.fiscalYear || "").toLowerCase();
  const start = (act.startDate || "");
  const timeframe = (act.timeframe || "");
  const id = (act.id || "");

  const is2027 = 
    fy.includes("2027") || 
    start.startsWith("2027") || 
    timeframe.includes("2027") || 
    id.includes("2027");

  return is2027;
}
export async function initializeDatabaseCollections(): Promise<void> {
  dbStatus.value = 'syncing';

  // 1. Activities
  let acts = readLS<Activity>(LS_ACTIVITIES);
  if (acts.length === 0) {
    acts = INITIAL_ACTIVITIES.filter(a => !isSenssoFy2027Activity(a));
    writeLS(LS_ACTIVITIES, acts);
  } else {
    // Purge any SENSSO FY 2027 activities from localStorage (regardless of approval stage)
    const hadSensso2027 = acts.some(isSenssoFy2027Activity);
    if (hadSensso2027) {
      acts = acts.filter(a => !isSenssoFy2027Activity(a));
      writeLS(LS_ACTIVITIES, acts);
    }

    // Purge any stale mock CFMS 2027 seed activities from localStorage
    const hadStaleCfms = acts.some(a => a.id === 'ACT-2027-CMFS-001' || (a.title && a.title.includes('Coastal Stewards Assembly')));
    if (hadStaleCfms) {
      acts = acts.filter(a => a.id !== 'ACT-2027-CMFS-001' && (!a.title || !a.title.includes('Coastal Stewards Assembly')));
      writeLS(LS_ACTIVITIES, acts);
    }
    let modified = false;
    acts.forEach((act) => {
      if (act.proposedBy && act.proposedBy.includes('(')) {
        act.proposedBy = act.proposedBy.replace(/\(.*?\)/g, '').trim();
        modified = true;
      }
      if (act.accomplishmentForm) {
        const org = (act.orgId || 'SSC').toUpperCase();
        const isSensso = org.includes('SENSSO');
        if (act.accomplishmentForm.preparedByName && act.accomplishmentForm.preparedByName.includes('(')) {
          act.accomplishmentForm.preparedByName = act.accomplishmentForm.preparedByName.replace(/\(.*?\)/g, '').trim();
          modified = true;
        }
        if (!isSensso && act.accomplishmentForm.preparedByTitle?.toLowerCase().includes('sensso')) {
          act.accomplishmentForm.preparedByTitle = `${org} President`;
          modified = true;
        }
        if (!isSensso && act.accomplishmentForm.reviewedByTitle?.toLowerCase().includes('sensso')) {
          act.accomplishmentForm.reviewedByTitle = `OSA Coordinator / ${org} Adviser`;
          modified = true;
        }
      }
      if (act.designForm) {
        const isSsc = isOrgMatch(act.orgId, 'SSC');
        if (act.designForm.submittedByRole) {
          const role = act.designForm.submittedByRole;
          if ((!isSsc && (/^SSC\b/i.test(role) || /Senator/i.test(role))) || role.toLowerCase().includes('senator, planning and development')) {
            delete act.designForm.submittedByRole;
            modified = true;
          }
        }
        if (act.designForm.controlNumber && (act.designForm.controlNumber.includes('ACCOM-REV') || act.designForm.controlNumber.includes('001-2025-REV00'))) {
          act.designForm.controlNumber = getDadControlNo(act, act.designForm);
          modified = true;
        }
        if (act.designForm.includedInPdsYear === '2027' && !act.designForm.includedInPdsPlan) {
          act.designForm.includedInPdsYear = '';
          modified = true;
        }
      }
    });
    if (modified) {
      writeLS(LS_ACTIVITIES, acts);
    }
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

  // Ensure existing users have updated parentOrg, actualOrg, and orgName for renamed organizations
  const currentUsers = readLS<UserAccount>(LS_USERS);
  let usersChanged = false;
  for (const u of currentUsers) {
    if (
      u.role === 'ROLE_ADMIN' || 
      u.id === 'usr-admin-01' || 
      u.email === 'admin@msunaawan.edu.ph' || 
      u.orgId === 'ADMIN' ||
      (u.role && u.role.toLowerCase().includes('admin'))
    ) {
      if (u.role !== 'ROLE_ADMIN') { u.role = 'ROLE_ADMIN'; usersChanged = true; }
      if (u.displayRole !== 'SysAd') { u.displayRole = 'SysAd'; usersChanged = true; }
      if (u.selectedRole !== 'SysAd') { u.selectedRole = 'SysAd'; usersChanged = true; }
      if (u.orgId !== 'ADMIN') { u.orgId = 'ADMIN'; usersChanged = true; }
      if (u.orgName !== 'Not Affiliated') { u.orgName = 'Not Affiliated'; usersChanged = true; }
      if (u.parentOrg !== 'ADMIN') { u.parentOrg = 'ADMIN'; usersChanged = true; }
      if (u.actualOrg !== 'Not Affiliated') { u.actualOrg = 'Not Affiliated'; usersChanged = true; }
      if (u.subOrg !== '') { u.subOrg = ''; usersChanged = true; }
    } else if (
      u.role === 'ROLE_ADVISER' ||
      u.role === 'Faculty Adviser' ||
      u.selectedRole === 'Adviser' ||
      (u.displayRole && u.displayRole.toLowerCase().includes('adviser')) ||
      (u.email && u.email.toLowerCase().includes('.adviser@')) ||
      (u.name && u.name.toLowerCase().includes('adviser'))
    ) {
      if (u.role !== 'ROLE_ADVISER') { u.role = 'ROLE_ADVISER'; usersChanged = true; }
      if (u.selectedRole !== 'Adviser') { u.selectedRole = 'Adviser'; usersChanged = true; }

      let orgKey = u.parentOrg || '';
      const uOrgUpper = (u.orgId || '').toUpperCase();
      const uEmail = (u.email || '').toLowerCase();

      if (!orgKey || orgKey === 'COLLEGE' || orgKey === 'ALL') {
        if (uOrgUpper === 'SSC' || uEmail.includes('ssc.adviser')) orgKey = 'SSC';
        else if (uOrgUpper === 'CBIT' || uEmail.includes('cbit.adviser')) orgKey = 'CBIT SEC';
        else if (uOrgUpper === 'CELS' || uEmail.includes('cels.adviser')) orgKey = 'ELSSA';
        else if (uOrgUpper === 'CESS' || uEmail.includes('cess.adviser')) orgKey = 'CESS SO';
        else if (uOrgUpper === 'CFMS' || uOrgUpper === 'CMFS' || uEmail.includes('cfms.adviser')) orgKey = 'FIMSSO';
        else if (uOrgUpper === 'KAABAG' || uEmail.includes('kaabag.adviser')) orgKey = 'KAABAG';
        else if (uOrgUpper === 'SENSSO' || uOrgUpper === 'SENSO' || uEmail.includes('sensso.adviser')) orgKey = 'SenSSo';
        else if (uOrgUpper === 'TME' || uEmail.includes('tme.adviser')) orgKey = 'TME';
        else orgKey = u.orgId || 'Org';
      }

      if (u.parentOrg !== orgKey) {
        u.parentOrg = orgKey;
        usersChanged = true;
      }
      if (!u.actualOrg || u.actualOrg === 'COLLEGE' || u.actualOrg === 'ALL') {
        u.actualOrg = orgKey;
        usersChanged = true;
      }

      const expectedRole = orgKey.endsWith(' Adviser') ? orgKey : `${orgKey} Adviser`;
      if (u.displayRole !== expectedRole) {
        u.displayRole = expectedRole;
        usersChanged = true;
      }
    } else if (u.orgId === 'CBIT' && u.role !== 'ROLE_DEAN') {
      if (!u.parentOrg || u.parentOrg === 'CBIT') { u.parentOrg = 'CBIT SEC'; usersChanged = true; }
      if (!u.actualOrg || u.actualOrg === 'CBIT') { u.actualOrg = u.subOrg || 'CBIT SEC'; usersChanged = true; }
      if (u.orgName && !u.orgName.includes('Student Executive Council')) {
        u.orgName = 'College of Business and Information Technology Student Executive Council';
        usersChanged = true;
      }
    } else if (u.orgId === 'CELS' && u.role !== 'ROLE_DEAN') {
      if (!u.parentOrg || u.parentOrg === 'CELS') { u.parentOrg = 'ELSSA'; usersChanged = true; }
      if (!u.actualOrg || u.actualOrg === 'CELS') { u.actualOrg = u.subOrg || 'ELSSA'; usersChanged = true; }
      if (u.orgName && !u.orgName.includes('Alliance')) {
        u.orgName = 'Environment and Life Sciences Student Alliance';
        usersChanged = true;
      }
    } else if (u.orgId === 'CESS' && u.role !== 'ROLE_DEAN') {
      if (!u.parentOrg || u.parentOrg === 'CESS') { u.parentOrg = 'CESS SO'; usersChanged = true; }
      if (!u.actualOrg || u.actualOrg === 'CESS') { u.actualOrg = u.subOrg || 'CESS SO'; usersChanged = true; }
      if (u.orgName && !u.orgName.includes('Student Organization')) {
        u.orgName = 'College of Education and Social Sciences Student Organization';
        usersChanged = true;
      }
    } else if ((u.orgId === 'CFMS' || u.orgId === 'CMFS') && u.role !== 'ROLE_DEAN') {
      if (!u.parentOrg || u.parentOrg === 'CFMS' || u.parentOrg === 'CMFS') { u.parentOrg = 'FIMSSO'; usersChanged = true; }
      if (!u.actualOrg || u.actualOrg === 'CFMS' || u.actualOrg === 'CMFS') { u.actualOrg = u.subOrg || 'FIMSSO'; usersChanged = true; }
      if (u.orgName && !u.orgName.includes('Fisheries and Marine Science')) {
        u.orgName = 'Fisheries and Marine Science Student Organization';
        usersChanged = true;
      }
    } else if (u.orgId === 'KAABAG') {
      if (!u.parentOrg) { u.parentOrg = 'KAABAG'; usersChanged = true; }
      if (!u.actualOrg) { u.actualOrg = 'KAABAG'; usersChanged = true; }
      if (u.orgName !== 'KAABAG Student Peer Facilitators') {
        u.orgName = 'KAABAG Student Peer Facilitators';
        usersChanged = true;
      }
    } else if (u.orgId === 'TME') {
      if (u.isActive) {
        u.isActive = false;
        usersChanged = true;
      }
    }

    // Ensure proper subOrg, selectedRole, and displayRole matching how account was created
    if (u.actualOrg && u.parentOrg && u.actualOrg !== u.parentOrg && !u.subOrg) {
      u.subOrg = u.actualOrg;
      usersChanged = true;
    }
    if (!u.selectedRole || !u.displayRole || u.displayRole.toLowerCase().endsWith(' officer')) {
      const detected = detectAccountParentOrgAndRole(u);
      if (detected.selectedRole && (!u.selectedRole || u.selectedRole === 'Others')) {
        u.selectedRole = detected.selectedRole;
        usersChanged = true;
      }
      if (detected.selectedRole && (!u.displayRole || u.displayRole.toLowerCase().endsWith(' officer'))) {
        u.displayRole = detected.selectedRole === 'Adviser' ? `${detected.parentOrg} Adviser` : (detected.customRole || detected.selectedRole);
        usersChanged = true;
      }
    }

    // Ensure roles array and username exist for backward compatibility and multiple roles support
    if (!u.roles || !Array.isArray(u.roles) || u.roles.length === 0) {
      u.roles = [u.role];
      usersChanged = true;
    }
    if (!u.username && u.email) {
      u.username = u.email.split('@')[0];
      usersChanged = true;
    }
    // Provide sample multi-role configuration on test accounts as per user specification
    if (u.id === 'usr-osd-director' && u.roles && !u.roles.includes('ROLE_ADMIN')) {
      u.roles = ['ROLE_OSD', 'ROLE_ADMIN'];
      usersChanged = true;
    }
    if (u.id === 'usr-cbit-adv' && u.roles && !u.roles.includes('ROLE_OSD')) {
      u.roles = ['ROLE_ADVISER', 'ROLE_OSD'];
      usersChanged = true;
    }
  }
  if (usersChanged) {
    writeLS(LS_USERS, currentUsers);
  }

  // 3. Action plan folders
  const folders = readLS<ActionPlanFolder>(LS_FOLDERS);
  if (folders.length === 0) {
    writeLS(LS_FOLDERS, INITIAL_ACTION_PLAN_FOLDERS);
  } else {
    // Recalculate 2027 folder counts based on remaining activities
    const f2027 = folders.find(f => f.id === "AP-FY2027" || (f.fiscalYear && f.fiscalYear.includes("2027")));
    if (f2027) {
      const remaining2027Acts = acts.filter(a => (a.fiscalYear?.includes("2027") || a.startDate?.startsWith("2027")));
      f2027.totalActivitiesCount = remaining2027Acts.length;
      f2027.approvedCount = remaining2027Acts.filter(a => a.status === "Approved" || a.workflowStatus === "COMPLETED").length;
      f2027.pendingCount = remaining2027Acts.length - f2027.approvedCount;
      f2027.allocatedBudget = remaining2027Acts.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
      writeLS(LS_FOLDERS, folders);
    }
  }

  // 4. Organizations
  const orgs = readLS<StudentOrganization>(LS_ORGANIZATIONS);
  if (orgs.length === 0) {
    writeLS(LS_ORGANIZATIONS, ORGANIZATIONS);
  } else {
    // In-place update for existing cached organizations
    let changed = false;
    for (const org of orgs) {
      if (org.id === 'CBIT' && (org.acronym !== 'CBIT SEC' || org.name !== 'College of Business and Information Technology Student Executive Council')) {
        org.acronym = 'CBIT SEC';
        org.name = 'College of Business and Information Technology Student Executive Council';
        changed = true;
      } else if (org.id === 'CELS' && (org.acronym !== 'ELSSA' || org.name !== 'Environment and Life Sciences Student Alliance')) {
        org.acronym = 'ELSSA';
        org.name = 'Environment and Life Sciences Student Alliance';
        changed = true;
      } else if (org.id === 'CESS' && (org.acronym !== 'CESS SO' || org.name !== 'College of Education and Social Sciences Student Organization')) {
        org.acronym = 'CESS SO';
        org.name = 'College of Education and Social Sciences Student Organization';
        changed = true;
      } else if ((org.id === 'CMFS' || org.id === 'CFMS') && (org.acronym !== 'FIMSSO' || org.name !== 'Fisheries and Marine Science Student Organization')) {
        org.acronym = 'FIMSSO';
        org.name = 'Fisheries and Marine Science Student Organization';
        changed = true;
      } else if (org.id === 'KAABAG' && org.name !== 'KAABAG Student Peer Facilitators') {
        org.name = 'KAABAG Student Peer Facilitators';
        changed = true;
      } else if (org.id === 'TME' && org.status !== 'Archived') {
        org.status = 'Archived';
        changed = true;
      }
    }
    if (changed) {
      writeLS(LS_ORGANIZATIONS, orgs);
    }
  }

  // Synchronize live records from PostgreSQL backend API
  await syncFromBackendApi();

  dbStatus.value = 'connected';
  lastSyncTime.value = new Date();
}

/**
 * Sync live data from PostgreSQL backend API into localStorage cache
 */
export async function syncFromBackendApi(): Promise<void> {
  try {
    const [actsRes, usersRes, plansRes, orgsRes] = await Promise.allSettled([
      fetch('/api/activities'),
      fetch('/api/users'),
      fetch('/api/action-plans'),
      fetch('/api/organizations')
    ]);

    if (actsRes.status === 'fulfilled' && actsRes.value.ok) {
      const data = await actsRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        writeLS(LS_ACTIVITIES, data.data.filter((a: Activity) => !isSenssoFy2027Activity(a)));
      }
    }

    if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
      const data = await usersRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        writeLS(LS_USERS, data.data);
      }
    }

    if (plansRes.status === 'fulfilled' && plansRes.value.ok) {
      const data = await plansRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        writeLS(LS_FOLDERS, data.data);
      }
    }

    if (orgsRes.status === 'fulfilled' && orgsRes.value.ok) {
      const data = await orgsRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const cached = readLS<StudentOrganization>(LS_ORGANIZATIONS);
        const mergedOrgs = data.data.map((dbOrg: StudentOrganization) => {
          const fallback = cached.find(c => c.id === dbOrg.id) || ORGANIZATIONS.find(o => o.id === dbOrg.id) || {};
          return {
            ...fallback,
            ...dbOrg,
            memberCount: Number(dbOrg.memberCount ?? (fallback as any).memberCount ?? 50),
            attachmentCount: Number(dbOrg.attachmentCount ?? (fallback as any).attachmentCount ?? 5),
            nature: dbOrg.nature || (fallback as any).nature || 'Academic & Student Governance',
            facultyAdviser: dbOrg.facultyAdviser || (fallback as any).facultyAdviser || 'Faculty Adviser',
            officeLocation: dbOrg.officeLocation || (fallback as any).officeLocation || 'Campus Office',
            objectives: dbOrg.objectives || (fallback as any).objectives || [],
            membersList: dbOrg.membersList || (fallback as any).membersList || [],
            attachments: dbOrg.attachments || (fallback as any).attachments || []
          };
        });
        writeLS(LS_ORGANIZATIONS, mergedOrgs);
      }
    }
  } catch (err) {
    console.warn('[DB] Backend API sync note (using local fallback cache):', err);
  }
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
  const source = data.length > 0 ? data : INITIAL_ACTIVITIES;
  const filtered = source.filter(a => !isSenssoFy2027Activity(a));
  onData(filtered);
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
  if (isSenssoFy2027Activity(activity)) {
    await deleteActivityFromDb(activity.id);
    return;
  }
  const list = readLS<Activity>(LS_ACTIVITIES).filter(a => !isSenssoFy2027Activity(a));
  const idx = list.findIndex((a) => a.id === activity.id);
  if (idx !== -1) {
    list[idx] = sanitizeForFirestore(activity);
  } else {
    list.unshift(sanitizeForFirestore(activity));
  }
  writeLS(LS_ACTIVITIES, list);
  lastSyncTime.value = new Date();

  // Persist directly to PostgreSQL via backend API
  fetch('/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
  }).catch(err => console.warn('[DB] PostgreSQL activity save sync:', err));
}

/**
 * Delete an Activity from localStorage.
 */
export async function deleteActivityFromDb(activityId: string): Promise<void> {
  const list = readLS<Activity>(LS_ACTIVITIES).filter((a) => a.id !== activityId);
  writeLS(LS_ACTIVITIES, list);
  lastSyncTime.value = new Date();

  // Persist deletion to PostgreSQL via backend API
  fetch(`/api/activities/${encodeURIComponent(activityId)}`, {
    method: 'DELETE'
  }).catch(err => console.warn('[DB] PostgreSQL activity delete sync:', err));
}

/**
 * Save multiple activities in batch (merge by id).
 */
export async function batchSaveActivitiesToDb(activities: Activity[]): Promise<void> {
  const existing = readLS<Activity>(LS_ACTIVITIES).filter(a => !isSenssoFy2027Activity(a));
  const map = new Map<string, Activity>();
  existing.forEach((a) => map.set(a.id, a));
  activities.filter(a => !isSenssoFy2027Activity(a)).forEach((a) => map.set(a.id, sanitizeForFirestore(a)));
  writeLS(LS_ACTIVITIES, Array.from(map.values()));
  lastSyncTime.value = new Date();

  for (const act of activities) {
    saveActivityToDb(act).catch(() => {});
  }
}

/**
 * Overwrite all activities in localStorage with the given collection.
 * Used during Action Plan re-import to update activities in place without duplicates.
 */
export async function writeAllActivitiesToDb(activities: Activity[]): Promise<void> {
  const cleaned = activities.filter(a => !isSenssoFy2027Activity(a));
  writeLS(LS_ACTIVITIES, cleaned.map((a) => sanitizeForFirestore(a)));
  lastSyncTime.value = new Date();

  for (const act of cleaned) {
    saveActivityToDb(act).catch(() => {});
  }
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

  // Persist directly to PostgreSQL via backend API
  fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account)
  }).catch(err => console.warn('[DB] PostgreSQL user save sync:', err));
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

  // Persist directly to PostgreSQL via backend API
  fetch('/api/action-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folder)
  }).catch(err => console.warn('[DB] PostgreSQL action plan save sync:', err));
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

  // Persist directly to PostgreSQL via backend API
  fetch('/api/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(org)
  }).catch(err => console.warn('[DB] PostgreSQL organization save sync:', err));
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
    projectId: 'APMaMS',
    databaseId: 'PostgreSQL 18 (schema: apmams)',
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
