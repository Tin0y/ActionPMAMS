import { ref } from 'vue';
import { Activity, UserAccount, ActionPlanFolder, StudentOrganization, FiscalYear, FiscalYearStatus, ActionPlanTemplate } from '../types';
import { 
  INITIAL_ACTIVITIES, 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_ACTION_PLAN_FOLDERS, 
  INITIAL_FISCAL_YEARS,
  INITIAL_ACTION_PLAN_TEMPLATES,
  INITIAL_ORGANIZATIONS,
  ORGANIZATIONS,
  DEFAULT_WORKFLOW_TIMELINE,
  isOrgMatch,
  isCollegeOrg,
  getInitialTimelineForActionPlan,
  syncGlobalOrganizationsList
} from '../data/initialData';
import { getDadControlNo } from '../utils/dadSignatories';
import { detectAccountParentOrgAndRole } from '../utils/organizationUtils';
import { validateTemplateName, generateUniqueTemplateCopyName } from '../utils/templateValidation';
import { sanitizeUserAccount } from './auth';

// LocalStorage keys
export const LS_ACTIVITIES = 'msun_action_plan_activities';
export const LS_USERS = 'msun_user_accounts';
export const LS_FOLDERS = 'msun_action_plan_folders';
export const LS_ORGANIZATIONS = 'msun_student_organizations';
export const LS_FISCAL_YEARS = 'msun_fiscal_years';
export const LS_TEMPLATES = 'msun_action_plan_templates';

// Generic helpers
export function readLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T[];
      if (key === LS_USERS && Array.isArray(parsed)) {
        return parsed.map(u => sanitizeUserAccount(u) as unknown as T);
      }
      if (key === LS_ORGANIZATIONS && Array.isArray(parsed) && parsed.length > 0) {
        syncGlobalOrganizationsList(parsed as unknown as StudentOrganization[]);
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function writeLS<T>(key: string, data: T[]): void {
  try {
    const payload =
      key === LS_USERS && Array.isArray(data)
        ? data.map(u => sanitizeUserAccount(u))
        : data;
    localStorage.setItem(key, JSON.stringify(payload));
    if (key === LS_ORGANIZATIONS && Array.isArray(data)) {
      const orgList = data as unknown as StudentOrganization[];
      syncGlobalOrganizationsList(orgList);
      if (typeof liveOrganizations !== 'undefined') {
        liveOrganizations.value = [...orgList];
      }
    }
  } catch {
    // ignore
  }
}

export const liveOrganizations = ref<StudentOrganization[]>(
  (() => {
    const cached = readLS<StudentOrganization>(LS_ORGANIZATIONS);
    const list = cached.length > 0 ? cached : INITIAL_ORGANIZATIONS.map(o => ({ ...o }));
    syncGlobalOrganizationsList(list);
    return list;
  })()
);

export type DbStatus = 'connecting' | 'connected' | 'syncing' | 'error' | 'offline';

// Unsubscribe type — kept for API compatibility with callers
export type Unsubscribe = () => void;

export const dbStatus = ref<DbStatus>('connected');
export const dbErrorMessage = ref<string>('');
export const lastSyncTime = ref<Date | null>(new Date());

const hasLS = (key: string): boolean => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
};

export function notifyCollectionUpdated(eventName: string): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

export function notifyOrganizationsUpdated(): void {
  notifyCollectionUpdated('msun-organizations-updated');
}

export function notifyActivitiesUpdated(): void {
  notifyCollectionUpdated('msun-activities-updated');
}

export function notifyFoldersUpdated(): void {
  notifyCollectionUpdated('msun-folders-updated');
}

export function notifyUsersUpdated(): void {
  notifyCollectionUpdated('msun-users-updated');
}

export function notifyFiscalYearsUpdated(): void {
  notifyCollectionUpdated('msun-fiscal-years-updated');
}

function subscribeToLocalCollection<T>(
  eventName: string,
  storageKey: string,
  getter: () => T[],
  onData: (items: T[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  onData(getter());
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = () => {
    try {
      onData(getter());
    } catch (e) {
      if (onError && e instanceof Error) onError(e);
    }
  };
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === storageKey) handler();
  };
  window.addEventListener(eventName, handler);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(eventName, handler);
    window.removeEventListener('storage', onStorage);
  };
}

class BackendRejectionError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'BackendRejectionError';
    this.status = status;
  }
}

async function apiSyncRequest(url: string, init: RequestInit = {}): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      ...init
    });
    if (res.ok) {
      lastSyncTime.value = new Date();
      dbStatus.value = 'connected';
      return res;
    }
    // Allow static/offline preview fallback when no backend API endpoint is hosted
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      return null;
    }
    let message = `API ${init.method || 'GET'} ${url} failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.message) message = errBody.message;
    } catch {
      // ignore parse failure
    }
    dbStatus.value = 'error';
    dbErrorMessage.value = message;
    throw new BackendRejectionError(res.status, message);
  } catch (err: any) {
    if (err instanceof BackendRejectionError) {
      throw err;
    }
    console.warn(`[DB] Offline/static fallback for ${url}:`, err?.message || err);
    return null;
  }
}

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
export function isSenssoFy2027Activity(_act: Activity): boolean {
  return false;
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
          act.accomplishmentForm.reviewedByTitle = `OSD Coordinator / ${org} Adviser`;
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
      // Backfill DAD form for historical FY 2026 seeded demo records in Stages 2-7
      if (!act.designForm?.isCompleted && act.id?.startsWith('ACT-2026-') && act.id !== 'ACT-2026-012') {
        const seed = INITIAL_ACTIVITIES.find((s) => s.id === act.id);
        if (seed?.designForm?.isCompleted) {
          act.designForm = seed.designForm;
          modified = true;
        }
      }
      // Enforce strict rule: Any activity without a filled-out DAD form CANNOT be Approved or past Stage 1
      if (!act.designForm?.isCompleted && act.status !== 'Rejected' && act.approvalStatus !== 'Rejected') {
        const expectedStage = isCollegeOrg(act.orgId)
          ? 'Stage 1: College Organization Submission'
          : 'Stage 1: Organization Submission';
        if (
          act.status !== 'Draft' ||
          act.approvalStatus !== 'Draft' ||
          act.workflowStatus !== 'DRAFT' ||
          act.approvalStageIndex !== 1 ||
          act.approvalStage !== expectedStage ||
          !act.timeline ||
          act.timeline.length === 0 ||
          act.timeline[0]?.status !== 'in_progress' ||
          act.timeline.some((s, idx) => idx > 0 && s.status !== 'pending')
        ) {
          act.status = 'Draft';
          act.workflowStatus = 'DRAFT';
          act.approvalStatus = 'Draft';
          act.approvalStageIndex = 1;
          act.approvalStage = expectedStage;
          act.timeline = getInitialTimelineForActionPlan(act.orgId);
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
    writeLS(LS_USERS, Array.from(merged.values()));
  }

  // Ensure existing users have updated parentOrg, actualOrg, and orgName for renamed organizations
  let currentUsers = readLS<UserAccount>(LS_USERS);
  let usersChanged = false;
  for (const u of currentUsers) {
    if (
      u.role === 'ROLE_ADMIN' || 
      u.id === 'usr-admin-01' || 
      u.id === 'usr-sysad-hazel' ||
      u.email === 'admin@msunaawan.edu.ph' || 
      u.email === 'hazelanne.mapula@msunaawan.edu.ph' || 
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
      u.role === 'Organization Adviser' ||
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
  }
  // Always rewrite sanitized user list on initialization to scrub any legacy plaintext password keys
  try {
    localStorage.removeItem('msun_active_user_id');
  } catch {
    // ignore
  }
  writeLS(LS_USERS, currentUsers);

  // 3. Action plan folders
  const rawFolders = readLS<ActionPlanFolder>(LS_FOLDERS);
  const folders = rawFolders.filter(f => f.id !== 'AP-FY2026' && f.fiscalYear !== 'FY 2026' && f.fiscalYear !== '2026');
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
    }
    writeLS(LS_FOLDERS, folders);
  }

  // 4. Organizations
  const orgs = readLS<StudentOrganization>(LS_ORGANIZATIONS);
  if (orgs.length === 0) {
    const seed = (INITIAL_ORGANIZATIONS && INITIAL_ORGANIZATIONS.length > 0) ? INITIAL_ORGANIZATIONS : ORGANIZATIONS;
    const sanitizedSeed = seed.map(org => {
      const copy = { ...org };
      return copy;
    });
    writeLS(LS_ORGANIZATIONS, sanitizedSeed);
    notifyOrganizationsUpdated();
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
      }
    }
    if (changed) {
      writeLS(LS_ORGANIZATIONS, orgs);
      notifyOrganizationsUpdated();
    } else {
      syncGlobalOrganizationsList(orgs);
      liveOrganizations.value = [...orgs];
    }
  }

  // 5. Fiscal Years
  const rawFys = readLS<FiscalYear>(LS_FISCAL_YEARS);
  const cleanFys = rawFys.filter(f => f.id !== 'FY-2026' && f.name !== 'FY 2026' && f.fiscalYear !== 'FY 2026');
  if (cleanFys.length === 0) {
    writeLS(LS_FISCAL_YEARS, INITIAL_FISCAL_YEARS);
  } else if (cleanFys.length !== rawFys.length) {
    writeLS(LS_FISCAL_YEARS, cleanFys);
  }

  // Synchronize live records from PostgreSQL backend API
  await syncFromBackendApi();

  dbStatus.value = 'connected';
  lastSyncTime.value = new Date();
}

let inflightBackendSync: Promise<void> | null = null;

/**
 * Sync live data from PostgreSQL backend API into localStorage cache
 */
export async function syncFromBackendApi(isAdmin = false): Promise<void> {
  if (inflightBackendSync) return inflightBackendSync;

  inflightBackendSync = (async () => {
    try {
      const fetchInit: RequestInit = { credentials: 'include', cache: 'no-store' };
      const fetchPromises: Promise<Response>[] = [
        fetch('/api/activities', fetchInit),
        fetch('/api/action-plans', fetchInit),
        fetch('/api/organizations', fetchInit),
        fetch('/api/fiscal-years', fetchInit),
        fetch('/api/templates', fetchInit)
      ];

      if (isAdmin) {
        fetchPromises.push(fetch('/api/users', fetchInit));
      }

      const results = await Promise.allSettled(fetchPromises);
      const actsRes = results[0];
      const plansRes = results[1];
      const orgsRes = results[2];
      const fyRes = results[3];
      const tplRes = results[4];
      const usersRes = isAdmin ? results[5] : null;

      if (actsRes.status === 'fulfilled' && actsRes.value.ok) {
        const data = await actsRes.value.json();
        if (data && Array.isArray(data.data)) {
          writeLS(LS_ACTIVITIES, data.data.filter((a: Activity) => !isSenssoFy2027Activity(a)));
          notifyActivitiesUpdated();
        }
      }

      if (usersRes && usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const data = await usersRes.value.json();
        if (data && Array.isArray(data.data)) {
          writeLS(LS_USERS, data.data);
          notifyUsersUpdated();
        }
      }

      if (plansRes.status === 'fulfilled' && plansRes.value.ok) {
        const data = await plansRes.value.json();
        if (data && Array.isArray(data.data)) {
          writeLS(
            LS_FOLDERS,
            data.data.filter((f: ActionPlanFolder) => f.id !== 'AP-FY2026' && f.fiscalYear !== 'FY 2026' && f.fiscalYear !== '2026')
          );
          notifyFoldersUpdated();
        }
      }

      if (fyRes.status === 'fulfilled' && fyRes.value.ok) {
        const data = await fyRes.value.json();
        if (data && Array.isArray(data.data)) {
          writeLS(
            LS_FISCAL_YEARS,
            data.data.filter((f: FiscalYear) => f.id !== 'FY-2026' && f.name !== 'FY 2026' && f.fiscalYear !== 'FY 2026')
          );
          notifyFiscalYearsUpdated();
        }
      }

      if (tplRes.status === 'fulfilled' && tplRes.value.ok) {
        const data = await tplRes.value.json();
        const list = data?.data || data;
        if (Array.isArray(list) && list.length > 0) {
          writeLS(LS_TEMPLATES, list);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('apmams:templates-updated', { detail: list }));
          }
        }
      }

      if (orgsRes.status === 'fulfilled' && orgsRes.value.ok) {
        const data = await orgsRes.value.json();
        if (data && Array.isArray(data.data)) {
          const cached = readLS<StudentOrganization>(LS_ORGANIZATIONS);
          const mergedOrgs = data.data.map((dbOrg: StudentOrganization) => {
            const fallback = cached.find(c => c.id === dbOrg.id) || (INITIAL_ORGANIZATIONS || ORGANIZATIONS).find(o => o.id === dbOrg.id) || {};
            const hasServerMembers = Array.isArray(dbOrg.membersList);
            const hasServerAttachments = Array.isArray(dbOrg.attachments);
            const members = hasServerMembers ? dbOrg.membersList! : [];
            const attachments = hasServerAttachments ? dbOrg.attachments! : [];
            return {
              ...fallback,
              ...dbOrg,
              memberCount: hasServerMembers ? members.length : Number(dbOrg.memberCount ?? 0),
              attachmentCount: hasServerAttachments ? attachments.length : Number(dbOrg.attachmentCount ?? 0),
              nature: dbOrg.nature || (fallback as any).nature || 'Academic & Student Governance',
              facultyAdviser: dbOrg.facultyAdviser || (fallback as any).facultyAdviser || 'Faculty Adviser',
              officeLocation: dbOrg.officeLocation || (fallback as any).officeLocation || 'Campus Office',
              objectives: dbOrg.objectives || (fallback as any).objectives || [],
              membersList: members,
              attachments
            };
          });
          writeLS(LS_ORGANIZATIONS, mergedOrgs);
          notifyOrganizationsUpdated();
        }
      }

      lastSyncTime.value = new Date();
      dbStatus.value = 'connected';
    } catch (err) {
      dbStatus.value = 'error';
      console.warn('[DB] Backend API sync note (using local fallback cache):', err);
    } finally {
      inflightBackendSync = null;
    }
  })();

  return inflightBackendSync;
}

/**
 * Subscription to Activities — syncs immediately and updates on collection sync/save events.
 */
export function subscribeToActivities(
  onData: (activities: Activity[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const getter = () => {
    const source = hasLS(LS_ACTIVITIES) ? readLS<Activity>(LS_ACTIVITIES) : INITIAL_ACTIVITIES;
    return source.filter(a => !isSenssoFy2027Activity(a));
  };
  return subscribeToLocalCollection('msun-activities-updated', LS_ACTIVITIES, getter, onData, onError);
}

/**
 * Subscription to User Accounts.
 */
export function subscribeToUserAccounts(
  onData: (users: UserAccount[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const getter = () => {
    const data = readLS<UserAccount>(LS_USERS);
    return data.length > 0 ? data : INITIAL_USER_ACCOUNTS;
  };
  return subscribeToLocalCollection('msun-users-updated', LS_USERS, getter, onData, onError);
}

/**
 * Subscription to Action Plan Folders.
 */
export function subscribeToActionPlanFolders(
  onData: (folders: ActionPlanFolder[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const getter = () => {
    const source = hasLS(LS_FOLDERS) ? readLS<ActionPlanFolder>(LS_FOLDERS) : INITIAL_ACTION_PLAN_FOLDERS;
    return source.filter(f => f.id !== 'AP-FY2026' && f.fiscalYear !== 'FY 2026' && f.fiscalYear !== '2026');
  };
  return subscribeToLocalCollection('msun-folders-updated', LS_FOLDERS, getter, onData, onError);
}

/**
 * Subscription to Organizations.
 */
export function subscribeToOrganizations(
  onData: (orgs: StudentOrganization[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const getOrgs = (): StudentOrganization[] => {
    if (hasLS(LS_ORGANIZATIONS)) {
      return readLS<StudentOrganization>(LS_ORGANIZATIONS);
    }
    const seed = (INITIAL_ORGANIZATIONS && INITIAL_ORGANIZATIONS.length > 0) ? INITIAL_ORGANIZATIONS : ORGANIZATIONS;
    const cloned = JSON.parse(JSON.stringify(seed));
    writeLS(LS_ORGANIZATIONS, cloned);
    return cloned;
  };
  return subscribeToLocalCollection('msun-organizations-updated', LS_ORGANIZATIONS, getOrgs, onData, onError);
}

/**
 * Save or update an Activity in localStorage and synchronize with PostgreSQL.
 */
export async function saveActivityToDb(activity: Activity): Promise<void> {
  if (isSenssoFy2027Activity(activity)) {
    await deleteActivityFromDb(activity.id);
    return;
  }
  const previousList = readLS<Activity>(LS_ACTIVITIES);
  const list = previousList.filter(a => !isSenssoFy2027Activity(a));
  const idx = list.findIndex((a) => a.id === activity.id);
  if (idx !== -1) {
    list[idx] = sanitizeForFirestore(activity);
  } else {
    list.unshift(sanitizeForFirestore(activity));
  }
  writeLS(LS_ACTIVITIES, list);
  notifyActivitiesUpdated();

  try {
    await apiSyncRequest('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity)
    });
  } catch (err) {
    writeLS(LS_ACTIVITIES, previousList);
    notifyActivitiesUpdated();
    throw err;
  }
}

/**
 * Delete an Activity from localStorage and PostgreSQL.
 */
export async function deleteActivityFromDb(activityId: string): Promise<void> {
  const previousList = readLS<Activity>(LS_ACTIVITIES);
  const list = previousList.filter((a) => a.id !== activityId);
  writeLS(LS_ACTIVITIES, list);
  notifyActivitiesUpdated();

  try {
    await apiSyncRequest(`/api/activities/${encodeURIComponent(activityId)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    writeLS(LS_ACTIVITIES, previousList);
    notifyActivitiesUpdated();
    throw err;
  }
}

/**
 * Save multiple activities in batch (merge by id) and remove explicitly deleted draft IDs.
 */
export async function batchSaveActivitiesToDb(activities: Activity[], deletedIds: string[] = []): Promise<void> {
  const cleaned = activities.filter(a => !isSenssoFy2027Activity(a));
  const cleanDeletedIds = Array.from(new Set((deletedIds || []).filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))));
  if (cleaned.length === 0 && cleanDeletedIds.length === 0) return;

  const previousList = readLS<Activity>(LS_ACTIVITIES);
  const existing = previousList.filter(a => !isSenssoFy2027Activity(a));
  const deletedSet = new Set(cleanDeletedIds);
  const map = new Map<string, Activity>();
  existing.forEach((a) => {
    if (!deletedSet.has(a.id)) {
      map.set(a.id, a);
    }
  });
  cleaned.forEach((a) => map.set(a.id, sanitizeForFirestore(a)));
  writeLS(LS_ACTIVITIES, Array.from(map.values()));
  notifyActivitiesUpdated();

  try {
    await apiSyncRequest('/api/activities/batch-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: cleaned, deletedIds: cleanDeletedIds })
    });
  } catch (err) {
    writeLS(LS_ACTIVITIES, previousList);
    notifyActivitiesUpdated();
    throw err;
  }
}

/**
 * Overwrite all activities in localStorage with the given collection.
 */
export async function writeAllActivitiesToDb(activities: Activity[]): Promise<void> {
  const cleaned = activities.filter(a => !isSenssoFy2027Activity(a));
  const previousList = readLS<Activity>(LS_ACTIVITIES);
  writeLS(LS_ACTIVITIES, cleaned.map((a) => sanitizeForFirestore(a)));
  notifyActivitiesUpdated();

  if (cleaned.length === 0) return;
  try {
    await apiSyncRequest('/api/activities/batch-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaned)
    });
  } catch (err) {
    writeLS(LS_ACTIVITIES, previousList);
    notifyActivitiesUpdated();
    throw err;
  }
}

/**
 * Save or update a User Account in localStorage and PostgreSQL.
 */
export async function saveUserAccountToDb(account: UserAccount): Promise<void> {
  const sanitized = sanitizeForFirestore(sanitizeUserAccount(account));
  const previousList = readLS<UserAccount>(LS_USERS);
  const list = [...previousList];
  const idx = list.findIndex((u) => u.id === sanitized.id);
  if (idx !== -1) {
    list[idx] = sanitized;
  } else {
    list.unshift(sanitized);
  }
  writeLS(LS_USERS, list);
  notifyUsersUpdated();

  try {
    await apiSyncRequest(`/api/users/${encodeURIComponent(sanitized.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized)
    });
  } catch (err) {
    writeLS(LS_USERS, previousList);
    notifyUsersUpdated();
    throw err;
  }
}

/**
 * Save or update an Action Plan Folder in localStorage and PostgreSQL.
 */
export async function saveActionPlanFolderToDb(folder: ActionPlanFolder): Promise<void> {
  const previousList = readLS<ActionPlanFolder>(LS_FOLDERS);
  const list = [...previousList];
  const idx = list.findIndex((f) => f.id === folder.id);
  if (idx !== -1) {
    list[idx] = sanitizeForFirestore(folder);
  } else {
    list.unshift(sanitizeForFirestore(folder));
  }
  writeLS(LS_FOLDERS, list);
  notifyFoldersUpdated();

  try {
    await apiSyncRequest('/api/action-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folder)
    });
  } catch (err) {
    writeLS(LS_FOLDERS, previousList);
    notifyFoldersUpdated();
    throw err;
  }
}

/**
 * Save or update a Student Organization in localStorage and PostgreSQL.
 */
export async function saveOrganizationToDb(org: StudentOrganization): Promise<void> {
  const membersList = Array.isArray(org.membersList) ? org.membersList : [];
  const attachments = Array.isArray(org.attachments) ? org.attachments : [];
  const normalizedOrg: StudentOrganization = {
    ...org,
    membersList,
    attachments,
    memberCount: Array.isArray(org.membersList) ? membersList.length : Math.max(0, Number(org.memberCount ?? 0)),
    attachmentCount: Array.isArray(org.attachments) ? attachments.length : Math.max(0, Number(org.attachmentCount ?? 0))
  };

  const previousList = readLS<StudentOrganization>(LS_ORGANIZATIONS);
  const list = [...previousList];
  const idx = list.findIndex((o) => o.id === normalizedOrg.id);
  if (idx !== -1) {
    list[idx] = sanitizeForFirestore(normalizedOrg);
  } else {
    list.unshift(sanitizeForFirestore(normalizedOrg));
  }
  writeLS(LS_ORGANIZATIONS, list);
  notifyOrganizationsUpdated();

  try {
    await apiSyncRequest('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedOrg)
    });
  } catch (err) {
    writeLS(LS_ORGANIZATIONS, previousList);
    notifyOrganizationsUpdated();
    throw err;
  }
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


/**
 * Fiscal Year Operations
 */
export function getFiscalYears(): FiscalYear[] {
  const list = readLS<FiscalYear>(LS_FISCAL_YEARS);
  const cleanList = list.filter(f => f.id !== 'FY-2026' && f.name !== 'FY 2026' && f.fiscalYear !== 'FY 2026');
  if (cleanList.length !== list.length) {
    writeLS(LS_FISCAL_YEARS, cleanList);
  }
  return cleanList.length > 0 ? cleanList : INITIAL_FISCAL_YEARS;
}

export async function saveFiscalYearToDb(fy: FiscalYear): Promise<void> {
  const previousList = getFiscalYears();
  const list = [...previousList];
  const idx = list.findIndex(f => f.id === fy.id);
  const sanitized = sanitizeForFirestore(fy);
  if (idx !== -1) {
    list[idx] = sanitized;
  } else {
    list.unshift(sanitized);
  }
  writeLS(LS_FISCAL_YEARS, list);
  notifyFiscalYearsUpdated();

  try {
    const reqInit: RequestInit = {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized)
    };
    if (idx !== -1) {
      const putRes = await apiSyncRequest(
        `/api/fiscal-years/${encodeURIComponent(sanitized.id)}`,
        { ...reqInit, method: 'PUT' }
      );
      if (putRes === null) {
        await apiSyncRequest('/api/fiscal-years', { ...reqInit, method: 'POST' });
      }
    } else {
      await apiSyncRequest('/api/fiscal-years', { ...reqInit, method: 'POST' });
    }
  } catch (err) {
    writeLS(LS_FISCAL_YEARS, previousList);
    notifyFiscalYearsUpdated();
    throw err;
  }
}

function syncFolderLockStatusForFy(fy: FiscalYear, folderStatus: ActionPlanFolder['status']): void {
  const digits = (fy.name || fy.fiscalYear || fy.id || '').replace(/\D/g, '');
  if (!digits) return;
  const folders = readLS<ActionPlanFolder>(LS_FOLDERS);
  let changed = false;
  const updated = folders.map(f => {
    const fDigits = (f.fiscalYear || f.id || '').replace(/\D/g, '');
    if (fDigits === digits && f.status !== folderStatus) {
      changed = true;
      return { ...f, status: folderStatus };
    }
    return f;
  });
  if (changed) {
    writeLS(LS_FOLDERS, updated);
    notifyFoldersUpdated();
  }
}

export async function activateFiscalYearInDb(fyId: string): Promise<FiscalYear | null> {
  const previousList = getFiscalYears();
  const list = previousList.map(f => ({ ...f }));
  const fy = list.find(f => f.id === fyId);
  if (!fy) return null;
  fy.status = 'Open';
  fy.isSubmissionActive = true;
  fy.updatedAt = new Date().toISOString();
  writeLS(LS_FISCAL_YEARS, list);
  notifyFiscalYearsUpdated();
  syncFolderLockStatusForFy(fy, 'Open');

  try {
    await apiSyncRequest(`/api/fiscal-years/${fyId}/activate`, { method: 'POST' });
  } catch (err) {
    writeLS(LS_FISCAL_YEARS, previousList);
    notifyFiscalYearsUpdated();
    throw err;
  }
  return fy;
}

export async function closeFiscalYearInDb(
  fyId: string,
  newStatus: FiscalYearStatus = 'Under Review'
): Promise<FiscalYear | null> {
  const previousList = getFiscalYears();
  const list = previousList.map(f => ({ ...f }));
  const fy = list.find(f => f.id === fyId);
  if (!fy) return null;
  fy.status = newStatus;
  fy.isSubmissionActive = false;
  fy.updatedAt = new Date().toISOString();
  writeLS(LS_FISCAL_YEARS, list);
  notifyFiscalYearsUpdated();
  syncFolderLockStatusForFy(fy, 'Locked');

  try {
    await apiSyncRequest(`/api/fiscal-years/${fyId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (err) {
    writeLS(LS_FISCAL_YEARS, previousList);
    notifyFiscalYearsUpdated();
    throw err;
  }
  return fy;
}

export async function archiveFiscalYearInDb(fyId: string): Promise<FiscalYear | null> {
  const previousList = getFiscalYears();
  const list = previousList.map(f => ({ ...f }));
  const fy = list.find(f => f.id === fyId);
  if (!fy) return null;
  fy.status = 'Archived';
  fy.isSubmissionActive = false;
  fy.updatedAt = new Date().toISOString();
  writeLS(LS_FISCAL_YEARS, list);
  notifyFiscalYearsUpdated();
  syncFolderLockStatusForFy(fy, 'Archived');

  try {
    await apiSyncRequest(`/api/fiscal-years/${fyId}/archive`, { method: 'POST' });
  } catch (err) {
    writeLS(LS_FISCAL_YEARS, previousList);
    notifyFiscalYearsUpdated();
    throw err;
  }
  return fy;
}

export async function deleteFiscalYearFromDb(fyId: string, fyName?: string): Promise<boolean> {
  const previousList = getFiscalYears();
  const previousFolders = readLS<ActionPlanFolder>(LS_FOLDERS);
  const target = previousList.find(f => f.id === fyId || f.name === fyName || f.name === fyId);
  const targetName = target?.name || fyName || fyId;
  const targetId = target?.id || fyId;

  const nextList = previousList.filter(f => f.id !== targetId && f.name !== targetName);
  writeLS(LS_FISCAL_YEARS, nextList);
  notifyFiscalYearsUpdated();

  // Also remove associated action plan folder from local storage
  const nextFolders = previousFolders.filter(f => f.fiscalYear !== targetName && f.id !== `AP-${targetName.replace(/\s+/g, '')}`);
  writeLS(LS_FOLDERS, nextFolders);
  notifyFoldersUpdated();

  try {
    await apiSyncRequest(`/api/fiscal-years/${encodeURIComponent(targetId)}`, { method: 'DELETE' });
  } catch (err) {
    writeLS(LS_FISCAL_YEARS, previousList);
    notifyFiscalYearsUpdated();
    writeLS(LS_FOLDERS, previousFolders);
    notifyFoldersUpdated();
    throw err;
  }

  return true;
}

export async function deleteActionPlanFolderFromDb(folderIdOrFy: string): Promise<boolean> {
  const previousFolders = readLS<ActionPlanFolder>(LS_FOLDERS);
  const nextFolders = previousFolders.filter(
    f => f.id !== folderIdOrFy && f.fiscalYear !== folderIdOrFy && f.id !== `AP-${folderIdOrFy.replace(/\s+/g, '')}`
  );
  writeLS(LS_FOLDERS, nextFolders);
  notifyFoldersUpdated();

  try {
    await apiSyncRequest(`/api/action-plans/${encodeURIComponent(folderIdOrFy)}`, { method: 'DELETE' });
  } catch (err) {
    writeLS(LS_FOLDERS, previousFolders);
    notifyFoldersUpdated();
    throw err;
  }

  return true;
}

/**
 * Action Plan Template Operations
 */
export function getActionPlanTemplates(): ActionPlanTemplate[] {
  const list = readLS<ActionPlanTemplate>(LS_TEMPLATES);
  return list.length > 0 ? list : INITIAL_ACTION_PLAN_TEMPLATES;
}

export async function syncTemplatesWithBackend(): Promise<ActionPlanTemplate[]> {
  try {
    const res = await fetch('/api/templates', { credentials: 'include' });
    if (res.ok) {
      const json = await res.json();
      const list = json.data || json;
      if (Array.isArray(list) && list.length > 0) {
        writeLS(LS_TEMPLATES, list);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('apmams:templates-updated', { detail: list }));
        }
        return list;
      }
    }
  } catch (err) {
    console.warn('[DB] Template API fetch sync warning:', err);
  }
  return getActionPlanTemplates();
}

export async function saveTemplateToDb(tpl: ActionPlanTemplate): Promise<void> {
  const previousList = getActionPlanTemplates();
  const nameCheck = validateTemplateName(tpl.name, previousList, tpl.id);
  if (!nameCheck.valid) {
    throw new Error(nameCheck.error || 'Invalid template name.');
  }

  const list = [...previousList];
  const idx = list.findIndex(t => t.id === tpl.id);
  const sanitized = sanitizeForFirestore({ ...tpl, name: nameCheck.normalizedName });
  if (idx !== -1) {
    list[idx] = sanitized;
  } else {
    list.unshift(sanitized);
  }
  writeLS(LS_TEMPLATES, list);
  lastSyncTime.value = new Date();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apmams:templates-updated', { detail: list }));
  }

  try {
    await apiSyncRequest('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitized)
    });
  } catch (err) {
    writeLS(LS_TEMPLATES, previousList);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apmams:templates-updated', { detail: previousList }));
    }
    throw err;
  }
}

export async function duplicateTemplateInDb(templateId: string, newName?: string): Promise<ActionPlanTemplate | null> {
  const list = getActionPlanTemplates();
  const source = list.find(t => t.id === templateId);
  if (!source) return null;

  const resolvedName = newName
    ? newName
    : generateUniqueTemplateCopyName(source.name, list);

  const newId = `TEMPLATE-${Date.now().toString(36).toUpperCase()}`;
  const duplicated: ActionPlanTemplate = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    name: resolvedName,
    version: 1,
    isDefault: false,
    status: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await saveTemplateToDb(duplicated);
  return duplicated;
}

export async function publishTemplateInDb(templateId: string): Promise<ActionPlanTemplate | null> {
  const list = getActionPlanTemplates();
  const existing = list.find(t => t.id === templateId);
  if (!existing) return null;

  const updated: ActionPlanTemplate = {
    ...existing,
    status: 'Published',
    version: existing.version || 1,
    updatedAt: new Date().toISOString()
  };
  await saveTemplateToDb(updated);
  return updated;
}

export async function deleteTemplateFromDb(templateId: string): Promise<boolean> {
  const previousList = getActionPlanTemplates();
  const target = previousList.find(t => t.id === templateId);
  if (!target) return false;
  if (target.isDefault || target.id === 'TEMPLATE-MSUN-DEFAULT') {
    throw new Error('Cannot delete default system template');
  }
  const filtered = previousList.filter(t => t.id !== templateId);
  writeLS(LS_TEMPLATES, filtered);
  lastSyncTime.value = new Date();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apmams:templates-updated', { detail: filtered }));
  }

  try {
    await apiSyncRequest(`/api/templates/${encodeURIComponent(templateId)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    writeLS(LS_TEMPLATES, previousList);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apmams:templates-updated', { detail: previousList }));
    }
    throw err;
  }

  return true;
}
