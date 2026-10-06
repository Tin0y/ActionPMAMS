import { OrgId, StudentOrganization, Activity, FinancialSummary, NormanPrincipleInfo, UserAccount, ActionPlanFolder, TimelineStep } from '../types';

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
  TME: {
    name: 'Dark Blue',
    badgeBg: 'bg-[#1e3a8a]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#172554]',
    avatarBg: 'bg-[#172554]',
    avatarText: 'text-white',
    cardBorder: 'hover:border-[#1e3a8a]',
    pillBg: 'bg-[#1e3a8a]',
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
  if (key === 'CFMS' || key === 'CMFS') return ORG_COLORS.CFMS;
  if (key === 'KAABAG') return ORG_COLORS.KAABAG;
  if (key === 'TME') return ORG_COLORS.TME;
  if (key === 'CELS') return ORG_COLORS.CELS;
  if (key === 'CBIT') return ORG_COLORS.CBIT;
  if (key === 'CESS') return ORG_COLORS.CESS;
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
    president: 'Maria Clarisse Santos',
    facultyAdviser: 'Prof. Rolando Gutierrez, Ph.D.',
    officeLocation: 'Student Activity Center, 2nd Floor, Room 201',
    objectives: [
      'Represent and safeguard the general welfare, democratic rights, and academic interests of all MSU Naawan students.',
      'Formulate and execute high-impact campus-wide developmental action plans, leadership summits, and cultural events.',
      'Ensure absolute fiscal transparency, institutional accountability, and compliance with the Student Handbook and university regulations.'
    ],
    membersList: [
      { id: 'ssc-1', fullName: 'Maria Clarisse Santos', contactNumber: '+63 917 842 1092', email: 'maria.santos@msun.edu.ph', role: 'President' },
      { id: 'ssc-2', fullName: 'John Kenneth Alonto', contactNumber: '+63 918 331 4902', email: 'john.alonto@msun.edu.ph', role: 'Vice President Internal' },
      { id: 'ssc-3', fullName: 'Sarah Mae Villarin', contactNumber: '+63 919 224 8190', email: 'sarah.villarin@msun.edu.ph', role: 'Vice President External' },
      { id: 'ssc-4', fullName: 'Karlo Emmanuel Tan', contactNumber: '+63 927 619 4430', email: 'karlo.tan@msun.edu.ph', role: 'Secretary General' },
      { id: 'ssc-5', fullName: 'Althea Nicole Gomez', contactNumber: '+63 918 204 8819', email: 'althea.gomez@msun.edu.ph', role: 'Treasurer' },
      { id: 'ssc-6', fullName: 'Gabriel Angelo Cruz', contactNumber: '+63 922 751 3302', email: 'gabriel.cruz@msun.edu.ph', role: 'Auditor' }
    ],
    attachments: [
      { id: 'att-1', title: 'SSC Constitution and By-Laws (2026 Revised).pdf', type: 'PDF', fileSize: '2.4 MB', uploadDate: '2026-01-10' },
      { id: 'att-2', title: 'Certificate of University Recognition.pdf', type: 'PDF', fileSize: '850 KB', uploadDate: '2026-01-15' },
      { id: 'att-3', title: 'Annual Financial Audit & Liquidation Report.xlsx', type: 'XLSX', fileSize: '1.2 MB', uploadDate: '2026-02-01' }
    ]
  },
  {
    id: 'CBIT',
    name: 'College of Business and Information Technology',
    acronym: 'CBIT',
    nature: 'Academic & Information Technology Student Council',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-002',
    dateOfApplication: '2026-01-12',
    memberCount: 680,
    attachmentCount: 12,
    color: 'yellow',
    description: 'Empowering future business leaders and technologists through innovation, hackathons, and corporate mentorship.',
    president: 'Joshua Paul Mendoza',
    facultyAdviser: 'Engr. Darlene Joy Ramos',
    officeLocation: 'CBIT Complex, Room 104',
    objectives: [
      'Foster academic and technological excellence in computing, business administration, and information management.',
      'Organize competitive software hackathons, startup venture pitch clinics, and IT symposiums.',
      'Bridge the gap between academic learning and industry standards through alumni mentorship and corporate partnerships.'
    ],
    membersList: [
      { id: 'cbit-1', fullName: 'Joshua Paul Mendoza', contactNumber: '+63 917 442 8891', email: 'joshua.mendoza@msun.edu.ph', role: 'President' },
      { id: 'cbit-2', fullName: 'Rhea Camille Fernandez', contactNumber: '+63 918 556 1234', email: 'rhea.fernandez@msun.edu.ph', role: 'Vice President' },
      { id: 'cbit-3', fullName: 'Christian Dave Perez', contactNumber: '+63 919 667 8901', email: 'christian.perez@msun.edu.ph', role: 'Secretary' },
      { id: 'cbit-4', fullName: 'Stephanie Anne Cruz', contactNumber: '+63 920 778 2345', email: 'stephanie.cruz@msun.edu.ph', role: 'Treasurer' },
      { id: 'cbit-5', fullName: 'Michael James Rivera', contactNumber: '+63 921 889 3456', email: 'michael.rivera@msun.edu.ph', role: 'Auditor' }
    ],
    attachments: [
      { id: 'att-4', title: 'CBIT By-Laws & Code of Ethics.pdf', type: 'PDF', fileSize: '1.8 MB', uploadDate: '2026-01-12' },
      { id: 'att-5', title: 'IT Labs Safety & Event Guidelines.pdf', type: 'PDF', fileSize: '920 KB', uploadDate: '2026-01-20' }
    ]
  },
  {
    id: 'CESS',
    name: 'College of Education and Social Sciences',
    acronym: 'CESS',
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
      { id: 'cess-1', fullName: 'Karlo Emmanuel Tan', contactNumber: '+63 927 619 4430', email: 'karlo.tan@msun.edu.ph', role: 'President' },
      { id: 'cess-2', fullName: 'Jasmine Grace Bautista', contactNumber: '+63 928 334 5567', email: 'jasmine.bautista@msun.edu.ph', role: 'Vice President' },
      { id: 'cess-3', fullName: 'Hannah Marie Ocampo', contactNumber: '+63 929 445 6678', email: 'hannah.ocampo@msun.edu.ph', role: 'Secretary' },
      { id: 'cess-4', fullName: 'Kevin Roy Domingo', contactNumber: '+63 930 556 7789', email: 'kevin.domingo@msun.edu.ph', role: 'Treasurer' }
    ],
    attachments: [
      { id: 'att-6', title: 'CESS Charter and Student Welfare Guidelines.pdf', type: 'PDF', fileSize: '1.5 MB', uploadDate: '2026-01-14' }
    ]
  },
  {
    id: 'CELS',
    name: 'College of Environmental and Life Sciences',
    acronym: 'CELS',
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
      { id: 'cels-1', fullName: 'Beatrice Mae Flores', contactNumber: '+63 919 332 7811', email: 'beatrice.flores@msun.edu.ph', role: 'President' },
      { id: 'cels-2', fullName: 'Patrick Allen Soriano', contactNumber: '+63 920 443 8922', email: 'patrick.soriano@msun.edu.ph', role: 'Vice President' },
      { id: 'cels-3', fullName: 'Erica Nicole Morales', contactNumber: '+63 921 554 9033', email: 'erica.morales@msun.edu.ph', role: 'Secretary' },
      { id: 'cels-4', fullName: 'Lorenzo Miguel Sy', contactNumber: '+63 922 665 0144', email: 'lorenzo.sy@msun.edu.ph', role: 'Treasurer' }
    ],
    attachments: [
      { id: 'att-7', title: 'CELS Environmental Charter and Fieldwork Guidelines.pdf', type: 'PDF', fileSize: '1.9 MB', uploadDate: '2026-01-18' }
    ]
  },
  {
    id: 'CMFS',
    name: 'College of Marine and Fisheries Sciences',
    acronym: 'CFMS',
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
      { id: 'cmfs-1', fullName: 'Althea Nicole Gomez', contactNumber: '+63 918 204 8819', email: 'althea.gomez@msun.edu.ph', role: 'President' },
      { id: 'cmfs-2', fullName: 'Danielle Marie Roxas', contactNumber: '+63 919 315 9920', email: 'danielle.roxas@msun.edu.ph', role: 'Vice President' },
      { id: 'cmfs-3', fullName: 'Vincent Carl Aquino', contactNumber: '+63 920 426 0031', email: 'vincent.aquino@msun.edu.ph', role: 'Secretary' },
      { id: 'cmfs-4', fullName: 'Regine Mae Castillo', contactNumber: '+63 921 537 1142', email: 'regine.castillo@msun.edu.ph', role: 'Treasurer' }
    ],
    attachments: [
      { id: 'att-8', title: 'Marine Fieldwork Safety Standards.pdf', type: 'PDF', fileSize: '2.8 MB', uploadDate: '2026-01-22' }
    ]
  },
  {
    id: 'KAABAG',
    name: 'KAABAG',
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
      { id: 'kaabag-1', fullName: 'Gabriel Angelo Cruz', contactNumber: '+63 922 751 3302', email: 'gabriel.cruz@msun.edu.ph', role: 'President' },
      { id: 'kaabag-2', fullName: 'Aileen Grace Gomez', contactNumber: '+63 923 862 4413', email: 'aileen.gomez@msun.edu.ph', role: 'Vice President' },
      { id: 'kaabag-3', fullName: 'Kristine Joy Valenzuela', contactNumber: '+63 924 973 5524', email: 'kristine.valenzuela@msun.edu.ph', role: 'Secretary' },
      { id: 'kaabag-4', fullName: 'Angelo Rafael Dizon', contactNumber: '+63 925 084 6635', email: 'angelo.dizon@msun.edu.ph', role: 'Treasurer' }
    ],
    attachments: [
      { id: 'att-9', title: 'KAABAG Peer Helper Accreditation & Ethics.pdf', type: 'PDF', fileSize: '1.1 MB', uploadDate: '2026-01-25' }
    ]
  },
  {
    id: 'TME',
    name: 'The Marine Echo',
    acronym: 'TME',
    nature: 'Official Student Publication of MSU Naawan',
    status: 'Active',
    registeredNumber: 'MSUN-SO-2026-007',
    dateOfApplication: '2026-01-26',
    memberCount: 360,
    attachmentCount: 7,
    color: 'darkblue',
    description: 'The official campus press and student publication of Mindanao State University at Naawan, promoting truth, creative journalism, and student discourse.',
    president: 'Mark Christopher Diaz',
    facultyAdviser: 'Prof. Fernando Ramos',
    officeLocation: 'TME Press & Editorial Office, SAC Building',
    objectives: [
      'Uphold truthful, fearless, and responsible campus journalism that champions student rights and institutional accountability.',
      'Publish timely newsletters, investigative reports, literary folios, and digital media broadcasts.',
      'Foster student writing prowess, media literacy, photojournalism ethics, and editorial independence.'
    ],
    membersList: [
      { id: 'tme-1', fullName: 'Mark Christopher Diaz', contactNumber: '+63 928 114 5590', email: 'mark.diaz@msun.edu.ph', role: 'Editor-in-Chief / President' },
      { id: 'tme-2', fullName: 'Clarissa Mae Fuentes', contactNumber: '+63 929 225 6601', email: 'clarissa.fuentes@msun.edu.ph', role: 'Associate Editor' },
      { id: 'tme-3', fullName: 'Gerald Anthony Santos', contactNumber: '+63 930 336 7712', email: 'gerald.santos@msun.edu.ph', role: 'Managing Editor' },
      { id: 'tme-4', fullName: 'Trisha Denise Lopez', contactNumber: '+63 931 447 8823', email: 'trisha.lopez@msun.edu.ph', role: 'News Editor' }
    ],
    attachments: [
      { id: 'att-10', title: 'The Marine Echo Editorial Policy & Press Ethics.pdf', type: 'PDF', fileSize: '1.4 MB', uploadDate: '2026-01-26' }
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
      { id: 'senso-1', fullName: 'Corazon Patricia Lim', contactNumber: '+63 917 662 9014', email: 'corazon.lim@msun.edu.ph', role: 'President' },
      { id: 'senso-2', fullName: 'Eduardo Jose Navarro', contactNumber: '+63 918 773 0125', email: 'eduardo.navarro@msun.edu.ph', role: 'Vice President' },
      { id: 'senso-3', fullName: 'Bianca Marie Tolentino', contactNumber: '+63 919 884 1236', email: 'bianca.tolentino@msun.edu.ph', role: 'Secretary' },
      { id: 'senso-4', fullName: 'Francis Leo Del Rosario', contactNumber: '+63 920 995 2347', email: 'francis.delrosario@msun.edu.ph', role: 'Treasurer' }
    ],
    attachments: [
      { id: 'att-11', title: 'Senior Student Society Charter & Graduation Transition Manual.pdf', type: 'PDF', fileSize: '1.3 MB', uploadDate: '2026-01-28' }
    ]
  }
];

export const NON_COLLEGE_ORGS: string[] = ['SSC', 'KAABAG', 'SENSSO', 'SENSO', 'TME'];

export function isCollegeOrg(orgId?: string): boolean {
  if (!orgId) return false;
  const upper = orgId.toUpperCase();
  if (NON_COLLEGE_ORGS.includes(upper)) return false;
  return ['CBIT', 'CELS', 'CFMS', 'CMFS', 'CESS'].includes(upper) || upper.startsWith('C');
}

/**
 * Dynamic Workflow Generation:
 * 
 * CENTRAL / NON-COLLEGE (SSC, KAABAG, TME, SENSSO):
 *   Stage 1: Organization Submission (ROLE_ORGANIZATION)
 *   Stage 2: Adviser Review (ROLE_ADVISER)
 *   Stage 3: OSD Approval (ROLE_OSD)
 *   Stage 4: OVCSAS Approval / Endorsement (ROLE_OVCSAS)
 *   Stage 5: Office of the Chancellor Final Approval (ROLE_OC)
 *   -> APPROVED / COMPLETED
 *   (Dean stage does NOT exist)
 * 
 * COLLEGE ORGANIZATIONS (CBIT, CELS, CFMS, CESS):
 *   Stage 1: Organization Submission (ROLE_ORGANIZATION)
 *   Stage 2: Adviser Review (ROLE_ADVISER)
 *   Stage 3: College Dean Endorsement (ROLE_DEAN)
 *   Stage 4: OSD Approval (ROLE_OSD)
 *   Stage 5: OVCSAS Approval / Endorsement (ROLE_OVCSAS)
 *   Stage 6: Office of the Chancellor Final Approval (ROLE_OC)
 *   -> APPROVED / COMPLETED
 */
export function getWorkflowTimelineForOrg(orgId: string): TimelineStep[] {
  if (isCollegeOrg(orgId)) {
    return [
      { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: 'completed', updatedAt: '2026-09-01' },
      { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: 'in_progress' },
      { id: 3, title: 'College Dean Endorsement', role: 'ROLE_DEAN', status: 'pending' },
      { id: 4, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
      { id: 5, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
      { id: 6, title: 'Office of the Chancellor Final Approval', role: 'ROLE_OC', status: 'pending' },
      { id: 7, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
      { id: 8, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
    ];
  } else {
    // Non-College (SSC, KAABAG, TME, SENSSO) — Dean stage DOES NOT EXIST
    return [
      { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: 'completed', updatedAt: '2026-09-01' },
      { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: 'in_progress' },
      { id: 3, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
      { id: 4, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
      { id: 5, title: 'Office of the Chancellor Final Approval', role: 'ROLE_OC', status: 'pending' },
      { id: 6, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
      { id: 7, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
    ];
  }
}

export const DEFAULT_WORKFLOW_TIMELINE: TimelineStep[] = [
  { id: 1, title: 'Organization Submission', role: 'ROLE_ORGANIZATION', status: 'completed', updatedAt: '2026-09-01' },
  { id: 2, title: 'Adviser Review', role: 'ROLE_ADVISER', status: 'in_progress' },
  { id: 3, title: 'OSD Approval', role: 'ROLE_OSD', status: 'pending' },
  { id: 4, title: 'OVCSAS Approval / Endorsement', role: 'ROLE_OVCSAS', status: 'pending' },
  { id: 5, title: 'Office of the Chancellor Final Approval', role: 'ROLE_OC', status: 'pending' },
  { id: 6, title: 'Accomplishment & Liquidation Report Submission', role: 'ROLE_ORGANIZATION', status: 'pending' },
  { id: 7, title: 'Adviser Accomplishment Review & Final Sign-Off', role: 'ROLE_ADVISER', status: 'pending' }
];

export function getMaxStagesForActivity(orgIdOrActivity: string | Activity): number {
  const orgId = typeof orgIdOrActivity === 'string' ? orgIdOrActivity : orgIdOrActivity.orgId;
  return isCollegeOrg(orgId) ? 8 : 7;
}

export function getTimelineStageIndex(activity: Activity): number {
  const max = getMaxStagesForActivity(activity);
  const isCol = isCollegeOrg(activity.orgId);
  const finalAdviserStage = isCol ? 8 : 7;

  // 1. If activity has completed the final adviser sign-off / full liquidation
  const finalStep = activity.timeline?.find(s => s.id === max);
  if (finalStep?.status === 'completed' || activity.workflowStatus === 'COMPLETED') {
    return max;
  }
  if (activity.status === 'Approved' && !activity.accomplishmentForm?.isCompleted) {
    return max;
  }

  // 2. CRITICAL: If organization already finished submitting the accomplishment report,
  // it is forwarded directly to their adviser for final signature (Stage 7 for Central, Stage 8 for College)!
  // It MUST NOT return to Stage 3 (OSD) or earlier.
  if (activity.accomplishmentForm?.isCompleted) {
    return finalAdviserStage;
  }

  // 3. Explicit approvalStage label matches
  const stage = (activity.approvalStage || '').toLowerCase();
  if (stage.includes('sign-off') || stage.includes('final review') || stage.includes('adviser accomplishment') || stage.includes('adviser final')) return isCol ? 8 : 7;
  if (stage.includes('accomplishment') || stage.includes('liquidation')) return isCol ? 7 : 6;

  // 4. Check timeline steps
  if (activity.timeline && activity.timeline.length > 0) {
    const inProgress = activity.timeline.find(s => s.status === 'in_progress');
    if (inProgress) return Math.min(inProgress.id, max);
    const lastCompleted = [...activity.timeline].reverse().find(s => s.status === 'completed');
    if (lastCompleted) return Math.min(lastCompleted.id + 1, max);
  }

  // 5. Textual stage fallback
  if (stage.includes('chancellor') || stage.includes('oc')) return isCol ? 6 : 5;
  if (stage.includes('ovcsas')) return isCol ? 5 : 4;
  if (stage.includes('osd') || stage.includes('osa')) return isCol ? 4 : 3;
  if (stage.includes('dean') || stage.includes('college')) return isCol ? 3 : 2;
  if (stage.includes('adviser')) return 2;
  return 1;
}

export function isActivityFullyApproved(activity: Activity): boolean {
  const max = getMaxStagesForActivity(activity);
  const sFinal = activity.timeline?.find(s => s.id === max);
  if (sFinal?.status === 'completed' || activity.workflowStatus === 'COMPLETED') return true;
  // If accomplishment report was submitted, it's awaiting adviser sign-off and is NOT fully approved until stage 7/8 is signed
  if (activity.accomplishmentForm?.isCompleted) {
    return false;
  }
  return activity.status === 'Approved';
}

export interface StepPermissionResult {
  canApprove: boolean;
  canDefer: boolean;
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

  // System Administrator can oversee but does not automatically approve
  if (currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'System Administrator') {
    return {
      canApprove: false,
      canDefer: false,
      expectedRole: 'ROLE_ADMIN',
      expectedOrg: 'ADMIN',
      expectedTitle: 'System Administrator',
      reason: 'System Admin manages system configuration and does not sign off on activities.'
    };
  }

  const role = currentUser.role;
  const userOrgId = currentUser.orgId;
  const userCollegeId = currentUser.collegeId || currentUser.orgId;

  if (isCollege) {
    if (stepId === 1) {
      const match = (role === 'ROLE_ORGANIZATION' || role === 'Org President') && userOrgId === activity.orgId;
      return {
        canApprove: match,
        canDefer: false,
        expectedRole: 'ROLE_ORGANIZATION',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization User`,
        reason: match ? 'Authorized to submit' : `Only the ${orgName} Organization User can submit this proposal.`
      };
    }
    if (stepId === 2) {
      const match = (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') && userOrgId === activity.orgId;
      return {
        canApprove: match,
        canDefer: match,
        expectedRole: 'ROLE_ADVISER',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? 'Authorized to review' : `Only the assigned ${orgName} Adviser can review and defer/endorse this proposal.`
      };
    }
    if (stepId === 3) {
      const match = (role === 'ROLE_DEAN' || role === 'Dean / College Reviewer') && 
        (userCollegeId === activity.orgId || userCollegeId === activity.collegeId);
      return {
        canApprove: match,
        canDefer: match,
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
        expectedRole: 'ROLE_OVCSAS',
        expectedOrg: 'OVCSAS',
        expectedTitle: 'OVCSAS Officer',
        reason: match ? 'Authorized to endorse' : 'Only the OVCSAS Officer can approve/endorse or defer at this stage.'
      };
    }
    if (stepId === 6) {
      const match = role === 'ROLE_OC' || role === 'Office of the Chancellor' || role.includes('Chancellor');
      return {
        canApprove: match,
        canDefer: match,
        expectedRole: 'ROLE_OC',
        expectedOrg: 'OC',
        expectedTitle: 'Office of the Chancellor',
        reason: match ? 'Authorized for Chancellor approval' : 'Only the Office of the Chancellor can grant institutional approval.'
      };
    }
    if (stepId === 7) {
      // Accomplishment Report Submission: Student Org
      const match = (role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'Org Treasurer') && userOrgId === activity.orgId;
      return {
        canApprove: match,
        canDefer: false,
        expectedRole: 'ROLE_ORGANIZATION',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization Leadership`,
        reason: match ? 'Authorized to submit accomplishment report' : `Only the ${orgName} Organization leadership can fill and submit the accomplishment report.`
      };
    }
    if (stepId === 8) {
      // Adviser Accomplishment Review & Final Sign-Off: Faculty Adviser
      const match = (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') && userOrgId === activity.orgId;
      return {
        canApprove: match,
        canDefer: match,
        expectedRole: 'ROLE_ADVISER',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Adviser`,
        reason: match ? 'Authorized for final sign-off' : `Only the assigned ${orgName} Adviser can review and grant final sign-off on the accomplishment report.`
      };
    }
  } else {
    // CENTRAL (SSC, KAABAG, TME, SENSSO) — No Dean stage!
    if (stepId === 1) {
      const match = (role === 'ROLE_ORGANIZATION' || role === 'Org President') && userOrgId === activity.orgId;
      return {
        canApprove: match,
        canDefer: false,
        expectedRole: 'ROLE_ORGANIZATION',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization User`,
        reason: match ? 'Authorized to submit' : `Only the ${orgName} Organization User can submit this proposal.`
      };
    }
    if (stepId === 2) {
      const match = (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') && userOrgId === activity.orgId;
      return {
        canApprove: match,
        canDefer: match,
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
        expectedRole: 'ROLE_OVCSAS',
        expectedOrg: 'OVCSAS',
        expectedTitle: 'OVCSAS Officer',
        reason: match ? 'Authorized to endorse' : 'Only the OVCSAS Officer can approve/endorse or defer at this stage.'
      };
    }
    if (stepId === 5) {
      const match = role === 'ROLE_OC' || role === 'Office of the Chancellor' || role.includes('Chancellor');
      return {
        canApprove: match,
        canDefer: match,
        expectedRole: 'ROLE_OC',
        expectedOrg: 'OC',
        expectedTitle: 'Office of the Chancellor',
        reason: match ? 'Authorized for Chancellor approval' : 'Only the Office of the Chancellor can grant institutional approval.'
      };
    }
    if (stepId === 6) {
      // Accomplishment Report Submission: Central Org
      const match = (role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'Org Treasurer') && userOrgId === activity.orgId;
      return {
        canApprove: match,
        canDefer: false,
        expectedRole: 'ROLE_ORGANIZATION',
        expectedOrg: orgName,
        expectedTitle: `${orgName} Organization Leadership`,
        reason: match ? 'Authorized to submit accomplishment report' : `Only the ${orgName} Organization leadership can fill and submit the accomplishment report.`
      };
    }
    if (stepId === 7) {
      // Adviser Accomplishment Review & Final Sign-Off: Faculty Adviser
      const match = (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') && userOrgId === activity.orgId;
      return {
        canApprove: match,
        canDefer: match,
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
  queueType: 'pending' | 'deferred' | 'approved' | 'all' = 'all'
): boolean {
  if (!currentUser) return false;
  const role = currentUser.role;

  // 1. System Administrator sees all activities
  if (role === 'ROLE_ADMIN' || role === 'System Administrator') {
    return true;
  }

  const isCollege = isCollegeOrg(activity.orgId);
  const userOrg = currentUser.orgId;
  const userCollege = currentUser.collegeId || currentUser.orgId;

  // 2. Student Organization user: ONLY activities belonging to their own organization
  if (role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'Org Treasurer') {
    return activity.orgId === userOrg;
  }

  // 3. Faculty Adviser: ONLY activities belonging to their designated organization
  if (role === 'ROLE_ADVISER' || role === 'Faculty Adviser') {
    return activity.orgId === userOrg;
  }

  // 4. College Dean: ONLY activities belonging to their college
  if (role === 'ROLE_DEAN' || role === 'College Dean' || role === 'Dean / College Reviewer') {
    return activity.orgId === userOrg || activity.collegeId === userCollege || activity.orgId === userCollege;
  }

  const currentStage = getTimelineStageIndex(activity);
  const osdStage = isCollege ? 4 : 3;
  const ovcsasStage = isCollege ? 5 : 4;
  const ocStage = isCollege ? 6 : 5;

  const fullyApproved = isActivityFullyApproved(activity);

  // 5. OSD Officer:
  // - In pending: ONLY activities sent to OSD (at stage 3 for central, 4 for college)
  // - In approved: activities that OSD has already approved
  if (role === 'ROLE_OSD' || role === 'OSD Officer' || role === 'OSD Director' || role.includes('OSD')) {
    if (queueType === 'pending') {
      return !fullyApproved && currentStage === osdStage && activity.status !== 'DEFERRED' && activity.status !== 'DEFERRED FOR REVISION';
    }
    if (queueType === 'deferred') {
      return (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION') && 
        (currentStage === osdStage || Boolean(activity.deferredBy && activity.deferredBy.toLowerCase().includes('osd')));
    }
    if (queueType === 'approved') {
      const hasOsdApproved = activity.workflowHistory?.some(h => 
        (h.actorRole?.includes('OSD') || (h as any).approverRole?.includes('OSD')) && 
        (h.action === 'APPROVE' || (h.action as string) === 'APPROVED')
      );
      return currentStage > osdStage || fullyApproved || !!hasOsdApproved;
    }
    return currentStage >= osdStage || fullyApproved;
  }

  // 6. OVCSAS Officer:
  if (role === 'ROLE_OVCSAS' || role === 'OVCSAS Officer' || role.includes('OVCSAS')) {
    if (queueType === 'pending') {
      return !fullyApproved && currentStage === ovcsasStage && activity.status !== 'DEFERRED' && activity.status !== 'DEFERRED FOR REVISION';
    }
    if (queueType === 'deferred') {
      return (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION') && 
        (currentStage === ovcsasStage || Boolean(activity.deferredBy && activity.deferredBy.toLowerCase().includes('ovcsas')));
    }
    if (queueType === 'approved') {
      const hasOvcsasApproved = activity.workflowHistory?.some(h => 
        (h.actorRole?.includes('OVCSAS') || (h as any).approverRole?.includes('OVCSAS')) && 
        (h.action === 'APPROVE' || (h.action as string) === 'APPROVED' || (h.action as string) === 'ENDORSE')
      );
      return currentStage > ovcsasStage || fullyApproved || !!hasOvcsasApproved;
    }
    return currentStage >= ovcsasStage || fullyApproved;
  }

  // 7. Office of the Chancellor (OC):
  if (role === 'ROLE_OC' || role === 'Office of the Chancellor' || role.includes('Chancellor')) {
    if (queueType === 'pending') {
      return !fullyApproved && currentStage === ocStage && activity.status !== 'DEFERRED' && activity.status !== 'DEFERRED FOR REVISION';
    }
    if (queueType === 'deferred') {
      return (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION') && 
        (currentStage === ocStage || Boolean(activity.deferredBy && activity.deferredBy.toLowerCase().includes('chancellor')));
    }
    if (queueType === 'approved') {
      const hasOcApproved = activity.workflowHistory?.some(h => 
        (h.actorRole?.includes('OC') || (h as any).approverRole?.includes('OC') || h.actorRole?.includes('Chancellor') || (h as any).approverRole?.includes('Chancellor')) && 
        (h.action === 'APPROVE' || (h.action as string) === 'APPROVED' || h.action === 'FINAL_APPROVE' || (h.action as string) === 'FINAL_APPROVED')
      );
      return currentStage > ocStage || fullyApproved || !!hasOcApproved;
    }
    return currentStage >= ocStage || fullyApproved;
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

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'ACT-2027-CBIT-001',
    title: '2nd Semester: CBIT General Assembly',
    programActivity: '2nd Semester: CBIT General Assembly',
    orgId: 'CBIT',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in January',
    startDate: '2027-01-16',
    endDate: '2027-01-16',
    startTime: '01:00 PM',
    endTime: '05:00 PM',
    venue: 'CBIT Amphitheater',
    description: "It gives students the opportunity to voice their concerns and ask questions following the officers' discussion.",
    strategicObjectives: "It gives students the opportunity to voice their concerns and ask questions following the officers' discussion.",
    expectedOutput: 'It is expected for the member of the college to actively participate in the event so that they will be informed and to address their concerns.',
    office: 'CBIT',
    lineItemBudget: 'Design, materials, water, and faculty snacks.',
    amount: 1500,
    budget: 1500,
    totalBudget: 1500,
    fundSource: 'CBIT-SEC Fund',
    personAssigned: 'CBIT-SEC Officers',
    targetParticipants: 220,
    status: 'Approved',
    strategicPillar: 'Student Governance & Transparent Communication',
    proposedBy: 'Joshua Paul Mendoza (CBIT President)',
    submittedDate: '2026-11-05',
    approvalStage: 'Approved',
    kpiOutcome: '100% resolution of student queries and published executive updates'
  },
  {
    id: 'ACT-2027-CBIT-002',
    title: '2nd semester: Society General Assembly 2027',
    programActivity: '2nd semester: Society General Assembly 2027',
    orgId: 'CBIT',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in January',
    startDate: '2027-01-23',
    endDate: '2027-01-23',
    startTime: '08:30 AM',
    endTime: '04:00 PM',
    venue: 'CBIT Multi-Purpose Hall',
    description: "The General Assembly aims to evaluate the progress of plans and activities set during the first assembly. It also seeks to strengthen engagement by addressing members' concerns and aligning new initiatives with organizational goals.",
    strategicObjectives: "The General Assembly aims to evaluate the progress of plans and activities set during the first assembly. It also seeks to strengthen engagement by addressing members' concerns and aligning new initiatives with organizational goals.",
    expectedOutput: "The assembly is expected to provide members with updates and clarity on the organization's achievements and future directions. It will also foster stronger unity, accountability, and commitment among Society members.",
    office: 'CBIT',
    lineItemBudget: 'Certificates, design, materials, water, and faculty snacks.',
    amount: 5100,
    budget: 5100,
    totalBudget: 5100,
    fundSource: 'CBIT-SEC Funds',
    personAssigned: 'CBIT-SEC and Society Officers',
    targetParticipants: 310,
    status: 'Approved',
    strategicPillar: 'Organizational Alignment & Membership Engagement',
    proposedBy: 'Joshua Paul Mendoza (CBIT President)',
    submittedDate: '2026-11-12',
    approvalStage: 'Approved',
    kpiOutcome: 'Comprehensive evaluation of mid-year milestones and ratified semester resolutions'
  },
  {
    id: 'ACT-2027-CBIT-003',
    title: 'Annual Information Technology & Technopreneurship Bootcamp',
    programActivity: 'IT Technopreneurship & Innovation Summit 2027',
    orgId: 'CBIT',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'February 18-20, 2027',
    startDate: '2027-02-18',
    endDate: '2027-02-20',
    startTime: '08:00 AM',
    endTime: '05:00 PM',
    venue: 'Innovation Hub & Computer Labs',
    description: 'Intensive technology incubator and practical workshop on startup prototyping, digital market readiness, and software engineering.',
    strategicObjectives: 'Equip IT and business students with technical industry skill sets, agile development frameworks, and venture mentoring.',
    expectedOutput: '15 fully conceptualized technopreneurial prototypes evaluated by regional industry partners.',
    office: 'CBIT',
    lineItemBudget: 'Industry speaker honoraria, participant kits, venue audiovisuals, and tokens.',
    amount: 18500,
    budget: 18500,
    totalBudget: 18500,
    fundSource: 'CBIT-SEC Special Projects Fund',
    personAssigned: 'CBIT Committee on Academic & Tech Affairs',
    targetParticipants: 180,
    status: 'Approved',
    strategicPillar: 'Technological Innovation & Industry Linkages',
    proposedBy: 'Joshua Paul Mendoza (CBIT President)',
    submittedDate: '2026-11-18',
    approvalStage: 'Approved',
    kpiOutcome: '15 functional mobile and web project blueprints'
  },
  {
    id: 'ACT-2027-SSC-001',
    title: '2nd Semester: University-Wide Leadership & Accreditation Summit',
    programActivity: '2nd Semester: University-Wide Leadership & Accreditation Summit',
    orgId: 'SSC',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in January',
    startDate: '2027-01-20',
    endDate: '2027-01-21',
    startTime: '08:00 AM',
    endTime: '05:00 PM',
    venue: 'MSUN Grand Gymnasium',
    description: 'Annual strategic alignment of all accredited student councils and university-wide student representation.',
    strategicObjectives: 'Align university-wide student council action plans and standardize financial reporting and student representation.',
    expectedOutput: 'Ratified university resolutions and unified student action plan calendar across all colleges.',
    office: 'SSC',
    lineItemBudget: 'Leadership kits, institutional materials, audiovisual equipment, and snacks.',
    amount: 12000,
    budget: 12000,
    totalBudget: 12000,
    fundSource: 'SSC Institutional Fund',
    personAssigned: 'SSC Executive Officers',
    targetParticipants: 350,
    status: 'Approved',
    strategicPillar: 'Leadership Governance & Institutional Representation',
    proposedBy: 'Maria Clarisse Santos (SSC President)',
    submittedDate: '2026-11-10',
    approvalStage: 'Approved',
    kpiOutcome: '100% submission of synchronized council action plans'
  },
  {
    id: 'ACT-2027-CESS-001',
    title: '2nd Semester: CESS Technical Induction & Bridge Design Challenge',
    programActivity: '2nd Semester: CESS Technical Induction & Bridge Design Challenge',
    orgId: 'CESS',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in January',
    startDate: '2027-01-25',
    endDate: '2027-01-26',
    startTime: '09:00 AM',
    endTime: '04:30 PM',
    venue: 'Engineering Multi-Purpose Hall',
    description: 'Technical orientation for engineering students with applied structural modeling and design testing.',
    strategicObjectives: 'Strengthen core civil engineering competencies and introduce advanced structural load evaluation.',
    expectedOutput: 'Active participation of engineering cohorts and completed structural prototyping assessments.',
    office: 'CESS',
    lineItemBudget: 'Testing materials, design certificates, measuring tools, and faculty snacks.',
    amount: 4500,
    budget: 4500,
    totalBudget: 4500,
    fundSource: 'CESS-SEC Fund',
    personAssigned: 'CESS-SEC Officers',
    targetParticipants: 180,
    status: 'Approved',
    strategicPillar: 'Engineering Excellence & Technical Innovation',
    proposedBy: 'Karlo Emmanuel Tan (CESS President)',
    submittedDate: '2026-11-12',
    approvalStage: 'Approved',
    kpiOutcome: '25 tested bridge prototypes and documented load test records'
  },
  {
    id: 'ACT-2027-CELS-001',
    title: '2nd Semester: CELS Pedagogical Colloquium & Literary Arts Assembly',
    programActivity: '2nd Semester: CELS Pedagogical Colloquium & Literary Arts Assembly',
    orgId: 'CELS',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in February',
    startDate: '2027-02-10',
    endDate: '2027-02-11',
    startTime: '08:30 AM',
    endTime: '05:00 PM',
    venue: 'CELS Audio-Visual Hall',
    description: 'Colloquium on modern instructional strategies and student-centered curriculum development.',
    strategicObjectives: 'Foster scholarly dialogue on contemporary pedagogy and creative literary expression among education majors.',
    expectedOutput: 'Compilation of peer-reviewed student teaching modules and literary anthology submissions.',
    office: 'CELS',
    lineItemBudget: 'Colloquium materials, printing, speaker token, and refreshments.',
    amount: 6200,
    budget: 6200,
    totalBudget: 6200,
    fundSource: 'CELS-SEC Fund',
    personAssigned: 'CELS-SEC Officers',
    targetParticipants: 200,
    status: 'Approved',
    strategicPillar: 'Teacher Education & Pedagogical Research',
    proposedBy: 'Beatrice Mae Flores (CELS President)',
    submittedDate: '2026-11-14',
    approvalStage: 'Approved',
    kpiOutcome: '20 peer-evaluated lesson plans and pedagogical paper presentations'
  },
  {
    id: 'ACT-2027-CMFS-001',
    title: '2nd Semester: Marine Conservation & Coastal Stewards Assembly',
    programActivity: '2nd Semester: Marine Conservation & Coastal Stewards Assembly',
    orgId: 'CMFS',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in January',
    startDate: '2027-01-28',
    endDate: '2027-01-28',
    startTime: '07:00 AM',
    endTime: '03:00 PM',
    venue: 'CMFS Marine Laboratory & Naawan Shoreline',
    description: 'Community-engaged coastal assessment, habitat monitoring, and marine science leadership orientation.',
    strategicObjectives: 'Mobilize marine science students for proactive coastline monitoring and ecological conservation.',
    expectedOutput: 'Documented coastal water quality baseline report and 100% active student member participation.',
    office: 'CMFS',
    lineItemBudget: 'Sampling kits, waterproof supplies, boat fuel, and student packed meals.',
    amount: 5500,
    budget: 5500,
    totalBudget: 5500,
    fundSource: 'CMFS-SEC Fund',
    personAssigned: 'CMFS-SEC Officers',
    targetParticipants: 160,
    status: 'Approved',
    strategicPillar: 'Marine Ecology & Sustainable Aquaculture',
    proposedBy: 'Althea Nicole Gomez (CMFS President)',
    submittedDate: '2026-11-15',
    approvalStage: 'Approved',
    kpiOutcome: 'Baseline ecological biodiversity survey submitted to research office'
  },
  {
    id: 'ACT-2027-KAABAG-001',
    title: '2nd Semester: Peer Support Network & Mental Health Assembly',
    programActivity: '2nd Semester: Peer Support Network & Mental Health Assembly',
    orgId: 'KAABAG',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in January',
    startDate: '2027-01-22',
    endDate: '2027-01-22',
    startTime: '01:00 PM',
    endTime: '05:30 PM',
    venue: 'Student Activity Center Hall B',
    description: 'Wellness forum and peer listening skills orientation for student advocates.',
    strategicObjectives: 'Equip student representatives with peer listening, psychological first aid, and empathetic support tools.',
    expectedOutput: 'Trained network of college peer companions and established student wellness hotline guidelines.',
    office: 'KAABAG',
    lineItemBudget: 'Wellness kits, informational brochures, certificate paper, and snacks.',
    amount: 3800,
    budget: 3800,
    totalBudget: 3800,
    fundSource: 'KAABAG Trust Fund',
    personAssigned: 'KAABAG Executive Committee',
    targetParticipants: 120,
    status: 'Approved',
    strategicPillar: 'Mental Health & Student Well-Being',
    proposedBy: 'Gabriel Angelo Cruz (KAABAG President)',
    submittedDate: '2026-11-16',
    approvalStage: 'Approved',
    kpiOutcome: '45 newly certified student peer counselors'
  },
  {
    id: 'ACT-2027-TME-001',
    title: '2nd Semester: Campus Journalism & Press Ethics Masterclass',
    programActivity: '2nd Semester: Campus Journalism & Press Ethics Masterclass',
    orgId: 'TME',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in February',
    startDate: '2027-02-15',
    endDate: '2027-02-16',
    startTime: '09:00 AM',
    endTime: '04:00 PM',
    venue: 'TME Press Room & Multimedia Lab',
    description: 'Advanced news writing, investigative reporting, digital layout, and editorial ethics training.',
    strategicObjectives: 'Improve journalistic standards, investigative rigor, and ethical reporting across all campus correspondents.',
    expectedOutput: 'Publication of the 2nd Semester issue of The Mindanao Explorer and trained staff reporters.',
    office: 'TME',
    lineItemBudget: 'Journalism resource modules, honorarium token, printing consumables, and refreshments.',
    amount: 4800,
    budget: 4800,
    totalBudget: 4800,
    fundSource: 'TME Publication Fund',
    personAssigned: 'TME Editorial Board',
    targetParticipants: 90,
    status: 'Approved',
    strategicPillar: 'Campus Press Freedom & Critical Discourse',
    proposedBy: 'Mark Christopher Diaz (TME Editor-in-Chief)',
    submittedDate: '2026-11-18',
    approvalStage: 'Approved',
    kpiOutcome: 'Complete printing and digital release of campus gazette issue'
  },
  {
    id: 'ACT-2027-SenSo-001',
    title: '2nd Semester: Senior Student Society Leadership Transition & Career Forum',
    programActivity: '2nd Semester: Senior Student Society Leadership Transition & Career Forum',
    orgId: 'SenSo',
    fiscalYear: 'Fiscal Year 2027',
    timeframe: 'Anytime in January',
    startDate: '2027-01-29',
    endDate: '2027-01-29',
    startTime: '02:00 PM',
    endTime: '07:00 PM',
    venue: 'University Cultural Center Amphitheater',
    description: 'Senior Student Society leadership turnover, graduating class symposium, capstone mentoring, and career transition forum.',
    strategicObjectives: 'Equip graduating students with leadership transition skills, career readiness, and alumni engagement networking.',
    expectedOutput: 'Documented graduating class directory, career pathway commitments, and leadership turnover resolution.',
    office: 'SenSo',
    lineItemBudget: 'Stage materials, traditional sound instruments, certificate frames, and refreshments.',
    amount: 3500,
    budget: 3500,
    totalBudget: 3500,
    fundSource: 'SenSo Guild Fund',
    personAssigned: 'SenSo Council Officers',
    targetParticipants: 250,
    status: 'Approved',
    strategicPillar: 'Cultural Heritage & Sociological Discourse',
    proposedBy: 'Corazon Patricia Lim (SenSo President)',
    submittedDate: '2026-11-20',
    approvalStage: 'Approved',
    kpiOutcome: 'Archiving of 10 regional oral history narratives and stage presentation'
  },
  {
    id: 'ACT-2026-001',
    title: 'University Leadership Summit & Accreditation 2026',
    orgId: 'SSC',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-09-24',
    endDate: '2026-09-26',
    startTime: '08:00 AM',
    endTime: '05:00 PM',
    venue: 'MSUN Grand Gymnasium & Cultural Center',
    description: 'Three-day intensive governance seminar, parliamentary procedure training, and annual organizational accreditation workshop for all student leaders.',
    targetParticipants: 350,
    budget: 85000,
    status: 'Approved',
    strategicPillar: 'Leadership Governance & Institutional Quality',
    proposedBy: 'Maria Clarisse Santos (SSC President)',
    submittedDate: '2026-08-15',
    approvalStage: 'Approved',
    kpiOutcome: '100% accredited campus student organizations and standardized financial liquidation frameworks'
  },
  {
    id: 'ACT-2026-002',
    title: 'TechInno Hackathon & Digital Inclusion Caravan',
    orgId: 'CBIT',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-09-28',
    endDate: '2026-09-29',
    startTime: '09:00 AM',
    endTime: '08:00 PM',
    venue: 'IT Innovation Lab & Hybrid Hub',
    description: '36-hour rapid software development challenge centering local municipal digital solutions and rural aquaculture data systems.',
    targetParticipants: 160,
    budget: 45000,
    status: 'Approved',
    strategicPillar: 'Technological Innovation & Community Extension',
    proposedBy: 'Joshua Paul Mendoza (CBIT President)',
    submittedDate: '2026-08-20',
    approvalStage: 'Approved',
    kpiOutcome: '12 working software prototypes addressing coastal municipal logistics'
  },
  {
    id: 'ACT-2026-003',
    title: 'Coastal Cleanup & Mangrove Rehabilitation Phase IV',
    orgId: 'CMFS',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-10-03',
    endDate: '2026-10-03',
    startTime: '06:00 AM',
    endTime: '01:00 PM',
    venue: 'Naawan Marine Sanctuary & Shoreline Zone',
    description: 'Community-wide environmental mobilization to plant 2,000 mangrove propagules and collect marine debris along Naawan bay.',
    targetParticipants: 280,
    budget: 32000,
    status: 'Approved',
    strategicPillar: 'Ecological Sustainability & Marine Stewardship',
    proposedBy: 'Althea Nicole Gomez (CMFS President)',
    submittedDate: '2026-08-28',
    approvalStage: 'Approved',
    kpiOutcome: '2,000 surviving mangrove propagules and 1.5 tons of marine litter categorized'
  },
  {
    id: 'ACT-2026-004',
    title: 'Spaghetti Bridge Design & Structural Load Testing',
    orgId: 'CESS',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-10-08',
    endDate: '2026-10-09',
    startTime: '01:00 PM',
    endTime: '06:00 PM',
    venue: 'Engineering Multi-Purpose Workshop',
    description: 'Annual hands-on structural engineering competition challenging students to calculate load paths, tension, and structural failure mechanics.',
    targetParticipants: 120,
    budget: 18500,
    status: 'Pending',
    strategicPillar: 'Academic Competence & Practical Engineering',
    proposedBy: 'Karlo Emmanuel Tan (CESS President)',
    submittedDate: '2026-09-02',
    approvalStage: 'OSA Endorsement',
    kpiOutcome: 'Enhanced comprehension of structural mechanics across 120 undergraduate students'
  },
  {
    id: 'ACT-2026-005',
    title: 'Mental Health First Aid & Peer Listener Workshop',
    orgId: 'KAABAG',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-10-12',
    endDate: '2026-10-13',
    startTime: '08:30 AM',
    endTime: '04:30 PM',
    venue: 'Audio-Visual Hall 1',
    description: 'Training student representatives in crisis de-escalation, empathetic listening, and psychological first aid response protocols.',
    targetParticipants: 90,
    budget: 24000,
    status: 'Approved',
    strategicPillar: 'Student Well-being & Inclusive Health',
    proposedBy: 'Gabriel Angelo Cruz (KAABAG President)',
    submittedDate: '2026-08-30',
    approvalStage: 'Approved',
    kpiOutcome: '60 certified peer listeners deployed across academic dormitories and colleges'
  },
  {
    id: 'ACT-2026-006',
    title: 'Sinag Silangan: Inter-College Cultural Arts Festival',
    orgId: 'SenSo',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-10-16',
    endDate: '2026-10-18',
    startTime: '04:00 PM',
    endTime: '09:30 PM',
    venue: 'MSUN University Open Amphitheater',
    description: 'Showcasing folk dance traditions, spoken word poetry, indigenous musical ensembles, and contemporary university theater.',
    targetParticipants: 800,
    budget: 68000,
    status: 'Pending',
    strategicPillar: 'Cultural Heritage & Creative Expression',
    proposedBy: 'Corazon Patricia Lim (SenSo President)',
    submittedDate: '2026-09-08',
    approvalStage: 'Dean Review',
    kpiOutcome: 'Preservation and celebration of Northern Mindanao indigenous artistic customs'
  },
  {
    id: 'ACT-2026-007',
    title: 'Renewable Solar Lantern Fabrication for Coastal Fisherfolk',
    orgId: 'TME',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-10-22',
    endDate: '2026-10-23',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    venue: 'Mechanical Engineering Workshop C',
    description: 'Assembling and donating 50 weatherproof solar LED lamps to artisanal fisherfolk in Barangay Linangkayan.',
    targetParticipants: 75,
    budget: 38000,
    status: 'Approved',
    strategicPillar: 'Community Extension & Appropriate Technology',
    proposedBy: 'Mark Christopher Diaz (TME President)',
    submittedDate: '2026-09-01',
    approvalStage: 'Approved',
    kpiOutcome: '50 functional solar marine lights distributed to coastal households'
  },
  {
    id: 'ACT-2026-008',
    title: 'Dalumat: Regional Teacher Education Research Colloquium',
    orgId: 'CELS',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-10-27',
    endDate: '2026-10-28',
    startTime: '08:00 AM',
    endTime: '05:00 PM',
    venue: 'University Training Hall & Zoom Hybrid',
    description: 'Presentation of undergraduate pedagogical papers on mother tongue-based multilingual education and digital classroom strategies.',
    targetParticipants: 220,
    budget: 29000,
    status: 'Pending',
    strategicPillar: 'Academic Research & Pedagogical Innovation',
    proposedBy: 'Beatrice Mae Flores (CELS President)',
    submittedDate: '2026-09-10',
    approvalStage: 'Dean Review',
    kpiOutcome: 'Publication of conference proceedings with 28 peer-reviewed student research abstracts'
  },
  {
    id: 'ACT-2026-009',
    title: 'University-wide Student Grievance & Policy Town Hall',
    orgId: 'SSC',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-11-04',
    endDate: '2026-11-04',
    startTime: '01:30 PM',
    endTime: '05:30 PM',
    venue: 'MSUN Student Center Plaza',
    description: 'Open dialogue between university administration, student leaders, and campus organizations on student handbook updates and tuition fee policies.',
    targetParticipants: 600,
    budget: 15000,
    status: 'Approved',
    strategicPillar: 'Transparency & Student Welfare Advocacy',
    proposedBy: 'Maria Clarisse Santos (SSC President)',
    submittedDate: '2026-09-05',
    approvalStage: 'Approved',
    kpiOutcome: 'Formal submission of the 2026 Student Resolution to the Board of Regents'
  },
  {
    id: 'ACT-2026-010',
    title: 'Cybersecurity Awareness & Ethical Hacking Bootcamp',
    orgId: 'CBIT',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-11-12',
    endDate: '2026-11-13',
    startTime: '09:00 AM',
    endTime: '04:00 PM',
    venue: 'CBIT Computer Lab 3',
    description: 'Hands-on practical sessions in network defense, password security, vulnerability assessment, and phishing prevention for student accounts.',
    targetParticipants: 110,
    budget: 22000,
    status: 'Pending',
    strategicPillar: 'Digital Literacy & Cyber Defense',
    proposedBy: 'Joshua Paul Mendoza (CBIT President)',
    submittedDate: '2026-09-12',
    approvalStage: 'OSA Endorsement',
    kpiOutcome: '110 student accounts audited and secured against brute-force and social engineering vectors'
  },
  {
    id: 'ACT-2026-011',
    title: 'Aquaculture Feeding Regimen & Hatchery Field Day',
    orgId: 'CMFS',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-11-18',
    endDate: '2026-11-19',
    startTime: '07:30 AM',
    endTime: '04:00 PM',
    venue: 'MSUN Marine Hatchery and Brackishwater Research Station',
    description: 'Field demonstration of low-cost formulated feeds for milkfish (Chanos chanos) and black tiger prawn (Penaeus monodon).',
    targetParticipants: 140,
    budget: 27500,
    status: 'Approved',
    strategicPillar: 'Sustainable Aquaculture & Community Extension',
    proposedBy: 'Althea Nicole Gomez (CMFS President)',
    submittedDate: '2026-09-04',
    approvalStage: 'Approved',
    kpiOutcome: 'Adoption of cost-efficient micro-pellet formulations by local fish-cage operators'
  },
  {
    id: 'ACT-2026-012',
    title: 'CAD & 3D Modeling Masterclass for Infrastructure Projects',
    orgId: 'CESS',
    fiscalYear: 'Fiscal Year 2026',
    startDate: '2026-11-25',
    endDate: '2026-11-26',
    startTime: '08:30 AM',
    endTime: '05:00 PM',
    venue: 'CESS Simulation Center',
    description: 'Certified industry workshop covering Building Information Modeling (BIM) and AutoCAD for structural engineering students.',
    targetParticipants: 85,
    budget: 21000,
    status: 'Pending',
    strategicPillar: 'Technical Skill Augmentation',
    proposedBy: 'Karlo Emmanuel Tan (CESS President)',
    submittedDate: '2026-09-14',
    approvalStage: 'Stage 1: Proposal & Activity Design',
    kpiOutcome: '85 student portfolios generated with compliant 3D structural blueprints'
  }
];

// Initialize initial activities with their dynamic org-specific workflow (Non-college: 5 stages, College: 6 stages)
INITIAL_ACTIVITIES.forEach((act, index) => {
  const isCollege = isCollegeOrg(act.orgId);
  act.organizationType = isCollege ? 'COLLEGE' : 'CENTRAL';
  if (isCollege) {
    act.collegeId = act.orgId;
  }
  act.timeline = JSON.parse(JSON.stringify(getWorkflowTimelineForOrg(act.orgId)));
  act.workflowHistory = [
    {
      id: `wf-init-${act.id}-1`,
      stageId: 1,
      stageName: 'Organization Submission',
      action: 'SUBMIT',
      actorId: `usr-${act.orgId.toLowerCase()}-org`,
      actorName: `${act.orgId} Organization User`,
      actorRole: 'ROLE_ORGANIZATION',
      remark: 'Initial activity proposal and design submitted for review.',
      timestamp: act.submittedDate || '2026-09-01'
    }
  ];

  // Distribute a few activities across different review stages so every role has activities in their queue to test immediately
  if (index === 0) {
    // For Adviser Review
    act.status = 'Pending';
    act.approvalStage = 'Adviser Review';
    if (act.timeline && act.timeline[0]) act.timeline[0].status = 'completed';
    if (act.timeline && act.timeline[1]) act.timeline[1].status = 'in_progress';
  } else if (index === 1) {
    // For College Dean Review (or OSD if central)
    if (isCollege) {
      act.status = 'Pending';
      act.approvalStage = 'College Dean Endorsement';
      if (act.timeline && act.timeline[0]) act.timeline[0].status = 'completed';
      if (act.timeline && act.timeline[1]) act.timeline[1].status = 'completed';
      if (act.timeline && act.timeline[2]) act.timeline[2].status = 'in_progress';
      act.workflowHistory.push({
        id: `wf-init-${act.id}-2`,
        stageId: 2,
        stageName: 'Adviser Review',
        action: 'APPROVE',
        actorId: `usr-${act.orgId.toLowerCase()}-adv`,
        actorName: `${act.orgId} Adviser`,
        actorRole: 'ROLE_ADVISER',
        remark: 'Reviewed and endorsed with full recommendation.',
        timestamp: '2026-09-02'
      });
    } else {
      act.status = 'Pending';
      act.approvalStage = 'OSD Approval';
      if (act.timeline && act.timeline[0]) act.timeline[0].status = 'completed';
      if (act.timeline && act.timeline[1]) act.timeline[1].status = 'completed';
      if (act.timeline && act.timeline[2]) act.timeline[2].status = 'in_progress';
    }
  } else if (index === 2) {
    // For OSD Approval
    act.status = 'Pending';
    act.approvalStage = 'OSD Approval';
    const osdIndex = isCollege ? 3 : 2;
    for (let i = 0; i < osdIndex; i++) {
      if (act.timeline && act.timeline[i]) act.timeline[i].status = 'completed';
    }
    if (act.timeline && act.timeline[osdIndex]) act.timeline[osdIndex].status = 'in_progress';
  } else if (index === 3) {
    // For OVCSAS Approval
    act.status = 'Pending';
    act.approvalStage = 'OVCSAS Approval / Endorsement';
    const ovcsasIndex = isCollege ? 4 : 3;
    for (let i = 0; i < ovcsasIndex; i++) {
      if (act.timeline && act.timeline[i]) act.timeline[i].status = 'completed';
    }
    if (act.timeline && act.timeline[ovcsasIndex]) act.timeline[ovcsasIndex].status = 'in_progress';
  } else if (index === 4) {
    // For Chancellor Final Approval
    act.status = 'Pending';
    act.approvalStage = 'Office of the Chancellor Final Approval';
    const ocIndex = isCollege ? 5 : 4;
    for (let i = 0; i < ocIndex; i++) {
      if (act.timeline && act.timeline[i]) act.timeline[i].status = 'completed';
    }
    if (act.timeline && act.timeline[ocIndex]) act.timeline[ocIndex].status = 'in_progress';
  } else if (index === 5) {
    // Sample DEFERRED activity for demonstration
    act.status = 'DEFERRED';
    act.approvalStage = 'DEFERRED FOR REVISION';
    act.deferReason = 'Please revise the proposed budget line items and attach the itemized quotations for equipment and venue.';
    act.deferredBy = 'OSD Officer';
    act.deferredAt = '2026-09-08';
    act.workflowHistory.push({
      id: `wf-init-${act.id}-defer`,
      stageId: isCollege ? 4 : 3,
      stageName: 'OSD Approval',
      action: 'DEFER',
      actorId: 'usr-osd-01',
      actorName: 'OSD Officer',
      actorRole: 'ROLE_OSD',
      remark: act.deferReason,
      timestamp: '2026-09-08'
    });
  } else if (index === 6) {
    // Stage after OC approval: Accomplishment Report Submission (Organization fills report)
    act.status = 'Pending';
    act.approvalStage = isCollege ? 'Stage 7: Accomplishment Report Submission' : 'Stage 6: Accomplishment Report Submission';
    const ocIndex = isCollege ? 5 : 4;
    const accompIndex = isCollege ? 6 : 5;
    for (let i = 0; i <= ocIndex; i++) {
      if (act.timeline && act.timeline[i]) act.timeline[i].status = 'completed';
    }
    if (act.timeline && act.timeline[accompIndex]) act.timeline[accompIndex].status = 'in_progress';
    act.workflowHistory.push({
      id: `wf-init-${act.id}-oc-appr`,
      stageId: isCollege ? 6 : 5,
      stageName: 'Office of the Chancellor Final Approval',
      action: 'APPROVE',
      actorId: 'usr-oc-01',
      actorName: 'Office of the Chancellor',
      actorRole: 'ROLE_OC',
      remark: 'Institutional authorization granted. Proceed to activity implementation and accomplishment report filing.',
      timestamp: '2026-09-10'
    });
  } else if (index === 7 || act.id === 'ACT-2026-009') {
    // Stage after Accomplishment filled: Adviser Accomplishment Review & Final Sign-Off
    act.status = 'Pending';
    act.approvalStage = isCollege ? 'Stage 8: Adviser Accomplishment Review & Final Sign-Off' : 'Stage 7: Adviser Accomplishment Review & Final Sign-Off';
    const finalIndex = isCollege ? 7 : 6;
    for (let i = 0; i < finalIndex; i++) {
      if (act.timeline && act.timeline[i]) act.timeline[i].status = 'completed';
    }
    if (act.timeline && act.timeline[finalIndex]) act.timeline[finalIndex].status = 'in_progress';
    act.accomplishmentForm = {
      activityTitle: act.title,
      unitCollege: act.orgId,
      datePrepared: '2026-11-05',
      actualAttendance: act.targetParticipants || 600,
      attendanceSummary: 'High attendance with active student leader participation across all planned sessions.',
      keyOutcomes: '100% of planned seminar outputs achieved. Financial liquidation itemized and submitted for faculty endorsement.',
      financialLiquidationSummary: 'Itemized official receipts and cash vouchers attached for all budget categories.',
      isCompleted: true
    };
    act.workflowHistory.push(
      {
        id: `wf-init-${act.id}-oc`,
        stageId: isCollege ? 6 : 5,
        stageName: 'Office of the Chancellor Final Approval',
        action: 'APPROVE',
        actorId: 'usr-oc-01',
        actorName: 'Office of the Chancellor',
        actorRole: 'ROLE_OC',
        remark: 'Approved by Office of the Chancellor.',
        timestamp: '2026-09-10'
      },
      {
        id: `wf-init-${act.id}-accomp`,
        stageId: isCollege ? 7 : 6,
        stageName: 'Accomplishment Report Submission',
        action: 'SUBMIT',
        actorId: `usr-${act.orgId.toLowerCase()}-org`,
        actorName: `${act.orgId} Leadership`,
        actorRole: 'ROLE_ORGANIZATION',
        remark: 'Accomplishment report, photo proofs, and financial liquidation submitted to Adviser for final sign-off.',
        timestamp: '2026-11-05'
      }
    );
  } else if (index === 8) {
    // Fully Approved and Liquidated (Finish all stages)
    act.status = 'Approved';
    act.approvalStage = 'Approved';
    if (act.timeline) {
      act.timeline.forEach(t => { t.status = 'completed'; });
    }
    act.accomplishmentForm = {
      activityTitle: act.title,
      unitCollege: act.orgId,
      datePrepared: '2026-09-18',
      actualAttendance: act.targetParticipants || 200,
      attendanceSummary: 'Completed successfully with outstanding feedback scores (98% satisfaction rating).',
      keyOutcomes: 'Institutional milestones met and official documentation archived.',
      financialLiquidationSummary: 'Full liquidation verified and closed by accounting and faculty adviser.',
      isCompleted: true
    };
    act.workflowHistory.push(
      {
        id: `wf-init-${act.id}-oc`,
        stageId: isCollege ? 6 : 5,
        stageName: 'Office of the Chancellor Final Approval',
        action: 'APPROVE',
        actorId: 'usr-oc-01',
        actorName: 'Office of the Chancellor',
        actorRole: 'ROLE_OC',
        remark: 'Approved by Office of the Chancellor.',
        timestamp: '2026-09-10'
      },
      {
        id: `wf-init-${act.id}-adv-fin`,
        stageId: isCollege ? 8 : 7,
        stageName: 'Adviser Accomplishment Review & Final Sign-Off',
        action: 'FINAL_APPROVE',
        actorId: `usr-${act.orgId.toLowerCase()}-adv`,
        actorName: `${act.orgId} Adviser`,
        actorRole: 'ROLE_ADVISER',
        remark: 'Accomplishment report and financial liquidation verified and approved. All workflow stages completed.',
        timestamp: '2026-09-18'
      }
    );
  } else {
    act.status = 'Pending';
    act.approvalStage = 'Adviser Review';
    if (act.timeline && act.timeline[0]) act.timeline[0].status = 'completed';
    if (act.timeline && act.timeline[1]) act.timeline[1].status = 'in_progress';
  }
});

export const FINANCIAL_SUMMARIES: Record<string, FinancialSummary> = {
  SSC: {
    orgId: 'SSC',
    totalBudget: 280000,
    spent: 172000,
    remaining: 108000,
    utilizationRate: 61.4,
    liquidatedCount: 7,
    pendingLiquidationCount: 2,
    categories: [
      { name: 'Student Leadership & Governance', allocated: 90000, spent: 85000 },
      { name: 'University-wide Events & Advocacy', allocated: 85000, spent: 48000 },
      { name: 'Emergency Relief & Assistance', allocated: 45000, spent: 18000 },
      { name: 'Administrative & Printing Operations', allocated: 35000, spent: 12000 },
      { name: 'Contingency Reserve', allocated: 25000, spent: 9000 }
    ]
  },
  CBIT: {
    orgId: 'CBIT',
    totalBudget: 140000,
    spent: 89000,
    remaining: 51000,
    utilizationRate: 63.5,
    liquidatedCount: 4,
    pendingLiquidationCount: 1,
    categories: [
      { name: 'Hackathons & Tech Competitions', allocated: 55000, spent: 45000 },
      { name: 'Software Licenses & IT Workshops', allocated: 35000, spent: 22000 },
      { name: 'Student Academic Seminars', allocated: 25000, spent: 14000 },
      { name: 'Logistics & Equipment', allocated: 25000, spent: 8000 }
    ]
  },
  CESS: {
    orgId: 'CESS',
    totalBudget: 95000,
    spent: 54000,
    remaining: 41000,
    utilizationRate: 56.8,
    liquidatedCount: 3,
    pendingLiquidationCount: 2,
    categories: [
      { name: 'Design Competitions & Model Materials', allocated: 35000, spent: 24000 },
      { name: 'Technical Certifications & Seminars', allocated: 30000, spent: 18000 },
      { name: 'Site Visits & Industry Field Trips', allocated: 20000, spent: 8000 },
      { name: 'Administrative Operations', allocated: 10000, spent: 4000 }
    ]
  },
  CELS: {
    orgId: 'CELS',
    totalBudget: 110000,
    spent: 62000,
    remaining: 48000,
    utilizationRate: 56.3,
    liquidatedCount: 4,
    pendingLiquidationCount: 1,
    categories: [
      { name: 'Pedagogical Research Colloquium', allocated: 45000, spent: 29000 },
      { name: 'Student Teaching & Fieldwork Aid', allocated: 35000, spent: 21000 },
      { name: 'Literary & Language Contests', allocated: 20000, spent: 8000 },
      { name: 'Operating Expenses', allocated: 10000, spent: 4000 }
    ]
  },
  CMFS: {
    orgId: 'CMFS',
    totalBudget: 125000,
    spent: 86500,
    remaining: 38500,
    utilizationRate: 69.2,
    liquidatedCount: 5,
    pendingLiquidationCount: 1,
    categories: [
      { name: 'Marine Rehabilitation & Mangrove Stock', allocated: 48000, spent: 32000 },
      { name: 'Aquaculture Field Demonstrations', allocated: 42000, spent: 27500 },
      { name: 'Diving Gear & Research Field Kit', allocated: 25000, spent: 21000 },
      { name: 'Documentation & Incidentals', allocated: 10000, spent: 6000 }
    ]
  },
  KAABAG: {
    orgId: 'KAABAG',
    totalBudget: 80000,
    spent: 49000,
    remaining: 31000,
    utilizationRate: 61.2,
    liquidatedCount: 3,
    pendingLiquidationCount: 1,
    categories: [
      { name: 'Mental Health Caravans & Training', allocated: 35000, spent: 24000 },
      { name: 'Crisis Support & Emergency Packages', allocated: 25000, spent: 16000 },
      { name: 'Wellness Center Logistics', allocated: 12000, spent: 6000 },
      { name: 'Volunteer Tokens & Supplies', allocated: 8000, spent: 3000 }
    ]
  },
  TME: {
    orgId: 'TME',
    totalBudget: 90000,
    spent: 57000,
    remaining: 33000,
    utilizationRate: 63.3,
    liquidatedCount: 3,
    pendingLiquidationCount: 1,
    categories: [
      { name: 'Solar Lanterns & Community Fabrication', allocated: 45000, spent: 38000 },
      { name: 'Shop Safety Tools & Consumables', allocated: 25000, spent: 12000 },
      { name: 'Robotics & Automation Kits', allocated: 12000, spent: 5000 },
      { name: 'Operating Logistics', allocated: 8000, spent: 2000 }
    ]
  },
  SenSo: {
    orgId: 'SenSo',
    totalBudget: 85000,
    spent: 42000,
    remaining: 43000,
    utilizationRate: 49.4,
    liquidatedCount: 2,
    pendingLiquidationCount: 2,
    categories: [
      { name: 'Cultural Festivals & Stage Props', allocated: 45000, spent: 28000 },
      { name: 'Wardrobe, Costumes & Sound Rental', allocated: 22000, spent: 9000 },
      { name: 'Visual Arts Displays & Materials', allocated: 12000, spent: 3500 },
      { name: 'Rehearsal Sustenance', allocated: 6000, spent: 1500 }
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
  // ==========================================
  // CENTRAL / NON-COLLEGE ORGANIZATIONS
  // ==========================================

  // 1. SSC (Supreme Student Council)
  {
    id: 'usr-ssc-org',
    name: 'SSC Organization User',
    firstName: 'SSC',
    lastName: 'Organization User',
    email: 'ssc.org@msunaawan.edu.ph',
    avatar: 'SC',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    orgId: 'SSC',
    orgName: 'Supreme Student Council',
    organizationType: 'CENTRAL',
    password: 'Password@2026',
    lastActive: 'Active Now',
    createdDate: '2026-01-05'
  },
  {
    id: 'usr-ssc-adv',
    name: 'SSC Adviser',
    firstName: 'SSC',
    lastName: 'Adviser',
    email: 'ssc.adviser@msunaawan.edu.ph',
    avatar: 'SA',
    isActive: true,
    role: 'ROLE_ADVISER',
    orgId: 'SSC',
    orgName: 'Supreme Student Council',
    organizationType: 'CENTRAL',
    password: 'Password@2026',
    lastActive: '20 mins ago',
    createdDate: '2025-09-01'
  },

  // 2. KAABAG (Ang Kaabag)
  {
    id: 'usr-kaabag-org',
    name: 'KAABAG Organization User',
    firstName: 'KAABAG',
    lastName: 'Organization User',
    email: 'kaabag.org@msunaawan.edu.ph',
    avatar: 'KB',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    orgId: 'KAABAG',
    orgName: 'Ang Kaabag',
    organizationType: 'CENTRAL',
    password: 'Password@2026',
    lastActive: '15 mins ago',
    createdDate: '2026-01-10'
  },
  {
    id: 'usr-kaabag-adv',
    name: 'KAABAG Adviser',
    firstName: 'KAABAG',
    lastName: 'Adviser',
    email: 'kaabag.adviser@msunaawan.edu.ph',
    avatar: 'KA',
    isActive: true,
    role: 'ROLE_ADVISER',
    orgId: 'KAABAG',
    orgName: 'Ang Kaabag',
    organizationType: 'CENTRAL',
    password: 'Password@2026',
    lastActive: '1 hour ago',
    createdDate: '2025-09-01'
  },

  // 3. TME (The Marine Echo)
  {
    id: 'usr-tme-org',
    name: 'TME Organization User',
    firstName: 'TME',
    lastName: 'Organization User',
    email: 'tme.org@msunaawan.edu.ph',
    avatar: 'TM',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    orgId: 'TME',
    orgName: 'The Marine Echo',
    organizationType: 'CENTRAL',
    password: 'Password@2026',
    lastActive: '25 mins ago',
    createdDate: '2026-01-12'
  },
  {
    id: 'usr-tme-adv',
    name: 'TME Adviser',
    firstName: 'TME',
    lastName: 'Adviser',
    email: 'tme.adviser@msunaawan.edu.ph',
    avatar: 'TA',
    isActive: true,
    role: 'ROLE_ADVISER',
    orgId: 'TME',
    orgName: 'The Marine Echo',
    organizationType: 'CENTRAL',
    password: 'Password@2026',
    lastActive: '45 mins ago',
    createdDate: '2025-09-01'
  },

  // 4. SENSSO (Senior Student Society)
  {
    id: 'usr-sensso-org',
    name: 'SENSSO Organization User',
    firstName: 'SENSSO',
    lastName: 'Organization User',
    email: 'sensso.org@msunaawan.edu.ph',
    avatar: 'SO',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    orgId: 'SENSSO',
    orgName: 'Senior Student Society (SENSSO)',
    organizationType: 'CENTRAL',
    password: 'Password@2026',
    lastActive: '30 mins ago',
    createdDate: '2026-01-11'
  },
  {
    id: 'usr-sensso-adv',
    name: 'SENSSO Adviser',
    firstName: 'SENSSO',
    lastName: 'Adviser',
    email: 'sensso.adviser@msunaawan.edu.ph',
    avatar: 'SA',
    isActive: true,
    role: 'ROLE_ADVISER',
    orgId: 'SENSSO',
    orgName: 'Senior Student Society (SENSSO)',
    organizationType: 'CENTRAL',
    password: 'Password@2026',
    lastActive: '2 hours ago',
    createdDate: '2025-09-01'
  },

  // ==========================================
  // COLLEGE ORGANIZATIONS (With assigned Deans)
  // ==========================================

  // 5. CBIT (College of Business and Information Technology)
  {
    id: 'usr-cbit-kian',
    name: 'Kian Estenzo',
    firstName: 'Kian',
    lastName: 'Estenzo',
    email: 'kian.estenzo@msunaawan.edu.ph',
    avatar: 'KE',
    isActive: true,
    role: 'Org President',
    orgId: 'CBIT',
    orgName: 'College of Business and Information Technology',
    collegeId: 'CBIT',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: 'Active Now',
    createdDate: '2026-01-08',
    idNumber: '2023-0142',
    bio: 'President of the College of Business and Information Technology Student Council.'
  },
  {
    id: 'usr-cbit-org',
    name: 'CBIT Organization User',
    firstName: 'CBIT',
    lastName: 'Organization User',
    email: 'cbit.org@msunaawan.edu.ph',
    avatar: 'CB',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    orgId: 'CBIT',
    orgName: 'College of Business and Information Technology',
    collegeId: 'CBIT',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: 'Active Now',
    createdDate: '2026-01-08'
  },
  {
    id: 'usr-cbit-adv',
    name: 'CBIT Adviser',
    firstName: 'CBIT',
    lastName: 'Adviser',
    email: 'cbit.adviser@msunaawan.edu.ph',
    avatar: 'CA',
    isActive: true,
    role: 'ROLE_ADVISER',
    orgId: 'CBIT',
    orgName: 'College of Business and Information Technology',
    collegeId: 'CBIT',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '15 mins ago',
    createdDate: '2025-09-01'
  },
  {
    id: 'usr-cbit-dean',
    name: 'CBIT Dean',
    firstName: 'CBIT',
    lastName: 'Dean',
    email: 'cbit.dean@msunaawan.edu.ph',
    avatar: 'CD',
    isActive: true,
    role: 'ROLE_DEAN',
    orgId: 'CBIT',
    orgName: 'College of Business and Information Technology',
    collegeId: 'CBIT',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '1 hour ago',
    createdDate: '2025-08-20'
  },

  // 6. CELS (College of Environmental and Life Sciences)
  {
    id: 'usr-cels-org',
    name: 'CELS Organization User',
    firstName: 'CELS',
    lastName: 'Organization User',
    email: 'cels.org@msunaawan.edu.ph',
    avatar: 'CL',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    orgId: 'CELS',
    orgName: 'College of Environmental and Life Sciences',
    collegeId: 'CELS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '30 mins ago',
    createdDate: '2026-01-08'
  },
  {
    id: 'usr-cels-adv',
    name: 'CELS Adviser',
    firstName: 'CELS',
    lastName: 'Adviser',
    email: 'cels.adviser@msunaawan.edu.ph',
    avatar: 'EA',
    isActive: true,
    role: 'ROLE_ADVISER',
    orgId: 'CELS',
    orgName: 'College of Environmental and Life Sciences',
    collegeId: 'CELS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '50 mins ago',
    createdDate: '2025-09-01'
  },
  {
    id: 'usr-cels-dean',
    name: 'CELS Dean',
    firstName: 'CELS',
    lastName: 'Dean',
    email: 'cels.dean@msunaawan.edu.ph',
    avatar: 'ED',
    isActive: true,
    role: 'ROLE_DEAN',
    orgId: 'CELS',
    orgName: 'College of Environmental and Life Sciences',
    collegeId: 'CELS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '2 hours ago',
    createdDate: '2025-08-20'
  },

  // 7. CFMS (College of Fisheries and Marine Sciences)
  {
    id: 'usr-cfms-org',
    name: 'CFMS Organization User',
    firstName: 'CFMS',
    lastName: 'Organization User',
    email: 'cfms.org@msunaawan.edu.ph',
    avatar: 'CF',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    orgId: 'CFMS',
    orgName: 'College of Fisheries and Marine Sciences',
    collegeId: 'CFMS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '40 mins ago',
    createdDate: '2026-01-08'
  },
  {
    id: 'usr-cfms-adv',
    name: 'CFMS Adviser',
    firstName: 'CFMS',
    lastName: 'Adviser',
    email: 'cfms.adviser@msunaawan.edu.ph',
    avatar: 'FA',
    isActive: true,
    role: 'ROLE_ADVISER',
    orgId: 'CFMS',
    orgName: 'College of Fisheries and Marine Sciences',
    collegeId: 'CFMS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '1 hour ago',
    createdDate: '2025-09-01'
  },
  {
    id: 'usr-cfms-dean',
    name: 'CFMS Dean',
    firstName: 'CFMS',
    lastName: 'Dean',
    email: 'cfms.dean@msunaawan.edu.ph',
    avatar: 'FD',
    isActive: true,
    role: 'ROLE_DEAN',
    orgId: 'CFMS',
    orgName: 'College of Fisheries and Marine Sciences',
    collegeId: 'CFMS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '2 hours ago',
    createdDate: '2025-08-20'
  },

  // 8. CESS (College of Education and Social Sciences)
  {
    id: 'usr-cess-org',
    name: 'CESS Organization User',
    firstName: 'CESS',
    lastName: 'Organization User',
    email: 'cess.org@msunaawan.edu.ph',
    avatar: 'CE',
    isActive: true,
    role: 'ROLE_ORGANIZATION',
    orgId: 'CESS',
    orgName: 'College of Education and Social Sciences',
    collegeId: 'CESS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '10 mins ago',
    createdDate: '2026-01-08'
  },
  {
    id: 'usr-cess-adv',
    name: 'CESS Adviser',
    firstName: 'CESS',
    lastName: 'Adviser',
    email: 'cess.adviser@msunaawan.edu.ph',
    avatar: 'EA',
    isActive: true,
    role: 'ROLE_ADVISER',
    orgId: 'CESS',
    orgName: 'College of Education and Social Sciences',
    collegeId: 'CESS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '1 hour ago',
    createdDate: '2025-09-01'
  },
  {
    id: 'usr-cess-dean',
    name: 'CESS Dean',
    firstName: 'CESS',
    lastName: 'Dean',
    email: 'cess.dean@msunaawan.edu.ph',
    avatar: 'ED',
    isActive: true,
    role: 'ROLE_DEAN',
    orgId: 'CESS',
    orgName: 'College of Education and Social Sciences',
    collegeId: 'CESS',
    organizationType: 'COLLEGE',
    password: 'Password@2026',
    lastActive: '3 hours ago',
    createdDate: '2025-08-20'
  },

  // ==========================================
  // CENTRAL INSTITUTIONAL OFFICES & ADMIN
  // ==========================================

  // 9. OSD Officer
  {
    id: 'usr-osd-01',
    name: 'OSD Officer',
    firstName: 'OSD',
    lastName: 'Officer',
    email: 'osd@msunaawan.edu.ph',
    avatar: 'OS',
    isActive: true,
    role: 'ROLE_OSD',
    orgId: 'OSD',
    orgName: 'Office of Student Development',
    password: 'Password@2026',
    lastActive: '5 mins ago',
    createdDate: '2025-08-15'
  },
  {
    id: 'usr-osd-director',
    name: 'Dr. Roberto C. Perez (OSD Director)',
    firstName: 'Roberto',
    lastName: 'Perez',
    email: 'osd.director@msunaawan.edu.ph',
    avatar: 'OD',
    isActive: true,
    role: 'ROLE_OSD',
    orgId: 'OSD',
    orgName: 'Office of Student Development',
    password: 'Password@2026',
    lastActive: '10 mins ago',
    createdDate: '2025-08-15'
  },

  // 10. OVCSAS Officer
  {
    id: 'usr-ovcsas-01',
    name: 'OVCSAS Officer',
    firstName: 'OVCSAS',
    lastName: 'Officer',
    email: 'ovcsas@msunaawan.edu.ph',
    avatar: 'OV',
    isActive: true,
    role: 'ROLE_OVCSAS',
    orgId: 'OVCSAS',
    orgName: 'Office of the Vice Chancellor for Student Affairs and Services',
    password: 'Password@2026',
    lastActive: '12 mins ago',
    createdDate: '2025-08-15'
  },

  // 11. Office of the Chancellor
  {
    id: 'usr-oc-01',
    name: 'Office of the Chancellor',
    firstName: 'Office of the',
    lastName: 'Chancellor',
    email: 'chancellor@msunaawan.edu.ph',
    avatar: 'OC',
    isActive: true,
    role: 'ROLE_OC',
    orgId: 'OC',
    orgName: 'Office of the Chancellor',
    password: 'Password@2026',
    lastActive: '2 mins ago',
    createdDate: '2025-08-01'
  },

  // 12. System Administrator
  {
    id: 'usr-admin-01',
    name: 'System Administrator',
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@msunaawan.edu.ph',
    avatar: 'AD',
    isActive: true,
    role: 'ROLE_ADMIN',
    orgId: 'ADMIN',
    orgName: 'System Administration Division',
    password: 'Password@2026',
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
    createdBy: 'System Administrator (OSA)',
    allocatedBudget: 550000,
    totalActivitiesCount: 16,
    approvedCount: 0,
    pendingCount: 16,
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
    totalActivitiesCount: 22,
    approvedCount: 22,
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
    totalActivitiesCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    description: 'Action plan folder for student organization submissions and budgets for Fiscal Year 2027.'
  }
];
