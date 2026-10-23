<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Coins, 
  TrendingUp, 
  PieChart, 
  Download, 
  FileCheck2, 
  Building2, 
  AlertCircle,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  DollarSign,
  BarChart3,
  Award,
  Wallet,
  Scale,
  MapPin,
  Calendar
} from 'lucide-vue-next';
import { ORGANIZATIONS, ORG_COLORS, INITIAL_ACTIVITIES, isOrgMatch, getOrgTheme } from '../data/initialData';

const props = defineProps<{
  activities?: Activity[];
}>();

const emit = defineEmits<{
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
  (e: 'selectActivity', activity: Activity): void;
}>();

// Active selected organization ('ALL' or specific OrgId e.g. 'SSC')
const selectedOrgId = ref<string>('SSC');
const searchQuery = ref<string>('');
const statusFilter = ref<string>('all');
const expandedActivityId = ref<string | null>(null);

const scrollContainer = ref<HTMLDivElement | null>(null);

const scrollLeft = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: -320, behavior: 'smooth' });
  }
};

const scrollRight = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: 320, behavior: 'smooth' });
  }
};

// Base organization financial allocation data
const financialAllocations = [
  { orgId: 'SSC', name: 'Supreme Student Council', allocated: 220000, disbursed: 145000, committed: 45000, status: 'Healthy' },
  { orgId: 'CBIT SEC', name: 'College of Business and Information Technology Student Executive Council', allocated: 140000, disbursed: 92000, committed: 30000, status: 'Healthy' },
  { orgId: 'ELSSA', name: 'Environment and Life Sciences Student Alliance', allocated: 95000, disbursed: 61000, committed: 15000, status: 'Healthy' },
  { orgId: 'CESS SO', name: 'College of Education and Social Sciences Student Organization', allocated: 110000, disbursed: 80000, committed: 25000, status: 'Near Cap' },
  { orgId: 'FIMSSO', name: 'Fisheries and Marine Science Student Organization', allocated: 135000, disbursed: 88000, committed: 32000, status: 'Healthy' },
  { orgId: 'KAABAG', name: 'KAABAG Student Peer Facilitators', allocated: 80000, disbursed: 42000, committed: 18000, status: 'Healthy' },
  { orgId: 'SenSSo', name: 'Senior Students’ Society', allocated: 75000, disbursed: 44000, committed: 12000, status: 'Healthy' }
];

// All activities fallback
const allActivities = computed<Activity[]>(() => {
  return props.activities && props.activities.length > 0 ? props.activities : INITIAL_ACTIVITIES;
});

// Currently selected organization info object
const selectedOrgData = computed(() => {
  if (selectedOrgId.value === 'ALL') {
    const totalAllocated = financialAllocations.reduce((acc, curr) => acc + curr.allocated, 0);
    const totalDisbursed = financialAllocations.reduce((acc, curr) => acc + curr.disbursed, 0);
    const totalCommitted = financialAllocations.reduce((acc, curr) => acc + curr.committed, 0);
    const totalRemaining = totalAllocated - (totalDisbursed + totalCommitted);
    return {
      orgId: 'ALL',
      name: 'All Accredited Student Councils',
      allocated: totalAllocated,
      disbursed: totalDisbursed,
      committed: totalCommitted,
      remaining: totalRemaining,
      status: 'Healthy'
    };
  }

  const found = financialAllocations.find(a => isOrgMatch(a.orgId, selectedOrgId.value)) || financialAllocations[0];
  const remaining = found.allocated - (found.disbursed + found.committed);
  return {
    ...found,
    remaining
  };
});

// Filtered activities list for the active selected organization
const selectedOrgActivities = computed(() => {
  let list = allActivities.value;
  
  if (selectedOrgId.value !== 'ALL') {
    list = list.filter(a => isOrgMatch(a.orgId, selectedOrgId.value));
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.id.toLowerCase().includes(q) ||
      (a.venue && a.venue.toLowerCase().includes(q))
    );
  }

  if (statusFilter.value === 'liquidated') {
    list = list.filter(a => a.accomplishmentForm?.isCompleted);
  } else if (statusFilter.value === 'pending') {
    list = list.filter(a => !a.accomplishmentForm?.isCompleted);
  }

  return list;
});

// Financial statistics for the selected organization
const selectedOrgStats = computed(() => {
  const acts = selectedOrgActivities.value;
  const totalApprovedBudget = acts.reduce((sum, a) => sum + (a.budget || 0), 0);
  const totalDisbursed = selectedOrgData.value.disbursed;
  const totalAllocated = selectedOrgData.value.allocated;
  const avgBudget = acts.length > 0 ? Math.round(totalApprovedBudget / acts.length) : 0;

  return {
    totalActivities: acts.length,
    totalApprovedBudget,
    totalDisbursed,
    totalAllocated,
    avgBudget
  };
});



// Helper methods for Estimated Budget (DAD form) vs Actual Budget (ACRPT form)
const getDadBudget = (act: Activity): number => {
  return act.designForm?.proposedBudget ?? act.budget ?? 0;
};

const hasAcrptBudget = (act: Activity): boolean => {
  if (act.accomplishmentForm?.actualBudget !== undefined && act.accomplishmentForm.actualBudget > 0) return true;
  if (act.accomplishmentForm?.isCompleted) return true;
  return false;
};

const getAcrptBudget = (act: Activity): number => {
  if (act.accomplishmentForm?.actualBudget !== undefined && act.accomplishmentForm.actualBudget > 0) {
    return act.accomplishmentForm.actualBudget;
  }
  if (act.accomplishmentForm?.proposedBudget !== undefined && act.accomplishmentForm.isCompleted) {
    return act.accomplishmentForm.proposedBudget;
  }
  if (act.accomplishmentForm?.isCompleted) {
    return act.budget || 0;
  }
  return 0;
};

const getVariance = (act: Activity): number => {
  const estimated = getDadBudget(act);
  const actual = getAcrptBudget(act);
  return estimated - actual;
};

const getVarianceAmountFormatted = (act: Activity): string => {
  if (!hasAcrptBudget(act)) return 'Pending ACRPT';
  const diff = getVariance(act);
  if (diff === 0) return '₱0.00 (Balanced)';
  if (diff > 0) return `+₱${diff.toLocaleString()} (Saved)`;
  return `-₱${Math.abs(diff).toLocaleString()} (Over)`;
};

const getVarianceAmountColor = (act: Activity): string => {
  if (!hasAcrptBudget(act)) return 'text-slate-500';
  const diff = getVariance(act);
  if (diff > 0) return 'text-emerald-700';
  if (diff === 0) return 'text-blue-700';
  return 'text-rose-600';
};

const getVarianceDescription = (act: Activity): string => {
  if (!hasAcrptBudget(act)) return 'Actual expenses pending submission in ACRPT';
  const diff = getVariance(act);
  if (diff > 0) return 'Under estimated DAD budget (Savings)';
  if (diff === 0) return 'Exact match with estimated DAD budget';
  return 'Actual spending exceeded estimated DAD budget';
};

const getBudgetVarianceLabel = (act: Activity): string => {
  if (!hasAcrptBudget(act)) return 'Pending ACRPT';
  const diff = getVariance(act);
  if (diff > 0) return 'Under Budget';
  if (diff === 0) return 'Balanced';
  return 'Over Budget';
};

const getBudgetVarianceClass = (act: Activity): string => {
  if (!hasAcrptBudget(act)) return 'bg-amber-50 text-amber-800 border-amber-200';
  const diff = getVariance(act);
  if (diff > 0) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (diff === 0) return 'bg-blue-50 text-blue-800 border-blue-200';
  return 'bg-rose-50 text-rose-800 border-rose-200';
};

const getSpendingPercentage = (act: Activity): number => {
  const estimated = getDadBudget(act);
  if (estimated <= 0) return 100;
  const actual = getAcrptBudget(act);
  return Math.round((actual / estimated) * 100);
};

const getProgressBarClass = (act: Activity): string => {
  const pct = getSpendingPercentage(act);
  if (pct <= 100) return 'bg-emerald-600';
  return 'bg-rose-600';
};

const toggleActivityExpand = (id: string) => {
  if (expandedActivityId.value === id) {
    expandedActivityId.value = null;
  } else {
    expandedActivityId.value = id;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header Title & Filter Section -->
    <div class="bg-white rounded-2xl border border-[#E0E7F1] shadow-xs p-5 sm:p-6">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Financial Management
            </span>
            <span class="text-xs text-slate-500">FY 2026 Action Plan</span>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Financial & Budget Summary
          </h2>
          <p class="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Select a student organization below to view activity budgets, allocated funds, and disbursed spend.
          </p>
        </div>
      </div>

      <!-- ==================== HORIZONTAL SWIPEABLE ORGANIZATION CONTAINERS ==================== -->
      <div class="mt-6 pt-5 border-t border-slate-100 relative">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <Building2 class="w-4 h-4 text-blue-900" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Organization Sub-Account
            </h3>
            <span class="text-[10px] text-slate-400">(Swipe left/right)</span>
          </div>

          <!-- Horizontal Navigation Controls -->
          <div class="flex items-center gap-1.5">
            <button
              @click="scrollLeft"
              title="Swipe Left"
              class="btn-icon"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <button
              @click="scrollRight"
              title="Swipe Right"
              class="btn-icon"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Scroll Track Container -->
        <div
          ref="scrollContainer"
          class="flex items-center gap-3.5 overflow-x-auto snap-x py-2 px-1 scrollbar-thin scroll-smooth"
        >
          <!-- 'ALL' Organizations Card -->
          <div
            @click="selectedOrgId = 'ALL'"
            class="snap-start shrink-0 w-64 p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between"
            :class="selectedOrgId === 'ALL'
              ? 'bg-blue-900 text-white border-blue-900 shadow-md ring-2 ring-blue-300 scale-[1.02]'
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:shadow-xs'"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <span 
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                  :class="selectedOrgId === 'ALL' ? 'bg-blue-800 text-blue-100' : 'bg-blue-50 text-blue-800'"
                >
                  Aggregate
                </span>
                <CheckCircle2 v-if="selectedOrgId === 'ALL'" class="w-4 h-4 text-emerald-400" />
              </div>
              <h4 class="text-sm font-extrabold truncate">All Organizations</h4>
              <p class="text-[11px] opacity-80 mt-0.5">{{ financialAllocations.length }} Accredited Councils</p>
            </div>

            <div class="mt-3 pt-2 border-t" :class="selectedOrgId === 'ALL' ? 'border-blue-800' : 'border-slate-100'">
              <div class="flex justify-between items-baseline text-xs">
                <span class="opacity-75 text-[10px]">Total Budget:</span>
                <strong class="font-extrabold text-sm">₱{{ financialAllocations.reduce((acc, curr) => acc + curr.allocated, 0).toLocaleString() }}</strong>
              </div>
            </div>
          </div>

          <!-- Organization Specific Containers -->
          <div
            v-for="alloc in financialAllocations"
            :key="alloc.orgId"
            @click="selectedOrgId = alloc.orgId"
            class="snap-start shrink-0 w-72 p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between"
            :class="selectedOrgId === alloc.orgId
              ? 'bg-white text-slate-900 border-blue-600 shadow-lg ring-2 ring-blue-600 scale-[1.02]'
              : 'bg-slate-50/80 text-slate-800 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-2xs'"
          >
            <div>
              <!-- Header Row -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2.5 overflow-hidden">
                  <div
                    class="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-2xs border"
                    :class="[
                      getOrgTheme(alloc.orgId).badgeBg,
                      getOrgTheme(alloc.orgId).badgeText,
                      getOrgTheme(alloc.orgId).badgeBorder
                    ]"
                  >
                    <span>
                      {{ alloc.orgId }}
                    </span>
                  </div>
                  <h4 class="text-xs font-extrabold text-slate-900 truncate leading-snug">
                    {{ alloc.name }}
                  </h4>
                </div>

                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0"
                  :class="selectedOrgId === alloc.orgId 
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'bg-slate-200/80 text-slate-700'"
                >
                  {{ selectedOrgId === alloc.orgId ? 'Active' : alloc.status }}
                </span>
              </div>

              <!-- Financial Metrics Mini Grid -->
              <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div class="bg-white/90 p-2 rounded-xl border border-slate-200/70">
                  <span class="text-[10px] text-slate-400 font-semibold block uppercase">Allocated</span>
                  <span class="font-extrabold text-slate-900 text-xs">₱{{ alloc.allocated.toLocaleString() }}</span>
                </div>
                <div class="bg-white/90 p-2 rounded-xl border border-slate-200/70">
                  <span class="text-[10px] text-slate-400 font-semibold block uppercase">Disbursed</span>
                  <span class="font-extrabold text-blue-700 text-xs">₱{{ alloc.disbursed.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- ==================== SELECTED ORGANIZATION FINANCIAL SUMMARY ==================== -->
    <div class="bg-white rounded-2xl border border-[#E0E7F1] shadow-xs p-5 sm:p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Coins class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Financial Management
              </span>
              <span class="text-xs font-bold text-slate-500">{{ selectedOrgData.orgId }}</span>
            </div>
            <h3 class="text-base font-extrabold text-slate-900 leading-tight mt-0.5">
              {{ selectedOrgData.name }} • Financial Overview
            </h3>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-semibold text-slate-500">
            Total Activities: <strong class="text-slate-900 font-bold">{{ selectedOrgStats.totalActivities }}</strong>
          </span>
        </div>
      </div>

      <!-- Allocated Budget & Total Disbursed Spend Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 1. Allocated Budget -->
        <div class="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Allocated Budget</span>
            <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              <Wallet class="w-5 h-5" />
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black tracking-tight text-white">
            ₱{{ selectedOrgData.allocated.toLocaleString() }}
          </div>
          <div class="mt-3 pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
            <span>Approved Allocation</span>
            <span class="font-bold text-emerald-400">FY 2026</span>
          </div>
        </div>

        <!-- 2. Total Disbursed Spend -->
        <div class="p-5 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white rounded-2xl border border-blue-700 shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-blue-200 uppercase tracking-wider">Total Disbursed Spend</span>
            <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300">
              <TrendingUp class="w-5 h-5" />
            </div>
          </div>
          <div class="text-2xl sm:text-3xl font-black tracking-tight text-white">
            ₱{{ selectedOrgData.disbursed.toLocaleString() }}
          </div>
          <div class="mt-3 pt-3 border-t border-blue-700/80 flex items-center justify-between text-xs text-blue-200">
            <span>Released Funds</span>
            <span class="font-bold text-blue-300">
              {{ Math.round((selectedOrgData.disbursed / (selectedOrgData.allocated || 1)) * 100) }}% Disbursed
            </span>
          </div>
        </div>
      </div>
    </div>


    <!-- ==================== ACTIVITIES FINANCIAL CARDS ==================== -->
    <div class="space-y-4">
      <!-- Section Title & Search/Filter Controls -->
      <div class="bg-white rounded-2xl border border-[#E0E7F1] shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-wider">
              Activity Portfolio
            </span>
            <span class="text-xs font-bold text-slate-500">{{ selectedOrgActivities.length }} Activities</span>
          </div>
          <h3 class="text-base font-extrabold text-slate-900 mt-0.5">
            Activity Financial Cards
          </h3>
          <p class="text-xs text-slate-500">
            Each card shows the activity's DAD estimated budget vs actual expenditure, status, and line item breakdown.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <!-- Search Input -->
          <div class="relative min-w-[220px]">
            <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search by title, code, venue..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <!-- Liquidation Filter Buttons -->
          <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
            <button
              @click="statusFilter = 'all'"
              class="px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer"
              :class="statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
            >
              All
            </button>
            <button
              @click="statusFilter = 'liquidated'"
              class="px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
              :class="statusFilter === 'liquidated' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
            >
              <CheckCircle2 class="w-3 h-3 text-emerald-600" />
              <span>Liquidated</span>
            </button>
            <button
              @click="statusFilter = 'pending'"
              class="px-2.5 py-1 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
              :class="statusFilter === 'pending' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'"
            >
              <Clock class="w-3 h-3 text-amber-600" />
              <span>Pending</span>
            </button>
          </div>
        </div>
      </div>

      <!-- CARDS GRID: 2 columns on desktop, 1 on mobile/tablet -->
      <div v-if="selectedOrgActivities.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <div
          v-for="act in selectedOrgActivities"
          :key="act.id"
          class="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all p-5 flex flex-col justify-between space-y-4 group relative"
        >
          <!-- Top Row: Org Badge, ID, Status, Fiscal Year -->
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <div 
                class="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-2xs border"
                :class="[
                  getOrgTheme(act.orgId).badgeBg,
                  getOrgTheme(act.orgId).badgeText,
                  getOrgTheme(act.orgId).badgeBorder
                ]"
              >
                {{ act.orgId }}
              </div>
              <span class="text-xs font-bold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                {{ act.id }}
              </span>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <span 
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="act.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
              >
                {{ act.status }}
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {{ act.fiscalYear || 'FY 2026' }}
              </span>
            </div>
          </div>

          <!-- Activity Title & Details -->
          <div>
            <h4
              @click="emit('selectActivity', act)"
              class="text-base font-extrabold text-slate-900 group-hover:text-blue-700 cursor-pointer transition-colors leading-snug line-clamp-2"
            >
              {{ act.title }}
            </h4>
            <div class="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
              <span class="inline-flex items-center gap-1">
                <MapPin class="w-3.5 h-3.5 text-slate-400" />
                <span class="truncate max-w-[150px]">{{ act.venue }}</span>
              </span>
              <span>•</span>
              <span class="inline-flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5 text-slate-400" />
                <span>{{ act.startDate }}</span>
              </span>
              <span>•</span>
              <span class="inline-flex items-center gap-1 font-semibold text-slate-700">
                <Coins class="w-3.5 h-3.5 text-blue-700" />
                <span>{{ act.fundSource || `${act.orgId}-SEC Fund` }}</span>
              </span>
            </div>
          </div>

          <!-- Financial Snapshot Box: Estimated DAD | Actual ACRPT | Variance -->
          <div class="bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
            <div class="grid grid-cols-3 gap-2 text-center">
              <!-- Estimated DAD Budget -->
              <div class="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Estimated DAD</span>
                <span class="text-sm sm:text-base font-black text-blue-900 block mt-0.5">
                  ₱{{ getDadBudget(act).toLocaleString() }}
                </span>
              </div>

              <!-- Actual Spent (ACRPT) -->
              <div class="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Actual Spent</span>
                <span class="text-sm sm:text-base font-black text-emerald-800 block mt-0.5">
                  <template v-if="hasAcrptBudget(act)">
                    ₱{{ getAcrptBudget(act).toLocaleString() }}
                  </template>
                  <template v-else>
                    <span class="text-[11px] text-slate-400 font-bold italic">Pending</span>
                  </template>
                </span>
              </div>

              <!-- Net Variance -->
              <div class="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span class="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Variance</span>
                <span 
                  class="text-xs sm:text-sm font-black block mt-1 truncate"
                  :class="getVarianceAmountColor(act)"
                >
                  {{ hasAcrptBudget(act) ? getVarianceAmountFormatted(act) : 'Pending' }}
                </span>
              </div>
            </div>

            <!-- Utilization Progress Bar -->
            <div v-if="hasAcrptBudget(act)" class="pt-1">
              <div class="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>Budget Utilization</span>
                <span class="font-bold text-slate-700">{{ getSpendingPercentage(act) }}%</span>
              </div>
              <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  :class="getProgressBarClass(act)"
                  :style="{ width: `${Math.min(100, getSpendingPercentage(act))}%` }"
                ></div>
              </div>
            </div>
            <div v-else class="text-[10px] text-slate-500 flex items-center justify-between">
              <span>Post-activity liquidation pending</span>
              <span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                DAD Estimate Stage
              </span>
            </div>
          </div>

          <!-- Expandable Breakdown Drawer if opened -->
          <div 
            v-if="expandedActivityId === act.id"
            class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs animate-in fade-in duration-150"
          >
            <div class="flex items-center justify-between border-b border-slate-200 pb-1.5 font-bold text-slate-900">
              <span class="flex items-center gap-1.5">
                <Receipt class="w-3.5 h-3.5 text-blue-900" />
                <span>Itemized Budget Breakdown</span>
              </span>
              <span class="text-[11px] text-slate-500 font-normal">Source: {{ act.fundSource || `${act.orgId}-SEC Fund` }}</span>
            </div>

            <!-- Table of Line Items -->
            <div v-if="act.designForm?.budgetaryRequirements?.length" class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th class="p-2">Item</th>
                    <th class="p-2">Particulars</th>
                    <th class="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="(b, bIdx) in act.designForm.budgetaryRequirements" :key="bIdx">
                    <td class="p-2 font-semibold text-slate-800">{{ b.item }}</td>
                    <td class="p-2 text-slate-600">{{ b.particulars }}</td>
                    <td class="p-2 text-right font-bold text-blue-900">₱{{ Number(b.amount).toLocaleString() }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="text-xs text-slate-600 italic">
              {{ act.lineItemBudget || 'Standard activity logistical and refreshment requirements.' }}
            </p>

            <div v-if="act.accomplishmentForm?.financialLiquidationSummary" class="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
              <strong class="block text-emerald-950 mb-0.5">Accomplishment Liquidation Note:</strong>
              {{ act.accomplishmentForm.financialLiquidationSummary }}
            </div>
          </div>

          <!-- Card Actions Bottom Row -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              @click="toggleActivityExpand(act.id)"
              class="text-xs font-bold text-slate-700 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{{ expandedActivityId === act.id ? 'Hide Line Items' : 'View Line Items' }}</span>
              <ChevronDown v-if="expandedActivityId !== act.id" class="w-3.5 h-3.5" />
              <ChevronUp v-else class="w-3.5 h-3.5" />
            </button>

            <button
              @click="emit('selectActivity', act)"
              class="btn-secondary btn-sm inline-flex items-center gap-1.5 cursor-pointer font-bold"
              title="Open full activity proposal, DAD, and workflow"
            >
              <span>Activity Details</span>
              <ExternalLink class="w-3 h-3 text-blue-600" />
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
        <AlertCircle class="w-8 h-8 mx-auto text-slate-300" />
        <h4 class="text-sm font-bold text-slate-700">No Financial Records Found</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          No activities match your current search query or liquidation filter for {{ selectedOrgData.name }}.
        </p>
      </div>
    </div>
  </div>
</template>
