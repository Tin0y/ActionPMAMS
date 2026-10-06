<script setup lang="ts">
import { ref, computed } from 'vue';
import { Activity, OrgId, ActionPlanFolder, UserAccount } from '../types';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  Coins, 
  MapPin, 
  User, 
  Eye, 
  Check, 
  RotateCcw, 
  FileSpreadsheet, 
  HelpCircle, 
  ChevronRight, 
  Send, 
  MessageSquare, 
  X,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lock
} from 'lucide-vue-next';
import { ORGANIZATIONS, getOrgTheme, isCollegeOrg, evaluateStepPermission, canOrgConfirmExternalClearance, isActivityVisibleForUser } from '../data/initialData';
import { apiService } from '../services/api';
import OrgBadge from './OrgBadge.vue';

const props = defineProps<{
  activities: Activity[];
  actionPlans: ActionPlanFolder[];
  currentUser?: UserAccount | null;
  userAccounts?: UserAccount[];
}>();

const emit = defineEmits<{
  (e: 'toggleStatus', activityId: string): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'updateActivity', updated: Activity): void;
  (e: 'switchUser', user: UserAccount): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

// Main View Modes: 'activities_to_approve' | 'deferred' | 'action_plans_list' | 'all_archive'
const activeSubTab = ref<'activities_to_approve' | 'deferred' | 'action_plans_list' | 'all_archive'>('activities_to_approve');

// Beginner Help Banner Toggle
const showBeginnerGuide = ref(true);

// Filters
const searchQuery = ref('');
const selectedOrg = ref<string>('ALL');
const selectedYearFilter = ref<string>('ALL');

// Role and Office Detection
const isInstitutionalApprover = computed(() => {
  const role = props.currentUser?.role;
  return role === 'ROLE_OSD' || role === 'ROLE_OVCSAS' || role === 'ROLE_OC' ||
         role === 'OSD Officer' || role === 'OSD Director' || role === 'OVCSAS Officer' || role === 'Office of the Chancellor';
});

const institutionalOfficeTitle = computed(() => {
  const role = props.currentUser?.role;
  if (role === 'ROLE_OSD' || role === 'OSD Officer' || role === 'OSD Director') return 'Office of Student Development (OSD)';
  if (role === 'ROLE_OVCSAS' || role === 'OVCSAS Officer') return 'OVCSAS';
  if (role === 'ROLE_OC' || role === 'Office of the Chancellor') return 'Office of the Chancellor';
  return 'Your Office';
});

const institutionalOfficeShort = computed(() => {
  const role = props.currentUser?.role;
  if (role === 'ROLE_OSD' || role === 'OSD Officer' || role === 'OSD Director') return 'OSD';
  if (role === 'ROLE_OVCSAS' || role === 'OVCSAS Officer') return 'OVCSAS';
  if (role === 'ROLE_OC' || role === 'Office of the Chancellor') return 'Chancellor';
  return 'You';
});

const isDesignatedScopedUser = computed(() => {
  const role = props.currentUser?.role;
  return role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'Org Treasurer' ||
         role === 'ROLE_ADVISER' || role === 'Faculty Adviser' ||
         role === 'ROLE_DEAN' || role === 'College Dean' || role === 'Dean / College Reviewer';
});

const availableOrgFilters = computed(() => {
  if (!props.currentUser) return ORGANIZATIONS;
  const role = props.currentUser.role;
  if (role === 'ROLE_ADMIN' || role === 'System Administrator' || isInstitutionalApprover.value) {
    return ORGANIZATIONS;
  }
  if (role === 'ROLE_ORGANIZATION' || role === 'Org President' || role === 'ROLE_ADVISER' || role === 'Faculty Adviser') {
    return ORGANIZATIONS.filter(o => o.id === props.currentUser?.orgId);
  }
  if (role === 'ROLE_DEAN' || role === 'College Dean' || role === 'Dean / College Reviewer') {
    return ORGANIZATIONS.filter(o => o.id === props.currentUser?.orgId || o.id === props.currentUser?.collegeId);
  }
  return ORGANIZATIONS;
});

// Defer Modal State
const isDeferModalOpen = ref(false);
const activityForDefer = ref<Activity | null>(null);
const deferRemark = ref('');
const selectedPresetReason = ref('');

const presetReasons = [
  'Deferred for revision of the proposed budget and supporting documents.',
  'Deferred for revision of the event schedule and venue endorsement.',
  'Deferred for alignment with academic calendar and examination dates.',
  'Deferred for completion of student learning outcomes and objectives.'
];

// Helper to determine if an activity is pending or under review
const isPendingOrUnderReview = (status?: string) => {
  return status === 'Pending' || 
         status === 'IN_REVIEW' || 
         status === 'Under Review' || 
         status === 'SUBMITTED' || 
         status === 'Needs Approval';
};

// Computed Queues Scoped to Authorized User Role
const pendingActivities = computed(() => {
  return props.activities.filter(a => 
    isPendingOrUnderReview(a.status) && isActivityVisibleForUser(a, props.currentUser, 'pending')
  );
});

const deferredActivities = computed(() => {
  return props.activities.filter(a => 
    (a.status === 'DEFERRED' || a.status === 'DEFERRED FOR REVISION') && 
    isActivityVisibleForUser(a, props.currentUser, 'deferred')
  );
});

const approvedActivities = computed(() => {
  return props.activities.filter(a => 
    isActivityVisibleForUser(a, props.currentUser, 'approved')
  );
});

const countApprovedForOrg = (orgId: string) => {
  return approvedActivities.value.filter(a => a.orgId === orgId).length;
};

// Filtered activities based on sub-tab
const displayedActivities = computed(() => {
  let list: Activity[] = [];
  
  if (activeSubTab.value === 'activities_to_approve') {
    list = pendingActivities.value;
  } else if (activeSubTab.value === 'deferred') {
    list = deferredActivities.value;
  } else if (activeSubTab.value === 'all_archive') {
    list = approvedActivities.value;
  } else {
    list = props.activities.filter(a => isActivityVisibleForUser(a, props.currentUser, 'all'));
  }

  return list.filter(act => {
    const matchesOrg = selectedOrg.value === 'ALL' || act.orgId === selectedOrg.value;
    const matchesYear = selectedYearFilter.value === 'ALL' || act.fiscalYear === selectedYearFilter.value;
    const matchesSearch = 
      searchQuery.value === '' ||
      act.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      act.orgId.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      act.proposedBy.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      act.venue.toLowerCase().includes(searchQuery.value.toLowerCase());

    return matchesOrg && matchesYear && matchesSearch;
  });
});

const getOrgName = (orgId: string) => {
  const org = ORGANIZATIONS.find(o => o.id === orgId);
  return org ? org.name : orgId;
};

// Approval Actions
const handleApprove = (activity: Activity) => {
  emit('toggleStatus', activity.id);
  emit(
    'showToast',
    'Proposal Officially Approved! 🎉',
    `"${activity.title}" by ${activity.orgId} has completed all approval stages and is registered in the Action Plan calendar.`,
    'success'
  );
};

const handleOpenDefer = (activity: Activity) => {
  activityForDefer.value = activity;
  deferRemark.value = '';
  selectedPresetReason.value = presetReasons[0];
  isDeferModalOpen.value = true;
};

const handleConfirmDefer = async () => {
  if (!activityForDefer.value) return;
  const note = deferRemark.value.trim() || selectedPresetReason.value || 'Deferred for revision of activity documents.';
  const targetActivity = activityForDefer.value;
  isDeferModalOpen.value = false;

  // Use backend api if user is authenticated
  if (props.currentUser) {
    const apiResult = await apiService.deferActivity(targetActivity.id, props.currentUser, note);
    if (apiResult.success && apiResult.activity) {
      emit('updateActivity', apiResult.activity);
      emit(
        'showToast',
        'Activity Proposal Deferred',
        `Returned to ${targetActivity.orgId} user for revision: "${note}"`,
        'info'
      );
      activityForDefer.value = null;
      return;
    }
  }

  // Local fallback
  const historyEntry = {
    approverRole: props.currentUser?.role || 'Reviewer',
    approverName: props.currentUser?.name || 'Authorized Reviewer',
    action: 'DEFERRED' as const,
    remarks: note,
    timestamp: new Date().toISOString()
  };

  const updated: Activity = {
    ...targetActivity,
    status: 'DEFERRED FOR REVISION',
    approvalStage: 'DEFERRED FOR REVISION',
    workflowHistory: [...(targetActivity.workflowHistory || []), historyEntry]
  };

  emit('updateActivity', updated);
  emit(
    'showToast',
    'Activity Proposal Deferred',
    `"${targetActivity.title}" was deferred and returned to ${targetActivity.orgId} for correction.`,
    'info'
  );
  activityForDefer.value = null;
};

const handleResubmitActivity = async (activity: Activity) => {
  if (props.currentUser) {
    const apiResult = await apiService.resubmitActivity(activity.id, props.currentUser);
    if (apiResult.success && apiResult.activity) {
      emit('updateActivity', apiResult.activity);
      emit(
        'showToast',
        'Activity Resubmitted! 🚀',
        apiResult.message,
        'success'
      );
      return;
    }
  }

  // Local fallback
  const isCollege = isCollegeOrg(activity.orgId);
  const updatedTimeline = (activity.timeline || []).map(step => {
    if (step.id === 1) return { ...step, status: 'completed' as const };
    if (step.id === 2) return { ...step, status: 'in_progress' as const };
    return { ...step, status: 'pending' as const };
  });

  const historyEntry = {
    approverRole: props.currentUser?.role || 'ROLE_ORGANIZATION',
    approverName: props.currentUser?.name || 'Organization User',
    action: 'RESUBMITTED' as const,
    remarks: 'Corrected proposal resubmitted by organization.',
    timestamp: new Date().toISOString()
  };

  const updated: Activity = {
    ...activity,
    status: 'Pending',
    approvalStage: isCollege ? 'Stage 2: Adviser Review' : 'Stage 2: SSC Adviser Review',
    timeline: updatedTimeline,
    workflowHistory: [...(activity.workflowHistory || []), historyEntry]
  };

  emit('updateActivity', updated);
  emit(
    'showToast',
    'Activity Resubmitted! 🚀',
    `"${activity.title}" was resubmitted and routed to Adviser for review.`,
    'success'
  );
};

const getApproverStagesForOrg = (orgId: string) => {
  if (isCollegeOrg(orgId)) {
    return [
      { id: 1, label: '1. Proposal' },
      { id: 2, label: '2. Adviser' },
      { id: 3, label: '3. Dean' },
      { id: 4, label: '4. OSD' },
      { id: 5, label: '5. OVCSAS' },
      { id: 6, label: '6. Chancellor' },
      { id: 7, label: '7. Accomplishment' },
      { id: 8, label: '8. Adviser Sign-Off' }
    ];
  } else {
    // Non-College (SSC, KAABAG, SENSSO, TME) — Dean review DOES NOT EXIST
    return [
      { id: 1, label: '1. Proposal' },
      { id: 2, label: '2. Adviser' },
      { id: 3, label: '3. OSD' },
      { id: 4, label: '4. OVCSAS' },
      { id: 5, label: '5. Chancellor' },
      { id: 6, label: '6. Accomplishment' },
      { id: 7, label: '7. Adviser Sign-Off' }
    ];
  }
};

const getMaxStagesForActivity = (activity: Activity): number => {
  return isCollegeOrg(activity.orgId) ? 8 : 7;
};

const getTimelineStageIndex = (activity: Activity): number => {
  const max = getMaxStagesForActivity(activity);
  const isCol = isCollegeOrg(activity.orgId);
  const finalAdviserStage = isCol ? 8 : 7;

  // 1. If activity has completed final adviser sign-off / full liquidation
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
};

const isActivityFullyApproved = (activity: Activity): boolean => {
  const max = getMaxStagesForActivity(activity);
  const sFinal = activity.timeline?.find(s => s.id === max);
  if (sFinal?.status === 'completed' || activity.workflowStatus === 'COMPLETED') return true;
  // If accomplishment report was submitted, it's awaiting adviser sign-off and is NOT fully approved until stage 7/8 is signed
  if (activity.accomplishmentForm?.isCompleted) {
    return false;
  }
  return activity.status === 'Approved';
};

const checkStepPermission = (activity: Activity) => {
  const stage = getTimelineStageIndex(activity);
  return evaluateStepPermission(props.currentUser, activity, stage);
};

const getRequiredAccountForActivity = (activity: Activity): UserAccount | undefined => {
  if (!props.userAccounts || props.userAccounts.length === 0) return undefined;
  const stage = getTimelineStageIndex(activity);
  const isCollege = isCollegeOrg(activity.orgId);
  const orgId = activity.orgId;
  const collegeId = activity.collegeId || orgId;

  if (isCollege) {
    if (stage === 1) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ORGANIZATION' || u.role === 'Org President') && u.orgId === orgId) ||
             props.userAccounts.find(u => u.orgId === orgId);
    }
    if (stage === 2) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ADVISER' || u.role === 'Faculty Adviser') && u.orgId === orgId);
    }
    if (stage === 3) {
      return props.userAccounts.find(u => (u.role === 'ROLE_DEAN' || u.role === 'College Dean' || u.role === 'Dean / College Reviewer') && (u.orgId === collegeId || u.collegeId === collegeId));
    }
    if (stage === 4) {
      return props.userAccounts.find(u => u.role === 'ROLE_OSD' || u.orgId === 'OSD' || u.name.toLowerCase().includes('osd officer')) ||
             props.userAccounts.find(u => u.name.toLowerCase().includes('osd'));
    }
    if (stage === 5) {
      return props.userAccounts.find(u => u.role === 'ROLE_OVCSAS' || u.orgId === 'OVCSAS');
    }
    if (stage === 6) {
      return props.userAccounts.find(u => u.role === 'ROLE_OC' || u.orgId === 'OC');
    }
    if (stage === 7) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ORGANIZATION' || u.role === 'Org President') && u.orgId === orgId) ||
             props.userAccounts.find(u => u.orgId === orgId);
    }
    if (stage === 8) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ADVISER' || u.role === 'Faculty Adviser') && u.orgId === orgId);
    }
  } else {
    // Central Org
    if (stage === 1) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ORGANIZATION' || u.role === 'Org President') && u.orgId === orgId) ||
             props.userAccounts.find(u => u.orgId === orgId);
    }
    if (stage === 2) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ADVISER' || u.role === 'Faculty Adviser') && u.orgId === orgId);
    }
    if (stage === 3) {
      return props.userAccounts.find(u => u.role === 'ROLE_OSD' || u.orgId === 'OSD' || u.name.toLowerCase().includes('osd officer')) ||
             props.userAccounts.find(u => u.name.toLowerCase().includes('osd'));
    }
    if (stage === 4) {
      return props.userAccounts.find(u => u.role === 'ROLE_OVCSAS' || u.orgId === 'OVCSAS');
    }
    if (stage === 5) {
      return props.userAccounts.find(u => u.role === 'ROLE_OC' || u.orgId === 'OC');
    }
    if (stage === 6) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ORGANIZATION' || u.role === 'Org President') && u.orgId === orgId) ||
             props.userAccounts.find(u => u.orgId === orgId);
    }
    if (stage === 7) {
      return props.userAccounts.find(u => (u.role === 'ROLE_ADVISER' || u.role === 'Faculty Adviser') && u.orgId === orgId);
    }
  }
  return undefined;
};

const isOrgUserForActivity = (activity: Activity): boolean => {
  return props.currentUser?.orgId === activity.orgId && 
    (props.currentUser.role === 'ROLE_ORGANIZATION' || props.currentUser.role === 'Org President');
};

const getNextStageActionLabel = (activity: Activity): string => {
  const stage = getTimelineStageIndex(activity);
  const isCollege = isCollegeOrg(activity.orgId);
  if (isCollege) {
    if (stage === 1) return 'Submit to Adviser';
    if (stage === 2) return 'Adviser Endorse';
    if (stage === 3) return 'Dean Endorse';
    if (stage === 4) return 'OSD Approve';
    if (stage === 5) return 'OVCSAS Endorse';
    if (stage === 6) return 'Office of Chancellor Approve';
    if (stage === 7) return 'Submit Accomplishment Report';
    if (stage === 8) return 'Adviser Final Sign-Off';
  } else {
    if (stage === 1) return 'Submit to Adviser';
    if (stage === 2) return 'Adviser Endorse';
    if (stage === 3) return 'OSD Approve';
    if (stage === 4) return 'OVCSAS Endorse';
    if (stage === 5) return 'Office of Chancellor Approve';
    if (stage === 6) return 'Submit Accomplishment Report';
    if (stage === 7) return 'Adviser Final Sign-Off';
  }
  return 'Approve';
};

const handleAdvanceWorkflowStage = async (activity: Activity) => {
  const currentStage = getTimelineStageIndex(activity);
  const isCollege = isCollegeOrg(activity.orgId);
  const maxStages = isCollege ? 8 : 7;
  const ocStage = isCollege ? 6 : 5;
  const accomplishmentStage = isCollege ? 7 : 6;

  // Verify permission
  const perm = evaluateStepPermission(props.currentUser, activity, currentStage);
  if (!perm.canApprove) {
    emit('showToast', 'Approval Restricted', perm.reason, 'warning');
    return;
  }

  // Attempt backend API call (mirrored Spring Boot service)
  if (props.currentUser) {
    const apiResult = await apiService.advanceWorkflowStep(activity, props.currentUser, currentStage);
    if (apiResult.success && apiResult.activity) {
      emit('updateActivity', apiResult.activity);
      emit(
        'showToast',
        currentStage >= maxStages
          ? 'Accomplishment Report Approved! 🎉'
          : currentStage === ocStage
          ? 'Office of the Chancellor Approval Granted! 🏛️'
          : `Advanced to Stage ${currentStage + 1}`,
        apiResult.message,
        'success'
      );
      return;
    }
  }

  // Local state advancement
  const isFinal = currentStage >= maxStages;
  const currentTimeline = activity.timeline || [];
  const updatedTimeline = currentTimeline.map((step) => {
    if (step.id <= currentStage) {
      return { ...step, status: 'completed' as const, updatedAt: step.updatedAt || new Date().toISOString().split('T')[0] };
    }
    if (step.id === currentStage + 1 && !isFinal) {
      return { ...step, status: 'in_progress' as const };
    }
    return step;
  });

  const historyEntry = {
    approverRole: props.currentUser?.role || 'Approver',
    approverName: props.currentUser?.name || 'Reviewer',
    action: isFinal ? ('FINAL_APPROVED' as const) : ('APPROVED' as const),
    remarks: isFinal
      ? 'Final accomplishment approval and liquidation sign-off granted by Faculty Adviser.'
      : currentStage === ocStage
      ? 'Final institutional authorization granted by Office of the Chancellor. Forwarded to Organization to file Accomplishment Report.'
      : currentStage === accomplishmentStage
      ? 'Accomplishment Report and financial liquidation submitted to Adviser for final sign-off.'
      : `Approved at Stage ${currentStage}`,
    timestamp: new Date().toISOString()
  };

  const updated: Activity = {
    ...activity,
    status: isFinal ? 'Approved' : 'Pending',
    workflowStatus: isFinal ? 'COMPLETED' : 'IN_PROGRESS',
    approvalStage: isFinal
      ? 'Approved'
      : currentStage === ocStage
      ? `Stage ${currentStage + 1}: Accomplishment Report Submission`
      : currentStage === accomplishmentStage
      ? `Stage ${currentStage + 1}: Adviser Accomplishment Sign-Off`
      : `Stage ${currentStage + 1}`,
    timeline: updatedTimeline,
    workflowHistory: [...(activity.workflowHistory || []), historyEntry],
    accomplishmentForm: (isFinal || currentStage === accomplishmentStage)
      ? { ...(activity.accomplishmentForm || {}), isCompleted: true }
      : activity.accomplishmentForm
  };

  emit('updateActivity', updated);
  emit(
    'showToast',
    isFinal
      ? 'Accomplishment Report Approved! 🎉'
      : currentStage === ocStage
      ? 'Office of the Chancellor Approval Granted! 🏛️'
      : currentStage === accomplishmentStage
      ? 'Accomplishment Report Submitted! 📄'
      : `Advanced to Stage ${currentStage + 1}`,
    isFinal
      ? `"${activity.title}" (${activity.orgId}) has completed all stages. Accomplishment report finalized in Financial Management.`
      : currentStage === ocStage
      ? `Chancellor approval granted! Forwarded to ${activity.orgId} to fill Accomplishment Report.`
      : currentStage === accomplishmentStage
      ? `Accomplishment report filed and forwarded to Adviser for final sign-off.`
      : `"${activity.title}" (${activity.orgId}) advanced to the next approval tier.`,
    'success'
  );
};

const handleViewDossier = (activity: Activity) => {
  // If reviewing details or history while pending, mark status as Under Review
  if (
    activity.status === 'Pending' ||
    activity.status === 'Needs Approval' ||
    activity.status === 'SUBMITTED' ||
    !activity.status
  ) {
    const updated: Activity = {
      ...activity,
      status: 'Under Review'
    };
    emit('updateActivity', updated);
    emit('selectActivity', updated);
  } else {
    emit('selectActivity', activity);
  }
};

const filterByActionPlan = (fiscalYear: string) => {
  selectedYearFilter.value = fiscalYear;
  activeSubTab.value = 'activities_to_approve';
  emit(
    'showToast',
    `Action Plan Selected: ${fiscalYear}`,
    `Now reviewing activity proposals submitted under ${fiscalYear}.`,
    'info'
  );
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Approval Workflow
            </span>
            <span class="text-xs text-slate-500 font-medium">Step-by-Step Approvals</span>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Plans & Approvals
          </h2>
          <p class="text-sm text-slate-600 mt-1">
            Review student organization action plans, inspect submitted activity proposals, and follow the approval timeline step-by-step.
          </p>
        </div>

        <!-- Help Guide Toggle -->
        <button
          @click="showBeginnerGuide = !showBeginnerGuide"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-white transition-colors cursor-pointer self-start md:self-auto"
        >
          <HelpCircle class="w-4 h-4 text-blue-600" />
          <span>{{ showBeginnerGuide ? 'Hide Guidance' : 'Guide: Approval Steps' }}</span>
        </button>
      </div>

      <!-- APPROVAL GUIDE -->
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2 max-h-0"
        enter-to-class="opacity-100 translate-y-0 max-h-96"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 max-h-96"
        leave-to-class="opacity-0 -translate-y-2 max-h-0"
      >
        <div
          v-if="showBeginnerGuide"
          class="mt-5 p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 text-blue-950 overflow-hidden"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2 mb-2">
              <Sparkles class="w-4 h-4 text-blue-600 shrink-0" />
              <h4 class="text-xs font-bold uppercase tracking-wider text-blue-900">
                Guide: Activity Approval Steps
              </h4>
            </div>
            <button
              @click="showBeginnerGuide = false"
              class="text-blue-500 hover:text-blue-800 p-1"
              title="Close guide"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs mt-2">
            <div class="p-3 bg-white/90 rounded-lg border border-blue-100 shadow-2xs">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center mb-1.5">1</span>
              <strong class="text-slate-900 block font-semibold mb-0.5">Explore Action Plans</strong>
              <span class="text-slate-600 text-[11px] leading-relaxed">
                Check annual action plans to see organization activities and budgets.
              </span>
            </div>

            <div class="p-3 bg-white/90 rounded-lg border border-blue-100 shadow-2xs">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center mb-1.5">2</span>
              <strong class="text-slate-900 block font-semibold mb-0.5">Inspect Proposals</strong>
              <span class="text-slate-600 text-[11px] leading-relaxed">
                Check dates, target participants, venues, and proposed budget before deciding.
              </span>
            </div>

            <div class="p-3 bg-white/90 rounded-lg border border-blue-100 shadow-2xs">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center mb-1.5">3</span>
              <strong class="text-slate-900 block font-semibold mb-0.5">Track the Timeline</strong>
              <span class="text-slate-600 text-[11px] leading-relaxed">
                The Approval Timeline clearly shows who already reviewed and who signs next.
              </span>
            </div>

            <div class="p-3 bg-white/90 rounded-lg border border-blue-100 shadow-2xs">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center mb-1.5">4</span>
              <strong class="text-slate-900 block font-semibold mb-0.5">Approve or Defer</strong>
              <span class="text-slate-600 text-[11px] leading-relaxed">
                Click "Approve" to endorse/advance, or "Defer" to send correction notes to officers.
              </span>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- ==================== BEGINNER-FRIENDLY NAVIGATION HUB ==================== -->
    <div class="space-y-3">
      <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">
        <span>Select Category / Section:</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/90">
        <!-- 1. Activities to Approve -->
        <button
          @click="activeSubTab = 'activities_to_approve'"
          class="p-4 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between group"
          :class="activeSubTab === 'activities_to_approve'
            ? 'bg-white border-blue-900 shadow-md ring-2 ring-blue-900/10'
            : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-300'"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                :class="activeSubTab === 'activities_to_approve' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'"
              >
                <AlertTriangle class="w-4 h-4" />
              </div>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-black"
                :class="activeSubTab === 'activities_to_approve' ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-slate-200 text-slate-700'"
              >
                {{ pendingActivities.length }} Pending
              </span>
            </div>

            <h3 class="text-xs font-black tracking-tight block"
              :class="activeSubTab === 'activities_to_approve' ? 'text-blue-900' : 'text-slate-900'"
            >
              {{ isInstitutionalApprover ? `Activities Sent to ${institutionalOfficeShort}` : 'Activities to Approve' }}
            </h3>
            <p class="text-[11px] text-slate-500 mt-1 leading-snug">
              {{ isInstitutionalApprover ? `Activities routed to ${institutionalOfficeShort} awaiting your review.` : 'Proposals awaiting official sign-off and review.' }}
            </p>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold"
            :class="activeSubTab === 'activities_to_approve' ? 'text-blue-900' : 'text-slate-400 group-hover:text-slate-700'"
          >
            <span>{{ activeSubTab === 'activities_to_approve' ? '● Active Section' : 'Click to View' }}</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </div>
        </button>

        <!-- Deferred for Revision -->
        <button
          @click="activeSubTab = 'deferred'"
          class="p-4 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between group"
          :class="activeSubTab === 'deferred'
            ? 'bg-white border-rose-700 shadow-md ring-2 ring-rose-700/10'
            : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-300'"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                :class="activeSubTab === 'deferred' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'"
              >
                <RotateCcw class="w-4 h-4" />
              </div>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-black"
                :class="activeSubTab === 'deferred' ? 'bg-rose-100 text-rose-950 border border-rose-300' : 'bg-slate-200 text-slate-700'"
              >
                {{ deferredActivities.length }} Deferred
              </span>
            </div>

            <h3 class="text-xs font-black tracking-tight block"
              :class="activeSubTab === 'deferred' ? 'text-rose-700' : 'text-slate-900'"
            >
              Deferred for Revision
            </h3>
            <p class="text-[11px] text-slate-500 mt-1 leading-snug">
              Returned to councils for required budget or doc corrections.
            </p>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold"
            :class="activeSubTab === 'deferred' ? 'text-rose-700' : 'text-slate-400 group-hover:text-slate-700'"
          >
            <span>{{ activeSubTab === 'deferred' ? '● Active Section' : 'Click to View' }}</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </div>
        </button>

        <!-- List of all Action Plans -->
        <button
          @click="activeSubTab = 'action_plans_list'"
          class="p-4 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between group"
          :class="activeSubTab === 'action_plans_list'
            ? 'bg-white border-blue-900 shadow-md ring-2 ring-blue-900/10'
            : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-300'"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                :class="activeSubTab === 'action_plans_list' ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-900'"
              >
                <FileSpreadsheet class="w-4 h-4" />
              </div>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                :class="activeSubTab === 'action_plans_list' ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-slate-200 text-slate-700'"
              >
                {{ actionPlans.length }} Envelopes
              </span>
            </div>

            <h3 class="text-xs font-black tracking-tight block"
              :class="activeSubTab === 'action_plans_list' ? 'text-blue-900' : 'text-slate-900'"
            >
              List of Action Plans
            </h3>
            <p class="text-[11px] text-slate-500 mt-1 leading-snug">
              Official annual repositories & organizational budget plans.
            </p>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold"
            :class="activeSubTab === 'action_plans_list' ? 'text-blue-900' : 'text-slate-400 group-hover:text-slate-700'"
          >
            <span>{{ activeSubTab === 'action_plans_list' ? '● Active Section' : 'Click to View' }}</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </div>
        </button>

        <!-- Approved Activities Archive -->
        <button
          @click="activeSubTab = 'all_archive'"
          class="p-4 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between group"
          :class="activeSubTab === 'all_archive'
            ? 'bg-white border-blue-900 shadow-md ring-2 ring-blue-900/10'
            : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-300'"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                :class="activeSubTab === 'all_archive' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'"
              >
                <CheckCircle2 class="w-4 h-4" />
              </div>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                :class="activeSubTab === 'all_archive' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-200 text-slate-700'"
              >
                {{ approvedActivities.length }} Approved
              </span>
            </div>

            <h3 class="text-xs font-black tracking-tight block"
              :class="activeSubTab === 'all_archive' ? 'text-blue-900' : 'text-slate-900'"
            >
              {{ isInstitutionalApprover ? 'Approved Activities' : 'Approved Archive' }}
            </h3>
            <p class="text-[11px] text-slate-500 mt-1 leading-snug">
              {{ isInstitutionalApprover ? `Activities approved by ${institutionalOfficeShort}, filterable per organization.` : 'History of all sanctioned student organization activities.' }}
            </p>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold"
            :class="activeSubTab === 'all_archive' ? 'text-blue-900' : 'text-slate-400 group-hover:text-slate-700'"
          >
            <span>{{ activeSubTab === 'all_archive' ? '● Active Section' : 'Click to View' }}</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      <!-- Contextual Dynamic Section Banner -->
      <div class="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span class="font-bold text-slate-700">Currently Viewing:</span>
          <span class="font-extrabold text-blue-900">
            <template v-if="activeSubTab === 'activities_to_approve'">
              {{ isInstitutionalApprover ? `Activities Sent to ${institutionalOfficeShort} (Awaiting Review: ${pendingActivities.length} Items)` : `Activities Needing Approval (${pendingActivities.length} Pending Items)` }}
            </template>
            <template v-else-if="activeSubTab === 'deferred'">
              Deferred Activities for Revision ({{ deferredActivities.length }} Returned Items)
            </template>
            <template v-else-if="activeSubTab === 'action_plans_list'">
              List of all Action Plan Envelopes & Fiscal Year Repositories
            </template>
            <template v-else>
              {{ isInstitutionalApprover ? `Activities Approved by ${institutionalOfficeShort} (${approvedActivities.length} Total - Filter by Organization below)` : `Approved Activities History & Sanctioned Archives (${approvedActivities.length} Total)` }}
            </template>
          </span>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- TAB 1, 2 & 4: ACTIVITIES LIST (PENDING, DEFERRED, OR APPROVED) -->
    <!-- ============================================================= -->
    <div v-if="activeSubTab === 'activities_to_approve' || activeSubTab === 'deferred' || activeSubTab === 'all_archive'" class="space-y-4">
      <!-- Search and Quick Council Filters -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <!-- Search Input -->
        <div class="relative flex-1 w-full">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search proposal title, council acronym, proposer, venue..."
            class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <!-- Filter Pills for Councils -->
        <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            v-if="availableOrgFilters.length > 1"
            @click="selectedOrg = 'ALL'"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border"
            :class="selectedOrg === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
          >
            All Councils
          </button>
          <button
            v-for="org in availableOrgFilters"
            :key="org.id"
            @click="selectedOrg = org.id"
            class="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shadow-2xs"
            :class="[
              getOrgTheme(org.id).badgeBg,
              getOrgTheme(org.id).badgeText,
              getOrgTheme(org.id).badgeBorder,
              selectedOrg === org.id
                ? 'ring-2 ring-slate-900 ring-offset-1 font-black shadow-xs scale-105'
                : 'hover:opacity-90'
            ]"
          >
            {{ org.acronym }}
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="displayedActivities.length === 0"
        class="bg-white rounded-2xl border border-slate-200 p-12 text-center"
      >
        <CheckCircle2 v-if="activeSubTab === 'activities_to_approve'" class="w-12 h-12 text-emerald-500 mx-auto mb-2" />
        <Info v-else class="w-12 h-12 text-slate-300 mx-auto mb-2" />
        
        <h4 class="text-base font-bold text-slate-800">
          {{ activeSubTab === 'activities_to_approve' ? 'No Activities Awaiting Approval' : activeSubTab === 'deferred' ? 'No Deferred Activities' : 'No Activities Found' }}
        </h4>
        <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {{ activeSubTab === 'activities_to_approve' 
            ? 'All proposed activities in this selection have been reviewed and approved.' 
            : activeSubTab === 'deferred'
              ? 'No activity proposals have been deferred for revision in this filter.'
              : 'Try clearing your search query or selecting a different council filter.' }}
        </p>
      </div>

      <!-- List of Activities Requiring Approval (with Approval Timeline) -->
      <div v-else class="space-y-4">
        <div
          v-for="activity in displayedActivities"
          :key="activity.id"
          class="bg-white rounded-2xl border p-5 sm:p-6 shadow-2xs transition-all hover:border-slate-300"
          :class="(activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION') ? 'border-rose-200/90' : activity.status === 'Pending' ? 'border-amber-200/90' : 'border-slate-200/90'"
        >
          <!-- Top Row: Org details, Status, Budget -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <OrgBadge :org-id="activity.orgId" size="md" />
              <div>
                <span class="text-xs font-bold text-slate-700">{{ getOrgName(activity.orgId) }}</span>
                <span class="text-xs text-slate-400 ml-2">ID: {{ activity.id }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2.5 self-start sm:self-auto">
              <!-- Budget Tag -->
              <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                <Coins class="w-3.5 h-3.5 text-emerald-600" />
                <span>₱{{ activity.budget.toLocaleString() }}</span>
              </div>

              <!-- Status Tag -->
              <span
                class="text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                :class="activity.status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold'
                  : (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION')
                    ? 'bg-rose-100 text-rose-900 border border-rose-300 font-black'
                    : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                    ? 'bg-blue-100 text-blue-900 border border-blue-300 font-black'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 font-black'"
              >
                <CheckCircle2 v-if="activity.status === 'Approved'" class="w-3.5 h-3.5 text-emerald-600" />
                <RotateCcw v-else-if="activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION'" class="w-3.5 h-3.5 text-rose-600" />
                <Eye v-else-if="activity.status === 'Under Review' || activity.status === 'IN_REVIEW'" class="w-3.5 h-3.5 text-blue-600" />
                <Clock v-else class="w-3.5 h-3.5 text-amber-600" />
                <span>{{ activity.status === 'Approved' ? 'Approved' : (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION') ? 'DEFERRED FOR REVISION' : (activity.status === 'Under Review' || activity.status === 'IN_REVIEW') ? 'Under Review' : 'Needs Approval' }}</span>
              </span>
            </div>
          </div>

          <!-- Main Info -->
          <div class="mt-4">
            <h3 
              @click="handleViewDossier(activity)"
              class="text-base font-bold text-slate-900 leading-snug cursor-pointer hover:text-blue-900 transition-colors"
              title="Click to view activity DAD details and review history"
            >
              {{ activity.title }}
            </h3>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">
              {{ activity.description }}
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
              <div class="flex items-center gap-2">
                <Calendar class="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span class="text-[10px] text-slate-400 block uppercase font-medium">Event Date</span>
                  <span class="font-bold text-slate-800">{{ activity.startDate }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <MapPin class="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span class="text-[10px] text-slate-400 block uppercase font-medium">Venue</span>
                  <span class="font-bold text-slate-800 truncate block max-w-[130px]" :title="activity.venue">{{ activity.venue }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <User class="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <span class="text-[10px] text-slate-400 block uppercase font-medium">Proposed By</span>
                  <span class="font-bold text-slate-800 truncate block max-w-[130px]">{{ activity.proposedBy }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <FileSpreadsheet class="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span class="text-[10px] text-slate-400 block uppercase font-medium">Action Plan</span>
                  <span class="font-bold text-slate-800">{{ activity.fiscalYear }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================== -->
          <!-- OFFICIAL APPROVAL TIMELINE -->
          <!-- ========================================== -->
          <div class="mt-5 pt-4 border-t border-slate-100">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-1.5">
                <ShieldCheck class="w-4 h-4 text-emerald-600" />
                <span class="text-xs font-extrabold text-slate-900">
                  {{ isCollegeOrg(activity.orgId) ? 'College Approval Workflow (8 Stages to Final Liquidation)' : 'Central Org Workflow (7 Stages to Final Liquidation - No Dean Stage)' }}
                </span>
              </div>
              <span class="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Stage {{ getTimelineStageIndex(activity) }} of {{ getMaxStagesForActivity(activity) }}
              </span>
            </div>

            <!-- Horizontal Connected Stepper Bar -->
            <div class="py-4 px-3 sm:px-6 bg-slate-50/60 rounded-2xl border border-slate-200/80 overflow-x-auto">
              <div class="relative flex items-center justify-between min-w-[420px] sm:min-w-0 w-full">
                <!-- Background Connecting Rail Line -->
                <div class="absolute left-6 right-6 top-3.5 -translate-y-1/2 h-0.5 bg-slate-200 z-0">
                  <!-- Active Green Progress Line -->
                  <div 
                    class="h-full bg-emerald-500 transition-all duration-500 ease-out" 
                    :style="{ 
                      width: `${isActivityFullyApproved(activity) ? 100 : Math.max(0, ((getTimelineStageIndex(activity) - 1) / Math.max(getMaxStagesForActivity(activity) - 1, 1)) * 100)}%` 
                    }"
                  ></div>
                </div>

                <!-- Stepper Nodes for Approver Stages (5 for non-college, 6 for college) -->
                <div 
                  v-for="stage in getApproverStagesForOrg(activity.orgId)" 
                  :key="stage.id"
                  class="relative z-10 flex flex-col items-center group"
                >
                  <!-- 1. COMPLETED / APPROVED: Shows green checkmark -->
                  <div 
                    v-if="stage.id < getTimelineStageIndex(activity) || (stage.id === getTimelineStageIndex(activity) && isActivityFullyApproved(activity))"
                    class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-2xs bg-emerald-500 text-white"
                    :title="`${stage.label}: Approved / Endorsed`"
                  >
                    <Check class="w-3.5 h-3.5 stroke-[3]" />
                  </div>

                  <!-- 2. CURRENT ACTIVE STAGE: Awaiting Approval (Pending Clock) or Under Review (Eye) -->
                  <div 
                    v-else-if="stage.id === getTimelineStageIndex(activity)"
                    class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-2xs"
                    :class="[
                      (activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200/90'
                        : (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION')
                        ? 'bg-rose-600 text-white ring-4 ring-rose-200/90'
                        : 'bg-amber-500 text-white ring-4 ring-amber-200/90'
                    ]"
                    :title="`${stage.label}: ${(activity.status === 'Under Review' || activity.status === 'IN_REVIEW') ? 'Under Review by Approver' : 'Awaiting Approval (Pending)'}`"
                  >
                    <Eye v-if="activity.status === 'Under Review' || activity.status === 'IN_REVIEW'" class="w-3.5 h-3.5 stroke-[2.5]" />
                    <RotateCcw v-else-if="activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION'" class="w-3.5 h-3.5 stroke-[2.5]" />
                    <Clock v-else class="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>

                  <!-- 3. FUTURE UPCOMING STAGE: Shows Stage Number (NO checkmark!) -->
                  <div 
                    v-else
                    class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all bg-slate-100 text-slate-400 border border-slate-300"
                    :title="`${stage.label}: Upcoming Stage`"
                  >
                    <span>{{ stage.id }}</span>
                  </div>

                  <!-- Stage Label & Indicator Subtitle -->
                  <div class="flex flex-col items-center mt-2 text-center">
                    <span 
                      class="text-[10px] font-bold transition-colors max-w-[85px] leading-tight"
                      :class="[
                        stage.id < getTimelineStageIndex(activity) || (stage.id === getTimelineStageIndex(activity) && isActivityFullyApproved(activity))
                          ? 'text-emerald-800'
                          : stage.id === getTimelineStageIndex(activity)
                          ? ((activity.status === 'Under Review' || activity.status === 'IN_REVIEW') ? 'text-blue-900 font-extrabold' : 'text-amber-900 font-extrabold')
                          : 'text-slate-400'
                      ]"
                    >
                      {{ stage.label }}
                    </span>

                    <span
                      v-if="stage.id === getTimelineStageIndex(activity) && !isActivityFullyApproved(activity)"
                      class="text-[9px] font-extrabold uppercase tracking-tight mt-0.5"
                      :class="[
                        (activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                          ? 'text-blue-600'
                          : (activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION')
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      ]"
                    >
                      {{ (activity.status === 'Under Review' || activity.status === 'IN_REVIEW') ? 'Under Review' : 'Pending' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Activity Card Action Bar -->
          <div class="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2.5 flex-wrap">
            <button
              @click="handleViewDossier(activity)"
              class="btn-info btn-sm cursor-pointer"
            >
              <Eye class="w-3.5 h-3.5" />
              <span>View DAD Details &amp; History</span>
            </button>

            <div class="flex items-center gap-2 flex-wrap">
              <!-- If Deferred: allow Organization User to Resubmit -->
              <template v-if="activity.status === 'DEFERRED' || activity.status === 'DEFERRED FOR REVISION'">
                <button
                  v-if="isOrgUserForActivity(activity) || currentUser?.role === 'ROLE_ORGANIZATION' || currentUser?.role === 'Org President'"
                  @click="handleResubmitActivity(activity)"
                  type="button"
                  class="btn-success btn-sm flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 font-bold"
                  title="Resubmit revised activity proposal to Adviser"
                >
                  <Send class="w-3.5 h-3.5" />
                  <span>RESUBMIT ACTIVITY</span>
                </button>
                <span v-else class="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <RotateCcw class="w-3.5 h-3.5 text-rose-600" />
                  <span>Returned to {{ activity.orgId }} for revision</span>
                </span>
              </template>

              <!-- If Pending / Under Review: Approver Advance or Defer buttons -->
              <template v-else-if="activity.status === 'Pending' || activity.status === 'IN_REVIEW' || activity.status === 'Under Review'">
                <!-- When current user is authorized to approve or defer -->
                <template v-if="checkStepPermission(activity).canApprove || checkStepPermission(activity).canDefer">
                  <button
                    v-if="checkStepPermission(activity).canApprove"
                    @click="handleAdvanceWorkflowStage(activity)"
                    type="button"
                    class="btn-primary btn-sm flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    :title="`Advance from Stage ${getTimelineStageIndex(activity)} to next approval tier`"
                  >
                    <ArrowRight class="w-3.5 h-3.5" />
                    <span>{{ getNextStageActionLabel(activity) }}</span>
                  </button>

                  <button
                    v-if="checkStepPermission(activity).canDefer"
                    @click="handleOpenDefer(activity)"
                    type="button"
                    class="btn-warning btn-sm flex items-center gap-1.5 cursor-pointer"
                    title="Defer proposal back to organization with revision remarks"
                  >
                    <RotateCcw class="w-3.5 h-3.5" />
                    <span>Defer</span>
                  </button>
                </template>

                <!-- When NOT authorized to approve or endorse: they can only view it -->
                <template v-else>
                  <span
                    class="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    :title="checkStepPermission(activity).reason || 'Awaiting action from assigned approver'"
                  >
                    <Lock class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Awaiting {{ checkStepPermission(activity).expectedTitle || 'Approval' }}</span>
                  </span>
                </template>
              </template>

              <button
                v-if="activity.status === 'Approved' && currentUser?.role === 'ROLE_ADMIN'"
                @click="emit('toggleStatus', activity.id)"
                class="btn-sm btn-secondary cursor-pointer"
              >
                <span>Reset to Pending</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- TAB 2: LIST OF ALL THE ACTION PLANS (INSTITUTIONAL REPOSITORIES) -->
    <!-- ============================================================= -->
    <div v-else-if="activeSubTab === 'action_plans_list'" class="space-y-4">
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-extrabold text-slate-900">
              Action Plan Folders
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Annual action plans grouping organizational activities and budgets
            </p>
          </div>
          <span class="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl">
            {{ actionPlans.length }} Fiscal Year Folders
          </span>
        </div>
      </div>

      <!-- Action Plan Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="plan in actionPlans"
          :key="plan.id"
          class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-xs font-black px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
                {{ plan.fiscalYear }}
              </span>
              <span
                class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                :class="plan.status === 'Open' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'"
              >
                {{ plan.status === 'Open' ? 'Active Review Period' : plan.status }}
              </span>
            </div>

            <h4 class="text-base font-bold text-slate-900 leading-snug">
              {{ plan.title }}
            </h4>
            <p v-if="plan.theme" class="text-xs font-medium text-blue-700 mt-0.5">
              "{{ plan.theme }}"
            </p>
            <p class="text-xs text-slate-600 mt-2 line-clamp-2">
              {{ plan.description }}
            </p>

            <div class="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span class="text-[10px] text-slate-400 block uppercase font-semibold">Allocated Budget</span>
                <span class="font-bold text-slate-900">₱{{ plan.allocatedBudget.toLocaleString() }}</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block uppercase font-semibold">Deadline</span>
                <span class="font-bold text-slate-800">{{ plan.submissionDeadline }}</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block uppercase font-semibold">Registered Activities</span>
                <span class="font-bold text-blue-700">{{ activities.filter(a => a.fiscalYear === plan.fiscalYear).length }} activities</span>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block uppercase font-semibold">Pending Approval</span>
                <span class="font-bold text-amber-600">{{ activities.filter(a => a.fiscalYear === plan.fiscalYear && a.status === 'Pending').length }} items</span>
              </div>
            </div>
          </div>

          <!-- Action button to inspect activities in this Action Plan -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[11px] text-slate-400">
              Created by {{ plan.createdBy }}
            </span>
            <button
              @click="filterByActionPlan(plan.fiscalYear)"
              class="btn-secondary btn-sm"
            >
              <span>View Activities In Plan</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- DEFER PROPOSAL FOR REVISION MODAL                               -->
    <!-- ============================================================= -->
    <div
      v-if="isDeferModalOpen"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw class="w-4 h-4 text-rose-600" />
              <span>Defer Activity for Revision</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Please provide the reason for deferring this activity proposal.
            </p>
          </div>
          <button
            @click="isDeferModalOpen = false"
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="mt-4 space-y-3">
          <!-- Proposal Title reference -->
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span class="text-slate-400 block text-[10px] uppercase font-semibold">Activity Proposal</span>
            <span class="font-bold text-slate-800 text-sm">{{ activityForDefer?.title }}</span>
            <span class="text-slate-500 block text-[11px] mt-0.5">{{ activityForDefer?.orgId }} • Budget: ₱{{ activityForDefer?.budget?.toLocaleString() }}</span>
          </div>

          <!-- Preset common reasons (Quick Pick) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              Select Preset Reason / Remark:
            </label>
            <div class="space-y-1.5">
              <button
                v-for="reason in presetReasons"
                :key="reason"
                type="button"
                @click="selectedPresetReason = reason; deferRemark = reason"
                class="w-full text-left p-2.5 rounded-xl text-xs transition-colors border cursor-pointer"
                :class="selectedPresetReason === reason
                  ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100'"
              >
                {{ reason }}
              </button>
            </div>
          </div>

          <!-- Mandatory Remark / Reason Input -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Deferral Remark / Reason <span class="text-rose-600 font-bold">* (Mandatory)</span>:
            </label>
            <textarea
              v-model="deferRemark"
              rows="3"
              placeholder="e.g., Deferred for revision of the proposed budget and supporting documents."
              class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-snug">
            <strong>Note:</strong> Deferring this activity does not reject or cancel it permanently. It will be returned with status <strong>DEFERRED FOR REVISION</strong> so the organization can revise details, upload corrected documents, and resubmit.
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
            @click="handleConfirmDefer"
            class="btn-sm bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Defer Activity</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
