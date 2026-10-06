<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ModuleType, Activity, ActivityDesignForm, ActivityAccomplishmentForm, UserAccount } from '../types';
import { 
  X, 
  Clock, 
  CheckCircle2,
  XCircle,
  RotateCcw,
  GitCommit,
  Minimize2,
  Maximize2,
  FileText,
  Award,
  Info,
  Calendar,
  Coins,
  Users,
  MapPin,
  ExternalLink,
  Edit3,
  Building2,
  Target,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Heart,
  LayoutGrid,
  Folder,
  Mail,
  Send,
  AlertTriangle,
  Lock,
  Eye
} from 'lucide-vue-next';
import { ORGANIZATIONS, isCollegeOrg, evaluateStepPermission, canOrgConfirmExternalClearance } from '../data/initialData';
import { apiService } from '../services/api';
import ActivityApprovalTimeline from './ActivityApprovalTimeline.vue';
import ActivityDesignFormModal from './ActivityDesignFormModal.vue';
import ActivityAccomplishmentFormModal from './ActivityAccomplishmentFormModal.vue';
import OrgBadge from './OrgBadge.vue';

const props = withDefaults(
  defineProps<{
    activity: Activity | null;
    currentModule?: ModuleType;
    currentUser?: UserAccount | null;
    userAccounts?: UserAccount[];
  }>(),
  {
    currentModule: 'approval_management',
    currentUser: null,
    userAccounts: () => []
  }
);

const isApprovalModule = computed(() => {
  return props.currentModule === 'approval_management';
});

const isCollege = computed(() => isCollegeOrg(props.activity?.orgId));
const maxStages = computed(() => (isCollege.value ? 8 : 7));

const isOrgUser = computed(() => {
  if (!props.currentUser || !props.activity) return true;
  return (props.currentUser.role === 'ROLE_ORGANIZATION' || props.currentUser.role === 'Org President') &&
         props.currentUser.orgId === props.activity.orgId;
});

const isDeferred = computed(() => {
  return props.activity?.status === 'DEFERRED' || 
         props.activity?.status === 'DEFERRED FOR REVISION' || 
         props.activity?.approvalStage === 'DEFERRED FOR REVISION';
});

const isApproved = computed(() => {
  return props.activity?.status === 'APPROVED' || props.activity?.status === 'Approved';
});

const activeStagePermission = computed(() => {
  if (!props.activity) return { canApprove: false, canDefer: false, reason: '', expectedTitle: '' };
  const currentTimeline = props.activity.timeline || [];
  const inProgressStep = currentTimeline.find(s => s.status === 'in_progress');
  const stageId = inProgressStep ? inProgressStep.id : 1;
  return evaluateStepPermission(props.currentUser, props.activity, stageId);
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggleStatus', activityId: string): void;
  (e: 'updateActivity', updated: Activity): void;
  (e: 'switchUser', user: UserAccount): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

const activeTab = ref<'timeline' | 'design' | 'accomplishment'>('timeline');
const isDesignFormOpen = ref(false);
const isAccomplishmentFormOpen = ref(false);
const isMinimized = ref(false);

// Document Review Action States
const isApproveModalOpen = ref(false);
const isDeferModalOpen = ref(false);
const isResubmitModalOpen = ref(false);
const deferReason = ref('');
const selectedDeferPreset = ref('');
const resubmitNotes = ref('');

const presetDeferReasons = [
  'Deferred for revision of the proposed budget and supporting itemized quotations.',
  'Deferred for schedule adjustment due to conflict with university examination schedule.',
  'Deferred for attachment of Campus Facilities Office venue reservation confirmation.',
  'Deferred for clarification and specific alignment of student learning indicators.'
];

// Smart tab selection based on activity progress phase and module
watch(
  () => [props.activity, props.currentModule],
  () => {
    if (!props.activity) return;
    if (isApprovalModule.value) {
      if (props.activity.accomplishmentForm?.isCompleted || props.activity.status === 'Accomplishment Submitted') {
        activeTab.value = 'accomplishment';
      } else {
        activeTab.value = 'design';
      }
    } else {
      activeTab.value = 'timeline';
    }
  },
  { immediate: true }
);

const org = computed(() => {
  if (!props.activity) return null;
  return ORGANIZATIONS.find((o) => o.id === props.activity?.orgId);
});

const handleSaveDesignForm = (form: ActivityDesignForm) => {
  if (!props.activity) return;
  const updated: Activity = {
    ...props.activity,
    designForm: form
  };
  emit('updateActivity', updated);
};

const handleSaveAccomplishmentForm = (form: ActivityAccomplishmentForm) => {
  if (!props.activity) return;
  const isCol = isCollege.value;
  const accompStepId = isCol ? 7 : 6;
  const finalAdviserStepId = isCol ? 8 : 7;

  // Mark all steps up to and including Accomplishment Report Submission (1 to 6/7) as completed!
  // Mark the Adviser Sign-Off step (7 or 8) as in_progress!
  const currentTimeline = props.activity.timeline || [];
  const updatedTimeline = currentTimeline.map((step) => {
    if (step.id <= accompStepId) {
      return { 
        ...step, 
        status: 'completed' as const, 
        updatedAt: step.updatedAt || new Date().toISOString().split('T')[0] 
      };
    }
    if (step.id === finalAdviserStepId) {
      return { 
        ...step, 
        status: 'in_progress' as const 
      };
    }
    return step;
  });

  const nextStageLabel = isCol
    ? 'Stage 8: Adviser Accomplishment Review & Final Sign-Off'
    : 'Stage 7: Adviser Accomplishment Review & Final Sign-Off';

  const historyRecord = {
    id: `HIST-${Date.now()}`,
    stageId: accompStepId,
    stageName: isCol ? 'Stage 7: Accomplishment Report Submission' : 'Stage 6: Accomplishment Report Submission',
    actorId: props.currentUser?.id || `usr-${props.activity.orgId.toLowerCase()}-org`,
    actorName: props.currentUser?.name || `${props.activity.orgId} Leadership`,
    actorRole: props.currentUser?.role || 'ROLE_ORGANIZATION',
    action: 'SUBMIT' as const,
    remark: 'Accomplishment report, photo proofs, and financial liquidation submitted to Adviser for final sign-off.',
    timestamp: new Date().toISOString()
  };

  const updated: Activity = {
    ...props.activity,
    status: 'Pending',
    workflowStatus: 'IN_PROGRESS',
    approvalStage: nextStageLabel,
    timeline: updatedTimeline,
    workflowHistory: [...(props.activity.workflowHistory || []), historyRecord],
    accomplishmentForm: {
      ...form,
      isCompleted: true,
      submittedDate: form.submittedDate || new Date().toISOString().split('T')[0],
      submittedBy: form.submittedBy || props.currentUser?.name || props.activity.proposedBy
    }
  };

  emit('updateActivity', updated);
  emit(
    'showToast',
    'Accomplishment Report Submitted! 📄',
    `Accomplishment report filed by ${props.activity.orgId}. Forwarded to Adviser for final sign-off (Stage ${finalAdviserStepId}).`,
    'success'
  );
};

const handleAdvanceStep = async (stepId: number) => {
  if (!props.activity) return;

  const perm = evaluateStepPermission(props.currentUser, props.activity, stepId);
  if (!perm.canApprove) {
    emit('showToast', 'Approval Restricted', perm.reason, 'warning');
    return;
  }

  // Attempt backend API call (Spring Boot style service)
  if (props.currentUser) {
    const apiResult = await apiService.advanceWorkflowStep(props.activity, props.currentUser, stepId);
    if (apiResult.success && apiResult.activity) {
      emit('updateActivity', apiResult.activity);
      emit(
        'showToast',
        stepId >= maxStages.value ? 'Accomplishment Report Approved! 🎉' : `Advanced to Stage ${stepId + 1}`,
        apiResult.message,
        'success'
      );
      return;
    }
  }

  const currentTimeline = props.activity.timeline || [];
  const updatedTimeline = currentTimeline.map((step) => {
    if (step.id === stepId) {
      return { ...step, status: 'completed' as const, updatedAt: new Date().toISOString().split('T')[0] };
    }
    if (step.id === stepId + 1) {
      return { ...step, status: 'in_progress' as const };
    }
    return step;
  });

  const isFinalStage = stepId >= maxStages.value;
  const isChancellorStage = stepId === (isCollege.value ? 6 : 5);
  const isAccomplishmentStage = stepId === (isCollege.value ? 7 : 6);
  let nextStageLabel = '';

  if (isCollege.value) {
    const collegeStages = [
      'Stage 1: College Organization Submission',
      'Stage 2: Assigned Adviser Review',
      'Stage 3: Assigned College Dean Endorsement',
      'Stage 4: OSD Approval',
      'Stage 5: OVCSAS Approval / Endorsement',
      'Stage 6: Office of the Chancellor Final Approval',
      'Stage 7: Accomplishment Report Submission',
      'Stage 8: Adviser Accomplishment Approval'
    ];
    nextStageLabel = isFinalStage ? 'Approved / Completed' : (collegeStages[stepId] || `Stage ${stepId + 1}`);
  } else {
    const nonCollegeStages = [
      'Stage 1: Organization Submission',
      'Stage 2: Assigned Adviser Review',
      'Stage 3: OSD Approval',
      'Stage 4: OVCSAS Approval / Endorsement',
      'Stage 5: Office of the Chancellor Final Approval',
      'Stage 6: Accomplishment Report Submission',
      'Stage 7: Adviser Accomplishment Approval'
    ];
    nextStageLabel = isFinalStage ? 'Approved / Completed' : (nonCollegeStages[stepId] || `Stage ${stepId + 1}`);
  }

  const updated: Activity = {
    ...props.activity,
    status: isFinalStage ? 'Approved' : 'Pending',
    workflowStatus: isFinalStage ? 'COMPLETED' : 'IN_PROGRESS',
    approvalStage: nextStageLabel,
    timeline: updatedTimeline,
    accomplishmentForm: isFinalStage 
      ? { ...(props.activity.accomplishmentForm || {}), isCompleted: true }
      : props.activity.accomplishmentForm
  };

  emit('updateActivity', updated);
  emit(
    'showToast',
    isFinalStage 
      ? 'Accomplishment Report Approved! 🎉' 
      : isChancellorStage 
      ? 'Office of the Chancellor Approval Granted! 🏛️' 
      : isAccomplishmentStage 
      ? 'Accomplishment Report Submitted! 📄'
      : `Advanced to ${nextStageLabel}`,
    isFinalStage
      ? `All workflow stages completed. Accomplishment report finalized in Financial Management data.`
      : isChancellorStage
      ? `Chancellor approval granted! Forwarded to Organization to file Accomplishment Report.`
      : isAccomplishmentStage
      ? `Report filed and forwarded to Adviser for final sign-off.`
      : `"${props.activity.title}" was updated to ${nextStageLabel}.`,
    'success'
  );
};

const handleDeferActivity = async (payload: { reason: string; stageId: number }) => {
  if (!props.activity || !props.currentUser) return;
  const reason = payload.reason.trim();
  if (!reason) {
    emit('showToast', 'Deferral Remark Required', 'Please provide the reason for deferring this activity.', 'warning');
    return;
  }

  const apiResult = await apiService.deferActivity(props.activity, props.currentUser, reason, payload.stageId);
  if (apiResult.success && apiResult.activity) {
    emit('updateActivity', apiResult.activity);
    emit(
      'showToast',
      'Activity Deferred for Revision',
      `"${props.activity.title}" returned to organization: "${reason}"`,
      'info'
    );
    return;
  }

  // Local fallback
  const historyRecord = {
    id: `HIST-${Date.now()}`,
    stageId: payload.stageId,
    stageName: `Stage ${payload.stageId}`,
    actorId: props.currentUser.id,
    actorName: props.currentUser.name,
    actorRole: props.currentUser.role,
    action: 'DEFER' as const,
    remark: reason,
    timestamp: new Date().toISOString()
  };

  const updated: Activity = {
    ...props.activity,
    status: 'DEFERRED',
    approvalStage: 'DEFERRED FOR REVISION',
    deferReason: reason,
    deferredBy: props.currentUser.name,
    deferredAt: new Date().toISOString(),
    workflowHistory: [...(props.activity.workflowHistory || []), historyRecord]
  };

  emit('updateActivity', updated);
  emit(
    'showToast',
    'Activity Deferred for Revision',
    `"${props.activity.title}" returned to organization: "${reason}"`,
    'info'
  );
};

const handleResubmitActivity = async (notes?: string) => {
  if (!props.activity || !props.currentUser) return;

  const apiResult = await apiService.resubmitActivity(props.activity, props.currentUser, notes);
  if (apiResult.success && apiResult.activity) {
    emit('updateActivity', apiResult.activity);
    emit(
      'showToast',
      'Activity Resubmitted to Workflow',
      `"${props.activity.title}" has been resubmitted for adviser review.`,
      'success'
    );
    return;
  }

  // Local fallback
  const historyRecord = {
    id: `HIST-${Date.now()}`,
    stageId: 1,
    stageName: 'Stage 1: Organization Resubmission',
    actorId: props.currentUser.id,
    actorName: props.currentUser.name,
    actorRole: props.currentUser.role,
    action: 'RESUBMIT' as const,
    remark: notes || 'Organization uploaded corrected documents and resubmitted activity.',
    timestamp: new Date().toISOString()
  };

  const resetTimeline = (props.activity.timeline || []).map((step, idx) => ({
    ...step,
    status: idx === 0 ? ('completed' as const) : idx === 1 ? ('in_progress' as const) : ('pending' as const)
  }));

  const updated: Activity = {
    ...props.activity,
    status: 'Pending',
    workflowStatus: 'IN_PROGRESS',
    approvalStage: 'Stage 2: Assigned Adviser Review',
    deferReason: undefined,
    timeline: resetTimeline,
    workflowHistory: [...(props.activity.workflowHistory || []), historyRecord]
  };

  emit('updateActivity', updated);
  emit(
    'showToast',
    'Activity Resubmitted to Workflow',
    `"${props.activity.title}" resubmitted for adviser evaluation.`,
    'success'
  );
};

// Quick action handlers for Design and Accomplishment tabs
const handleDirectApprove = () => {
  if (!props.activity) return;
  const currentTimeline = props.activity.timeline || [];
  const inProgressStep = currentTimeline.find(s => s.status === 'in_progress');
  const currentStepId = inProgressStep ? inProgressStep.id : 1;
  handleAdvanceStep(currentStepId);
};

const handleConfirmApprove = () => {
  isApproveModalOpen.value = false;
  handleDirectApprove();
};

const openDeferModalFromTab = () => {
  deferReason.value = '';
  selectedDeferPreset.value = '';
  isDeferModalOpen.value = true;
};

const handleConfirmDeferFromModal = () => {
  const reason = deferReason.value.trim() || selectedDeferPreset.value.trim();
  if (!reason) return;
  const currentTimeline = props.activity?.timeline || [];
  const inProgressStep = currentTimeline.find(s => s.status === 'in_progress');
  const stageId = inProgressStep ? inProgressStep.id : 1;

  isDeferModalOpen.value = false;
  handleDeferActivity({ reason, stageId });
};
</script>

<template>
  <div v-if="activity">
    <!-- Minimized Floating Widget at bottom right -->
    <div
      v-if="isMinimized"
      class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl p-3.5 border border-slate-700/80 flex items-center gap-3.5 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div class="w-9 h-9 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
        <GitCommit class="w-4 h-4" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
            {{ activity.office || activity.orgId }}
          </span>
          <span class="text-[10px] text-slate-400 truncate">{{ activity.id }}</span>
        </div>
        <p class="text-xs font-bold text-white truncate mt-0.5">
          {{ activity.programActivity || activity.title }}
        </p>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <button
          @click="isMinimized = false"
          title="Restore Modal"
          class="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <Maximize2 class="w-4 h-4" />
        </button>
        <button
          @click="emit('close')"
          title="Close Modal"
          class="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Full Modal Container -->
    <div
      v-else
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div class="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-4 animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="flex items-start justify-between pb-3.5 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <OrgBadge :org-id="activity.office || activity.orgId" size="md" />
              <span class="text-xs text-slate-500 font-medium">
                {{ org?.name }}
              </span>
              <span class="text-xs text-slate-300">•</span>
              <span class="text-xs text-slate-400">
                {{ activity.id }}
              </span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {{ activity.fiscalYear || 'Fiscal Year 2026' }}
              </span>
              <span
                class="text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs"
                :class="activity.status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION')
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'"
              >
                <CheckCircle2 v-if="activity.status === 'Approved'" class="w-3 h-3 text-emerald-600" />
                <Eye v-else-if="activity.status === 'Under Review' || activity.status === 'IN_REVIEW'" class="w-3 h-3 text-blue-600" />
                <RotateCcw v-else-if="activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION'" class="w-3 h-3 text-rose-600" />
                <Clock v-else class="w-3 h-3 text-amber-600" />
                <span>{{ activity.status === 'Approved' ? 'Approved' : (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION') ? 'Deferred for Revision' : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW') ? 'Under Review' : 'Pending Review' }}</span>
              </span>
            </div>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {{ activity.programActivity || activity.title }}
            </h3>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="isMinimized = true"
              title="Minimize Modal"
              class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Minimize2 class="w-4 h-4" />
            </button>
            <button
              @click="emit('close')"
              title="Close Modal"
              class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1.5 pt-3 overflow-x-auto border-b border-slate-100 no-scrollbar">
          <!-- Workflow Timeline: Available for all users -->
          <button
            @click="activeTab = 'timeline'"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0"
            :class="activeTab === 'timeline'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'"
          >
            <GitCommit class="w-3.5 h-3.5" />
            <span>Workflow Timeline</span>
          </button>

          <button
            @click="activeTab = 'design'"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0"
            :class="activeTab === 'design'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>Detailed Activity Design</span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded-full"
              :class="activity.designForm?.isCompleted ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-500'"
            >
              {{ activity.designForm?.isCompleted ? 'Submitted' : 'Pending' }}
            </span>
          </button>

          <button
            @click="activeTab = 'accomplishment'"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer shrink-0"
            :class="activeTab === 'accomplishment'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'"
          >
            <Award class="w-3.5 h-3.5" />
            <span>Accomplishment Report</span>
            <span
              class="text-[10px] px-1.5 py-0.2 rounded-full"
              :class="activity.accomplishmentForm?.isCompleted ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-500'"
            >
              {{ activity.accomplishmentForm?.isCompleted ? 'Submitted' : 'Pending' }}
            </span>
          </button>
        </div>

        <!-- Content Body -->
        <div class="mt-3.5 space-y-3.5 text-xs max-h-[62vh] overflow-y-auto pr-1">
          
          <!-- TAB 0: WORKFLOW TIMELINE -->
          <div v-if="activeTab === 'timeline'" class="space-y-4">
            <!-- Status Banner -->
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  :class="isApproved
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : isDeferred
                    ? 'bg-rose-50 text-rose-800 border border-rose-300'
                    : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                    ? 'bg-blue-50 text-blue-800 border border-blue-300'
                    : 'bg-amber-50 text-amber-800 border border-amber-300'"
                >
                  <CheckCircle2 v-if="isApproved" class="w-4 h-4 text-emerald-600" />
                  <AlertTriangle v-else-if="isDeferred" class="w-4 h-4 text-rose-600" />
                  <Eye v-else-if="activity.status === 'Under Review' || activity.status === 'IN_REVIEW'" class="w-4 h-4 text-blue-600" />
                  <Clock v-else class="w-4 h-4 text-amber-600" />
                  <span>
                    Status: {{ 
                      isApproved 
                        ? 'APPROVED' 
                        : isDeferred 
                        ? 'DEFERRED FOR REVISION' 
                        : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                        ? 'UNDER REVIEW'
                        : 'PENDING APPROVAL'
                    }}
                  </span>
                </span>

                <span class="text-slate-500 hidden sm:inline">
                  Workflow: <strong class="text-slate-800">{{ isCollege ? 'College Workflow (6 Stages)' : 'Central Workflow (5 Stages)' }}</strong>
                </span>
              </div>

              <!-- Top Action for Organization Users when Deferred -->
              <div class="flex items-center gap-2">
                <button
                  v-if="isDeferred && isOrgUser"
                  @click="handleResubmitActivity()"
                  class="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>RESUBMIT ACTIVITY</span>
                </button>
              </div>
            </div>

            <!-- Dynamic Approval Timeline -->
            <ActivityApprovalTimeline
              :activity="activity"
              :current-user="currentUser"
              :user-accounts="userAccounts"
              @openDesignForm="isDesignFormOpen = true"
              @openAccomplishmentForm="isAccomplishmentFormOpen = true"
              @advanceStep="handleAdvanceStep"
              @deferActivity="handleDeferActivity"
              @resubmitActivity="handleResubmitActivity"
              @switchUser="(user) => emit('switchUser', user)"
            />
          </div>

          <!-- TAB 1: DETAILED ACTIVITY DESIGN FORM DETAILS -->
          <div v-else-if="activeTab === 'design'" class="space-y-4">
            <!-- Standard Header when viewing from Activity Management or Admin -->
            <div v-if="!isApprovalModule" class="flex items-center justify-between bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-800">Detailed Activity Design Form</span>
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  :class="activity.designForm?.isCompleted ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-200 text-slate-600'"
                >
                  {{ activity.designForm?.isCompleted ? 'Submitted & Verified' : 'Draft / Unsubmitted' }}
                </span>
              </div>
            </div>

            <!-- Top Administrative Specifications Card (2-column grid matching reference design) -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                
                <!-- Left Column -->
                <div class="space-y-3.5">
                  <!-- 1. Activity Title -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Heart class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Activity Title</span>
                      <span class="font-bold text-slate-900 leading-snug">{{ activity.designForm?.programOfActivitiesTitle || activity.programActivity || activity.title }}</span>
                    </div>
                  </div>

                  <!-- 2. Office Code -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <LayoutGrid class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Office Code</span>
                      <span class="font-bold text-slate-800">{{ activity.designForm?.officeCode || activity.office || activity.orgId }}</span>
                    </div>
                  </div>

                  <!-- 3. Unit/College -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Unit/College</span>
                      <span class="font-bold text-slate-800">{{ activity.designForm?.unitCollege || org?.name || 'Supreme Student Council' }}</span>
                    </div>
                  </div>

                  <!-- 4. Department -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Department</span>
                      <span class="font-semibold text-slate-700">{{ activity.designForm?.department || 'Student Affairs & Services' }}</span>
                    </div>
                  </div>

                  <!-- 5. Result Code / OPCR / IPCR Code -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <LayoutGrid class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Result Code/OPCR/IPCR Code</span>
                      <span class="font-semibold text-slate-800">{{ activity.designForm?.resultCode || 'RC-2026-OSA-001' }}</span>
                    </div>
                  </div>

                  <!-- 6. Date of Implementation -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Date of Implementation</span>
                      <span class="font-semibold text-slate-800">{{ activity.designForm?.dateImplementation || activity.startDate }}</span>
                    </div>
                  </div>
                </div>

                <!-- Right Column -->
                <div class="space-y-3.5">
                  <!-- 1. Date Prepared -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Date Prepared</span>
                      <span class="font-semibold text-slate-800">{{ activity.designForm?.datePrepared || activity.submittedDate || '08/01/2026' }}</span>
                    </div>
                  </div>

                  <!-- 2. Venue -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Venue</span>
                      <span class="font-semibold text-slate-800">{{ activity.designForm?.venue || activity.venue }}</span>
                    </div>
                  </div>

                  <!-- 3. Proposed Budget -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Coins class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Proposed Budget</span>
                      <span class="font-bold text-slate-900 text-sm">₱{{ Number(activity.designForm?.proposedBudget || activity.budget).toLocaleString() }}</span>
                    </div>
                  </div>

                  <!-- 4. Budget Source -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Folder class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Budget Source</span>
                      <span class="font-semibold text-slate-800 leading-snug block max-w-xs">{{ activity.designForm?.budgetSource || activity.fundSource || 'OSD-04 | LEADERSHIP AND M&E | OPVI DEVELOPMENT TRAINING' }}</span>
                    </div>
                  </div>

                  <!-- 5. Included in the PDP -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckSquare class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Included in the PDP</span>
                      <div class="flex items-center gap-4 mt-0.5 font-semibold text-slate-800">
                        <span class="flex items-center gap-1.5">
                          <span class="w-3.5 h-3.5 rounded border border-slate-300 flex items-center justify-center text-[10px]" :class="activity.designForm?.includedInPdsStatus !== 'No' ? 'bg-teal-600 text-white border-teal-600 font-bold' : ''">
                            <span v-if="activity.designForm?.includedInPdsStatus !== 'No'">✓</span>
                          </span>
                          <span>Yes</span>
                        </span>
                        <span class="flex items-center gap-1.5">
                          <span class="w-3.5 h-3.5 rounded border border-slate-300 flex items-center justify-center text-[10px]" :class="activity.designForm?.includedInPdsStatus === 'No' ? 'bg-teal-600 text-white border-teal-600 font-bold' : ''">
                            <span v-if="activity.designForm?.includedInPdsStatus === 'No'">✓</span>
                          </span>
                          <span>No</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- 6. Email Address -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Email Address</span>
                      <span class="font-semibold text-slate-800">{{ activity.designForm?.emailAddress || 'msun.osa@msunaawan.edu.ph' }}</span>
                    </div>
                  </div>

                  <!-- 7. Duration (in days) -->
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock class="w-4 h-4" />
                    </div>
                    <div>
                      <span class="text-slate-400 block text-[10px] font-semibold">Duration (in days)</span>
                      <span class="font-semibold text-slate-800">{{ activity.designForm?.durationDays || '1 day' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- A. Rationale -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <h4 class="text-sm font-bold text-slate-900">A. Rationale</h4>
              <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {{ activity.designForm?.rationale || 'Detailed rationale highlighting the purpose, background context, and alignment of the proposed organizational activity with institutional goals.' }}
              </p>
            </div>

            <!-- B. Objectives -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2.5">
              <h4 class="text-sm font-bold text-slate-900">B. Objectives</h4>
              <div class="space-y-2">
                <div
                  v-for="(obj, i) in (activity.designForm?.objectivesList?.length ? activity.designForm.objectivesList : (activity.designForm?.objectives || 'To execute planned sessions and fulfill general assembly commitments.').split('\n'))"
                  :key="i"
                  class="flex items-start gap-2 text-xs text-slate-700"
                >
                  <CheckCircle2 class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span class="leading-relaxed">{{ obj }}</span>
                </div>
              </div>
            </div>

            <!-- C. Expected Output -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2.5">
              <h4 class="text-sm font-bold text-slate-900">C. Expected Output</h4>
              <div class="space-y-2">
                <div
                  v-for="(out, i) in (activity.designForm?.expectedOutputsList?.length ? activity.designForm.expectedOutputsList : (activity.designForm?.expectedOutput || 'Efficient implementation of activity and complete accomplishment report submission.').split('\n'))"
                  :key="i"
                  class="flex items-start gap-2 text-xs text-slate-700"
                >
                  <CheckCircle2 class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span class="leading-relaxed">{{ out }}</span>
                </div>
              </div>
            </div>

            <!-- D. Detail of Activities -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h4 class="text-sm font-bold text-slate-900">D. Detail of Activities</h4>
              <div v-if="activity.designForm?.scheduleItems?.length" class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th class="p-2.5">Date & Time</th>
                      <th class="p-2.5">Activity</th>
                      <th class="p-2.5">Person In-Charge</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(sch, i) in activity.designForm.scheduleItems" :key="i">
                      <td class="p-2.5 font-medium text-slate-800">{{ sch.dateTime }}</td>
                      <td class="p-2.5 font-semibold text-slate-900">{{ sch.activity }}</td>
                      <td class="p-2.5 text-slate-600">{{ sch.personInCharge }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="text-xs text-slate-500 italic">
                Program schedule breakdown: Plenary sessions, committee discussions, and open forum.
              </p>
            </div>

            <!-- E. Budgetary Requirements -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h4 class="text-sm font-bold text-slate-900">E. Budgetary Requirements</h4>
              <div v-if="activity.designForm?.budgetaryRequirements?.length" class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th class="p-2.5">Item</th>
                      <th class="p-2.5">Particulars</th>
                      <th class="p-2.5">Budget Source</th>
                      <th class="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(b, i) in activity.designForm.budgetaryRequirements" :key="i">
                      <td class="p-2.5 font-semibold text-slate-900">{{ b.item }}</td>
                      <td class="p-2.5 text-slate-600">{{ b.particulars }}</td>
                      <td class="p-2.5 text-slate-500">{{ b.budgetSource }}</td>
                      <td class="p-2.5 text-right font-bold text-teal-700">₱{{ Number(b.amount).toLocaleString() }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-slate-600 font-medium">Estimated Itemized Total:</span>
                <span class="font-bold text-teal-700 text-sm">₱{{ Number(activity.budget).toLocaleString() }}</span>
              </div>
            </div>

            <!-- F. Type of Activity -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <h4 class="text-sm font-bold text-slate-900">F. Type of Activity</h4>
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  {{ activity.designForm?.activityType || 'In-Campus' }}
                </span>
                <span class="text-xs text-slate-600">Venue: <strong>{{ activity.venue }}</strong></span>
              </div>
            </div>

            <!-- G. Campus Facilities -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h4 class="text-sm font-bold text-slate-900">G. Campus Facilities</h4>
              <div v-if="activity.designForm?.campusFacilities?.length" class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th class="p-2.5">Qty</th>
                      <th class="p-2.5">Description</th>
                      <th class="p-2.5">Duration</th>
                      <th class="p-2.5">Remarks / Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(fac, i) in activity.designForm.campusFacilities" :key="i">
                      <td class="p-2.5 font-bold text-slate-900">{{ fac.quantity }}</td>
                      <td class="p-2.5 text-slate-800 font-medium">{{ fac.description }}</td>
                      <td class="p-2.5 text-slate-600">{{ fac.duration }}</td>
                      <td class="p-2.5 text-slate-500">{{ fac.remarks || 'Endorsed' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="text-xs text-slate-500 italic">
                Standard venue setup: AV equipment, tables, and chairs cleared by Facilities Office.
              </p>
            </div>

            <!-- H. Sustainable Development Goals Achieved -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h4 class="text-sm font-bold text-slate-900">H. Sustainable Development Goals Achieved</h4>
              <div v-if="activity.designForm?.sdgsAchieved?.length" class="flex flex-wrap gap-2">
                <span
                  v-for="sdg in activity.designForm.sdgsAchieved"
                  :key="sdg"
                  class="px-3 py-1 text-xs font-bold rounded-lg bg-teal-50 text-teal-800 border border-teal-200/80"
                >
                  {{ sdg }}
                </span>
              </div>
              <p v-else class="text-xs text-slate-500 italic">
                SDG 4: Quality Education & SDG 17: Partnerships for the Goals.
              </p>
            </div>

            <!-- Comments & Feedback -->
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <h4 class="text-sm font-bold text-slate-900">Comments & Feedback</h4>
              <p class="text-xs text-slate-600 leading-relaxed italic">
                Review Board Notes: Approved for scheduling subject to venue clearance and compliance with MSUN Student Affairs guidelines.
              </p>
            </div>

            <!-- Approver Action Buttons: Approve, Defer (Authorized Approver ONLY) -->
            <div v-if="isApprovalModule" class="flex items-center justify-end gap-2.5 pt-3 mt-4 border-t border-slate-100 flex-wrap sm:flex-nowrap">
              <template v-if="activeStagePermission.canApprove || activeStagePermission.canDefer">
                <button
                  v-if="activeStagePermission.canApprove"
                  @click="isApproveModalOpen = true"
                  class="btn-success"
                  title="Approve Detailed Activity Design proposal"
                >
                  <CheckCircle2 class="w-4 h-4" />
                  <span>Approve</span>
                </button>

                <button
                  v-if="activeStagePermission.canDefer"
                  @click="openDeferModalFromTab"
                  class="btn-warning"
                  title="Defer activity proposal for revision and return to organization"
                >
                  <RotateCcw class="w-4 h-4" />
                  <span>Defer</span>
                </button>
              </template>

              <template v-else>
                <span class="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Lock class="w-3.5 h-3.5 text-slate-400" />
                  <span>View Only • Awaiting {{ activeStagePermission.expectedTitle || 'Approval' }}</span>
                </span>
              </template>
            </div>
          </div>

          <!-- TAB 2: ACCOMPLISHMENT REPORT DETAILS -->
          <div v-else-if="activeTab === 'accomplishment'" class="space-y-4">
            <!-- Submitted State -->
            <div v-if="activity.accomplishmentForm?.isCompleted" class="space-y-4">
              <!-- Top Banner -->
              <div class="bg-emerald-50/70 rounded-xl border border-emerald-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-emerald-600 text-white shadow-2xs">
                    <Award class="w-5 h-5" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-bold text-slate-900">Activity Accomplishment Report</h4>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Filed & Completed
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">
                      Submitted by: <strong class="text-slate-700">{{ activity.accomplishmentForm.submittedBy || activity.proposedBy }}</strong>
                      <span v-if="activity.accomplishmentForm.submittedDate">• {{ activity.accomplishmentForm.submittedDate }}</span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Quick Metrics Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs">
                  <span class="text-slate-400 text-[10px] uppercase font-semibold">Actual Attendance</span>
                  <div class="text-lg font-extrabold text-slate-900 mt-0.5">
                    {{ activity.accomplishmentForm.actualAttendance }} Pax
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Target was {{ activity.targetParticipants }} students</p>
                </div>

                <div class="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs">
                  <span class="text-slate-400 text-[10px] uppercase font-semibold">Liquidation Status</span>
                  <div class="text-lg font-extrabold text-emerald-700 mt-0.5">
                    Fully Liquidated
                  </div>
                  <p class="text-[11px] text-slate-500 mt-0.5">Official receipts attached</p>
                </div>

                <div class="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs">
                  <span class="text-slate-400 text-[10px] uppercase font-semibold">Photo Proof Drive Link</span>
                  <div class="mt-1">
                    <a
                      v-if="activity.accomplishmentForm.photoProofDriveLink"
                      :href="activity.accomplishmentForm.photoProofDriveLink"
                      target="_blank"
                      class="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 underline truncate max-w-full"
                    >
                      <span>Google Drive Folder</span>
                      <ExternalLink class="w-3 h-3 shrink-0" />
                    </a>
                    <span v-else class="text-xs text-slate-400">None attached</span>
                  </div>
                </div>
              </div>

              <!-- Report Content Sections -->
              <div class="bg-white rounded-xl border border-slate-200/80 p-4 space-y-4 shadow-2xs">
                <div>
                  <h5 class="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 uppercase tracking-wider">
                    Attendance & Execution Summary
                  </h5>
                  <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {{ activity.accomplishmentForm.attendanceSummary }}
                  </p>
                </div>

                <div>
                  <h5 class="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 uppercase tracking-wider">
                    Key Outcomes & KPI Achievements
                  </h5>
                  <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {{ activity.accomplishmentForm.keyOutcomes }}
                  </p>
                </div>

                <div>
                  <h5 class="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 uppercase tracking-wider">
                    Financial Liquidation Summary
                  </h5>
                  <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {{ activity.accomplishmentForm.financialLiquidationSummary }}
                  </p>
                </div>

                <div v-if="activity.accomplishmentForm.challengesAndRecommendations">
                  <h5 class="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 uppercase tracking-wider">
                    Challenges & Future Recommendations
                  </h5>
                  <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {{ activity.accomplishmentForm.challengesAndRecommendations }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Empty State if Report Not Filled Yet -->
            <div v-else class="bg-slate-50/70 rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center mx-auto">
                <Award class="w-5 h-5" />
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900">No Accomplishment Report Filed</h4>
                <p class="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Post-execution accomplishment reports record actual attendance, KPI outcomes, financial liquidation, photo proof, and evaluation insights.
                </p>
              </div>
              <div v-if="isOrgUser || currentUser?.role === 'ROLE_ADMIN'" class="pt-2">
                <button
                  @click="isAccomplishmentFormOpen = true"
                  class="btn-success btn-sm mx-auto inline-flex items-center gap-1.5 cursor-pointer font-bold shadow-xs active:scale-95"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                  <span>Fill Accomplishment Report</span>
                </button>
              </div>
            </div>

            <!-- Approver Action Buttons: Approve, Defer (Authorized Approver ONLY) -->
            <div v-if="isApprovalModule" class="flex items-center justify-end gap-2.5 pt-3 mt-4 border-t border-slate-100 flex-wrap sm:flex-nowrap">
              <template v-if="activeStagePermission.canApprove || activeStagePermission.canDefer">
                <button
                  v-if="activeStagePermission.canApprove"
                  @click="isApproveModalOpen = true"
                  class="btn-success"
                  title="Approve Accomplishment Report"
                >
                  <CheckCircle2 class="w-4 h-4" />
                  <span>Approve</span>
                </button>

                <button
                  v-if="activeStagePermission.canDefer"
                  @click="openDeferModalFromTab"
                  class="btn-warning"
                  title="Defer report for revision and return to organization"
                >
                  <RotateCcw class="w-4 h-4" />
                  <span>Defer</span>
                </button>
              </template>

              <template v-else>
                <span class="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Lock class="w-3.5 h-3.5 text-slate-400" />
                  <span>View Only • Awaiting {{ activeStagePermission.expectedTitle || 'Approval' }}</span>
                </span>
              </template>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-[11px] text-slate-400">
            MSUN Activity Details &amp; Design (DAD)
          </span>

          <div class="flex items-center gap-2.5">
            <button
              @click="isMinimized = true"
              class="btn-secondary"
            >
              <Minimize2 class="w-3.5 h-3.5" />
              <span>Minimize</span>
            </button>
            <button
              @click="emit('close')"
              class="btn-secondary cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        <!-- Nested Form Modals -->
        <ActivityDesignFormModal
          :is-open="isDesignFormOpen"
          :activity="activity"
          @close="isDesignFormOpen = false"
          @save="handleSaveDesignForm"
        />

        <ActivityAccomplishmentFormModal
          :is-open="isAccomplishmentFormOpen"
          :activity="activity"
          @close="isAccomplishmentFormOpen = false"
          @save="handleSaveAccomplishmentForm"
        />

        <!-- APPROVAL CONFIRMATION MODAL OVERLAY -->
        <div
          v-if="isApproveModalOpen"
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-extrabold text-[10px] uppercase">
                    Official Institutional Sign-Off
                  </span>
                  <span class="text-xs text-slate-500 font-semibold">
                    {{ activeTab === 'accomplishment' ? 'Phase 2: Accomplishment Report' : 'Phase 1: Detailed Design' }}
                  </span>
                </div>
                <h3 class="text-base font-extrabold text-slate-900 mt-1">
                  Confirm Document Approval
                </h3>
              </div>
              <button
                @click="isApproveModalOpen = false"
                class="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="mt-4 space-y-3.5">
              <!-- Top Box: Approval Summary -->
              <div class="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs">
                <div class="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Info class="w-3.5 h-3.5" />
                </div>
                <div class="space-y-1 min-w-0">
                  <h4 class="font-extrabold text-blue-900 text-sm">Approval Summary</h4>
                  <p class="text-blue-900 text-xs">
                    <strong class="font-extrabold text-blue-950">Approving:</strong>
                    <span class="text-blue-800 ml-1 font-medium">{{ activity.programActivity || activity.title }} | {{ activeTab === 'accomplishment' ? 'Activity Accomplishment Report' : 'Detailed Activity Design' }}</span>
                  </p>
                  <p class="text-blue-900 text-xs">
                    <strong class="font-extrabold text-blue-950">Organization:</strong>
                    <span class="text-blue-800 ml-1 font-medium">{{ org?.name || activity.orgId }}</span>
                  </p>
                </div>
              </div>

              <!-- Bottom Box: Wet Signature Process -->
              <div class="p-4 bg-emerald-50/80 border border-emerald-300 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center gap-2">
                  <FileText class="w-5 h-5 text-emerald-600 font-bold" />
                  <h4 class="font-extrabold text-emerald-700 text-sm sm:text-base">Wet Signature Process</h4>
                </div>
                <ol class="space-y-2 text-emerald-700 font-semibold text-xs leading-relaxed pl-1">
                  <li class="flex items-start gap-1.5">
                    <span class="font-extrabold shrink-0">1.</span>
                    <span>The document has been approved successfully.</span>
                  </li>
                  <li class="flex items-start gap-1.5">
                    <span class="font-extrabold shrink-0">2.</span>
                    <span>The approved document will be printed for physical signing.</span>
                  </li>
                  <li class="flex items-start gap-1.5">
                    <span class="font-extrabold shrink-0">3.</span>
                    <span>Organization representatives must personally deliver the document to the approvers' offices for wet signature completion.</span>
                  </li>
                </ol>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                @click="isApproveModalOpen = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button
                @click="handleConfirmApprove"
                class="btn-success"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span>Confirm & Approve</span>
              </button>
            </div>
          </div>
        </div>

        <!-- REVISION REQUEST MODAL OVERLAY -->
        <div
          v-if="isRevisionModalOpen"
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-extrabold text-[10px] uppercase">
                    Official Evaluator Notice
                  </span>
                  <span class="text-xs text-slate-500 font-semibold">
                    {{ activeTab === 'accomplishment' ? 'Phase 2: Accomplishment Report' : 'Phase 1: Detailed Design' }}
                  </span>
                </div>
                <h3 class="text-base font-extrabold text-slate-900 mt-1">
                  Request Document Revision
                </h3>
              </div>
              <button
                @click="isRevisionModalOpen = false"
                class="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="mt-4 space-y-3.5">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Document Subject</span>
                <span class="font-extrabold text-slate-900 text-sm">{{ activity.programActivity || activity.title }}</span>
                <div class="text-[11px] text-slate-500 mt-0.5">Submitted by: {{ activity.proposedBy }} ({{ activity.orgId }})</div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Quick Revision Reason:
                </label>
                <div class="space-y-1.5">
                  <button
                    v-for="reason in presetRevisionReasons"
                    :key="reason"
                    @click="selectedPresetReason = reason"
                    class="w-full text-left p-2.5 rounded-xl text-xs transition-colors border cursor-pointer"
                    :class="selectedPresetReason === reason
                      ? 'bg-amber-50 border-amber-400 text-amber-950 font-semibold shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'"
                  >
                    {{ reason }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Custom Revision Instructions for Student Officers:
                </label>
                <textarea
                  v-model="revisionComment"
                  rows="3"
                  placeholder="Provide specific notes, requirements, or documents needed for resubmission..."
                  class="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                @click="isRevisionModalOpen = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button
                @click="handleConfirmRevision"
                class="btn-warning"
              >
                <Send class="w-3.5 h-3.5" />
                <span>Send Revision Request</span>
              </button>
            </div>
          </div>
        </div>

        <!-- DEFER MODAL OVERLAY (Replaces Reject/Disapprove with Mandatory Reason) -->
        <div
          v-if="isDeferModalOpen"
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-extrabold text-[10px] uppercase">
                    Workflow Action
                  </span>
                  <span class="text-xs text-slate-500 font-semibold">
                    {{ activeTab === 'accomplishment' ? 'Phase 2: Accomplishment Report' : 'Phase 1: Detailed Design' }}
                  </span>
                </div>
                <h3 class="text-base font-extrabold text-slate-900 mt-1">
                  Defer Activity Submission
                </h3>
              </div>
              <button
                @click="isDeferModalOpen = false"
                class="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="mt-4 space-y-3.5">
              <div class="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-950">
                <span class="text-amber-700 block text-[10px] uppercase font-bold">Document Subject</span>
                <span class="font-extrabold text-slate-900 text-sm">{{ activity.programActivity || activity.title }}</span>
                <div class="text-[11px] text-slate-600 mt-0.5">Submitted by: {{ activity.proposedBy }} ({{ activity.orgId }})</div>
              </div>

              <p class="text-xs text-slate-600 leading-relaxed">
                Please provide the reason for deferring this activity. The status will become <strong>DEFERRED FOR REVISION</strong> and returned to the organization user for corrections. Previous history is preserved.
              </p>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Preset Deferral Reason:
                </label>
                <div class="space-y-1.5">
                  <button
                    v-for="reason in presetDeferReasons"
                    :key="reason"
                    @click="selectedDeferPreset = reason"
                    class="w-full text-left p-2.5 rounded-xl text-xs transition-colors border cursor-pointer"
                    :class="selectedDeferPreset === reason
                      ? 'bg-amber-50 border-amber-400 text-amber-950 font-semibold shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'"
                  >
                    {{ reason }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  Official Deferral Reason / Remarks (Mandatory):
                </label>
                <textarea
                  v-model="deferReason"
                  rows="3"
                  placeholder="e.g. Deferred for revision of the proposed budget and supporting documents."
                  class="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                @click="isDeferModalOpen = false"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button
                @click="handleConfirmDeferFromModal"
                :disabled="!deferReason.trim() && !selectedDeferPreset.trim()"
                class="btn-warning disabled:opacity-50"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Confirm Deferral</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
