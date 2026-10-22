export type ModuleType = 'activity_management' | 'approval_management' | 'system_admin';

export type SidebarTab = 'dashboard' | 'action_plan' | 'activity' | 'financial' | 'organizations';

export type AdminTab = 'dashboard' | 'accounts' | 'action_plan' | 'organizations';

export type ApprovalTab = 'dashboard' | 'plans_approvals' | 'financial' | 'organizations';

export type OrgId = 'SSC' | 'CBIT' | 'CELS' | 'CESS' | 'CMFS' | 'CFMS' | 'KAABAG' | 'TME' | 'SenSo' | 'SENSSO' | 'OSD' | 'OVCSAS' | 'OC' | 'ADMIN' | 'ALL' | string;

export type CalendarViewMode = 'Month' | 'Week' | 'Day' | string;

export type ActivityStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'FOR_ADVISER_REVIEW'
  | 'FOR_DEAN_REVIEW'
  | 'FOR_OSD_APPROVAL'
  | 'FOR_OVCSAS_APPROVAL'
  | 'FOR_OC_FINAL_APPROVAL'
  | 'DEFERRED'
  | 'DEFERRED FOR REVISION'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'COMPLETED'
  | 'Approved' 
  | 'Pending' 
  | string;

export type UserRole = 
  | 'ROLE_ORGANIZATION'
  | 'ROLE_ADVISER'
  | 'ROLE_DEAN'
  | 'ROLE_OSD'
  | 'ROLE_OVCSAS'
  | 'ROLE_OC'
  | 'ROLE_ADMIN'
  | 'Org President'
  | 'Org Treasurer'
  | 'Faculty Adviser'
  | 'Dean / College Reviewer'
  | 'OSD Officer'
  | 'OSD Director'
  | 'OVCSAS Officer'
  | 'Office of the Chancellor'
  | 'System Administrator'
  | string;

export function formatUserRole(
  roleOrUser?: string | {
    role?: string;
    orgId?: string;
    orgName?: string;
    parentOrg?: string;
    subOrg?: string;
    displayRole?: string;
    customRole?: string;
    selectedRole?: string;
  },
  optionalOrgId?: string
): string {
  if (!roleOrUser) return 'User';

  let role = '';
  let orgId = optionalOrgId || '';

  if (typeof roleOrUser === 'object') {
    if (roleOrUser.displayRole) {
      return roleOrUser.displayRole;
    }
    if (roleOrUser.customRole) {
      return roleOrUser.customRole;
    }
    if (roleOrUser.selectedRole && roleOrUser.selectedRole !== 'Others') {
      return roleOrUser.selectedRole;
    }
    role = roleOrUser.role || '';
    if (!orgId) orgId = roleOrUser.orgId || roleOrUser.orgName || '';
  } else {
    role = roleOrUser;
  }

  // Normalize orgId if it contains full name
  const orgLower = (orgId || '').toLowerCase();
  if (orgLower.includes('supreme student council') || orgLower === 'ssc') {
    orgId = 'SSC';
  } else if (orgLower.includes('business and information') || orgLower === 'cbit') {
    orgId = 'CBIT';
  } else if (orgLower.includes('education and social') || orgLower === 'cess') {
    orgId = 'CESS';
  } else if (orgLower.includes('education, letters') || orgLower === 'cels') {
    orgId = 'CELS';
  } else if (orgLower.includes('fisheries') || orgLower === 'cfms') {
    orgId = 'CFMS';
  } else if (orgLower.includes('kaabag')) {
    orgId = 'KAABAG';
  }

  const trimmed = role.trim();
  switch (trimmed) {
    case 'ROLE_ADMIN':
    case 'Role_Admin':
    case 'role_admin':
    case 'System Administrator':
    case 'System Admin':
      return 'System Administrator';
    case 'ROLE_ORGANIZATION':
    case 'Role_Organization':
    case 'Student Organization':
    case 'Student Organization Officer':
      if (typeof roleOrUser === 'object' && roleOrUser.subOrg && roleOrUser.parentOrg && roleOrUser.subOrg !== roleOrUser.parentOrg) {
        return 'Mayor';
      }
      if (orgId && orgId !== 'ALL' && orgId !== 'ADMIN' && orgId !== 'OSA' && orgId !== 'COLLEGE') {
        if (orgId === 'CBIT' || orgId === 'CELS' || orgId === 'CESS' || orgId === 'CFMS') {
          return 'Governor';
        }
        if (orgId === 'SSC' || orgId === 'KAABAG' || orgId === 'SENSSO') {
          return 'President';
        }
        return `${orgId} Officer`;
      }
      return 'Student Organization Officer';
    case 'ROLE_ADVISER':
    case 'Role_Adviser':
    case 'Faculty Adviser':
      if (orgId && orgId !== 'ALL' && orgId !== 'ADMIN' && orgId !== 'OSA') {
        return `${orgId} Faculty Adviser`;
      }
      return 'Faculty Adviser';
    case 'ROLE_DEAN':
    case 'Role_Dean':
    case 'College Dean':
    case 'Dean / College Reviewer':
      if (orgId && orgId !== 'ALL' && orgId !== 'ADMIN' && orgId !== 'OSA') {
        return `${orgId} College Dean`;
      }
      return 'College Dean';
    case 'ROLE_OSD':
    case 'Role_Osd':
    case 'OSD Officer':
      return 'OSD Officer';
    case 'OSD Director':
      return 'OSD Director';
    case 'ROLE_OVCSAS':
    case 'Role_Ovcsas':
    case 'OVCSAS Officer':
      return 'OVCSAS Officer';
    case 'ROLE_OC':
    case 'Role_Oc':
    case 'Office of the Chancellor':
      return 'Office of the Chancellor';
    case 'Org President':
      if (orgId && orgId !== 'ALL' && orgId !== 'ADMIN' && orgId !== 'OSA' && orgId !== 'COLLEGE') {
        return `${orgId} President`;
      }
      return 'Org President';
    case 'Org Treasurer':
      if (orgId && orgId !== 'ALL' && orgId !== 'ADMIN' && orgId !== 'OSA' && orgId !== 'COLLEGE') {
        return `${orgId} Treasurer`;
      }
      return 'Org Treasurer';
    default:
      if (trimmed.startsWith('ROLE_') || trimmed.startsWith('Role_')) {
        const cleaned = trimmed.substring(5).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        if (cleaned.toLowerCase() === 'organization' && orgId && orgId !== 'ALL' && orgId !== 'ADMIN' && orgId !== 'OSA') {
          return `${orgId} Officer`;
        }
        return cleaned;
      }
      return trimmed;
  }
}

export type OrganizationType = 'CENTRAL' | 'COLLEGE';

export interface WorkflowHistoryRecord {
  id: string;
  stageId: number;
  stageName: string;
  action: 'SUBMIT' | 'APPROVE' | 'ENDORSE' | 'DEFER' | 'RESUBMIT' | 'FINAL_APPROVE';
  actorId: string;
  actorName: string;
  actorRole: string;
  remark?: string;
  timestamp: string;
}

export interface UserAccount {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  isActive: boolean;
  role: UserRole;
  orgId?: string;
  orgName?: string;
  parentOrg?: string;
  subOrg?: string;
  actualOrg?: string;
  selectedRole?: string;
  customRole?: string;
  displayRole?: string;
  collegeId?: string;
  organizationType?: OrganizationType;
  password?: string;
  lastActive?: string;
  createdDate?: string;
  idNumber?: string;
  bio?: string;
}

export interface ActionPlanFolder {
  id: string;
  fiscalYear: string;
  title: string;
  theme?: string;
  status: 'Open' | 'Locked' | string;
  submissionDeadline?: string;
  createdAt: string;
  createdBy?: string;
  allocatedBudget?: number;
  totalActivitiesCount: number;
  approvedCount: number;
  pendingCount: number;
  description?: string;
}

export interface OrganizationAttachment {
  id: string;
  title: string;
  type: string;
  fileSize: string;
  uploadDate: string;
}

export interface OrganizationMember {
  id: string;
  fullName: string;
  contactNumber?: string;
  email?: string;
  role: string;
}

export interface StudentOrganization {
  id: OrgId;
  name: string;
  acronym: string;
  nature: string;
  status: 'Active' | 'Inactive' | string;
  registeredNumber: string;
  dateOfApplication?: string;
  memberCount: number;
  attachmentCount: number;
  color: string;
  description: string;
  president: string;
  facultyAdviser: string;
  officeLocation: string;
  objectives?: string[];
  attachments?: OrganizationAttachment[];
  membersList?: OrganizationMember[];
}

export interface TimelineStep {
  id: number;
  title: string;
  subtitle?: string;
  role?: string;
  status: 'completed' | 'in_progress' | 'pending';
  updatedAt?: string;
  actionRequired?: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  responsiblePerson: string;
}

export interface ParticipantItem {
  id: string;
  group: string;
  count: number;
  description?: string;
}

export interface BudgetItem {
  id: string;
  item: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  source: string;
}

export interface VenueRequirementItem {
  id: string;
  venueName: string;
  datesNeeded: string;
  specialRequests?: string;
}

export interface FacilityRequirementItem {
  id: string;
  facility: string;
  quantity: number;
  remarks?: string;
}

export interface ActivityDesignForm {
  activityTitle?: string;
  controlNumber?: string;
  officeCode?: string;
  datePrepared?: string;
  unitCollege?: string;
  venue?: string;
  department?: string;
  proposedBudget?: number;
  resultCode?: string;
  budgetSource?: string;
  dateImplementation?: string;
  includedInPdsPlan?: string;
  includedInPdsYear?: string;
  includedInPdsStatus?: string;
  emailAddress?: string;
  durationDays?: string | number;

  rationale?: string;
  objectives?: string;
  objectivesList?: string[];
  expectedOutput?: string;
  expectedOutputsList?: string[];

  programOfActivitiesTitle?: string;
  programOfActivitiesDate?: string;
  scheduleItems?: any[];
  participants?: any[];
  participantsText?: string;
  budgetaryRequirements?: any[];

  activityType?: string;
  venueRows?: any[];
  campusFacilities?: any[];
  sdgsAchieved?: string[];
  attachmentFiles?: string[];
  taggedColleges?: string[];
  signatories?: any;

  submittedBy?: string;
  submittedByRole?: string;
  submittedDate?: string;
  isCompleted?: boolean;
}

export interface AccomplishmentRow {
  id?: string;
  objectiveNo?: number;
  objective?: string;
  expectedOutput: string;
  actualAccomplishment: string;
  rating: string; // '4' | '3' | '2' | '1' or '4 - Fully Achieved'
}

export interface ActivityAccomplishmentForm {
  activityTitle?: string;
  controlNumber?: string;
  officeCode?: string;
  datePrepared?: string;
  unitCollege?: string;
  venue?: string;
  department?: string;
  proposedBudget?: number;
  actualBudget?: number;
  resultCode?: string;
  budgetSource?: string;
  dateOfImplementation?: string;
  pdbYear?: string;
  pdbIncluded?: boolean;
  emailAddress?: string;
  durationDays?: number | string;
  objectives?: string[];
  narrativeReport?: string;

  accomplishmentRows?: AccomplishmentRow[];
  photoProofDriveLink?: string;
  photoFiles?: string[];

  summaryOfEvaluations?: string;
  remarksComments?: string;
  nextStepsPlanOfAction?: string;
  attachments?: string[];

  // Official Signatories
  preparedByName?: string;
  preparedByTitle?: string;
  reviewedByName?: string;
  reviewedByTitle?: string;
  recordedByName?: string;
  recordedByTitle?: string;

  // Required Official Verification Documents
  scannedDadFile?: string;
  specialOrderFile?: string;
  attendanceFile?: string;
  programFlowFile?: string;

  actualAttendance?: number;
  attendanceSummary?: string;
  keyOutcomes?: string;
  financialLiquidationSummary?: string;
  challengesAndRecommendations?: string;
  submittedBy?: string;
  submittedDate?: string;
  isCompleted?: boolean;
}

export interface Activity {
  id: string;
  title: string;
  programActivity?: string;
  orgId: OrgId;
  fiscalYear: string;
  timeframe?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  description: string;
  strategicObjectives?: string;
  expectedOutput?: string;
  office?: string;
  lineItemBudget?: string;
  amount?: number;
  budget: number;
  totalBudget?: number;
  fundSource?: string;
  personAssigned?: string;
  targetParticipants?: number;
  status: ActivityStatus;
  strategicPillar?: string;
  proposedBy: string;
  submittedDate: string;
  approvalStage?: string;
  kpiOutcome?: string;
  workflowStatus?: string;
  timeline?: TimelineStep[];
  designForm?: ActivityDesignForm;
  accomplishmentForm?: ActivityAccomplishmentForm;
  revisionNotes?: string;
  deferReason?: string;
  deferredBy?: string;
  deferredAt?: string;
  workflowHistory?: WorkflowHistoryRecord[];
  adviserName?: string;
  deanName?: string;
  collegeId?: string;
  organizationType?: OrganizationType;
  isActionPlanItem?: boolean;
  source?: string;
}

export interface FinancialCategory {
  name: string;
  allocated: number;
  spent: number;
}

export interface FinancialSummary {
  orgId: string;
  totalBudget: number;
  spent: number;
  remaining: number;
  utilizationRate: number;
  liquidatedCount: number;
  pendingLiquidationCount: number;
  categories: FinancialCategory[];
}

export interface NormanPrincipleInfo {
  name: string;
  definition: string;
  implementationInApp: string[];
}

export interface AppNotification {
  id: string;
  userId?: string;
  targetOrgId?: string;
  targetRole?: UserRole | string;
  activityId?: string;
  activityTitle?: string;
  type: 'APPROVAL' | 'SUBMISSION' | 'DEFERRAL' | 'SYSTEM' | 'EMAIL';
  title: string;
  message: string;
  actorName?: string;
  actorRole?: string;
  stageName?: string;
  timestamp: string;
  isRead: boolean;
  emailId?: string;
  gmailComposeUrl?: string;
  deliveryStatus?: 'DELIVERED' | 'SENT' | 'SIMULATED';
}

export interface SentEmail {
  id: string;
  toEmail: string;
  toName: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  previewText: string;
  bodyHtml?: string;
  activityId?: string;
  activityTitle?: string;
  stageName?: string;
  approverName?: string;
  approverRole?: string;
  remarks?: string;
  timestamp: string;
  isRead: boolean;
  statusBadge?: string;
  gmailComposeUrl?: string;
  deliveryMethod?: 'GMAIL_SMTP' | 'WEB_GMAIL' | 'SIMULATED';
  deliveryStatus?: 'DELIVERED' | 'SENT' | 'SIMULATED';
}

