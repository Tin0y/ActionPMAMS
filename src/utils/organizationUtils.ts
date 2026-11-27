import { UserRole, UserAccount, StudentOrganization, Activity, formatUserRole } from '../types';

export interface SubOrgOption {
  value: string;
  label: string;
}

export interface OrgOptionConfig {
  value: string;
  label: string;
  category: 'office' | 'student_org';
  orgId: string;
  orgName: string;
  subOrgs?: SubOrgOption[];
  roles: string[];
  defaultSystemRole: UserRole;
  organizationType: 'CENTRAL' | 'COLLEGE';
}

export const ORGANIZATION_OPTIONS: OrgOptionConfig[] = [
  // University Offices
  {
    value: 'OVCSAS',
    label: 'OVCSAS',
    category: 'office',
    orgId: 'OVCSAS',
    orgName: 'Office of the Vice Chancellor for Student Affairs and Services',
    roles: [
      'Vice Chancellor for Student Affairs and Services',
      'Staff',
      'Others'
    ],
    defaultSystemRole: 'ROLE_OVCSAS',
    organizationType: 'CENTRAL'
  },
  {
    value: 'OSD',
    label: 'OSD',
    category: 'office',
    orgId: 'OSD',
    orgName: 'Office of Student Development',
    roles: [
      'Director for Student Development',
      'Staff',
      'Others'
    ],
    defaultSystemRole: 'ROLE_OSD',
    organizationType: 'CENTRAL'
  },
  {
    value: 'College Dean',
    label: 'College Dean',
    category: 'office',
    orgId: 'COLLEGE',
    orgName: 'College Academic Deans',
    roles: [
      'CBIT Dean',
      'Others'
    ],
    defaultSystemRole: 'ROLE_DEAN',
    organizationType: 'COLLEGE'
  },
  {
    value: 'ADMIN',
    label: 'None – System Administration',
    category: 'office',
    orgId: 'ADMIN',
    orgName: 'Not Affiliated',
    roles: [
      'SysAd'
    ],
    defaultSystemRole: 'ROLE_ADMIN',
    organizationType: 'CENTRAL'
  },

  // Student Organizations
  {
    value: 'SSC',
    label: 'SSC – Supreme Student Council',
    category: 'student_org',
    orgId: 'SSC',
    orgName: 'Supreme Student Council',
    roles: [
      'President',
      'Vice-President',
      'General Secretary',
      'CBIT Senator',
      'Executive Secretary',
      'Adviser',
      'Others'
    ],
    defaultSystemRole: 'ROLE_ORGANIZATION',
    organizationType: 'CENTRAL'
  },
  {
    value: 'CBIT SEC',
    label: 'CBIT SEC – College of Business and Information Technology Student Executive Council',
    category: 'student_org',
    orgId: 'CBIT',
    orgName: 'College of Business and Information Technology Student Executive Council',
    subOrgs: [
      { value: 'CBIT SEC', label: 'CBIT SEC (Executive Council / Parent Organization)' },
      { value: 'BITS', label: 'BITS' },
      { value: 'SYAHR', label: 'SYAHR' },
      { value: 'JPMAP', label: 'JPMAP' },
      { value: 'JMA', label: 'JMA' }
    ],
    roles: ['President', 'Governor', 'Vice-Governor', 'Secretary', 'Mayor', 'Vice-Mayor', 'Adviser', 'Others'],
    defaultSystemRole: 'ROLE_ORGANIZATION',
    organizationType: 'COLLEGE'
  }
];

const DEFAULT_COLLEGE_ORG_ROLES = [
  'Governor',
  'Vice-Governor',
  'President',
  'Secretary',
  'Treasurer',
  'Auditor',
  'Mayor',
  'Adviser',
  'Others'
];

const DEFAULT_CENTRAL_ORG_ROLES = [
  'President',
  'Vice-President',
  'Secretary',
  'Treasurer',
  'Auditor',
  'Adviser',
  'Others'
];

const KNOWN_COLLEGE_CANONICAL_IDS = new Set(['CBIT', 'CELS', 'CFMS', 'CESS']);

function inferDbOrganizationType(org: StudentOrganization, resolvedOrgId: string): 'CENTRAL' | 'COLLEGE' {
  if (KNOWN_COLLEGE_CANONICAL_IDS.has(resolvedOrgId)) return 'COLLEGE';
  const natureLower = (org.nature || '').toLowerCase();
  const nameLower = (org.name || '').toLowerCase();
  if (natureLower.includes('college') || nameLower.startsWith('college of ')) {
    return 'COLLEGE';
  }
  return 'CENTRAL';
}

export function buildOrganizationOptions(dbOrganizations?: StudentOrganization[]): OrgOptionConfig[] {
  const offices = ORGANIZATION_OPTIONS.filter(o => o.category === 'office');
  const staticStudentOrgs = ORGANIZATION_OPTIONS.filter(o => o.category === 'student_org');

  if (!Array.isArray(dbOrganizations) || dbOrganizations.length === 0) {
    return [...offices, ...staticStudentOrgs];
  }

  const dynamicStudentOrgs: OrgOptionConfig[] = [];
  const seenKeys = new Set<string>();

  for (const org of dbOrganizations) {
    if (!org) continue;
    const rawId = (org.id || '').trim();
    const rawAcronym = (org.acronym || rawId || org.name || '').trim();
    const rawName = (org.name || rawAcronym || rawId).trim();
    if (!rawAcronym && !rawName) continue;

    const canonical = canonicalOrgId(rawId || rawAcronym);
    const dedupeKey = (canonical || rawAcronym).toUpperCase();
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const staticMatch = staticStudentOrgs.find(
      s =>
        s.orgId.toUpperCase() === rawId.toUpperCase() ||
        s.value.toUpperCase() === rawAcronym.toUpperCase() ||
        canonicalOrgId(s.orgId) === canonical
    );

    const inactiveSuffix = org.status === 'Inactive' ? ' (Inactive)' : '';
    const displayLabel =
      rawAcronym && rawName && rawAcronym.toUpperCase() !== rawName.toUpperCase()
        ? `${rawAcronym} – ${rawName}${inactiveSuffix}`
        : `${rawName}${inactiveSuffix}`;

    if (staticMatch) {
      dynamicStudentOrgs.push({
        ...staticMatch,
        orgName: rawName || staticMatch.orgName,
        label: displayLabel
      });
    } else {
      const orgType = inferDbOrganizationType(org, canonical);
      const resolvedOrgId = canonical || rawId || rawAcronym.toUpperCase();
      dynamicStudentOrgs.push({
        value: rawAcronym || rawId,
        label: displayLabel,
        category: 'student_org',
        orgId: resolvedOrgId,
        orgName: rawName,
        roles: orgType === 'COLLEGE' ? [...DEFAULT_COLLEGE_ORG_ROLES] : [...DEFAULT_CENTRAL_ORG_ROLES],
        defaultSystemRole: 'ROLE_ORGANIZATION',
        organizationType: orgType
      });
    }
  }

  return [...offices, ...dynamicStudentOrgs];
}

function findMatchingOrgConfig(
  identifier: string,
  options: OrgOptionConfig[]
): OrgOptionConfig | undefined {
  if (!identifier) return undefined;
  const trimmed = identifier.trim();
  const upper = trimmed.toUpperCase();
  const canonical = canonicalOrgId(trimmed);

  return (
    options.find(o => o.value === trimmed) ||
    options.find(o => o.value.toUpperCase() === upper || o.orgId.toUpperCase() === upper) ||
    options.find(
      o =>
        o.category === 'student_org' &&
        (o.orgName.toLowerCase() === trimmed.toLowerCase() ||
          (canonical && canonicalOrgId(o.orgId) === canonical))
    )
  );
}

export function resolveAccountSystemDetails(
  parentOrgVal: string,
  selectedRoleVal: string,
  customRoleVal?: string,
  options?: OrgOptionConfig[]
): {
  systemRole: UserRole;
  orgId: string;
  orgName: string;
  collegeId?: string;
  organizationType: 'CENTRAL' | 'COLLEGE';
  displayRole: string;
} {
  const effectiveOptions = options && options.length > 0 ? options : ORGANIZATION_OPTIONS;
  const conf = findMatchingOrgConfig(parentOrgVal, effectiveOptions);
  let displayRole = (selectedRoleVal === 'Others' ? (customRoleVal || '').trim() : selectedRoleVal) || selectedRoleVal;

  if (!conf) {
    if (selectedRoleVal === 'Adviser' || selectedRoleVal.toLowerCase().includes('adviser')) {
      return {
        systemRole: 'ROLE_ADVISER',
        orgId: parentOrgVal || 'ALL',
        orgName: parentOrgVal || 'Unassigned',
        organizationType: 'CENTRAL',
        displayRole: `${parentOrgVal || 'Org'} Adviser`
      };
    }
    return {
      systemRole: 'ROLE_ORGANIZATION',
      orgId: parentOrgVal || 'ALL',
      orgName: parentOrgVal || 'Unassigned',
      organizationType: 'CENTRAL',
      displayRole
    };
  }

  let systemRole: UserRole = conf.defaultSystemRole;
  let collegeId: string | undefined = undefined;
  let orgId = conf.orgId;

  if (parentOrgVal === 'ADMIN' || parentOrgVal === 'Not Affiliated') {
    return {
      systemRole: 'ROLE_ADMIN',
      orgId: 'ADMIN',
      orgName: 'Not Affiliated',
      organizationType: 'CENTRAL',
      displayRole: 'SysAd'
    };
  } else if (selectedRoleVal === 'Adviser' || selectedRoleVal.toLowerCase().includes('adviser')) {
    systemRole = 'ROLE_ADVISER';
    displayRole = `${conf.value} Adviser`;
    if (conf.organizationType === 'COLLEGE') {
      collegeId = conf.orgId;
    }
  } else if (parentOrgVal === 'College Dean') {
    systemRole = 'ROLE_DEAN';
    if (selectedRoleVal === 'CBIT Dean') {
      collegeId = 'CBIT';
      orgId = 'CBIT';
    } else if (selectedRoleVal === 'CELS Dean') {
      collegeId = 'CELS';
      orgId = 'CELS';
    } else if (selectedRoleVal === 'CESS Dean') {
      collegeId = 'CESS';
      orgId = 'CESS';
    } else if (selectedRoleVal === 'CFMS Dean') {
      collegeId = 'CFMS';
      orgId = 'CFMS';
    }
  } else if (parentOrgVal === 'OSD') {
    systemRole = 'ROLE_OSD';
  } else if (parentOrgVal === 'OVCSAS') {
    systemRole = 'ROLE_OVCSAS';
  } else {
    // Student organization - canonical system role is always ROLE_ORGANIZATION
    systemRole = 'ROLE_ORGANIZATION';
    if (conf.organizationType === 'COLLEGE') {
      collegeId = conf.orgId;
    }
  }

  return {
    systemRole,
    orgId,
    orgName: conf.orgName,
    collegeId,
    organizationType: conf.organizationType,
    displayRole
  };
}

export function detectAccountParentOrgAndRole(
  acc: UserAccount,
  options?: OrgOptionConfig[]
): {
  parentOrg: string;
  subOrg: string;
  selectedRole: string;
  customRole: string;
} {
  const effectiveOptions = options && options.length > 0 ? options : ORGANIZATION_OPTIONS;
  const orgId = (acc.orgId || '').toUpperCase();
  const orgName = (acc.orgName || '').toLowerCase();
  const role = (acc.role || '').toLowerCase();
  const email = (acc.email || '').toLowerCase();

  // 1. System Admin is NOT affiliated with any student organization or college
  if (
    acc.role === 'ROLE_ADMIN' ||
    acc.role === 'System Administrator' ||
    acc.role === 'SysAd' ||
    acc.displayRole === 'SysAd' ||
    acc.selectedRole === 'SysAd' ||
    orgId === 'ADMIN' ||
    email === 'admin@msunaawan.edu.ph' ||
    email === 'hazelanne.mapula@msunaawan.edu.ph' ||
    role.includes('admin')
  ) {
    return {
      parentOrg: 'ADMIN',
      subOrg: '',
      selectedRole: 'SysAd',
      customRole: ''
    };
  }

  let parentOrg = acc.parentOrg || '';
  let subOrg = acc.subOrg || '';

  if (parentOrg) {
    const matchedParent = findMatchingOrgConfig(parentOrg, effectiveOptions);
    if (matchedParent) {
      parentOrg = matchedParent.value;
    }
  }

  if (!parentOrg) {
    if (orgId === 'OVCSAS' || orgName.includes('vice chancellor')) {
      parentOrg = 'OVCSAS';
    } else if (orgId === 'OSD' || orgName.includes('office of student development')) {
      parentOrg = 'OSD';
    } else if (acc.role === 'ROLE_DEAN' || orgId === 'COLLEGE' || role.includes('dean')) {
      parentOrg = 'College Dean';
    } else {
      const matchedByOrg =
        findMatchingOrgConfig(acc.orgId || '', effectiveOptions) ||
        findMatchingOrgConfig(acc.orgName || '', effectiveOptions) ||
        findMatchingOrgConfig(acc.actualOrg || '', effectiveOptions);
      if (matchedByOrg) {
        parentOrg = matchedByOrg.value;
      } else if (orgId === 'SSC' || orgName.includes('supreme student council') || email.includes('ssc.adviser')) {
        parentOrg = 'SSC';
      } else if (orgId === 'CBIT' || orgName.includes('business and information technology') || email.includes('cbit.adviser')) {
        parentOrg = 'CBIT SEC';
      } else if (orgId === 'CELS' || orgName.includes('environmental and life sciences') || orgName.includes('environment and life sciences') || email.includes('cels.adviser')) {
        parentOrg = findMatchingOrgConfig('CELS', effectiveOptions)?.value || 'ELSSA';
      } else if (orgId === 'CESS' || orgName.includes('education and social sciences') || email.includes('cess.adviser')) {
        parentOrg = findMatchingOrgConfig('CESS', effectiveOptions)?.value || 'CESS SO';
      } else if (orgId === 'CFMS' || orgId === 'CMFS' || orgName.includes('marine and fisheries') || orgName.includes('fisheries and marine') || email.includes('cfms.adviser')) {
        parentOrg = findMatchingOrgConfig('CMFS', effectiveOptions)?.value || 'FIMSSO';
      } else if (orgId === 'KAABAG' || orgName.includes('kaabag') || email.includes('kaabag.adviser')) {
        parentOrg = findMatchingOrgConfig('KAABAG', effectiveOptions)?.value || 'KAABAG';
      } else if (orgId === 'SENSSO' || orgId === 'SENSO' || orgName.includes('senior student') || email.includes('sensso.adviser')) {
        parentOrg = findMatchingOrgConfig('SENSSO', effectiveOptions)?.value || 'SENSSO';
      } else {
        parentOrg = acc.actualOrg || acc.orgId || effectiveOptions.find(o => o.category === 'student_org')?.value || 'SSC';
      }
    }
  }

  // Pre-select subOrg in form: if actualOrg is defined and distinct from parentOrg, use it;
  // otherwise, if the parent org has sub-organizations, pre-select the parent org itself (Executive Council option)
  const conf = findMatchingOrgConfig(parentOrg, effectiveOptions);
  if (!subOrg) {
    if (acc.actualOrg && acc.actualOrg !== parentOrg) {
      subOrg = acc.actualOrg;
    } else if (conf?.subOrgs && conf.subOrgs.length > 0) {
      subOrg = parentOrg;
    }
  }

  // Check if account is an adviser
  const isAdviser =
    acc.role === 'ROLE_ADVISER' ||
    acc.role === 'Faculty Adviser' ||
    acc.role === 'Organization Adviser' ||
    acc.selectedRole === 'Adviser' ||
    (acc.displayRole && acc.displayRole.toLowerCase().includes('adviser')) ||
    email.includes('.adviser@') ||
    (acc.name && acc.name.toLowerCase().includes('adviser'));

  if (isAdviser) {
    return {
      parentOrg,
      subOrg,
      selectedRole: 'Adviser',
      customRole: ''
    };
  }

  let selectedRole = acc.selectedRole || '';
  let customRole = acc.customRole || '';

  if (conf) {
    if (!selectedRole) {
      const roleLower = (acc.role || '').toLowerCase();
      const matched = conf.roles.find(r => r.toLowerCase() === (acc.displayRole || acc.role || '').toLowerCase());
      if (matched) {
        selectedRole = matched;
      } else if (parentOrg === 'College Dean' && acc.collegeId) {
        const deanPos = `${acc.collegeId} Dean`;
        selectedRole = conf.roles.includes(deanPos) ? deanPos : 'Others';
      } else if (roleLower.includes('president') && conf.roles.includes('President')) {
        selectedRole = 'President';
      } else if (roleLower.includes('governor') && conf.roles.includes('Governor')) {
        selectedRole = 'Governor';
      } else if (roleLower.includes('vice-president') || roleLower.includes('vice president')) {
        selectedRole = 'Vice-President';
      } else if (roleLower.includes('secretary')) {
        selectedRole = conf.roles.includes('Secretary') ? 'Secretary' : (conf.roles.includes('General Secretary') ? 'General Secretary' : 'Others');
      } else if (roleLower.includes('director') && conf.roles.includes('Director for Student Development')) {
        selectedRole = 'Director for Student Development';
      } else if (roleLower.includes('vice chancellor') && conf.roles.includes('Vice Chancellor for Student Affairs and Services')) {
        selectedRole = 'Vice Chancellor for Student Affairs and Services';
      } else if (roleLower.includes('staff') && conf.roles.includes('Staff')) {
        selectedRole = 'Staff';
      } else if (conf.organizationType === 'COLLEGE' && subOrg && subOrg !== parentOrg && conf.roles.includes('Mayor')) {
        // Sub-organization in college councils typically has Mayor as head
        selectedRole = 'Mayor';
      } else if (conf.roles.length > 0 && (acc.role === 'ROLE_ORGANIZATION' || acc.role === 'Org President')) {
        selectedRole = conf.roles[0]; // e.g. Governor for CBIT SEC
      } else if (acc.displayRole && !acc.displayRole.toLowerCase().includes('officer')) {
        selectedRole = 'Others';
        customRole = acc.displayRole;
      } else {
        selectedRole = conf.roles[0] || 'Others';
      }
    } else if (selectedRole === 'Others' && !customRole) {
      customRole = acc.displayRole || '';
    }
  }

  return { parentOrg, subOrg, selectedRole, customRole };
}

export const getUserActualOrg = (acc?: UserAccount | null): string => {
  if (!acc) return 'Unassigned';
  const role = (acc.role || '').toLowerCase();
  const orgId = (acc.orgId || '').toUpperCase();
  if (
    acc.role === 'ROLE_ADMIN' ||
    acc.role === 'SysAd' ||
    acc.role === 'System Administrator' ||
    acc.displayRole === 'SysAd' ||
    acc.selectedRole === 'SysAd' ||
    orgId === 'ADMIN' ||
    acc.email === 'admin@msunaawan.edu.ph' ||
    acc.email === 'hazelanne.mapula@msunaawan.edu.ph' ||
    role.includes('admin')
  ) {
    return 'Not Affiliated';
  }
  if (acc.actualOrg) return acc.actualOrg;
  if (acc.subOrg && acc.subOrg !== acc.parentOrg) return acc.subOrg;
  return acc.parentOrg || acc.orgName || acc.orgId || 'Unassigned';
};

export const getUserParentOrg = (acc?: UserAccount | null): string => {
  if (!acc) return 'Unassigned';
  const role = (acc.role || '').toLowerCase();
  const orgId = (acc.orgId || '').toUpperCase();
  if (
    acc.role === 'ROLE_ADMIN' ||
    acc.role === 'SysAd' ||
    acc.role === 'System Administrator' ||
    acc.displayRole === 'SysAd' ||
    acc.selectedRole === 'SysAd' ||
    orgId === 'ADMIN' ||
    acc.email === 'admin@msunaawan.edu.ph' ||
    acc.email === 'hazelanne.mapula@msunaawan.edu.ph' ||
    role.includes('admin')
  ) {
    return 'Not Affiliated';
  }
  return acc.parentOrg || acc.orgName || acc.orgId || 'Unassigned';
};

export const isUserInSubOrg = (acc?: UserAccount | null): boolean => {
  if (!acc) return false;
  const actual = getUserActualOrg(acc);
  const parent = getUserParentOrg(acc);
  return Boolean(acc.subOrg && acc.subOrg !== parent && actual !== parent);
};

export const doesOrgHaveSubOrgs = (orgVal?: string): boolean => {
  if (!orgVal) return false;
  const conf = ORGANIZATION_OPTIONS.find(o => o.value === orgVal || o.orgId === orgVal);
  return Boolean(conf?.subOrgs && conf.subOrgs.length > 0);
};

export const getAccountDisplayRole = (acc?: UserAccount | null): string => {
  if (!acc) return 'User';
  const role = (acc.role || '').toLowerCase();
  const orgId = (acc.orgId || '').toUpperCase();
  const email = (acc.email || '').toLowerCase();

  if (
    acc.role === 'ROLE_ADMIN' ||
    acc.role === 'SysAd' ||
    acc.role === 'System Administrator' ||
    acc.displayRole === 'SysAd' ||
    acc.selectedRole === 'SysAd' ||
    orgId === 'ADMIN' ||
    email === 'admin@msunaawan.edu.ph' ||
    email === 'hazelanne.mapula@msunaawan.edu.ph' ||
    role.includes('admin')
  ) {
    return 'SysAd';
  }

  // Check if account is an adviser
  const isAdviser =
    acc.role === 'ROLE_ADVISER' ||
    acc.role === 'Faculty Adviser' ||
    acc.role === 'Organization Adviser' ||
    acc.selectedRole === 'Adviser' ||
    (acc.displayRole && acc.displayRole.toLowerCase().includes('adviser')) ||
    email.includes('.adviser@') ||
    (acc.name && acc.name.toLowerCase().includes('adviser'));

  if (isAdviser) {
    let orgLabel = acc.parentOrg || acc.actualOrg || '';
    if (!orgLabel || orgLabel === 'COLLEGE' || orgLabel === 'ALL') {
      if (orgId === 'SSC' || email.includes('ssc.adviser')) orgLabel = 'SSC';
      else if (orgId === 'CBIT' || email.includes('cbit.adviser')) orgLabel = 'CBIT SEC';
      else if (orgId === 'CELS' || email.includes('cels.adviser')) orgLabel = 'ELSSA';
      else if (orgId === 'CESS' || email.includes('cess.adviser')) orgLabel = 'CESS SO';
      else if (orgId === 'CFMS' || orgId === 'CMFS' || email.includes('cfms.adviser')) orgLabel = 'FIMSSO';
      else if (orgId === 'KAABAG' || email.includes('kaabag.adviser')) orgLabel = 'KAABAG';
      else if (orgId === 'SENSSO' || orgId === 'SENSO' || email.includes('sensso.adviser')) orgLabel = 'SenSSo';

      else if (acc.orgName) {
        const onLower = acc.orgName.toLowerCase();
        if (onLower.includes('supreme student')) orgLabel = 'SSC';
        else if (onLower.includes('business and information')) orgLabel = 'CBIT SEC';
        else if (onLower.includes('environment and life')) orgLabel = 'ELSSA';
        else if (onLower.includes('education and social')) orgLabel = 'CESS SO';
        else if (onLower.includes('fisheries and marine')) orgLabel = 'FIMSSO';
        else if (onLower.includes('kaabag')) orgLabel = 'KAABAG';
        else if (onLower.includes('senior student')) orgLabel = 'SenSSo';
        else orgLabel = acc.orgId || 'Org';
      } else {
        orgLabel = acc.orgId || 'Org';
      }
    }
    const conf = ORGANIZATION_OPTIONS.find(o => o.value === orgLabel || o.orgId === orgLabel);
    if (conf) {
      orgLabel = conf.value;
    }
    return orgLabel.endsWith(' Adviser') ? orgLabel : `${orgLabel} Adviser`;
  }

  if (acc.displayRole && !acc.displayRole.toLowerCase().endsWith(' officer')) {
    return acc.displayRole;
  }
  if (acc.customRole) {
    return acc.customRole;
  }
  if (acc.selectedRole && acc.selectedRole !== 'Others') {
    return acc.selectedRole;
  }

  // Detect matching role based on how account is created
  const detected = detectAccountParentOrgAndRole(acc);
  if (detected.selectedRole && detected.selectedRole !== 'Others') {
    return detected.selectedRole;
  }
  if (detected.customRole) {
    return detected.customRole;
  }

  return formatUserRole(acc);
};

/**
 * Normalizes any variation of an organization acronym, ID, or full name
 * to a single canonical OrgId string (e.g. 'SENSSO', 'SSC', 'CBIT', 'CELS', 'CFMS', 'CESS', 'KAABAG').
 */
export function canonicalOrgId(raw?: string | null): string {
  if (!raw) return '';
  const upper = raw.trim().toUpperCase();
  if (upper === 'ALL') return 'ALL';
  if (upper.includes('SENS') || upper.includes('SENSO') || upper.includes('SENIOR')) return 'SENSSO';
  if (upper.includes('CFMS') || upper.includes('CMFS') || upper.includes('FIMS') || upper.includes('FISHERIES') || upper.includes('MARINE SCIENCE')) return 'CFMS';
  if (upper.includes('CELS') || upper.includes('ELSS') || upper.includes('ENVIRONMENT') || upper.includes('LIFE SCIENCE')) return 'CELS';
  if (upper.includes('CBIT') || upper.includes('BUSINESS AND INFO')) return 'CBIT';
  if (upper.includes('CESS') || upper.includes('EDUCATION AND SOCIAL')) return 'CESS';
  if (upper.includes('KAABAG')) return 'KAABAG';

  if (upper.includes('SSC') || upper.includes('CSG') || upper.includes('SUPREME STUDENT')) return 'SSC';
  if (upper.includes('OSD') || upper.includes('STUDENT DEVELOPMENT')) return 'OSD';
  if (upper.includes('OVCSAS') || upper.includes('VICE CHANCELLOR')) return 'OVCSAS';
  if (upper === 'OC' || upper.includes('CHANCELLOR')) return 'OC';
  if (upper.includes('ADMIN')) return 'ADMIN';
  return upper;
}

/**
 * Determines whether two organization IDs, acronyms, or names represent the same organization.
 * Accounts for SENSSO/SenSo, CMFS/CFMS, CELS/ELSSA, CBIT/CBIT SEC, CESS/CESS SO, SSC/CSG, etc.
 */
export function isSameOrg(orgA?: string | null, orgB?: string | null): boolean {
  if (!orgA || !orgB) return false;
  if (orgA === 'ALL' || orgB === 'ALL') return true;
  return canonicalOrgId(orgA) === canonicalOrgId(orgB);
}

/**
 * Standard System Roles that administrators can assign to user accounts.
 */
export const SYSTEM_ASSIGNABLE_ROLES: Array<{
  role: UserRole;
  label: string;
  category: 'ADMIN' | 'APPROVAL' | 'ORG';
  description: string;
}> = [
  {
    role: 'ROLE_ADMIN',
    label: 'System Administrator',
    category: 'ADMIN',
    description: 'Full administrative access to manage users, roles, organizations, and global settings.'
  },
  {
    role: 'ROLE_OSD',
    label: 'OSD Staff',
    category: 'APPROVAL',
    description: 'Office of Student Development staff for reviewing, endorsing, and tracking student action plans.'
  },
  {
    role: 'ROLE_ADVISER',
    label: 'Organization Adviser',
    category: 'APPROVAL',
    description: 'Faculty adviser responsible for review, verification, and first-tier sign-off of action plans.'
  },
  {
    role: 'ROLE_DEAN',
    label: 'College Dean',
    category: 'APPROVAL',
    description: 'Academic college dean reviewer for endorsing college student organization plans.'
  },
  {
    role: 'ROLE_OVCSAS',
    label: 'OVCSAS Officer',
    category: 'APPROVAL',
    description: 'Office of the Vice Chancellor for Student Affairs and Services reviewer and approver.'
  },
  {
    role: 'ROLE_ORGANIZATION',
    label: 'Student Organization Officer',
    category: 'ORG',
    description: 'Student leader access for authoring, submitting, and editing organization action plans.'
  }
];

/**
 * Normalizes role labels for user-friendly display in role switcher, badges, and modals.
 */
export function formatRoleLabel(role?: string): string {
  if (!role) return 'User';
  const lower = role.toLowerCase().trim();
  if (role === 'ROLE_ADMIN' || lower === 'sysad' || lower.includes('system admin')) return 'System Administrator';
  if (
    role === 'ROLE_OSD' ||
    lower === 'staff' ||
    lower.includes('osd staff') ||
    lower.includes('osd officer') ||
    lower.includes('osd director') ||
    lower.includes('director for student development')
  ) {
    return 'OSD Staff';
  }
  if (role === 'ROLE_ADVISER' || lower.includes('adviser')) return 'Organization Adviser';
  if (role === 'ROLE_DEAN' || lower.includes('dean')) return 'College Dean';
  if (role === 'ROLE_OVCSAS' || lower.includes('ovcsas')) return 'OVCSAS Officer';
  if (role === 'ROLE_OC' || lower.includes('chancellor')) return 'Office of the Chancellor';
  if (
    role === 'ROLE_ORGANIZATION' ||
    role === 'ROLE_PRESIDENT' ||
    role === 'ROLE_TREASURER' ||
    lower.includes('president') ||
    lower.includes('governor') ||
    lower.includes('secretary') ||
    lower.includes('treasurer') ||
    lower.includes('senator') ||
    lower.includes('mayor') ||
    lower.includes('student') ||
    lower.includes('organization officer') ||
    lower.includes('organization user')
  ) {
    return 'Student Organization Officer';
  }
  return role;
}

/**
 * Maps any role code or legacy/display alias to its canonical APMAMS system role code.
 * Prevents duplicate entries such as ["Org President", "ROLE_ORGANIZATION"] from appearing
 * as two separate "Student Organization Officer" roles.
 */
export function normalizeCanonicalRole(role?: string | null): UserRole | null {
  if (!role || typeof role !== 'string') return null;
  const trimmed = role.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  if (trimmed === 'ROLE_OC' || lower.includes('chancellor')) {
    return null;
  }
  if (trimmed === 'ROLE_ADMIN' || lower === 'sysad' || lower.includes('system admin')) {
    return 'ROLE_ADMIN';
  }
  if (
    trimmed === 'ROLE_OSD' ||
    lower === 'staff' ||
    lower.includes('osd') ||
    lower.includes('director for student development')
  ) {
    return 'ROLE_OSD';
  }
  if (trimmed === 'ROLE_ADVISER' || lower.includes('adviser')) {
    return 'ROLE_ADVISER';
  }
  if (trimmed === 'ROLE_DEAN' || lower.includes('dean')) {
    return 'ROLE_DEAN';
  }
  if (trimmed === 'ROLE_OVCSAS' || lower.includes('ovcsas')) {
    return 'ROLE_OVCSAS';
  }
  if (
    trimmed === 'ROLE_ORGANIZATION' ||
    trimmed === 'ROLE_PRESIDENT' ||
    trimmed === 'ROLE_TREASURER' ||
    lower.includes('president') ||
    lower.includes('governor') ||
    lower.includes('secretary') ||
    lower.includes('treasurer') ||
    lower.includes('senator') ||
    lower.includes('mayor') ||
    lower.includes('student') ||
    lower.includes('organization officer') ||
    lower.includes('organization user')
  ) {
    return 'ROLE_ORGANIZATION';
  }

  return null;
}

/**
 * Normalizes and deduplicates an array of role values so equivalent aliases
 * (e.g. "Org President" and "ROLE_ORGANIZATION") collapse into a single canonical role.
 */
export function dedupeAssignedRoles(roles?: Array<string | null | undefined> | null): UserRole[] {
  if (!Array.isArray(roles) || roles.length === 0) return [];
  const seenCodes = new Set<string>();
  const seenLabels = new Set<string>();
  const result: UserRole[] = [];

  for (const raw of roles) {
    const canonical = normalizeCanonicalRole(raw);
    if (!canonical || canonical === 'ROLE_OC') continue;
    const labelKey = formatRoleLabel(canonical).toLowerCase().trim();
    if (seenCodes.has(canonical) || seenLabels.has(labelKey)) continue;
    seenCodes.add(canonical);
    seenLabels.add(labelKey);
    result.push(canonical);
  }

  return result;
}

/**
 * Resolves a tagged college/organization label (e.g. "CBIT", "SSC", "College of ... (CBIT)")
 * into its canonical orgId where possible.
 */
export function resolveTaggedOrgId(tagLabel?: string | null): string {
  const raw = String(tagLabel || '').trim();
  if (!raw) return '';

  const parenMatch = raw.match(/\(([^)]+)\)/);
  const candidate = parenMatch ? parenMatch[1].trim() : raw;
  const upper = candidate.toUpperCase();

  for (const opt of ORGANIZATION_OPTIONS) {
    if (
      opt.orgId.toUpperCase() === upper ||
      opt.value.toUpperCase() === upper ||
      raw.toUpperCase().includes(opt.orgId.toUpperCase()) ||
      raw.toUpperCase() === opt.orgName.toUpperCase()
    ) {
      return opt.orgId;
    }
  }

  // Handle common college/org abbreviations
  if (upper.includes('SENSO') || upper.includes('SENSSO')) return 'SENSSO';
  if (upper.includes('CMFS') || upper.includes('CFMS')) return 'CFMS';
  if (upper.includes('ELSSA') || upper.includes('CELS')) return 'CELS';
  return candidate.toUpperCase();
}

/**
 * Returns true if the given organization is tagged in an activity's DAD `taggedColleges`
 * (and is not the host organization itself).
 */
export function isActivityTaggedForOrg(
  activity: Pick<Activity, 'orgId' | 'designForm'> | null | undefined,
  orgId?: string | null
): boolean {
  if (!activity || !orgId) return false;
  const cleanOrg = orgId.trim();
  if (!cleanOrg || cleanOrg.toUpperCase() === 'ALL' || cleanOrg.toUpperCase() === 'ADMIN' || cleanOrg.toUpperCase() === 'COLLEGE') {
    return false;
  }
  if (isSameOrg(activity.orgId, cleanOrg)) return false;

  const tags = activity.designForm?.taggedColleges;
  if (!Array.isArray(tags) || tags.length === 0) return false;

  return tags.some((tag) => {
    const resolved = resolveTaggedOrgId(tag);
    return isSameOrg(resolved, cleanOrg) || isSameOrg(tag, cleanOrg);
  });
}

/**
 * Extracts and returns an array of assigned roles for a user account,
 * ensuring backward compatibility with legacy accounts that only have `role`.
 */
export function getUserAssignedRoles(user?: UserAccount | null): UserRole[] {
  if (!user) return [];
  const rawList: string[] = [];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    for (const r of user.roles) {
      if (typeof r === 'string' && r.trim()) rawList.push(r.trim());
    }
  }
  if (typeof user.role === 'string' && user.role.trim()) {
    rawList.push(user.role.trim());
  }
  if (typeof user.activeRole === 'string' && user.activeRole.trim()) {
    rawList.push(user.activeRole.trim());
  }
  return dedupeAssignedRoles(rawList);
}

/**
 * Normalizes and sanitizes a name string for use in usernames and emails:
 * - Converts Philippine enye ('ñ' / 'Ñ') to 'n'
 * - Strips accents/diacritics using Unicode NFD decomposition (e.g. 'é' -> 'e', 'ü' -> 'u')
 * - Converts to lowercase
 * - Strips all non-alphanumeric characters (spaces, hyphens, periods, etc.)
 */
export function cleanNameForIdentifier(name: string): string {
  return (name || '')
    .trim()
    .replace(/[ñÑ]/g, 'n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Automatically generates a clean, unique username and institutional email address
 * based on First Name and Last Name.
 *
 * Requirements:
 * - Username: firstname.lastname (lowercase, spaces stripped within names)
 * - Enye (ñ / Ñ) translated to "n" (e.g. Muñez -> munez)
 * - Email: firstname.lastname@msunaawan.edu.ph
 * - Unique counter appended if duplicate exists (e.g. alchristian.molina1)
 */
export function generateAutoUsernameAndEmail(
  firstName: string,
  lastName: string,
  existingAccounts: Array<{ username?: string; email?: string; id?: string }> = [],
  currentUserId?: string
): { username: string; email: string } {
  const cleanFirst = cleanNameForIdentifier(firstName);
  const cleanLast = cleanNameForIdentifier(lastName);

  if (!cleanFirst && !cleanLast) {
    return { username: '', email: '' };
  }

  const baseUsername = cleanFirst && cleanLast ? `${cleanFirst}.${cleanLast}` : (cleanFirst || cleanLast);

  // Exclude current user if editing existing account
  const otherAccounts = existingAccounts.filter(a => !currentUserId || a.id !== currentUserId);
  const existingUsernames = new Set<string>();

  for (const acc of otherAccounts) {
    if (acc.username) {
      existingUsernames.add(acc.username.toLowerCase().trim());
    }
    if (acc.email) {
      const emailPrefix = acc.email.split('@')[0].toLowerCase().trim();
      if (emailPrefix) existingUsernames.add(emailPrefix);
    }
  }

  let uniqueUsername = baseUsername;
  let counter = 1;
  while (existingUsernames.has(uniqueUsername)) {
    uniqueUsername = `${baseUsername}${counter}`;
    counter++;
  }

  return {
    username: uniqueUsername,
    email: `${uniqueUsername}@msunaawan.edu.ph`
  };
}

/**
 * Normalizes and compares two fiscal year representations (e.g. "FY 2027", "Fiscal Year 2027", "2027").
 * Returns true if both refer to the same fiscal year period.
 */
export function isMatchingFiscalYear(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const aTrim = a.trim();
  const bTrim = b.trim();
  if (aTrim === bTrim) return true;
  if (aTrim.toLowerCase() === bTrim.toLowerCase()) return true;
  const aDigits = aTrim.replace(/\D/g, '');
  const bDigits = bTrim.replace(/\D/g, '');
  if (aDigits && bDigits && aDigits === bDigits) return true;
  return false;
}

export function getFiscalYearDigits(fy?: string | null): string {
  if (!fy) return '';
  return fy.replace(/\D/g, '');
}

/**
 * Resolves and deduplicates active student organizations from reactive/prop sources,
 * filtering out system placeholders (ADMIN, COLLEGE) and archived/inactive entries.
 */
export function resolveActiveStudentOrganizations(
  ...sources: Array<StudentOrganization[] | undefined | null>
): StudentOrganization[] {
  const chosen = sources.find((list) => Array.isArray(list) && list.length > 0) || [];
  const seen = new Set<string>();
  const result: StudentOrganization[] = [];

  for (const org of chosen) {
    if (!org) continue;
    if (org.status === 'Archived' || org.status === 'Inactive') continue;
    const idUpper = (org.id || '').trim().toUpperCase();
    const acronymUpper = (org.acronym || '').trim().toUpperCase();
    if (!idUpper && !acronymUpper) continue;
    if (idUpper === 'ADMIN' || acronymUpper === 'ADMIN' || idUpper === 'COLLEGE' || acronymUpper === 'COLLEGE') {
      continue;
    }
    const key = idUpper || acronymUpper;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...org,
      id: org.id || org.acronym,
      acronym: org.acronym || org.id
    });
  }

  return result;
}

