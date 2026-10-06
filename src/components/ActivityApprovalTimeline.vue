<script setup lang="ts">
import { ref, computed } from 'vue';
import { Activity, UserAccount, WorkflowHistoryRecord } from '../types';
import { isCollegeOrg, evaluateStepPermission } from '../data/initialData';
import {
  CheckCircle2,
  Clock,
  Circle,
  FileText,
  FileCheck2,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Building,
  Send,
  Sparkles,
  ExternalLink,
  Award,
  Lock,
  Info,
  RotateCcw,
  History,
  AlertTriangle,
  X,
  Check,
  Eye
} from 'lucide-vue-next';

const props = defineProps<{
  activity: Activity;
  currentUser?: UserAccount | null;
  userAccounts?: UserAccount[];
}>();

const emit = defineEmits<{
  (e: 'openDesignForm'): void;
  (e: 'openAccomplishmentForm'): void;
  (e: 'advanceStep', stepId: number): void;
  (e: 'deferActivity', payload: { reason: string; stageId: number }): void;
  (e: 'resubmitActivity', notes?: string): void;
  (e: 'switchUser', user: UserAccount): void;
}>();

interface StageDefinition {
  id: number;
  title: string;
  role: string;
  office: string;
  description: string;
  hasSpecialAction?: 'design' | 'accomplishment';
}

const isCollege = computed<boolean>(() => isCollegeOrg(props.activity.orgId));
const totalStagesCount = computed<number>(() => (isCollege.value ? 8 : 7));

// Defer Modal State
const isDeferModalOpen = ref(false);
const deferStageId = ref<number>(1);
const deferReasonInput = ref('');
const deferPresetSelected = ref('');

const presetDeferReasons = [
  'Deferred for revision of the proposed budget and supporting itemized quotations.',
  'Deferred for schedule adjustment due to conflict with university examination schedule.',
  'Deferred for attachment of Campus Facilities Office venue reservation confirmation.',
  'Deferred for clarification and specific alignment of student learning indicators.'
];

// Resubmit Modal State
const isResubmitModalOpen = ref(false);
const resubmitNotes = ref('');

// Dynamic stages based on whether the organization is a College Org or Non-College (SSC, KAABAG, SENSSO, TME)
const stages = computed<StageDefinition[]>(() => {
  if (isCollege.value) {
    return [
      {
        id: 1,
        title: 'Stage 1: College Organization Submission',
        role: 'ROLE_ORGANIZATION',
        office: `${props.activity.orgId} Leadership`,
        description: 'Detailed activity proposal, timeline schedule, SDG mapping, and budgetary line items submitted.',
        hasSpecialAction: 'design'
      },
      {
        id: 2,
        title: 'Stage 2: Assigned Adviser Review',
        role: 'ROLE_ADVISER',
        office: `${props.activity.orgId} Adviser`,
        description: 'Assigned faculty adviser verifies academic feasibility, safety protocols, and organization alignment.'
      },
      {
        id: 3,
        title: 'Stage 3: Assigned College Dean Endorsement',
        role: 'ROLE_DEAN',
        office: `${props.activity.collegeId || props.activity.orgId} Dean's Office`,
        description: 'Dean of the assigned college reviews college alignment, curriculum relevance, and faculty endorsement.'
      },
      {
        id: 4,
        title: 'Stage 4: OSD Approval',
        role: 'ROLE_OSD',
        office: 'Office of Student Development (OSD)',
        description: 'Verification of requirements, student handbook guidelines, and university calendar clearing.'
      },
      {
        id: 5,
        title: 'Stage 5: OVCSAS Approval / Endorsement',
        role: 'ROLE_OVCSAS',
        office: 'Office of the Vice Chancellor for Student Affairs and Services',
        description: 'Review and endorsement from the Vice Chancellor for Student Affairs and Services.'
      },
      {
        id: 6,
        title: 'Stage 6: Office of the Chancellor Final Approval',
        role: 'ROLE_OC',
        office: 'Office of the Chancellor',
        description: 'Final institutional approval from the Office of the Chancellor.'
      },
      {
        id: 7,
        title: 'Stage 7: Accomplishment Report Submission',
        role: 'ROLE_ORGANIZATION',
        office: `${props.activity.orgId} Leadership`,
        description: 'Post-activity accomplishment report filing, attendance verification, actual expenses liquidation, and photo proof.',
        hasSpecialAction: 'accomplishment'
      },
      {
        id: 8,
        title: 'Stage 8: Assigned Adviser Accomplishment Approval',
        role: 'ROLE_ADVISER',
        office: `${props.activity.orgId} Adviser`,
        description: 'Assigned faculty adviser reviews financial liquidation, accomplishment metrics, and issues final sign-off.'
      }
    ];
  } else {
    // Central Organizations (SSC, KAABAG, TME, SENSSO) — Dean stage DOES NOT EXIST
    return [
      {
        id: 1,
        title: 'Stage 1: Organization Submission',
        role: 'ROLE_ORGANIZATION',
        office: `${props.activity.orgId} Leadership`,
        description: 'Detailed activity proposal, timeline schedule, SDG mapping, and budgetary line items submitted.',
        hasSpecialAction: 'design'
      },
      {
        id: 2,
        title: 'Stage 2: Assigned Adviser Review',
        role: 'ROLE_ADVISER',
        office: `${props.activity.orgId} Adviser`,
        description: 'Assigned adviser reviews student governance action items, feasibility, and risk management.'
      },
      {
        id: 3,
        title: 'Stage 3: OSD Approval',
        role: 'ROLE_OSD',
        office: 'Office of Student Development (OSD)',
        description: 'OSD review of activity proposal, guidelines compliance, and university calendar clearing (Dean stage bypassed).'
      },
      {
        id: 4,
        title: 'Stage 4: OVCSAS Approval / Endorsement',
        role: 'ROLE_OVCSAS',
        office: 'Office of the Vice Chancellor for Student Affairs and Services',
        description: 'Review and endorsement from the Vice Chancellor for Student Affairs and Services.'
      },
      {
        id: 5,
        title: 'Stage 5: Office of the Chancellor Final Approval',
        role: 'ROLE_OC',
        office: 'Office of the Chancellor',
        description: 'Final institutional approval from the Office of the Chancellor.'
      },
      {
        id: 6,
        title: 'Stage 6: Accomplishment Report Submission',
        role: 'ROLE_ORGANIZATION',
        office: `${props.activity.orgId} Leadership`,
        description: 'Post-activity accomplishment report filing, attendance verification, actual expenses liquidation, and photo proof.',
        hasSpecialAction: 'accomplishment'
      },
      {
        id: 7,
        title: 'Stage 7: Assigned Adviser Accomplishment Approval',
        role: 'ROLE_ADVISER',
        office: `${props.activity.orgId} Adviser`,
        description: 'Assigned faculty adviser reviews financial liquidation, accomplishment metrics, and issues final sign-off.'
      }
    ];
  }
});

// Determine active step based on activity state or existing timeline
const activeStepId = computed<number>(() => {
  const max = totalStagesCount.value;
  const isCol = isCollege.value;
  const finalAdviserStage = isCol ? 8 : 7;

  // 1. If final sign-off completed
  const finalStep = props.activity.timeline?.find(s => s.id === max);
  if (finalStep?.status === 'completed' || props.activity.workflowStatus === 'COMPLETED') return max;
  if ((props.activity.status === 'APPROVED' || props.activity.status === 'Approved') && !props.activity.accomplishmentForm?.isCompleted) return max;

  // 2. CRITICAL: If organization already finished submitting the accomplishment report,
  // it is forwarded directly to their adviser for final signature (Stage 7 for Central, Stage 8 for College)!
  if (props.activity.accomplishmentForm?.isCompleted) {
    const isSignedOff = finalStep?.status === 'completed';
    return isSignedOff ? max : finalAdviserStage;
  }

  // 3. Explicit approvalStage label matches
  const stage = props.activity.approvalStage?.toLowerCase() || '';
  if (stage.includes('sign-off') || stage.includes('final review') || stage.includes('adviser accomplishment') || stage.includes('adviser final')) return isCollege.value ? 8 : 7;
  if (stage.includes('accomplishment') || stage.includes('liquidation')) return isCollege.value ? 7 : 6;

  // 4. Timeline check
  if (props.activity.timeline && props.activity.timeline.length > 0) {
    const inProgress = props.activity.timeline.find(s => s.status === 'in_progress');
    if (inProgress) return Math.min(inProgress.id, max);
    const lastCompleted = [...props.activity.timeline].reverse().find(s => s.status === 'completed');
    if (lastCompleted) return Math.min(lastCompleted.id + 1, max);
  }
  
  if (stage.includes('chancellor') || stage.includes('oc')) return isCollege.value ? 6 : 5;
  if (stage.includes('ovcsas')) return isCollege.value ? 5 : 4;
  if (stage.includes('osd')) return isCollege.value ? 4 : 3;
  if (stage.includes('dean')) return 3;
  if (stage.includes('adviser')) return 2;
  return 1;
});

const isDeferred = computed<boolean>(() => {
  return props.activity.status === 'DEFERRED' || 
         props.activity.status === 'DEFERRED FOR REVISION' || 
         props.activity.approvalStage === 'DEFERRED FOR REVISION';
});

const isApproved = computed<boolean>(() => {
  const max = totalStagesCount.value;
  const finalStep = props.activity.timeline?.find(s => s.id === max);
  if (finalStep?.status === 'completed' || props.activity.workflowStatus === 'COMPLETED') return true;
  if (props.activity.accomplishmentForm?.isCompleted) return false;
  return props.activity.status === 'APPROVED' || props.activity.status === 'Approved';
});

const isOrgUser = computed<boolean>(() => {
  if (!props.currentUser) return false;
  return (props.currentUser.role === 'ROLE_ORGANIZATION' || props.currentUser.role === 'Org President') && 
         props.currentUser.orgId === props.activity.orgId;
});

const getStageStatus = (stageId: number): 'completed' | 'in_progress' | 'pending' => {
  if (isApproved.value) return 'completed';
  if (props.activity.accomplishmentForm?.isCompleted) {
    const finalAdviserStage = isCollege.value ? 8 : 7;
    if (stageId < finalAdviserStage) return 'completed';
    const finalStep = props.activity.timeline?.find(s => s.id === finalAdviserStage);
    return finalStep?.status === 'completed' ? 'completed' : 'in_progress';
  }
  if (props.activity.timeline && props.activity.timeline.length > 0) {
    const custom = props.activity.timeline.find(s => s.id === stageId);
    if (custom) return custom.status;
  }
  if (stageId < activeStepId.value) return 'completed';
  if (stageId === activeStepId.value) return 'in_progress';
  return 'pending';
};

const checkStagePermission = (stageId: number) => {
  return evaluateStepPermission(props.currentUser, props.activity, stageId);
};

const openDeferModal = (stageId: number) => {
  deferStageId.value = stageId;
  deferReasonInput.value = '';
  deferPresetSelected.value = '';
  isDeferModalOpen.value = true;
};

const submitDefer = () => {
  const reason = deferReasonInput.value.trim() || deferPresetSelected.value.trim();
  if (!reason) return;
  emit('deferActivity', { reason, stageId: deferStageId.value });
  isDeferModalOpen.value = false;
};

const openResubmitModal = () => {
  resubmitNotes.value = '';
  isResubmitModalOpen.value = true;
};

const submitResubmit = () => {
  emit('resubmitActivity', resubmitNotes.value.trim());
  isResubmitModalOpen.value = false;
};

const getAccountForStage = (stageId: number): UserAccount | undefined => {
  if (!props.userAccounts || props.userAccounts.length === 0) return undefined;
  const isCol = isCollege.value;
  const orgId = props.activity.orgId;
  const collegeId = props.activity.collegeId || orgId;

  if (isCol) {
    if (stageId === 1) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ORGANIZATION' || u.role === 'Org President') && u.orgId === orgId) ||
             props.userAccounts.find(u => u.orgId === orgId);
    }
    if (stageId === 2) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ADVISER' || u.role === 'Faculty Adviser') && u.orgId === orgId);
    }
    if (stageId === 3) {
      return props.userAccounts.find(u => (u.role === 'ROLE_DEAN' || u.role === 'College Dean' || u.role === 'Dean / College Reviewer') && (u.orgId === collegeId || u.collegeId === collegeId));
    }
    if (stageId === 4) {
      return props.userAccounts.find(u => u.role === 'ROLE_OSD' || u.orgId === 'OSD' || u.name.toLowerCase().includes('osd officer')) ||
             props.userAccounts.find(u => u.name.toLowerCase().includes('osd'));
    }
    if (stageId === 5) {
      return props.userAccounts.find(u => u.role === 'ROLE_OVCSAS' || u.orgId === 'OVCSAS');
    }
    if (stageId === 6) {
      return props.userAccounts.find(u => u.role === 'ROLE_OC' || u.orgId === 'OC');
    }
    if (stageId === 7) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ORGANIZATION' || u.role === 'Org President') && u.orgId === orgId) ||
             props.userAccounts.find(u => u.orgId === orgId);
    }
    if (stageId === 8) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ADVISER' || u.role === 'Faculty Adviser') && u.orgId === orgId);
    }
  } else {
    // Central Org
    if (stageId === 1) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ORGANIZATION' || u.role === 'Org President') && u.orgId === orgId) ||
             props.userAccounts.find(u => u.orgId === orgId);
    }
    if (stageId === 2) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ADVISER' || u.role === 'Faculty Adviser') && u.orgId === orgId);
    }
    if (stageId === 3) {
      return props.userAccounts.find(u => u.role === 'ROLE_OSD' || u.orgId === 'OSD' || u.name.toLowerCase().includes('osd officer')) ||
             props.userAccounts.find(u => u.name.toLowerCase().includes('osd'));
    }
    if (stageId === 4) {
      return props.userAccounts.find(u => u.role === 'ROLE_OVCSAS' || u.orgId === 'OVCSAS');
    }
    if (stageId === 5) {
      return props.userAccounts.find(u => u.role === 'ROLE_OC' || u.orgId === 'OC');
    }
    if (stageId === 6) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ORGANIZATION' || u.role === 'Org President') && u.orgId === orgId) ||
             props.userAccounts.find(u => u.orgId === orgId);
    }
    if (stageId === 7) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ADVISER' || u.role === 'Faculty Adviser') && u.orgId === orgId);
    }
  }
  return undefined;
};
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6">
    <!-- Header with progress pill and organization routing badge -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600 font-bold text-xs">
            {{ totalStagesCount }}
          </span>
          <h3 class="text-sm font-bold text-slate-900">
            {{ isCollege ? 'College Organization Workflow (8 Stages to Final Liquidation)' : 'Central Organization Workflow (7 Stages to Final Liquidation)' }}
          </h3>
        </div>
        <p class="text-xs text-slate-500 mt-1">
          <span v-if="!isCollege" class="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded mr-1">
            <Info class="w-3.5 h-3.5" /> Central Route: Org &rarr; Adviser &rarr; OSD &rarr; OVCSAS &rarr; Chancellor &rarr; Accomplishment &rarr; Adviser Sign-Off
          </span>
          <span v-else class="inline-flex items-center gap-1 font-semibold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded mr-1">
            <Building class="w-3.5 h-3.5" /> College Route: Org &rarr; Adviser &rarr; {{ activity.collegeId || activity.orgId }} Dean &rarr; OSD &rarr; OVCSAS &rarr; Chancellor &rarr; Accomplishment &rarr; Adviser Sign-Off
          </span>
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          Stage {{ Math.min(activeStepId, totalStagesCount) }} of {{ totalStagesCount }}
        </span>
        <span
          class="text-xs font-bold px-2.5 py-1 rounded-full border"
          :class="isApproved 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
            : isDeferred 
            ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse' 
            : 'bg-amber-50 text-amber-700 border-amber-300'"
        >
          {{ isApproved ? 'APPROVED / COMPLETED' : isDeferred ? 'DEFERRED FOR REVISION' : 'In Review Routing' }}
        </span>
      </div>
    </div>

    <!-- DEFERRED FOR REVISION PROMINENT BANNER -->
    <div
      v-if="isDeferred"
      class="p-4 sm:p-5 rounded-2xl bg-rose-50/90 border-2 border-rose-300 space-y-3 animate-in fade-in"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-900">
                Action Required
              </span>
              <h4 class="text-sm font-extrabold text-rose-950">
                Status: DEFERRED FOR REVISION
              </h4>
            </div>
            <p class="text-xs text-rose-800 mt-1 leading-relaxed">
              This activity proposal has been deferred and returned to the <strong>{{ activity.orgId }} Organization User</strong> for necessary corrections. Previous review history has been preserved.
            </p>
          </div>
        </div>

        <button
          v-if="isOrgUser || currentUser?.role === 'ROLE_ADMIN'"
          @click="openResubmitModal"
          class="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>RESUBMIT ACTIVITY</span>
        </button>
      </div>

      <!-- Remark Box -->
      <div class="p-3 bg-white/90 rounded-xl border border-rose-200 text-xs text-slate-800 space-y-1">
        <div class="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
          <span>Deferral Remark from: <strong>{{ activity.deferredBy || 'Approver' }}</strong></span>
          <span v-if="activity.deferredAt">{{ new Date(activity.deferredAt).toLocaleString() }}</span>
        </div>
        <p class="font-medium text-rose-950 italic">
          "{{ activity.deferReason || 'Deferred for revision of the proposed budget and supporting documents.' }}"
        </p>
      </div>
    </div>

    <!-- Dynamic In-System Stages -->
    <div class="space-y-4">
      <div
        v-for="stage in stages"
        :key="stage.id"
        class="relative flex items-start gap-4 p-3.5 rounded-xl border transition-all"
        :class="[
          getStageStatus(stage.id) === 'completed'
            ? 'bg-emerald-50/40 border-emerald-200/80'
            : getStageStatus(stage.id) === 'in_progress'
            ? ((activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100 shadow-xs'
                : isDeferred
                ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-100 shadow-xs'
                : 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-100 shadow-xs')
            : 'bg-white border-slate-200/80 opacity-75'
        ]"
      >
        <!-- Icon Marker -->
        <div class="shrink-0 mt-0.5">
          <div
            v-if="getStageStatus(stage.id) === 'completed'"
            class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs"
          >
            <CheckCircle2 class="w-4 h-4" />
          </div>
          <div
            v-else-if="getStageStatus(stage.id) === 'in_progress'"
            class="w-7 h-7 rounded-full text-white flex items-center justify-center shadow-xs ring-4"
            :class="[
              isDeferred 
                ? 'bg-rose-600 ring-rose-100' 
                : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                ? 'bg-blue-600 ring-blue-100 animate-pulse'
                : 'bg-amber-500 ring-amber-100'
            ]"
          >
            <RotateCcw v-if="isDeferred" class="w-4 h-4" />
            <Eye v-else-if="activity.status === 'Under Review' || activity.status === 'IN_REVIEW'" class="w-4 h-4" />
            <Clock v-else class="w-4 h-4" />
          </div>
          <div
            v-else
            class="w-7 h-7 rounded-full bg-slate-100 text-slate-400 border border-slate-300 flex items-center justify-center text-xs font-bold"
          >
            {{ stage.id }}
          </div>
        </div>

        <!-- Stage Content -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-900">
                {{ stage.title }}
              </span>
              <span
                class="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                :class="[
                  getStageStatus(stage.id) === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : getStageStatus(stage.id) === 'in_progress'
                    ? (isDeferred ? 'bg-rose-100 text-rose-800 font-bold' : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW') ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-amber-100 text-amber-800 font-bold')
                    : 'bg-slate-100 text-slate-500'
                ]"
              >
                {{ getStageStatus(stage.id) === 'completed' ? 'Approved' : getStageStatus(stage.id) === 'in_progress' ? (isDeferred ? 'Deferred for Revision' : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW') ? 'Under Review' : 'Awaiting Review') : 'Upcoming' }}
              </span>
            </div>

            <!-- Role & Office Badge -->
            <span class="text-[11px] font-semibold text-slate-600 bg-white/90 px-2.5 py-0.5 rounded border border-slate-200">
              {{ stage.office }}
            </span>
          </div>

          <p class="text-xs text-slate-600 mt-1 leading-relaxed">
            {{ stage.description }}
          </p>

          <!-- Action buttons for active stage -->
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <!-- Special Action: Open Detailed Activity Design Form -->
            <button
              v-if="stage.hasSpecialAction === 'design'"
              @click="emit('openDesignForm')"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <FileText class="w-3.5 h-3.5" />
              <span>{{ activity.designForm?.isCompleted ? 'View / Edit Activity Design Form' : 'Fill Out Activity Design Form' }}</span>
            </button>

            <!-- Special Action: Open Accomplishment Report Form -->
            <button
              v-if="stage.hasSpecialAction === 'accomplishment'"
              @click="emit('openAccomplishmentForm')"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Award class="w-3.5 h-3.5" />
              <span>{{ activity.accomplishmentForm?.isCompleted ? 'View / Edit Accomplishment Report' : 'Fill Out Accomplishment Report' }}</span>
            </button>

            <!-- Actions for in_progress stage -->
            <template v-if="getStageStatus(stage.id) === 'in_progress' && !isApproved">
              <!-- When authorized to act on this stage -->
              <div v-if="checkStagePermission(stage.id).canApprove || checkStagePermission(stage.id).canDefer" class="flex flex-wrap items-center gap-2">
                <!-- APPROVE BUTTON -->
                <button
                  v-if="checkStagePermission(stage.id).canApprove"
                  @click="emit('advanceStep', stage.id)"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                  :class="stage.id === totalStagesCount ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-700 hover:bg-blue-800'"
                >
                  <ShieldCheck class="w-3.5 h-3.5" />
                  <span>
                    {{ stage.id === totalStagesCount 
                      ? 'FINAL APPROVE' 
                      : stage.id === 1 
                      ? 'Submit Proposal & Advance' 
                      : `Approve / Endorse Stage ${stage.id}` 
                    }}
                  </span>
                  <ArrowRight class="w-3.5 h-3.5" />
                </button>

                <!-- DEFER BUTTON (Replaces Reject) -->
                <button
                  v-if="checkStagePermission(stage.id).canDefer"
                  @click="openDeferModal(stage.id)"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Defer this activity for revision and return to organization"
                >
                  <RotateCcw class="w-3.5 h-3.5 text-amber-700" />
                  <span>Defer</span>
                </button>
              </div>

              <!-- When NOT authorized for this stage -->
              <div
                v-else
                class="inline-flex flex-wrap items-center gap-2 p-2 bg-slate-50 text-slate-700 text-xs rounded-xl border border-slate-200"
                :title="checkStagePermission(stage.id).reason"
              >
                <div class="flex items-center gap-1.5 text-slate-600">
                  <Lock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Awaiting action from <strong>{{ checkStagePermission(stage.id).expectedTitle }}</strong>
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- PRESERVED WORKFLOW AUDIT & REVIEW HISTORY -->
    <div class="mt-6 pt-5 border-t border-slate-200 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <History class="w-4 h-4 text-slate-600" />
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">
            Preserved Workflow &amp; Approval History
          </h4>
        </div>
        <span class="text-[11px] text-slate-500 font-medium">
          {{ activity.workflowHistory?.length || 0 }} Record(s) logged
        </span>
      </div>

      <div v-if="activity.workflowHistory && activity.workflowHistory.length > 0" class="space-y-2">
        <div
          v-for="rec in activity.workflowHistory"
          :key="rec.id"
          class="p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 transition-colors"
          :class="[
            rec.action === 'DEFER'
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : rec.action === 'RESUBMIT'
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : rec.action === 'FINAL_APPROVE'
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
              : 'bg-slate-50/70 border-slate-200 text-slate-800'
          ]"
        >
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                :class="[
                  rec.action === 'DEFER'
                    ? 'bg-rose-200 text-rose-900'
                    : rec.action === 'RESUBMIT'
                    ? 'bg-amber-200 text-amber-900'
                    : rec.action === 'FINAL_APPROVE'
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-blue-100 text-blue-900'
                ]"
              >
                {{ rec.action === 'FINAL_APPROVE' ? 'FINAL APPROVE' : rec.action }}
              </span>
              <strong class="font-bold text-slate-900">{{ rec.stageName }}</strong>
              <span class="text-slate-400">•</span>
              <span class="text-slate-600 font-medium">{{ rec.actorName }} ({{ rec.actorRole }})</span>
            </div>
            <p v-if="rec.remark" class="text-xs leading-relaxed text-slate-700 italic pl-1">
              "{{ rec.remark }}"
            </p>
          </div>

          <div class="text-[11px] text-slate-400 shrink-0 self-start sm:self-auto font-medium">
            {{ rec.timestamp ? new Date(rec.timestamp).toLocaleString() : '' }}
          </div>
        </div>
      </div>

      <div v-else class="p-3 rounded-xl bg-slate-50 text-slate-400 text-xs italic text-center">
        No prior workflow transitions recorded.
      </div>
    </div>

    <!-- DEFERRAL MODAL DIALOG (Mandatory Reason Input) -->
    <div
      v-if="isDeferModalOpen"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
        <div class="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900">
                Workflow Action
              </span>
              <span class="text-xs text-slate-500 font-semibold">Stage {{ deferStageId }}</span>
            </div>
            <h3 class="text-base font-extrabold text-slate-900 mt-1">
              Defer Activity for Revision
            </h3>
          </div>
          <button
            @click="isDeferModalOpen = false"
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <p class="text-slate-600">
            Please provide the reason for deferring this activity. The proposal will be marked <strong>DEFERRED FOR REVISION</strong> and returned to the organization for corrections.
          </p>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Preset Deferral Reasons:</label>
            <div class="space-y-1.5">
              <button
                v-for="p in presetDeferReasons"
                :key="p"
                @click="deferPresetSelected = p"
                class="w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer"
                :class="deferPresetSelected === p ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'"
              >
                {{ p }}
              </button>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Detailed Reason / Remarks (Mandatory):</label>
            <textarea
              v-model="deferReasonInput"
              rows="3"
              placeholder="e.g. Deferred for revision of the proposed budget and supporting documents."
              class="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="isDeferModalOpen = false"
            class="btn-secondary"
          >
            Cancel
          </button>
          <button
            @click="submitDefer"
            :disabled="!deferReasonInput.trim() && !deferPresetSelected.trim()"
            class="btn-warning disabled:opacity-50"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Confirm Deferral</span>
          </button>
        </div>
      </div>
    </div>

    <!-- RESUBMIT MODAL DIALOG (For Organization Users) -->
    <div
      v-if="isResubmitModalOpen"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
        <div class="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900">
              Organization Correction
            </span>
            <h3 class="text-base font-extrabold text-slate-900 mt-1">
              Resubmit Activity to Workflow
            </h3>
          </div>
          <button
            @click="isResubmitModalOpen = false"
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <p class="text-slate-600">
            Confirm that the requested revisions, corrected line-item budget, and supporting files have been updated.
          </p>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Notes on Changes Made (Optional):</label>
            <textarea
              v-model="resubmitNotes"
              rows="3"
              placeholder="e.g. Revised line-item budget and attached facilities reservation endorsement."
              class="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="isResubmitModalOpen = false"
            class="btn-secondary"
          >
            Cancel
          </button>
          <button
            @click="submitResubmit"
            class="btn-primary"
          >
            <Send class="w-3.5 h-3.5" />
            <span>Confirm &amp; Resubmit</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

