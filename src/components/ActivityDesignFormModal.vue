<script setup lang="ts">
import { ref, watch, computed, nextTick, onUnmounted } from 'vue';
import { 
  ActivityDesignForm, 
  Activity, 
  ScheduleItem, 
  ParticipantItem, 
  BudgetItem, 
  VenueRequirementItem, 
  FacilityRequirementItem,
  UserAccount
} from '../types';
import { getOptionLabelsByCategory } from '../services/optionsService';
import QuickAddOptionButton from './QuickAddOptionButton.vue';
import { isCollegeOrg } from '../data/initialData';
import { 
  printDadDocument, 
  downloadDadAsPdf, 
  downloadDadAsHtml,
  downloadDadAsDocx,
  resolveDadPreparedBySignatory
} from '../utils/dadExport';
import { getDadControlNo, resolveDadOrgAcronym, resolveDadPoeLine } from '../utils/dadSignatories';
import { resolveActivityDates, extractIsoDate, extractCalendarDaysFromWeekLabel } from '../utils/activityDate';
import { stripBudgetFormulaSuffix } from '../utils/budgetFormat';
import DadDocumentModal from './DadDocumentModal.vue';
import { detectDadVenueConflicts, ConflictItem } from '../utils/conflictDetection';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  Send, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  Building2, 
  DollarSign, 
  Target, 
  UploadCloud, 
  Info, 
  Calendar, 
  Users, 
  CheckSquare, 
  AlertCircle,
  Minimize2,
  Maximize2,
  Check,
  Printer,
  Download,
  Loader2,
  FileDown,
  Eye,
  Paperclip,
  ExternalLink,
  Save,
  RotateCcw,
  Lock
} from 'lucide-vue-next';
import {
  buildDraftKey,
  loadLocalDraft,
  clearLocalDraft,
  formatDraftTime,
  createDraftAutosaveController
} from '../utils/draftStorage';
import {
  uploadStoredFile,
  deleteStoredFile,
  getAttachmentName,
  getAttachmentUrl,
  getAttachmentFileId,
  buildFileActionUrl,
  isImageAttachment
} from '../services/fileService';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    activity: Activity | null;
    readOnly?: boolean;
    currentUser?: UserAccount | null;
    allActivities?: Activity[];
  }>(),
  {
    readOnly: false,
    currentUser: null,
    allActivities: () => []
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', form: ActivityDesignForm): void;
  (e: 'saveDraft', form: ActivityDesignForm): void;
}>();

const isSubmittedLocked = computed(() => Boolean(props.activity?.designForm?.isCompleted));
const isFormReadOnly = computed(() => Boolean(props.readOnly || isSubmittedLocked.value));

const currentStep = ref(1);
const isMinimized = ref(false);

// Database-driven Dynamic Dropdown Options (APMAMS UPDATE 7)
const dynamicColleges = getOptionLabelsByCategory('college');
const dynamicDepartments = getOptionLabelsByCategory('department');
const dynamicVenues = getOptionLabelsByCategory('venue');
const dynamicBudgetSources = getOptionLabelsByCategory('fund_source');
const dynamicActivityTypes = getOptionLabelsByCategory('activity_type');
const dynamicFiscalYears = getOptionLabelsByCategory('fiscal_year');

const ALL_SDGS = [
  'SDG 1 - No Poverty',
  'SDG 2 - Zero Hunger',
  'SDG 3 - Good Health and Well-being',
  'SDG 4 - Quality Education',
  'SDG 5 - Gender Equality',
  'SDG 6 - Clean Water and Sanitation',
  'SDG 7 - Affordable and Clean Energy',
  'SDG 8 - Decent Work and Economic Growth',
  'SDG 9 - Industry, Innovation and Infrastructure',
  'SDG 10 - Reduced Inequalities',
  'SDG 11 - Sustainable Cities and Communities',
  'SDG 12 - Responsible Consumption and Production',
  'SDG 13 - Climate Action',
  'SDG 14 - Life Below Water',
  'SDG 15 - Life on Land',
  'SDG 16 - Peace, Justice and Strong Institutions',
  'SDG 17 - Partnerships for the Goals'
];

const isUnitCollegeDropdownOpen = ref(false);
const isDepartmentDropdownOpen = ref(false);

const closeAllDropdowns = () => {
  isUnitCollegeDropdownOpen.value = false;
  isDepartmentDropdownOpen.value = false;
};

const form = ref<ActivityDesignForm>({
  activityTitle: '',
  controlNumber: '',
  officeCode: '',
  datePrepared: '',
  unitCollege: '',
  venue: '',
  department: '',
  proposedBudget: 0,
  resultCode: '',
  budgetSource: '',
  dateImplementation: '',
  includedInPdsYear: '',
  includedInPdsStatus: 'Yes',
  emailAddress: '',
  durationDays: '1',

  rationale: '',
  objectives: '',
  objectivesList: [''],
  expectedOutput: '',
  expectedOutputsList: [''],

  programOfActivitiesTitle: 'Day 1',
  programOfActivitiesDate: '',
  scheduleItems: [],
  participants: [],
  participantsText: '',
  budgetaryRequirements: [],

  activityType: 'In-Campus',
  venueRows: [],
  campusFacilities: [],
  sdgsAchieved: [],
  attachmentFiles: [],
  taggedColleges: [],

  isCompleted: false
});

const taggedCollegeOptions = computed(() => {
  const existing = form.value.taggedColleges || [];
  return Array.from(new Set([...dynamicColleges.value, ...existing]));
});

const draftKey = computed(() =>
  buildDraftKey(props.currentUser?.id, 'dad_form', props.activity?.id)
);
const restoredDraftAt = ref<string | null>(null);
const lastAutoSavedAt = ref<string | null>(null);
const dbDraftSavedAt = ref<string | null>(null);
let isHydratingDraft = false;

const autosave = createDraftAutosaveController<{ form: ActivityDesignForm; step: number }>(
  () => draftKey.value,
  () => ({ form: form.value, step: currentStep.value }),
  (savedAt) => {
    lastAutoSavedAt.value = savedAt;
  }
);

const splitActionPlanLines = (raw?: string | null): string[] => {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(/\r?\n|;\s*/)
    .map(s => s.trim())
    .filter(Boolean);
};

const computeDurationDaysFromActivity = (
  act: Activity,
  startDate: string,
  endDate: string,
  calendarDays: string[]
): string => {
  if (Array.isArray(act.selectedDates) && act.selectedDates.length > 0) {
    return String(act.selectedDates.length);
  }
  if (calendarDays.length > 0) {
    return String(calendarDays.length);
  }
  if (startDate && endDate && endDate >= startDate) {
    const startMs = Date.parse(`${startDate}T00:00:00Z`);
    const endMs = Date.parse(`${endDate}T00:00:00Z`);
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
      const diffDays = Math.round((endMs - startMs) / 86400000) + 1;
      if (diffDays >= 1) return String(diffDays);
    }
  }
  return '1';
};

const applyDbDadData = (act: Activity) => {
  const existing = act.designForm;
  const today = new Date().toISOString().split('T')[0];
  const resolvedSig = resolveDadPreparedBySignatory(act, existing);
  const resolvedDates = resolveActivityDates(act);
  const calendarDays = extractCalendarDaysFromWeekLabel(act.timeframeWeek, act.timeframeMonth, act.fiscalYear);

  const existingDateImpl = extractIsoDate(existing?.dateImplementation);
  const resolvedImplDate = existingDateImpl || resolvedDates.startDate || today;
  const existingProgDate = extractIsoDate(existing?.programOfActivitiesDate);
  const resolvedProgDate = existingProgDate || resolvedImplDate;

  const isLegacyDurationDefault = !existing?.durationDays || (existing.durationDays === '1' && !existing?.isCompleted && !existing?.submittedDate);
  const resolvedDurationDays = isLegacyDurationDefault
    ? computeDurationDaysFromActivity(act, resolvedDates.startDate, resolvedDates.endDate, calendarDays)
    : existing!.durationDays!;

  const actAny = act as any;
  const rawObjectives = existing?.objectives || act.strategicObjectives || act.description || '';
  const resolvedObjectivesList = existing?.objectivesList?.length
    ? [...existing.objectivesList]
    : (() => {
        const parts = splitActionPlanLines(act.strategicObjectives || '');
        return parts.length > 0 ? parts : (rawObjectives ? [rawObjectives] : ['']);
      })();

  const rawExpectedOutput = existing?.expectedOutput || act.expectedOutput || actAny.targetOutputs || '';
  const resolvedExpectedOutputsList = existing?.expectedOutputsList?.length
    ? [...existing.expectedOutputsList]
    : (() => {
        const parts = splitActionPlanLines(act.expectedOutput || actAny.targetOutputs || '');
        return parts.length > 0 ? parts : (rawExpectedOutput ? [rawExpectedOutput] : ['']);
      })();

  const resolvedBudgetSource = existing?.budgetSource || act.fundSource || '';
  const resolvedBudgetItems = existing?.budgetaryRequirements?.length
    ? [...existing.budgetaryRequirements]
    : (Array.isArray(act.budgetLineItems) && act.budgetLineItems.length > 0)
      ? act.budgetLineItems.map(li => ({
          item: stripBudgetFormulaSuffix(li.description || '') || li.description || 'Item',
          particulars:
            li.quantity && li.unitCost
              ? `${li.quantity} × ₱${Number(li.unitCost).toLocaleString()}`
              : (li.description || ''),
          amount: Number(li.total ?? (Number(li.quantity || 1) * Number(li.unitCost || 0))) || 0,
          budgetSource: resolvedBudgetSource
        }))
      : (act.lineItemBudget && Number(act.budget || 0) > 0)
        ? [{
            item: stripBudgetFormulaSuffix(act.lineItemBudget) || act.lineItemBudget,
            particulars: act.lineItemBudget,
            amount: Number(act.budget || 0),
            budgetSource: resolvedBudgetSource
          }]
        : [];

  const resolvedDepartment =
    existing?.department && existing.department !== act.orgId
      ? existing.department
      : (act.office || existing?.department || '');

  const fyDigits = act.fiscalYear ? (act.fiscalYear.match(/\d{4}/)?.[0] || act.fiscalYear) : '';
  const isFromActionPlan = Boolean(act.isActionPlanItem || act.source === 'ACTION_PLAN' || act.timeframeMonth);
  const normalizedActivityType =
    existing?.activityType && existing.activityType !== 'Institutional Activity'
      ? existing.activityType
      : 'In-Campus';

  const resolvedTitle = existing?.activityTitle || (existing as any)?.title || act.programActivity || act.title || '';
  const resolvedVenue = existing?.venue || act.venue || '';
  const initialScheduleItems = existing?.scheduleItems?.length
    ? [...existing.scheduleItems]
    : [{
        dateTime: resolvedProgDate,
        activity: resolvedTitle,
        personInCharge: resolvedSig.name || `${act.orgId || 'Organization'} Officers`
      }];
  const initialVenueRows = existing?.venueRows?.length
    ? existing.venueRows.map(v => ({ ...v, signatureStatus: v.signatureStatus || '' }))
    : (resolvedVenue
        ? [{
            venue: resolvedVenue,
            specifiedDate: resolvedImplDate,
            duration: `${resolvedDurationDays} ${Number(resolvedDurationDays) === 1 ? 'Day' : 'Days'}`,
            remarks: '',
            signatureStatus: ''
          }]
        : []);

  form.value = {
    activityTitle: resolvedTitle,
    controlNumber: (existing?.controlNumber && !existing.controlNumber.includes('ACCOM-REV') && !existing.controlNumber.includes('001-2025-REV00')) ? existing.controlNumber : getDadControlNo(act, existing),
    officeCode: existing?.officeCode || `OVCSAS-OSD-${act.orgId || 'SSC'}`,
    datePrepared: existing?.datePrepared || today,
    unitCollege: existing?.unitCollege || act.orgId || '',
    venue: resolvedVenue,
    department: resolvedDepartment,
    proposedBudget: existing?.proposedBudget ?? act.budget ?? act.totalBudget ?? 0,
    resultCode: existing?.resultCode || '',
    budgetSource: resolvedBudgetSource,
    dateImplementation: resolvedImplDate,
    includedInPdsPlan: existing?.includedInPdsPlan || (isFromActionPlan ? 'Action Plan' : ''),
    includedInPdsYear: existing?.includedInPdsYear || fyDigits,
    includedInPdsStatus: existing?.includedInPdsStatus || 'Yes',
    emailAddress: existing?.emailAddress || props.currentUser?.email || '',
    durationDays: resolvedDurationDays,

    rationale: existing?.rationale || act.description || act.strategicObjectives || '',
    objectives: rawObjectives,
    objectivesList: resolvedObjectivesList,
    expectedOutput: rawExpectedOutput,
    expectedOutputsList: resolvedExpectedOutputsList,

    programOfActivitiesTitle: existing?.programOfActivitiesTitle || 'Day 1',
    programOfActivitiesDate: resolvedProgDate,
    
    scheduleItems: initialScheduleItems,

    participants: existing?.participants?.length 
      ? [...existing.participants] 
      : [],
    participantsText: existing?.participantsText || (
      existing?.participants?.length
        ? existing.participants.map(p => (typeof p === 'string' ? p : (p.name ? `${p.name} (${p.position})` : ''))).filter(Boolean).join(', ')
        : (act.targetParticipants && Number(act.targetParticipants) > 0
            ? `${act.targetParticipants} Target Participants (${act.orgId || 'Organization'})`
            : '')
    ),

    budgetaryRequirements: resolvedBudgetItems,

    activityType: normalizedActivityType,
    
    venueRows: initialVenueRows,

    campusFacilities: existing?.campusFacilities?.length 
      ? existing.campusFacilities.map(f => ({ ...f, signatureStatus: f.signatureStatus || '' }))
      : [],

    sdgsAchieved: existing?.sdgsAchieved?.length 
      ? [...existing.sdgsAchieved] 
      : [],

    attachmentFiles: existing?.attachmentFiles?.length ? [...existing.attachmentFiles] : [],
    taggedColleges: existing?.taggedColleges?.length 
      ? [...existing.taggedColleges] 
      : [],

    submittedBy: existing?.submittedBy || resolvedSig.name,
    submittedByRole: resolvedSig.role,
    submittedDate: existing?.submittedDate || act.submittedDate,
    isCompleted: existing?.isCompleted ?? false
  };
};

let lastHydratedActivityKey: string | null = null;

watch(
  () => form.value.dateImplementation,
  (newDate, oldDate) => {
    if (isHydratingDraft || !newDate) return;
    if (!form.value.programOfActivitiesDate || form.value.programOfActivitiesDate === oldDate) {
      form.value.programOfActivitiesDate = newDate;
    }
  }
);

const discardLocalDraft = () => {
  autosave.cancel();
  clearLocalDraft(draftKey.value);
  restoredDraftAt.value = null;
  lastAutoSavedAt.value = null;
  if (!props.activity) return;
  isHydratingDraft = true;
  applyDbDadData(props.activity);
  currentStep.value = 1;
  nextTick(() => {
    isHydratingDraft = false;
  });
};

watch(
  [() => props.activity?.id, () => props.isOpen],
  ([actId, open], [_prevId, prevOpen]) => {
    if (!open || !props.activity) {
      if (!open) {
        lastHydratedActivityKey = null;
      }
      return;
    }

    const sessionKey = `${actId}:${isFormReadOnly.value ? 'ro' : 'rw'}`;
    if (prevOpen && lastHydratedActivityKey === sessionKey) {
      return;
    }

    lastHydratedActivityKey = sessionKey;
    const act = props.activity;
    isHydratingDraft = true;
    applyDbDadData(act);
    currentStep.value = 1;
    stepValidationErrors.value = [];

    if (!isFormReadOnly.value) {
      const draft = loadLocalDraft<{ form: ActivityDesignForm; step: number }>(draftKey.value);
      if (draft?.data?.form) {
        form.value = {
          ...form.value,
          ...draft.data.form
        };
        currentStep.value = draft.data.step || 1;
        restoredDraftAt.value = draft.savedAt;
        lastAutoSavedAt.value = draft.savedAt;
        nextTick(() => {
          isHydratingDraft = false;
        });
        return;
      }
    }
    restoredDraftAt.value = null;
    lastAutoSavedAt.value = null;
    dbDraftSavedAt.value = null;
    nextTick(() => {
      isHydratingDraft = false;
    });
  },
  { immediate: true }
);

watch(
  [form, currentStep],
  () => {
    if (props.isOpen && !isFormReadOnly.value && !isHydratingDraft) {
      autosave.schedule();
    }
  },
  { deep: true }
);

watch(
  () => form.value.budgetaryRequirements,
  (items) => {
    if (isHydratingDraft || !Array.isArray(items) || items.length === 0) return;
    const sum = items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    if (sum > 0) {
      form.value.proposedBudget = sum;
    }
  },
  { deep: true }
);

onUnmounted(() => {
  autosave.destroy();
});

// Dynamic Array Handler Functions
const addObjective = () => {
  form.value.objectivesList = [...(form.value.objectivesList || []), ''];
};
const removeObjective = (index: number) => {
  form.value.objectivesList?.splice(index, 1);
};

const addExpectedOutput = () => {
  form.value.expectedOutputsList = [...(form.value.expectedOutputsList || []), ''];
};
const removeExpectedOutput = (index: number) => {
  form.value.expectedOutputsList?.splice(index, 1);
};

const addScheduleItem = () => {
  form.value.scheduleItems?.push({ dateTime: '', activity: '', personInCharge: '' });
};
const removeScheduleItem = (index: number) => {
  form.value.scheduleItems?.splice(index, 1);
};

const addParticipant = () => {
  form.value.participants?.push({ name: '', position: '' });
};
const removeParticipant = (index: number) => {
  form.value.participants?.splice(index, 1);
};

const addBudgetItem = () => {
  form.value.budgetaryRequirements?.push({ item: '', particulars: '', amount: '', budgetSource: '' });
};
const removeBudgetItem = (index: number) => {
  form.value.budgetaryRequirements?.splice(index, 1);
};

const addVenueRow = () => {
  form.value.venueRows?.push({ venue: '', specifiedDate: '', duration: '', remarks: '', signatureStatus: '' });
};
const removeVenueRow = (index: number) => {
  form.value.venueRows?.splice(index, 1);
};

const addFacilityRow = () => {
  form.value.campusFacilities?.push({ quantity: 1, description: '', duration: '', remarks: '', signatureStatus: '' });
};
const removeFacilityRow = (index: number) => {
  form.value.campusFacilities?.splice(index, 1);
};

const toggleSdg = (sdg: string) => {
  const current = form.value.sdgsAchieved || [];
  if (current.includes(sdg)) {
    form.value.sdgsAchieved = current.filter((s) => s !== sdg);
  } else {
    form.value.sdgsAchieved = [...current, sdg];
  }
};

const toggleCollege = (college: string) => {
  const current = form.value.taggedColleges || [];
  if (current.includes(college)) {
    form.value.taggedColleges = current.filter((c) => c !== college);
  } else {
    form.value.taggedColleges = [...current, college];
  }
};

const totalBudgetCalculated = computed(() => {
  if (!form.value.budgetaryRequirements?.length) return Number(form.value.proposedBudget) || 0;
  return form.value.budgetaryRequirements.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
});

const preparedByResolved = computed(() =>
  props.activity
    ? resolveDadPreparedBySignatory(props.activity, form.value)
    : {
        name: form.value.submittedBy || '—',
        role: form.value.submittedByRole || 'Organization Officer'
      }
);

const formattedDuration = computed(() => {
  const raw = String(form.value.durationDays ?? '').trim();
  if (!raw) return '—';
  return /day/i.test(raw) ? raw : `${raw} ${Number(raw) === 1 ? 'day' : 'days'}`;
});

const isCollege = computed(() => isCollegeOrg(props.activity?.orgId));
const isDownloading = ref(false);
const isDadPreviewOpen = ref(false);

const handlePrintDad = () => {
  if (!props.activity) return;
  printDadDocument(props.activity, form.value);
  isDadPreviewOpen.value = true;
};

const handleDownloadPdf = async () => {
  if (!props.activity) return;
  isDownloading.value = true;
  try {
    await downloadDadAsPdf(props.activity, form.value);
  } catch (err) {
    console.error('PDF generation error, falling back to HTML download:', err);
    downloadDadAsHtml(props.activity, form.value);
  } finally {
    isDownloading.value = false;
  }
};

const isDownloadingDocx = ref(false);

const handleDownloadDocx = async () => {
  if (!props.activity) return;
  isDownloadingDocx.value = true;
  try {
    await downloadDadAsDocx(props.activity, form.value);
  } catch (err) {
    console.error('DOCX generation error, falling back to HTML download:', err);
    downloadDadAsHtml(props.activity, form.value);
  } finally {
    isDownloadingDocx.value = false;
  }
};

const handleDownloadDoc = () => {
  if (!props.activity) return;
  downloadDadAsHtml(props.activity, form.value);
};

// Supporting Attachments Upload Handlers (Supabase Storage / PostgreSQL)
const dadAttachmentInput = ref<HTMLInputElement | null>(null);
const isUploadingDadAttachment = ref(false);
const dadUploadError = ref('');

const triggerDadAttachmentUpload = () => {
  if (!isFormReadOnly.value && !isUploadingDadAttachment.value) {
    dadAttachmentInput.value?.click();
  }
};

const handleDadAttachmentUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  isUploadingDadAttachment.value = true;
  dadUploadError.value = '';
  try {
    form.value.attachmentFiles = form.value.attachmentFiles || [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploaded = await uploadStoredFile(file, {
        scope: 'dad',
        orgId: props.activity?.orgId || props.currentUser?.orgId || '',
        activityId: props.activity?.id || ''
      });
      form.value.attachmentFiles.push(uploaded);
    }
  } catch (err: any) {
    dadUploadError.value = err?.message || 'Failed to upload attachment.';
  } finally {
    isUploadingDadAttachment.value = false;
    target.value = '';
  }
};

const removeDadAttachment = (index: number) => {
  const removed = form.value.attachmentFiles?.splice(index, 1);
  const fileId = getAttachmentFileId(removed?.[0]);
  if (fileId) {
    deleteStoredFile(fileId);
  }
};

// DAD Venue Conflict Detection & Submission Priority (Section 4 & 8)
const dadConflicts = computed<ConflictItem[]>(() => {
  if (!props.activity) return [];
  return detectDadVenueConflicts(
    form.value,
    props.activity.id,
    props.activity.orgId,
    props.allActivities || []
  );
});

const isSystemAdmin = computed(() => {
  const role = props.currentUser?.role;
  return role === 'ROLE_ADMIN' || role === 'System Administrator' || role === 'SysAd';
});

const adminOverrideConfirmed = ref(false);
const adminOverrideReason = ref('');

const isSubmitBlocked = computed(() => {
  if (isFormReadOnly.value) return false;
  return dadConflicts.value.length > 0 && !adminOverrideConfirmed.value;
});

const stepValidationErrors = ref<string[]>([]);

const DAD_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

const validateDadStep = (step: number): string[] => {
  const f = form.value;
  const errs: string[] = [];

  if (step === 1) {
    if (!f.activityTitle?.trim()) errs.push('Activity Title is required.');
    if (!f.controlNumber?.trim()) errs.push('Control Number is required.');
    if (!f.datePrepared?.trim()) errs.push('Date Prepared is required.');
    if (!f.unitCollege?.trim()) errs.push('Unit/College is required.');
    if (!f.venue?.trim()) errs.push('Venue is required.');
    if (!f.department?.trim()) errs.push('Department is required.');
    if (f.proposedBudget === undefined || f.proposedBudget === null || Number.isNaN(Number(f.proposedBudget)) || Number(f.proposedBudget) < 0) {
      errs.push('Proposed Budget must be a valid non-negative amount.');
    }
    if (!f.resultCode?.trim()) errs.push('Result Code / OPCR / IPCR Code is required.');
    if (!f.budgetSource?.trim()) errs.push('Budget Source is required.');
    if (!f.dateImplementation?.trim()) errs.push('Date of Implementation is required.');
    const email = (f.emailAddress || '').trim();
    if (!email || !DAD_EMAIL_REGEX.test(email)) errs.push('A valid Email Address is required.');
    if (!f.durationDays || Number(f.durationDays) < 1) errs.push('Duration (in days) must be at least 1.');
    if (!f.rationale?.trim()) errs.push('A. Rationale is required.');
    const hasObjective = (f.objectivesList || []).some(o => o.trim().length > 0) || Boolean(f.objectives?.trim());
    if (!hasObjective) errs.push('At least one Objective (Section B) is required.');
    const hasExpectedOutput = (f.expectedOutputsList || []).some(o => o.trim().length > 0) || Boolean(f.expectedOutput?.trim());
    if (!hasExpectedOutput) errs.push('At least one Expected Output (Section C) is required.');
    if (adminOverrideConfirmed.value && !adminOverrideReason.value.trim()) {
      errs.push('Audit Justification / Override Rationale is required when overriding a scheduling conflict.');
    }
  } else if (step === 2) {
    if (!f.programOfActivitiesTitle?.trim()) errs.push('Program of Activities title is required.');
    if (!f.programOfActivitiesDate?.trim()) errs.push('Program of Activities Date is required.');
    const hasParticipants = Boolean(f.participantsText?.trim()) || (f.participants || []).some(p => p.name?.trim());
    if (!hasParticipants) errs.push('Target Participants / Target Groups (Section D) is required.');
  } else if (step === 3) {
    if (!f.activityType?.trim()) errs.push('Activity Type is required.');
    if (!f.sdgsAchieved || f.sdgsAchieved.length === 0) {
      errs.push('Please select at least one Sustainable Development Goal Achieved (Section G).');
    }
  }

  return errs;
};

const goToStep = (targetStep: number) => {
  if (isFormReadOnly.value || targetStep <= currentStep.value) {
    stepValidationErrors.value = [];
    currentStep.value = targetStep;
    return;
  }
  for (let s = currentStep.value; s < targetStep; s++) {
    const errs = validateDadStep(s);
    if (errs.length > 0) {
      currentStep.value = s;
      stepValidationErrors.value = errs;
      return;
    }
  }
  stepValidationErrors.value = [];
  currentStep.value = targetStep;
};

const handleNextStep = () => {
  if (currentStep.value >= 4) return;
  if (!isFormReadOnly.value) {
    const errs = validateDadStep(currentStep.value);
    if (errs.length > 0) {
      stepValidationErrors.value = errs;
      return;
    }
  }
  stepValidationErrors.value = [];
  currentStep.value += 1;
};

const handleSave = () => {
  if (isFormReadOnly.value) return;
  if (isSubmitBlocked.value) {
    alert('Cannot establish reservation: A conflicting active DAD reservation exists for this venue and schedule.');
    return;
  }
  if (!isFormReadOnly.value) {
    for (const s of [1, 2, 3]) {
      const errs = validateDadStep(s);
      if (errs.length > 0) {
        currentStep.value = s;
        stepValidationErrors.value = errs;
        return;
      }
    }
  }
  stepValidationErrors.value = [];
  form.value.isCompleted = true;
  form.value.submittedDate = new Date().toISOString().split('T')[0];
  form.value.objectives = form.value.objectivesList?.filter(Boolean).join('\n') || form.value.objectives;
  form.value.expectedOutput = form.value.expectedOutputsList?.filter(Boolean).join('\n') || form.value.expectedOutput;

  if (adminOverrideConfirmed.value && adminOverrideReason.value.trim()) {
    (form.value as any).adminOverride = {
      isOverridden: true,
      reason: adminOverrideReason.value.trim(),
      overriddenBy: props.currentUser?.name || 'System Administrator',
      date: new Date().toISOString()
    };
  }

  autosave.cancel();
  clearLocalDraft(draftKey.value);
  restoredDraftAt.value = null;
  lastAutoSavedAt.value = null;
  emit('save', { ...form.value });
  emit('close');
};

const handleSaveDraft = () => {
  if (isFormReadOnly.value) return;
  stepValidationErrors.value = [];
  form.value.objectives = form.value.objectivesList?.filter(Boolean).join('\n') || form.value.objectives;
  form.value.expectedOutput = form.value.expectedOutputsList?.filter(Boolean).join('\n') || form.value.expectedOutput;

  autosave.cancel();
  clearLocalDraft(draftKey.value);
  restoredDraftAt.value = null;
  lastAutoSavedAt.value = null;
  dbDraftSavedAt.value = new Date().toISOString();
  emit('saveDraft', { ...form.value, isCompleted: form.value.isCompleted ?? false });
};
</script>

<template>
  <div v-if="isOpen && activity">
    <!-- Minimized Floating Widget -->
    <div
      v-if="isMinimized"
      class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-700/80 flex items-center gap-3.5 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div class="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
        <FileText class="w-5 h-5" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
            Step {{ currentStep }} of 4
          </span>
          <span class="text-[10px] text-slate-400 truncate">{{ activity.id }}</span>
        </div>
        <p class="text-xs font-bold text-white truncate mt-0.5">
          Detailed Activity Design Form
        </p>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <button
          @click="isMinimized = false"
          title="Restore Form"
          class="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <Maximize2 class="w-4 h-4" />
        </button>
        <button
          @click="emit('close')"
          title="Close Form"
          class="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Full Modal Container -->
    <div
      v-else
      class="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        <!-- Top Modal Header Bar -->
        <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              <FileText class="w-4 h-4" />
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  MSUN Official Form
                </span>
                <span class="text-[11px] text-slate-400">{{ activity.id }}</span>
                <span
                  v-if="dbDraftSavedAt && !isFormReadOnly"
                  class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1"
                >
                  <Check class="w-3 h-3" />
                  <span>Draft saved {{ formatDraftTime(dbDraftSavedAt) }}</span>
                </span>
                <span
                  v-else-if="lastAutoSavedAt && !isFormReadOnly"
                  class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold inline-flex items-center gap-1"
                >
                  <Save class="w-3 h-3 text-emerald-400" />
                  <span>Auto-saved {{ formatDraftTime(lastAutoSavedAt) }}</span>
                </span>
              </div>
              <h3 class="text-sm sm:text-base font-extrabold text-white leading-tight">
                Detailed Activity Design Form
              </h3>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              @click="isMinimized = true"
              title="Minimize Form"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Minimize2 class="w-4 h-4" />
            </button>
            <button
              @click="emit('close')"
              title="Close Form"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Submitted & Locked Banner -->
        <div
          v-if="isSubmittedLocked"
          class="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-2.5 text-xs text-blue-950 flex items-center gap-2 shrink-0 font-semibold"
        >
          <Lock class="w-4 h-4 text-blue-700 shrink-0" />
          <span>Submitted &amp; Locked: This Detailed Activity Design (DAD) form has already been submitted and cannot be edited.</span>
        </div>

        <!-- Restored Local Autosave Draft Banner -->
        <div
          v-if="restoredDraftAt && !isFormReadOnly"
          class="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 text-xs text-amber-900 flex items-center justify-between gap-2 shrink-0"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Info class="w-4 h-4 text-amber-600 shrink-0" />
            <span class="truncate">
              Restored unsaved draft from <strong>{{ formatDraftTime(restoredDraftAt) }}</strong>.
            </span>
          </div>
          <button
            type="button"
            @click="discardLocalDraft"
            class="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw class="w-3 h-3" />
            <span>Discard</span>
          </button>
        </div>

        <!-- 4-Step Stepper Header -->
        <div class="bg-slate-50 border-b border-slate-200/80 px-4 py-3 sm:px-8 shrink-0">
          <div class="flex items-center justify-between max-w-3xl mx-auto relative">
            <!-- Connecting Line Background -->
            <div class="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -z-0"></div>
            
            <!-- Step 1 Indicator -->
            <button 
              @click="goToStep(1)" 
              class="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-xs shadow-xs"
                :class="currentStep === 1 
                  ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-105' 
                  : currentStep > 1 
                    ? 'bg-blue-900 text-white' 
                    : 'bg-slate-200 text-slate-500'"
              >
                <Check v-if="currentStep > 1" class="w-4 h-4" />
                <Info v-else class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors text-center"
                :class="currentStep === 1 ? 'text-blue-900' : 'text-slate-500'"
              >
                <span class="sm:hidden">Basic</span>
                <span class="hidden sm:inline">Basic Information</span>
              </span>
            </button>

            <!-- Step 2 Indicator -->
            <button 
              @click="goToStep(2)" 
              class="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-xs shadow-xs"
                :class="currentStep === 2 
                  ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-105' 
                  : currentStep > 2 
                    ? 'bg-blue-900 text-white' 
                    : 'bg-slate-200 text-slate-500'"
              >
                <Check v-if="currentStep > 2" class="w-4 h-4" />
                <DollarSign v-else class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors text-center"
                :class="currentStep === 2 ? 'text-blue-900' : 'text-slate-500'"
              >
                <span class="sm:hidden">Budget</span>
                <span class="hidden sm:inline">Details & Budgetary</span>
              </span>
            </button>

            <!-- Step 3 Indicator -->
            <button 
              @click="goToStep(3)" 
              class="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-xs shadow-xs"
                :class="currentStep === 3 
                  ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-105' 
                  : currentStep > 3 
                    ? 'bg-blue-900 text-white' 
                    : 'bg-slate-200 text-slate-500'"
              >
                <Check v-if="currentStep > 3" class="w-4 h-4" />
                <Target v-else class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors text-center"
                :class="currentStep === 3 ? 'text-blue-900' : 'text-slate-500'"
              >
                <span class="sm:hidden">Goals</span>
                <span class="hidden sm:inline">Facilities & Goals</span>
              </span>
            </button>

            <!-- Step 4 Indicator -->
            <button 
              @click="goToStep(4)" 
              class="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-xs shadow-xs"
                :class="currentStep === 4 
                  ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-105' 
                  : 'bg-slate-200 text-slate-500'"
              >
                <Check class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors text-center"
                :class="currentStep === 4 ? 'text-blue-900' : 'text-slate-500'"
              >
                <span class="sm:hidden">Review</span>
                <span class="hidden sm:inline">Review & Submit</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Form Body Content Container -->
        <div class="p-5 sm:p-6 overflow-y-auto flex-1 text-slate-800 space-y-6">

          <!-- Inline Step Validation Alert -->
          <div
            v-if="stepValidationErrors.length > 0"
            class="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1.5"
          >
            <div class="flex items-center gap-2 font-extrabold">
              <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
              <span>Please complete all required (*) fields before proceeding:</span>
            </div>
            <ul class="list-disc pl-6 space-y-0.5 text-[11px] font-medium text-rose-800">
              <li v-for="(err, errIdx) in stepValidationErrors" :key="errIdx">{{ err }}</li>
            </ul>
          </div>

          <!-- ==================== STEP 1: BASIC INFORMATION ==================== -->
          <div v-if="currentStep === 1" class="space-y-5 animate-in fade-in duration-200 relative">
            <!-- Transparent backdrop when dropdown is open to close on outside click -->
            <div
              v-if="isUnitCollegeDropdownOpen || isDepartmentDropdownOpen"
              class="fixed inset-0 z-40"
              @click="closeAllDropdowns"
            ></div>

            <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Info class="w-5 h-5 text-blue-900" />
              <h4 class="text-base font-extrabold text-slate-900">Basic Information</h4>
            </div>

            <!-- Grid Layout -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <!-- Activity Title -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Activity Title *</label>
                <input
                  type="text"
                  v-model="form.activityTitle"
                  :disabled="isFormReadOnly"
                  placeholder="First SSC Regular Meeting"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Control Number -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Control Number *</label>
                <input
                  type="text"
                  v-model="form.controlNumber"
                  :disabled="isFormReadOnly"
                  placeholder="MSUN-SSC-DAD-_____-2026-REV___"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Office Code -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Office Code</label>
                <input
                  type="text"
                  v-model="form.officeCode"
                  :disabled="isFormReadOnly"
                  placeholder="OVCSAS-OSD-SSC"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Date Prepared -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Date Prepared *</label>
                <input
                  type="date"
                  v-model="form.datePrepared"
                  :disabled="isFormReadOnly"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Unit/College (Typable + Dropdown Selection) -->
              <div class="relative">
                <label class="font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Unit/College *</span>
                  <QuickAddOptionButton
                    category="college"
                    category-name="Unit / College"
                    :current-user="currentUser"
                    @created="(opt) => form.unitCollege = opt.label"
                    size="sm"
                  />
                </label>
                <div class="relative">
                  <input
                    type="text"
                    list="unitCollegeList"
                    v-model="form.unitCollege"
                    :disabled="isFormReadOnly"
                    placeholder="Type or select Unit/College..."
                    class="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium bg-white"
                  />
                  <button
                    type="button"
                    :disabled="isFormReadOnly"
                    @click="isUnitCollegeDropdownOpen = !isUnitCollegeDropdownOpen; isDepartmentDropdownOpen = false"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                    title="Toggle Unit/College options"
                  >
                    <ChevronDown class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isUnitCollegeDropdownOpen }" />
                  </button>
                  <datalist id="unitCollegeList">
                    <option v-for="col in dynamicColleges" :key="col" :value="col">{{ col }}</option>
                  </datalist>
                </div>

                <!-- Custom Dropdown Menu for quick selection -->
                <div
                  v-if="isUnitCollegeDropdownOpen"
                  class="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 text-xs divide-y divide-slate-100"
                >
                  <button
                    v-for="col in dynamicColleges"
                    :key="col"
                    type="button"
                    @click="form.unitCollege = col; isUnitCollegeDropdownOpen = false"
                    class="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-900 transition-colors flex items-center justify-between cursor-pointer"
                    :class="form.unitCollege === col ? 'bg-blue-50/70 text-blue-900 font-bold' : 'text-slate-700'"
                  >
                    <span>{{ col }}</span>
                    <Check v-if="form.unitCollege === col" class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </button>
                </div>
              </div>

              <!-- Venue -->
              <div>
                <label class="font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Venue *</span>
                  <QuickAddOptionButton
                    category="venue"
                    category-name="Venue"
                    :current-user="currentUser"
                    @created="(opt) => form.venue = opt.label"
                    size="sm"
                  />
                </label>
                <input
                  type="text"
                  list="dadVenueList"
                  v-model="form.venue"
                  :disabled="isFormReadOnly"
                  placeholder="Enter or select venue location"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
                <datalist id="dadVenueList">
                  <option v-for="ven in dynamicVenues" :key="ven" :value="ven">{{ ven }}</option>
                </datalist>
              </div>

              <!-- Department (Typable + Dropdown Selection) -->
              <div class="relative">
                <label class="font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Department *</span>
                  <QuickAddOptionButton
                    category="department"
                    category-name="Department"
                    :current-user="currentUser"
                    @created="(opt) => form.department = opt.label"
                    size="sm"
                  />
                </label>
                <div class="relative">
                  <input
                    type="text"
                    list="departmentList"
                    v-model="form.department"
                    :disabled="isFormReadOnly"
                    placeholder="Type or select Department..."
                    class="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium bg-white"
                  />
                  <button
                    type="button"
                    :disabled="isFormReadOnly"
                    @click="isDepartmentDropdownOpen = !isDepartmentDropdownOpen; isUnitCollegeDropdownOpen = false"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                    title="Toggle Department options"
                  >
                    <ChevronDown class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': isDepartmentDropdownOpen }" />
                  </button>
                  <datalist id="departmentList">
                    <option v-for="dep in dynamicDepartments" :key="dep" :value="dep">{{ dep }}</option>
                  </datalist>
                </div>

                <!-- Custom Dropdown Menu for quick selection -->
                <div
                  v-if="isDepartmentDropdownOpen"
                  class="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 text-xs divide-y divide-slate-100"
                >
                  <button
                    v-for="dep in dynamicDepartments"
                    :key="dep"
                    type="button"
                    @click="form.department = dep; isDepartmentDropdownOpen = false"
                    class="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-900 transition-colors flex items-center justify-between cursor-pointer"
                    :class="form.department === dep ? 'bg-blue-50/70 text-blue-900 font-bold' : 'text-slate-700'"
                  >
                    <span>{{ dep }}</span>
                    <Check v-if="form.department === dep" class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </button>
                </div>
              </div>

              <!-- Proposed Budget -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Proposed Budget *</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
                  <input
                    type="number"
                    v-model="form.proposedBudget"
                    :disabled="isFormReadOnly"
                    placeholder="Enter amount"
                    class="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                  />
                </div>
              </div>

              <!-- Result Code/OPCR/IPCR Code -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Result Code/OPCR/IPCR Code *</label>
                <input
                  type="text"
                  v-model="form.resultCode"
                  :disabled="isFormReadOnly"
                  placeholder="Enter code"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Budget Source -->
              <div>
                <label class="font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Budget Source *</span>
                  <QuickAddOptionButton
                    category="fund_source"
                    category-name="Budget Source"
                    :current-user="currentUser"
                    @created="(opt) => form.budgetSource = opt.label"
                    size="sm"
                  />
                </label>
                <input
                  type="text"
                  list="dadBudgetSourceList"
                  v-model="form.budgetSource"
                  :disabled="isFormReadOnly"
                  placeholder="Enter or select budget source"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
                <datalist id="dadBudgetSourceList">
                  <option v-for="fs in dynamicBudgetSources" :key="fs" :value="fs">{{ fs }}</option>
                </datalist>
              </div>

              <!-- Date of Implementation -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Date of Implementation *</label>
                <input
                  type="date"
                  v-model="form.dateImplementation"
                  :disabled="isFormReadOnly"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Included in the ______ Year: ______ -->
              <div class="col-span-1 md:col-span-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <label class="block font-bold text-slate-700 mb-1.5 text-xs uppercase tracking-wide">Included in the Plan & Year</label>
                <div class="flex items-center gap-2 py-0.5 flex-wrap text-xs sm:text-sm font-bold text-slate-800">
                  <span>Included in the</span>
                  <input
                    type="text"
                    v-model="form.includedInPdsPlan"
                    :disabled="isFormReadOnly"
                    placeholder="______ (Plan)"
                    class="w-36 px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-bold text-xs text-center bg-white shadow-2xs"
                  />
                  <span>Year:</span>
                  <input
                    type="text"
                    list="dadFiscalYearList"
                    v-model="form.includedInPdsYear"
                    :disabled="isFormReadOnly"
                    placeholder="____ (Year)"
                    class="w-28 px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-bold text-xs text-center bg-white shadow-2xs"
                  />
                  <span class="text-red-500 font-bold mr-2">*</span>

                  <div class="flex items-center gap-3">
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value="Yes"
                        v-model="form.includedInPdsStatus"
                        :disabled="isFormReadOnly"
                        class="text-blue-900 focus:ring-blue-900"
                      />
                      <span class="text-xs font-bold text-slate-700">Yes</span>
                    </label>
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value="No"
                        v-model="form.includedInPdsStatus"
                        :disabled="isFormReadOnly"
                        class="text-blue-900 focus:ring-blue-900"
                      />
                      <span class="text-xs font-bold text-slate-700">No</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- ==================== DAD VENUE SCHEDULING CONFLICT ALERT (Section 4 & 8) ==================== -->
              <div 
                v-if="dadConflicts.length > 0"
                class="col-span-1 md:col-span-2 bg-red-50 border-2 border-red-300 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-200"
              >
                <div class="flex items-center justify-between gap-2 border-b border-red-200 pb-2">
                  <div class="flex items-center gap-2 text-red-900 font-black">
                    <AlertCircle class="w-5 h-5 text-red-600 shrink-0" />
                    <span class="text-xs sm:text-sm">🚫 Venue Scheduling Conflict</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                    Hold Blocked
                  </span>
                </div>

                <div v-for="c in dadConflicts" :key="c.id" class="text-xs text-red-950 space-y-1.5 bg-white/80 p-3 rounded-lg border border-red-200">
                  <p class="font-bold">
                    The selected venue <span class="underline">"{{ c.conflictingVenue }}"</span> is already requested by <strong>{{ c.conflictingOrgId }}</strong> during your proposed implementation schedule:
                  </p>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div>
                      <span class="text-slate-500 block">Activity:</span>
                      <strong class="text-slate-900 block truncate">{{ c.conflictingActivityTitle }}</strong>
                    </div>
                    <div>
                      <span class="text-slate-500 block">Date & Time:</span>
                      <strong class="text-slate-900 block">{{ c.conflictingDate }} ({{ c.conflictingTime }})</strong>
                    </div>
                    <div>
                      <span class="text-slate-500 block">Venue:</span>
                      <strong class="text-slate-900 block truncate">{{ c.conflictingVenue }}</strong>
                    </div>
                    <div>
                      <span class="text-slate-500 block">Reservation Status:</span>
                      <span class="font-bold text-red-700 block">{{ c.conflictingStatus }}</span>
                    </div>
                  </div>
                </div>

                <p class="text-[11px] text-red-800 font-medium">
                  <strong>First-Valid-Submission Priority:</strong> Earlier active DAD submissions establish a reservation hold. Please select an alternate venue or schedule to proceed.
                </p>

                <!-- System Administrator Override (Section 10) -->
                <div v-if="isSystemAdmin" class="mt-2 pt-2 border-t border-red-200 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                  <label class="flex items-center gap-2 font-black text-amber-950 cursor-pointer">
                    <input 
                      type="checkbox" 
                      v-model="adminOverrideConfirmed"
                      class="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Authorize Administrative Scheduling Override</span>
                  </label>
                  <div v-if="adminOverrideConfirmed" class="mt-2 space-y-1">
                    <label class="block text-[11px] font-bold text-slate-700">Audit Justification / Override Rationale *</label>
                    <input
                      type="text"
                      v-model="adminOverrideReason"
                      placeholder="e.g. Authorized shared facility usage / rescheduled with mutual council agreement"
                      class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <!-- Email Address -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  v-model="form.emailAddress"
                  :disabled="isFormReadOnly"
                  placeholder="Enter email address"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Duration (in days) -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Duration (in days) *</label>
                <input
                  type="text"
                  v-model="form.durationDays"
                  :disabled="isFormReadOnly"
                  placeholder="1"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>
            </div>

            <!-- Section A: Rationale -->
            <div class="text-xs pt-2">
              <label class="block font-bold text-slate-700 mb-1">A. Rationale *</label>
              <textarea
                v-model="form.rationale"
                :disabled="isFormReadOnly"
                rows="4"
                placeholder="Provide a detailed description of the activity background and context..."
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
              ></textarea>
              <div class="text-[11px] text-slate-400 mt-1 text-right">
                {{ form.rationale?.length || 0 }}/5000 characters
              </div>
            </div>

            <!-- Section B: Objectives -->
            <div class="space-y-2 text-xs pt-2">
              <label class="block font-bold text-slate-700">B. Objectives *</label>
              <div
                v-for="(obj, idx) in form.objectivesList"
                :key="idx"
                class="flex items-center gap-2 mb-2"
              >
                <input
                  type="text"
                  v-model="form.objectivesList![idx]"
                  :disabled="isFormReadOnly"
                  placeholder="Enter objective..."
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
                <button
                  v-if="!isFormReadOnly && (form.objectivesList?.length || 0) > 1"
                  @click="removeObjective(idx)"
                  class="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <button
                v-if="!isFormReadOnly"
                @click="addObjective"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer pt-1"
              >
                <Plus class="w-4 h-4" />
                <span>Add Objectives</span>
              </button>
            </div>

            <!-- Section C: Expected Output -->
            <div class="space-y-2 text-xs pt-2">
              <label class="block font-bold text-slate-700">C. Expected Output *</label>
              <div
                v-for="(out, idx) in form.expectedOutputsList"
                :key="idx"
                class="flex items-center gap-2 mb-2"
              >
                <input
                  type="text"
                  v-model="form.expectedOutputsList![idx]"
                  :disabled="isFormReadOnly"
                  placeholder="Enter expected output..."
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
                <button
                  v-if="!isFormReadOnly && (form.expectedOutputsList?.length || 0) > 1"
                  @click="removeExpectedOutput(idx)"
                  class="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <button
                v-if="!isFormReadOnly"
                @click="addExpectedOutput"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer pt-1"
              >
                <Plus class="w-4 h-4" />
                <span>Add Expected Output</span>
              </button>
            </div>
          </div>


          <!-- ==================== STEP 2: DETAILS & BUDGETARY ==================== -->
          <div v-else-if="currentStep === 2" class="space-y-6 animate-in fade-in duration-200">
            <!-- Details of Activities Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Calendar class="w-5 h-5 text-blue-900" />
                <h4 class="text-base font-extrabold text-slate-900">D. Detail of Activities</h4>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Program of Activities *</label>
                  <input
                    type="text"
                    v-model="form.programOfActivitiesTitle"
                    :disabled="isFormReadOnly"
                    placeholder="e.g. Day 1"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
                  />
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    v-model="form.programOfActivitiesDate"
                    :disabled="isFormReadOnly"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
                  />
                </div>
              </div>

              <!-- Schedule Items Table -->
              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3 w-1/3">DATE/TIME</th>
                      <th class="p-3 w-1/3">ACTIVITY</th>
                      <th class="p-3 w-1/3">PERSON-IN-CHARGE</th>
                      <th v-if="!isFormReadOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="(item, idx) in form.scheduleItems" :key="idx" class="hover:bg-slate-50/50">
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="item.dateTime"
                          :disabled="isFormReadOnly"
                          placeholder="Time (e.g. 9:00 AM - 12:00 PM)"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="item.activity"
                          :disabled="isFormReadOnly"
                          placeholder="Enter Activity Description"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="item.personInCharge"
                          :disabled="isFormReadOnly"
                          placeholder="Enter person-in-charge"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td v-if="!isFormReadOnly" class="p-2.5 text-center">
                        <button @click="removeScheduleItem(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                v-if="!isFormReadOnly"
                @click="addScheduleItem"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Schedule Item</span>
              </button>
            </div>

            <!-- Participants Sub-section (Part of Section D: Detail of Activities) -->
            <div class="space-y-2 pt-2 border-t border-slate-200">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Users class="w-4 h-4 text-blue-900" />
                <h4 class="text-sm font-extrabold text-slate-900">Participants *</h4>
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1 text-xs">Target Participants / Target Groups *</label>
                <textarea
                  v-model="form.participantsText"
                  :disabled="isFormReadOnly"
                  rows="3"
                  placeholder="Enter participants details (e.g., 120 student leaders and officers from all accredited organizations, faculty advisers, and invited guests)..."
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium text-xs leading-relaxed"
                ></textarea>
                <p class="text-[11px] text-slate-500 italic mt-1">Input description, target groups, or estimated number of participants.</p>
              </div>
            </div>

            <!-- Budgetary Requirements Section -->
            <div class="space-y-4 pt-4 border-t border-slate-200">
              <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div class="flex items-center gap-2">
                  <DollarSign class="w-5 h-5 text-blue-900" />
                  <h4 class="text-base font-extrabold text-slate-900">E. Budgetary Requirements</h4>
                </div>
                <div class="text-xs font-bold text-slate-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  Total Budget: <strong class="text-emerald-700 font-extrabold">₱{{ totalBudgetCalculated.toLocaleString() }}</strong>
                </div>
              </div>

              <!-- Budget Table -->
              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3 w-1/4">ITEM/S</th>
                      <th class="p-3 w-1/4">PARTICULARS</th>
                      <th class="p-3 w-1/4">AMOUNT</th>
                      <th class="p-3 w-1/4">BUDGET SOURCE</th>
                      <th v-if="!isFormReadOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="(bItem, idx) in form.budgetaryRequirements" :key="idx" class="hover:bg-slate-50/50">
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="bItem.item"
                          :disabled="isFormReadOnly"
                          placeholder="Enter item"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="bItem.particulars"
                          :disabled="isFormReadOnly"
                          placeholder="Enter particular name"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="number"
                          v-model="bItem.amount"
                          :disabled="isFormReadOnly"
                          placeholder="₱ Enter amount"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 font-bold text-emerald-800"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          list="dadBudgetSourceList"
                          v-model="bItem.budgetSource"
                          :disabled="isFormReadOnly"
                          placeholder="Enter budget source"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td v-if="!isFormReadOnly" class="p-2.5 text-center">
                        <button @click="removeBudgetItem(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                v-if="!isFormReadOnly"
                @click="addBudgetItem"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Budget Item</span>
              </button>
            </div>
          </div>


          <!-- ==================== STEP 3: FACILITIES & GOALS ==================== -->
          <div v-else-if="currentStep === 3" class="space-y-6 animate-in fade-in duration-200">
            <!-- Type of Activity Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Building2 class="w-5 h-5 text-blue-900" />
                <h4 class="text-base font-extrabold text-slate-900">F. Type of Activity & Venues</h4>
              </div>

              <div class="w-full sm:w-1/2 text-xs">
                <label class="font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Activity Type *</span>
                  <QuickAddOptionButton
                    category="activity_type"
                    category-name="Activity Type"
                    :current-user="currentUser"
                    @created="(opt) => form.activityType = opt.label"
                    size="sm"
                  />
                </label>
                <input
                  type="text"
                  list="activityTypeList"
                  v-model="form.activityType"
                  :disabled="isFormReadOnly"
                  placeholder="Select or enter Activity Type (e.g. In-Campus, Off-Campus)"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-bold text-slate-800"
                />
                <datalist id="activityTypeList">
                  <option v-for="actType in dynamicActivityTypes" :key="actType" :value="actType">{{ actType }}</option>
                </datalist>
              </div>

              <p class="text-[11px] text-slate-500 italic">
                Fill-out below for In-Campus Activity venue reservations:
              </p>

              <!-- Venues Table -->
              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3">VENUE</th>
                      <th class="p-3">SPECIFIED DATE</th>
                      <th class="p-3">DURATION</th>
                      <th class="p-3">REMARKS</th>
                      <th class="p-3">SIGNATURE</th>
                      <th v-if="!isFormReadOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="(vRow, idx) in form.venueRows" :key="idx" class="hover:bg-slate-50/50">
                      <td class="p-2.5">
                        <input
                          type="text"
                          list="dadVenueList"
                          v-model="vRow.venue"
                          :disabled="isFormReadOnly"
                          placeholder="Enter venue location"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="date"
                          v-model="vRow.specifiedDate"
                          :disabled="isFormReadOnly"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="vRow.duration"
                          :disabled="isFormReadOnly"
                          placeholder="e.g. 1:00PM-4:00PM"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="vRow.remarks"
                          :disabled="isFormReadOnly"
                          placeholder="Enter remarks"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="vRow.signatureStatus"
                          :disabled="isFormReadOnly"
                          placeholder=""
                          class="w-full px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-xs"
                        />
                      </td>
                      <td v-if="!isFormReadOnly" class="p-2.5 text-center">
                        <button @click="removeVenueRow(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                v-if="!isFormReadOnly"
                @click="addVenueRow"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Venue Row</span>
              </button>
            </div>

            <!-- Campus Facilities Sub-section (Part of Section F: Type of Activity) -->
            <div class="space-y-4 pt-2">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Target class="w-5 h-5 text-blue-900" />
                <h4 class="text-base font-extrabold text-slate-900">Campus Facilities</h4>
              </div>

              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3 w-20 text-center">QTY</th>
                      <th class="p-3">DESCRIPTION</th>
                      <th class="p-3">DURATION</th>
                      <th class="p-3">REMARKS</th>
                      <th class="p-3">SIGNATURE</th>
                      <th v-if="!isFormReadOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="(fRow, idx) in form.campusFacilities" :key="idx" class="hover:bg-slate-50/50">
                      <td class="p-2.5">
                        <input
                          type="number"
                          v-model="fRow.quantity"
                          :disabled="isFormReadOnly"
                          placeholder="0"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-center font-bold"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="fRow.description"
                          :disabled="isFormReadOnly"
                          placeholder="Enter description"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="fRow.duration"
                          :disabled="isFormReadOnly"
                          placeholder="e.g. 1:00PM-4:00PM"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="fRow.remarks"
                          :disabled="isFormReadOnly"
                          placeholder="Enter remarks"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="fRow.signatureStatus"
                          :disabled="isFormReadOnly"
                          placeholder=""
                          class="w-full px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-xs"
                        />
                      </td>
                      <td v-if="!isFormReadOnly" class="p-2.5 text-center">
                        <button @click="removeFacilityRow(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                v-if="!isFormReadOnly"
                @click="addFacilityRow"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Facility Row</span>
              </button>
            </div>

            <!-- SDGs Achieved Section -->
            <div class="space-y-3 pt-2">
              <label class="block text-xs font-bold text-slate-700">G. Sustainable Development Goals Achieved *</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-44 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label
                  v-for="sdg in ALL_SDGS"
                  :key="sdg"
                  class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900"
                >
                  <input
                    type="checkbox"
                    :checked="form.sdgsAchieved?.includes(sdg)"
                    @change="toggleSdg(sdg)"
                    :disabled="isFormReadOnly"
                    class="rounded text-blue-900 focus:ring-blue-900"
                  />
                  <span class="font-medium">{{ sdg }}</span>
                </label>
              </div>
            </div>

            <!-- Tagged Colleges -->
            <div class="space-y-3 pt-2">
              <label class="block text-xs font-bold text-slate-700">Tagged Colleges / Entities</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  v-for="college in taggedCollegeOptions"
                  :key="college"
                  class="flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="form.taggedColleges?.includes(college)"
                    @change="toggleCollege(college)"
                    :disabled="isFormReadOnly"
                    class="rounded text-blue-900 focus:ring-blue-900"
                  />
                  <span>{{ college }}</span>
                </label>
              </div>
            </div>

            <!-- Supporting Attachments & Reference Images -->
            <div class="space-y-3 pt-2 border-t border-slate-200">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <label class="block text-xs font-bold text-slate-700">Supporting Documents &amp; Reference Images (Optional)</label>
                  <p class="text-[11px] text-slate-500">Attach letters, venue sketches, endorsement scans, or reference images (PDF, Word, Excel, PNG, JPG up to 15MB).</p>
                </div>
                <button
                  v-if="!isFormReadOnly"
                  type="button"
                  @click="triggerDadAttachmentUpload"
                  :disabled="isUploadingDadAttachment"
                  class="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
                >
                  <Loader2 v-if="isUploadingDadAttachment" class="w-3.5 h-3.5 animate-spin" />
                  <UploadCloud v-else class="w-3.5 h-3.5" />
                  <span>{{ isUploadingDadAttachment ? 'Uploading...' : 'Attach Files' }}</span>
                </button>
              </div>

              <input
                ref="dadAttachmentInput"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                class="hidden"
                @change="handleDadAttachmentUpload"
              />

              <div v-if="dadUploadError" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {{ dadUploadError }}
              </div>

              <div v-if="form.attachmentFiles && form.attachmentFiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div
                  v-for="(item, idx) in form.attachmentFiles"
                  :key="idx"
                  class="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        v-if="getAttachmentUrl(item) && isImageAttachment(getAttachmentName(item))"
                        :src="getAttachmentUrl(item)"
                        :alt="getAttachmentName(item)"
                        class="w-full h-full object-cover"
                      />
                      <Paperclip v-else class="w-4 h-4" />
                    </div>
                    <div class="min-w-0">
                      <span class="block truncate font-semibold text-slate-800" :title="getAttachmentName(item)">
                        {{ getAttachmentName(item) }}
                      </span>
                      <span v-if="typeof item !== 'string' && item.fileSize" class="text-[10px] text-slate-500">
                        {{ item.fileSize }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <a
                      v-if="getAttachmentUrl(item)"
                      :href="getAttachmentUrl(item)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="p-1 text-slate-500 hover:text-blue-700 rounded hover:bg-blue-50"
                      title="View file"
                    >
                      <ExternalLink class="w-3.5 h-3.5" />
                    </a>
                    <a
                      v-if="getAttachmentUrl(item)"
                      :href="buildFileActionUrl(getAttachmentUrl(item), true)"
                      :download="getAttachmentName(item)"
                      class="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-emerald-50"
                      title="Download file"
                    >
                      <Download class="w-3.5 h-3.5" />
                    </a>
                    <button
                      v-if="!isFormReadOnly"
                      type="button"
                      @click="removeDadAttachment(idx)"
                      class="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                      title="Remove attachment"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>


          <!-- ==================== STEP 4: REVIEW & SUBMIT ==================== -->
          <div v-else-if="currentStep === 4" class="space-y-6 animate-in fade-in duration-200">
            <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <CheckCircle2 class="w-5 h-5 text-blue-900" />
              <h4 class="text-base font-extrabold text-slate-900">Review & Submit</h4>
            </div>

            <!-- Basic Information Summary Card -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Basic Information</span>
                <button v-if="!isFormReadOnly" @click="currentStep = 1" class="text-blue-900 hover:underline text-[11px] cursor-pointer">Edit</button>
              </h5>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2.5 gap-x-4">
                <div><span class="text-slate-500 block text-[11px]">Activity Title:</span> <strong class="text-slate-900 font-semibold">{{ form.activityTitle || '—' }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Control Number:</span> <strong class="text-slate-900 font-semibold">{{ form.controlNumber || getDadControlNo(activity, form) }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Office Code:</span> <span class="text-slate-800 font-medium">{{ form.officeCode || `OVCSAS-OSIPS-OSD-OSW-${activity?.orgId || 'SSC'}` }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Date Prepared:</span> <span class="text-slate-800 font-medium">{{ form.datePrepared || '—' }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Unit/College:</span> <span class="text-slate-800 font-medium">{{ form.unitCollege || activity?.orgId || '—' }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Department:</span> <span class="text-slate-800 font-medium">{{ form.department || activity?.office || (isCollege ? `${activity ? resolveDadOrgAcronym(activity) : 'Organization'} Student Organizations` : 'Student Organizations & Services') }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Venue:</span> <span class="text-slate-800 font-medium">{{ form.venue || '—' }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Result Code / OPCR / IPCR Code:</span> <strong class="text-slate-900 font-semibold">{{ form.resultCode || '—' }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Proposed Budget:</span> <strong class="text-slate-900 font-bold">₱{{ totalBudgetCalculated.toLocaleString() }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Budget Source:</span> <span class="text-slate-800 font-medium">{{ form.budgetSource || '—' }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Date of Implementation:</span> <span class="text-slate-800 font-medium">{{ form.dateImplementation || '—' }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Duration (in days):</span> <strong class="text-slate-900 font-semibold">{{ formattedDuration }}</strong></div>
                <div>
                  <span class="text-slate-500 block text-[11px]">Included in Plan &amp; Year:</span>
                  <span class="text-slate-800 font-medium">
                    {{ resolveDadPoeLine(form).label }} — {{ resolveDadPoeLine(form).isYes ? 'Yes' : 'No' }}
                  </span>
                </div>
                <div><span class="text-slate-500 block text-[11px]">Email Address:</span> <span class="text-slate-800 font-medium">{{ form.emailAddress || '—' }}</span></div>
              </div>

              <div class="pt-2">
                <span class="text-slate-500 block text-[11px] mb-1">A. Rationale:</span>
                <p class="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-line">{{ form.rationale || 'None specified' }}</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span class="text-slate-500 block text-[11px] mb-1">B. Objectives:</span>
                  <ul v-if="form.objectivesList?.filter(Boolean).length" class="list-disc list-inside bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1 text-slate-800">
                    <li v-for="(obj, oIdx) in form.objectivesList.filter(Boolean)" :key="oIdx">{{ obj }}</li>
                  </ul>
                  <p v-else class="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-line">{{ form.objectives || 'None specified' }}</p>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px] mb-1">C. Expected Output:</span>
                  <ul v-if="form.expectedOutputsList?.filter(Boolean).length" class="list-disc list-inside bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1 text-slate-800">
                    <li v-for="(out, eIdx) in form.expectedOutputsList.filter(Boolean)" :key="eIdx">{{ out }}</li>
                  </ul>
                  <p v-else class="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-line">{{ form.expectedOutput || 'None specified' }}</p>
                </div>
              </div>
            </div>

            <!-- Details & Budgetary Summary Card -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>D. Detail of Activities &amp; E. Budgetary Requirements</span>
                <button v-if="!isFormReadOnly" @click="currentStep = 2" class="text-blue-900 hover:underline text-[11px] cursor-pointer">Edit</button>
              </h5>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 pb-1">
                <div><span class="text-slate-500 block text-[11px]">Program of Activities:</span> <strong class="text-slate-900 font-semibold">{{ form.programOfActivitiesTitle || '—' }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Program Date:</span> <strong class="text-slate-900 font-semibold">{{ form.programOfActivitiesDate || form.dateImplementation || '—' }}</strong></div>
              </div>

              <div class="space-y-2">
                <span class="text-slate-500 block text-[11px]">Schedule Items ({{ form.scheduleItems?.length || 0 }} items):</span>
                <div v-if="form.scheduleItems && form.scheduleItems.length > 0" class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                  <table class="w-full text-left text-[11px]">
                    <thead class="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                      <tr>
                        <th class="p-2">Date/Time</th>
                        <th class="p-2">Activity Description</th>
                        <th class="p-2">Person in Charge</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="(sch, sIdx) in form.scheduleItems" :key="sIdx">
                        <td class="p-2 font-medium">{{ sch.dateTime || '—' }}</td>
                        <td class="p-2 text-slate-600">{{ sch.activity || '—' }}</td>
                        <td class="p-2 text-slate-600">{{ sch.personInCharge || '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/80">No schedule items added.</p>

                <div class="pt-2">
                  <span class="text-slate-500 block text-[11px] mb-1">Participants:</span>
                  <p class="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-line">{{ form.participantsText || 'None specified' }}</p>
                </div>

                <div class="pt-2">
                  <span class="text-slate-500 block text-[11px] mb-1">E. Budgetary Requirements (Total: ₱{{ totalBudgetCalculated.toLocaleString() }}):</span>
                  <div v-if="form.budgetaryRequirements && form.budgetaryRequirements.length > 0" class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                    <table class="w-full text-left text-[11px]">
                      <thead class="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th class="p-2">Item</th>
                          <th class="p-2">Particulars</th>
                          <th class="p-2">Amount</th>
                          <th class="p-2">Source</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        <tr v-for="(b, bIdx) in form.budgetaryRequirements" :key="bIdx">
                          <td class="p-2 font-medium">{{ b.item || '—' }}</td>
                          <td class="p-2 text-slate-600">{{ b.particulars || '—' }}</td>
                          <td class="p-2 font-bold text-emerald-700">₱{{ Number(b.amount || 0).toLocaleString() }}</td>
                          <td class="p-2 text-slate-600">{{ b.budgetSource || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/80">No itemized budgetary requirements listed.</p>
                </div>
              </div>
            </div>

            <!-- Facilities & Goals Summary Card -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>F. Type of Activity &amp; G. SDGs Achieved</span>
                <button v-if="!isFormReadOnly" @click="currentStep = 3" class="text-blue-900 hover:underline text-[11px] cursor-pointer">Edit</button>
              </h5>

              <div class="space-y-3">
                <div><span class="text-slate-500 block text-[11px]">F. Type of Activity &amp; Venue:</span> <strong class="text-slate-800">{{ form.activityType || 'In-Campus' }} - {{ form.venue || '—' }}</strong></div>

                <div>
                  <span class="text-slate-500 block text-[11px] mb-1">Venue/s Reservations ({{ form.venueRows?.length || 0 }}):</span>
                  <div v-if="form.venueRows && form.venueRows.length > 0" class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                    <table class="w-full text-left text-[11px]">
                      <thead class="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th class="p-2">Venue</th>
                          <th class="p-2">Date</th>
                          <th class="p-2">Duration</th>
                          <th class="p-2">Remarks</th>
                          <th class="p-2">Signature</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        <tr v-for="(vRow, vIdx) in form.venueRows" :key="vIdx">
                          <td class="p-2 font-medium">{{ vRow.venue || '—' }}</td>
                          <td class="p-2 text-slate-600">{{ vRow.specifiedDate || '—' }}</td>
                          <td class="p-2 text-slate-600">{{ vRow.duration || '—' }}</td>
                          <td class="p-2 text-slate-600">{{ vRow.remarks || '—' }}</td>
                          <td class="p-2 text-slate-600">{{ vRow.signatureStatus || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/80">No venue reservation rows listed.</p>
                </div>

                <div>
                  <span class="text-slate-500 block text-[11px] mb-1">Campus Facilities ({{ form.campusFacilities?.length || 0 }}):</span>
                  <div v-if="form.campusFacilities && form.campusFacilities.length > 0" class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                    <table class="w-full text-left text-[11px]">
                      <thead class="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th class="p-2">Qty</th>
                          <th class="p-2">Description</th>
                          <th class="p-2">Duration</th>
                          <th class="p-2">Remarks</th>
                          <th class="p-2">Signature</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        <tr v-for="(fRow, fIdx) in form.campusFacilities" :key="fIdx">
                          <td class="p-2 font-medium">{{ fRow.quantity ?? 1 }}</td>
                          <td class="p-2 text-slate-600">{{ fRow.description || '—' }}</td>
                          <td class="p-2 text-slate-600">{{ fRow.duration || '—' }}</td>
                          <td class="p-2 text-slate-600">{{ fRow.remarks || '—' }}</td>
                          <td class="p-2 text-slate-600">{{ fRow.signatureStatus || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p v-else class="text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/80">None requested.</p>
                </div>

                <div>
                  <span class="text-slate-500 block text-[11px] mb-1">G. Sustainable Development Goals Achieved:</span>
                  <div v-if="form.sdgsAchieved && form.sdgsAchieved.length > 0" class="flex flex-wrap gap-1">
                    <span v-for="sdg in form.sdgsAchieved" :key="sdg" class="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[11px] font-semibold">
                      {{ sdg }}
                    </span>
                  </div>
                  <p v-else class="text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/80">None selected.</p>
                </div>
                <div v-if="form.taggedColleges && form.taggedColleges.length > 0">
                  <span class="text-slate-500 block text-[11px] mb-1">Tagged Colleges / Entities:</span>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="col in form.taggedColleges" :key="col" class="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded text-[11px] font-semibold">
                      {{ col }}
                    </span>
                  </div>
                </div>
                <div>
                  <span class="text-slate-500 block text-[11px] mb-1">Supporting Documents ({{ form.attachmentFiles?.length || 0 }}):</span>
                  <div v-if="form.attachmentFiles && form.attachmentFiles.length > 0" class="flex flex-wrap gap-1.5">
                    <a
                      v-for="(att, ai) in form.attachmentFiles"
                      :key="ai"
                      :href="getAttachmentUrl(att) || undefined"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-800 border border-slate-200 rounded text-[11px] font-medium hover:border-blue-400"
                    >
                      <Paperclip class="w-3 h-3 text-blue-600" />
                      <span>{{ getAttachmentName(att) }}</span>
                    </a>
                  </div>
                  <p v-else class="text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/80">None attached.</p>
                </div>
              </div>
            </div>

            <!-- Official Signatories (6-Block Routing) Summary Card -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2">
                Official Signatories (6-Block Routing)
              </h5>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span class="text-slate-500 block">(1) Prepared by:</span>
                  <strong class="text-slate-900 uppercase">{{ preparedByResolved.name }}</strong>
                  <span class="text-slate-600 block">{{ preparedByResolved.role }}</span>
                </div>
                <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span class="text-slate-500 block">(4) Funds Cleared by:</span>
                  <strong class="text-slate-900 uppercase">RHODA D. PERPETUA, CPA</strong>
                  <span class="text-slate-600 block">Vice Chancellor for Administration and Finance</span>
                </div>
                <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span class="text-slate-500 block">(2) Reviewed by:</span>
                  <strong class="text-slate-900 uppercase">SYLVIA C. LABIAL, RPM</strong>
                  <span class="text-slate-600 block">Director, OSD</span>
                </div>
                <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span class="text-slate-500 block">(5) Approved by:</span>
                  <strong class="text-slate-900 uppercase">ELNOR C. ROA, PhD</strong>
                  <span class="text-slate-600 block">Chancellor</span>
                </div>
                <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span class="text-slate-500 block">(3) Endorsed by:</span>
                  <strong class="text-slate-900 uppercase">ARLEEN B. UY, MPA</strong>
                  <span class="text-slate-600 block">Vice Chancellor for Student Affairs and Services</span>
                </div>
                <div class="bg-white p-2.5 rounded-lg border border-slate-200/80">
                  <span class="text-slate-500 block">(6) Recorded by:</span>
                  <strong class="text-slate-900 uppercase">RAFAEL J. VICENTE</strong>
                  <span class="text-slate-600 block">Monitoring and Evaluation Personnel</span>
                </div>
              </div>
            </div>

            <!-- Before Submitting Alert Box -->
            <div class="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs flex items-start gap-3 shadow-2xs">
              <Info class="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
              <div class="space-y-1">
                <h6 class="font-extrabold text-sky-950">Before Submitting:</h6>
                <ul class="list-disc list-inside space-y-0.5 text-sky-800 text-[11px]">
                  <li>Review all information for accuracy</li>
                  <li>Ensure all required fields are filled</li>
                  <li>Verify dates and venue availability</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        <!-- Modal Stepper Footer -->
        <div class="px-3 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <!-- Document Utilities (Preview Only) -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 touch-scroll">
            <!-- Preview Modal Button -->
            <button
              type="button"
              @click="isDadPreviewOpen = true"
              class="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Preview official printable document"
            >
              <Eye class="w-3.5 h-3.5 text-blue-900" />
              <span>Preview</span>
            </button>
          </div>

          <!-- Navigation Action Buttons (Cancel, Previous, Next / Submit) -->
          <div class="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <button
              @click="emit('close')"
              class="btn-secondary btn-sm"
            >
              Cancel
            </button>

            <div class="flex items-center gap-2">
              <button
                @click="currentStep > 1 ? currentStep-- : emit('close')"
                :disabled="currentStep === 1"
                class="btn-secondary btn-sm"
              >
                <ChevronLeft class="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                v-if="!isFormReadOnly"
                type="button"
                @click="handleSaveDraft"
                class="btn-secondary btn-sm flex items-center gap-1.5"
                title="Save incomplete progress to database without submitting"
              >
                <Save class="w-3.5 h-3.5 text-blue-800" />
                <span>Save Draft</span>
              </button>

              <!-- Next Button for Steps 1-3 -->
              <button
                v-if="currentStep < 4"
                @click="handleNextStep"
                class="btn-primary btn-sm"
              >
                <span>Next</span>
                <ChevronRight class="w-4 h-4" />
              </button>

              <!-- Submit for Approval Button for Step 4 -->
              <button
                v-else-if="!isFormReadOnly"
                @click="handleSave"
                :disabled="isSubmitBlocked"
                class="btn-primary btn-sm flex items-center gap-1.5"
                :class="isSubmitBlocked ? 'opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400' : ''"
                :title="isSubmitBlocked ? 'Submission blocked: Venue scheduling conflict exists with another organization.' : 'Submit DAD Form for official endorsement'"
              >
                <Send class="w-4 h-4" />
                <span>Submit</span>
              </button>

              <div
                v-else
                class="text-xs text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold"
              >
                <Lock class="w-3.5 h-3.5 text-blue-700" />
                <span>{{ isSubmittedLocked ? 'Submitted & Locked (Read-Only)' : 'Read-Only View' }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- PRINTABLE DETAILED ACTIVITY DESIGN (OFFICIAL UNIVERSITY FORMAT)           -->
    <!-- Visible ONLY when printing (media print via #printable-dad-document)       -->
    <!-- ========================================================================= -->
    <div v-if="activity" id="printable-dad-document" class="hidden print:block text-black bg-white">
      <!-- Institutional Header -->
      <div class="text-center pb-3 border-b-2 border-black mb-4">
        <p class="text-[11px] uppercase tracking-wider font-semibold">Republic of the Philippines</p>
        <h1 class="text-base font-extrabold uppercase tracking-wide">MINDANAO STATE UNIVERSITY AT NAAWAN</h1>
        <p class="text-[10px] text-gray-700">9023 Naawan, Misamis Oriental, Philippines</p>
        <p class="text-[11px] font-bold uppercase tracking-wider mt-1 text-blue-950">
          OFFICE OF STUDENT DEVELOPMENT &bull; OFFICE OF THE VICE CHANCELLOR FOR STUDENT AFFAIRS AND SERVICES
        </p>
        <h2 class="text-sm font-black uppercase tracking-wider mt-2 bg-gray-100 py-1 border-y border-black">
          DETAILED ACTIVITY DESIGN (DAD)
        </h2>
      </div>

      <!-- Administrative Specifications (Two Columns Table) -->
      <table class="w-full border-collapse border border-black text-[11px] mb-4">
        <tbody>
          <tr>
            <td class="border border-black p-1.5 font-bold w-1/4 bg-gray-50">ACTIVITY TITLE:</td>
            <td class="border border-black p-1.5 font-semibold w-1/4">{{ form.activityTitle || activity.title }}</td>
            <td class="border border-black p-1.5 font-bold w-1/4 bg-gray-50">OFFICE CODE:</td>
            <td class="border border-black p-1.5 w-1/4">{{ form.officeCode || 'OSD-04' }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">CONTROL NUMBER:</td>
            <td class="border border-black p-1.5">{{ form.controlNumber || getDadControlNo(activity, form) }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">DATE PREPARED:</td>
            <td class="border border-black p-1.5">{{ form.datePrepared || new Date().toISOString().split('T')[0] }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">UNIT / COLLEGE:</td>
            <td class="border border-black p-1.5">{{ form.unitCollege || activity.orgId }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">DEPARTMENT:</td>
            <td class="border border-black p-1.5">{{ form.department || 'Student Organizations' }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">VENUE:</td>
            <td class="border border-black p-1.5">{{ form.venue || activity.venue }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">DATE OF IMPLEMENTATION:</td>
            <td class="border border-black p-1.5">{{ form.dateImplementation || activity.startDate }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">PROPOSED BUDGET:</td>
            <td class="border border-black p-1.5 font-bold">₱{{ totalBudgetCalculated.toLocaleString() }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">RESULT CODE:</td>
            <td class="border border-black p-1.5">{{ form.resultCode || '—' }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">BUDGET SOURCE:</td>
            <td class="border border-black p-1.5">{{ form.budgetSource || '—' }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">INCLUDED IN THE (_____) YEAR: (_____):</td>
            <td class="border border-black p-1.5 font-semibold">{{ resolveDadPoeLine(form).label }} — {{ resolveDadPoeLine(form).isYes ? 'Yes' : 'No' }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">EMAIL ADDRESS:</td>
            <td class="border border-black p-1.5">{{ form.emailAddress || '—' }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">DURATION (IN DAYS):</td>
            <td class="border border-black p-1.5">{{ formattedDuration }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Section A: RATIONALE -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">A. RATIONALE</h3>
        <p class="text-[11px] leading-relaxed text-justify px-1 whitespace-pre-line">{{ form.rationale || activity.description }}</p>
      </div>

      <!-- Section B: OBJECTIVES -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">B. OBJECTIVES</h3>
        <ol class="list-decimal list-inside text-[11px] space-y-0.5 px-2">
          <li v-for="(obj, oIdx) in (form.objectivesList?.length ? form.objectivesList : (form.objectives || '').split('\n')).filter(Boolean)" :key="oIdx">
            {{ obj }}
          </li>
        </ol>
      </div>

      <!-- Section C: EXPECTED OUTPUT -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">C. EXPECTED OUTPUT</h3>
        <ol class="list-decimal list-inside text-[11px] space-y-0.5 px-2">
          <li v-for="(out, uIdx) in (form.expectedOutputsList?.length ? form.expectedOutputsList : (form.expectedOutput || '').split('\n')).filter(Boolean)" :key="uIdx">
            {{ out }}
          </li>
        </ol>
      </div>

      <!-- Section D: DETAIL OF ACTIVITIES & PARTICIPANTS -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          D. DETAIL OF ACTIVITIES
        </h3>
        <div v-if="form.programOfActivitiesTitle || form.programOfActivitiesDate" class="text-[10px] italic px-1 mb-1">
          Program of Activities: <strong>{{ form.programOfActivitiesTitle || 'Day 1' }}</strong>
          <span v-if="form.programOfActivitiesDate"> ({{ form.programOfActivitiesDate }})</span>
        </div>
        <table v-if="form.scheduleItems && form.scheduleItems.length > 0" class="w-full border-collapse border border-black text-[10px] mb-2">
          <thead class="bg-gray-100 font-bold">
            <tr>
              <th class="border border-black p-1 text-left w-1/4">DATE / TIME</th>
              <th class="border border-black p-1 text-left w-1/2">ACTIVITY</th>
              <th class="border border-black p-1 text-left w-1/4">PERSON IN-CHARGE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sch, sIdx) in form.scheduleItems" :key="sIdx">
              <td class="border border-black p-1">{{ sch.dateTime }}</td>
              <td class="border border-black p-1">{{ sch.activity }}</td>
              <td class="border border-black p-1">{{ sch.personInCharge }}</td>
            </tr>
          </tbody>
        </table>
        <div class="px-1">
          <p class="text-[10px] font-bold uppercase mb-0.5">Participants:</p>
          <p class="text-[11px] leading-relaxed whitespace-pre-line">{{ form.participantsText || 'All bona fide student members, student leaders, and faculty advisers.' }}</p>
        </div>
      </div>

      <!-- Section E: BUDGETARY REQUIREMENTS -->
      <div class="mb-3">
        <div class="flex justify-between items-center border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          <h3 class="text-[11px] font-bold uppercase">E. BUDGETARY REQUIREMENTS</h3>
          <span class="text-[11px] font-bold">TOTAL: ₱{{ totalBudgetCalculated.toLocaleString() }}</span>
        </div>
        <table class="w-full border-collapse border border-black text-[10px]">
          <thead class="bg-gray-100 font-bold">
            <tr>
              <th class="border border-black p-1 text-left w-1/4">ITEM/S</th>
              <th class="border border-black p-1 text-left w-1/3">PARTICULARS</th>
              <th class="border border-black p-1 text-left w-1/4">BUDGET SOURCE</th>
              <th class="border border-black p-1 text-right w-1/6">AMOUNT (₱)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, bIdx) in form.budgetaryRequirements" :key="bIdx">
              <td class="border border-black p-1 font-semibold">{{ b.item }}</td>
              <td class="border border-black p-1">{{ b.particulars }}</td>
              <td class="border border-black p-1">{{ b.budgetSource }}</td>
              <td class="border border-black p-1 text-right font-bold">{{ Number(b.amount).toLocaleString() }}</td>
            </tr>
            <tr class="bg-gray-50 font-bold">
              <td colspan="3" class="border border-black p-1 text-right">TOTAL BUDGETARY REQUIREMENT:</td>
              <td class="border border-black p-1 text-right">₱{{ totalBudgetCalculated.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section F: TYPE OF ACTIVITY, VENUES & CAMPUS FACILITIES -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          F. TYPE OF ACTIVITY ({{ form.activityType || 'In-Campus' }}) &amp; VENUE RESERVATIONS
        </h3>
        <table class="w-full border-collapse border border-black text-[10px] mb-2">
          <thead class="bg-gray-100 font-bold">
            <tr>
              <th class="border border-black p-1 text-left w-1/4">VENUE</th>
              <th class="border border-black p-1 text-left w-1/5">SPECIFIED DATE</th>
              <th class="border border-black p-1 text-left w-1/6">DURATION</th>
              <th class="border border-black p-1 text-left w-1/5">REMARKS</th>
              <th class="border border-black p-1 text-center w-1/5">SIGNATURE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, vIdx) in form.venueRows" :key="vIdx">
              <td class="border border-black p-1 font-semibold">{{ v.venue }}</td>
              <td class="border border-black p-1">{{ v.specifiedDate }}</td>
              <td class="border border-black p-1">{{ v.duration }}</td>
              <td class="border border-black p-1">{{ v.remarks }}</td>
              <td class="border border-black p-1 text-center h-8">
                <span v-if="v.signatureStatus" class="font-semibold">{{ v.signatureStatus }}</span>
                <span v-else class="block border-b border-gray-400 w-3/4 mx-auto mt-4"></span>
              </td>
            </tr>
          </tbody>
        </table>

        <p class="text-[10px] font-bold uppercase px-1 mb-1">Campus Facilities:</p>
        <table class="w-full border-collapse border border-black text-[10px]">
          <thead class="bg-gray-100 font-bold">
            <tr>
              <th class="border border-black p-1 text-center w-12">QTY</th>
              <th class="border border-black p-1 text-left w-1/3">DESCRIPTION</th>
              <th class="border border-black p-1 text-left w-1/5">DURATION</th>
              <th class="border border-black p-1 text-left w-1/5">REMARKS</th>
              <th class="border border-black p-1 text-center w-1/5">SIGNATURE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, fIdx) in form.campusFacilities" :key="fIdx">
              <td class="border border-black p-1 text-center font-bold">{{ f.quantity }}</td>
              <td class="border border-black p-1">{{ f.description }}</td>
              <td class="border border-black p-1">{{ f.duration }}</td>
              <td class="border border-black p-1">{{ f.remarks }}</td>
              <td class="border border-black p-1 text-center h-8">
                <span v-if="f.signatureStatus" class="font-semibold">{{ f.signatureStatus }}</span>
                <span v-else class="block border-b border-gray-400 w-3/4 mx-auto mt-4"></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section G: SDGs ACHIEVED -->
      <div class="mb-4" v-if="form.sdgsAchieved && form.sdgsAchieved.length > 0">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          G. SUSTAINABLE DEVELOPMENT GOALS (SDGs) ACHIEVED
        </h3>
        <p class="text-[11px] px-1">{{ form.sdgsAchieved.join(' • ') }}</p>
      </div>

      <!-- Supporting Documents -->
      <div class="mb-4">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          SUPPORTING DOCUMENTS &amp; REFERENCE IMAGES ({{ form.attachmentFiles?.length || 0 }})
        </h3>
        <ul v-if="form.attachmentFiles && form.attachmentFiles.length > 0" class="list-disc list-inside text-[11px] px-2 space-y-0.5">
          <li v-for="(att, aIdx) in form.attachmentFiles" :key="aIdx">
            {{ getAttachmentName(att) }}
          </li>
        </ul>
        <p v-else class="text-[11px] italic text-gray-600 px-1">None attached.</p>
      </div>

      <!-- SIGNATORY AND APPROVAL ROUTING BLOCK (6-BLOCK ROUTING) -->
      <div class="border border-black p-3 mt-4 text-[11px] page-break-inside-avoid">
        <p class="font-bold uppercase tracking-wider text-[10px] text-center border-b border-black pb-1 mb-3">
          INSTITUTIONAL ENDORSEMENT AND APPROVAL ROUTING
        </p>

        <div class="grid grid-cols-2 gap-y-6 gap-x-8 text-center pt-2">
          <!-- (1) Prepared by -->
          <div>
            <p class="text-[10px] text-gray-600 mb-6 text-left">(1) Prepared by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">{{ preparedByResolved.name }}</p>
            <p class="text-[10px] font-semibold text-gray-700">{{ preparedByResolved.role }}</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- (4) Funds Cleared by -->
          <div>
            <p class="text-[10px] text-gray-600 mb-6 text-left">(4) Funds Cleared by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">RHODA D. PERPETUA, CPA</p>
            <p class="text-[10px] font-semibold text-gray-700">Vice Chancellor for Administration and Finance</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- (2) Reviewed by -->
          <div>
            <p class="text-[10px] text-gray-600 mb-6 text-left">(2) Reviewed by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">SYLVIA C. LABIAL, RPM</p>
            <p class="text-[10px] font-semibold text-gray-700">Director, OSD</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- (5) Approved by -->
          <div>
            <p class="text-[10px] text-gray-600 mb-6 text-left">(5) Approved by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">ELNOR C. ROA, PhD</p>
            <p class="text-[10px] font-semibold text-gray-700">Chancellor</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- (3) Endorsed by -->
          <div>
            <p class="text-[10px] text-gray-600 mb-6 text-left">(3) Endorsed by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">ARLEEN B. UY, MPA</p>
            <p class="text-[10px] font-semibold text-gray-700">Vice Chancellor for Student Affairs and Services</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- (6) Recorded by -->
          <div>
            <p class="text-[10px] text-gray-600 mb-6 text-left">(6) Recorded by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">RAFAEL J. VICENTE</p>
            <p class="text-[10px] font-semibold text-gray-700">Monitoring and Evaluation Personnel</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Official DAD Document Viewer & Export Modal -->
    <DadDocumentModal
      :is-open="isDadPreviewOpen"
      :activity="activity"
      :form-overrides="form"
      @close="isDadPreviewOpen = false"
    />

    <datalist id="dadFiscalYearList">
      <option v-for="fy in dynamicFiscalYears" :key="fy" :value="fy">{{ fy }}</option>
    </datalist>
  </div>
</template>
