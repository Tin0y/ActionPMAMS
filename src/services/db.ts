import { ref } from 'vue';
import { Activity, UserAccount, ActionPlanFolder, StudentOrganization, FiscalYear, ActionPlanTemplate } from '../types';
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
  getInitialTimelineForActionPlan
} from '../data/initialData';
import { getDadControlNo } from '../utils/dadSignatories';
import { detectAccountParentOrgAndRole } from '../utils/organizationUtils';
import { sanitizeUserAccount } from './auth';

// LocalStorage keys
const LS_ACTIVITIES = 'msun_action_plan_activities';
const LS_USERS = 'msun_user_accounts';
const LS_FOLDERS = 'msun_action_plan_folders';
const LS_ORGANIZATIONS = 'msun_student_organizations';
const LS_FISCAL_YEARS = 'msun_fiscal_years';
const LS_TEMPLATES = 'msun_action_plan_templates';

// Generic helpers
function readLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T[];
      if (key === LS_USERS && Array.isArray(parsed)) {
        return parsed.map(u => sanitizeUserAccount(u) as unknown as T);
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLS<T>(key: string, data: T[]): void {
  try {
    const payload =
      key === LS_USERS && Array.isArray(data)
        ? data.map(u => sanitizeUserAccount(u))
        : data;
    localStorage.setItem(key, JSON.stringify(payload));
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

export function notifyOrganizationsUpdated(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('msun-organizations-updated'));
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
    const cleanActs = acts.filter(a => a.orgId !== 'TME' && !a.id?.includes('TME'));
    if (cleanActs.length !== acts.length) {
      acts = cleanActs;
      modified = true;
    }
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
  const cleanUsers = currentUsers.filter(u => u.orgId !== 'TME' && u.parentOrg !== 'TME' && !u.id?.toLowerCase().includes('tme') && !u.email?.toLowerCase().includes('tme.'));
  let usersChanged = cleanUsers.length !== currentUsers.length;
  currentUsers = cleanUsers;
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
    const cleanOrgs = orgs.filter(o => o.id !== 'TME' && o.acronym !== 'TME');
    if (cleanOrgs.length !== orgs.length) {
      orgs.length = 0;
      orgs.push(...cleanOrgs);
      changed = true;
    }
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

/**
 * Sync live data from PostgreSQL backend API into localStorage cache
 */
export async function syncFromBackendApi(isAdmin = false): Promise<void> {
  try {
    const fetchPromises: Promise<Response>[] = [
      fetch('/api/activities', { credentials: 'include' }),
      fetch('/api/action-plans', { credentials: 'include' }),
      fetch('/api/organizations', { credentials: 'include' }),
      fetch('/api/fiscal-years', { credentials: 'include' })
    ];

    if (isAdmin) {
      fetchPromises.push(fetch('/api/users', { credentials: 'include' }));
    }

    const results = await Promise.allSettled(fetchPromises);
    const actsRes = results[0];
    const plansRes = results[1];
    const orgsRes = results[2];
    const fyRes = results[3];
    const usersRes = isAdmin ? results[4] : null;

    if (actsRes.status === 'fulfilled' && actsRes.value.ok) {
      const data = await actsRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        writeLS(LS_ACTIVITIES, data.data.filter((a: Activity) => !isSenssoFy2027Activity(a)));
      }
    }

    if (usersRes && usersRes.status === 'fulfilled' && usersRes.value.ok) {
      const data = await usersRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        writeLS(LS_USERS, data.data);
      }
    }

    if (plansRes.status === 'fulfilled' && plansRes.value.ok) {
      const data = await plansRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        writeLS(LS_FOLDERS, data.data.filter((f: ActionPlanFolder) => f.id !== 'AP-FY2026' && f.fiscalYear !== 'FY 2026' && f.fiscalYear !== '2026'));
      }
    }

    if (fyRes && fyRes.status === 'fulfilled' && fyRes.value.ok) {
      const data = await fyRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        writeLS(LS_FISCAL_YEARS, data.data.filter((f: FiscalYear) => f.id !== 'FY-2026' && f.name !== 'FY 2026' && f.fiscalYear !== 'FY 2026'));
      }
    }

    if (orgsRes.status === 'fulfilled' && orgsRes.value.ok) {
      const data = await orgsRes.value.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const cached = readLS<StudentOrganization>(LS_ORGANIZATIONS);
        const mergedOrgs = data.data.map((dbOrg: StudentOrganization) => {
          const fallback = cached.find(c => c.id === dbOrg.id) || (INITIAL_ORGANIZATIONS || ORGANIZATIONS).find(o => o.id === dbOrg.id) || {};
          return {
            ...fallback,
            ...dbOrg,
            memberCount: Number(dbOrg.memberCount ?? (fallback as any).memberCount ?? 50),
            attachmentCount: Number(dbOrg.attachmentCount ?? (fallback as any).attachmentCount ?? 5),
            nature: dbOrg.nature || (fallback as any).nature || 'Academic & Student Governance',
            facultyAdviser: dbOrg.facultyAdviser || (fallback as any).facultyAdviser || 'Faculty Adviser',
            officeLocation: dbOrg.officeLocation || (fallback as any).officeLocation || 'Campus Office',
            objectives: dbOrg.objectives || (fallback as any).objectives || [],
            membersList: Array.isArray(dbOrg.membersList) && dbOrg.membersList.length > 0 ? dbOrg.membersList : ((fallback as any).membersList || []),
            attachments: Array.isArray(dbOrg.attachments) && dbOrg.attachments.length > 0 ? dbOrg.attachments : ((fallback as any).attachments || [])
          };
        });
        writeLS(LS_ORGANIZATIONS, mergedOrgs);
        notifyOrganizationsUpdated();
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
  const data = readLS<ActionPlanFolder>(LS_FOLDERS).filter(f => f.id !== 'AP-FY2026' && f.fiscalYear !== 'FY 2026' && f.fiscalYear !== '2026');
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
  const getOrgs = (): StudentOrganization[] => {
    let data = readLS<StudentOrganization>(LS_ORGANIZATIONS);
    if (!data || data.length === 0) {
      const seed = (INITIAL_ORGANIZATIONS && INITIAL_ORGANIZATIONS.length > 0) ? INITIAL_ORGANIZATIONS : ORGANIZATIONS;
      data = JSON.parse(JSON.stringify(seed));
      writeLS(LS_ORGANIZATIONS, data);
    }
    return data;
  };

  onData(getOrgs());

  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => {
    try {
      const data = getOrgs();
      onData(data);
    } catch (e) {
      if (onError && e instanceof Error) onError(e);
    }
  };

  window.addEventListener('msun-organizations-updated', handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('msun-organizations-updated', handler);
    window.removeEventListener('storage', handler);
  };
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
    credentials: 'include',
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
    method: 'DELETE',
    credentials: 'include'
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
  const sanitized = sanitizeForFirestore(sanitizeUserAccount(account));
  const list = readLS<UserAccount>(LS_USERS);
  const idx = list.findIndex((u) => u.id === sanitized.id);
  if (idx !== -1) {
    list[idx] = sanitized;
  } else {
    list.unshift(sanitized);
  }
  writeLS(LS_USERS, list);
  lastSyncTime.value = new Date();

  // Persist update to PostgreSQL via authenticated PUT endpoint
  fetch(`/api/users/${encodeURIComponent(sanitized.id)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized)
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
    credentials: 'include',
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
  notifyOrganizationsUpdated();
  lastSyncTime.value = new Date();

  // Persist directly to PostgreSQL via backend API
  fetch('/api/organizations', {
    method: 'POST',
    credentials: 'include',
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
  const list = getFiscalYears();
  const idx = list.findIndex(f => f.id === fy.id);
  const sanitized = sanitizeForFirestore(fy);
  if (idx !== -1) {
    list[idx] = sanitized;
  } else {
    list.unshift(sanitized);
  }
  writeLS(LS_FISCAL_YEARS, list);
  lastSyncTime.value = new Date();

  fetch('/api/fiscal-years', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized)
  }).catch(err => console.warn('[DB] Fiscal year API save sync:', err));
}

export async function activateFiscalYearInDb(fyId: string): Promise<FiscalYear | null> {
  const list = getFiscalYears();
  const fy = list.find(f => f.id === fyId);
  if (!fy) return null;
  fy.status = 'Open';
  fy.isSubmissionActive = true;
  fy.updatedAt = new Date().toISOString();
  writeLS(LS_FISCAL_YEARS, list);
  lastSyncTime.value = new Date();

  fetch(`/api/fiscal-years/${fyId}/activate`, { method: 'POST', credentials: 'include' })
    .catch(err => console.warn('[DB] Fiscal year activate sync:', err));
  return fy;
}

export async function closeFiscalYearInDb(fyId: string): Promise<FiscalYear | null> {
  const list = getFiscalYears();
  const fy = list.find(f => f.id === fyId);
  if (!fy) return null;
  fy.status = 'Closed';
  fy.isSubmissionActive = false;
  fy.updatedAt = new Date().toISOString();
  writeLS(LS_FISCAL_YEARS, list);
  lastSyncTime.value = new Date();

  fetch(`/api/fiscal-years/${fyId}/close`, { method: 'POST', credentials: 'include' })
    .catch(err => console.warn('[DB] Fiscal year close sync:', err));
  return fy;
}

export async function archiveFiscalYearInDb(fyId: string): Promise<FiscalYear | null> {
  const list = getFiscalYears();
  const fy = list.find(f => f.id === fyId);
  if (!fy) return null;
  fy.status = 'Archived';
  fy.isSubmissionActive = false;
  fy.updatedAt = new Date().toISOString();
  writeLS(LS_FISCAL_YEARS, list);
  lastSyncTime.value = new Date();

  fetch(`/api/fiscal-years/${fyId}/archive`, { method: 'POST', credentials: 'include' })
    .catch(err => console.warn('[DB] Fiscal year archive sync:', err));
  return fy;
}

export async function deleteFiscalYearFromDb(fyId: string, fyName?: string): Promise<boolean> {
  const list = getFiscalYears();
  const target = list.find(f => f.id === fyId || f.name === fyName || f.name === fyId);
  const targetName = target?.name || fyName || fyId;
  const targetId = target?.id || fyId;

  const nextList = list.filter(f => f.id !== targetId && f.name !== targetName);
  writeLS(LS_FISCAL_YEARS, nextList);

  // Also remove associated action plan folder from local storage
  const folders = readLS<ActionPlanFolder>(LS_FOLDERS);
  const nextFolders = folders.filter(f => f.fiscalYear !== targetName && f.id !== `AP-${targetName.replace(/\s+/g, '')}`);
  writeLS(LS_FOLDERS, nextFolders);
  lastSyncTime.value = new Date();

  // Sync to PostgreSQL backend
  fetch(`/api/fiscal-years/${encodeURIComponent(targetId)}`, {
    method: 'DELETE',
    credentials: 'include'
  }).catch(err => console.warn('[DB] Delete fiscal year sync:', err));

  return true;
}

export async function deleteActionPlanFolderFromDb(folderIdOrFy: string): Promise<boolean> {
  const folders = readLS<ActionPlanFolder>(LS_FOLDERS);
  const nextFolders = folders.filter(f => f.id !== folderIdOrFy && f.fiscalYear !== folderIdOrFy);
  writeLS(LS_FOLDERS, nextFolders);
  lastSyncTime.value = new Date();

  fetch(`/api/action-plans/${encodeURIComponent(folderIdOrFy)}`, {
    method: 'DELETE',
    credentials: 'include'
  }).catch(err => console.warn('[DB] Delete action plan folder sync:', err));

  return true;
}

/**
 * Action Plan Template Operations
 */
export function getActionPlanTemplates(): ActionPlanTemplate[] {
  const list = readLS<ActionPlanTemplate>(LS_TEMPLATES);
  return list.length > 0 ? list : INITIAL_ACTION_PLAN_TEMPLATES;
}

export async function saveTemplateToDb(tpl: ActionPlanTemplate): Promise<void> {
  const list = getActionPlanTemplates();
  const idx = list.findIndex(t => t.id === tpl.id);
  const sanitized = sanitizeForFirestore(tpl);
  if (idx !== -1) {
    list[idx] = sanitized;
  } else {
    list.unshift(sanitized);
  }
  writeLS(LS_TEMPLATES, list);
  lastSyncTime.value = new Date();

  fetch('/api/templates', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized)
  }).catch(err => console.warn('[DB] Template API save sync:', err));
}

export async function duplicateTemplateInDb(templateId: string, newName?: string): Promise<ActionPlanTemplate | null> {
  const list = getActionPlanTemplates();
  const source = list.find(t => t.id === templateId);
  if (!source) return null;

  const newId = `TEMPLATE-${Date.now().toString(36).toUpperCase()}`;
  const duplicated: ActionPlanTemplate = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    name: newName || `Copy of ${source.name}`,
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

  existing.status = 'Published';
  existing.updatedAt = new Date().toISOString();
  await saveTemplateToDb(existing);
  return existing;
}

export async function deleteTemplateFromDb(templateId: string): Promise<boolean> {
  const list = getActionPlanTemplates();
  const target = list.find(t => t.id === templateId);
  if (!target) return false;
  if (target.isDefault || target.id === 'TEMPLATE-MSUN-DEFAULT') {
    throw new Error('Cannot delete default system template');
  }
  const filtered = list.filter(t => t.id !== templateId);
  writeLS(LS_TEMPLATES, filtered);
  lastSyncTime.value = new Date();

  fetch(`/api/templates/${templateId}`, {
    method: 'DELETE',
    credentials: 'include'
  }).catch(err => console.warn('[DB] Template API delete sync:', err));

  return true;
}
