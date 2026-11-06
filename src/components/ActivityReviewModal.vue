<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Activity, 
  UserAccount, 
  ActivityApprovalStatus, 
  ActivityApprovalDecision,
  TimelineStep,
  formatUserRole
} from '../types';
import { 
  evaluateStepPermission, 
  getWorkflowTimelineForOrg, 
  isCollegeOrg,
  getOrgTheme
} from '../data/initialData';
import { isSameOrg } from '../utils/organizationUtils';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  User, 
  Building2, 
  Calendar, 
  Coins, 
  History, 
  MessageSquare, 
  Check, 
  ShieldAlert, 
  Send,
  Sparkles,
  Info,
  RotateCcw
} from 'lucide-vue-next';

const props = defineProps<{
  activity: Activity | null;
  isOpen: boolean;
  currentUser: UserAccount | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'approve', activityId: string, remarks?: string): void;
  (e: 'defer', activityId: string, reason: string): void;
  (e: 'reject', activityId: string, remarks: string): void;
  (e: 'resubmit', activityId: string, notes?: string): void;
  (e: 'setDraft', activityId: string): void;
}>();

// Active tab in modal: 'details' | 'budget' | 'decisions_history'
const activeTab = ref<'details' | 'budget' | 'decisions_history'>('details');

// Dialog action states
const isDeferDialogOpen = ref(false);
const deferReasonText = ref('');
const isRejectDialogOpen = ref(false);
const rejectRemarksText = ref('');
const isResubmitDialogOpen = ref(false);
const resubmitNotesText = ref('');
const approvalRemarksText = ref('');

// Computed Action Plan identification
const isActionPlanItem = computed(() => {
  if (!props.activity) return false;
  return Boolean(
    props.activity.isActionPlanItem ||
    props.activity.source === 'ACTION_PLAN' ||
    props.activity.timeframeMonth ||
    props.activity.lineItemBudget ||
    (props.activity.fiscalYear && props.activity.fiscalYear.includes('2027')) ||
    props.activity.id?.startsWith('ACT-2027-')
  );
});

// Organization Ownership
const isOrgOwner = computed(() => {
  if (!props.currentUser || !props.activity) return false;
  const role = props.currentUser.activeRole || props.currentUser.role || '';
  const isOfficer = role === 'ROLE_ORGANIZATION' || 
    role === 'Student Organization Officer' ||
    role === 'Org President' || 
    role === 'Org Treasurer';
  return isOfficer && isSameOrg(props.currentUser.orgId, props.activity.orgId);
});

// Computed hierarchy & timeline
const timelineStages = computed<TimelineStep[]>(() => {
  if (!props.activity) return [];
  if (props.activity.timeline && props.activity.timeline.length > 0) {
    return props.activity.timeline;
  }
  return getWorkflowTimelineForOrg(props.activity.orgId);
});

const isCollege = computed(() => {
  return props.activity ? isCollegeOrg(props.activity.orgId) : false;
});

const maxStages = computed(() => {
  return isCollege.value ? 7 : 6;
});

const currentStageIndex = computed<number>(() => {
  if (!props.activity) return 1;
  if (!props.activity.designForm?.isCompleted) return 1;
  if (props.activity.approvalStageIndex && props.activity.approvalStageIndex > 0) {
    return props.activity.approvalStageIndex;
  }
  if (props.activity.approvalStatus === 'Fully Approved' || props.activity.status === 'Approved') {
    return maxStages.value;
  }
  const inProgress = timelineStages.value.find(s => s.status === 'in_progress');
  if (inProgress) return inProgress.id;
  return 1;
});

const currentStageStep = computed<TimelineStep | undefined>(() => {
  return timelineStages.value.find(s => s.id === currentStageIndex.value);
});

const isFinalStage = computed(() => {
  return currentStageIndex.value >= maxStages.value;
});

// Permission check for current user
const permission = computed(() => {
  if (!props.activity) {
    return { canApprove: false, canDefer: false, canReject: false, reason: 'No activity selected' };
  }
  return evaluateStepPermission(props.currentUser, props.activity, currentStageIndex.value);
});

// Normalized approval status
const displayApprovalStatus = computed<ActivityApprovalStatus>(() => {
  if (!props.activity) return 'Draft';
  if (props.activity.status === 'Rejected' || props.activity.approvalStatus === 'Rejected') return 'Rejected';
  if (props.activity.status === 'Approved' || props.activity.approvalStatus === 'Fully Approved' || props.activity.workflowStatus === 'COMPLETED') return 'Fully Approved';
  if (isActionPlanItem.value) return 'Draft';
  if (props.activity.status === 'DEFERRED' || props.activity.status === 'DEFERRED FOR REVISION') return 'Deferred';
  if (props.activity.approvalStatus) return props.activity.approvalStatus;
  if (props.activity.status === 'Pending') return 'Pending Review';
  return 'Draft';
});

// Status badge styling
const statusBadgeConfig = computed(() => {
  const status = displayApprovalStatus.value;
  switch (status) {
    case 'Draft':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Draft' };
    case 'Pending Review':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', label: 'Pending Review' };
    case 'Approved at Current Stage':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300', label: 'Approved at Stage' };
    case 'Fully Approved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', label: 'Fully Approved' };
    case 'Deferred':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', label: 'Deferred for Revision' };
    case 'Rejected':
      return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', label: 'Rejected' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: status };
  }
});

// Format currency
const formatCurrency = (val?: number): string => {
  return `₱${(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Approval decisions history list
const decisionsList = computed<ActivityApprovalDecision[]>(() => {
  if (!props.activity) return [];
  const list = props.activity.approvalDecisions || [];
  // Sort descending by timestamp
  return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
});

// Actions
const handleApproveClick = () => {
  if (!props.activity) return;
  if (!isActionPlanItem.value && !isOrgOwner.value && !props.activity.designForm?.isCompleted) return;
  emit('approve', props.activity.id, approvalRemarksText.value.trim() || undefined);
};

const handleOpenDefer = () => {
  deferReasonText.value = '';
  isDeferDialogOpen.value = true;
};

const handleConfirmDefer = () => {
  if (!props.activity || !deferReasonText.value.trim()) return;
  emit('defer', props.activity.id, deferReasonText.value.trim());
  isDeferDialogOpen.value = false;
};

const handleOpenReject = () => {
  rejectRemarksText.value = '';
  isRejectDialogOpen.value = true;
};

const handleConfirmReject = () => {
  if (!props.activity) return;
  const remarks = rejectRemarksText.value.trim() || 'Rejected by Organization';
  emit('reject', props.activity.id, remarks);
  isRejectDialogOpen.value = false;
};

const handleSetDraftClick = () => {
  if (!props.activity) return;
  emit('setDraft', props.activity.id);
};

const handleOpenResubmit = () => {
  resubmitNotesText.value = '';
  isResubmitDialogOpen.value = true;
};

const handleConfirmResubmit = () => {
  if (!props.activity) return;
  emit('resubmit', props.activity.id, resubmitNotesText.value.trim() || undefined);
  isResubmitDialogOpen.value = false;
};

// Check if current user is organization officer who can resubmit
const canOrgResubmit = computed(() => {
  if (!props.currentUser || !props.activity) return false;
  return isOrgOwner.value &&
    (displayApprovalStatus.value === 'Deferred' || props.activity.status === 'DEFERRED');
});
</script>

<template>
  <div 
    v-if="isOpen && activity"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
  >
    <div class="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span 
            class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border shadow-2xs"
            :class="[
              getOrgTheme(activity.orgId).badgeBg,
              getOrgTheme(activity.orgId).badgeText,
              getOrgTheme(activity.orgId).badgeBorder
            ]"
          >
            <Building2 class="w-3.5 h-3.5 shrink-0" />
            <span>{{ activity.orgId }}</span>
          </span>

          <span 
            class="text-xs font-black px-2.5 py-1 rounded-md border shadow-2xs"
            :class="[statusBadgeConfig.bg, statusBadgeConfig.text, statusBadgeConfig.border]"
          >
            {{ statusBadgeConfig.label }}
          </span>

          <span class="text-xs font-bold text-slate-500">
            v{{ activity.version || 1 }}
          </span>
        </div>

        <button 
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Activity Title & Sub-header Banner -->
      <div class="px-6 py-3.5 bg-white border-b border-slate-100 flex flex-col gap-1">
        <h2 class="text-base sm:text-lg font-black text-slate-900 leading-snug">
          {{ activity.title }}
        </h2>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-semibold">
          <span class="flex items-center gap-1">
            <Calendar class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ activity.timeframe || `${activity.timeframeMonth || 'Anytime'} (${activity.timeframeWeek || '1st Week'})` }}</span>
          </span>
          <span class="flex items-center gap-1 font-mono font-bold text-slate-800">
            <Coins class="w-3.5 h-3.5 text-amber-600" />
            <span>{{ formatCurrency(activity.budget) }}</span>
          </span>
          <span>Fiscal Year: <strong>{{ activity.fiscalYear }}</strong></span>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="px-6 border-b border-slate-200 bg-slate-50/50 flex items-center gap-4 text-xs font-bold">
        <button
          type="button"
          @click="activeTab = 'details'"
          class="py-2.5 border-b-2 transition cursor-pointer"
          :class="activeTab === 'details' ? 'border-blue-600 text-blue-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          Activity Details
        </button>
        <button
          type="button"
          @click="activeTab = 'budget'"
          class="py-2.5 border-b-2 transition cursor-pointer"
          :class="activeTab === 'budget' ? 'border-blue-600 text-blue-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          Budget Line Items ({{ activity.budgetLineItems?.length || (activity.budget > 0 ? 1 : 0) }})
        </button>
        <button
          type="button"
          @click="activeTab = 'decisions_history'"
          class="py-2.5 border-b-2 transition cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'decisions_history' ? 'border-blue-600 text-blue-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          <History class="w-3.5 h-3.5" />
          <span>Approval Decisions & Remarks ({{ decisionsList.length }})</span>
        </button>
      </div>

      <!-- Modal Body Content -->
      <div class="p-6 overflow-y-auto space-y-5 text-xs flex-1">
        <!-- 1. DEFERRED REMARKS ALERT (Only for non-Action Plan items) -->
        <div v-if="!isActionPlanItem && displayApprovalStatus === 'Deferred'" class="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900">
          <div class="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
            <span>Activity Deferred for Revision</span>
          </div>
          <p class="text-xs mt-1 text-amber-800 font-medium italic">
            "{{ activity.deferReason || activity.deferredRemarks || 'Please review and adjust proposed activity budget and documents.' }}"
          </p>
          <div v-if="activity.deferredBy" class="mt-1 text-[11px] text-amber-700">
            Deferred by: <strong>{{ activity.deferredBy }}</strong>
          </div>
        </div>

        <!-- 2. REJECTED REMARKS ALERT -->
        <div v-if="displayApprovalStatus === 'Rejected'" class="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900">
          <div class="flex items-center gap-2 font-bold text-xs">
            <XCircle class="w-4 h-4 text-rose-600 shrink-0" />
            <span>Final Rejection Issued</span>
          </div>
          <p class="text-xs mt-1 text-rose-800 font-medium italic">
            "{{ activity.rejectionRemarks || 'This activity has been permanently rejected for this submission.' }}"
          </p>
          <div v-if="activity.rejectedBy" class="mt-1 text-[11px] text-rose-700">
            Rejected by: <strong>{{ activity.rejectedBy }}</strong>
          </div>
        </div>

        <!-- TAB 1: DETAILS -->
        <div v-if="activeTab === 'details'" class="space-y-4">
          <!-- 1. ACTION PLAN DIRECT ORGANIZATION DECISION (No routing required) -->
          <div 
            v-if="isActionPlanItem" 
            class="p-4 rounded-xl border transition shadow-2xs"
            :class="displayApprovalStatus === 'Fully Approved'
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              : (displayApprovalStatus === 'Rejected'
                ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                : 'bg-slate-50 border-slate-200 text-slate-800')"
          >
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-black uppercase tracking-wider text-slate-500">Action Plan Status</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600">
                    Direct Organization Selection
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="text-xs font-black px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 shadow-2xs"
                    :class="[statusBadgeConfig.bg, statusBadgeConfig.text, statusBadgeConfig.border]"
                  >
                    <CheckCircle2 v-if="displayApprovalStatus === 'Fully Approved'" class="w-3.5 h-3.5 text-emerald-600" />
                    <XCircle v-else-if="displayApprovalStatus === 'Rejected'" class="w-3.5 h-3.5 text-rose-600" />
                    <Clock v-else class="w-3.5 h-3.5 text-slate-500" />
                    <span>{{ displayApprovalStatus === 'Fully Approved' ? 'Approved by Organization' : (displayApprovalStatus === 'Rejected' ? 'Rejected by Organization' : 'Draft Proposal') }}</span>
                  </span>
                  <span class="text-xs text-slate-600 font-medium">
                    {{ displayApprovalStatus === 'Fully Approved'
                      ? 'This activity is officially approved for inclusion in the organization Action Plan.'
                      : (displayApprovalStatus === 'Rejected'
                        ? 'This activity has been rejected and excluded from the Action Plan.'
                        : 'Draft entry. The organization directly selects Approved or Rejected.') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. MULTI-STAGE HIERARCHY (Only for traditional DAD workflow) -->
          <div v-else class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="flex items-center justify-between mb-2">
              <span class="font-black text-slate-800 uppercase tracking-wide text-[11px]">Approval Hierarchy Progress</span>
              <span class="text-xs font-bold text-blue-800">
                Stage {{ currentStageIndex }} of {{ maxStages }}: {{ currentStageStep?.title || 'Review' }}
              </span>
            </div>

            <!-- Stage Pills Row -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 text-center text-[10px]">
              <div 
                v-for="step in timelineStages" 
                :key="step.id"
                class="p-2 rounded-lg border font-bold flex flex-col items-center justify-center gap-0.5"
                :class="step.id < currentStageIndex || displayApprovalStatus === 'Fully Approved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : (step.id === currentStageIndex
                    ? (displayApprovalStatus === 'Deferred'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : (displayApprovalStatus === 'Rejected'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-blue-50 text-blue-800 border-blue-400 ring-1 ring-blue-400'))
                    : 'bg-white text-slate-400 border-slate-200')"
              >
                <span>Stage {{ step.id }}</span>
                <span class="font-extrabold truncate w-full" :title="step.title">{{ step.title.split(' ')[0] }}</span>
              </div>
            </div>
          </div>

          <!-- Official Details Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <span class="text-[11px] font-bold text-slate-500 uppercase">Strategic Objectives</span>
              <p class="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                {{ activity.strategicObjectives || activity.description || 'N/A' }}
              </p>
            </div>

            <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <span class="text-[11px] font-bold text-slate-500 uppercase">Expected Output</span>
              <p class="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                {{ activity.expectedOutput || 'N/A' }}
              </p>
            </div>

            <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <span class="text-[11px] font-bold text-slate-500 uppercase">Responsible Office</span>
              <p class="text-slate-800 font-bold">
                {{ activity.office || activity.orgId }}
              </p>
            </div>

            <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
              <span class="text-[11px] font-bold text-slate-500 uppercase">Fund Source</span>
              <p class="text-slate-800 font-bold">
                {{ activity.fundSource || 'Organizational Fund' }}
              </p>
            </div>

            <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 md:col-span-2">
              <span class="text-[11px] font-bold text-slate-500 uppercase">Person Assigned</span>
              <p class="text-slate-800 font-medium">
                {{ activity.personAssigned || `${activity.orgId} Officers` }}
              </p>
            </div>
          </div>
        </div>

        <!-- TAB 2: BUDGET & LINE ITEMS -->
        <div v-if="activeTab === 'budget'" class="space-y-4">
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span class="text-slate-500 text-xs font-semibold">Total Budget Requirement:</span>
              <h3 class="text-xl font-black font-mono text-blue-900 mt-0.5">
                {{ formatCurrency(activity.budget) }}
              </h3>
            </div>
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg border bg-white text-slate-700 border-slate-200">
              Fund: {{ activity.fundSource || 'Organizational Fund' }}
            </span>
          </div>

          <!-- Line items table -->
          <div v-if="activity.budgetLineItems && activity.budgetLineItems.length > 0" class="border border-slate-200 rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th class="px-3 py-2">Expense Description</th>
                  <th class="px-2 py-2 text-center w-20">Qty</th>
                  <th class="px-3 py-2 text-right w-28">Unit Cost</th>
                  <th class="px-3 py-2 text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="item in activity.budgetLineItems" :key="item.id">
                  <td class="p-2.5 font-medium text-slate-800">{{ item.description }}</td>
                  <td class="p-2.5 text-center font-mono">{{ item.quantity }}</td>
                  <td class="p-2.5 text-right font-mono">{{ formatCurrency(item.unitCost) }}</td>
                  <td class="p-2.5 text-right font-mono font-bold text-slate-900">{{ formatCurrency(item.total) }}</td>
                </tr>
              </tbody>
              <tfoot class="bg-amber-50 font-bold border-t border-slate-200">
                <tr>
                  <td colspan="3" class="px-3 py-2 text-right uppercase text-[11px] text-slate-700">Calculated Sum:</td>
                  <td class="px-3 py-2 text-right font-mono font-black text-blue-900 text-xs">
                    {{ formatCurrency(activity.budget) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Fallback Line Item Text if no structured table -->
          <div v-else class="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
            <span class="text-[11px] font-bold text-slate-500 uppercase">Line Item Description</span>
            <p class="text-slate-800 leading-relaxed font-medium">
              {{ activity.lineItemBudget || 'N/A (Zero-budget activity)' }}
            </p>
          </div>
        </div>

        <!-- TAB 3: DECISIONS HISTORY -->
        <div v-if="activeTab === 'decisions_history'" class="space-y-3">
          <div v-if="decisionsList.length === 0" class="text-center py-8 text-slate-400">
            <History class="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p class="font-bold">No previous approval decisions recorded yet.</p>
            <p class="text-[11px] mt-0.5">Decisions and remarks made by authorized approvers will appear here.</p>
          </div>

          <div v-else class="space-y-3">
            <div 
              v-for="dec in decisionsList" 
              :key="dec.id"
              class="p-3.5 bg-white border rounded-xl shadow-2xs space-y-2 transition"
              :class="dec.decision === 'APPROVE'
                ? 'border-emerald-200 hover:border-emerald-300'
                : (dec.decision === 'DEFER'
                  ? 'border-amber-200 hover:border-amber-300 bg-amber-50/20'
                  : 'border-rose-200 hover:border-rose-300 bg-rose-50/20')"
            >
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <span 
                    class="px-2 py-0.5 text-[10px] font-black rounded uppercase"
                    :class="dec.decision === 'APPROVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : (dec.decision === 'DEFER'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800')"
                  >
                    {{ dec.decision }}
                  </span>
                  <span class="font-bold text-slate-800">{{ dec.stageName }}</span>
                  <span v-if="dec.versionReviewed" class="text-[10px] text-slate-400 font-mono">
                    (v{{ dec.versionReviewed }})
                  </span>
                </div>

                <span class="text-[11px] text-slate-400">
                  {{ new Date(dec.timestamp).toLocaleString() }}
                </span>
              </div>

              <!-- Approver Details -->
              <div class="text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                <User class="w-3.5 h-3.5 text-slate-400" />
                <span>{{ dec.approverName }} ({{ formatUserRole(dec.approverRole) }})</span>
              </div>

              <!-- Mandatory Remarks / Comments -->
              <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-800 italic">
                "{{ dec.remarks || 'No additional remarks provided.' }}"
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer with Approver / Org Actions -->
      <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <!-- Left: Permission feedback or guidance -->
        <div class="text-xs text-slate-500">
          <template v-if="isActionPlanItem || isOrgOwner">
            <div v-if="displayApprovalStatus === 'Fully Approved'" class="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Activity is approved for the {{ activity.orgId }} Action Plan.</span>
            </div>
            <div v-else-if="displayApprovalStatus === 'Rejected'" class="flex items-center gap-1.5 text-rose-700 font-bold">
              <XCircle class="w-4 h-4 text-rose-600 shrink-0" />
              <span>Activity is rejected by the organization.</span>
            </div>
            <div v-else class="flex items-center gap-1.5 text-slate-600 font-medium">
              <Info class="w-4 h-4 text-blue-600 shrink-0" />
              <span>Select official status: either Approve or Reject for this Action Plan activity.</span>
            </div>
          </template>
          <template v-else>
            <div v-if="permission.canApprove || permission.canDefer || permission.canReject" class="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You are authorized to review this activity at Stage {{ currentStageIndex }}.</span>
            </div>
            <div v-else-if="canOrgResubmit" class="flex items-center gap-1.5 text-amber-800 font-bold">
              <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
              <span>Activity is deferred. You can revise details and resubmit.</span>
            </div>
            <div v-else class="text-slate-500">
              Current stage requires sign-off from: <strong>{{ currentStageStep?.title || 'Reviewer' }}</strong>
            </div>
          </template>
        </div>

        <!-- Right: Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Org direct actions for Action Plan items -->
          <template v-if="isActionPlanItem || isOrgOwner">
            <!-- Reset to Draft (if approved or rejected) -->
            <button
              v-if="displayApprovalStatus !== 'Draft'"
              type="button"
              @click="handleSetDraftClick"
              class="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw class="w-3.5 h-3.5 text-slate-500" />
              <span>Set to Draft</span>
            </button>

            <!-- Reject Action -->
            <button
              v-if="displayApprovalStatus !== 'Rejected'"
              type="button"
              @click="handleOpenReject"
              class="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <XCircle class="w-4 h-4 text-white" />
              <span>Reject Activity</span>
            </button>

            <!-- Approve Action -->
            <button
              v-if="displayApprovalStatus !== 'Fully Approved'"
              type="button"
              @click="handleApproveClick"
              class="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Check class="w-4 h-4 text-white" />
              <span>Approve Activity</span>
            </button>
          </template>

          <!-- Non-Action Plan multi-stage institutional actions -->
          <template v-else>
            <!-- Org Officer Resubmit Action (if deferred) -->
            <button
              v-if="canOrgResubmit"
              type="button"
              @click="handleOpenResubmit"
              class="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Send class="w-3.5 h-3.5 text-white" />
              <span>Resubmit Revised Activity</span>
            </button>

            <!-- Defer Action (Mandatory remarks) -->
            <button
              v-if="permission.canDefer && displayApprovalStatus !== 'Rejected' && displayApprovalStatus !== 'Fully Approved'"
              type="button"
              @click="handleOpenDefer"
              class="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <AlertTriangle class="w-3.5 h-3.5 text-amber-700" />
              <span>Defer for Revision</span>
            </button>

            <!-- Reject Action (Authorized Institutional Reviewers) -->
            <button
              v-if="permission.canReject && displayApprovalStatus !== 'Rejected' && displayApprovalStatus !== 'Fully Approved'"
              type="button"
              @click="handleOpenReject"
              class="px-3.5 py-2 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <XCircle class="w-3.5 h-3.5 text-rose-700" />
              <span>Final Rejection</span>
            </button>

            <!-- Approve Action (Current Stage) -->
            <button
              v-if="permission.canApprove && displayApprovalStatus !== 'Rejected' && displayApprovalStatus !== 'Fully Approved'"
              type="button"
              @click="handleApproveClick"
              class="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Check class="w-4 h-4 text-white" />
              <span>{{ isFinalStage ? 'Issue Final Approval (OC)' : `Approve at Stage ${currentStageIndex}` }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Sub-Modal: Defer Activity Dialog (Mandatory Remarks) -->
    <div 
      v-if="isDeferDialogOpen"
      class="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4">
        <div class="flex items-center gap-2 text-amber-800">
          <AlertTriangle class="w-5 h-5 text-amber-600 shrink-0" />
          <h3 class="text-sm font-bold">Defer Activity for Revision</h3>
        </div>

        <p class="text-xs text-slate-600">
          Deferring this activity stops its progress and returns it to the organization officer for correction.
          <strong class="text-slate-900">Comments/remarks explaining the reason are mandatory.</strong>
        </p>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Mandatory Deferral Remarks <span class="text-rose-600">*</span>:
          </label>
          <textarea
            v-model="deferReasonText"
            rows="3"
            placeholder="Specify required corrections (e.g., provide itemized breakdown for refreshments, adjust proposed dates)..."
            class="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="isDeferDialogOpen = false"
            class="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleConfirmDefer"
            :disabled="!deferReasonText.trim()"
            class="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Confirm Deferral</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Sub-Modal: Final Rejection Dialog (Mandatory Remarks) -->
    <div 
      v-if="isRejectDialogOpen"
      class="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4">
        <div class="flex items-center gap-2 text-rose-800">
          <XCircle class="w-5 h-5 text-rose-600 shrink-0" />
          <h3 class="text-sm font-bold">Issue Final Rejection</h3>
        </div>

        <p class="text-xs text-slate-600">
          This issues a final rejection for this activity under institutional policy.
          <span class="text-rose-700 font-bold">This decision permanently stops progression for this submission and cannot be resubmitted.</span>
          <strong class="text-slate-900">Mandatory remarks are required.</strong>
        </p>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Mandatory Rejection Remarks <span class="text-rose-600">*</span>:
          </label>
          <textarea
            v-model="rejectRemarksText"
            rows="3"
            placeholder="Explain institutional policy violation or reason for permanent rejection..."
            class="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="isRejectDialogOpen = false"
            class="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleConfirmReject"
            :disabled="!rejectRemarksText.trim()"
            class="px-4 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Confirm Final Rejection</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Sub-Modal: Resubmit Revised Proposal Dialog -->
    <div 
      v-if="isResubmitDialogOpen"
      class="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-5 space-y-4">
        <div class="flex items-center gap-2 text-blue-900">
          <Send class="w-5 h-5 text-blue-600 shrink-0" />
          <h3 class="text-sm font-bold">Resubmit Revised Activity Proposal</h3>
        </div>

        <p class="text-xs text-slate-600">
          This will advance the version to v{{ (activity.version || 1) + 1 }} and re-route this activity to Stage 2: Adviser Review for fresh evaluation.
        </p>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Summary of Revisions (Optional):
          </label>
          <textarea
            v-model="resubmitNotesText"
            rows="2"
            placeholder="e.g. Corrected line item expenses and updated participant counts as requested."
            class="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="isResubmitDialogOpen = false"
            class="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleConfirmResubmit"
            class="px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Confirm Resubmission</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

