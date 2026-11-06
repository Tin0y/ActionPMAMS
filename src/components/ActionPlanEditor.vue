<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { 
  Activity, 
  UserAccount, 
  ActionPlanTemplate, 
  BudgetLineItem, 
  OrgId,
  formatUserRole
} from '../types';
import { 
  DEFAULT_MSUN_ACTION_PLAN_TEMPLATE, 
  ORGANIZATIONS, 
  getOrgTheme,
  isCollegeOrg,
  getWorkflowTimelineForOrg,
  getInitialTimelineForActionPlan
} from '../data/initialData';
import { isSameOrg } from '../utils/organizationUtils';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Send, 
  Eye, 
  X, 
  Check, 
  AlertTriangle, 
  Coins, 
  FileSpreadsheet, 
  Calculator, 
  Sparkles,
  Info,
  Building2,
  Calendar,
  Lock,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next';
import { getOptionLabelsByCategory } from '../services/optionsService';
import QuickAddOptionButton from './QuickAddOptionButton.vue';
import { detectActionPlanConflicts, ConflictItem } from '../utils/conflictDetection';

interface EditorRow {
  id: string;
  timeframeMonth: string;
  timeframeWeek: string;
  title: string;
  strategicObjectives: string;
  expectedOutput: string;
  office: string;
  lineItemBudget: string;
  budgetLineItems: BudgetLineItem[];
  budget: number;
  totalBudget: number;
  fundSource: string;
  personAssigned: string;
  status: string;
  approvalStatus: string;
  isZeroBudget: boolean;
  version: number;
  deferReason?: string;
  deferredRemarks?: string;
  deferredBy?: string;
  rejectionRemarks?: string;
  originalActivity?: Activity;
}

const props = withDefaults(
  defineProps<{
    fiscalYear: string;
    currentUser: UserAccount | null;
    initialActivities?: Activity[];
    template?: ActionPlanTemplate;
  }>(),
  {
    initialActivities: () => [],
    template: () => DEFAULT_MSUN_ACTION_PLAN_TEMPLATE
  }
);

const emit = defineEmits<{
  (e: 'saveDraft', activities: Activity[]): void;
  (e: 'submitApproval', activities: Activity[]): void;
  (e: 'close'): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

// Organization resolution
const currentOrgId = computed<OrgId>(() => {
  if (props.currentUser?.orgId && props.currentUser.orgId !== 'ADMIN' && props.currentUser.orgId !== 'COLLEGE') {
    return props.currentUser.orgId as OrgId;
  }
  return 'CBIT';
});

const currentOrg = computed(() => {
  return ORGANIZATIONS.find(o => isSameOrg(o.id, currentOrgId.value));
});

// Dynamic Database Options (APMAMS UPDATE 7)
const dynamicFundSources = getOptionLabelsByCategory('fund_source');
const dynamicMonths = getOptionLabelsByCategory('timeframe');

// Month & Week options from template + database
const monthOptions = computed(() => {
  const col = props.template.columns.find(c => c.fieldKey === 'timeframeMonth');
  const base = col?.options || [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
    'May-June', 'June-July', 'January-December', 'First Semester', 'Second Semester'
  ];
  return Array.from(new Set([...dynamicMonths.value, ...base]));
});

const weekOptions = computed(() => {
  const col = props.template.columns.find(c => c.fieldKey === 'timeframeWeek');
  return col?.options || [
    '1st Week', '2nd Week', '3rd Week', '4th Week', 'Last Week',
    '1st-2nd Week', '3rd-4th Week', 'Entire Month'
  ];
});

const fundSourceOptions = computed(() => {
  const col = props.template.columns.find(c => c.fieldKey === 'fundSource');
  const base = col?.options || [
    'Organizational Fund',
    'OSD Fund',
    'University Fund',
    'Senior Class Fund',
    'Sponsorship',
    'Student Development Fund',
    'Other authorized funding sources'
  ];
  return Array.from(new Set([...dynamicFundSources.value, ...base]));
});

// Default office acronym
const defaultOffice = computed(() => {
  return currentOrg.value ? `${currentOrg.value.id}-SEC` : currentOrgId.value;
});

// Row generator
let rowCounter = 1;
const createEmptyRow = (prefill?: Partial<EditorRow>): EditorRow => {
  const idNum = String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10);
  const rowId = `ACT-${props.fiscalYear.replace(/\D/g, '') || '2027'}-${currentOrgId.value}-${idNum}`;
  
  return {
    id: rowId,
    timeframeMonth: prefill?.timeframeMonth || 'January',
    timeframeWeek: prefill?.timeframeWeek || '1st Week',
    title: prefill?.title || '',
    strategicObjectives: prefill?.strategicObjectives || '',
    expectedOutput: prefill?.expectedOutput || '',
    office: prefill?.office || defaultOffice.value,
    lineItemBudget: prefill?.lineItemBudget || '',
    budgetLineItems: prefill?.budgetLineItems || [],
    budget: prefill?.budget ?? 0,
    totalBudget: prefill?.totalBudget ?? prefill?.budget ?? 0,
    fundSource: prefill?.fundSource || 'Organizational Fund',
    personAssigned: prefill?.personAssigned || `${currentOrgId.value} Officers`,
    status: prefill?.status || 'Draft',
    approvalStatus: prefill?.approvalStatus || 'Draft',
    isZeroBudget: prefill?.isZeroBudget || false,
    version: prefill?.version || 1,
    deferReason: prefill?.deferReason,
    deferredRemarks: prefill?.deferredRemarks,
    deferredBy: prefill?.deferredBy,
    rejectionRemarks: prefill?.rejectionRemarks,
    originalActivity: prefill?.originalActivity
  };
};

// Editor rows state
const rows = ref<EditorRow[]>([]);

// Convert activity to editor row
const activityToRow = (act: Activity): EditorRow => {
  const zeroBudget = act.budget === 0 || (act.amount === 0 && act.totalBudget === 0);
  let lineItems: BudgetLineItem[] = [];
  if (act.budgetLineItems && Array.isArray(act.budgetLineItems) && act.budgetLineItems.length > 0) {
    lineItems = JSON.parse(JSON.stringify(act.budgetLineItems));
  } else if (act.lineItemBudget && !zeroBudget) {
    lineItems = [{
      id: `li-1`,
      description: act.lineItemBudget,
      quantity: 1,
      unitCost: act.budget || act.totalBudget || 0,
      total: act.budget || act.totalBudget || 0
    }];
  }

  return {
    id: act.id,
    timeframeMonth: act.timeframeMonth || 'January',
    timeframeWeek: act.timeframeWeek || '1st Week',
    title: act.title || '',
    strategicObjectives: act.strategicObjectives || act.description || '',
    expectedOutput: act.expectedOutput || act.kpiOutcome || '',
    office: act.office || defaultOffice.value,
    lineItemBudget: act.lineItemBudget || (zeroBudget ? 'N/A (Zero-budget activity)' : ''),
    budgetLineItems: lineItems,
    budget: act.budget ?? act.amount ?? 0,
    totalBudget: act.totalBudget ?? act.budget ?? 0,
    fundSource: act.fundSource || 'Organizational Fund',
    personAssigned: act.personAssigned || act.proposedBy || `${act.orgId} Officers`,
    status: act.status || 'Draft',
    approvalStatus: act.approvalStatus || (act.status === 'DEFERRED' ? 'Deferred' : (act.status === 'Approved' ? 'Fully Approved' : 'Draft')),
    isZeroBudget: zeroBudget,
    version: act.version || 1,
    deferReason: act.deferReason || act.deferredRemarks,
    deferredRemarks: act.deferredRemarks || act.deferReason,
    deferredBy: act.deferredBy,
    rejectionRemarks: act.rejectionRemarks,
    originalActivity: act
  };
};

// Initialize rows from initialActivities or create 3 default blank rows
const loadInitialRows = () => {
  const matching = props.initialActivities.filter(a => isSameOrg(a.orgId, currentOrgId.value));
  if (matching.length > 0) {
    rows.value = matching.map(activityToRow);
  } else {
    rows.value = [
      createEmptyRow({ title: '', timeframeMonth: 'January', timeframeWeek: '1st Week' }),
      createEmptyRow({ title: '', timeframeMonth: 'February', timeframeWeek: '2nd Week' }),
      createEmptyRow({ title: '', timeframeMonth: 'March', timeframeWeek: '1st Week' })
    ];
  }
};

// Action Plan Conflict & Redundancy Detection (Section 2 & 3)
const getRowConflicts = (row: EditorRow): ConflictItem[] => {
  if (!row.title || row.title.trim().length < 3) return [];
  return detectActionPlanConflicts(
    {
      id: row.id,
      title: row.title,
      programActivity: row.title,
      strategicObjectives: row.strategicObjectives,
      timeframe: `${row.timeframeMonth} ${row.timeframeWeek}`,
      timeframeMonth: row.timeframeMonth,
      timeframeWeek: row.timeframeWeek,
      orgId: currentOrgId.value,
      fiscalYear: props.fiscalYear
    },
    props.initialActivities || []
  );
};

onMounted(() => {
  loadInitialRows();
});

watch(
  () => props.initialActivities,
  (newActs) => {
    if (newActs && newActs.length > 0 && rows.value.length === 0) {
      loadInitialRows();
    }
  }
);

// Currency formatter
const formatCurrency = (val: number): string => {
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Total Proposed Budget calculation
const totalProposedBudget = computed(() => {
  return rows.value.reduce((sum, r) => sum + (r.budget || 0), 0);
});

// Check if plan has been submitted
const isPlanSubmitted = computed(() => {
  return false;
});

const isRowEditable = (_row: EditorRow): boolean => {
  // Student organization officers have direct edit authority over their Action Plan rows
  return true;
};

// Rejection reason modal state for editor ("if reject add reason why")
const isRejectReasonModalOpen = ref(false);
const targetRowForRejection = ref<EditorRow | null>(null);
const editorRejectionReason = ref('');

// Row status update handler
const handleRowStatusChange = (row: EditorRow) => {
  if (row.approvalStatus === 'Fully Approved') {
    row.status = 'Approved';
  } else if (row.approvalStatus === 'Rejected') {
    targetRowForRejection.value = row;
    editorRejectionReason.value = row.rejectionRemarks || '';
    isRejectReasonModalOpen.value = true;
  } else {
    row.approvalStatus = 'Draft';
    row.status = 'Draft';
  }
};

const handleConfirmRowRejection = () => {
  if (!targetRowForRejection.value || !editorRejectionReason.value.trim()) return;
  targetRowForRejection.value.status = 'Rejected';
  targetRowForRejection.value.approvalStatus = 'Rejected';
  targetRowForRejection.value.rejectionRemarks = editorRejectionReason.value.trim();
  isRejectReasonModalOpen.value = false;
  targetRowForRejection.value = null;
  emit('showToast', 'Rejection Reason Recorded', 'Recorded justification for rejected activity row.', 'info');
};

const handleCancelRowRejection = () => {
  if (targetRowForRejection.value && !targetRowForRejection.value.rejectionRemarks) {
    targetRowForRejection.value.approvalStatus = 'Draft';
    targetRowForRejection.value.status = 'Draft';
  }
  isRejectReasonModalOpen.value = false;
  targetRowForRejection.value = null;
};

const openRejectionReasonModal = (row: EditorRow) => {
  targetRowForRejection.value = row;
  editorRejectionReason.value = row.rejectionRemarks || '';
  isRejectReasonModalOpen.value = true;
};

// Batch status actions
const handleApproveAllRows = () => {
  rows.value.forEach(r => {
    r.approvalStatus = 'Fully Approved';
    r.status = 'Approved';
  });
  emit('showToast', 'All Activities Approved', 'All action plan rows set to Approved status.', 'info');
};

const handleSetAllDraft = () => {
  rows.value.forEach(r => {
    r.approvalStatus = 'Draft';
    r.status = 'Draft';
  });
  emit('showToast', 'All Activities Draft', 'All action plan rows set to Draft status.', 'info');
};

// ============================================================================
// ROW OPERATIONS
// ============================================================================

const handleAddRow = () => {
  rows.value.push(createEmptyRow());
  emit('showToast', 'Activity Row Added', 'New activity row added at the bottom.', 'info');
};

const handleInsertRowAbove = (index: number) => {
  const newRow = createEmptyRow();
  rows.value.splice(index, 0, newRow);
  emit('showToast', 'Row Inserted', `Inserted new row above #${index + 1}.`, 'info');
};

const handleInsertRowBelow = (index: number) => {
  const newRow = createEmptyRow();
  rows.value.splice(index + 1, 0, newRow);
  emit('showToast', 'Row Inserted', `Inserted new row below #${index + 1}.`, 'info');
};

const handleRemoveRow = (index: number) => {
  const target = rows.value[index];
  if (!isRowEditable(target)) {
    emit('showToast', 'Cannot Remove', 'This activity has already been submitted for approval and is locked.', 'warning');
    return;
  }

  if (rows.value.length <= 1) {
    emit('showToast', 'Minimum Requirement', 'Action plan must contain at least one activity row.', 'warning');
    return;
  }

  rows.value.splice(index, 1);
  emit('showToast', 'Row Removed', `Removed activity row #${index + 1}.`, 'info');
};

// ============================================================================
// LINE ITEM & BUDGET MODAL
// ============================================================================
const isBudgetModalOpen = ref(false);
const activeEditingRowIndex = ref<number | null>(null);
const tempLineItems = ref<BudgetLineItem[]>([]);
const isZeroBudgetToggle = ref(false);

const openBudgetModal = (index: number) => {
  const row = rows.value[index];
  if (!isRowEditable(row)) {
    emit('showToast', 'Read-Only Activity', 'This activity is submitted and locked for review.', 'info');
    return;
  }

  activeEditingRowIndex.value = index;
  isZeroBudgetToggle.value = row.isZeroBudget || (row.budget === 0 && row.budgetLineItems.length === 0);
  
  if (row.budgetLineItems && row.budgetLineItems.length > 0) {
    tempLineItems.value = JSON.parse(JSON.stringify(row.budgetLineItems));
  } else if (!isZeroBudgetToggle.value) {
    tempLineItems.value = [
      { id: 'item-1', description: 'Materials & supplies', quantity: 1, unitCost: row.budget || 500, total: row.budget || 500 }
    ];
  } else {
    tempLineItems.value = [];
  }

  isBudgetModalOpen.value = true;
};

const addTempLineItem = () => {
  tempLineItems.value.push({
    id: `item-${Date.now()}-${tempLineItems.value.length + 1}`,
    description: '',
    quantity: 1,
    unitCost: 0,
    total: 0
  });
};

const removeTempLineItem = (idx: number) => {
  tempLineItems.value.splice(idx, 1);
};

const updateTempItemTotal = (item: BudgetLineItem) => {
  const qty = Number(item.quantity) || 0;
  const cost = Number(item.unitCost) || 0;
  item.total = qty * cost;
};

const calculatedModalTotal = computed(() => {
  if (isZeroBudgetToggle.value) return 0;
  return tempLineItems.value.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
});

const saveBudgetModal = () => {
  if (activeEditingRowIndex.value === null) return;
  const targetRow = rows.value[activeEditingRowIndex.value];

  if (isZeroBudgetToggle.value) {
    targetRow.isZeroBudget = true;
    targetRow.budgetLineItems = [];
    targetRow.lineItemBudget = 'N/A (Zero-budget activity)';
    targetRow.budget = 0;
    targetRow.totalBudget = 0;
  } else {
    targetRow.isZeroBudget = false;
    targetRow.budgetLineItems = JSON.parse(JSON.stringify(tempLineItems.value));
    
    // Auto-generate formatted description string e.g. Snacks: 23 × ₱75 = ₱1,725.00
    const formattedParts = tempLineItems.value.map(item => {
      const desc = item.description.trim() || 'Expense item';
      return `${desc}: ${item.quantity} × ${formatCurrency(item.unitCost)} = ${formatCurrency(item.total)}`;
    });
    targetRow.lineItemBudget = formattedParts.join('; ') || 'Supplies and logistical requirements';
    targetRow.budget = calculatedModalTotal.value;
    targetRow.totalBudget = calculatedModalTotal.value;
  }

  isBudgetModalOpen.value = false;
  activeEditingRowIndex.value = null;
  emit('showToast', 'Budget Calculated', `Budget requirement updated to ${formatCurrency(targetRow.budget)}.`, 'success');
};

// ============================================================================
// PREVIEW ACTION PLAN MODAL
// ============================================================================
const isPreviewModalOpen = ref(false);

const handleOpenPreview = () => {
  isPreviewModalOpen.value = true;
};

// ============================================================================
// CONVERT ROWS TO FULL ACTIVITY RECORDS
// ============================================================================
const rowsToActivities = (statusOverride?: 'Draft' | 'Fully Approved' | 'Rejected'): Activity[] => {
  const isCol = isCollegeOrg(currentOrgId.value);
  const fyYearNum = props.fiscalYear.replace(/\D/g, '') || '2027';
  const stage1Label = isCol ? 'Stage 1: College Organization Submission' : 'Stage 1: Organization Submission';

  return rows.value.map((r, idx) => {
    const existing = r.originalActivity;
    const isApproved = statusOverride === 'Fully Approved' || (!statusOverride && (r.approvalStatus === 'Fully Approved' || r.status === 'Approved'));
    const isRejected = statusOverride === 'Rejected' || (!statusOverride && (r.approvalStatus === 'Rejected' || r.status === 'Rejected'));

    const effectiveStatus = isApproved ? 'Approved' : (isRejected ? 'Rejected' : 'Draft');
    const effectiveApprovalStatus = isApproved ? 'Fully Approved' : (isRejected ? 'Rejected' : 'Draft');
    const effectiveWorkflowStatus = isApproved ? 'COMPLETED' : (isRejected ? 'REJECTED' : 'DRAFT');
    const effectiveStage = isApproved ? 'Approved by Organization' : (isRejected ? 'Rejected by Organization' : stage1Label);

    const activityRecord: Activity = {
      ...(existing || {}),
      id: r.id,
      title: r.title.trim() || `Proposed Activity #${idx + 1}`,
      programActivity: r.title.trim() || `Proposed Activity #${idx + 1}`,
      orgId: currentOrgId.value,
      fiscalYear: props.fiscalYear,
      timeframeMonth: r.timeframeMonth,
      timeframeWeek: r.timeframeWeek,
      timeframe: `${r.timeframeMonth} (${r.timeframeWeek})`,
      startDate: existing?.startDate || `${fyYearNum}-01-15`,
      endDate: existing?.endDate || `${fyYearNum}-01-20`,
      venue: existing?.venue || 'MSU Naawan Campus',
      description: r.strategicObjectives || 'Proposed action plan initiative for student development.',
      strategicObjectives: r.strategicObjectives,
      expectedOutput: r.expectedOutput,
      office: r.office || defaultOffice.value,
      lineItemBudget: r.lineItemBudget || (r.isZeroBudget ? 'N/A' : 'Logistical requirements'),
      budgetLineItems: r.budgetLineItems,
      budget: r.budget,
      amount: r.budget,
      totalBudget: r.totalBudget || r.budget,
      fundSource: r.fundSource,
      personAssigned: r.personAssigned,
      status: effectiveStatus,
      approvalStatus: effectiveApprovalStatus as any,
      approvalStageIndex: 1,
      approvalStage: effectiveStage,
      workflowStatus: effectiveWorkflowStatus as any,
      currentApproverRole: effectiveStatus === 'Draft' ? 'ROLE_ORGANIZATION' : undefined,
      proposedBy: props.currentUser?.name || `${currentOrgId.value} President`,
      submittedDate: new Date().toISOString().split('T')[0],
      isActionPlanItem: true,
      source: 'ACTION_PLAN',
      version: r.version || 1,
      timeline: existing?.timeline || getInitialTimelineForActionPlan(currentOrgId.value),
      deferReason: r.deferReason,
      deferredRemarks: r.deferredRemarks,
      deferredBy: r.deferredBy,
      rejectionRemarks: isRejected ? (r.rejectionRemarks || 'Rejected by Organization') : undefined,
      rejectedBy: isRejected ? (props.currentUser?.name || `${currentOrgId.value} Officer`) : undefined,
      rejectedAt: isRejected ? new Date().toISOString() : undefined,
      isPlanConfirmed: existing?.isPlanConfirmed ?? false,
      confirmedBy: existing?.confirmedBy,
      confirmedAt: existing?.confirmedAt
    };

    return activityRecord;
  });
};

// ============================================================================
// SAVE DRAFT, SUBMISSION & CONFIRMATION
// ============================================================================
const isSaving = ref(false);

const handleSaveDraft = async () => {
  try {
    isSaving.value = true;
    const activitiesToSave = rowsToActivities();
    emit('saveDraft', activitiesToSave);
    emit('showToast', 'Action Plan Saved! 💾', `All ${activitiesToSave.length} activities saved with selected statuses.`, 'success');
  } catch (err: any) {
    emit('showToast', 'Save Error', err.message || 'Failed to save action plan activities.', 'warning');
  } finally {
    isSaving.value = false;
  }
};

const handleSubmitForApproval = async () => {
  // 1. Validation: check that each row has a title
  const emptyTitleIdx = rows.value.findIndex(r => !r.title.trim());
  if (emptyTitleIdx !== -1) {
    emit('showToast', 'Validation Error', `Activity Row #${emptyTitleIdx + 1} requires a Program/Activity Title.`, 'warning');
    return;
  }

  try {
    isSaving.value = true;
    const activitiesToSave = rowsToActivities();
    emit('submitApproval', activitiesToSave);
    emit('showToast', 'Action Plan Saved! 💾', `Successfully saved ${activitiesToSave.length} activities.`, 'success');
  } catch (err: any) {
    emit('showToast', 'Save Error', err.message || 'Failed to save action plan.', 'warning');
  } finally {
    isSaving.value = false;
  }
};

const handleConfirmActionPlanFromEditor = async () => {
  // 1. Validation: check that each row has a title
  const emptyTitleIdx = rows.value.findIndex(r => !r.title.trim());
  if (emptyTitleIdx !== -1) {
    emit('showToast', 'Validation Error', `Activity Row #${emptyTitleIdx + 1} requires a Program/Activity Title.`, 'warning');
    return;
  }

  // 2. Validation: check that any rejected row has rejectionRemarks
  const unremarkedRejectedIdx = rows.value.findIndex(r => r.approvalStatus === 'Rejected' && (!r.rejectionRemarks || !r.rejectionRemarks.trim()));
  if (unremarkedRejectedIdx !== -1) {
    const unremarkedRow = rows.value[unremarkedRejectedIdx];
    targetRowForRejection.value = unremarkedRow;
    editorRejectionReason.value = '';
    isRejectReasonModalOpen.value = true;
    emit('showToast', 'Rejection Reason Required', `Row #${unremarkedRejectedIdx + 1} is marked as Rejected. Please enter the reason why.`, 'warning');
    return;
  }

  try {
    isSaving.value = true;
    const activitiesToSave = rowsToActivities();
    const timestamp = new Date().toISOString();
    // Mark all decided activities as confirmed
    const confirmedActivities = activitiesToSave.map(a => {
      const isDecided = a.status === 'Approved' || a.status === 'Rejected' || a.approvalStatus === 'Fully Approved' || a.approvalStatus === 'Rejected';
      if (isDecided) {
        return {
          ...a,
          isPlanConfirmed: true,
          confirmedBy: props.currentUser?.name || `${currentOrgId.value} Officer`,
          confirmedAt: timestamp
        };
      }
      return a;
    });

    emit('submitApproval', confirmedActivities);
    emit('showToast', 'Action Plan Confirmed! 🎯', 'All activities confirmed and separated into Approved Plan and Rejected Activities.', 'success');
  } catch (err: any) {
    emit('showToast', 'Confirmation Error', err.message || 'Failed to confirm action plan.', 'warning');
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="space-y-5 animate-fade-in">
    <!-- Top Action Plan Header Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              Action Plan Editor
            </span>
            <span 
              v-if="currentOrg"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-md border shadow-2xs"
              :class="[
                getOrgTheme(currentOrgId).badgeBg,
                getOrgTheme(currentOrgId).badgeText,
                getOrgTheme(currentOrgId).badgeBorder
              ]"
            >
              <Building2 class="w-3.5 h-3.5 shrink-0" />
              <span>{{ currentOrg.name }} ({{ currentOrgId }})</span>
            </span>

            <span class="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              Target: {{ fiscalYear }}
            </span>

            <span 
              v-if="isPlanSubmitted"
              class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 flex items-center gap-1"
            >
              <Lock class="w-3 h-3 text-blue-600" />
              <span>Submitted (Read-Only)</span>
            </span>
            <span 
              v-else
              class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1"
            >
              <Sparkles class="w-3 h-3 text-emerald-600" />
              <span>Draft Mode &bull; Editing Enabled</span>
            </span>
          </div>

          <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{{ template.headerTitle }} &bull; {{ currentOrgId }}</span>
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Standard institutional template with 10 official columns. Add, edit, or adjust activities and itemized expenses.
          </p>
        </div>

        <!-- Header Actions: Back, Preview, Save Draft, Confirm -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            @click="emit('close')"
            class="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <X class="w-3.5 h-3.5" />
            <span>Close Editor</span>
          </button>

          <button
            type="button"
            @click="handleOpenPreview"
            class="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <Eye class="w-3.5 h-3.5 text-blue-600" />
            <span>Preview Plan</span>
          </button>

          <button
            type="button"
            @click="handleSaveDraft"
            :disabled="isSaving"
            class="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Save changes to database without final separation"
          >
            <Save class="w-3.5 h-3.5 text-slate-600" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            @click="handleConfirmActionPlanFromEditor"
            :disabled="isSaving"
            class="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
            title="Confirm decisions and separate activities into their respective cards"
          >
            <CheckCircle2 class="w-3.5 h-3.5 text-white" />
            <span>Confirm Action Plan</span>
          </button>
        </div>
      </div>

      <!-- Information Banner -->
      <div v-if="isPlanSubmitted" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
        <Info class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p class="font-bold">Action Plan Saved with Official Organization Statuses</p>
          <p class="text-blue-700 mt-0.5">
            The student organization has direct authority to approve, reject, or draft proposed activities for the Plan of Activities.
          </p>
        </div>
      </div>
    </div>

    <!-- Spreadsheet Editor Matrix -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <!-- Toolbar above spreadsheet -->
      <div class="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <FileSpreadsheet class="w-4 h-4 text-amber-700" />
          <span class="text-xs font-black text-slate-800 uppercase tracking-wide">
            Spreadsheet Activity Matrix ({{ rows.length }} {{ rows.length === 1 ? 'Activity' : 'Activities' }})
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="handleApproveAllRows"
            class="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
            title="Mark all activities as Approved"
          >
            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-700" />
            <span>Approve All</span>
          </button>
          <button
            type="button"
            @click="handleSetAllDraft"
            class="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
            title="Reset all activities to Draft"
          >
            <RotateCcw class="w-3.5 h-3.5 text-slate-500" />
            <span>Set All Draft</span>
          </button>
          <button
            type="button"
            @click="handleAddRow"
            class="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Add Activity Row</span>
          </button>
        </div>
      </div>

      <!-- Table Container with Horizontal Scroll -->
      <div class="overflow-auto w-full touch-scroll max-h-[calc(100vh-260px)] min-h-[380px] border-b border-slate-300 relative">
        <table class="w-full text-left text-xs border-collapse">
          <!-- Institutional Header Rows Matching Template -->
          <thead>
            <!-- Main Title Banner -->
            <tr :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">
              <th colspan="12" class="sticky top-0 z-20 px-4 py-2 text-center text-xs sm:text-sm font-black tracking-wider uppercase border border-red-950/20 shadow-xs" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">
                {{ template.headerTitle }} &bull; {{ currentOrg ? currentOrg.name : currentOrgId }}
              </th>
            </tr>

            <!-- Column Headers (Official 10 Columns + Row Operations & Status) -->
            <tr class="bg-amber-100 text-slate-800 font-bold border-b border-amber-200 text-center">
              <th rowspan="2" class="sticky top-[36px] z-20 px-2 py-2 border border-slate-300 w-24 text-center font-black bg-amber-100 text-slate-800 shadow-xs align-middle"># & Status</th>
              <th colspan="2" class="sticky top-[36px] z-20 px-3 py-1.5 border border-slate-300 font-black bg-amber-100 text-slate-800 shadow-xs">Timeframe</th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-3 py-2 border border-slate-300 min-w-[200px] text-left font-black bg-amber-100 text-slate-800 shadow-xs align-middle">Programs and Activities</th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-3 py-2 border border-slate-300 min-w-[220px] text-left font-black bg-amber-100 text-slate-800 shadow-xs align-middle">Strategic Objectives</th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-3 py-2 border border-slate-300 min-w-[200px] text-left font-black bg-amber-100 text-slate-800 shadow-xs align-middle">Expected Output</th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-2 py-2 border border-slate-300 w-24 text-center font-black bg-amber-100 text-slate-800 shadow-xs align-middle">Office</th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-3 py-2 border border-slate-300 min-w-[200px] text-left font-black bg-amber-100 text-slate-800 shadow-xs align-middle">Line Item Budget</th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-3 py-2 border border-slate-300 w-32 text-right font-black bg-amber-100 text-slate-800 shadow-xs align-middle">Budget Requirement</th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-3 py-2 border border-slate-300 w-36 text-center font-black bg-amber-100 text-slate-800 shadow-xs align-middle">
                <div class="flex items-center justify-center gap-1.5">
                  <span>Fund Source</span>
                  <QuickAddOptionButton
                    category="fund_source"
                    category-name="Fund Source"
                    :current-user="currentUser"
                    size="sm"
                  />
                </div>
              </th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-3 py-2 border border-slate-300 min-w-[150px] text-left font-black bg-amber-100 text-slate-800 shadow-xs align-middle">Person Assigned</th>
              <th rowspan="2" class="sticky top-[36px] z-20 px-2 py-2 border border-slate-300 w-28 text-center font-black bg-amber-100 text-slate-800 shadow-xs align-middle">Actions</th>
            </tr>
            <tr class="bg-amber-50 text-slate-700 font-bold border-b border-slate-300 text-center text-[11px]">
              <th class="sticky top-[68px] z-10 px-2 py-1 border border-slate-300 w-28 text-center bg-amber-50 text-slate-700 shadow-xs">
                <div class="flex items-center justify-center gap-1">
                  <span>Month</span>
                  <QuickAddOptionButton
                    category="timeframe"
                    category-name="Timeframe Month"
                    :current-user="currentUser"
                    size="sm"
                  />
                </div>
              </th>
              <th class="sticky top-[68px] z-10 px-2 py-1 border border-slate-300 w-28 text-center bg-amber-50 text-slate-700 shadow-xs">Week</th>
            </tr>
          </thead>

          <!-- Table Body: Rows -->
          <tbody class="divide-y divide-slate-200">
            <tr 
              v-for="(row, idx) in rows" 
              :key="row.id"
              class="hover:bg-slate-50/80 transition"
              :class="{
                'bg-amber-50/40': row.approvalStatus === 'Deferred',
                'bg-slate-50/50 opacity-90': !isRowEditable(row)
              }"
            >
              <!-- 1. Row Number and Status indicator -->
              <td class="px-2 py-2.5 text-center font-mono font-bold text-slate-500 border border-slate-200 align-top">
                <div class="flex flex-col items-center gap-1">
                  <span class="text-xs font-black text-slate-700">#{{ idx + 1 }}</span>
                  <select
                    v-model="row.approvalStatus"
                    @change="handleRowStatusChange(row)"
                    class="text-[9px] font-extrabold px-1.5 py-0.5 rounded border focus:outline-none cursor-pointer transition shadow-2xs"
                    :class="row.approvalStatus === 'Fully Approved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : (row.approvalStatus === 'Rejected'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300')"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Fully Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  <!-- Row Conflict & Redundancy Alert Pills (Section 2 & 3) -->
                  <div v-if="getRowConflicts(row).length > 0" class="mt-1 flex flex-col gap-0.5">
                    <span 
                      v-for="c in getRowConflicts(row)"
                      :key="c.id"
                      :title="`${c.title}: ${c.message}`"
                      class="inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.2 rounded border cursor-help shadow-2xs"
                      :class="c.type === 'similar_activity' 
                        ? 'bg-blue-50 text-blue-800 border-blue-200' 
                        : (c.type === 'confirmed_conflict' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200')"
                    >
                      <AlertCircle v-if="c.type === 'confirmed_conflict'" class="w-2.5 h-2.5 text-red-600" />
                      <AlertTriangle v-else-if="c.type === 'potential_conflict'" class="w-2.5 h-2.5 text-amber-600" />
                      <Info v-else class="w-2.5 h-2.5 text-blue-600" />
                      <span>{{ c.type === 'similar_activity' ? 'Similar' : (c.type === 'confirmed_conflict' ? 'DAD Conflict' : 'Overlap') }}</span>
                    </span>
                  </div>
                </div>
              </td>

              <!-- 2. Timeframe Month Selection (Inputable + Dropdown Choices) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <input
                  type="text"
                  list="monthOptionsList"
                  v-model="row.timeframeMonth"
                  :disabled="!isRowEditable(row)"
                  placeholder="Select or enter month"
                  class="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </td>

              <!-- 3. Timeframe Week Selection (Inputable + Dropdown Choices) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <input
                  type="text"
                  list="weekOptionsList"
                  v-model="row.timeframeWeek"
                  :disabled="!isRowEditable(row)"
                  placeholder="Select or enter week"
                  class="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </td>

              <!-- 4. Programs and Activities (Title) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <textarea
                  v-model="row.title"
                  :disabled="!isRowEditable(row)"
                  placeholder="Enter activity title..."
                  rows="2"
                  class="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600 resize-y"
                ></textarea>

                <!-- Rejection Reason Callout if row is rejected ("if reject add reason why") -->
                <div v-if="row.rejectionRemarks || row.approvalStatus === 'Rejected'" class="mt-1.5 p-2 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-[10px]">
                  <p class="font-bold flex items-center gap-1 text-rose-800">
                    <AlertCircle class="w-3 h-3 text-rose-600 shrink-0" />
                    <span>Rejection Reason:</span>
                  </p>
                  <p class="italic mt-0.5 text-slate-800">"{{ row.rejectionRemarks || 'Reason required' }}"</p>
                  <button
                    type="button"
                    @click="openRejectionReasonModal(row)"
                    class="mt-1 text-[10px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                  >
                    {{ row.rejectionRemarks ? 'Edit Reason' : 'Add Reason (Required)' }}
                  </button>
                </div>
              </td>

              <!-- 5. Strategic Objectives (Multiline text wrap) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <textarea
                  v-model="row.strategicObjectives"
                  :disabled="!isRowEditable(row)"
                  placeholder="Specify strategic objectives..."
                  rows="3"
                  class="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 resize-y leading-relaxed"
                ></textarea>
              </td>

              <!-- 6. Expected Output (Multiline text wrap) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <textarea
                  v-model="row.expectedOutput"
                  :disabled="!isRowEditable(row)"
                  placeholder="Specify expected outputs & results..."
                  rows="3"
                  class="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 resize-y leading-relaxed"
                ></textarea>
              </td>

              <!-- 7. Office -->
              <td class="p-1.5 border border-slate-200 align-top">
                <input
                  v-model="row.office"
                  :disabled="!isRowEditable(row)"
                  type="text"
                  class="w-full text-xs font-semibold text-center bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </td>

              <!-- 8. Line Item Budget with Interactive Expense Breakdown -->
              <td class="p-1.5 border border-slate-200 align-top">
                <div class="space-y-1.5">
                  <div class="text-[11px] text-slate-700 font-medium leading-tight max-h-16 overflow-y-auto">
                    {{ row.lineItemBudget || (row.isZeroBudget ? 'N/A (Zero-budget activity)' : 'No itemized expenses yet') }}
                  </div>

                  <button
                    type="button"
                    @click="openBudgetModal(idx)"
                    class="w-full px-2 py-1 text-[11px] font-bold rounded border transition cursor-pointer flex items-center justify-center gap-1"
                    :class="isRowEditable(row)
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-slate-100 text-slate-600 border-slate-300'"
                  >
                    <Calculator class="w-3 h-3 text-amber-700" />
                    <span>{{ isRowEditable(row) ? 'Edit Expenses' : 'View Expenses' }}</span>
                  </button>
                </div>
              </td>

              <!-- 9. Budget Requirement (Auto-calculated sum) -->
              <td class="p-2 border border-slate-200 text-right font-mono font-bold text-slate-900 align-top">
                <span :class="row.budget > 0 ? 'text-slate-900' : 'text-slate-400'">
                  {{ formatCurrency(row.budget) }}
                </span>
                <div v-if="row.isZeroBudget" class="text-[10px] font-semibold text-emerald-600">
                  Zero Budget / N/A
                </div>
              </td>

              <!-- 10. Fund Source Selection (Inputable + Dropdown Choices) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <input
                  type="text"
                  list="fundSourceOptionsList"
                  v-model="row.fundSource"
                  :disabled="!isRowEditable(row)"
                  placeholder="Select or enter fund source"
                  class="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </td>

              <!-- 11. Person Assigned -->
              <td class="p-1.5 border border-slate-200 align-top">
                <input
                  v-model="row.personAssigned"
                  :disabled="!isRowEditable(row)"
                  type="text"
                  placeholder="e.g. Org Officers"
                  class="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </td>

              <!-- 12. Row Operations (Insert Above, Insert Below, Remove) -->
              <td class="p-1.5 border border-slate-200 text-center align-top">
                <div class="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    @click="handleInsertRowAbove(idx)"
                    title="Insert Row Above"
                    class="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                  >
                    <ArrowUp class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="handleInsertRowBelow(idx)"
                    title="Insert Row Below"
                    class="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                  >
                    <ArrowDown class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="handleRemoveRow(idx)"
                    :disabled="!isRowEditable(row)"
                    title="Remove Draft Activity"
                    class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Table Footer: Total Proposed Budget at bottom -->
          <tfoot class="sticky bottom-0 z-20 bg-amber-100 font-black text-slate-900 border-t-2 border-slate-400 shadow-[0_-3px_6px_rgba(0,0,0,0.08)]">
            <tr class="bg-amber-100">
              <td colspan="8" class="sticky bottom-0 z-20 px-4 py-3 text-right uppercase tracking-wider text-xs border border-slate-300 bg-amber-100">
                {{ template.footerLabel || 'Total Projected Proposed Budget' }}
              </td>
              <td class="sticky bottom-0 z-20 px-3 py-3 text-right font-mono text-sm text-blue-900 font-black border border-slate-300 bg-amber-200">
                {{ formatCurrency(totalProposedBudget) }}
              </td>
              <td colspan="3" class="sticky bottom-0 z-20 px-3 py-3 text-slate-600 text-xs border border-slate-300 bg-amber-100">
                {{ rows.length }} Activities Planned
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Line Item Expenses Modal / Popover -->
    <div 
      v-if="isBudgetModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Modal Header -->
        <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Coins class="w-5 h-5 text-amber-600" />
            <div>
              <h3 class="text-sm font-bold text-slate-900">Line Item Expenses & Budget Calculation</h3>
              <p class="text-[11px] text-slate-500">
                Activity #{{ (activeEditingRowIndex ?? 0) + 1 }}: {{ rows[activeEditingRowIndex ?? 0]?.title || 'Proposed Activity' }}
              </p>
            </div>
          </div>
          <button 
            @click="isBudgetModalOpen = false" 
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-5 overflow-y-auto space-y-4 text-xs">
          <!-- Zero Budget / N/A Activity Checkbox -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <p class="font-bold text-slate-800">Zero Budget / N/A Activity</p>
              <p class="text-[11px] text-slate-500">Enable this if this activity does not require institutional budget funds.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="isZeroBudgetToggle" class="sr-only peer" />
              <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <!-- Line items table if not zero-budget -->
          <div v-if="!isZeroBudgetToggle" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-black text-slate-800 text-xs uppercase tracking-wide">Expense Entries</span>
              <button
                type="button"
                @click="addTempLineItem"
                class="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer flex items-center gap-1"
              >
                <Plus class="w-3 h-3" />
                <span>Add Expense Entry</span>
              </button>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th class="px-3 py-2">Description</th>
                    <th class="px-2 py-2 w-20 text-center">Qty</th>
                    <th class="px-3 py-2 w-28 text-right">Unit Cost (₱)</th>
                    <th class="px-3 py-2 w-32 text-right">Total (₱)</th>
                    <th class="px-2 py-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="(item, idx) in tempLineItems" :key="item.id" class="hover:bg-slate-50">
                    <td class="p-2">
                      <input
                        v-model="item.description"
                        type="text"
                        placeholder="e.g. Snacks, Certificates"
                        class="w-full text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td class="p-2">
                      <input
                        v-model.number="item.quantity"
                        @input="updateTempItemTotal(item)"
                        type="number"
                        min="0"
                        class="w-full text-xs text-center bg-white border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td class="p-2">
                      <input
                        v-model.number="item.unitCost"
                        @input="updateTempItemTotal(item)"
                        type="number"
                        min="0"
                        step="0.5"
                        class="w-full text-xs text-right font-mono bg-white border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td class="p-2 text-right font-mono font-bold text-slate-800">
                      {{ formatCurrency(item.total) }}
                    </td>
                    <td class="p-2 text-center">
                      <button
                        type="button"
                        @click="removeTempLineItem(idx)"
                        class="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-amber-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colspan="3" class="px-3 py-2 text-right uppercase text-[11px] text-slate-700">Calculated Activity Total:</td>
                    <td class="px-3 py-2 text-right font-mono font-black text-blue-900 text-xs">
                      {{ formatCurrency(calculatedModalTotal) }}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Example Helper -->
            <p class="text-[11px] text-slate-500 italic">
              Example: Snacks: 23 × ₱75.00 = ₱1,725.00. The sum is automatically displayed in Budget Requirement.
            </p>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div class="text-xs">
            <span class="text-slate-500">Calculated Budget:</span>
            <span class="ml-1.5 font-bold font-mono text-slate-900">
              {{ isZeroBudgetToggle ? '₱0.00 (N/A)' : formatCurrency(calculatedModalTotal) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="isBudgetModalOpen = false"
              class="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="saveBudgetModal"
              class="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Check class="w-3.5 h-3.5" />
              <span>Apply to Activity</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Official Preview Modal -->
    <div 
      v-if="isPreviewModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Eye class="w-5 h-5 text-blue-600" />
            <div>
              <h3 class="text-sm font-bold text-slate-900">Official Action Plan Document Preview</h3>
              <p class="text-[11px] text-slate-500">Mindanao State University at Naawan &bull; {{ fiscalYear }}</p>
            </div>
          </div>
          <button 
            @click="isPreviewModalOpen = false" 
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-4">
          <!-- Official Document Header -->
          <div class="text-center pb-4 border-b border-slate-200 space-y-1">
            <p class="text-xs uppercase tracking-wider text-slate-500 font-semibold">Mindanao State University at Naawan</p>
            <p class="text-xs uppercase tracking-wider text-slate-600 font-bold">Office of Student Development &bull; OVCSAS</p>
            <h2 class="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
              {{ currentOrg ? currentOrg.name : currentOrgId }}
            </h2>
            <h3 class="text-xs font-black text-blue-900 uppercase tracking-widest">
              {{ template.headerTitle }} FOR {{ fiscalYear.toUpperCase() }}
            </h3>
          </div>

          <!-- Official 10 Columns Table -->
          <div class="overflow-x-auto border border-slate-300 rounded-lg">
            <table class="w-full text-xs border-collapse">
              <thead>
                <tr class="bg-[#800000] text-white text-center font-bold">
                  <th colspan="2" class="p-2 border border-red-950/20">Timeframe</th>
                  <th rowspan="2" class="p-2 border border-red-950/20 text-left min-w-[160px]">Programs and Activities</th>
                  <th rowspan="2" class="p-2 border border-red-950/20 text-left min-w-[180px]">Strategic Objectives</th>
                  <th rowspan="2" class="p-2 border border-red-950/20 text-left min-w-[160px]">Expected Output</th>
                  <th rowspan="2" class="p-2 border border-red-950/20 text-center w-20">Office</th>
                  <th rowspan="2" class="p-2 border border-red-950/20 text-left min-w-[160px]">Line Item Budget</th>
                  <th rowspan="2" class="p-2 border border-red-950/20 text-right w-28">Budget Requirement</th>
                  <th rowspan="2" class="p-2 border border-red-950/20 text-center w-28">Fund Source</th>
                  <th rowspan="2" class="p-2 border border-red-950/20 text-left min-w-[130px]">Person Assigned</th>
                </tr>
                <tr class="bg-[#FCE5CD] text-slate-800 text-center font-bold text-[11px]">
                  <th class="p-1 border border-slate-300 w-24">Month</th>
                  <th class="p-1 border border-slate-300 w-24">Week</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="(r, idx) in rows" :key="r.id" class="hover:bg-slate-50">
                  <td class="p-2 border border-slate-200 text-center font-semibold">{{ r.timeframeMonth }}</td>
                  <td class="p-2 border border-slate-200 text-center">{{ r.timeframeWeek }}</td>
                  <td class="p-2 border border-slate-200 font-bold text-slate-900">{{ r.title || 'Untitled Activity' }}</td>
                  <td class="p-2 border border-slate-200 text-slate-700 whitespace-pre-wrap">{{ r.strategicObjectives || 'N/A' }}</td>
                  <td class="p-2 border border-slate-200 text-slate-700 whitespace-pre-wrap">{{ r.expectedOutput || 'N/A' }}</td>
                  <td class="p-2 border border-slate-200 text-center">{{ r.office }}</td>
                  <td class="p-2 border border-slate-200 text-slate-700 text-[11px]">{{ r.lineItemBudget || (r.isZeroBudget ? 'N/A' : 'None') }}</td>
                  <td class="p-2 border border-slate-200 text-right font-mono font-bold">{{ formatCurrency(r.budget) }}</td>
                  <td class="p-2 border border-slate-200 text-center">{{ r.fundSource }}</td>
                  <td class="p-2 border border-slate-200 text-slate-700">{{ r.personAssigned }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="bg-amber-100 font-black text-slate-900 border-t-2 border-slate-400">
                  <td colspan="7" class="p-2.5 text-right uppercase text-xs border border-slate-300">
                    Total Projected Budget:
                  </td>
                  <td class="p-2.5 text-right font-mono text-xs font-black text-blue-900 border border-slate-300">
                    {{ formatCurrency(totalProposedBudget) }}
                  </td>
                  <td colspan="2" class="p-2.5 text-slate-600 border border-slate-300 text-xs">
                    {{ rows.length }} Activities
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            @click="isPreviewModalOpen = false"
            class="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>

    <!-- Rejection Reason Modal for Editor Row ("if reject add reason why") -->
    <div
      v-if="isRejectReasonModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <AlertCircle class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900">Reason for Rejection Required</h3>
              <p class="text-xs text-slate-500">Provide why this activity is being rejected from the action plan</p>
            </div>
          </div>
          <button
            type="button"
            @click="handleCancelRowRejection"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div v-if="targetRowForRejection" class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Activity:</span>
          <span class="font-bold text-slate-900 text-sm">{{ targetRowForRejection.title || 'Untitled Activity' }}</span>
        </div>

        <div class="space-y-1.5">
          <label for="editor-rejection-reason" class="block text-xs font-bold text-slate-800">
            Mandatory Rejection Remarks / Justification <span class="text-rose-600">*</span>:
          </label>
          <textarea
            id="editor-rejection-reason"
            v-model="editorRejectionReason"
            rows="3"
            placeholder="Explain why this activity is rejected (e.g. out of scope, exceeding budget ceiling, duplicate, or rescheduled)..."
            class="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none resize-none leading-relaxed"
            autofocus
          ></textarea>
          <p class="text-[11px] text-slate-500">
            This justification will be permanently saved with the rejected activity record.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="handleCancelRowRejection"
            class="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleConfirmRowRejection"
            :disabled="!editorRejectionReason.trim()"
            class="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Check class="w-4 h-4 text-white" />
            <span>Save Reason</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Datalists for inputable fields with choices -->
    <datalist id="monthOptionsList">
      <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}</option>
    </datalist>
    <datalist id="weekOptionsList">
      <option v-for="w in weekOptions" :key="w" :value="w">{{ w }}</option>
    </datalist>
    <datalist id="fundSourceOptionsList">
      <option v-for="fs in fundSourceOptions" :key="fs" :value="fs">{{ fs }}</option>
    </datalist>
  </div>
</template>

