<script setup lang="ts">
import { ref, computed } from 'vue';
import { Activity, CalendarViewMode, ApprovalTab } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Building2, 
  Coins, 
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  X,
  Layers,
  Search,
  Filter,
  Info,
  RotateCcw
} from 'lucide-vue-next';
import { UserAccount } from '../types';
import { ORGANIZATIONS, ORG_COLORS, isActivityVisibleForUser } from '../data/initialData';

const props = defineProps<{
  activities: Activity[];
  currentUser?: UserAccount | null;
}>();

const emit = defineEmits<{
  (e: 'downloadCalendar'): void;
  (e: 'openCalendarModal'): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'toggleStatus', activityId: string): void;
  (e: 'navigateToTab', tab: ApprovalTab): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

// Filter for pending list search and active sub-tab
const pendingSearchQuery = ref('');
const activeStatusFilter = ref<'pending' | 'deferred'>('pending');

// Pending activities that require immediate approval
const pendingActivities = computed(() => {
  let list = props.activities.filter(a => 
    (a.status === 'Pending' || a.status === 'IN_REVIEW' || a.status === 'Under Review' || a.status === 'Needs Approval') &&
    isActivityVisibleForUser(a, props.currentUser, 'pending')
  );
  if (!pendingSearchQuery.value.trim()) return list;
  const q = pendingSearchQuery.value.toLowerCase();
  return list.filter(a => 
    a.title.toLowerCase().includes(q) ||
    a.orgId.toLowerCase().includes(q) ||
    (a as any).category?.toLowerCase().includes(q)
  );
});

// Deferred activities returned to organizations for revision
const deferredActivities = computed(() => {
  let list = props.activities.filter(a => 
    (a.status === 'DEFERRED' || a.status === 'DEFERRED FOR REVISION') &&
    isActivityVisibleForUser(a, props.currentUser, 'deferred')
  );
  if (!pendingSearchQuery.value.trim()) return list;
  const q = pendingSearchQuery.value.toLowerCase();
  return list.filter(a => 
    a.title.toLowerCase().includes(q) ||
    a.orgId.toLowerCase().includes(q) ||
    (a as any).category?.toLowerCase().includes(q)
  );
});

const approvedActivities = computed(() => {
  return props.activities.filter(a => 
    (a.status === 'Approved' || a.status === 'COMPLETED') &&
    isActivityVisibleForUser(a, props.currentUser, 'approved')
  );
});

const totalBudget = computed(() => {
  return props.activities.reduce((sum, a) => sum + a.budget, 0);
});

const pendingBudget = computed(() => {
  return pendingActivities.value.reduce((sum, a) => sum + a.budget, 0);
});

// Calendar State
const isCalendarVisible = ref(true);
const viewMode = ref<CalendarViewMode>('Month');
const selectedDate = ref<Date>(new Date(2026, 8, 19)); // Sep 19, 2026

// Calendar Navigation
const handlePrev = () => {
  const newDate = new Date(selectedDate.value);
  if (viewMode.value === 'Week') {
    newDate.setDate(newDate.getDate() - 7);
  } else {
    newDate.setMonth(newDate.getMonth() - 1);
  }
  selectedDate.value = newDate;
};

const handleNext = () => {
  const newDate = new Date(selectedDate.value);
  if (viewMode.value === 'Week') {
    newDate.setDate(newDate.getDate() + 7);
  } else {
    newDate.setMonth(newDate.getMonth() + 1);
  }
  selectedDate.value = newDate;
};

const handleToday = () => {
  selectedDate.value = newDate = new Date(2026, 8, 19);
};

const calendarTitle = computed(() => {
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  return selectedDate.value.toLocaleDateString('default', options);
});

// Calendar grid calculations
const daysInMonthGrid = computed(() => {
  const year = selectedDate.value.getFullYear();
  const month = selectedDate.value.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
    });
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push({
      dayNumber: i,
      isCurrentMonth: true,
      dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  const remainingCells = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      dayNumber: i,
      isCurrentMonth: false,
      dateString: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  return days;
});

const getActivitiesForDate = (dateStr: string) => {
  return props.activities.filter(a => a.startDate === dateStr);
};

// Organization summary stats
const orgMonitoringData = computed(() => {
  return ORGANIZATIONS.map(org => {
    const orgActivities = props.activities.filter(a => a.orgId === org.id);
    const approved = orgActivities.filter(a => a.status === 'Approved').length;
    const pending = orgActivities.filter(a => a.status === 'Pending').length;
    const total = orgActivities.length;
    const budget = orgActivities.reduce((s, a) => s + a.budget, 0);

    return {
      ...org,
      totalActivities: total,
      approvedActivities: approved,
      pendingActivities: pending,
      totalBudget: budget,
      completionRate: total > 0 ? Math.round((approved / total) * 100) : 100
    };
  });
});

const getOrgName = (orgId: string) => {
  const org = ORGANIZATIONS.find(o => o.id === orgId);
  return org ? org.name : orgId;
};

const handleQuickApprove = (activity: Activity) => {
  emit('toggleStatus', activity.id);
  emit(
    'showToast',
    'Proposal Approved',
    `"${activity.title}" (${activity.orgId}) has been officially approved.`,
    'success'
  );
};
</script>

<template>
  <div class="space-y-6">
    <!-- ==================== 1. EXECUTIVE HEADER & CALENDAR FEATURE BUTTON ==================== -->
    <div class="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 relative overflow-hidden">
      <!-- Decorative Background Accent Pill -->
      <div class="absolute -right-12 -top-12 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300/60 flex items-center gap-1.5">
              <Clock class="w-3.5 h-3.5 text-amber-700" />
              <span>Approval Action Panel</span>
            </span>
            <span class="text-xs text-slate-500 font-semibold">MSUN Student Affairs Review Board</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Approval Dashboard
          </h1>

          <p class="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Review, evaluate, and endorse official student organization activity proposals. All items needing your sign-off are highlighted front and center.
          </p>
        </div>

        <!-- Prominent Calendar Feature Button -->
        <div class="flex flex-wrap items-center gap-3 shrink-0">
          <button
            @click="emit('openCalendarModal')"
            class="btn-primary"
            title="Open Interactive Fullscreen Calendar Feature"
          >
            <CalendarIcon class="w-4 h-4 text-white" />
            <span>Open Calendar Schedule</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== 3. HERO HIGHLIGHT: PROPOSALS NEEDING APPROVAL / DEFERRED ==================== -->
    <div class="bg-white rounded-3xl border-2 border-amber-300/80 shadow-md p-6 sm:p-7 space-y-6">
      
      <!-- Top Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
            <AlertCircle class="w-6 h-6" />
          </div>

          <div>
            <div class="flex items-center gap-2.5">
              <h2 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Activity Proposals Review
              </h2>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review proposals, verify budget details, and approve or defer with required revision remarks.
            </p>
          </div>
        </div>

        <!-- Search / Filter bar for pending proposals -->
        <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap sm:flex-nowrap">
          <div class="relative w-full sm:w-56">
            <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              v-model="pendingSearchQuery"
              placeholder="Search by title, org..."
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <button
            @click="emit('navigateToTab', 'plans_approvals')"
            class="btn-secondary btn-sm"
          >
            <span>View All Proposals</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Filter Tabs: Pending vs Deferred -->
      <div class="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          @click="activeStatusFilter = 'pending'"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          :class="activeStatusFilter === 'pending'
            ? 'bg-amber-500 text-white shadow-xs'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          <Clock class="w-3.5 h-3.5" />
          <span>Pending Review ({{ pendingActivities.length }})</span>
        </button>

        <button
          @click="activeStatusFilter = 'deferred'"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          :class="activeStatusFilter === 'deferred'
            ? 'bg-rose-700 text-white shadow-xs'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Deferred for Revision ({{ deferredActivities.length }})</span>
        </button>
      </div>

      <!-- Beginners Guide Banner -->
      <div v-if="activeStatusFilter === 'pending'" class="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3">
        <Info class="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div class="text-xs text-amber-900 leading-relaxed">
          <strong class="font-bold block">How to review & approve:</strong>
          Click <strong class="text-slate-900 underline">Review</strong> to check objectives, proposed budget, and timeline. In the DAD details modal, click <strong class="text-emerald-800 underline">Approve</strong> or <strong class="text-amber-800 underline">Defer</strong> to request corrections.
        </div>
      </div>

      <div v-else class="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-4 flex items-start gap-3">
        <Info class="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
        <div class="text-xs text-rose-900 leading-relaxed">
          <strong class="font-bold block">Deferred Activities:</strong>
          These activities were deferred with remarks and returned to the organization for revision. The previous approval history is preserved. Once corrected, the organization user can resubmit.
        </div>
      </div>

      <!-- Table for Pending Activities -->
      <div v-if="activeStatusFilter === 'pending' && pendingActivities.length > 0" class="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th class="p-3.5">Organization Name</th>
              <th class="p-3.5">Activity Title</th>
              <th class="p-3.5">Date for Approval</th>
              <th class="p-3.5">Status</th>
              <th class="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr 
              v-for="activity in pendingActivities" 
              :key="activity.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <td class="p-3.5">
                <div>
                  <strong class="font-extrabold text-slate-900 block text-xs leading-snug">
                    {{ activity.orgId }}
                  </strong>
                  <span class="text-[11px] text-slate-500 font-medium block">
                    {{ getOrgName(activity.orgId) }}
                  </span>
                </div>
              </td>
              <td class="p-3.5 font-bold text-slate-900 text-xs">
                <div class="leading-snug">
                  {{ activity.title }}
                </div>
              </td>
              <td class="p-3.5 text-slate-700 text-xs">
                <div class="flex items-center gap-1.5 font-semibold text-slate-800">
                  <CalendarIcon class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{{ activity.startDate }}</span>
                </div>
              </td>
              <td class="p-3.5">
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  :class="(activity.status === 'Under Review' || activity.status === 'IN_REVIEW')
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'"
                >
                  <Eye v-if="activity.status === 'Under Review' || activity.status === 'IN_REVIEW'" class="w-3 h-3 text-blue-600" />
                  <Clock v-else class="w-3 h-3 text-amber-600" />
                  <span>{{ (activity.status === 'Under Review' || activity.status === 'IN_REVIEW') ? 'Under Review' : 'Pending' }}</span>
                </span>
              </td>
              <td class="p-3.5 text-right whitespace-nowrap">
                <button
                  @click="emit('selectActivity', activity)"
                  class="btn-info btn-sm cursor-pointer"
                  title="Review activity proposal details"
                >
                  <Eye class="w-3.5 h-3.5" />
                  <span>Review</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table for Deferred Activities -->
      <div v-else-if="activeStatusFilter === 'deferred' && deferredActivities.length > 0" class="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th class="p-3.5">Organization</th>
              <th class="p-3.5">Activity Title</th>
              <th class="p-3.5">Status</th>
              <th class="p-3.5">Latest Deferral Remark</th>
              <th class="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr 
              v-for="activity in deferredActivities" 
              :key="activity.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <td class="p-3.5">
                <strong class="font-extrabold text-slate-900 block text-xs">
                  {{ activity.orgId }}
                </strong>
                <span class="text-[11px] text-slate-500">
                  {{ getOrgName(activity.orgId) }}
                </span>
              </td>
              <td class="p-3.5 font-bold text-slate-900 text-xs">
                {{ activity.title }}
              </td>
              <td class="p-3.5">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                  DEFERRED FOR REVISION
                </span>
              </td>
              <td class="p-3.5 text-slate-600 text-xs max-w-xs truncate">
                {{ activity.workflowHistory?.slice().reverse().find(h => h.action === 'DEFERRED')?.remarks || 'Returned for document revision' }}
              </td>
              <td class="p-3.5 text-right whitespace-nowrap">
                <button
                  @click="emit('selectActivity', activity)"
                  class="btn-secondary btn-sm cursor-pointer"
                  title="View complete activity details and preserved history"
                >
                  <Eye class="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- State when no items exist for current filter -->
      <div
        v-else
        class="bg-emerald-50/60 rounded-2xl border border-emerald-300 p-8 text-center space-y-2"
      >
        <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 class="w-7 h-7" />
        </div>
        <h3 class="text-base font-extrabold text-slate-900">
          {{ activeStatusFilter === 'pending' ? 'All Submitted Proposals Are Cleared!' : 'No Deferred Activities' }}
        </h3>
        <p class="text-xs text-slate-600 max-w-md mx-auto">
          {{ activeStatusFilter === 'pending'
            ? 'There are currently no pending proposals awaiting review. All organizational activities have been evaluated.'
            : 'There are currently no activities marked as deferred for revision.' }}
        </p>
      </div>

    </div>


  </div>
</template>
