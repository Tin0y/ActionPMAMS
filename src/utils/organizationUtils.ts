import { UserRole, UserAccount, formatUserRole } from '../types';

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
      'CELS Dean',
      'CESS Dean',
      'CFMS Dean',
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
      'CELS Senator',
      'CESS Senator',
      'CFMS Senator',
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
    roles: ['Governor', 'Vice-Governor', 'Secretary', 'Mayor', 'Vice-Mayor', 'Adviser', 'Others'],
    defaultSystemRole: 'ROLE_ORGANIZATION',
    organizationType: 'COLLEGE'
  },
  {
    value: 'ELSSA',
    label: 'ELSSA – Environment and Life Sciences Student Alliance',
    category: 'student_org',
    orgId: 'CELS',
    orgName: 'Environment and Life Sciences Student Alliance',
    subOrgs: [
      { value: 'ELSSA', label: 'ELSSA (Executive Council / Parent Organization)' },
      { value: 'ESS', label: 'ESS' },
      { value: 'SINAG SOCIETY', label: 'SINAG SOCIETY' },
      { value: 'FLORESTA SOCIETY', label: 'FLORESTA SOCIETY' },
      { value: 'UNSA', label: 'UNSA' },
      { value: 'ASSS', label: 'ASSS' }
    ],
    roles: ['Governor', 'Vice-Governor', 'Secretary', 'Mayor', 'Vice-Mayor', 'Adviser', 'Others'],
    defaultSystemRole: 'ROLE_ORGANIZATION',
    organizationType: 'COLLEGE'
  },
  {
    value: 'CESS SO',
    label: 'CESS SO – College of Education and Social Sciences Student Organization',
    category: 'student_org',
    orgId: 'CESS',
    orgName: 'College of Education and Social Sciences Student Organization',
    subOrgs: [
      { value: 'CESS SO', label: 'CESS SO (Executive Council / Parent Organization)' },
      { value: 'CEM', label: 'CEM' },
      { value: 'MESH', label: 'MESH' },
      { value: 'TBSE', label: 'TBSE' },
      { value: 'GUEST', label: 'GUEST' }
    ],
    roles: ['Governor', 'Vice-Governor', 'Secretary', 'Mayor', 'Vice-Mayor', 'Adviser', 'Others'],
    defaultSystemRole: 'ROLE_ORGANIZATION',
    organizationType: 'COLLEGE'
  },
  {
    value: 'FIMSSO',
    label: 'FIMSSO – Fisheries and Marine Science Student Organization',
    category: 'student_org',
    orgId: 'CFMS',
    orgName: 'Fisheries and Marine Science Student Organization',
    subOrgs: [
      { value: 'FIMSSO', label: 'FIMSSO (Executive Council / Parent Organization)' },
      { value: 'Fisheries Science and Technology Society', label: 'Fisheries Science and Technology Society' },
      { value: 'Marine Science Society', label: 'Marine Science Society' }
    ],
    roles: ['Governor', 'Vice-Governor', 'Secretary', 'Mayor', 'Vice-Mayor', 'Adviser', 'Others'],
    defaultSystemRole: 'ROLE_ORGANIZATION',
    organizationType: 'COLLEGE'
  },
  {
    value: 'KAABAG',
    label: 'KAABAG – KAABAG Student Peer Facilitators',
    category: 'student_org',
    orgId: 'KAABAG',
    orgName: 'KAABAG Student Peer Facilitators',
    roles: ['President', 'Vice-President', 'Secretary', 'Adviser', 'Others'],
    defaultSystemRole: 'ROLE_ORGANIZATION',
    organizationType: 'CENTRAL'
  },
  {
    value: 'SenSSo',
    label: 'SenSSo – Senior Students’ Society',
    category: 'student_org',
    orgId: 'SENSSO',
    orgName: 'Senior Students’ Society',
    roles: ['President', 'Vice-President', 'Secretary', 'Adviser', 'Others'],
    defaultSystemRole: 'ROLE_ORGANIZATION',
    organizationType: 'CENTRAL'
  }
];

export function resolveAccountSystemDetails(
  parentOrgVal: string,
  selectedRoleVal: string,
  customRoleVal?: string
): {
  systemRole: UserRole;
  orgId: string;
  orgName: string;
  collegeId?: string;
  organizationType: 'CENTRAL' | 'COLLEGE';
  displayRole: string;
} {
  const conf = ORGANIZATION_OPTIONS.find(o => o.value === parentOrgVal);
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
    if (selectedRoleVal === 'Director for Student Development') {
      systemRole = 'OSD Director';
    } else {
      systemRole = 'ROLE_OSD';
    }
  } else if (parentOrgVal === 'OVCSAS') {
    systemRole = 'ROLE_OVCSAS';
  } else {
    // Student organization
    if (selectedRoleVal === 'President') {
      systemRole = 'Org President';
    } else {
      systemRole = 'ROLE_ORGANIZATION';
    }
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

export function detectAccountParentOrgAndRole(acc: UserAccount): {
  parentOrg: string;
  subOrg: string;
  selectedRole: string;
  customRole: string;
} {
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

  if (!parentOrg) {
    if (orgId === 'OVCSAS' || orgName.includes('vice chancellor')) {
      parentOrg = 'OVCSAS';
    } else if (orgId === 'OSD' || orgName.includes('office of student development')) {
      parentOrg = 'OSD';
    } else if (acc.role === 'ROLE_DEAN' || orgId === 'COLLEGE' || role.includes('dean')) {
      parentOrg = 'College Dean';
    } else if (orgId === 'SSC' || orgName.includes('supreme student council') || email.includes('ssc.adviser')) {
      parentOrg = 'SSC';
    } else if (orgId === 'CBIT' || orgName.includes('business and information technology') || email.includes('cbit.adviser')) {
      parentOrg = 'CBIT SEC';
    } else if (orgId === 'CELS' || orgName.includes('environmental and life sciences') || orgName.includes('environment and life sciences') || email.includes('cels.adviser')) {
      parentOrg = 'ELSSA';
    } else if (orgId === 'CESS' || orgName.includes('education and social sciences') || email.includes('cess.adviser')) {
      parentOrg = 'CESS SO';
    } else if (orgId === 'CFMS' || orgId === 'CMFS' || orgName.includes('marine and fisheries') || orgName.includes('fisheries and marine') || email.includes('cfms.adviser')) {
      parentOrg = 'FIMSSO';
    } else if (orgId === 'KAABAG' || orgName.includes('kaabag') || email.includes('kaabag.adviser')) {
      parentOrg = 'KAABAG';
    } else if (orgId === 'SENSSO' || orgId === 'SENSO' || orgName.includes('senior student') || email.includes('sensso.adviser')) {
      parentOrg = 'SenSSo';
    } else {
      parentOrg = 'SSC';
    }
  }

  // Pre-select subOrg in form: if actualOrg is defined and distinct from parentOrg, use it;
  // otherwise, if the parent org has sub-organizations, pre-select the parent org itself (Executive Council option)
  if (!subOrg) {
    if (acc.actualOrg && acc.actualOrg !== parentOrg) {
      subOrg = acc.actualOrg;
    } else {
      const conf = ORGANIZATION_OPTIONS.find(o => o.value === parentOrg);
      if (conf?.subOrgs && conf.subOrgs.length > 0) {
        subOrg = parentOrg;
      }
    }
  }

  // Check if account is an adviser
  const isAdviser =
    acc.role === 'ROLE_ADVISER' ||
    acc.role === 'Faculty Adviser' ||
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

  const conf = ORGANIZATION_OPTIONS.find(o => o.value === parentOrg);
  let selectedRole = acc.selectedRole || '';
  let customRole = acc.customRole || '';

  if (conf) {
    if (!selectedRole) {
      const role = (acc.role || '').toLowerCase();
      const matched = conf.roles.find(r => r.toLowerCase() === (acc.displayRole || acc.role || '').toLowerCase());
      if (matched) {
        selectedRole = matched;
      } else if (parentOrg === 'College Dean' && acc.collegeId) {
        const deanPos = `${acc.collegeId} Dean`;
        selectedRole = conf.roles.includes(deanPos) ? deanPos : 'Others';
      } else if (role.includes('president') && conf.roles.includes('President')) {
        selectedRole = 'President';
      } else if (role.includes('governor') && conf.roles.includes('Governor')) {
        selectedRole = 'Governor';
      } else if (role.includes('vice-president') || role.includes('vice president')) {
        selectedRole = 'Vice-President';
      } else if (role.includes('secretary')) {
        selectedRole = conf.roles.includes('Secretary') ? 'Secretary' : (conf.roles.includes('General Secretary') ? 'General Secretary' : 'Others');
      } else if (role.includes('director') && conf.roles.includes('Director for Student Development')) {
        selectedRole = 'Director for Student Development';
      } else if (role.includes('vice chancellor') && conf.roles.includes('Vice Chancellor for Student Affairs and Services')) {
        selectedRole = 'Vice Chancellor for Student Affairs and Services';
      } else if (role.includes('staff') && conf.roles.includes('Staff')) {
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
    role.includes('admin')
  ) {
    return 'SysAd';
  }

  // Check if account is an adviser
  const isAdviser =
    acc.role === 'ROLE_ADVISER' ||
    acc.role === 'Faculty Adviser' ||
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
      else if (orgId === 'TME' || email.includes('tme.adviser')) orgLabel = 'TME';
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
 * to a single canonical OrgId string (e.g. 'SENSSO', 'SSC', 'CBIT', 'CELS', 'CFMS', 'CESS', 'KAABAG', 'TME').
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
  if (upper.includes('TME') || upper.includes('MARINE ECHO')) return 'TME';
  if (upper.includes('SSC') || upper.includes('CSG') || upper.includes('SUPREME STUDENT')) return 'SSC';
  if (upper.includes('OSD') || upper.includes('OSA') || upper.includes('STUDENT DEVELOPMENT')) return 'OSD';
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
