<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Activity, OrgId, UserAccount, ActivityApprovalStatus } from '../types';
import { 
  ORGANIZATIONS, 
  getOrgTheme,
  DEFAULT_MSUN_ACTION_PLAN_TEMPLATE,
  isCollegeOrg
} from '../data/initialData';
import { isSameOrg } from '../utils/organizationUtils';
import OrgBadge from './OrgBadge.vue';
import ActionPlanEditor from './ActionPlanEditor.vue';
import ActivityReviewModal from './ActivityReviewModal.vue';
import { 
  Building2, 
  FileSpreadsheet, 
  Table, 
  LayoutGrid, 
  Clock, 
  Coins, 
  Eye, 
  CheckCircle2,
  Plus,
  Edit3,
  AlertTriangle,
  XCircle,
  X,
  Sparkles,
  ShieldCheck,
  Check,
  Info,
  Copy,
  Archive,
  ArrowRight,
  CornerDownRight,
  History,
  FileCheck,
  AlertCircle
} from 'lucide-vue-next';
import { exportActionPlanToExcel, ActionPlanReportType } from '../utils/actionPlanReports';
import { apiService } from '../services/api';
import { saveActivityToDb, batchSaveActivitiesToDb } from '../services/db';
import { getOptionLabelsByCategory } from '../services/optionsService';
import QuickAddOptionButton from './QuickAddOptionButton.vue';

const props = withDefaults(
  defineProps<{
    activities: Activity[];
    selectedOrgFilter?: OrgId | 'ALL';
    currentUser?: UserAccount | null;
    fiscalYear?: string;
  }>(),
  {
    selectedOrgFilter: 'CBIT',
    fiscalYear: 'Fiscal Year 2027'
  }
);

const emit = defineEmits<{
  (e: 'addActivityClick'): void;
  (e: 'importClick', fiscalYear?: string): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'toggleStatus', activityId: string): void;
  (e: 'selectOrgFilter', org: OrgId | 'ALL'): void;
  (e: 'updateActivity', updated: Activity): void;
  (e: 'batchUpdateActivities', activities: Activity[]): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

// Editor and Review Modal States
const isEditorOpen = ref(false);
const isReviewModalOpen = ref(false);
const selectedActivityForReview = ref<Activity | null>(null);

// User's default organization based on login
const userCouncilOrg = computed<OrgId | null>(() => {
  if (props.currentUser?.orgId && props.currentUser.orgId !== 'ADMIN' && props.currentUser.orgId !== 'COLLEGE') {
    return props.currentUser.orgId as OrgId;
  }
  return null;
});

// Check if current user is an organization officer
const isOrgOfficer = computed(() => {
  const role = props.currentUser?.role;
  return role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'Org Treasurer';
});

const getOrgName = (orgId?: OrgId | string | null): string => {
  if (!orgId) return '';
  const org = ORGANIZATIONS.find(o => isSameOrg(o.id, orgId) || isSameOrg(o.acronym, orgId));
  return org ? org.name : orgId;
};

// Currently viewed organization (strictly user's council for student orgs)
const viewedOrg = ref<OrgId | 'ALL'>(
  userCouncilOrg.value || (props.selectedOrgFilter === 'ALL' ? 'ALL' : (props.selectedOrgFilter || 'CBIT'))
);

// Keep in sync with parent prop if not restricted to student org
watch(
  () => [props.selectedOrgFilter, userCouncilOrg.value],
  ([newVal, orgVal]) => {
    if (orgVal) {
      viewedOrg.value = orgVal;
    } else if (newVal) {
      viewedOrg.value = newVal;
    }
  },
  { immediate: true }
);

// Target Fiscal Year (defaults to Fiscal Year 2027 across all councils, synced with parent prop)
const selectedFiscalYear = ref<string>(props.fiscalYear || 'Fiscal Year 2027');
const dynamicFiscalYears = getOptionLabelsByCategory('fiscal_year');
const allFiscalYearsList = computed(() => {
  const base = ['All Fiscal Years', 'Fiscal Year 2027', 'Fiscal Year 2026', 'Fiscal Year 2025', 'Fiscal Year 2028'];
  return Array.from(new Set(['All Fiscal Years', ...dynamicFiscalYears.value, ...base]));
});

watch(
  () => props.fiscalYear,
  (newFy) => {
    if (newFy) {
      selectedFiscalYear.value = newFy;
    }
  }
);

const handleSelectOrg = (org: OrgId | 'ALL') => {
  viewedOrg.value = org;
  emit('selectOrgFilter', org);
};

// Official Header Text Mapping (matches institutional format in image)
const getOfficialOrgHeader = (orgId: OrgId | 'ALL'): string => {
  switch (orgId) {
    case 'SSC':
      return 'OVCSAS|OSD: SUPREME STUDENT COUNCIL (SSC)';
    case 'CBIT':
    case 'CBIT SEC':
      return 'OVCSAS|OSD: COLLEGE OF BUSINESS AND INFORMATION TECHNOLOGY STUDENT EXECUTIVE COUNCIL (CBIT SEC)';
    case 'CELS':
    case 'ELSSA':
      return 'OVCSAS|OSD: ENVIRONMENT AND LIFE SCIENCES STUDENT ALLIANCE (ELSSA)';
    case 'CESS':
    case 'CESS SO':
      return 'OVCSAS|OSD: COLLEGE OF EDUCATION AND SOCIAL SCIENCES STUDENT ORGANIZATION (CESS SO)';
    case 'CFMS':
    case 'CMFS':
    case 'FIMSSO':
      return 'OVCSAS|OSD: FISHERIES AND MARINE SCIENCE STUDENT ORGANIZATION (FIMSSO)';
    case 'KAABAG':
      return 'OVCSAS|OSD: KAABAG STUDENT PEER FACILITATORS (KAABAG)';
    case 'SenSo':
    case 'SENSSO':
      return 'OVCSAS|OSD: SENIOR STUDENTS\' SOCIETY (SenSSo)';
    default:
      return 'OVCSAS|OSD: CONSOLIDATED INSTITUTIONAL ACTION PLANS - ALL ACCREDITED COUNCILS';
  }
};

// Helpers to extract & fall back for table fields
const getActivityMonth = (act: Activity): string => {
  if (act.timeframeMonth) return act.timeframeMonth;
  if (!act.startDate) return 'Anytime';
  const d = new Date(act.startDate);
  if (isNaN(d.getTime())) return 'Anytime';
  return d.toLocaleString('en-US', { month: 'long' });
};

const getActivityWeek = (act: Activity): string => {
  if (act.timeframeWeek) return act.timeframeWeek;
  if (!act.startDate) return '1st Week';
  const d = new Date(act.startDate);
  if (isNaN(d.getTime())) return '1st Week';
  const day = d.getDate();
  if (day <= 7) return '1st Week';
  if (day <= 14) return '2nd Week';
  if (day <= 21) return '3rd Week';
  return '4th Week';
};

const getActivityTimeframe = (act: Activity): string => {
  if (act.timeframe) return act.timeframe;
  if (act.timeframeMonth && act.timeframeWeek) {
    return `${act.timeframeMonth} (${act.timeframeWeek})`;
  }
  if (!act.startDate) return 'Anytime in Semester';
  const d = new Date(act.startDate);
  if (isNaN(d.getTime())) return 'Anytime in Semester';
  const monthName = d.toLocaleString('en-US', { month: 'long' });
  return `Anytime in ${monthName}`;
};

const getActivityProgramsAndActivities = (act: Activity): string => {
  return act.programActivity || act.title;
};

const getActivityStrategicObjectives = (act: Activity): string => {
  return act.strategicObjectives || act.description || 'Organize leadership training and student development activities.';
};

const getActivityExpectedOutput = (act: Activity): string => {
  return act.expectedOutput || act.kpiOutcome || 'Student participation and documentation of activity reports.';
};

const getActivityOffice = (act: Activity): string => {
  return act.office || act.orgId;
};

const getActivityLineItemBudget = (act: Activity): string => {
  return act.lineItemBudget || 'Design, materials, logistics, and faculty snacks.';
};

const getActivityAmount = (act: Activity): number => {
  return act.amount ?? act.budget ?? 0;
};

const getActivityTotalBudget = (act: Activity): number => {
  return act.totalBudget ?? act.budget ?? 0;
};

const getActivityFundSource = (act: Activity): string => {
  return act.fundSource || `${act.orgId}-SEC Fund`;
};

const getActivityPersonAssigned = (act: Activity): string => {
  return act.personAssigned || act.proposedBy || `${act.orgId}-SEC Officers`;
};

// Activity Approval Status badge helper: in Action Plan, only Approved, Rejected, and Draft exist
const getActivityApprovalStatus = (act: Activity): ActivityApprovalStatus => {
  if (act.status === 'Rejected' || act.approvalStatus === 'Rejected') return 'Rejected';
  if (act.status === 'Approved' || act.approvalStatus === 'Fully Approved' || act.workflowStatus === 'COMPLETED') return 'Fully Approved';
  return 'Draft';
};

const getStatusBadgeConfig = (status: ActivityApprovalStatus) => {
  switch (status) {
    case 'Draft':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Draft' };
    case 'Fully Approved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', label: 'Approved' };
    case 'Rejected':
      return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', label: 'Rejected' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: status };
  }
};

// Currency formatter for Philippine Peso
const formatCurrency = (val: number): string => {
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Filtered activities matching selected organization and fiscal year
const filteredTableActivities = computed(() => {
  return props.activities.filter((act) => {
    // 1. Belongs to the Action Plan
    const isActionPlanRecord = Boolean(
      act.isActionPlanItem || 
      act.source === 'ACTION_PLAN' || 
      act.status === 'Approved' || 
      act.status === 'APPROVED' || 
      act.workflowStatus === 'COMPLETED' ||
      act.approvalStatus === 'Draft' ||
      act.approvalStatus === 'Pending Review' ||
      act.approvalStatus === 'Approved at Current Stage' ||
      act.approvalStatus === 'Fully Approved' ||
      act.approvalStatus === 'Deferred' ||
      act.approvalStatus === 'Rejected'
    );
    if (!isActionPlanRecord) return false;

    // 2. Match organization (using isSameOrg)
    const matchesOrg = viewedOrg.value === 'ALL' || isSameOrg(act.orgId, viewedOrg.value);
    if (!matchesOrg) return false;

    // 3. Match fiscal year
    if (selectedFiscalYear.value !== 'ALL' && selectedFiscalYear.value !== 'All Fiscal Years') {
      const fyYearNumber = selectedFiscalYear.value.replace(/\D/g, '');
      const actYearNumber = (act.fiscalYear || '').replace(/\D/g, '');
      const matchesFiscalYear = !fyYearNumber || actYearNumber === fyYearNumber || (act.startDate && act.startDate.startsWith(fyYearNumber));
      if (!matchesFiscalYear) return false;
    }

    return true;
  });
});

// Organization's activities for active fiscal year
const userOrgActivities = computed(() => {
  if (!userCouncilOrg.value) return filteredTableActivities.value;
  return props.activities.filter(a => isSameOrg(a.orgId, userCouncilOrg.value));
});

// Counts for active action plan
const draftCount = computed(() => {
  return filteredTableActivities.value.filter(a => getActivityApprovalStatus(a) === 'Draft').length;
});

const fullyApprovedCount = computed(() => {
  return filteredTableActivities.value.filter(a => getActivityApprovalStatus(a) === 'Fully Approved').length;
});

const rejectedCount = computed(() => {
  return filteredTableActivities.value.filter(a => getActivityApprovalStatus(a) === 'Rejected').length;
});

// ============================================================================
// ACTION PLAN SECTIONS: PROPOSED, APPROVED, REJECTED & HISTORICAL (No Deferred)
// ============================================================================
export type ActionPlanSection = 'proposed' | 'approved' | 'rejected' | 'historical';
const activeSection = ref<ActionPlanSection>('proposed');
const selectedHistoricalYear = ref<string>('ALL');

// Confirmation check: an activity is confirmed if isPlanConfirmed is true,
// or if pre-existing record is marked Approved/Rejected and not explicitly unconfirmed
const isActivityConfirmed = (a: Activity): boolean => {
  if (a.isPlanConfirmed === true) return true;
  if (a.isPlanConfirmed === false) return false;
  return a.status === 'Approved' || a.status === 'Rejected' || a.approvalStatus === 'Fully Approved' || a.approvalStatus === 'Rejected';
};

// 1. Proposed Plan: Proposals in draft, or unconfirmed staged proposals
const proposedActivities = computed(() => {
  return filteredTableActivities.value.filter(a => getActivityApprovalStatus(a) === 'Draft' || a.isPlanConfirmed === false);
});

// 2. Approved Plan: All approved activities for the plan
const approvedActivities = computed(() => {
  return filteredTableActivities.value.filter(a => getActivityApprovalStatus(a) === 'Fully Approved');
});

// 3. Rejected Activities: All rejected activities with reasons kept
const rejectedActivities = computed(() => {
  return filteredTableActivities.value.filter(a => getActivityApprovalStatus(a) === 'Rejected');
});

// Staged decisions waiting for "Confirm Action Plan"
const unconfirmedDecisions = computed(() => {
  return filteredTableActivities.value.filter(a => a.isPlanConfirmed === false && (a.status === 'Approved' || a.status === 'Rejected'));
});

const unconfirmedDecisionsCount = computed(() => unconfirmedDecisions.value.length);

// Historical activities: from previous fiscal years
const historicalActivities = computed(() => {
  const currentFyNumber = selectedFiscalYear.value.replace(/\D/g, '') || '2027';
  return props.activities.filter(a => {
    // Must belong to viewed organization
    const matchesOrg = viewedOrg.value === 'ALL' || isSameOrg(a.orgId, viewedOrg.value);
    if (!matchesOrg) return false;

    // Must be from an older fiscal year
    const actYearNumber = (a.fiscalYear || '').replace(/\D/g, '') || (a.startDate ? a.startDate.slice(0, 4) : '');
    const isPastYear = actYearNumber && Number(actYearNumber) < Number(currentFyNumber);

    if (selectedHistoricalYear.value !== 'ALL') {
      const histYearNumber = selectedHistoricalYear.value.replace(/\D/g, '');
      return actYearNumber === histYearNumber;
    }

    return isPastYear || a.historicalRef !== undefined || a.fiscalYear === 'Fiscal Year 2026';
  });
});

// Currently displayed activities according to active section
const currentSectionActivities = computed(() => {
  switch (activeSection.value) {
    case 'approved':
      return approvedActivities.value;
    case 'rejected':
      return rejectedActivities.value;
    case 'historical':
      return historicalActivities.value;
    case 'proposed':
    default:
      return proposedActivities.value;
  }
});

// Budget computations
const proposedBudgetTotal = computed(() => {
  return proposedActivities.value.reduce((sum, act) => sum + getActivityTotalBudget(act), 0);
});

const approvedBudgetTotal = computed(() => {
  return approvedActivities.value.reduce((sum, act) => sum + getActivityTotalBudget(act), 0);
});

// Finalization rule check: Cannot be finalized while activities remain unresolved
const hasUnresolvedActivities = computed(() => {
  return filteredTableActivities.value.some(a => {
    const status = getActivityApprovalStatus(a);
    return status === 'Pending Review' || status === 'Approved at Current Stage' || status === 'Deferred' || status === 'Draft';
  });
});

// Reuse Previous Activity ("Copy to Current Fiscal Year")
const handleCopyToCurrentFiscalYear = async (origAct: Activity) => {
  const currentFy = 'Fiscal Year 2027';
  const newActivityId = `ACT-${origAct.orgId}-${Date.now().toString().slice(-5)}`;

  const copiedActivity: Activity = {
    ...origAct,
    id: newActivityId,
    fiscalYear: currentFy,
    approvalStatus: 'Draft',
    status: 'Draft',
    approvalStageIndex: 1,
    approvalStage: 'Stage 1: Organization Submission',
    workflowStatus: 'DRAFT',
    version: 1,
    timeline: undefined,
    designForm: undefined,
    accomplishmentForm: undefined,
    approvalDecisions: [],
    workflowHistory: [],
    rejectionRemarks: undefined,
    rejectedBy: undefined,
    rejectedAt: undefined,
    deferredRemarks: undefined,
    deferReason: undefined,
    historicalRef: {
      originalFiscalYear: origAct.fiscalYear || 'Previous Fiscal Year',
      originalActivityId: origAct.id
    }
  };

  emit('updateActivity', copiedActivity);
  await saveActivityToDb(copiedActivity);

  // Switch to proposed section to see the copied activity
  activeSection.value = 'proposed';
  selectedFiscalYear.value = currentFy;

  emit(
    'showToast',
    'Activity Copied to Current Fiscal Year! 📋',
    `"${origAct.title}" is now a new Draft record for ${currentFy}. You can edit it before submitting.`,
    'success'
  );
};

// Advanced Export Handlers
const isExportingXlsx = ref(false);

const handleExportOfficialExcel = async (type: ActionPlanReportType = 'approved') => {
  try {
    isExportingXlsx.value = true;
    await exportActionPlanToExcel({
      reportType: type,
      orgName: getOrgName(viewedOrg.value),
      orgId: viewedOrg.value,
      fiscalYear: selectedFiscalYear.value,
      activities: filteredTableActivities.value
    });
    emit('showToast', 'Export Complete! 📊', `Successfully exported ${type.toUpperCase()} Action Plan spreadsheet.`, 'success');
  } catch (err) {
    console.error('Export error:', err);
    emit('showToast', 'Export Error', 'Failed to generate official spreadsheet.', 'warning');
  } finally {
    isExportingXlsx.value = false;
  }
};

// Dynamic footer label based on active screen section
const currentSectionFooterLabel = computed(() => {
  switch (activeSection.value) {
    case 'approved':
      return 'Total Approved Budget (excluding office supplies, allowances and wages):';
    case 'rejected':
      return 'Total Rejected Budget (excluding office supplies, allowances and wages):';
    case 'historical':
      return 'Total Historical Budget (excluding office supplies, allowances and wages):';
    case 'proposed':
    default:
      return 'Total Projected Budget (excluding office supplies, allowances and wages):';
  }
});

// Total budget sum for the current screen's active section (Proposed, Approved, Rejected, or Historical)
const totalAllocatedBudget = computed(() => {
  return currentSectionActivities.value.reduce((sum, act) => sum + getActivityTotalBudget(act), 0);
});

const viewMode = ref<'table' | 'cards'>(typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table');

// ============================================================================
// EDITOR & APPROVAL EVENT HANDLERS
// ============================================================================

const handleOpenEditor = () => {
  isEditorOpen.value = true;
};

const handleSaveDraftFromEditor = async (savedActivities: Activity[]) => {
  emit('batchUpdateActivities', savedActivities);
  await batchSaveActivitiesToDb(savedActivities);
  emit('showToast', 'Draft Saved! 💾', `Successfully saved ${savedActivities.length} activities as draft.`, 'success');
};

const handleSubmitApprovalFromEditor = async (submittedActivities: Activity[]) => {
  emit('batchUpdateActivities', submittedActivities);
  await batchSaveActivitiesToDb(submittedActivities);
  isEditorOpen.value = false;
  emit('showToast', 'Action Plan Submitted! 🚀', `All ${submittedActivities.length} activities submitted for approval.`, 'success');
};

const openActivityReviewModal = (act: Activity) => {
  selectedActivityForReview.value = act;
  isReviewModalOpen.value = true;
};

const handleApproveFromModal = async (activityId: string, remarks?: string) => {
  if (!props.currentUser) return;
  const target = props.activities.find(a => a.id === activityId);
  if (!target) return;

  const result = await apiService.approveActivity(target, props.currentUser, remarks);
  if (result.success && result.activity) {
    emit('updateActivity', result.activity);
    await saveActivityToDb(result.activity);
    selectedActivityForReview.value = result.activity;
    emit('showToast', 'Activity Approved! 🎉', result.message, 'success');
  } else {
    emit('showToast', 'Approval Error', result.message, 'warning');
  }
};

const handleDeferFromModal = async (activityId: string, reason: string) => {
  if (!props.currentUser) return;
  const target = props.activities.find(a => a.id === activityId);
  if (!target) return;

  const result = await apiService.deferActivity(target, props.currentUser, reason);
  if (result.success && result.activity) {
    emit('updateActivity', result.activity);
    await saveActivityToDb(result.activity);
    selectedActivityForReview.value = result.activity;
    emit('showToast', 'Activity Deferred ⚠️', `Returned to organization for revision: "${reason}"`, 'info');
  } else {
    emit('showToast', 'Deferral Error', result.message, 'warning');
  }
};

const handleRejectFromModal = async (activityId: string, remarks: string) => {
  if (!props.currentUser) return;
  const target = props.activities.find(a => a.id === activityId);
  if (!target) return;

  const result = await apiService.rejectActivity(target, props.currentUser, remarks);
  if (result.success && result.activity) {
    emit('updateActivity', result.activity);
    await saveActivityToDb(result.activity);
    selectedActivityForReview.value = result.activity;
    emit('showToast', 'Final Rejection Issued', result.message, 'warning');
  } else {
    emit('showToast', 'Rejection Error', result.message, 'warning');
  }
};

const handleResubmitFromModal = async (activityId: string, notes?: string) => {
  if (!props.currentUser) return;
  const target = props.activities.find(a => a.id === activityId);
  if (!target) return;

  const result = await apiService.resubmitActivity(target, props.currentUser, notes);
  if (result.success && result.activity) {
    emit('updateActivity', result.activity);
    await saveActivityToDb(result.activity);
    selectedActivityForReview.value = result.activity;
    emit('showToast', 'Proposal Resubmitted! 🚀', result.message, 'success');
  } else {
    emit('showToast', 'Resubmission Error', result.message, 'warning');
  }
};

const handleSetDraftFromModal = async (activityId: string) => {
  if (!props.currentUser) return;
  const target = props.activities.find(a => a.id === activityId);
  if (!target) return;

  const result = await apiService.setActivityToDraft(target, props.currentUser);
  const updated: Activity = (result.success && result.activity) ? result.activity : {
    ...target,
    status: 'Draft',
    approvalStatus: 'Draft' as const,
    workflowStatus: 'DRAFT' as const,
    approvalStage: 'Stage 1: Organization Submission',
    approvalStageIndex: 1,
    currentApproverRole: 'ROLE_ORGANIZATION',
    isPlanConfirmed: false,
    deferReason: undefined,
    deferredRemarks: undefined,
    rejectionRemarks: undefined,
    rejectedBy: undefined,
    rejectedAt: undefined
  };
  emit('updateActivity', updated);
  await saveActivityToDb(updated);
  selectedActivityForReview.value = updated;
  emit('showToast', 'Status Set to Draft 📝', `"${target.title}" is now marked as Draft.`, 'info');
};

// ============================================================================
// REJECTION REASON MODAL STATE ("if reject add reason why")
// ============================================================================
const isRejectModalOpen = ref(false);
const targetActivityForRejection = ref<Activity | null>(null);
const rejectionReasonInput = ref('');

// ============================================================================
// CONFIRM ACTION PLAN MODAL STATE ("Confirm Action Plan" separation into cards)
// ============================================================================
const isConfirmPlanModalOpen = ref(false);
const isConfirmingPlan = ref(false);

const openConfirmPlanModal = () => {
  isConfirmPlanModalOpen.value = true;
};

const handleConfirmActionPlan = async () => {
  if (!props.currentUser) return;
  isConfirmingPlan.value = true;

  try {
    const orgToConfirm = viewedOrg.value === 'ALL' ? (userCouncilOrg.value || 'CBIT') : viewedOrg.value;
    const res = await apiService.confirmActionPlan(orgToConfirm, selectedFiscalYear.value, props.currentUser);

    const timestamp = new Date().toISOString();
    const fyDigits = selectedFiscalYear.value.replace(/\D/g, '');
    const updatedActivitiesToEmit: Activity[] = [];

    props.activities.forEach(a => {
      const actFyDigits = (a.fiscalYear || '').replace(/\D/g, '');
      const matchesOrg = viewedOrg.value === 'ALL' || isSameOrg(a.orgId, viewedOrg.value);
      const matchesFy = selectedFiscalYear.value === 'ALL' || !fyDigits || actFyDigits === fyDigits;
      if (matchesOrg && matchesFy && (a.status === 'Approved' || a.status === 'Rejected' || a.approvalStatus === 'Fully Approved' || a.approvalStatus === 'Rejected')) {
        // Direct assignment on current reference so unconfirmedDecisionsCount immediately becomes 0
        a.isPlanConfirmed = true;
        a.confirmedBy = props.currentUser!.name;
        a.confirmedAt = timestamp;
        a.isActionPlanItem = true;
        a.source = 'ACTION_PLAN';

        const updated: Activity = {
          ...a,
          isActionPlanItem: true,
          source: 'ACTION_PLAN',
          isPlanConfirmed: true,
          confirmedBy: props.currentUser!.name,
          confirmedAt: timestamp
        };
        updatedActivitiesToEmit.push(updated);
        emit('updateActivity', updated);
      }
    });

    if (updatedActivitiesToEmit.length > 0) {
      emit('batchUpdateActivities', updatedActivitiesToEmit);
      await batchSaveActivitiesToDb(updatedActivitiesToEmit);
    }

    isConfirmPlanModalOpen.value = false;
    activeSection.value = 'approved';
    emit('showToast', 'Action Plan Confirmed! 🎯', 'All decided activities are now confirmed and separated into their respective cards.', 'success');
  } catch (err: any) {
    emit('showToast', 'Confirmation Error', err.message || 'Failed to confirm action plan.', 'warning');
  } finally {
    isConfirmingPlan.value = false;
  }
};

const handleQuickStatusSelect = async (act: Activity, newStatus: string) => {
  if (!props.currentUser) return;

  if (newStatus === 'Rejected') {
    targetActivityForRejection.value = act;
    rejectionReasonInput.value = act.rejectionRemarks || '';
    isRejectModalOpen.value = true;
    return;
  }

  if (newStatus === 'Fully Approved') {
    const res = await apiService.approveActivity(act, props.currentUser);
    const updated: Activity = (res.success && res.activity) ? res.activity : {
      ...act,
      status: 'Approved',
      approvalStatus: 'Fully Approved' as const,
      workflowStatus: 'COMPLETED' as const,
      approvalStage: 'Approved by Organization',
      approvalStageIndex: 1,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      isPlanConfirmed: false
    };
    emit('updateActivity', updated);
    await saveActivityToDb(updated);
    emit('showToast', 'Activity Approved! 🎉', `"${act.title}" set to Approved. Click "Confirm Action Plan" to finalize into the Approved Plan card.`, 'success');
  } else if (newStatus === 'Draft') {
    const res = await apiService.setActivityToDraft(act, props.currentUser);
    const updated: Activity = (res.success && res.activity) ? res.activity : {
      ...act,
      status: 'Draft',
      approvalStatus: 'Draft' as const,
      workflowStatus: 'DRAFT' as const,
      approvalStage: 'Stage 1: Organization Submission',
      approvalStageIndex: 1,
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      isPlanConfirmed: false,
      rejectionRemarks: undefined,
      rejectedBy: undefined,
      rejectedAt: undefined,
      deferReason: undefined,
      deferredRemarks: undefined
    };
    emit('updateActivity', updated);
    await saveActivityToDb(updated);
    emit('showToast', 'Status Set to Draft 📝', `"${act.title}" is now marked as Draft.`, 'info');
  }
};

const handleConfirmRejectionWithReason = async () => {
  if (!targetActivityForRejection.value || !rejectionReasonInput.value.trim() || !props.currentUser) return;
  const act = targetActivityForRejection.value;
  const reason = rejectionReasonInput.value.trim();

  const res = await apiService.rejectActivity(act, props.currentUser, reason);
  const updated: Activity = (res.success && res.activity) ? res.activity : {
    ...act,
    status: 'Rejected',
    approvalStatus: 'Rejected' as const,
    workflowStatus: 'REJECTED' as const,
    approvalStage: 'Rejected by Organization',
    approvalStageIndex: 1,
    rejectionRemarks: reason,
    rejectedBy: props.currentUser.name,
    rejectedAt: new Date().toISOString(),
    isActionPlanItem: true,
    source: 'ACTION_PLAN',
    isPlanConfirmed: false
  };
  emit('updateActivity', updated);
  await saveActivityToDb(updated);
  isRejectModalOpen.value = false;
  targetActivityForRejection.value = null;
  emit('showToast', 'Activity Rejected ❌', `"${act.title}" marked as rejected. Reason: "${reason}". Click "Confirm Action Plan" to finalize into Rejected card.`, 'warning');
};

const handleCancelRejection = () => {
  isRejectModalOpen.value = false;
  targetActivityForRejection.value = null;
};
</script>

<template>
  <div class="space-y-5">
    <!-- MODE 1: IN-SYSTEM ACTION PLAN EDITOR -->
    <ActionPlanEditor
      v-if="isEditorOpen"
      :fiscal-year="selectedFiscalYear"
      :current-user="currentUser"
      :initial-activities="userOrgActivities"
      @close="isEditorOpen = false"
      @save-draft="handleSaveDraftFromEditor"
      @submit-approval="handleSubmitApprovalFromEditor"
      @show-toast="(t, m, type) => emit('showToast', t, m, type)"
    />

    <!-- MODE 2: ACTION PLAN MATRIX VIEW & SUMMARY -->
    <template v-else>
      <!-- Top Control Bar: Context & Primary Actions -->
      <div class="bg-white rounded-2xl border border-[#E0E7F1] shadow-xs p-5">
        <!-- Title & Context Row -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1.5">
              <span class="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                Action Plan Matrix
              </span>
              
              <!-- Logged-in Council Badge -->
              <span 
                v-if="userCouncilOrg"
                class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-md border shadow-2xs"
                :class="[
                  getOrgTheme(userCouncilOrg).badgeBg,
                  getOrgTheme(userCouncilOrg).badgeText,
                  getOrgTheme(userCouncilOrg).badgeBorder
                ]"
              >
                <Building2 class="w-3.5 h-3.5 shrink-0" />
                <span>Council: <strong class="font-extrabold">{{ userCouncilOrg }}</strong></span>
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-3 mt-1">
              <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{{ selectedFiscalYear }} Action Plan</span>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Official Template
                </span>
              </h2>

              <!-- Fiscal Year Dropdown Selector (Inputable + Dynamic Choices + Admin Add Button) -->
              <div class="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
                <label for="fy-selector" class="text-[11px] font-bold text-slate-600">Year:</label>
                <input
                  id="fy-selector"
                  type="text"
                  list="actionPlanViewFyList"
                  v-model="selectedFiscalYear"
                  class="text-xs font-extrabold text-blue-900 bg-transparent border-none focus:outline-none cursor-pointer w-32"
                />
                <datalist id="actionPlanViewFyList">
                  <option v-for="fy in allFiscalYearsList" :key="fy" :value="fy">{{ fy }}</option>
                </datalist>
                <QuickAddOptionButton
                  category="fiscal_year"
                  category-name="Fiscal Year"
                  :current-user="currentUser"
                  @created="(opt) => selectedFiscalYear = opt.label"
                  size="sm"
                />
              </div>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">
              Create, review, and track individual proposed activities across the university approval hierarchy.
            </p>
          </div>

          <!-- Action Buttons: Create Action Plan, View Switcher, Print, Export, Import -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <!-- PRIMARY ACTION: IN-SYSTEM ACTION PLAN CREATION / EDITOR -->
            <button
              v-if="isOrgOfficer || userCouncilOrg"
              type="button"
              @click="handleOpenEditor"
              class="px-4 py-2 text-xs font-black text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
              title="Open the In-System Action Plan Editor"
            >
              <Plus v-if="filteredTableActivities.length === 0" class="w-4 h-4 text-white" />
              <Edit3 v-else class="w-4 h-4 text-white" />
              <span>{{ filteredTableActivities.length === 0 ? 'Create Action Plan' : 'Action Plan Editor' }}</span>
            </button>

            <!-- View Switcher (Table vs Cards) -->
            <div class="flex items-center bg-[#F8FAFC] p-1 rounded-xl border border-[#E0E7F1]">
              <button
                type="button"
                @click="viewMode = 'table'"
                class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                :class="viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'"
                title="Spreadsheet Table View"
              >
                <Table class="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                @click="viewMode = 'cards'"
                class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                :class="viewMode === 'cards'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'"
                title="Mobile Responsive Cards View"
              >
                <LayoutGrid class="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>

            <!-- Export Button -->
            <button
              @click="handleExportOfficialExcel(activeSection === 'historical' ? 'historical' : activeSection)"
              :disabled="isExportingXlsx"
              class="btn-secondary"
              title="Download official Microsoft Excel (.xlsx) document in authentic MSUN format"
            >
              <div v-if="isExportingXlsx" class="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <FileSpreadsheet v-else class="w-3.5 h-3.5 text-emerald-600" />
              <span>Export (.xlsx)</span>
            </button>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- ACTION PLAN SECTIONS & DUAL BUDGET DISPLAY (No Deferred)                 -->
        <!-- ========================================================================= -->
        <div class="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
          <!-- Dual Budget & Finalization Status Banner -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
            <div class="flex items-center gap-4 flex-wrap">
              <div class="flex items-center gap-1.5">
                <span class="text-slate-500 font-semibold">Proposed Budget:</span>
                <strong class="text-slate-900 font-black font-mono">{{ formatCurrency(proposedBudgetTotal) }}</strong>
              </div>
              <div class="h-4 w-[1px] bg-slate-300 hidden sm:block"></div>
              <div class="flex items-center gap-1.5">
                <span class="text-emerald-700 font-semibold">Approved Budget:</span>
                <strong class="text-emerald-900 font-black font-mono">{{ formatCurrency(approvedBudgetTotal) }}</strong>
              </div>
            </div>

            <!-- Confirmation Status / Alert -->
            <div>
              <span
                v-if="unconfirmedDecisionsCount > 0"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold border border-amber-300 text-[11px]"
              >
                <Clock class="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>{{ unconfirmedDecisionsCount }} Decisions Ready (Confirm at bottom of table)</span>
              </span>
              <span v-else-if="approvedActivities.length > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold border border-emerald-200 text-[11px]">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Plan Confirmed: {{ approvedActivities.length }} Approved, {{ rejectedActivities.length }} Rejected</span>
              </span>
              <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200 text-[11px]">
                <Clock class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{{ proposedActivities.length }} Proposed Activity Rows</span>
              </span>
            </div>
          </div>

          <!-- Section Navigation Buttons (4 Columns: Proposed, Approved, Rejected, Historical) -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            <!-- 1. Proposed Action Plan -->
            <button
              type="button"
              @click="activeSection = 'proposed'"
              class="p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between"
              :class="activeSection === 'proposed'
                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'"
            >
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-[11px] font-black uppercase tracking-wider">1. Proposed Plan</span>
                <span class="px-1.5 py-0.5 text-[10px] font-black rounded-md" :class="activeSection === 'proposed' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'">
                  {{ proposedActivities.length }}
                </span>
              </div>
              <span class="text-[10px] opacity-85 truncate">Draft proposals awaiting decision</span>
            </button>

            <!-- 2. Approved Action Plan -->
            <button
              type="button"
              @click="activeSection = 'approved'"
              class="p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between"
              :class="activeSection === 'approved'
                ? 'bg-[#800000] text-white border-[#600000] shadow-xs'
                : 'bg-white hover:bg-emerald-50/50 text-slate-700 border-slate-200'"
            >
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-[11px] font-black uppercase tracking-wider" :class="activeSection === 'approved' ? 'text-white' : 'text-emerald-900'">
                  2. Approved Plan
                </span>
                <span class="px-1.5 py-0.5 text-[10px] font-black rounded-md" :class="activeSection === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'">
                  {{ approvedActivities.length }}
                </span>
              </div>
              <span class="text-[10px] opacity-85 truncate">Official Approved MSUN Plan</span>
            </button>

            <!-- 3. Rejected Activities -->
            <button
              type="button"
              @click="activeSection = 'rejected'"
              class="p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between"
              :class="activeSection === 'rejected'
                ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                : 'bg-white hover:bg-rose-50/50 text-slate-700 border-slate-200'"
            >
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-[11px] font-black uppercase tracking-wider" :class="activeSection === 'rejected' ? 'text-white' : 'text-rose-900'">
                  3. Rejected Activities
                </span>
                <span class="px-1.5 py-0.5 text-[10px] font-black rounded-md" :class="activeSection === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'">
                  {{ rejectedActivities.length }}
                </span>
              </div>
              <span class="text-[10px] opacity-85 truncate">Disapproved & reasons kept</span>
            </button>

            <!-- 4. Historical Activity Records -->
            <button
              type="button"
              @click="activeSection = 'historical'"
              class="p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between"
              :class="activeSection === 'historical'
                ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'"
            >
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <History class="w-3.5 h-3.5" />
                  <span>Historical</span>
                </span>
                <span class="px-1.5 py-0.5 text-[10px] font-black rounded-md" :class="activeSection === 'historical' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'">
                  {{ historicalActivities.length }}
                </span>
              </div>
              <span class="text-[10px] opacity-85 truncate">Past FY records & reuse</span>
            </button>
          </div>
        </div>

        <!-- Organization Selection Bar: If student org, lock to user's council -->
        <div v-if="userCouncilOrg" class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2 min-w-0 max-w-full">
            <span class="text-xs font-semibold text-slate-500 shrink-0">Your Council Action Plan:</span>
            <span 
              class="px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs inline-flex items-center gap-1.5 max-w-full overflow-hidden leading-snug"
              :class="[
                getOrgTheme(userCouncilOrg).badgeBg,
                getOrgTheme(userCouncilOrg).badgeText,
                getOrgTheme(userCouncilOrg).badgeBorder
              ]"
            >
              <span class="font-extrabold shrink-0">{{ userCouncilOrg }}</span>
              <span v-if="getOrgName(userCouncilOrg)" class="font-medium opacity-85 text-[11px] truncate max-w-[200px] sm:max-w-md">
                — {{ getOrgName(userCouncilOrg) }}
              </span>
            </span>
          </div>
          <span class="text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md max-w-full">
            🔒 Organization Privacy: Only {{ userCouncilOrg }} initiatives are accessible
          </span>
        </div>

        <!-- Organization Selection Bar for Admin / Consolidated View -->
        <div v-else class="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            @click="handleSelectOrg('ALL')"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border"
            :class="viewedOrg === 'ALL'
              ? 'bg-[#0f172a] text-white border-transparent shadow-xs'
              : 'bg-slate-50/70 text-blue-900 border-slate-200/90 hover:bg-blue-50/60 hover:border-blue-200 hover:text-blue-800'"
            title="Consolidated Action Plan across all student organizations"
          >
            All Councils
          </button>

          <button
            v-for="org in ORGANIZATIONS"
            :key="org.id"
            type="button"
            @click="handleSelectOrg(org.id)"
            class="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5"
            :class="[
              getOrgTheme(org.id).badgeBg,
              getOrgTheme(org.id).badgeText,
              getOrgTheme(org.id).badgeBorder,
              isSameOrg(viewedOrg, org.id)
                ? 'ring-2 ring-slate-900 ring-offset-1 font-black shadow-xs scale-105'
                : 'hover:opacity-90'
            ]"
            :title="`${org.acronym} - ${org.name}`"
          >
            <span>{{ org.acronym }}</span>
          </button>
        </div>
      </div>

      <!-- Action Plan Matrix Document Container -->
      <div class="bg-white rounded-2xl border border-[#E0E7F1] shadow-xs" id="action-plan-print-area">
        
        <!-- Official Header Block -->
        <div class="p-4 sm:p-5 text-center border-b border-slate-300 bg-slate-50/95 backdrop-blur-xs space-y-1 sticky top-0 z-20 rounded-t-2xl shadow-2xs">
          <h3 class="text-base sm:text-lg font-black tracking-wider text-slate-900 uppercase">
            PLAN OF ACTIVITIES
          </h3>
          <h4 class="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            {{ getOfficialOrgHeader(viewedOrg) }}
          </h4>
          <p class="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
            PERIOD COVERED: JANUARY–DECEMBER {{ selectedFiscalYear.replace(/\D/g, '') || '2027' }}
            <span v-if="activeSection === 'approved'" class="text-[#800000] font-black">
              • OFFICIAL APPROVED ACTION PLAN (ONLY FULLY APPROVED ACTIVITIES)
            </span>
            <span v-else-if="activeSection === 'rejected'" class="text-rose-800 font-black">
              • REJECTED ACTIVITIES (DISAPPROVALS &amp; REASONS KEPT)
            </span>
            <span v-else-if="activeSection === 'historical'" class="text-slate-800 font-black">
              • HISTORICAL RECORDS &amp; REUSABLE PREVIOUS PROPOSALS
            </span>
            <span v-else class="text-blue-800 font-black">
              • PROPOSED ACTION PLAN (ACTIVITIES UNDER PLANNING)
            </span>
          </p>
        </div>

        <!-- Section Guidance Alert when Empty or Informative -->
        <div v-if="activeSection === 'approved' && approvedActivities.length === 0" class="m-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex items-start gap-3">
          <Info class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div class="text-xs">
            <strong class="font-bold text-emerald-900 block mb-0.5">Approved Action Plan Notice</strong>
            <span>No activities have been confirmed into the Approved Action Plan yet. Open <strong>"1. Proposed Plan"</strong> to mark activities as Approved or Rejected, then click <strong>"Confirm Action Plan"</strong> to officially separate them into this card.</span>
          </div>
        </div>

        <div v-else-if="activeSection === 'rejected'" class="m-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex items-start gap-3">
          <Info class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div class="text-xs">
            <strong class="font-bold text-rose-900 block mb-0.5">Rejected Activities (Reasons Preserved)</strong>
            <span>These proposed activities were reviewed and rejected by the organization leadership. The mandatory recorded reasons for rejection are kept on file for organizational accountability and institutional audit.</span>
          </div>
        </div>

        <div v-else-if="activeSection === 'proposed' && proposedActivities.length === 0 && approvedActivities.length > 0" class="m-5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2.5">
            <CheckCircle2 class="w-5 h-5 text-blue-600 shrink-0" />
            <div class="text-xs">
              <strong class="font-bold text-blue-900 block mb-0.5">All Proposals Confirmed</strong>
              <span>All proposed activities have been confirmed into the Approved Action Plan ({{ approvedActivities.length }}) and Rejected Activities ({{ rejectedActivities.length }}).</span>
            </div>
          </div>
          <button
            type="button"
            @click="activeSection = 'approved'"
            class="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition cursor-pointer"
          >
            View Approved Plan →
          </button>
        </div>

        <div v-else-if="activeSection === 'historical'" class="m-5 p-3.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 flex items-start justify-between gap-3 flex-wrap">
          <div class="flex items-start gap-3">
            <History class="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
            <div class="text-xs">
              <strong class="font-bold text-slate-900 block mb-0.5">Historical Activity Records &amp; Reuse</strong>
              <span>Review previous fiscal-year activities, decisions, and remarks. Use <strong>"Copy to Current Fiscal Year"</strong> to adapt a previous proposal as a new draft under the current template without losing the original historical record.</span>
            </div>
          </div>
          <span class="text-[11px] font-extrabold bg-white px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 self-center">
            Historical Records: Read-Only
          </span>
        </div>

        <!-- ==================== 1. MOBILE RESPONSIVE CARDS VIEW ==================== -->
        <div v-if="viewMode === 'cards'" class="p-4 sm:p-5 space-y-4">
          <div class="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <Coins class="w-4 h-4 text-blue-700 shrink-0" />
              <span class="text-xs font-semibold text-blue-900">
                Total Budget: <strong class="font-black text-blue-950">{{ formatCurrency(totalAllocatedBudget) }}</strong>
              </span>
            </div>
            <span class="text-xs font-bold text-blue-800 bg-white px-2.5 py-0.5 rounded-md border border-blue-200 shadow-2xs">
              {{ currentSectionActivities.length }} {{ currentSectionActivities.length === 1 ? 'Item' : 'Items' }}
            </span>
          </div>

          <div v-if="currentSectionActivities.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="act in currentSectionActivities"
              :key="act.id"
              class="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
              :class="{
                'border-amber-300 bg-amber-50/20': getActivityApprovalStatus(act) === 'Deferred',
                'border-rose-300 bg-rose-50/20': getActivityApprovalStatus(act) === 'Rejected'
              }"
            >
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-[11px] font-bold text-slate-900 bg-[#fce4ec] px-2.5 py-0.5 rounded-md border border-rose-200">
                    {{ getActivityMonth(act) }} - {{ getActivityWeek(act) }}
                  </span>
                  
                  <!-- Status Pill or Direct Selector -->
                  <select
                    v-if="isOrgOfficer || userCouncilOrg"
                    :value="getActivityApprovalStatus(act)"
                    @change="handleQuickStatusSelect(act, ($event.target as HTMLSelectElement).value)"
                    class="text-[10px] font-black px-2 py-0.5 rounded border shadow-2xs cursor-pointer focus:outline-none transition"
                    :class="[
                      getStatusBadgeConfig(getActivityApprovalStatus(act)).bg,
                      getStatusBadgeConfig(getActivityApprovalStatus(act)).text,
                      getStatusBadgeConfig(getActivityApprovalStatus(act)).border
                    ]"
                  >
                    <option value="Draft" class="bg-white text-slate-700">Draft</option>
                    <option value="Fully Approved" class="bg-white text-emerald-700 font-bold">Approved</option>
                    <option value="Rejected" class="bg-white text-rose-700 font-bold">Rejected</option>
                  </select>
                  <span 
                    v-else
                    class="text-[10px] font-extrabold px-2 py-0.5 rounded border"
                    :class="[
                      getStatusBadgeConfig(getActivityApprovalStatus(act)).bg,
                      getStatusBadgeConfig(getActivityApprovalStatus(act)).text,
                      getStatusBadgeConfig(getActivityApprovalStatus(act)).border
                    ]"
                  >
                    {{ getStatusBadgeConfig(getActivityApprovalStatus(act)).label }}
                  </span>
                </div>

                <h3
                  @click="openActivityReviewModal(act)"
                  class="text-sm font-bold text-slate-900 hover:text-blue-700 cursor-pointer transition-colors leading-snug line-clamp-2"
                >
                  {{ getActivityProgramsAndActivities(act) }}
                </h3>

                <div class="mt-2.5 space-y-1 text-xs text-slate-600">
                  <p class="line-clamp-2">
                    <strong class="text-slate-700">Objectives:</strong> {{ getActivityStrategicObjectives(act) }}
                  </p>
                  <p class="line-clamp-2 text-slate-500">
                    <strong class="text-slate-600">Outputs:</strong> {{ getActivityExpectedOutput(act) }}
                  </p>
                </div>

                <!-- Deferral Remarks Preview if deferred -->
                <div v-if="act.deferReason || act.deferredRemarks" class="mt-2 p-2 bg-amber-100 text-amber-900 rounded-lg text-[11px] italic">
                  <strong>Revision Remark:</strong> "{{ act.deferReason || act.deferredRemarks }}"
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <span class="text-[10px] text-slate-400 font-bold uppercase block">Budget</span>
                  <span class="text-xs font-black text-blue-900">
                    {{ formatCurrency(getActivityTotalBudget(act) || getActivityAmount(act)) }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5">
                  <button
                    v-if="activeSection === 'historical' || act.fiscalYear !== selectedFiscalYear"
                    type="button"
                    @click="handleCopyToCurrentFiscalYear(act)"
                    class="px-2 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    title="Copy to Current Fiscal Year"
                  >
                    <Copy class="w-3 h-3 text-emerald-700" />
                    <span>Copy to Current FY</span>
                  </button>

                  <button
                    type="button"
                    @click="openActivityReviewModal(act)"
                    class="btn-secondary btn-sm"
                    title="Review initiative and approval timeline"
                  >
                    <Eye class="w-3.5 h-3.5 text-blue-600" />
                    <span>Review</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="p-10 text-center text-slate-500">
            <Building2 class="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p class="text-sm font-bold text-slate-700">No Action Plan initiatives found</p>
            <p class="text-xs text-slate-500 mt-1">
              Click "Create Action Plan" to begin proposing activities using the published template.
            </p>
          </div>
        </div>

        <!-- ==================== 2. TABLE VIEW (OFFICIAL 10 COLUMNS + STATUS/REVIEW) ==================== -->
        <div v-else>
          <div class="lg:hidden px-4 py-2 bg-blue-50/90 text-blue-900 border-b border-blue-100 text-xs font-semibold flex items-center justify-between no-print">
            <span>👈 Swipe horizontally to view full matrix table 👉</span>
            <span class="text-[10px] bg-blue-200/80 px-2 py-0.5 rounded-full text-blue-950 font-extrabold">10 Standard Columns</span>
          </div>

          <!-- Official Action Plan Matrix Table -->
          <div class="overflow-auto w-full touch-scroll max-h-[calc(100vh-270px)] min-h-[360px] relative rounded-b-2xl border-b border-slate-300">
            <table class="w-full text-left text-xs border-collapse border border-slate-400 min-w-[1280px]">
              <thead class="sticky top-0 z-20">
                <!-- Row 1: The 10 Official Published Template Columns -->
                <tr class="bg-[#800000] text-white font-extrabold text-center border-b border-slate-400">
                  <th colspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] bg-[#800000] text-white shadow-xs">
                    Timeframe
                  </th>
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] w-[190px] bg-[#800000] text-white shadow-xs align-middle">
                    Programs and Activities
                  </th>
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] min-w-[210px] bg-[#800000] text-white shadow-xs align-middle">
                    Strategic Objectives
                  </th>
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] min-w-[190px] bg-[#800000] text-white shadow-xs align-middle">
                    Expected Output
                  </th>
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] w-[80px] bg-[#800000] text-white shadow-xs align-middle">
                    Office
                  </th>
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] min-w-[180px] bg-[#800000] text-white shadow-xs align-middle">
                    Line Item
                  </th>
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] w-[120px] bg-[#800000] text-white shadow-xs align-middle">
                    Budget Requirement
                  </th>
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] w-[120px] bg-[#800000] text-white shadow-xs align-middle">
                    Fund Source
                  </th>
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] w-[130px] bg-[#800000] text-white shadow-xs align-middle">
                    Person Assigned
                  </th>
                  <!-- App UI Review Column (hidden on print) -->
                  <th rowspan="2" class="sticky top-0 z-20 p-2.5 border border-slate-400 uppercase tracking-wider text-[11px] w-[130px] no-print bg-[#600000] text-white shadow-xs align-middle">
                    Status & Review
                  </th>
                </tr>

                <!-- Row 2: Sub-headers for grouped Timeframe columns (Month, Week) -->
                <tr class="bg-[#FCE5CD] text-slate-900 font-bold text-center text-[10px] border-b border-slate-400 uppercase">
                  <th class="sticky top-[36px] z-10 p-1.5 border border-slate-400 w-24 bg-[#FCE5CD] text-slate-900 shadow-xs">Month</th>
                  <th class="sticky top-[36px] z-10 p-1.5 border border-slate-400 w-24 bg-[#FCE5CD] text-slate-900 shadow-xs">Week</th>
                </tr>
              </thead>

              <!-- Table Body -->
              <tbody class="divide-y divide-slate-300">
                <template v-if="currentSectionActivities.length > 0">
                  <tr
                    v-for="act in currentSectionActivities"
                    :key="act.id"
                    class="hover:bg-slate-50/70 transition-colors"
                    :class="{
                      'bg-rose-50/30': getActivityApprovalStatus(act) === 'Rejected',
                      'bg-emerald-50/20': getActivityApprovalStatus(act) === 'Fully Approved'
                    }"
                  >
                    <!-- 1. Timeframe - Month -->
                    <td class="p-2.5 border border-slate-300 bg-[#fce4ec]/40 text-center text-slate-900 font-bold align-middle">
                      {{ getActivityMonth(act) }}
                    </td>

                    <!-- 2. Timeframe - Week -->
                    <td class="p-2.5 border border-slate-300 bg-[#fce4ec]/40 text-center text-slate-800 font-medium align-middle">
                      {{ getActivityWeek(act) }}
                    </td>

                    <!-- 3. Programs and Activities -->
                    <td class="p-2.5 border border-slate-300 text-slate-900 font-bold align-middle">
                      <div>{{ getActivityProgramsAndActivities(act) }}</div>
                    </td>

                    <!-- 4. Strategic Objectives (Text Wrapped) -->
                    <td class="p-2.5 border border-slate-300 text-slate-800 leading-relaxed align-middle">
                      {{ getActivityStrategicObjectives(act) }}
                    </td>

                    <!-- 5. Expected Output (Text Wrapped) -->
                    <td class="p-2.5 border border-slate-300 text-slate-800 leading-relaxed align-middle">
                      {{ getActivityExpectedOutput(act) }}
                    </td>

                    <!-- 6. Office -->
                    <td class="p-2.5 border border-slate-300 text-center align-middle">
                      <OrgBadge :org-id="getActivityOffice(act)" size="xs" />
                    </td>

                    <!-- 7. Line Item (Text Wrapped) -->
                    <td class="p-2.5 border border-slate-300 text-slate-800 leading-relaxed align-middle">
                      {{ getActivityLineItemBudget(act) }}
                    </td>

                    <!-- 8. Budget Requirement -->
                    <td class="p-2.5 border border-slate-300 text-right font-black text-slate-900 align-middle">
                      {{ formatCurrency(getActivityTotalBudget(act) || getActivityAmount(act)) }}
                    </td>

                    <!-- 9. Fund Source -->
                    <td class="p-2.5 border border-slate-300 text-center text-slate-800 font-medium align-middle">
                      {{ getActivityFundSource(act) }}
                    </td>

                    <!-- 10. Person Assigned -->
                    <td class="p-2.5 border border-slate-300 text-slate-800 font-medium align-middle">
                      {{ getActivityPersonAssigned(act) }}
                    </td>

                    <!-- 11. Application Status & Review Column (not printed) -->
                    <td class="p-2 border border-slate-300 text-center align-middle no-print bg-slate-50/50">
                      <div class="flex flex-col items-center gap-1.5">
                        <select
                          v-if="isOrgOfficer || userCouncilOrg"
                          :value="getActivityApprovalStatus(act)"
                          @change="handleQuickStatusSelect(act, ($event.target as HTMLSelectElement).value)"
                          class="text-[10px] font-black px-2 py-1 rounded border shadow-2xs cursor-pointer focus:outline-none transition"
                          :class="[
                            getStatusBadgeConfig(getActivityApprovalStatus(act)).bg,
                            getStatusBadgeConfig(getActivityApprovalStatus(act)).text,
                            getStatusBadgeConfig(getActivityApprovalStatus(act)).border
                          ]"
                        >
                          <option value="Draft" class="bg-white text-slate-700">Draft</option>
                          <option value="Fully Approved" class="bg-white text-emerald-700 font-bold">Approved</option>
                          <option value="Rejected" class="bg-white text-rose-700 font-bold">Rejected</option>
                        </select>
                        <span 
                          v-else
                          class="text-[10px] font-black px-2 py-0.5 rounded border"
                          :class="[
                            getStatusBadgeConfig(getActivityApprovalStatus(act)).bg,
                            getStatusBadgeConfig(getActivityApprovalStatus(act)).text,
                            getStatusBadgeConfig(getActivityApprovalStatus(act)).border
                          ]"
                        >
                          {{ getStatusBadgeConfig(getActivityApprovalStatus(act)).label }}
                        </span>

                        <!-- Deferral Remarks Preview -->
                        <span 
                          v-if="act.deferReason || act.deferredRemarks"
                          class="text-[9px] text-amber-800 font-semibold max-w-[120px] truncate block"
                          :title="act.deferReason || act.deferredRemarks"
                        >
                          "{{ act.deferReason || act.deferredRemarks }}"
                        </span>

                        <button
                          type="button"
                          @click="openActivityReviewModal(act)"
                          class="px-2 py-1 text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-md transition cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Eye class="w-3 h-3 text-blue-600" />
                          <span>Review</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <!-- Empty State -->
                <tr v-else>
                  <td colspan="11" class="p-12 text-center text-slate-500 bg-slate-50/50">
                    <div class="max-w-md mx-auto space-y-3">
                      <Building2 class="w-10 h-10 text-slate-300 mx-auto" />
                      <p class="text-sm font-bold text-slate-700">
                        <span v-if="activeSection === 'approved'">No approved activities in this action plan yet</span>
                        <span v-else-if="activeSection === 'rejected'">No rejected activities in this action plan</span>
                        <span v-else-if="activeSection === 'historical'">No historical records found</span>
                        <span v-else>No proposed activities found</span>
                      </p>
                      <p class="text-xs text-slate-500 leading-relaxed">
                        <span v-if="activeSection === 'approved'">Select "Approved" on proposed activities in "1. Proposed Plan" and confirm the plan to finalize them into this card.</span>
                        <span v-else-if="activeSection === 'rejected'">Rejected activities with mandatory recorded reasons will be preserved here.</span>
                        <span v-else-if="activeSection === 'historical'">Past fiscal year activities will appear here for reference and reuse.</span>
                        <span v-else>Click "Create Action Plan" above to create and submit activities using the published template.</span>
                      </p>
                      <button
                        v-if="(isOrgOfficer || userCouncilOrg) && activeSection === 'proposed'"
                        type="button"
                        @click="handleOpenEditor"
                        class="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus class="w-3.5 h-3.5" />
                        <span>Create Action Plan</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>

              <!-- Table Footer (Sticky at bottom of scroll container) -->
              <tfoot v-if="filteredTableActivities.length > 0" class="sticky bottom-0 z-20 bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 shadow-[0_-3px_6px_rgba(0,0,0,0.08)]">
                <tr class="bg-slate-100">
                  <td colspan="7" class="sticky bottom-0 z-20 bg-slate-100 p-2.5 border border-slate-400 text-right uppercase tracking-wider text-xs">
                    {{ currentSectionFooterLabel }}
                  </td>
                  <td class="sticky bottom-0 z-20 bg-slate-100 p-2.5 border border-slate-400 text-right text-xs font-black text-emerald-900 font-mono">
                    {{ formatCurrency(totalAllocatedBudget) }}
                  </td>
                  <td colspan="2" class="sticky bottom-0 z-20 bg-slate-100 p-2.5 border border-slate-400 text-center text-xs text-slate-600">
                    MSUN Verified
                  </td>
                  <td class="sticky bottom-0 z-20 bg-slate-100 p-2.5 border border-slate-400 text-center text-xs font-bold text-slate-500 no-print">
                    {{ currentSectionActivities.length }} {{ currentSectionActivities.length === 1 ? 'Item' : 'Items' }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- ========================================================================= -->
        <!-- BOTTOM CONFIRMATION BAR: "Confirm Changes" (Prominent & 100% Clickable)  -->
        <!-- ========================================================================= -->
        <div 
          v-if="isOrgOfficer || userCouncilOrg"
          class="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/90 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle2 class="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-xs sm:text-sm font-black text-slate-900">
                  Action Plan Final Confirmation
                </h4>
                <span 
                  v-if="unconfirmedDecisionsCount > 0" 
                  class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300"
                >
                  {{ unconfirmedDecisionsCount }} Decisions Ready
                </span>
                <span 
                  v-else 
                  class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300"
                >
                  {{ approvedActivities.length }} Confirmed in Plan
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5 leading-snug">
                {{ unconfirmedDecisionsCount > 0 
                  ? `You have marked decisions for ${unconfirmedDecisionsCount} activities. Click "Confirm Changes" to finalize and separate them into 2. Approved Plan and 3. Rejected Activities.`
                  : `All decided initiatives are confirmed. You can still adjust row statuses at any time and re-confirm.`
                }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              type="button"
              :disabled="isConfirmingPlan"
              @click="handleConfirmActionPlan"
              class="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Click to finalize and separate approved and rejected activities into their cards"
            >
              <div v-if="isConfirmingPlan" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <CheckCircle2 v-else class="w-4 h-4 text-white" />
              <span>{{ unconfirmedDecisionsCount > 0 ? 'Confirm Changes' : 'All Changes Confirmed ✓' }}</span>
              <span v-if="unconfirmedDecisionsCount > 0" class="px-2 py-0.5 rounded-full bg-white text-emerald-900 text-[10px] font-black">
                {{ unconfirmedDecisionsCount }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ========================================================================= -->
    <!-- MODAL 1: CONFIRM ACTION PLAN CHANGES (Full Interactive Dialog)            -->
    <!-- ========================================================================= -->
    <div
      v-if="isConfirmPlanModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      @click.self="isConfirmPlanModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <!-- University Brand Header -->
        <div class="bg-[#1b1a69] px-6 py-4 text-white flex items-center justify-between border-b border-[#28277d]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center">
              <CheckCircle2 class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-black text-white">Confirm Action Plan Changes</h3>
              <p class="text-[11px] text-blue-200">{{ selectedFiscalYear }} • {{ viewedOrg }}</p>
            </div>
          </div>
          <button
            type="button"
            @click="isConfirmPlanModalOpen = false"
            class="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs text-slate-600">
          <p class="text-slate-800 font-medium leading-relaxed">
            You are confirming the decisions for your organization's proposed initiatives. Once confirmed:
          </p>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span class="text-[11px] font-bold text-emerald-800 uppercase block">Approved Plan</span>
              <strong class="text-lg font-black text-emerald-950 font-mono">{{ fullyApprovedCount }} Activities</strong>
              <p class="text-[10px] text-emerald-700 mt-0.5">Budget: {{ formatCurrency(approvedBudgetTotal) }}</p>
            </div>

            <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <span class="text-[11px] font-bold text-rose-800 uppercase block">Rejected</span>
              <strong class="text-lg font-black text-rose-950 font-mono">{{ rejectedCount }} Activities</strong>
              <p class="text-[10px] text-rose-700 mt-0.5">Reasons recorded on file</p>
            </div>
          </div>

          <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5 text-[11px]">
            <Info class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>Approved activities will be finalized into <strong>2. Approved Plan</strong>, and rejected items will be placed into <strong>3. Rejected Activities</strong>.</span>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="isConfirmPlanModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isConfirmingPlan"
            @click="handleConfirmActionPlan"
            class="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <div v-if="isConfirmingPlan" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <CheckCircle2 v-else class="w-3.5 h-3.5 text-white" />
            <span>Confirm Changes</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- MODAL 2: REJECT ACTIVITY WITH MANDATORY REASON                           -->
    <!-- ========================================================================= -->
    <div
      v-if="isRejectModalOpen && targetActivityForRejection"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      @click.self="handleCancelRejection"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <!-- Rejection Header -->
        <div class="bg-rose-900 px-6 py-4 text-white flex items-center justify-between border-b border-rose-950">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-400/30 flex items-center justify-center">
              <XCircle class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-black text-white">Reject Proposed Activity</h3>
              <p class="text-[11px] text-rose-200">Mandatory Rejection Reason under Institutional Audit</p>
            </div>
          </div>
          <button
            type="button"
            @click="handleCancelRejection"
            class="text-rose-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-6 space-y-4 text-xs">
          <!-- Target Activity Details -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span class="text-[10px] font-bold text-slate-500 uppercase">Target Activity:</span>
            <h4 class="font-bold text-slate-900 text-xs leading-snug">{{ targetActivityForRejection.title }}</h4>
            <div class="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
              <span>Budget: <strong class="text-slate-800 font-mono">{{ formatCurrency(targetActivityForRejection.budget || 0) }}</strong></span>
              <span>•</span>
              <span>Office: <strong>{{ targetActivityForRejection.office || targetActivityForRejection.orgId }}</strong></span>
            </div>
          </div>

          <!-- Reason Input Field -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">
              Reason for Disapproval <span class="text-rose-600">*</span>
            </label>
            <textarea
              v-model="rejectionReasonInput"
              rows="3"
              placeholder="e.g. Activity exceeds budget allocation, conflicts with scheduled institutional events, or lacks alignment with council priorities..."
              class="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
            ></textarea>
            <span class="text-[10px] text-slate-400 mt-1 block">
              This remark will be permanently recorded in the institutional audit log and visible under 3. Rejected Activities.
            </span>
          </div>

          <!-- Quick Preset Suggestions -->
          <div class="space-y-1.5">
            <span class="text-[10px] font-bold text-slate-500 uppercase">Quick Suggestion:</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                type="button"
                @click="rejectionReasonInput = 'Exceeds council budget allocation for this quarter.'"
                class="px-2 py-1 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
              >
                Budget limitation
              </button>
              <button
                type="button"
                @click="rejectionReasonInput = 'Schedule overlaps with institutional examinations and university calendar.'"
                class="px-2 py-1 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
              >
                Calendar conflict
              </button>
              <button
                type="button"
                @click="rejectionReasonInput = 'Priority deferred to subsequent semester to consolidate resources.'"
                class="px-2 py-1 rounded-md text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
              >
                Resource consolidation
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="handleCancelRejection"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!rejectionReasonInput.trim()"
            @click="handleConfirmRejectionWithReason"
            class="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-40 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <XCircle class="w-3.5 h-3.5 text-white" />
            <span>Confirm Rejection</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Activity Review Modal -->
    <ActivityReviewModal
      :activity="selectedActivityForReview"
      :is-open="isReviewModalOpen"
      :current-user="currentUser"
      @close="isReviewModalOpen = false"
      @approve="handleApproveFromModal"
      @defer="handleDeferFromModal"
      @reject="handleRejectFromModal"
      @resubmit="handleResubmitFromModal"
      @set-draft="handleSetDraftFromModal"
    />
  </div>
</template>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
  body * {
    visibility: hidden;
  }
  #action-plan-print-area,
  #action-plan-print-area * {
    visibility: visible;
  }
  #action-plan-print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none;
    box-shadow: none;
  }
  .overflow-auto,
  .overflow-x-auto {
    overflow: visible !important;
    max-height: none !important;
  }
  th, td, thead, tfoot {
    position: static !important;
  }
}
</style>
