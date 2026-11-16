<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, markRaw } from 'vue';
import { 
  Activity, 
  UserAccount, 
  ActionPlanTemplate, 
  BudgetLineItem, 
  OrgId,
  StudentOrganization,
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
import { isActionPlanActivityApproved, isActivityRejectedStatus } from '../utils/activityVisibility';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
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
import { getOptionsByCategory, getOptionLabelsByCategory, syncOptionsWithBackend } from '../services/optionsService';
import QuickAddOptionButton from './QuickAddOptionButton.vue';
import { detectActionPlanConflicts, ConflictItem } from '../utils/conflictDetection';
import {
  deriveDateRangeFromTimeframe,
  buildMonthCalendarGrid,
  formatWeekSummaryFromDates,
  extractCalendarDaysFromWeekLabel,
  getMonthNumberFromLabel,
  extractIsoDate
} from '../utils/activityDate';
import { formatLineItemBudgetText } from '../utils/budgetFormat';
import {
  buildDraftKey,
  loadLocalDraft,
  clearLocalDraft,
  formatDraftTime,
  createDraftAutosaveController
} from '../utils/draftStorage';

interface EditorRow {
  id: string;
  timeframeMonth: string;
  timeframeWeek: string;
  selectedDates?: string[];
  startDate?: string;
  endDate?: string;
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
    targetOrg?: OrgId;
    organizations?: StudentOrganization[];
    initialActivities?: Activity[];
    template?: ActionPlanTemplate;
  }>(),
  {
    organizations: () => [],
    initialActivities: () => [],
    template: () => DEFAULT_MSUN_ACTION_PLAN_TEMPLATE
  }
);

const emit = defineEmits<{
  (e: 'saveDraft', activities: Activity[], deletedIds: string[]): void;
  (e: 'submitApproval', activities: Activity[], deletedIds: string[]): void;
  (e: 'close'): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

// Organization resolution
const currentOrgId = computed<OrgId>(() => {
  if (props.targetOrg && props.targetOrg !== 'ALL' && props.targetOrg !== 'ADMIN' && props.targetOrg !== 'COLLEGE') {
    return props.targetOrg as OrgId;
  }
  if (props.currentUser?.orgId && props.currentUser.orgId !== 'ADMIN' && props.currentUser.orgId !== 'COLLEGE') {
    return props.currentUser.orgId as OrgId;
  }
  if (props.currentUser?.parentOrg && props.currentUser.parentOrg !== 'ADMIN' && props.currentUser.parentOrg !== 'COLLEGE') {
    return props.currentUser.parentOrg as OrgId;
  }
  return 'CBIT';
});

const currentOrg = computed(() => {
  const pool = (props.organizations && props.organizations.length > 0) ? props.organizations : ORGANIZATIONS;
  return (
    pool.find(o => isSameOrg(o.id, currentOrgId.value) || (o.acronym ? isSameOrg(o.acronym, currentOrgId.value) : false)) ||
    ORGANIZATIONS.find(o => isSameOrg(o.id, currentOrgId.value))
  );
});

// Dynamic Database Options (APMAMS UPDATE 7)
const dynamicFundSources = getOptionLabelsByCategory('fund_source');
const dynamicMonths = getOptionLabelsByCategory('timeframe');
const allMonths = getOptionsByCategory('timeframe', false);
const dynamicOffices = getOptionLabelsByCategory('office');
const dynamicPersonsAssigned = getOptionLabelsByCategory('person_assigned');

const CALENDAR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Month options driven by active Options Management entries when seeded
const monthOptions = computed(() => {
  if (allMonths.value.length > 0) {
    return Array.from(new Set(dynamicMonths.value));
  }
  return CALENDAR_MONTHS;
});

const fundSourceOptions = computed(() => {
  if (dynamicFundSources.value.length > 0) {
    return dynamicFundSources.value;
  }
  const col = props.template.columns.find(c => c.fieldKey === 'fundSource');
  return col?.options || [
    'Organizational Fund',
    'OSD Fund',
    'University Fund',
    'Senior Class Fund',
    'Sponsorship',
    'Student Development Fund',
    'Other authorized funding sources'
  ];
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
    timeframeMonth: prefill?.timeframeMonth ?? '',
    timeframeWeek: prefill?.timeframeWeek ?? '',
    selectedDates: prefill?.selectedDates ?? [],
    startDate: prefill?.startDate ?? '',
    endDate: prefill?.endDate ?? '',
    title: prefill?.title ?? '',
    strategicObjectives: prefill?.strategicObjectives ?? '',
    expectedOutput: prefill?.expectedOutput ?? '',
    office: prefill?.office ?? '',
    lineItemBudget: prefill?.lineItemBudget ?? '',
    budgetLineItems: prefill?.budgetLineItems ?? [],
    budget: prefill?.budget ?? 0,
    totalBudget: prefill?.totalBudget ?? prefill?.budget ?? 0,
    fundSource: prefill?.fundSource ?? '',
    personAssigned: prefill?.personAssigned ?? '',
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
      description: formatLineItemBudgetText(undefined, act.lineItemBudget) || act.lineItemBudget,
      quantity: 1,
      unitCost: act.budget || act.totalBudget || 0,
      total: act.budget || act.totalBudget || 0
    }];
  }

  const isPlanRejected = isActivityRejectedStatus(act);
  const isPlanApproved = !isPlanRejected && isActionPlanActivityApproved(act);
  const resolvedApprovalStatus = isPlanRejected
    ? 'Rejected'
    : isPlanApproved
      ? 'Fully Approved'
      : (act.approvalStatus === 'Deferred' || act.status === 'DEFERRED' ? 'Deferred' : 'Draft');

  const resolvedMonth = act.timeframeMonth || 'January';
  const resolvedWeek = act.timeframeWeek || '1st Week';
  const explicitSelected = Array.isArray(act.selectedDates) && act.selectedDates.length > 0
    ? act.selectedDates.map(d => extractIsoDate(d)).filter(Boolean).sort()
    : extractCalendarDaysFromWeekLabel(resolvedWeek, resolvedMonth, act.fiscalYear || props.fiscalYear);

  return {
    id: act.id,
    timeframeMonth: resolvedMonth,
    timeframeWeek: resolvedWeek,
    selectedDates: explicitSelected,
    startDate: extractIsoDate(act.startDate),
    endDate: extractIsoDate(act.endDate),
    title: act.title || '',
    strategicObjectives: act.strategicObjectives || act.description || '',
    expectedOutput: act.expectedOutput || act.kpiOutcome || '',
    office: act.office || defaultOffice.value,
    lineItemBudget: formatLineItemBudgetText(lineItems, act.lineItemBudget, zeroBudget),
    budgetLineItems: lineItems,
    budget: act.budget ?? act.amount ?? 0,
    totalBudget: act.totalBudget ?? act.budget ?? 0,
    fundSource: act.fundSource || 'Organizational Fund',
    personAssigned: act.personAssigned || act.proposedBy || `${act.orgId} Officers`,
    status: isPlanRejected ? 'Rejected' : isPlanApproved ? 'Approved' : (act.status || 'Draft'),
    approvalStatus: resolvedApprovalStatus,
    isZeroBudget: zeroBudget,
    version: act.version || 1,
    deferReason: act.deferReason || act.deferredRemarks,
    deferredRemarks: act.deferredRemarks || act.deferReason,
    deferredBy: act.deferredBy,
    rejectionRemarks: act.rejectionRemarks,
    originalActivity: markRaw(act)
  };
};

const isBlankEditorRow = (r?: Partial<EditorRow> | null): boolean => {
  if (!r) return true;
  return (
    !(r.title || '').trim() &&
    !(r.strategicObjectives || '').trim() &&
    !(r.expectedOutput || '').trim() &&
    !(Number(r.budget) > 0) &&
    (!Array.isArray(r.budgetLineItems) || r.budgetLineItems.length === 0)
  );
};

const deletedActivityIds = ref<string[]>([]);

// Initialize rows from initialActivities (deduplicated) or create 1 default blank row
const loadInitialRows = () => {
  const seenIds = new Set<string>();
  const matching = props.initialActivities.filter(a => {
    if (!isSameOrg(a.orgId, currentOrgId.value)) return false;
    if (!a.id || seenIds.has(a.id)) return false;
    seenIds.add(a.id);
    return true;
  });
  deletedActivityIds.value = [];
  if (matching.length > 0) {
    rows.value = matching.map(activityToRow);
  } else {
    rows.value = [createEmptyRow()];
  }
};

// Action Plan Conflict & Redundancy Detection (memoized per row so keystrokes never recompute twice per cell)
const rowConflictsById = computed<Record<string, ConflictItem[]>>(() => {
  const map: Record<string, ConflictItem[]> = {};
  const existing = props.initialActivities || [];
  for (const row of rows.value) {
    if (!row.title || row.title.trim().length < 3) {
      map[row.id] = [];
      continue;
    }
    map[row.id] = detectActionPlanConflicts(
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
      existing
    );
  }
  return map;
});

const draftKey = computed(() =>
  buildDraftKey(props.currentUser?.id, 'action_plan_editor', `${currentOrgId.value}_${props.fiscalYear}`)
);
const restoredDraftAt = ref<string | null>(null);
const lastAutoSavedAt = ref<string | null>(null);
let isHydratingDraft = false;

type CachedEditorRow = Omit<EditorRow, 'originalActivity'>;

const autosave = createDraftAutosaveController<CachedEditorRow[]>(
  () => draftKey.value,
  () => rows.value.map(({ originalActivity: _orig, ...rest }) => rest),
  (savedAt) => {
    lastAutoSavedAt.value = savedAt;
  }
);

const discardLocalDraft = () => {
  autosave.cancel();
  clearLocalDraft(draftKey.value);
  restoredDraftAt.value = null;
  lastAutoSavedAt.value = null;
  deletedActivityIds.value = [];
  isHydratingDraft = true;
  loadInitialRows();
  nextTick(() => {
    isHydratingDraft = false;
  });
  emit('showToast', 'Local Draft Discarded', 'Restored saved Action Plan rows from database.', 'info');
};

onMounted(() => {
  isHydratingDraft = true;
  loadInitialRows();
  syncOptionsWithBackend().catch(() => {});
  const saved = loadLocalDraft<CachedEditorRow[]>(draftKey.value);
  if (saved?.data && Array.isArray(saved.data) && saved.data.length > 0 && !isPlanSubmitted.value) {
    if (!saved.data.some(r => !isBlankEditorRow(r))) {
      clearLocalDraft(draftKey.value);
    } else {
      const origMap = new Map(props.initialActivities.map(a => [a.id, a]));
      const seenIds = new Set<string>();
      const hydrated: EditorRow[] = [];

      for (const r of saved.data) {
        let orig = origMap.get(r.id);
        if (!orig && saved.data.length === 1 && props.initialActivities.length === 1) {
          const candidate = props.initialActivities[0];
          if (
            candidate &&
            (r.title || '').trim().toLowerCase() === (candidate.title || '').trim().toLowerCase()
          ) {
            orig = candidate;
          }
        }
        const effectiveId = orig ? orig.id : r.id;
        if (!effectiveId || seenIds.has(effectiveId)) continue;
        seenIds.add(effectiveId);

        if (orig && (isActionPlanActivityApproved(orig) || isActivityRejectedStatus(orig))) {
          hydrated.push(activityToRow(orig));
          continue;
        }
        const hydratedDates = Array.isArray(r.selectedDates) && r.selectedDates.length > 0
          ? r.selectedDates.map(d => extractIsoDate(d)).filter(Boolean).sort()
          : extractCalendarDaysFromWeekLabel(r.timeframeWeek, r.timeframeMonth, props.fiscalYear);
        hydrated.push({
          ...r,
          id: effectiveId,
          selectedDates: hydratedDates,
          lineItemBudget: formatLineItemBudgetText(r.budgetLineItems, r.lineItemBudget, r.isZeroBudget),
          originalActivity: orig ? markRaw(orig) : undefined
        });
      }

      for (const orig of props.initialActivities) {
        if (
          isSameOrg(orig.orgId, currentOrgId.value) &&
          !seenIds.has(orig.id) &&
          (isActionPlanActivityApproved(orig) || isActivityRejectedStatus(orig))
        ) {
          seenIds.add(orig.id);
          hydrated.push(activityToRow(orig));
        }
      }

      if (hydrated.length > 0) {
        rows.value = hydrated;
        restoredDraftAt.value = saved.savedAt;
        lastAutoSavedAt.value = saved.savedAt;
      }
    }
  }
  nextTick(() => {
    isHydratingDraft = false;
  });
});

watch(
  rows,
  () => {
    if (!isHydratingDraft && !isPlanSubmitted.value) {
      if (rows.value.every(isBlankEditorRow) && deletedActivityIds.value.length === 0) {
        autosave.cancel();
        clearLocalDraft(draftKey.value);
        lastAutoSavedAt.value = null;
      } else {
        autosave.schedule();
      }
    }
  },
  { deep: true }
);

onUnmounted(() => {
  autosave.destroy();
});

watch(
  () => props.initialActivities,
  (newActs) => {
    if (
      newActs &&
      newActs.length > 0 &&
      !restoredDraftAt.value &&
      deletedActivityIds.value.length === 0 &&
      (rows.value.length === 0 || rows.value.every(isBlankEditorRow))
    ) {
      isHydratingDraft = true;
      loadInitialRows();
      nextTick(() => {
        isHydratingDraft = false;
      });
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

const isRowEditable = (row: EditorRow): boolean => {
  if (!row) return true;
  // Approved or Rejected activities decided in the Action Plan are locked and cannot be edited
  if (
    row.originalActivity &&
    (isActionPlanActivityApproved(row.originalActivity) || isActivityRejectedStatus(row.originalActivity))
  ) {
    return false;
  }
  return row.approvalStatus !== 'Fully Approved' && row.approvalStatus !== 'Rejected';
};

// ============================================================================
// TIMEFRAME MINI CALENDAR PICKER POPUP
// ============================================================================
const isCalendarPopupOpen = ref(false);
const activeCalendarRowIndex = ref<number | null>(null);
const calendarPopupMonth = ref<string>('January');
const calendarSelectedDates = ref<string[]>([]);

const calendarGrid = computed(() => {
  return (
    buildMonthCalendarGrid(calendarPopupMonth.value, props.fiscalYear) ||
    buildMonthCalendarGrid('January', props.fiscalYear)!
  );
});

const calendarLeadingBlanks = computed(() => {
  const count = calendarGrid.value?.firstWeekday || 0;
  return Array.from({ length: count }, (_, i) => i);
});

const calendarWeekRanges = computed(() => {
  const grid = calendarGrid.value;
  if (!grid) return [];
  const candidates = [
    { weekIndex: 1, label: '1st Week', startDay: 1, endDay: 7 },
    { weekIndex: 2, label: '2nd Week', startDay: 8, endDay: Math.min(14, grid.daysInMonth) },
    { weekIndex: 3, label: '3rd Week', startDay: 15, endDay: Math.min(21, grid.daysInMonth) },
    { weekIndex: 4, label: '4th Week', startDay: 22, endDay: Math.min(28, grid.daysInMonth) },
    { weekIndex: 5, label: 'Last Week', startDay: grid.daysInMonth > 28 ? 29 : Math.max(1, grid.daysInMonth - 6), endDay: grid.daysInMonth }
  ];
  return candidates.map(w => {
    const dates = grid.days
      .filter(d => d.day >= w.startDay && d.day <= w.endDay)
      .map(d => d.isoDate);
    return { ...w, dates };
  });
});

const calendarSelectionSummary = computed(() => {
  return formatWeekSummaryFromDates(
    calendarSelectedDates.value,
    calendarPopupMonth.value,
    props.fiscalYear
  );
});

const handleMonthChange = (row: EditorRow) => {
  if (!isRowEditable(row)) return;
  const newMonthNum = getMonthNumberFromLabel(row.timeframeMonth);
  if (!newMonthNum) return;

  const validDates = (row.selectedDates || []).filter(d => Number(d.slice(5, 7)) === newMonthNum);
  if (validDates.length !== (row.selectedDates || []).length) {
    row.selectedDates = validDates;
    if (validDates.length > 0) {
      const summary = formatWeekSummaryFromDates(validDates, row.timeframeMonth, props.fiscalYear);
      row.timeframeWeek = summary.weekLabel;
      row.startDate = summary.startDate;
      row.endDate = summary.endDate;
    } else {
      row.startDate = '';
      row.endDate = '';
      if (row.timeframeWeek && /\([^)]+\)/.test(row.timeframeWeek)) {
        row.timeframeWeek = '';
      }
    }
  }
};

const openCalendarPicker = (index: number) => {
  const row = rows.value[index];
  if (!row || !isRowEditable(row)) return;

  const targetMonth = row.timeframeMonth || monthOptions.value[0] || 'January';
  calendarPopupMonth.value = targetMonth;
  activeCalendarRowIndex.value = index;

  const targetMonthNum = getMonthNumberFromLabel(targetMonth);
  let seeded: string[] = [];

  if (Array.isArray(row.selectedDates) && row.selectedDates.length > 0) {
    seeded = row.selectedDates.filter(d => !targetMonthNum || Number(d.slice(5, 7)) === targetMonthNum);
  }
  if (seeded.length === 0 && row.timeframeWeek) {
    seeded = extractCalendarDaysFromWeekLabel(row.timeframeWeek, targetMonth, props.fiscalYear);
  }
  if (seeded.length === 0 && row.startDate && (!targetMonthNum || Number(row.startDate.slice(5, 7)) === targetMonthNum)) {
    const startDay = Number(row.startDate.slice(8, 10));
    const endIso = row.endDate && (!targetMonthNum || Number(row.endDate.slice(5, 7)) === targetMonthNum) ? row.endDate : row.startDate;
    const endDay = Number(endIso.slice(8, 10));
    const grid = buildMonthCalendarGrid(targetMonth, props.fiscalYear);
    if (grid && startDay >= 1 && endDay >= startDay) {
      seeded = grid.days.filter(d => d.day >= startDay && d.day <= endDay).map(d => d.isoDate);
    }
  }

  calendarSelectedDates.value = Array.from(new Set(seeded)).sort();
  isCalendarPopupOpen.value = true;
};

const handleCalendarPopupMonthSwitch = (newMonth: string) => {
  calendarPopupMonth.value = newMonth;
  calendarSelectedDates.value = [];
};

const isDaySelected = (isoDate: string): boolean => {
  return calendarSelectedDates.value.includes(isoDate);
};

const toggleCalendarDay = (isoDate: string) => {
  if (calendarSelectedDates.value.includes(isoDate)) {
    calendarSelectedDates.value = calendarSelectedDates.value.filter(d => d !== isoDate);
  } else {
    calendarSelectedDates.value = [...calendarSelectedDates.value, isoDate].sort();
  }
};

const isCalendarWeekFullySelected = (dates: string[]): boolean => {
  return dates.length > 0 && dates.every(d => calendarSelectedDates.value.includes(d));
};

const toggleCalendarWeekRange = (dates: string[]) => {
  if (isCalendarWeekFullySelected(dates)) {
    const removeSet = new Set(dates);
    calendarSelectedDates.value = calendarSelectedDates.value.filter(d => !removeSet.has(d));
  } else {
    calendarSelectedDates.value = Array.from(new Set([...calendarSelectedDates.value, ...dates])).sort();
  }
};

const toggleEntireCalendarMonth = () => {
  const allDates = (calendarGrid.value?.days || []).map(d => d.isoDate);
  if (allDates.length > 0 && calendarSelectedDates.value.length === allDates.length) {
    calendarSelectedDates.value = [];
  } else {
    calendarSelectedDates.value = allDates;
  }
};

const clearCalendarSelection = () => {
  calendarSelectedDates.value = [];
};

const applyCalendarSelection = () => {
  if (activeCalendarRowIndex.value === null) return;
  const row = rows.value[activeCalendarRowIndex.value];
  if (!row || !isRowEditable(row)) {
    isCalendarPopupOpen.value = false;
    activeCalendarRowIndex.value = null;
    return;
  }

  const summary = calendarSelectionSummary.value;
  row.timeframeMonth = calendarPopupMonth.value;
  row.selectedDates = summary.sortedDates;
  row.timeframeWeek = summary.weekLabel;
  row.startDate = summary.startDate;
  row.endDate = summary.endDate;

  isCalendarPopupOpen.value = false;
  activeCalendarRowIndex.value = null;
};

// ============================================================================
// ROW OPERATIONS
// ============================================================================

const handleAddRow = () => {
  rows.value.push(createEmptyRow());
  emit('showToast', 'Activity Row Added', 'New activity row added at the bottom.', 'info');
};

const handleMoveRowUp = (index: number) => {
  if (index <= 0) return;
  const updated = [...rows.value];
  [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
  rows.value = updated;
};

const handleMoveRowDown = (index: number) => {
  if (index >= rows.value.length - 1) return;
  const updated = [...rows.value];
  [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
  rows.value = updated;
};

const handleRemoveRow = (index: number) => {
  const target = rows.value[index];
  if (!target) return;
  if (!isRowEditable(target)) {
    emit('showToast', 'Cannot Remove', 'This activity has already been submitted for approval and is locked.', 'warning');
    return;
  }

  if (target.originalActivity || props.initialActivities.some(a => a.id === target.id)) {
    if (!deletedActivityIds.value.includes(target.id)) {
      deletedActivityIds.value.push(target.id);
    }
  }

  if (rows.value.length <= 1) {
    rows.value = [createEmptyRow()];
    emit(
      'showToast',
      'Draft Row Cleared',
      'Draft row removed. Click "Save Draft" or "Confirm Action Plan" to update Proposed Plan.',
      'info'
    );
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

const isBudgetModalReadOnly = computed(() => {
  if (activeEditingRowIndex.value === null) return false;
  const row = rows.value[activeEditingRowIndex.value];
  return row ? !isRowEditable(row) : false;
});

const openBudgetModal = (index: number) => {
  const row = rows.value[index];
  if (!row) return;

  activeEditingRowIndex.value = index;
  isZeroBudgetToggle.value = row.isZeroBudget || (row.budget === 0 && row.budgetLineItems.length === 0);
  
  if (row.budgetLineItems && row.budgetLineItems.length > 0) {
    tempLineItems.value = JSON.parse(JSON.stringify(row.budgetLineItems));
  } else if (!isZeroBudgetToggle.value && isRowEditable(row)) {
    tempLineItems.value = [
      { id: 'item-1', description: 'Materials & supplies', quantity: 1, unitCost: row.budget || 500, total: row.budget || 500 }
    ];
  } else {
    tempLineItems.value = [];
  }

  isBudgetModalOpen.value = true;
};

const addTempLineItem = () => {
  if (isBudgetModalReadOnly.value) return;
  tempLineItems.value.push({
    id: `item-${Date.now()}-${tempLineItems.value.length + 1}`,
    description: '',
    quantity: 1,
    unitCost: 0,
    total: 0
  });
};

const removeTempLineItem = (idx: number) => {
  if (isBudgetModalReadOnly.value) return;
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
  if (!targetRow || !isRowEditable(targetRow)) {
    isBudgetModalOpen.value = false;
    activeEditingRowIndex.value = null;
    return;
  }

  if (isZeroBudgetToggle.value) {
    targetRow.isZeroBudget = true;
    targetRow.budgetLineItems = [];
    targetRow.lineItemBudget = 'N/A (Zero-budget activity)';
    targetRow.budget = 0;
    targetRow.totalBudget = 0;
  } else {
    targetRow.isZeroBudget = false;
    targetRow.budgetLineItems = JSON.parse(JSON.stringify(tempLineItems.value));
    
    // Store item names only (without numeric calculation formulas)
    targetRow.lineItemBudget =
      formatLineItemBudgetText(targetRow.budgetLineItems, undefined, false) ||
      'Supplies and logistical requirements';
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
// CONVERT ROWS TO FULL ACTIVITY RECORDS & RECONCILE DELETIONS
// ============================================================================
const rowsToActivities = (statusOverride?: 'Draft' | 'Fully Approved' | 'Rejected'): Activity[] => {
  const isCol = isCollegeOrg(currentOrgId.value);
  const fyYearNum = props.fiscalYear.replace(/\D/g, '') || '2027';
  const stage1Label = isCol ? 'Stage 1: College Organization Submission' : 'Stage 1: Organization Submission';

  const nonBlankRows = rows.value.filter(r => !isBlankEditorRow(r) || !isRowEditable(r));
  const seenIds = new Set<string>();
  const results: Activity[] = [];

  nonBlankRows.forEach((r, idx) => {
    if (!r.id || seenIds.has(r.id)) return;
    seenIds.add(r.id);

    const existing = r.originalActivity;
    // Preserve already-decided (Approved or Rejected) rows unchanged
    if (existing && !isRowEditable(r)) {
      results.push(existing);
      return;
    }
    const isApproved = statusOverride === 'Fully Approved' || (!statusOverride && (r.approvalStatus === 'Fully Approved' || r.status === 'Approved'));
    const isRejected = statusOverride === 'Rejected' || (!statusOverride && (r.approvalStatus === 'Rejected' || r.status === 'Rejected'));

    const effectiveStatus = isApproved ? 'Approved' : (isRejected ? 'Rejected' : 'Draft');
    const effectiveApprovalStatus = isApproved ? 'Fully Approved' : (isRejected ? 'Rejected' : 'Draft');
    const effectiveWorkflowStatus = isApproved ? 'COMPLETED' : (isRejected ? 'REJECTED' : 'DRAFT');
    const effectiveStage = isApproved ? 'Approved by Organization' : (isRejected ? 'Rejected by Organization' : stage1Label);

    const sortedSelected = (r.selectedDates || []).map(d => extractIsoDate(d)).filter(Boolean).sort();
    const derivedRange = deriveDateRangeFromTimeframe(r.timeframeMonth, r.timeframeWeek, props.fiscalYear);
    const isOldDummyDate =
      existing?.startDate === `${fyYearNum}-01-15` &&
      r.timeframeMonth &&
      r.timeframeMonth.trim().toLowerCase() !== 'january';
    const resolvedStartDate =
      existing?.designForm?.dateImplementation ||
      (sortedSelected.length > 0 ? sortedSelected[0] : '') ||
      derivedRange?.startDate ||
      (!isOldDummyDate ? existing?.startDate : '') ||
      `${fyYearNum}-01-15`;
    const resolvedEndDate =
      (sortedSelected.length > 0 ? sortedSelected[sortedSelected.length - 1] : '') ||
      derivedRange?.endDate ||
      (!isOldDummyDate ? existing?.endDate : '') ||
      resolvedStartDate;

    const cleanLineItemBudget =
      formatLineItemBudgetText(r.budgetLineItems, r.lineItemBudget, r.isZeroBudget) ||
      (r.isZeroBudget ? 'N/A (Zero-budget activity)' : 'Logistical requirements');

    const activityRecord: Activity = {
      ...(existing || {}),
      id: r.id,
      title: r.title.trim() || `Proposed Activity #${idx + 1}`,
      programActivity: r.title.trim() || `Proposed Activity #${idx + 1}`,
      orgId: currentOrgId.value,
      fiscalYear: props.fiscalYear,
      timeframeMonth: r.timeframeMonth,
      timeframeWeek: r.timeframeWeek,
      selectedDates: sortedSelected.length > 0 ? sortedSelected : undefined,
      timeframe: [r.timeframeMonth, r.timeframeWeek ? `(${r.timeframeWeek})` : ''].filter(Boolean).join(' '),
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      venue: existing?.venue || 'MSU Naawan Campus',
      description: r.strategicObjectives || 'Proposed action plan initiative for student development.',
      strategicObjectives: r.strategicObjectives,
      expectedOutput: r.expectedOutput,
      office: r.office || '',
      lineItemBudget: cleanLineItemBudget,
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

    results.push(activityRecord);
  });

  return results;
};

const collectDeletedIds = (savedList: Activity[]): string[] => {
  const savedIdSet = new Set(savedList.map(a => a.id));
  const missingExistingIds = props.initialActivities
    .filter(a => isSameOrg(a.orgId, currentOrgId.value) && !savedIdSet.has(a.id))
    .filter(a => !isActionPlanActivityApproved(a) && !isActivityRejectedStatus(a))
    .map(a => a.id);
  return Array.from(new Set([...deletedActivityIds.value, ...missingExistingIds])).filter(
    id => Boolean(id) && !savedIdSet.has(id)
  );
};

const syncEditorRowsAfterSave = (savedList: Activity[]) => {
  deletedActivityIds.value = [];
  isHydratingDraft = true;
  rows.value = savedList.length > 0 ? savedList.map(activityToRow) : [createEmptyRow()];
  nextTick(() => {
    isHydratingDraft = false;
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
    const removedIds = collectDeletedIds(activitiesToSave);
    if (activitiesToSave.length === 0 && removedIds.length === 0) {
      emit('showToast', 'Nothing to Save', 'Please enter at least one activity title before saving.', 'warning');
      return;
    }

    autosave.cancel();
    clearLocalDraft(draftKey.value);
    restoredDraftAt.value = null;
    lastAutoSavedAt.value = null;
    emit('saveDraft', activitiesToSave, removedIds);
    syncEditorRowsAfterSave(activitiesToSave);
    emit(
      'showToast',
      'Action Plan Draft Saved! 💾',
      removedIds.length > 0
        ? `Saved ${activitiesToSave.length} ${activitiesToSave.length === 1 ? 'activity' : 'activities'} and removed ${removedIds.length} deleted draft${removedIds.length === 1 ? '' : 's'}.`
        : `All ${activitiesToSave.length} activities saved.`,
      'success'
    );
  } catch (err: any) {
    emit('showToast', 'Save Error', err.message || 'Failed to save action plan activities.', 'warning');
  } finally {
    isSaving.value = false;
  }
};

const handleSubmitForApproval = async () => {
  // 1. Validation: check that each non-blank editable row has a title
  const emptyTitleIdx = rows.value.findIndex(r => isRowEditable(r) && !isBlankEditorRow(r) && !r.title.trim());
  if (emptyTitleIdx !== -1) {
    emit('showToast', 'Validation Error', `Activity Row #${emptyTitleIdx + 1} requires a Program/Activity Title.`, 'warning');
    return;
  }

  try {
    isSaving.value = true;
    const activitiesToSave = rowsToActivities();
    const removedIds = collectDeletedIds(activitiesToSave);
    if (activitiesToSave.length === 0 && removedIds.length === 0) {
      emit('showToast', 'Nothing to Save', 'Please enter at least one activity title before saving.', 'warning');
      return;
    }

    autosave.cancel();
    clearLocalDraft(draftKey.value);
    restoredDraftAt.value = null;
    lastAutoSavedAt.value = null;
    emit('submitApproval', activitiesToSave, removedIds);
    syncEditorRowsAfterSave(activitiesToSave);
    emit('showToast', 'Action Plan Saved! 💾', `Successfully saved ${activitiesToSave.length} activities.`, 'success');
  } catch (err: any) {
    emit('showToast', 'Save Error', err.message || 'Failed to save action plan.', 'warning');
  } finally {
    isSaving.value = false;
  }
};

const handleConfirmActionPlanFromEditor = async () => {
  // 1. Validation: check that each non-blank editable row has a title
  const emptyTitleIdx = rows.value.findIndex(r => isRowEditable(r) && !isBlankEditorRow(r) && !r.title.trim());
  if (emptyTitleIdx !== -1) {
    emit('showToast', 'Validation Error', `Activity Row #${emptyTitleIdx + 1} requires a Program/Activity Title.`, 'warning');
    return;
  }

  try {
    isSaving.value = true;
    const activitiesToSave = rowsToActivities();
    const removedIds = collectDeletedIds(activitiesToSave);
    if (activitiesToSave.length === 0 && removedIds.length === 0) {
      emit('showToast', 'Nothing to Save', 'Please enter at least one activity title before saving.', 'warning');
      return;
    }

    const timestamp = new Date().toISOString();
    let confirmedDecidedCount = 0;
    const confirmedActivities = activitiesToSave.map(a => {
      const isDecided = a.status === 'Approved' || a.status === 'Rejected' || a.approvalStatus === 'Fully Approved' || a.approvalStatus === 'Rejected';
      if (isDecided) {
        confirmedDecidedCount++;
        return {
          ...a,
          isPlanConfirmed: true,
          confirmedBy: props.currentUser?.name || `${currentOrgId.value} Officer`,
          confirmedAt: a.confirmedAt || timestamp
        };
      }
      return a;
    });

    autosave.cancel();
    clearLocalDraft(draftKey.value);
    restoredDraftAt.value = null;
    lastAutoSavedAt.value = null;
    emit('submitApproval', confirmedActivities, removedIds);
    syncEditorRowsAfterSave(confirmedActivities);
    emit(
      'showToast',
      confirmedDecidedCount > 0 ? 'Action Plan Confirmed! 🎯' : 'Action Plan Saved! 📝',
      confirmedActivities.length === 0 && removedIds.length > 0
        ? `Removed ${removedIds.length} deleted draft${removedIds.length === 1 ? '' : 's'} from Proposed Plan.`
        : confirmedDecidedCount > 0
          ? 'All activities saved. You can review or set statuses for Draft items in the Proposed Plan.'
          : 'Draft activities saved to Proposed Plan. You can set Approved or Rejected status there.',
      'success'
    );
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
            <span
              v-if="lastAutoSavedAt && !isPlanSubmitted"
              class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200 flex items-center gap-1"
            >
              <Save class="w-3 h-3 text-emerald-600" />
              <span>Auto-saved {{ formatDraftTime(lastAutoSavedAt) }}</span>
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

      <div
        v-if="restoredDraftAt && !isPlanSubmitted"
        class="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900"
      >
        <div class="flex items-center gap-2">
          <Info class="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Restored unsaved Action Plan edits from <strong>{{ formatDraftTime(restoredDraftAt) }}</strong>. Click <strong>Save Draft</strong> to persist to the database.
          </span>
        </div>
        <button
          type="button"
          @click="discardLocalDraft"
          class="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-[11px] flex items-center gap-1 self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Discard Local Edits</span>
        </button>
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
            @click="handleAddRow"
            class="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Add Activity Row</span>
          </button>
        </div>
      </div>

      <!-- Table Container with Horizontal Scroll -->
      <div class="overflow-x-auto w-full touch-scroll border-b border-slate-300 relative">
        <table class="w-full text-left text-xs border-collapse">
          <!-- Institutional Header Rows Matching Template -->
          <thead>
            <!-- Main Title Banner -->
            <tr :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">
              <th colspan="13" class="px-4 py-2 text-center text-xs sm:text-sm font-black tracking-wider uppercase border border-red-950/20 shadow-xs" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">
                {{ template.headerTitle }} &bull; {{ currentOrg ? currentOrg.name : currentOrgId }}
              </th>
            </tr>

            <!-- Column Headers (Official 10 Columns + Status & Row Operations) -->
            <tr 
              :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }"
              class="font-bold border-b border-slate-400 text-center"
            >
              <th rowspan="2" class="px-2 py-2 border border-slate-400 w-14 min-w-[50px] text-center font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">#</th>
              <th colspan="2" class="px-3 py-1.5 border border-slate-400 min-w-[280px] font-black shadow-xs" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Timeframe</th>
              <th rowspan="2" class="px-3 py-2 border border-slate-400 min-w-[200px] text-left font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Programs and Activities</th>
              <th rowspan="2" class="px-3 py-2 border border-slate-400 min-w-[220px] text-left font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Strategic Objectives</th>
              <th rowspan="2" class="px-3 py-2 border border-slate-400 min-w-[200px] text-left font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Expected Output</th>
              <th rowspan="2" class="px-2 py-2 border border-slate-400 w-24 text-center font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Office</th>
              <th rowspan="2" class="px-3 py-2 border border-slate-400 min-w-[200px] text-left font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Line Item Budget</th>
              <th rowspan="2" class="px-3 py-2 border border-slate-400 w-32 text-right font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Budget Requirement</th>
              <th rowspan="2" class="px-3 py-2 border border-slate-400 w-36 text-center font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">
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
              <th rowspan="2" class="px-3 py-2 border border-slate-400 min-w-[150px] text-left font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Person Assigned</th>
              <th rowspan="2" class="px-2 py-2 border border-slate-400 w-32 text-center font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Status</th>
              <th rowspan="2" class="px-2 py-2 border border-slate-400 w-28 text-center font-black shadow-xs align-middle" :style="{ backgroundColor: template.headerColor || '#800000', color: template.headerTextColor || '#FFFFFF' }">Actions</th>
            </tr>
            <tr 
              :style="{ backgroundColor: template.subHeaderColor || '#FCE5CD', color: template.subHeaderTextColor || '#1E293B' }"
              class="font-bold border-b border-slate-300 text-center text-[11px]"
            >
              <th class="px-2 py-1.5 border border-slate-400 min-w-[150px] w-40 text-center shadow-xs" :style="{ backgroundColor: template.subHeaderColor || '#FCE5CD', color: template.subHeaderTextColor || '#1E293B' }">
                <div class="flex items-center justify-center gap-1.5">
                  <span>Month</span>
                  <QuickAddOptionButton
                    category="timeframe"
                    category-name="Timeframe Month"
                    :current-user="currentUser"
                    size="sm"
                  />
                </div>
              </th>
              <th class="px-2 py-1.5 border border-slate-400 min-w-[165px] w-44 text-center shadow-xs" :style="{ backgroundColor: template.subHeaderColor || '#FCE5CD', color: template.subHeaderTextColor || '#1E293B' }">
                <div class="flex items-center justify-center gap-1">
                  <Calendar class="w-3 h-3 opacity-80" />
                  <span>Week</span>
                </div>
              </th>
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
                'bg-slate-50/60 opacity-90': !isRowEditable(row)
              }"
            >
              <!-- 1. Row Number -->
              <td class="px-2 py-2.5 text-center font-mono font-bold text-slate-500 border border-slate-200 align-top w-14 min-w-[50px]">
                <div class="flex flex-col items-center justify-center pt-1 gap-1">
                  <span class="text-xs font-black text-slate-700">#{{ idx + 1 }}</span>
                  <span
                    v-if="!isRowEditable(row)"
                    class="inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-slate-200/80 text-slate-600"
                    :title="row.approvalStatus === 'Rejected' ? 'Locked: Rejected activity cannot be edited' : 'Locked: Approved activity cannot be edited'"
                  >
                    <Lock class="w-2.5 h-2.5" />
                  </span>

                  <!-- Row Conflict & Redundancy Alert Pills (Section 2 & 3) -->
                  <div v-if="(rowConflictsById[row.id] || []).length > 0" class="mt-1 flex flex-col gap-0.5">
                    <span 
                      v-for="c in rowConflictsById[row.id]"
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

              <!-- 2. Timeframe Month Selection (Strict Dropdown Choices) -->
              <td class="p-1.5 border border-slate-200 align-top min-w-[150px] w-40">
                <select
                  v-model="row.timeframeMonth"
                  @change="handleMonthChange(row)"
                  :disabled="!isRowEditable(row)"
                  class="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                >
                  <option value="" disabled>Select month...</option>
                  <option
                    v-if="row.timeframeMonth && !monthOptions.includes(row.timeframeMonth)"
                    :value="row.timeframeMonth"
                  >
                    {{ row.timeframeMonth }}
                  </option>
                  <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}</option>
                </select>
              </td>

              <!-- 3. Timeframe Week Selection (Interactive Mini Calendar Popup) -->
              <td class="p-1.5 border border-slate-200 align-top min-w-[165px] w-44">
                <button
                  type="button"
                  @click="openCalendarPicker(idx)"
                  :disabled="!isRowEditable(row)"
                  class="w-full text-left text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none hover:border-blue-400 hover:bg-blue-50/40 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:hover:bg-slate-100 disabled:cursor-not-allowed shadow-2xs cursor-pointer flex items-center justify-between gap-1.5 transition"
                  :title="isRowEditable(row) ? 'Click to pick activity day(s) in the month calendar' : 'Locked activity schedule'"
                >
                  <span
                    class="truncate"
                    :class="row.timeframeWeek ? 'text-slate-800' : 'text-slate-400 font-normal'"
                  >
                    {{ row.timeframeWeek || 'Pick dates...' }}
                  </span>
                  <Calendar class="w-3.5 h-3.5 shrink-0 text-blue-600 opacity-80" />
                </button>
              </td>

              <!-- 4. Programs and Activities (Title) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <textarea
                  v-model="row.title"
                  :disabled="!isRowEditable(row)"
                  placeholder="Enter activity title..."
                  rows="2"
                  class="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed resize-y"
                ></textarea>

                <!-- Read-only Rejection Reason Callout if row is rejected -->
                <div v-if="row.rejectionRemarks || row.approvalStatus === 'Rejected'" class="mt-1.5 p-2 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-[10px]">
                  <p class="font-bold flex items-center gap-1 text-rose-800">
                    <AlertCircle class="w-3 h-3 text-rose-600 shrink-0" />
                    <span>Rejection Reason:</span>
                  </p>
                  <p class="italic mt-0.5 text-slate-800">"{{ row.rejectionRemarks || 'Rejected in action plan' }}"</p>
                </div>
              </td>

              <!-- 5. Strategic Objectives (Multiline text wrap) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <textarea
                  v-model="row.strategicObjectives"
                  :disabled="!isRowEditable(row)"
                  placeholder="Specify strategic objectives..."
                  rows="3"
                  class="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed resize-y leading-relaxed"
                ></textarea>
              </td>

              <!-- 6. Expected Output (Multiline text wrap) -->
              <td class="p-1.5 border border-slate-200 align-top">
                <textarea
                  v-model="row.expectedOutput"
                  :disabled="!isRowEditable(row)"
                  placeholder="Specify expected outputs & results..."
                  rows="3"
                  class="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed resize-y leading-relaxed"
                ></textarea>
              </td>

              <!-- 7. Office -->
              <td class="p-1.5 border border-slate-200 align-top">
                <input
                  v-model="row.office"
                  list="officeOptionsList"
                  :disabled="!isRowEditable(row)"
                  type="text"
                  class="w-full text-xs font-semibold text-center bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </td>

              <!-- 8. Line Item Budget (Item Names Only) & Interactive Expense Calculator -->
              <td class="p-1.5 border border-slate-200 align-top">
                <div class="space-y-1.5">
                  <div class="text-[11px] text-slate-700 font-medium leading-tight max-h-16 overflow-y-auto">
                    {{ formatLineItemBudgetText(row.budgetLineItems, row.lineItemBudget, row.isZeroBudget) || (row.isZeroBudget ? 'N/A (Zero-budget activity)' : 'No itemized expenses yet') }}
                  </div>

                  <button
                    type="button"
                    @click="openBudgetModal(idx)"
                    class="w-full px-2 py-1 text-[11px] font-bold rounded border transition cursor-pointer flex items-center justify-center gap-1"
                    :class="isRowEditable(row)
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200/70'"
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
                  class="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </td>

              <!-- 11. Person Assigned -->
              <td class="p-1.5 border border-slate-200 align-top">
                <input
                  v-model="row.personAssigned"
                  list="personAssignedOptionsList"
                  :disabled="!isRowEditable(row)"
                  type="text"
                  placeholder="e.g. Org Officers"
                  class="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md p-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </td>

              <!-- 12. Row Status (Fixed Label: Draft for new rows, Locked Approved/Rejected once decided) -->
              <td class="p-1.5 border border-slate-200 align-top text-center">
                <span
                  v-if="row.approvalStatus === 'Fully Approved'"
                  class="inline-flex items-center justify-center gap-1 w-full px-2 py-1.5 rounded-md border text-xs font-bold bg-emerald-50 text-emerald-800 border-emerald-300"
                  title="Approved in Action Plan — activity is locked and cannot be edited"
                >
                  <Lock class="w-3 h-3 shrink-0" />
                  <span>Approved</span>
                </span>
                <span
                  v-else-if="row.approvalStatus === 'Rejected'"
                  class="inline-flex items-center justify-center gap-1 w-full px-2 py-1.5 rounded-md border text-xs font-bold bg-rose-50 text-rose-800 border-rose-300"
                  title="Rejected in Action Plan — activity is locked and cannot be edited"
                >
                  <Lock class="w-3 h-3 shrink-0" />
                  <span>Rejected</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center justify-center w-full px-2 py-1.5 rounded-md border text-xs font-bold bg-slate-100 text-slate-700 border-slate-300"
                  title="New or pending activity — confirm action plan to decide Approved or Rejected status"
                >
                  Draft
                </span>
              </td>

              <!-- 13. Row Operations (Move Up, Move Down, Remove) -->
              <td class="p-1.5 border border-slate-200 text-center align-top">
                <div class="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    @click="handleMoveRowUp(idx)"
                    :disabled="idx === 0 || !isRowEditable(row)"
                    title="Move Row Up"
                    class="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowUp class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="handleMoveRowDown(idx)"
                    :disabled="idx === rows.length - 1 || !isRowEditable(row)"
                    title="Move Row Down"
                    class="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
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
          <tfoot class="bg-amber-100 font-black text-slate-900 border-t-2 border-slate-400">
            <tr class="bg-amber-100">
              <td colspan="8" class="px-4 py-3 text-right uppercase tracking-wider text-xs border border-slate-300 bg-amber-100">
                {{ template.footerLabel || 'Total Projected Proposed Budget' }}
              </td>
              <td class="px-3 py-3 text-right font-mono text-sm text-blue-900 font-black border border-slate-300 bg-amber-200">
                {{ formatCurrency(totalProposedBudget) }}
              </td>
              <td colspan="4" class="px-3 py-3 text-slate-600 text-xs border border-slate-300 bg-amber-100">
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
          <!-- Read-only notice for locked Approved / Rejected activities -->
          <div
            v-if="isBudgetModalReadOnly"
            class="p-2.5 bg-slate-100 border border-slate-300 rounded-xl flex items-center gap-2 text-xs text-slate-700 font-semibold"
          >
            <Lock class="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>This activity is locked and its line item expenses are read-only.</span>
          </div>

          <!-- Zero Budget / N/A Activity Checkbox -->
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <p class="font-bold text-slate-800">Zero Budget / N/A Activity</p>
              <p class="text-[11px] text-slate-500">Enable this if this activity does not require institutional budget funds.</p>
            </div>
            <label
              class="relative inline-flex items-center"
              :class="isBudgetModalReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
            >
              <input type="checkbox" v-model="isZeroBudgetToggle" :disabled="isBudgetModalReadOnly" class="sr-only peer" />
              <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <!-- Line items table if not zero-budget -->
          <div v-if="!isZeroBudgetToggle" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-black text-slate-800 text-xs uppercase tracking-wide">Expense Entries</span>
              <button
                v-if="!isBudgetModalReadOnly"
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
                        :disabled="isBudgetModalReadOnly"
                        type="text"
                        placeholder="e.g. Snacks, Certificates"
                        class="w-full text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </td>
                    <td class="p-2">
                      <input
                        v-model.number="item.quantity"
                        @input="updateTempItemTotal(item)"
                        :disabled="isBudgetModalReadOnly"
                        type="number"
                        min="0"
                        class="w-full text-xs text-center bg-white border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </td>
                    <td class="p-2">
                      <input
                        v-model.number="item.unitCost"
                        @input="updateTempItemTotal(item)"
                        :disabled="isBudgetModalReadOnly"
                        type="number"
                        min="0"
                        step="0.5"
                        class="w-full text-xs text-right font-mono bg-white border border-slate-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </td>
                    <td class="p-2 text-right font-mono font-bold text-slate-800">
                      {{ formatCurrency(item.total) }}
                    </td>
                    <td class="p-2 text-center">
                      <button
                        v-if="!isBudgetModalReadOnly"
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
              Example: Snacks, Certificates. Item names appear in Line Item Budget, and the total sum is automatically calculated in Budget Requirement.
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
              {{ isBudgetModalReadOnly ? 'Close' : 'Cancel' }}
            </button>
            <button
              v-if="!isBudgetModalReadOnly"
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
                  <td class="p-2 border border-slate-200 text-slate-700 text-[11px]">{{ formatLineItemBudgetText(r.budgetLineItems, r.lineItemBudget, r.isZeroBudget) || (r.isZeroBudget ? 'N/A' : 'None') }}</td>
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

    <!-- Timeframe Mini Calendar Popup Modal (Single / Multi-day Selection) -->
    <div
      v-if="isCalendarPopupOpen"
      @click.self="isCalendarPopupOpen = false"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div class="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Calendar class="w-4 h-4" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-black text-slate-900 truncate">
                {{ calendarGrid.monthName }} {{ calendarGrid.year }}
              </h3>
              <p class="text-[11px] text-slate-500 truncate">
                Activity #{{ (activeCalendarRowIndex ?? 0) + 1 }}: {{ rows[activeCalendarRowIndex ?? 0]?.title || 'Select activity day(s)' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="isCalendarPopupOpen = false"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer shrink-0"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-3">
          <!-- Month Switcher + Instructions -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-bold text-slate-600">Month:</span>
            <select
              :value="calendarPopupMonth"
              @change="handleCalendarPopupMonthSwitch(($event.target as HTMLSelectElement).value)"
              class="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
            >
              <option v-for="m in monthOptions" :key="m" :value="m">{{ m }} {{ calendarGrid.year }}</option>
            </select>
          </div>

          <!-- Quick Week Presets -->
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Quick Week Toggle</span>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="wk in calendarWeekRanges"
                :key="wk.weekIndex"
                type="button"
                @click="toggleCalendarWeekRange(wk.dates)"
                class="px-2 py-1 text-[10px] font-bold rounded-md border transition cursor-pointer"
                :class="isCalendarWeekFullySelected(wk.dates)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'"
              >
                {{ wk.label }}
              </button>
              <button
                type="button"
                @click="toggleEntireCalendarMonth"
                class="px-2 py-1 text-[10px] font-bold rounded-md border transition cursor-pointer"
                :class="calendarSelectedDates.length === calendarGrid.daysInMonth
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'"
              >
                Entire Month
              </button>
            </div>
          </div>

          <!-- Mini Calendar Grid -->
          <div class="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
            <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500 pb-1.5">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div class="grid grid-cols-7 gap-1">
              <div
                v-for="blank in calendarLeadingBlanks"
                :key="`blank-${blank}`"
                class="h-8"
              ></div>
              <button
                v-for="day in calendarGrid.days"
                :key="day.isoDate"
                type="button"
                @click="toggleCalendarDay(day.isoDate)"
                class="h-8 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center border"
                :class="isDaySelected(day.isoDate)
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-300'"
              >
                {{ day.day }}
              </button>
            </div>
          </div>

          <!-- Selected Dates Summary -->
          <div class="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-2 text-xs">
            <div v-if="calendarSelectedDates.length > 0" class="min-w-0">
              <span class="text-[10px] font-bold uppercase text-blue-700 block">
                Selected ({{ calendarSelectedDates.length }} {{ calendarSelectedDates.length === 1 ? 'day' : 'days' }}):
              </span>
              <span class="font-bold text-slate-900 truncate block">{{ calendarSelectionSummary.weekLabel }}</span>
            </div>
            <span v-else class="text-[11px] text-slate-600">
              Click a single day or multiple days to set when the activity will happen.
            </span>

            <button
              v-if="calendarSelectedDates.length > 0"
              type="button"
              @click="clearCalendarSelection"
              class="text-[11px] font-bold text-rose-600 hover:text-rose-800 shrink-0 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            @click="isCalendarPopupOpen = false"
            class="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="applyCalendarSelection"
            :disabled="calendarSelectedDates.length === 0"
            class="px-4 py-1.5 text-xs font-black text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Apply Dates</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Datalists for inputable fields with choices -->
    <datalist id="monthOptionsList">
      <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}</option>
    </datalist>
    <datalist id="fundSourceOptionsList">
      <option v-for="fs in fundSourceOptions" :key="fs" :value="fs">{{ fs }}</option>
    </datalist>
    <datalist id="officeOptionsList">
      <option v-for="off in dynamicOffices" :key="off" :value="off">{{ off }}</option>
    </datalist>
    <datalist id="personAssignedOptionsList">
      <option v-for="pa in dynamicPersonsAssigned" :key="pa" :value="pa">{{ pa }}</option>
    </datalist>
  </div>
</template>

