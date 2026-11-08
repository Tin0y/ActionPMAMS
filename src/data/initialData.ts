import { OrgId, StudentOrganization, Activity, ActivityDesignForm, FinancialSummary, NormanPrincipleInfo, UserAccount, ActionPlanFolder, TimelineStep, ActionPlanTemplate, FiscalYear, SystemDropdownOption } from '../types';
import { isSameOrg, canonicalOrgId } from '../utils/organizationUtils';

export interface OrgThemeColor {
  name: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  avatarBg: string;
  avatarText: string;
  cardBorder: string;
  pillBg: string;
  pillText: string;
}

export const ORG_COLORS: Record<string, OrgThemeColor> = {
  SSC: {
    name: 'Light Blue',
    badgeBg: 'bg-[#bae6fd]',
    badgeText: 'text-[#0369a1]',
    badgeBorder: 'border-[#7dd3fc]',
    avatarBg: 'bg-[#38bdf8]',
    avatarText: 'text-slate-900',
    cardBorder: 'hover:border-[#38bdf8]',
    pillBg: 'bg-[#0284c7]',
    pillText: 'text-white'
  },
  CELS: {
    name: 'Green',
    badgeBg: 'bg-[#bbf7d0]',
    badgeText: 'text-[#14532d]',
    badgeBorder: 'border-[#4ade80]',
    avatarBg: 'bg-[#16a34a]',
    avatarText: 'text-white',
    cardBorder: 'hover:border-[#22c55e]',
    pillBg: 'bg-[#16a34a]',
    pillText: 'text-white'
  },
  CBIT: {
    name: 'Yellow',
    badgeBg: 'bg-[#fef08a]',
    badgeText: 'text-[#854d0e]',
    badgeBorder: 'border-[#facc15]',
    avatarBg: 'bg-[#eab308]',
    avatarText: 'text-slate-900',
    cardBorder: 'hover:border-[#eab308]',
    pillBg: 'bg-[#eab308]',
    pillText: 'text-amber-950'
  },
  CFMS: {
    name: 'Blue',
    badgeBg: 'bg-[#bfdbfe]',
    badgeText: 'text-[#1e40af]',
    badgeBorder: 'border-[#60a5fa]',
    avatarBg: 'bg-[#2563eb]',
    avatarText: 'text-white',
    cardBorder: 'hover:border-[#3b82f6]',
    pillBg: 'bg-[#2563eb]',
    pillText: 'text-white'
  },
  CMFS: {
    name: 'Blue',
    badgeBg: 'bg-[#bfdbfe]',
    badgeText: 'text-[#1e40af]',
    badgeBorder: 'border-[#60a5fa]',
    avatarBg: 'bg-[#2563eb]',
    avatarText: 'text-white',
    cardBorder: 'hover:border-[#3b82f6]',
    pillBg: 'bg-[#2563eb]',
    pillText: 'text-white'
  },
  CESS: {
    name: 'Purple',
    badgeBg: 'bg-[#e9d5ff]',
    badgeText: 'text-[#6b21a8]',
    badgeBorder: 'border-[#c084fc]',
    avatarBg: 'bg-[#9333ea]',
    avatarText: 'text-white',
    cardBorder: 'hover:border-[#a855f7]',
    pillBg: 'bg-[#9333ea]',
    pillText: 'text-white'
  },
  KAABAG: {
    name: 'Light Green',
    badgeBg: 'bg-[#d9f99d]',
    badgeText: 'text-[#3f6212]',
    badgeBorder: 'border-[#a3e635]',
    avatarBg: 'bg-[#84cc16]',
    avatarText: 'text-slate-900',
    cardBorder: 'hover:border-[#84cc16]',
    pillBg: 'bg-[#65a30d]',
    pillText: 'text-white'
  },
  SENSSO: {
    name: 'Maroon',
    badgeBg: 'bg-[#ffe4e6]',
    badgeText: 'text-[#800000]',
    badgeBorder: 'border-[#be123c]',
    avatarBg: 'bg-[#800000]',
    avatarText: 'text-white',
    cardBorder: 'hover:border-[#800000]',
    pillBg: 'bg-[#800000]',
    pillText: 'text-white'
  },
  SenSo: {
    name: 'Maroon',
    badgeBg: 'bg-[#ffe4e6]',
    badgeText: 'text-[#800000]',
    badgeBorder: 'border-[#be123c]',
    avatarBg: 'bg-[#800000]',
    avatarText: 'text-white',
    cardBorder: 'hover:border-[#800000]',
    pillBg: 'bg-[#800000]',
    pillText: 'text-white'
  },
  OSD: {
    name: 'Amber Gold',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    avatarBg: 'bg-amber-600',
    avatarText: 'text-white',
    cardBorder: 'hover:border-amber-500',
    pillBg: 'bg-amber-600',
    pillText: 'text-white'
  },
  OVCSAS: {
    name: 'Purple',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    badgeBorder: 'border-purple-300',
    avatarBg: 'bg-purple-600',
    avatarText: 'text-white',
    cardBorder: 'hover:border-purple-500',
    pillBg: 'bg-purple-600',
    pillText: 'text-white'
  },
  OC: {
    name: 'Indigo',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-900',
    badgeBorder: 'border-indigo-300',
    avatarBg: 'bg-indigo-700',
    avatarText: 'text-white',
    cardBorder: 'hover:border-indigo-500',
    pillBg: 'bg-indigo-700',
    pillText: 'text-white'
  },
  ADMIN: {
    name: 'Slate',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-900',
    badgeBorder: 'border-slate-300',
    avatarBg: 'bg-slate-800',
    avatarText: 'text-white',
    cardBorder: 'hover:border-slate-600',
    pillBg: 'bg-slate-800',
    pillText: 'text-white'
  }
};

export const getOrgTheme = (orgId?: string): OrgThemeColor => {
  if (!orgId) return ORG_COLORS.SSC;
  const key = orgId.toUpperCase();
  if (key === 'SENSSO' || key === 'SENSO') return ORG_COLORS.SENSSO;
  if (key === 'CFMS' || key === 'CMFS' || key === 'FIMSSO') return ORG_COLORS.CFMS;
  if (key === 'KAABAG') return ORG_COLORS.KAABAG;
  if (key === 'CELS' || key === 'ELSSA') return ORG_COLORS.CELS;
  if (key === 'CBIT' || key === 'CBIT SEC') return ORG_COLORS.CBIT;
  if (key === 'CESS' || key === 'CESS SO') return ORG_COLORS.CESS;
  if (key === 'SSC') return ORG_COLORS.SSC;
  if (key === 'OSD') return ORG_COLORS.OSD;
  if (key === 'OVCSAS') return ORG_COLORS.OVCSAS;
  if (key === 'OC') return ORG_COLORS.OC;
  if (key === 'ADMIN') return ORG_COLORS.ADMIN;
  return ORG_COLORS[orgId] || ORG_COLORS.SSC;
};

export const ORGANIZATIONS: StudentOrganization[] = [
  {
    id: 'SSC',
    name: 'Supreme Student Council',
    acronym: 'SSC',
    nature: 'Apex Student Government & Institutional Representation',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-001',
    dateOfApplication: '2026-01-10',
    memberCount: 4850,
    attachmentCount: 16,
    color: 'lightblue',
    description: 'The highest governing student council of Mindanao State University at Naawan, representing the entire student body.',
    president: 'Al-Christian Molina',
    facultyAdviser: 'Cristy K.C. Patajo',
    officeLocation: 'Student Activity Center, 2nd Floor, Room 201',
    objectives: [
      'Represent and safeguard the general welfare, democratic rights, and academic interests of all MSU Naawan students.',
      'Formulate and execute high-impact campus-wide developmental action plans, leadership summits, and cultural events.',
      'Ensure absolute fiscal transparency, institutional accountability, and compliance with the Student Handbook and university regulations.'
    ],
    membersList: [
      { id: 'ssc-1', fullName: 'Al-Christian Molina', contactNumber: '+63 917 842 1092', email: 'alchristian.molina@msunaawan.edu.ph', role: 'President' }
    ],
    attachments: [
      { id: 'att-1', title: 'SSC Constitution and By-Laws (2026 Revised).pdf', type: 'PDF', fileSize: '2.4 MB', uploadDate: '2026-01-10' },
      { id: 'att-2', title: 'Certificate of University Recognition.pdf', type: 'PDF', fileSize: '850 KB', uploadDate: '2026-01-15' },
      { id: 'att-3', title: 'Annual Financial Audit & Liquidation Report.xlsx', type: 'XLSX', fileSize: '1.2 MB', uploadDate: '2026-02-01' }
    ]
  },
  {
    id: 'CBIT',
    name: 'College of Business and Information Technology Student Executive Council',
    acronym: 'CBIT SEC',
    nature: 'Academic & Information Technology Student Council',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-002',
    dateOfApplication: '2026-01-12',
    memberCount: 680,
    attachmentCount: 12,
    color: 'yellow',
    description: 'Empowering future business leaders and technologists through innovation, hackathons, and corporate mentorship.',
    president: 'Kian Christian Estenzo',
    facultyAdviser: 'Louren Mar Chio',
    officeLocation: 'CBIT Complex, Room 104',
    objectives: [
      'Foster academic and technological excellence in computing, business administration, and information management.',
      'Organize competitive software hackathons, startup venture pitch clinics, and IT symposiums.',
      'Bridge the gap between academic learning and industry standards through alumni mentorship and corporate partnerships.'
    ],
    membersList: [
      { id: 'cbit-1', fullName: 'Kian Christian Estenzo', contactNumber: '+63 917 442 8891', email: 'kianchristian.estenzo@msunaawan.edu.ph', role: 'President' }
    ],
    attachments: [
      { id: 'att-4', title: 'CBIT By-Laws & Code of Ethics.pdf', type: 'PDF', fileSize: '1.8 MB', uploadDate: '2026-01-12' },
      { id: 'att-5', title: 'IT Labs Safety & Event Guidelines.pdf', type: 'PDF', fileSize: '920 KB', uploadDate: '2026-01-20' }
    ]
  },
  {
    id: 'CESS',
    name: 'College of Education and Social Sciences Student Organization',
    acronym: 'CESS SO',
    nature: 'Academic & Professional Education and Social Sciences Council',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-003',
    dateOfApplication: '2026-01-14',
    memberCount: 420,
    attachmentCount: 9,
    color: 'violet',
    description: 'Fostering excellence in future educators, social research, cultural advocacy, and developmental social sciences.',
    president: 'Karlo Emmanuel Tan',
    facultyAdviser: 'Dr. Manuel Alcantara, Ph.D.',
    officeLocation: 'CESS Building, Room 202',
    objectives: [
      'Cultivate pedagogical mastery, ethical educator values, and social science inquiry among pre-service teachers.',
      'Lead community literacy outreach, tutorial programs, and educational development forums in Northern Mindanao.',
      'Support student teacher practicum readiness and licensure exam preparedness.'
    ],
    membersList: [
      { id: 'cess-1', fullName: 'Karlo Emmanuel Tan', contactNumber: '+63 927 619 4430', email: 'karlo.tan@msun.edu.ph', role: 'President' }
    ],
    attachments: [
      { id: 'att-6', title: 'CESS Charter and Student Welfare Guidelines.pdf', type: 'PDF', fileSize: '1.5 MB', uploadDate: '2026-01-14' }
    ]
  },
  {
    id: 'CELS',
    name: 'Environment and Life Sciences Student Alliance',
    acronym: 'ELSSA',
    nature: 'Environmental, Biological & Life Sciences Academic Council',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-004',
    dateOfApplication: '2026-01-18',
    memberCount: 920,
    attachmentCount: 11,
    color: 'green',
    description: 'Advancing research in ecological management, biodiversity conservation, biological sciences, and sustainable environmental systems.',
    president: 'Beatrice Mae Flores',
    facultyAdviser: 'Dr. Evelyn Joy Soriano',
    officeLocation: 'CELS Complex, Life Sciences Annex B',
    objectives: [
      'Champion biodiversity preservation, terrestrial ecology research, and sustainable resource management.',
      'Organize scientific symposia, environmental conservation caravans, and field research exhibitions.',
      'Advocate for eco-friendly campus policies and active climate action initiatives.'
    ],
    membersList: [
      { id: 'cels-1', fullName: 'Beatrice Mae Flores', contactNumber: '+63 919 332 7811', email: 'beatrice.flores@msun.edu.ph', role: 'President' }
    ],
    attachments: [
      { id: 'att-7', title: 'CELS Environmental Charter and Fieldwork Guidelines.pdf', type: 'PDF', fileSize: '1.9 MB', uploadDate: '2026-01-18' }
    ]
  },
  {
    id: 'CMFS',
    name: 'Fisheries and Marine Science Student Organization',
    acronym: 'FIMSSO',
    nature: 'Marine Research, Aquaculture & Fisheries Sciences',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-005',
    dateOfApplication: '2026-01-22',
    memberCount: 540,
    attachmentCount: 14,
    color: 'blue',
    description: 'Championing coastal resource management, aquaculture innovation, and marine ecosystem conservation.',
    president: 'Althea Nicole Gomez',
    facultyAdviser: 'Dr. Arnel M. Macas, Marine Biologist',
    officeLocation: 'Marine Biological Station, Coastal Wing',
    objectives: [
      'Spearhead coastal resource conservation, sustainable aquaculture practices, and marine biology innovation.',
      'Conduct regular coastal cleanups, mangrove reforestation drives, and coral reef monitoring campaigns.',
      'Promote fisheries science literacy and coastal community livelihood support.'
    ],
    membersList: [
      { id: 'cmfs-1', fullName: 'Althea Nicole Gomez', contactNumber: '+63 918 204 8819', email: 'althea.gomez@msun.edu.ph', role: 'President' }
    ],
    attachments: [
      { id: 'att-8', title: 'FIMSSO Marine Ecology Research Protocol.pdf', type: 'PDF', fileSize: '2.1 MB', uploadDate: '2026-01-22' }
    ]
  },
  {
    id: 'KAABAG',
    name: 'KAABAG Student Peer Facilitators',
    acronym: 'KAABAG',
    nature: 'Mental Health, Peer Counseling & Community Welfare Alliance',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-006',
    dateOfApplication: '2026-01-25',
    memberCount: 310,
    attachmentCount: 8,
    color: 'lightgreen',
    description: 'Providing empathetic peer mentoring, mental wellness caravans, disaster response aid, and student relief funds.',
    president: 'Gabriel Angelo Cruz',
    facultyAdviser: 'Prof. Lilia Hernandez, RGC',
    officeLocation: 'University Guidance & Counseling Center',
    objectives: [
      'Promote holistic mental health awareness, emotional resilience, and peer counseling support across the student populace.',
      'Provide confidential peer facilitation, stress debriefing sessions, and wellness workshops.',
      'Coordinate student emergency relief aid and disaster response assistance for affected members.'
    ],
    membersList: [
      { id: 'kaabag-1', fullName: 'Gabriel Angelo Cruz', contactNumber: '+63 922 751 3302', email: 'gabriel.cruz@msun.edu.ph', role: 'President' }
    ],
    attachments: [
      { id: 'att-9', title: 'KAABAG Peer Helper Accreditation & Ethics.pdf', type: 'PDF', fileSize: '1.1 MB', uploadDate: '2026-01-25' }
    ]
  },
  {
    id: 'SenSo',
    name: 'Senior Student Society',
    acronym: 'SENSSO',
    nature: 'Senior Student Council & Graduating Class Guild',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-008',
    dateOfApplication: '2026-01-28',
    memberCount: 220,
    attachmentCount: 10,
    color: 'maroon',
    description: 'Dedicated to graduating seniors, capstone research symposia, leadership transition, and professional career readiness.',
    president: 'Corazon Patricia Lim',
    facultyAdviser: 'Prof. Jaime Dela Rosa',
    officeLocation: 'University Amphitheater, Backstage Rm 3',
    objectives: [
      'Represent the graduating cohort and oversee commencement readiness, senior traditions, and career transition programs.',
      'Organize professional licensure preparatory lectures, resume writing seminars, and mock job interviews.',
      'Facilitate strong graduating class alumni network linkages and university legacy endowments.'
    ],
    membersList: [
      { id: 'senso-1', fullName: 'Corazon Patricia Lim', contactNumber: '+63 917 662 9014', email: 'corazon.lim@msun.edu.ph', role: 'President' }
    ],
    attachments: [
      { id: 'att-11', title: 'Senior Student Society Charter & Graduation Transition Manual.pdf', type: 'PDF', fileSize: '1.3 MB', uploadDate: '2026-01-28' }
    ]
  }
];

export const NON_COLLEGE_ORGS: string[] = ['SSC', 'KAABAG', 'SENSSO', 'SenSo'];

export function isCollegeOrg(orgId?: string): boolean {
  if (!orgId) return false;
  const upper = orgId.toUpperCase();
  if (NON_COLLEGE_ORGS.includes(upper)) return false;
  return [
    'CBIT', 'CBIT SEC',
    'CELS', 'ELSSA',
    'CFMS', 'CMFS', 'FIMSSO',
    'CESS', 'CESS SO'
  ].includes(upper) || upper.startsWith('C');
}

/**
 * Returns the active parent student organizations
 */
export const getActiveParentOrganizations = (): StudentOrganization[] => {
  return ORGANIZATIONS.filter(o => o.status === 'Active');
};

/**
 * Returns the count of active parent student organizations (7)
 */
export const getActiveParentOrganizationsCount = (): number => {
  return getActiveParentOrganizations().length;
};

/**
 * Checks whether two organization IDs or acronyms match (accounting for renaming and aliases like SENSSO/SenSo)
 */
export function isOrgMatch(id1?: string, id2?: string): boolean {
  if (!id1 || !id2) return false;
  return isSameOrg(id1, id2);
}

/**
 * Returns true ONLY if the Detailed Activity Design (DAD) form has been filled out and submitted.
 */
export function isDadFormCompleted(activity?: Activity | null): boolean {
  return Boolean(activity?.designForm?.isCompleted);
}

/**
 * Returns an unsubmitted initial workflow timeline for an Action Plan imported activity.
 * Stage 1 (Organization Submission) is 'in_progress' (awaiting organization DAD submission),
 * and all subsequent approval stages are 'pending'.
 */
export function getInitialTimelineForActionPlan(orgId: string): TimelineStep[] {
  return getWorkflowTimelineForOrg(orgId, false);
}

/**
 * Dynamic Workflow Generation:
 * 
 * CENTRAL / NON-COLLEGE (SSC, KAABAG, SENSSO):
 *   Stage 1: Organization Submission (ROLE_ORGANIZATION)
 *   Stage 2: Adviser Review (ROLE_ADVISER)
 *   Stage 3: OSD Approval (ROLE_OSD)
 *   Stage 4: OVCSAS Approval / Endorsement (ROLE_OVCSAS)
 *   Stage 5: Accomplishment & Liquidation Report Submission (ROLE_ORGANIZATION)
 *   Stage 6: Adviser Accomplishment Review & Final Sign-Off (ROLE_ADVISER)
 *   -> APPROVED / COMPLETED
 *   (Dean stage does NOT exist)
 * 
 * COLLEGE ORGANIZATIONS (CBIT, CELS, CFMS, CESS):
 *   Stage 1: Organization Submission (ROLE_ORGANIZATION)
 *   Stage 2: Adviser Review (ROLE_ADVISER)
 *   Stage 3: College Dean Endorsement (ROLE_DEAN)
 *   Stage 4: OSD Approval (ROLE_OSD)
 *   Stage 5: OVCSAS Approval / Endorsement (ROLE_OVCSAS)
 *   Stage 6: Accomplishment & Liquidation Report Submission (ROLE_ORGANIZATION)
 *   Stage 7: Adviser Accomplishment Review & Final Sign-Off (ROLE_ADVISER)
 *   -> APPROVED / COMPLETED
 */
export function getWorkflowTimelineForOrg(orgId: string, dadCompleted = false): TimelineStep[] {
  const stage1Status = dadCompleted ? ('completed' as const) : ('in_progress' as const);
  const stage2Status = dadCompleted ? ('in_progress' as const) : ('pending' as const);
  const stage1UpdatedAt = dadCompleted ? '2026-09-01' : undefined;

  if (isCollegeOrg(orgId)) {
    return [
      { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: stage1Status, ...(stage1UpdatedAt ? { updatedAt: stage1UpdatedAt } : {}) },
      { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: stage2Status },
      { id: 3, title: 'College Dean Endorsement', role: 'ROLE_DEAN', status: 'pending' },
      { id: 4, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
      { id: 5, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
      { id: 6, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
      { id: 7, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
    ];
  } else {
    // Non-College (SSC, KAABAG, SENSSO) — Dean stage DOES NOT EXIST
    return [
      { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: stage1Status, ...(stage1UpdatedAt ? { updatedAt: stage1UpdatedAt } : {}) },
      { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: stage2Status },
      { id: 3, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
      { id: 4, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
      { id: 5, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
      { id: 6, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
    ];
  }
}

export const DEFAULT_WORKFLOW_TIMELINE: TimelineStep[] = [
  { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: 'in_progress' },
  { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: 'pending' },
  { id: 3, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
  { id: 4, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
  { id: 5, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
  { id: 6, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
];

export function getMaxStagesForActivity(orgIdOrActivity: string | Activity): number {
  const orgId = typeof orgIdOrActivity === 'string' ? orgIdOrActivity : orgIdOrActivity.orgId;
  return isCollegeOrg(orgId) ? 7 : 6;
}

export function getTimelineStageIndex(activity: Activity): number {
  // CRITICAL: An activity cannot advance past Stage 1 until its DAD form is filled out and submitted!
  if (!isDadFormCompleted(activity)) {
    return 1;
  }
  const max = getMaxStagesForActivity(activity);
  const isCol = isCollegeOrg(activity.orgId);
  const finalAdviserStage = isCol ? 7 : 6;

  // 1. If activity has completed the final adviser sign-off / full liquidation
  const finalStep = activity.timeline?.find(s => s.id === max);
  if (finalStep?.status === 'completed' || activity.workflowStatus === 'COMPLETED' || activity.status === 'Approved' || activity.approvalStatus === 'Fully Approved') {
    return max;
  }

  // 2. CRITICAL: If organization already finished submitting the accomplishment report,
  // it is forwarded directly to their adviser for final signature (Stage 6 for Central, Stage 7 for College)!
  if (activity.accomplishmentForm?.isCompleted) {
    return finalAdviserStage;
  }

  // 3. Active in_progress step in timeline takes primary priority!
  if (activity.timeline && activity.timeline.length > 0) {
    const inProgress = activity.timeline.find(s => s.status === 'in_progress');
    if (inProgress && inProgress.id > 1) return Math.min(inProgress.id, max);
    const lastCompleted = [...activity.timeline].reverse().find(s => s.status === 'completed');
    if (lastCompleted && lastCompleted.id >= 1) return Math.min(Math.max(lastCompleted.id + 1, 2), max);
  }

  // 4. approvalStageIndex fallback
  if (typeof activity.approvalStageIndex === 'number' && activity.approvalStageIndex > 1) {
    return Math.min(activity.approvalStageIndex, max);
  }

  // 5. Explicit approvalStage label matches
  const stage = (activity.approvalStage || '').toLowerCase();
  if (stage.includes('sign-off') || stage.includes('final review') || stage.includes('adviser accomplishment') || stage.includes('adviser final')) return isCol ? 7 : 6;
  if (stage.includes('accomplishment') || stage.includes('liquidation')) return isCol ? 6 : 5;
  if (stage.includes('ovcsas')) return isCol ? 5 : 4;
  if (stage.includes('osd')) return isCol ? 4 : 3;
  if (stage.includes('dean') || stage.includes('college')) return isCol ? 3 : 2;
  if (stage.includes('adviser')) return 2;
  return 2;
}

export function isActivityFullyApproved(activity: Activity): boolean {
  // CRITICAL: Cannot be approved if DAD form is not yet filled out!
  if (!isDadFormCompleted(activity)) return false;
  if (activity.approvalStatus === 'Fully Approved') return true;
  if (activity.approvalStatus === 'Rejected') return false;
  if (activity.workflowStatus === 'COMPLETED') return true;
  if (activity.timeline && activity.timeline.length > 0 && activity.timeline.every(s => s.status === 'completed')) return true;
  const max = getMaxStagesForActivity(activity);
  const sFinal = activity.timeline?.find(s => s.id === max);
  if (sFinal?.status === 'completed') return true;
  if (activity.status === 'Approved' || activity.status === 'APPROVED') {
    if (activity.accomplishmentForm?.isCompleted) {
      if (sFinal && (sFinal.status as string) !== 'completed') return false;
    }
    return true;
  }
  return false;
}

export interface StepPermissionResult {
  canApprove: boolean;
  canDefer: boolean;
  canReject?: boolean;
  expectedRole: string;
  expectedOrg: string;
  expectedTitle: string;
  reason: string;
}

export function evaluateStepPermission(
  currentUser: UserAccount | null | undefined,
  activity: Activity,
  stepId: number
): StepPermissionResult {
  const isCollege = isCollegeOrg(activity.orgId);
  const orgName = activity.orgId;

  if (!currentUser) {
    return {
      canApprove: false,
      canDefer: false,
      expectedRole: 'Authenticated User',
      expectedOrg: orgName,
      expectedTitle: 'Sign-in required',
      reason: 'Please switch or log in as an authorized user to act on this proposal.'
    };
  }

  const activeRole = currentUser.activeRole || currentUser.role;

  // System Administrator can oversee but does not automatically approve
  if (activeRole === 'ROLE_ADMIN' || activeRole === 'System Administrator' || activeRole === 'SysAd') {
    return {
      canApprove: false,
      canDefer: false,
      canReject: false,
      expectedRole: 'ROLE_ADMIN',
      expectedOrg: 'ADMIN',
      expectedTitle: 'System Administrator',
      reason: 'System Admin manages system configuration and does not sign off on activities.'
    };
  }

  // CRITICAL: No stage can be approved or deferred if the DAD form is not yet filled out!
  if (!isDadFormCompleted(activity)) {
    return {
      canApprove: false,
      canDefer: false,
      canReject: false,
      expectedRole: 'ROLE_ORGANIZATION',
      expectedOrg: orgName,
      expectedTitle: `${orgName} Organization User (DAD Form Required)`,
      reason: stepId === 1
        ? 'Please fill out and submit the Detailed Activity Design (DAD) form first.'
        : 'Approval locked: Detailed Activity Design (DAD) form has not been filled out and submitted yet.'
    };
  }

  const role = activeRole;
  const userOrgId = currentUser.orgId;
  const userCollegeId = currentUser.collegeId || currentUser.orgId;

  if (isCollege) {
    if (stepId === 1) {
      const match = (role === 'ROLE_ORGANIZATION' || role === 'Org President') && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match && isDadFormCompleted(activity),
        canDefer: false,
        canReject: false,
        expectedRole: 'ROLE_ORGANIZATION',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization User`,
        reason: match ? 'Authorized to submit' : `Only the ${orgName} Organization User can submit this proposal.`
      };
    }
    if (stepId === 2) {
      const match = (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_ADVISER',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? 'Authorized to review' : `Only the assigned ${orgName} Adviser can review and defer/endorse this proposal.`
      };
    }
    if (stepId === 3) {
      const match = (role === 'ROLE_DEAN' || role === 'Dean / College Reviewer' || role === 'College Dean') &&
        (isSameOrg(userCollegeId, activity.orgId) || isSameOrg(userCollegeId, activity.collegeId));
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_DEAN',
        expectedOrg: orgName,
        expectedTitle: `${orgName} College Dean`,
        reason: match ? 'Authorized to endorse' : `Only the Dean of ${orgName} can review and defer/endorse this proposal.`
      };
    }
    if (stepId === 4) {
      const match = role === 'ROLE_OSD' || role === 'OSD Officer' || role === 'OSD Director' || role.includes('OSD');
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_OSD',
        expectedOrg: 'OSD',
        expectedTitle: 'OSD Officer',
        reason: match ? 'Authorized to approve' : 'Only the OSD Officer can approve or defer at this stage.'
      };
    }
    if (stepId === 5) {
      const match = role === 'ROLE_OVCSAS' || role === 'OVCSAS Officer' || role.includes('OVCSAS');
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_OVCSAS',
        expectedOrg: 'OVCSAS',
        expectedTitle: 'OVCSAS Officer',
        reason: match ? 'Authorized for OVCSAS final approval' : 'Only the OVCSAS Officer can grant final proposal approval.'
      };
    }
    if (stepId === 6) {
      // Accomplishment Report Submission: Student Org must fill out accomplishmentForm first
      const match = (role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'Org Treasurer') && isSameOrg(userOrgId, activity.orgId);
      const hasAccomp = Boolean(activity.accomplishmentForm?.isCompleted);
      return {
        canApprove: match && hasAccomp,
        canDefer: false,
        canReject: false,
        expectedRole: 'ROLE_ORGANIZATION',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization Leadership`,
        reason: !hasAccomp
          ? 'Please fill out and submit the Activity Accomplishment Report form first.'
          : (match ? 'Authorized to submit accomplishment report' : `Only the ${orgName} Organization leadership can fill and submit the accomplishment report.`)
      };
    }
    if (stepId === 7) {
      // Adviser Accomplishment Review & Final Sign-Off: Faculty Adviser
      const match = (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_ADVISER',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? 'Authorized for final sign-off' : `Only the assigned ${orgName} Adviser can review and grant final sign-off on the accomplishment report.`
      };
    }
  } else {
    // CENTRAL (SSC, KAABAG, SENSSO) — No Dean stage!
    if (stepId === 1) {
      const match = (role === 'ROLE_ORGANIZATION' || role === 'Org President') && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: false,
        canReject: false,
        expectedRole: 'ROLE_ORGANIZATION',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization User`,
        reason: match ? 'Authorized to submit' : `Only the ${orgName} Organization User can submit this proposal.`
      };
    }
    if (stepId === 2) {
      const match = (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_ADVISER',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? 'Authorized to review' : `Only the assigned ${orgName} Adviser can review and defer/endorse this proposal.`
      };
    }
    if (stepId === 3) {
      const match = role === 'ROLE_OSD' || role === 'OSD Officer' || role === 'OSD Director' || role.includes('OSD');
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_OSD',
        expectedOrg: 'OSD',
        expectedTitle: 'OSD Officer',
        reason: match ? 'Authorized to approve' : 'Only the OSD Officer can approve or defer at this stage.'
      };
    }
    if (stepId === 4) {
      const match = role === 'ROLE_OVCSAS' || role === 'OVCSAS Officer' || role.includes('OVCSAS');
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_OVCSAS',
        expectedOrg: 'OVCSAS',
        expectedTitle: 'OVCSAS Officer',
        reason: match ? 'Authorized for OVCSAS final approval' : 'Only the OVCSAS Officer can grant final proposal approval.'
      };
    }
    if (stepId === 5) {
      // Accomplishment Report Submission: Central Org must fill out accomplishmentForm first
      const match = (role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'Org Treasurer') && isSameOrg(userOrgId, activity.orgId);
      const hasAccomp = Boolean(activity.accomplishmentForm?.isCompleted);
      return {
        canApprove: match && hasAccomp,
        canDefer: false,
        canReject: false,
        expectedRole: 'ROLE_ORGANIZATION',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization Leadership`,
        reason: !hasAccomp
          ? 'Please fill out and submit the Activity Accomplishment Report form first.'
          : (match ? 'Authorized to submit accomplishment report' : `Only the ${orgName} Organization leadership can fill and submit the accomplishment report.`)
      };
    }
    if (stepId === 6) {
      // Adviser Accomplishment Review & Final Sign-Off: Faculty Adviser
      const match = (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') && isSameOrg(userOrgId, activity.orgId);
      return {
        canApprove: match,
        canDefer: match,
        canReject: match,
        expectedRole: 'ROLE_ADVISER',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? 'Authorized for final sign-off' : `Only the assigned ${orgName} Adviser can review and grant final sign-off on the accomplishment report.`
      };
    }
  }

  return {
    canApprove: false,
    canDefer: false,
    expectedRole: 'Unknown',
    expectedOrg: orgName,
    expectedTitle: 'Unauthorized',
    reason: 'Not authorized for this stage.'
  };
}

export function isActivityVisibleForUser(
  activity: Activity,
  currentUser: UserAccount | null | undefined,
  queueType: 'pending' | 'deferred' | 'approved' | 'rejected' | 'all' = 'all'
): boolean {
  if (!currentUser) return false;
  const role = currentUser.activeRole || currentUser.role || '';

  // 1. System Administrator sees all activities
  if (role === 'ROLE_ADMIN' || role === 'System Administrator' || role === 'SysAd') {
    return true;
  }

  const isCollege = isCollegeOrg(activity.orgId);
  const userOrg = currentUser.orgId || '';
  const userCollege = currentUser.collegeId || currentUser.orgId || '';

  const currentStage = getTimelineStageIndex(activity);
  const osdStage = isCollege ? 4 : 3;
  const ovcsasStage = isCollege ? 5 : 4;
  const ocStage = isCollege ? 6 : 5;
  const fullyApproved = isActivityFullyApproved(activity);

  // 2. Student Organization user: ONLY activities belonging to their own organization
  if (role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'Org Treasurer') {
    if (!isSameOrg(activity.orgId, userOrg)) return false;
    if (queueType === 'pending') {
      return !fullyApproved &&
        (activity.status === 'Pending' || activity.status === 'Under Review' || activity.approvalStatus === 'Pending Review' || activity.approvalStatus === 'Approved at Current Stage') &&
        activity.status !== 'DEFERRED' && activity.status !== 'DEFERRED FOR REVISION' && activity.approvalStatus !== 'Deferred' &&
        activity.status !== 'Rejected' && activity.approvalStatus !== 'Rejected';
    }
    if (queueType === 'deferred') {
      return activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION' || activity.approvalStatus === 'Deferred';
    }
    if (queueType === 'rejected') {
      return activity.status === 'Rejected' || activity.approvalStatus === 'Rejected';
    }
    if (queueType === 'approved') {
      return fullyApproved || activity.status === 'Approved' || activity.approvalStatus === 'Fully Approved';
    }
    return true;
  }

  // 3. Faculty Adviser: ONLY activities belonging to their designated organization
  if (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') {
    if (!isSameOrg(activity.orgId, userOrg)) return false;
    const stage2Done = activity.timeline?.some(s => s.id === 2 && s.status === 'completed');
    const isDeferred = activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION' || activity.approvalStatus === 'Deferred';
    const isRejected = activity.status === 'Rejected' || activity.approvalStatus === 'Rejected';
    if (queueType === 'pending') {
      return !fullyApproved && currentStage === 2 && !stage2Done && !isDeferred && !isRejected;
    }
    if (queueType === 'deferred') {
      return isDeferred;
    }
    if (queueType === 'rejected') {
      return isRejected;
    }
    if (queueType === 'approved') {
      const hasAdviserApproved = currentStage > 2 || stage2Done || fullyApproved ||
        activity.approvalDecisions?.some(d => (d.approverRole?.includes('ADVISER') || d.approverId === currentUser.id) && d.decision === 'APPROVE') ||
        activity.workflowHistory?.some(h => (h.actorRole?.includes('ADVISER') || h.actorId === currentUser.id) && (h.action === 'APPROVE' || (h.action as string) === 'APPROVED'));
      return Boolean(hasAdviserApproved);
    }
    return true;
  }

  // 4. College Dean: ONLY activities belonging to their college
  if (role === 'ROLE_DEAN' || role === 'College Dean' || role === 'Dean / College Reviewer') {
    const isColMatch = isSameOrg(activity.orgId, userOrg) || isSameOrg(activity.collegeId, userCollege) || isSameOrg(activity.orgId, userCollege);
    if (!isColMatch) return false;
    const stage3Done = activity.timeline?.some(s => s.id === 3 && s.status === 'completed');
    const isDeferred = activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION' || activity.approvalStatus === 'Deferred';
    const isRejected = activity.status === 'Rejected' || activity.approvalStatus === 'Rejected';
    if (queueType === 'pending') {
      return !fullyApproved && currentStage === 3 && !stage3Done && !isDeferred && !isRejected;
    }
    if (queueType === 'deferred') {
      return isDeferred;
    }
    if (queueType === 'rejected') {
      return isRejected;
    }
    if (queueType === 'approved') {
      const hasDeanApproved = currentStage > 3 || stage3Done || fullyApproved ||
        activity.approvalDecisions?.some(d => (d.approverRole?.includes('DEAN') || d.approverId === currentUser.id) && d.decision === 'APPROVE') ||
        activity.workflowHistory?.some(h => (h.actorRole?.includes('DEAN') || h.actorId === currentUser.id) && (h.action === 'APPROVE' || (h.action as string) === 'APPROVED'));
      return Boolean(hasDeanApproved);
    }
    return true;
  }

  // 5. OSD Officer: (Stage 3 for Central, Stage 4 for College)
  if (role === 'ROLE_OSD' || role === 'OSD Officer' || role === 'OSD Director' || role.includes('OSD')) {
    const osdDone = activity.timeline?.some(s => s.id === osdStage && s.status === 'completed');
    const isDeferred = activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION' || activity.approvalStatus === 'Deferred';
    const isRejected = activity.status === 'Rejected' || activity.approvalStatus === 'Rejected';
    if (queueType === 'pending') {
      return !fullyApproved && currentStage === osdStage && !osdDone && !isDeferred && !isRejected;
    }
    if (queueType === 'deferred') {
      return isDeferred && (currentStage === osdStage || Boolean(activity.deferredBy && activity.deferredBy.toLowerCase().includes('osd')));
    }
    if (queueType === 'rejected') {
      return isRejected;
    }
    if (queueType === 'approved') {
      const hasOsdApproved = currentStage > osdStage || osdDone || fullyApproved ||
        activity.workflowHistory?.some(h =>
          (h.actorRole?.includes('OSD') || (h as any).approverRole?.includes('OSD')) &&
          (h.action === 'APPROVE' || (h.action as string) === 'APPROVED')
        ) || activity.approvalDecisions?.some(d => d.approverRole.includes('OSD') && d.decision === 'APPROVE');
      return Boolean(hasOsdApproved);
    }
    return currentStage >= osdStage || fullyApproved;
  }

  // 6. OVCSAS Officer: (Stage 4 for Central, Stage 5 for College)
  if (role === 'ROLE_OVCSAS' || role === 'OVCSAS Officer' || role.includes('OVCSAS') || role.includes('Vice Chancellor')) {
    const ovcsasDone = activity.timeline?.some(s => s.id === ovcsasStage && s.status === 'completed');
    const isDeferred = activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION' || activity.approvalStatus === 'Deferred';
    const isRejected = activity.status === 'Rejected' || activity.approvalStatus === 'Rejected';
    if (queueType === 'pending') {
      return !fullyApproved && currentStage === ovcsasStage && !ovcsasDone && !isDeferred && !isRejected;
    }
    if (queueType === 'deferred') {
      return isDeferred && (currentStage === ovcsasStage || Boolean(activity.deferredBy && activity.deferredBy.toLowerCase().includes('ovcsas')));
    }
    if (queueType === 'rejected') {
      return isRejected;
    }
    if (queueType === 'approved') {
      const hasOvcsasApproved = currentStage > ovcsasStage || ovcsasDone || fullyApproved ||
        activity.workflowHistory?.some(h =>
          (h.actorRole?.includes('OVCSAS') || (h as any).approverRole?.includes('OVCSAS')) &&
          (h.action === 'APPROVE' || (h.action as string) === 'APPROVED' || (h.action as string) === 'ENDORSE')
        ) || activity.approvalDecisions?.some(d => d.approverRole.includes('OVCSAS') && d.decision === 'APPROVE');
      return Boolean(hasOvcsasApproved);
    }
    return currentStage >= ovcsasStage || fullyApproved;
  }

  // 7. Office of the Chancellor (ROLE_OC): (Stage 5 for Central, Stage 6 for College)
  if (role === 'ROLE_OC' || role === 'Office of the Chancellor' || role === 'Chancellor' || role.includes('Chancellor')) {
    if (queueType === 'pending') {
      return !fullyApproved && currentStage === ocStage &&
        activity.status !== 'DEFERRED' && activity.status !== 'DEFERRED FOR REVISION' && activity.approvalStatus !== 'Deferred' &&
        activity.status !== 'Rejected' && activity.approvalStatus !== 'Rejected';
    }
    if (queueType === 'deferred') {
      return (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION' || activity.approvalStatus === 'Deferred') &&
        (currentStage === ocStage || Boolean(activity.deferredBy && activity.deferredBy.toLowerCase().includes('chancellor')));
    }
    if (queueType === 'rejected') {
      return activity.status === 'Rejected' || activity.approvalStatus === 'Rejected';
    }
    if (queueType === 'approved') {
      const hasOcApproved = activity.workflowHistory?.some(h =>
        (h.actorRole?.includes('OC') || h.actorRole?.includes('Chancellor') || (h as any).approverRole?.includes('Chancellor')) &&
        (h.action === 'APPROVE' || (h.action as string) === 'APPROVED' || (h.action as string) === 'FINAL_APPROVE')
      ) || activity.approvalDecisions?.some(d => (d.approverRole.includes('OC') || d.approverRole.includes('Chancellor')) && d.decision === 'APPROVE');
      return fullyApproved || !!hasOcApproved;
    }
    return currentStage >= ocStage || fullyApproved;
  }

  if (queueType === 'rejected') {
    return activity.status === 'Rejected' || activity.approvalStatus === 'Rejected';
  }

  return false;
}

export function canOrgConfirmExternalClearance(
  currentUser: UserAccount | null | undefined,
  activity: Activity
): boolean {
  if (!currentUser) return false;
  if (currentUser.role === 'System Administrator') return true;
  return currentUser.orgId === activity.orgId && (currentUser.role === 'Org President' || currentUser.role === 'Org Treasurer');
}

/**
 * Strict permission check: ONLY the student organization officers
 * belonging to the activity's organization are authorized to fill out and submit
 * the Activity Accomplishment Report.
 */
export function isStudentOrgForActivity(
  currentUser: UserAccount | null | undefined,
  activity: Activity | null | undefined
): boolean {
  if (!currentUser || !activity) return false;

  const role = (currentUser.activeRole || currentUser.role || '').toLowerCase();

  // Explicitly deny administrative, adviser, dean, director, and executive roles
  const excludedRoles = [
    'role_adviser', 'faculty adviser', 'adviser',
    'role_dean', 'college dean', 'dean', 'dean / college reviewer',
    'role_osd', 'osd officer', 'osd director', 'osd',
    'role_ovcsas', 'ovcsas officer', 'ovcsas',
    'role_oc', 'office of the chancellor', 'chancellor',
    'role_admin', 'system administrator', 'system admin'
  ];
  if (excludedRoles.some(ex => role === ex || role.includes(ex))) {
    return false;
  }

  // Must have student organization officer role
  const isOrgRole =
    role === 'role_organization' ||
    role.includes('organization') ||
    role.includes('org president') ||
    role.includes('org treasurer') ||
    role.includes('officer');

  if (!isOrgRole) return false;

  // Must match the activity's organization ID (accounting for SENSSO/SenSo and aliases)
  return isSameOrg(currentUser.orgId, activity.orgId);
}

export const INITIAL_ACTIVITIES: Activity[] = [
  // 1. SSC Activity 1: Leadership Convergence (November 12-13)
  {
    id: 'ACT-2027-SSC-001',
    title: 'SSC Campus Leadership Convergence & Governance Caravan',
    programActivity: 'SSC Campus Leadership Convergence & Governance Caravan',
    orgId: 'SSC',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'November 12-13, 2026',
    timeframeMonth: 'November',
    timeframeWeek: 'Week 2',
    startDate: '2026-11-12',
    endDate: '2026-11-13',
    startTime: '08:00 AM',
    endTime: '05:00 PM',
    venue: 'MSUN University Amphitheater',
    description: 'University-wide student leadership training, organizational alignment, and student rights forum spearheaded by the Supreme Student Council.',
    strategicObjectives: 'Equip student leaders with ethical governance skills, project execution techniques, and transparency standards.',
    expectedOutput: 'Participation of all recognized student leaders, signed leadership pledge, and published institutional student welfare roadmap.',
    office: 'SSC',
    lineItemBudget: 'Leadership kits, certificates, meals, venue styling, and sound system.',
    amount: 18500,
    budget: 18500,
    totalBudget: 18500,
    fundSource: 'SSC Institutional Trust Fund',
    personAssigned: 'Al-Christian Molina (President)',
    targetParticipants: 350,
    isActionPlanItem: true,
    source: 'ACTION_PLAN',
    actionPlanStatus: 'Approved',
    actionPlanDecision: 'Approved',
    isPlanConfirmed: true,
    status: 'Draft',
    approvalStatus: 'Draft',
    workflowStatus: 'DRAFT',
    approvalStageIndex: 1,
    approvalStage: 'Stage 1: Organization Submission',
    strategicPillar: 'Student Leadership & Good Governance',
    proposedBy: 'Al-Christian Molina',
    submittedDate: '2026-10-25',
    kpiOutcome: '100% attendance of accredited organization executive boards',
    designForm: {
      controlNumber: 'DAD-2026-SSC-001',
      title: 'SSC Campus Leadership Convergence & Governance Caravan',
      department: 'Supreme Student Council',
      isCompleted: false,
      isSubmitted: false,
      venue: 'MSUN University Amphitheater',
      targetParticipants: 350,
      activityType: 'Leadership Seminar / Assembly'
    },
    timeline: [
      { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: 'in_progress' },
      { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: 'pending' },
      { id: 3, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
      { id: 4, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
      { id: 5, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
      { id: 6, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
    ]
  },
  // 2. SSC Activity 2: Annual Thanksgiving & Cultural Night (November 26)
  {
    id: 'ACT-2027-SSC-002',
    title: 'SSC Annual Thanksgiving Assembly & Cultural Gala',
    programActivity: 'SSC Annual Thanksgiving Assembly & Cultural Gala',
    orgId: 'SSC',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'November 26, 2026',
    timeframeMonth: 'November',
    timeframeWeek: 'Week 4',
    startDate: '2026-11-26',
    endDate: '2026-11-26',
    startTime: '05:00 PM',
    endTime: '10:00 PM',
    venue: 'MSUN University Gymnasium',
    description: 'University-wide student assembly, recognition of high-performing student initiatives, and cultural performing arts celebration.',
    strategicObjectives: 'Celebrate student unity, recognize exceptional student development milestones, and promote cultural performing arts.',
    expectedOutput: 'University-wide fellowship, conferment of outstanding student group awards, and cultural performance showcases.',
    office: 'SSC',
    lineItemBudget: 'Stage lighting, sound engineering, plaques of recognition, performer stipends, and fellowship refreshments.',
    amount: 24000,
    budget: 24000,
    totalBudget: 24000,
    fundSource: 'SSC Student Development Fund',
    personAssigned: 'Al-Christian Molina (President)',
    targetParticipants: 800,
    isActionPlanItem: true,
    source: 'ACTION_PLAN',
    actionPlanStatus: 'Approved',
    actionPlanDecision: 'Approved',
    isPlanConfirmed: true,
    status: 'Draft',
    approvalStatus: 'Draft',
    workflowStatus: 'DRAFT',
    approvalStageIndex: 1,
    approvalStage: 'Stage 1: Organization Submission',
    strategicPillar: 'Cultural Enrichment & Student Welfare',
    proposedBy: 'Al-Christian Molina',
    submittedDate: '2026-11-02',
    kpiOutcome: 'Broad participation across all college student bodies and high engagement',
    designForm: {
      controlNumber: 'DAD-2026-SSC-002',
      title: 'SSC Annual Thanksgiving Assembly & Cultural Gala',
      department: 'Supreme Student Council',
      isCompleted: false,
      isSubmitted: false,
      venue: 'MSUN University Gymnasium',
      targetParticipants: 800,
      activityType: 'Cultural / Performing Arts Gathering'
    },
    timeline: [
      { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: 'in_progress' },
      { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: 'pending' },
      { id: 3, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
      { id: 4, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
      { id: 5, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
      { id: 6, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
    ]
  },
  // 3. CBIT Activity 1: TechVenture Hackathon (November 14-15)
  {
    id: 'ACT-2027-CBIT-001',
    title: 'CBIT TechVenture Hackathon & Web Systems Showcase',
    programActivity: 'CBIT TechVenture Hackathon & Web Systems Showcase',
    orgId: 'CBIT',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'November 14-15, 2026',
    timeframeMonth: 'November',
    timeframeWeek: 'Week 2',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    startTime: '08:00 AM',
    endTime: '06:00 PM',
    venue: 'CBIT Computer Complex & Innovation Hub',
    description: 'A 48-hour collaborative programming hackathon and software exhibition showcasing cutting-edge student web and mobile systems.',
    strategicObjectives: 'Foster hands-on technological problem-solving, rapid prototyping, and industry-standard coding practices among computing students.',
    expectedOutput: 'Working software prototypes tackling local campus challenges, evaluated by faculty and guest industry judges.',
    office: 'CBIT',
    lineItemBudget: 'Cash prizes for top 3 teams, judges honoraria, network routing supplies, and hackathon sustenance.',
    amount: 16000,
    budget: 16000,
    totalBudget: 16000,
    fundSource: 'CBIT-SEC Student Fund',
    personAssigned: 'Kian Christian Estenzo (President)',
    targetParticipants: 180,
    isActionPlanItem: true,
    source: 'ACTION_PLAN',
    actionPlanStatus: 'Approved',
    actionPlanDecision: 'Approved',
    isPlanConfirmed: true,
    status: 'Draft',
    approvalStatus: 'Draft',
    workflowStatus: 'DRAFT',
    approvalStageIndex: 1,
    approvalStage: 'Stage 1: College Organization Submission',
    strategicPillar: 'Technology Innovation & Practical Skills Mastery',
    proposedBy: 'Kian Christian Estenzo',
    submittedDate: '2026-10-28',
    kpiOutcome: '12 completed software prototypes and 3 featured capstone candidates',
    designForm: {
      controlNumber: 'DAD-2026-CBIT-001',
      title: 'CBIT TechVenture Hackathon & Web Systems Showcase',
      department: 'College of Business and Information Technology Student Executive Council',
      isCompleted: false,
      isSubmitted: false,
      venue: 'CBIT Computer Complex & Innovation Hub',
      targetParticipants: 180,
      activityType: 'Hackathon & Technology Exhibition'
    },
    timeline: [
      { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: 'in_progress' },
      { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: 'pending' },
      { id: 3, title: 'College Dean Endorsement', role: 'ROLE_DEAN', status: 'pending' },
      { id: 4, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
      { id: 5, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
      { id: 6, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
      { id: 7, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
    ]
  },
  // 4. CBIT Activity 2: Career Readiness Summit (November 20)
  {
    id: 'ACT-2027-CBIT-002',
    title: 'CBIT Technopreneurship & Career Readiness Summit',
    programActivity: 'CBIT Technopreneurship & Career Readiness Summit',
    orgId: 'CBIT',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'November 20, 2026',
    timeframeMonth: 'November',
    timeframeWeek: 'Week 3',
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    startTime: '01:00 PM',
    endTime: '05:30 PM',
    venue: 'CBIT Amphitheater',
    description: 'Industry readiness seminar featuring alumni software engineers, startup founders, and technical HR managers.',
    strategicObjectives: 'Prepare graduating and senior computing students for tech industry interviews, startup funding, and tech freelancing.',
    expectedOutput: 'Resume reviews, tech career roadmaps, and internship placement opportunities with partner companies.',
    office: 'CBIT',
    lineItemBudget: 'Speaker honorarium, professional certificates, technical seminar materials, and afternoon snacks.',
    amount: 9500,
    budget: 9500,
    totalBudget: 9500,
    fundSource: 'CBIT-SEC Fund',
    personAssigned: 'Kian Christian Estenzo (President)',
    targetParticipants: 220,
    isActionPlanItem: true,
    source: 'ACTION_PLAN',
    actionPlanStatus: 'Approved',
    actionPlanDecision: 'Approved',
    isPlanConfirmed: true,
    status: 'Draft',
    approvalStatus: 'Draft',
    workflowStatus: 'DRAFT',
    approvalStageIndex: 1,
    approvalStage: 'Stage 1: College Organization Submission',
    strategicPillar: 'Career Readiness & Industry Linkages',
    proposedBy: 'Kian Christian Estenzo',
    submittedDate: '2026-11-04',
    kpiOutcome: '100% of attendees producing an industry-standard technical portfolio',
    designForm: {
      controlNumber: 'DAD-2026-CBIT-002',
      title: 'CBIT Technopreneurship & Career Readiness Summit',
      department: 'College of Business and Information Technology Student Executive Council',
      isCompleted: false,
      isSubmitted: false,
      venue: 'CBIT Amphitheater',
      targetParticipants: 220,
      activityType: 'Career Seminar & Symposium'
    },
    timeline: [
      { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: 'in_progress' },
      { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: 'pending' },
      { id: 3, title: 'College Dean Endorsement', role: 'ROLE_DEAN', status: 'pending' },
      { id: 4, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
      { id: 5, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
      { id: 6, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
      { id: 7, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
    ]
  }
];

export const FINANCIAL_SUMMARIES: Record<string, FinancialSummary> = {
  SSC: {
    orgId: 'SSC',
    totalBudget: 280000,
    spent: 0,
    remaining: 280000,
    utilizationRate: 0,
    liquidatedCount: 0,
    pendingLiquidationCount: 0,
    categories: [
      { name: 'Student Leadership & Governance', allocated: 90000, spent: 0 },
      { name: 'University-wide Events & Advocacy', allocated: 85000, spent: 0 },
      { name: 'Emergency Relief & Assistance', allocated: 45000, spent: 0 },
      { name: 'Administrative & Printing Operations', allocated: 35000, spent: 0 },
      { name: 'Contingency Reserve', allocated: 25000, spent: 0 }
    ]
  },
  CBIT: {
    orgId: 'CBIT',
    totalBudget: 140000,
    spent: 0,
    remaining: 140000,
    utilizationRate: 0,
    liquidatedCount: 0,
    pendingLiquidationCount: 0,
    categories: [
      { name: 'Hackathons & Tech Competitions', allocated: 55000, spent: 0 },
      { name: 'Software Licenses & IT Workshops', allocated: 35000, spent: 0 },
      { name: 'Student Academic Seminars', allocated: 25000, spent: 0 },
      { name: 'Logistics & Equipment', allocated: 25000, spent: 0 }
    ]
  }
};

export const NORMAN_PRINCIPLES: NormanPrincipleInfo[] = [
  {
    name: '1. Visibility',
    definition: 'Crucial features, current system state, and possible user actions should be immediately obvious without cognitive overload.',
    implementationInApp: [
      'Active navigation tabs are visually highlighted with high-contrast accent backgrounds.',
      'Approved and Pending activity badges are clearly color-coded with icon markers (emerald check vs. amber clock).',
      'The current Fiscal Year (e.g. Fiscal Year 2026) is permanently visible in the action plan header.'
    ]
  },
  {
    name: '2. Feedback',
    definition: 'Every user action should produce an immediate, unambiguous perceptible response confirming that the action was executed.',
    implementationInApp: [
      'Calendar Download Button triggers an immediate toast confirming the generation and download of the calendar file.',
      'Adding or importing an activity displays instantaneous confirmation toasts and adds the item to the active action plan.',
      'Horizontal swipe controls for Financial cards provide immediate visual scrolling translation and active indicator dots.'
    ]
  },
  {
    name: '3. Affordances',
    definition: 'Visual characteristics of UI elements should intuitively indicate how they are intended to be interacted with.',
    implementationInApp: [
      'Buttons feature distinct borders, elevation, and click press states that communicate clickability.',
      'The Financial container features clear left/right directional control buttons and scroll-snap tracks indicating horizontal swipeability.',
      'The Excel Import modal features a designated dashed dropzone that visually invites dragging files into it.'
    ]
  },
  {
    name: '4. Signifiers',
    definition: 'Explicit cues such as labels, icons, and tooltips that signal WHERE an action can take place and WHAT it does.',
    implementationInApp: [
      'Calendar button features a distinct Lucide calendar icon and clear "Download Schedule" signifier.',
      'Search input is paired with a magnifying glass icon and specific placeholder text ("Search activities by title, venue, or coordinator...").',
      'Organization dropdown contains the complete list of 8 student organizations with acronym tags.'
    ]
  },
  {
    name: '5. Mapping',
    definition: 'Natural, intuitive spatial and cognitive correspondence between controls and their real-world outcomes.',
    implementationInApp: [
      'Calendar view provides real 7-day grid mapping (Sunday through Saturday) matching conventional spatial expectations.',
      'Left/Right swipe buttons naturally advance the organization cards horizontally.',
      'Filters sit directly above the data container they control, preserving direct cause-and-effect relationship.'
    ]
  },
  {
    name: '6. Constraints',
    definition: 'Deliberate physical, logical, or semantic boundaries that guide behavior and prevent user mistakes before they occur.',
    implementationInApp: [
      'The Import modal strictly constrains accepted file types to .xlsx, rejecting invalid file extensions with immediate validation.',
      'Add Activity modal enforces mandatory input constraints (end date cannot precede start date, budget cannot be negative).',
      'Form submit button remains disabled with helper guidance until all required action plan fields are provided.'
    ]
  }
];

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  // 1. SSC Org Account
  {
    id: 'usr-ssc-org',
    studentId: '1020001',
    name: 'Al-Christian Molina',
    firstName: 'Al-Christian',
    lastName: 'Molina',
    email: 'alchristian.molina@msunaawan.edu.ph',
    username: 'alchristian.molina',
    avatar: 'AM',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    roles: ['ROLE_ORGANIZATION'],
    activeRole: 'ROLE_ORGANIZATION',
    displayRole: 'Student Organization Officer',
    selectedRole: 'President',
    orgId: 'SSC',
    orgName: 'Supreme Student Council',
    parentOrg: 'SSC',
    actualOrg: 'SSC',
    organizationType: 'CENTRAL',
    lastActive: 'Active Now',
    createdDate: '2026-01-05'
  },
  // 2. SSC Adviser Account
  {
    id: 'usr-ssc-adviser',
    studentId: '1020010',
    name: 'Cristy K.C. Patajo',
    firstName: 'Cristy K.C.',
    lastName: 'Patajo',
    email: 'cristykc.patajo@msunaawan.edu.ph',
    username: 'cristykc.patajo',
    avatar: 'CP',
    isActive: true,
    role: 'ROLE_ADVISER',
    roles: ['ROLE_ADVISER'],
    activeRole: 'ROLE_ADVISER',
    displayRole: 'Organization Adviser',
    selectedRole: 'Faculty Adviser',
    orgId: 'SSC',
    orgName: 'Supreme Student Council',
    parentOrg: 'SSC',
    actualOrg: 'SSC',
    organizationType: 'CENTRAL',
    lastActive: 'Active Now',
    createdDate: '2025-09-01'
  },
  // 3. CBIT Org Account
  {
    id: 'usr-cbit-org',
    studentId: '1020002',
    name: 'Kian Christian Estenzo',
    firstName: 'Kian Christian',
    lastName: 'Estenzo',
    email: 'kianchristian.estenzo@msunaawan.edu.ph',
    username: 'kianchristian.estenzo',
    avatar: 'KE',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    roles: ['ROLE_ORGANIZATION'],
    activeRole: 'ROLE_ORGANIZATION',
    displayRole: 'Student Organization Officer',
    selectedRole: 'President',
    orgId: 'CBIT',
    orgName: 'College of Business and Information Technology Student Executive Council',
    parentOrg: 'CBIT',
    actualOrg: 'CBIT',
    collegeId: 'CBIT',
    organizationType: 'COLLEGE',
    lastActive: 'Active Now',
    createdDate: '2026-01-08'
  },
  // 4. CBIT Adviser Account
  {
    id: 'usr-cbit-adviser',
    studentId: '1020011',
    name: 'Louren Mar Chio',
    firstName: 'Louren Mar',
    lastName: 'Chio',
    email: 'lourenmar.chio@msunaawan.edu.ph',
    username: 'lourenmar.chio',
    avatar: 'LC',
    isActive: true,
    role: 'ROLE_ADVISER',
    roles: ['ROLE_ADVISER'],
    activeRole: 'ROLE_ADVISER',
    displayRole: 'Organization Adviser',
    selectedRole: 'Faculty Adviser',
    orgId: 'CBIT',
    orgName: 'College of Business and Information Technology Student Executive Council',
    parentOrg: 'CBIT',
    actualOrg: 'CBIT',
    collegeId: 'CBIT',
    organizationType: 'COLLEGE',
    lastActive: 'Active Now',
    createdDate: '2025-09-01'
  },
  // 5. CBIT Dean Account
  {
    id: 'usr-cbit-dean',
    studentId: '1020012',
    name: 'Dr. Enelrad Cuteron',
    firstName: 'Enelrad',
    lastName: 'Cuteron',
    email: 'enelrad.cuteron@msunaawan.edu.ph',
    username: 'enelrad.cuteron',
    avatar: 'EC',
    isActive: true,
    role: 'ROLE_DEAN',
    roles: ['ROLE_DEAN'],
    activeRole: 'ROLE_DEAN',
    displayRole: 'College Dean',
    selectedRole: 'Dean',
    orgId: 'CBIT',
    orgName: 'College of Business and Information Technology',
    parentOrg: 'CBIT',
    actualOrg: 'CBIT',
    collegeId: 'CBIT',
    organizationType: 'COLLEGE',
    lastActive: 'Active Now',
    createdDate: '2025-09-01'
  },
  // 6. OSD Account
  {
    id: 'usr-osd-valesay',
    studentId: '1020050',
    name: 'Valesay Niel Junio',
    firstName: 'Valesay Niel',
    lastName: 'Junio',
    email: 'valesayniel.junio@msunaawan.edu.ph',
    username: 'valesayniel.junio',
    avatar: 'VJ',
    isActive: true,
    role: 'ROLE_OSD',
    roles: ['ROLE_OSD'],
    activeRole: 'ROLE_OSD',
    displayRole: 'OSD Staff',
    selectedRole: 'OSD Officer',
    orgId: 'OSD',
    orgName: 'Office of Student Development',
    parentOrg: 'OSD',
    actualOrg: 'OSD',
    lastActive: 'Active Now',
    createdDate: '2025-08-15'
  },
  // 7. OVCSAS Account
  {
    id: 'usr-ovcsas-jozel',
    studentId: '1020040',
    name: 'Jozel Micah Mapula',
    firstName: 'Jozel Micah',
    lastName: 'Mapula',
    email: 'jozelmicah.mapula@msunaawan.edu.ph',
    username: 'jozelmicah.mapula',
    avatar: 'JM',
    isActive: true,
    role: 'ROLE_OVCSAS',
    roles: ['ROLE_OVCSAS'],
    activeRole: 'ROLE_OVCSAS',
    displayRole: 'OVCSAS Officer',
    selectedRole: 'Vice Chancellor',
    orgId: 'OVCSAS',
    orgName: 'Office of the Vice Chancellor for Student Affairs and Services',
    parentOrg: 'OVCSAS',
    actualOrg: 'OVCSAS',
    lastActive: 'Active Now',
    createdDate: '2025-08-15'
  },
  // 8. System Admin Account
  {
    id: 'usr-sysad-hazel',
    studentId: '1020090',
    name: 'Hazel Anne Mapula',
    firstName: 'Hazel Anne',
    lastName: 'Mapula',
    email: 'hazelanne.mapula@msunaawan.edu.ph',
    username: 'hazelanne.mapula',
    avatar: 'HM',
    isActive: true,
    role: 'ROLE_ADMIN',
    roles: ['ROLE_ADMIN'],
    activeRole: 'ROLE_ADMIN',
    displayRole: 'System Administrator',
    selectedRole: 'SysAd',
    orgId: 'ADMIN',
    orgName: 'Information Technology & System Administration',
    parentOrg: 'ADMIN',
    actualOrg: 'ADMIN',
    lastActive: 'Active Now',
    createdDate: '2025-06-01'
  }
];

export const INITIAL_ACTION_PLAN_FOLDERS: ActionPlanFolder[] = [
  {
    id: 'AP-FY2026',
    fiscalYear: 'FY 2026',
    title: 'Fiscal Year 2026 Student Organization Action Plans',
    theme: 'Academic Activities, Community Engagement & Student Projects',
    status: 'Open',
    submissionDeadline: '2026-10-31',
    createdAt: '2026-01-02',
    createdBy: 'System Administrator (OSD)',
    allocatedBudget: 550000,
    totalActivitiesCount: 4,
    approvedCount: 2,
    pendingCount: 2,
    description: 'Active folder for student organization submissions, projects, and activities for Fiscal Year 2026.'
  },
  {
    id: 'AP-FY2025',
    fiscalYear: 'FY 2025',
    title: 'Fiscal Year 2025 Annual Operational Plan',
    theme: 'Student Leadership and Campus Activities',
    status: 'Locked',
    submissionDeadline: '2025-10-31',
    createdAt: '2025-01-05',
    createdBy: 'System Administrator',
    allocatedBudget: 480000,
    totalActivitiesCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    description: 'Archived folder of student organization activities across MSUN colleges for FY 2025.'
  },
  {
    id: 'AP-FY2027',
    fiscalYear: 'FY 2027',
    title: 'Fiscal Year 2027 Action Plan Submissions',
    theme: 'Campus Development & Student Activities',
    status: 'Open',
    submissionDeadline: '2027-04-30',
    createdAt: '2026-02-15',
    createdBy: 'System Administrator',
    allocatedBudget: 620000,
    totalActivitiesCount: 4,
    approvedCount: 2,
    pendingCount: 2,
    description: 'Action plan folder for student organization submissions and budgets for Fiscal Year 2027.'
  }
];


export const DEFAULT_MSUN_ACTION_PLAN_TEMPLATE: ActionPlanTemplate = {
  id: 'TEMPLATE-MSUN-DEFAULT',
  name: 'MSUN Standard Plan of Activities',
  description: 'Official institutional Action Plan template featuring grouped Timeframe (Month & Week), Activity title, Strategic Objectives, Expected Output, Office, Line Item budget breakdown, Budget Requirement in PHP, Fund Source, and Person Assigned.',
  version: 1,
  isDefault: true,
  headerTitle: 'PLAN OF ACTIVITIES',
  headerSubTitle: '[ORGANIZATION/OFFICE NAME]',
  headerColor: '#800000',
  headerTextColor: '#FFFFFF',
  subHeaderColor: '#FCE5CD',
  subHeaderTextColor: '#1E293B',
  footerLabel: 'Total Projected Budget (excluding office supplies, allowances and wages)',
  budgetCalculationRule: 'SUM_ALL',
  status: 'Published',
  createdAt: '2026-01-01T00:00:00Z',
  columns: [
    {
      id: 'col-timeframe-month',
      mainHeader: 'Timeframe',
      subHeader: 'Month',
      fieldKey: 'timeframeMonth',
      fieldType: 'month-select',
      isRequired: true,
      isGrouped: true,
      groupParent: 'Timeframe',
      options: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
        'May-June', 'June-July', 'January-December', 'First Semester', 'Second Semester'
      ],
      width: '140px',
      align: 'center'
    },
    {
      id: 'col-timeframe-week',
      mainHeader: 'Timeframe',
      subHeader: 'Week',
      fieldKey: 'timeframeWeek',
      fieldType: 'week-select',
      isRequired: true,
      isGrouped: true,
      groupParent: 'Timeframe',
      options: [
        '1st Week', '2nd Week', '3rd Week', '4th Week', 'Last Week',
        'Last Week - First week', '1st-2nd Week', '3rd-4th Week', 'Entire Month'
      ],
      width: '140px',
      align: 'center'
    },
    {
      id: 'col-programs',
      mainHeader: 'Programs and Activities',
      subHeader: 'Activity title',
      fieldKey: 'title',
      fieldType: 'text',
      isRequired: true,
      width: '220px',
      align: 'left'
    },
    {
      id: 'col-objectives',
      mainHeader: 'Strategic Objectives',
      subHeader: 'Objectives',
      fieldKey: 'strategicObjectives',
      fieldType: 'multiline',
      isRequired: true,
      width: '240px',
      align: 'left'
    },
    {
      id: 'col-output',
      mainHeader: 'Expected Output',
      subHeader: 'Expected results',
      fieldKey: 'expectedOutput',
      fieldType: 'multiline',
      isRequired: true,
      width: '220px',
      align: 'left'
    },
    {
      id: 'col-office',
      mainHeader: 'Office',
      subHeader: 'Responsible office',
      fieldKey: 'office',
      fieldType: 'text',
      isRequired: true,
      width: '110px',
      align: 'center'
    },
    {
      id: 'col-line-item',
      mainHeader: 'Line Item',
      subHeader: 'Budget breakdown',
      fieldKey: 'lineItemBudget',
      fieldType: 'budget-breakdown',
      isRequired: false,
      width: '240px',
      align: 'left'
    },
    {
      id: 'col-budget',
      mainHeader: 'Budget Requirement',
      subHeader: 'Amount in PHP',
      fieldKey: 'budget',
      fieldType: 'currency',
      isRequired: true,
      width: '150px',
      align: 'right'
    },
    {
      id: 'col-fund-source',
      mainHeader: 'Fund Source',
      subHeader: 'Source of funding',
      fieldKey: 'fundSource',
      fieldType: 'select',
      isRequired: true,
      options: [
        'Organizational Fund',
        'OSD Fund',
        'University Fund',
        'Senior Class Fund',
        'Sponsorship',
        'OSD/OSW Funds',
        'Student Development Fund',
        'Other authorized funding sources'
      ],
      width: '160px',
      align: 'center'
    },
    {
      id: 'col-person-assigned',
      mainHeader: 'Person Assigned',
      subHeader: 'Responsible person/s',
      fieldKey: 'personAssigned',
      fieldType: 'text',
      isRequired: true,
      width: '170px',
      align: 'left'
    }
  ]
};

export const INITIAL_ACTION_PLAN_TEMPLATES: ActionPlanTemplate[] = [
  DEFAULT_MSUN_ACTION_PLAN_TEMPLATE,
  {
    id: 'TEMPLATE-SIMPLIFIED',
    name: 'Standard Campus Activity Plan',
    description: 'Simplified 8-column action plan template for smaller departmental or club initiatives.',
    version: 1,
    isDefault: false,
    headerTitle: 'ANNUAL PLAN OF ACTIVITIES',
    headerSubTitle: '[ORGANIZATION NAME]',
    headerColor: '#1E3A8A',
    headerTextColor: '#FFFFFF',
    subHeaderColor: '#E2E8F0',
    subHeaderTextColor: '#1E293B',
    footerLabel: 'Total Activity Budget',
    budgetCalculationRule: 'SUM_ALL',
    status: 'Published',
    createdAt: '2026-01-10T00:00:00Z',
    columns: DEFAULT_MSUN_ACTION_PLAN_TEMPLATE.columns
  }
];

export const INITIAL_FISCAL_YEARS: FiscalYear[] = [
  {
    id: 'FY-2027',
    name: 'FY 2027',
    fiscalYear: 'FY 2027',
    periodCovered: 'January-December 2027',
    startDate: '2027-01-01',
    endDate: '2027-12-31',
    submissionStartDate: '2026-11-01',
    submissionDeadline: '2027-04-30',
    submissionOpenDate: '2026-11-01',
    submissionCloseDate: '2027-04-30',
    templateId: 'TEMPLATE-MSUN-DEFAULT',
    status: 'Open',
    isSubmissionActive: true,
    publishedAt: '2026-11-01T08:00:00Z',
    participatingOrgs: ['ALL'],
    notes: 'Official active fiscal year for student organization action plan creation and submissions.',
    createdAt: '2026-02-15'
  },
  {
    id: 'FY-2026',
    name: 'FY 2026',
    fiscalYear: 'FY 2026',
    periodCovered: 'January-December 2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    submissionStartDate: '2025-11-01',
    submissionDeadline: '2026-04-30',
    submissionOpenDate: '2025-11-01',
    submissionCloseDate: '2026-04-30',
    templateId: 'TEMPLATE-MSUN-DEFAULT',
    status: 'Finalized',
    isSubmissionActive: false,
    publishedAt: '2025-11-01T08:00:00Z',
    participatingOrgs: ['ALL'],
    notes: 'Action plan activities across accredited campus councils.',
    createdAt: '2025-02-10'
  }
];

export const INITIAL_DROPDOWN_OPTIONS: SystemDropdownOption[] = [
  // Fund Sources
  { id: 'opt_fs_1', category: 'fund_source', label: 'CBIT-SEC Fund', value: 'CBIT-SEC Fund', order: 1, isActive: true, isSystemProtected: false },
  { id: 'opt_fs_2', category: 'fund_source', label: 'Council / Student Fund', value: 'Council / Student Fund', order: 2, isActive: true, isSystemProtected: false },
  { id: 'opt_fs_3', category: 'fund_source', label: 'OSD Fund', value: 'OSD Fund', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_fs_4', category: 'fund_source', label: 'University General Fund', value: 'University General Fund', order: 4, isActive: true, isSystemProtected: false },
  { id: 'opt_fs_5', category: 'fund_source', label: 'Trust Fund', value: 'Trust Fund', order: 5, isActive: true, isSystemProtected: false },
  { id: 'opt_fs_6', category: 'fund_source', label: 'Special Projects Fund', value: 'Special Projects Fund', order: 6, isActive: true, isSystemProtected: false },
  { id: 'opt_fs_7', category: 'fund_source', label: 'Income Generating Projects (IGP)', value: 'Income Generating Projects (IGP)', order: 7, isActive: true, isSystemProtected: false },
  { id: 'opt_fs_8', category: 'fund_source', label: 'Donation / Sponsorship', value: 'Donation / Sponsorship', order: 8, isActive: true, isSystemProtected: false },
  { id: 'opt_fs_9', category: 'fund_source', label: 'External Sponsorship', value: 'External Sponsorship', order: 9, isActive: true, isSystemProtected: false },

  // Colleges (Unit / College)
  { id: 'opt_col_1', category: 'college', label: 'Supreme Student Council', value: 'Supreme Student Council', order: 1, isActive: true, isSystemProtected: true },
  { id: 'opt_col_2', category: 'college', label: 'College of Business and Information Technology (CBIT)', value: 'College of Business and Information Technology', order: 2, isActive: true, isSystemProtected: true },
  { id: 'opt_col_3', category: 'college', label: 'College of Environmental and Life Sciences (CELS)', value: 'College of Environmental and Life Sciences', order: 3, isActive: true, isSystemProtected: true },
  { id: 'opt_col_4', category: 'college', label: 'College of Education and Social Sciences (CESS)', value: 'College of Education and Social Sciences', order: 4, isActive: true, isSystemProtected: true },
  { id: 'opt_col_5', category: 'college', label: 'College of Marine and Fisheries Sciences (CMFS)', value: 'College of Marine and Fisheries Sciences', order: 5, isActive: true, isSystemProtected: true },
  { id: 'opt_col_6', category: 'college', label: 'KAABAG (Peer Facilitators)', value: 'KAABAG', order: 6, isActive: true, isSystemProtected: false },
  { id: 'opt_col_7', category: 'college', label: 'Senior Student Society (SenSo)', value: 'Senior Student Society', order: 7, isActive: true, isSystemProtected: false },

  // Offices
  { id: 'opt_off_1', category: 'office', label: 'OVCSAS', value: 'OVCSAS', description: 'Office of the Vice Chancellor for Student Affairs and Services', order: 1, isActive: true, isSystemProtected: true },
  { id: 'opt_off_2', category: 'office', label: 'OSD', value: 'OSD', description: 'Office of Student Development', order: 2, isActive: true, isSystemProtected: true },
  { id: 'opt_off_4', category: 'office', label: 'CBIT', value: 'CBIT', description: 'College of Business and Information Technology', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_off_5', category: 'office', label: 'SSC', value: 'SSC', description: 'Supreme Student Council', order: 4, isActive: true, isSystemProtected: false },
  { id: 'opt_off_6', category: 'office', label: 'CELS', value: 'CELS', description: 'College of Environmental and Life Sciences', order: 5, isActive: true, isSystemProtected: false },
  { id: 'opt_off_7', category: 'office', label: 'CESS', value: 'CESS', description: 'College of Education and Social Sciences', order: 6, isActive: true, isSystemProtected: false },
  { id: 'opt_off_8', category: 'office', label: 'CFMS', value: 'CFMS', description: 'College of Fisheries and Marine Sciences', order: 7, isActive: true, isSystemProtected: false },
  { id: 'opt_off_9', category: 'office', label: 'KAABAG', value: 'KAABAG', description: 'Student Peer Facilitators Organization', order: 8, isActive: true, isSystemProtected: false },
  { id: 'opt_off_10', category: 'office', label: 'SENSSO', value: 'SENSSO', description: 'Senior Student Society', order: 9, isActive: true, isSystemProtected: false },

  // Organization Categories
  { id: 'opt_cat_1', category: 'org_category', label: 'College Council', value: 'College Council', order: 1, isActive: true, isSystemProtected: false },
  { id: 'opt_cat_2', category: 'org_category', label: 'Academic Organization', value: 'Academic Organization', order: 2, isActive: true, isSystemProtected: false },
  { id: 'opt_cat_3', category: 'org_category', label: 'Non-Academic Organization', value: 'Non-Academic Organization', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_cat_4', category: 'org_category', label: 'Special Interest', value: 'Special Interest', order: 4, isActive: true, isSystemProtected: false },
  { id: 'opt_cat_5', category: 'org_category', label: 'Socio-Cultural', value: 'Socio-Cultural', order: 5, isActive: true, isSystemProtected: false },
  { id: 'opt_cat_6', category: 'org_category', label: 'Sports & Recreation', value: 'Sports & Recreation', order: 6, isActive: true, isSystemProtected: false },

  // Venues
  { id: 'opt_ven_1', category: 'venue', label: 'MSUN Gymnasium', value: 'MSUN Gymnasium', order: 1, isActive: true, isSystemProtected: false },
  { id: 'opt_ven_2', category: 'venue', label: 'CBIT Amphitheater', value: 'CBIT Amphitheater', order: 2, isActive: true, isSystemProtected: false },
  { id: 'opt_ven_3', category: 'venue', label: 'Audio Visual Room (AVR)', value: 'Audio Visual Room (AVR)', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_ven_4', category: 'venue', label: 'University Function Hall', value: 'University Function Hall', order: 4, isActive: true, isSystemProtected: false },
  { id: 'opt_ven_5', category: 'venue', label: 'Student Center Ground', value: 'Student Center Ground', order: 5, isActive: true, isSystemProtected: false },
  { id: 'opt_ven_6', category: 'venue', label: 'Covered Court', value: 'Covered Court', order: 6, isActive: true, isSystemProtected: false },
  { id: 'opt_ven_7', category: 'venue', label: 'Science Complex Conference Room', value: 'Science Complex Conference Room', order: 7, isActive: true, isSystemProtected: false },
  { id: 'opt_ven_8', category: 'venue', label: 'Social Hall', value: 'Social Hall', order: 8, isActive: true, isSystemProtected: false },
  { id: 'opt_ven_9', category: 'venue', label: 'Online / Zoom Meeting', value: 'Online / Zoom Meeting', order: 9, isActive: true, isSystemProtected: false },

  // Departments
  { id: 'opt_dep_1', category: 'department', label: 'Bachelor of Science in Information Technology', value: 'Bachelor of Science in Information Technology', order: 1, isActive: true, isSystemProtected: false },
  { id: 'opt_dep_2', category: 'department', label: 'Department of Computer Science', value: 'Department of Computer Science', order: 2, isActive: true, isSystemProtected: false },
  { id: 'opt_dep_3', category: 'department', label: 'Department of Information Systems', value: 'Department of Information Systems', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_dep_4', category: 'department', label: 'Department of Civil Engineering', value: 'Department of Civil Engineering', order: 4, isActive: true, isSystemProtected: false },
  { id: 'opt_dep_5', category: 'department', label: 'Department of Environmental Science', value: 'Department of Environmental Science', order: 5, isActive: true, isSystemProtected: false },
  { id: 'opt_dep_6', category: 'department', label: 'Department of Secondary Education', value: 'Department of Secondary Education', order: 6, isActive: true, isSystemProtected: false },
  { id: 'opt_dep_7', category: 'department', label: 'Department of Marine Biology', value: 'Department of Marine Biology', order: 7, isActive: true, isSystemProtected: false },

  // Activity Types
  { id: 'opt_act_1', category: 'activity_type', label: 'In-Campus', value: 'In-Campus', order: 1, isActive: true, isSystemProtected: false },
  { id: 'opt_act_2', category: 'activity_type', label: 'Off-Campus', value: 'Off-Campus', order: 2, isActive: true, isSystemProtected: false },
  { id: 'opt_act_3', category: 'activity_type', label: 'Hybrid / Online', value: 'Hybrid / Online', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_act_4', category: 'activity_type', label: 'Community Outreach', value: 'Community Outreach', order: 4, isActive: true, isSystemProtected: false },

  // Person Assigned
  { id: 'opt_per_1', category: 'person_assigned', label: 'CBIT-SEC Officers', value: 'CBIT-SEC Officers', order: 1, isActive: true, isSystemProtected: false },
  { id: 'opt_per_2', category: 'person_assigned', label: 'Council Officers', value: 'Council Officers', order: 2, isActive: true, isSystemProtected: false },
  { id: 'opt_per_3', category: 'person_assigned', label: 'Executive Committee', value: 'Executive Committee', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_per_4', category: 'person_assigned', label: 'Committee on Student Activities', value: 'Committee on Student Activities', order: 4, isActive: true, isSystemProtected: false },
  { id: 'opt_per_5', category: 'person_assigned', label: 'Academic Committee', value: 'Academic Committee', order: 5, isActive: true, isSystemProtected: false },
  { id: 'opt_per_6', category: 'person_assigned', label: 'Sports & Cultural Committee', value: 'Sports & Cultural Committee', order: 6, isActive: true, isSystemProtected: false },

  // Fiscal Years
  { id: 'opt_fy_1', category: 'fiscal_year', label: 'Fiscal Year 2027 (Official Target)', value: 'Fiscal Year 2027 (Official Target)', order: 1, isActive: true, isSystemProtected: true },
  { id: 'opt_fy_2', category: 'fiscal_year', label: 'Fiscal Year 2027', value: 'Fiscal Year 2027', order: 2, isActive: true, isSystemProtected: true },
  { id: 'opt_fy_3', category: 'fiscal_year', label: 'Fiscal Year 2026', value: 'Fiscal Year 2026', order: 3, isActive: true, isSystemProtected: true },
  { id: 'opt_fy_4', category: 'fiscal_year', label: 'Fiscal Year 2025', value: 'Fiscal Year 2025', order: 4, isActive: true, isSystemProtected: false },
  { id: 'opt_fy_5', category: 'fiscal_year', label: 'Fiscal Year 2028', value: 'Fiscal Year 2028', order: 5, isActive: true, isSystemProtected: false },

  // Timeframe
  { id: 'opt_tf_1', category: 'timeframe', label: 'January', value: 'January', order: 1, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_2', category: 'timeframe', label: 'February', value: 'February', order: 2, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_3', category: 'timeframe', label: 'March', value: 'March', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_4', category: 'timeframe', label: 'April', value: 'April', order: 4, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_5', category: 'timeframe', label: 'May', value: 'May', order: 5, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_6', category: 'timeframe', label: 'June', value: 'June', order: 6, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_7', category: 'timeframe', label: 'July', value: 'July', order: 7, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_8', category: 'timeframe', label: 'August', value: 'August', order: 8, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_9', category: 'timeframe', label: 'September', value: 'September', order: 9, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_10', category: 'timeframe', label: 'October', value: 'October', order: 10, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_11', category: 'timeframe', label: 'November', value: 'November', order: 11, isActive: true, isSystemProtected: false },
  { id: 'opt_tf_12', category: 'timeframe', label: 'December', value: 'December', order: 12, isActive: true, isSystemProtected: false },

  // Rating
  { id: 'opt_rat_1', category: 'rating', label: '4 - Outstanding (Fully Achieved)', value: '4 - Outstanding (Fully Achieved)', order: 1, isActive: true, isSystemProtected: false },
  { id: 'opt_rat_2', category: 'rating', label: '3 - Largely Achieved', value: '3 - Largely Achieved', order: 2, isActive: true, isSystemProtected: false },
  { id: 'opt_rat_3', category: 'rating', label: '2 - Partially Achieved', value: '2 - Partially Achieved', order: 3, isActive: true, isSystemProtected: false },
  { id: 'opt_rat_4', category: 'rating', label: '1 - Not Achieved', value: '1 - Not Achieved', order: 4, isActive: true, isSystemProtected: false }
];
