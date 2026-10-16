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
  Scale
} from 'lucide-vue-next';
import { Activity, OrgId } from '../types';
import { ORGANIZATIONS, ORG_COLORS, INITIAL_ACTIVITIES } from '../data/initialData';

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
  { orgId: 'CBIT', name: 'College of Business and Information Technology', allocated: 140000, disbursed: 92000, committed: 30000, status: 'Healthy' },
  { orgId: 'CESS', name: 'College of Education and Social Sciences', allocated: 110000, disbursed: 80000, committed: 25000, status: 'Near Cap' },
  { orgId: 'CELS', name: 'College of Environmental and Life Sciences', allocated: 95000, disbursed: 61000, committed: 15000, status: 'Healthy' },
  { orgId: 'CMFS', name: 'College of Marine and Fisheries Sciences', allocated: 135000, disbursed: 88000, committed: 32000, status: 'Healthy' },
  { orgId: 'KAABAG', name: 'KAABAG', allocated: 80000, disbursed: 42000, committed: 18000, status: 'Healthy' },
  { orgId: 'TME', name: 'The Marine Echo', allocated: 125000, disbursed: 78000, committed: 35000, status: 'Healthy' },
  { orgId: 'SenSo', name: 'Senior Student Society', allocated: 75000, disbursed: 44000, committed: 12000, status: 'Healthy' }
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

  const found = financialAllocations.find(a => a.orgId === selectedOrgId.value) || financialAllocations[0];
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
    list = list.filter(a => a.orgId === selectedOrgId.value);
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
              <p class="text-[11px] opacity-80 mt-0.5">8 Accredited Councils</p>
            </div>

            <div class="mt-3 pt-2 border-t" :class="selectedOrgId === 'ALL' ? 'border-blue-800' : 'border-slate-100'">
              <div class="flex justify-between items-baseline text-xs">
                <span class="opacity-75 text-[10px]">Total Budget:</span>
                <strong class="font-extrabold text-sm">₱980,000</strong>
              </div>
            </div>
          </div>

          <!-- 8 Organization Specific Containers -->
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
                    class="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-2xs"
                    :class="ORG_COLORS[alloc.orgId as OrgId]?.avatarBg || 'bg-slate-900'"
                  >
                    <span :class="ORG_COLORS[alloc.orgId as OrgId]?.avatarText || 'text-white'">
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


    <!-- ==================== ACTIVITIES FINANCIAL INFORMATION LIST ==================== -->
    <div class="bg-white rounded-2xl border border-[#E0E7F1] shadow-xs overflow-hidden">
      <div class="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-900">
            Activity Financial Statements & Itemization
          </h3>
          <p class="text-xs text-slate-500">
            Detailed financial metrics, fund sources, variance, and line item breakdowns for <strong class="text-slate-800">{{ selectedOrgData.name }}</strong>
          </p>
        </div>
        <span class="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
          {{ selectedOrgActivities.length }} Activities
        </span>
      </div>

      <!-- Table / Cards List -->
      <div v-if="selectedOrgActivities.length > 0" class="divide-y divide-slate-200/80">
        <div 
          v-for="act in selectedOrgActivities" 
          :key="act.id"
          class="p-4 hover:bg-slate-50/60 transition-colors space-y-3"
        >
          <!-- Primary Activity Header Row -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex items-start gap-3">
              <div 
                class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                :class="ORG_COLORS[act.orgId]?.avatarBg || 'bg-slate-900 text-white'"
              >
                {{ act.orgId }}
              </div>

              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[11px] font-bold text-slate-500">{{ act.id }}</span>
                  <span 
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    :class="act.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                  >
                    {{ act.status }}
                  </span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {{ act.fiscalYear }}
                  </span>
                </div>

                <h4 
                  @click="emit('selectActivity', act)"
                  class="text-sm font-bold text-slate-900 hover:text-blue-700 cursor-pointer mt-0.5 leading-snug"
                >
                  {{ act.title }}
                </h4>

                <p class="text-xs text-slate-500 mt-0.5">
                  Venue: <strong class="text-slate-700">{{ act.venue }}</strong> • Implementation: <strong class="text-slate-700">{{ act.startDate }}</strong>
                </p>
              </div>
            </div>

            <!-- Financial Summary Badges & Action Buttons -->
            <div class="flex items-center gap-3 shrink-0 self-end md:self-auto">
              <div class="text-right">
                <span class="text-[10px] text-slate-400 uppercase font-semibold block">Approved Budget</span>
                <span class="text-base font-black text-slate-900">₱{{ (act.budget || 0).toLocaleString() }}</span>
              </div>

              <div class="flex items-center gap-2">
                <!-- Toggle Itemized Breakdown Button -->
                <button
                  @click="toggleActivityExpand(act.id)"
                  class="btn-secondary btn-sm"
                >
                  <span>{{ expandedActivityId === act.id ? 'Hide Details' : 'Financial Breakdown' }}</span>
                  <ChevronDown v-if="expandedActivityId !== act.id" class="w-3.5 h-3.5" />
                  <ChevronUp v-else class="w-3.5 h-3.5" />
                </button>

                <!-- Full Activity Modal Launcher -->
                <button
                  @click="emit('selectActivity', act)"
                  title="Open Activity Details"
                  class="btn-icon"
                >
                  <ExternalLink class="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            </div>
          </div>

          <!-- Budget Comparison Card: Estimated (DAD Form) vs. Actual (ACRPT Form) -->
          <div class="p-3.5 bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <Scale class="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>Budget Reconciliation:</span>
                    <span class="text-blue-900 font-extrabold">DAD Estimate</span>
                    <span class="text-slate-400 font-normal">vs.</span>
                    <span class="text-emerald-800 font-extrabold">ACRPT Actual</span>
                  </h4>
                  <p class="text-[10px] text-slate-500">
                    Estimated allocation from Detailed Activity Design vs. actual expenditure reported in Accomplishment Report
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0 flex-wrap">
                <span 
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                  :class="getBudgetVarianceClass(act)"
                >
                  {{ getBudgetVarianceLabel(act) }}
                </span>
                <span 
                  v-if="hasAcrptBudget(act)" 
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"
                >
                  ✓ ACRPT Submitted
                </span>
                <span 
                  v-else 
                  class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                >
                  ⏳ Pending ACRPT Filing
                </span>
              </div>
            </div>

            <!-- 3 Comparative Columns: DAD Estimate | ACRPT Actual | Variance -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <!-- 1. Estimated Budget (DAD Form) -->
              <div class="p-3 bg-white rounded-xl border border-blue-200/80 shadow-2xs">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Estimated Budget</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                    DAD Form
                  </span>
                </div>
                <div class="text-lg font-black text-blue-950 mt-1">
                  ₱{{ getDadBudget(act).toLocaleString() }}
                </div>
                <div class="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <FileText class="w-3 h-3 text-blue-700 shrink-0" />
                  <span class="truncate">{{ act.designForm?.controlNumber || 'Proposed in Activity Design' }}</span>
                </div>
              </div>

              <!-- 2. Actual Budget (ACRPT Form) -->
              <div class="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Actual Budget Spent</span>
                  <span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                    ACRPT Form
                  </span>
                </div>
                <div class="text-lg font-black text-emerald-900 mt-1">
                  <span v-if="hasAcrptBudget(act)">₱{{ getAcrptBudget(act).toLocaleString() }}</span>
                  <span v-else class="text-slate-400 text-xs italic font-semibold">Pending Filing</span>
                </div>
                <div class="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  <FileCheck2 class="w-3 h-3 text-emerald-700 shrink-0" />
                  <span class="truncate">
                    {{ hasAcrptBudget(act) ? 'Documented in Accomplishment Report' : 'Awaiting Post-Activity Report' }}
                  </span>
                </div>
              </div>

              <!-- 3. Financial Variance (DAD vs ACRPT) -->
              <div class="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Financial Variance</span>
                  <span class="text-[9px] font-bold text-slate-400">DAD − ACRPT</span>
                </div>
                <div 
                  class="text-lg font-black mt-1"
                  :class="getVarianceAmountColor(act)"
                >
                  {{ getVarianceAmountFormatted(act) }}
                </div>
                <div class="text-[10px] text-slate-500 mt-0.5 truncate">
                  {{ getVarianceDescription(act) }}
                </div>
              </div>
            </div>

            <!-- Spending Execution Progress Bar (if ACRPT budget recorded) -->
            <div v-if="hasAcrptBudget(act)" class="pt-1">
              <div class="flex items-center justify-between text-[10px] text-slate-600 mb-1">
                <span>Budget Utilization Ratio: <strong>{{ getSpendingPercentage(act) }}%</strong> of DAD estimate spent in ACRPT</span>
                <span class="font-bold" :class="getVarianceAmountColor(act)">
                  {{ getDadBudget(act) - getAcrptBudget(act) >= 0 ? 'Within Allocation' : 'Over Estimate' }}
                </span>
              </div>
              <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  :class="getProgressBarClass(act)"
                  :style="{ width: `${Math.min(100, getSpendingPercentage(act))}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Secondary Metadata Grid: Budget Source & Disbursed Spend -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span class="text-[10px] text-slate-400 font-semibold uppercase">Fund Source</span>
              <span class="font-bold text-slate-800 truncate">{{ act.fundSource || `${act.orgId}-SEC Fund` }}</span>
            </div>

            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span class="text-[10px] text-slate-400 font-semibold uppercase">Total Disbursed Release</span>
              <span class="font-bold text-blue-700">₱{{ (act.budget || 0).toLocaleString() }}</span>
            </div>
          </div>

          <!-- Expandable Itemized Financial Line Items Breakdown -->
          <div 
            v-if="expandedActivityId === act.id"
            class="mt-2 p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-3 animate-in fade-in duration-150"
          >
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <h5 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Receipt class="w-4 h-4 text-blue-900" />
                <span>Line Item Budget & Liquidation Breakdown</span>
              </h5>
              <span class="text-[11px] text-slate-500">
                Source: {{ act.fundSource || `${act.orgId}-SEC Fund` }}
              </span>
            </div>

            <!-- DAD vs. ACRPT Reconciliation Overview Banner -->
            <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Scale class="w-3.5 h-3.5 text-blue-900" />
                  <span>DAD vs. ACRPT Reconciliation Overview</span>
                </span>
                <span 
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  :class="getBudgetVarianceClass(act)"
                >
                  {{ getBudgetVarianceLabel(act) }}
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div class="p-2 bg-slate-50 rounded-lg">
                  <span class="text-[10px] text-slate-400 block uppercase font-semibold">DAD Estimate</span>
                  <strong class="text-blue-900 font-extrabold text-sm">₱{{ getDadBudget(act).toLocaleString() }}</strong>
                </div>
                <div class="p-2 bg-slate-50 rounded-lg">
                  <span class="text-[10px] text-slate-400 block uppercase font-semibold">ACRPT Actual</span>
                  <strong class="text-emerald-700 font-extrabold text-sm">
                    {{ hasAcrptBudget(act) ? `₱${getAcrptBudget(act).toLocaleString()}` : 'Pending ACRPT' }}
                  </strong>
                </div>
                <div class="p-2 bg-slate-50 rounded-lg">
                  <span class="text-[10px] text-slate-400 block uppercase font-semibold">Net Variance</span>
                  <strong class="font-extrabold text-sm" :class="getVarianceAmountColor(act)">
                    {{ getVarianceAmountFormatted(act) }}
                  </strong>
                </div>
                <div class="p-2 bg-slate-50 rounded-lg">
                  <span class="text-[10px] text-slate-400 block uppercase font-semibold">ACRPT Filing</span>
                  <span class="font-bold text-xs block mt-0.5" :class="hasAcrptBudget(act) ? 'text-emerald-700' : 'text-amber-700'">
                    {{ hasAcrptBudget(act) ? '✓ Submitted' : '⏳ Pending' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Line Items Table if designForm budgetary requirements exist -->
            <div v-if="act.designForm?.budgetaryRequirements?.length" class="overflow-x-auto border border-slate-200 rounded-xl bg-white text-xs">
              <table class="w-full text-left">
                <thead class="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th class="p-2.5">Item</th>
                    <th class="p-2.5">Particulars</th>
                    <th class="p-2.5">Budget Source</th>
                    <th class="p-2.5 text-right">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="(bReq, bIdx) in act.designForm.budgetaryRequirements" :key="bIdx">
                    <td class="p-2.5 font-bold text-slate-800">{{ bReq.item }}</td>
                    <td class="p-2.5 text-slate-600">{{ bReq.particulars }}</td>
                    <td class="p-2.5 text-slate-500">{{ bReq.budgetSource || act.fundSource }}</td>
                    <td class="p-2.5 text-right font-extrabold text-blue-900">₱{{ Number(bReq.amount).toLocaleString() }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Fallback Line Item Text -->
            <div v-else class="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <span class="font-bold block text-slate-900">Line Item Description:</span>
              <p class="leading-relaxed">{{ act.lineItemBudget || 'Design, materials, water, refreshments, and participant kits.' }}</p>
            </div>

            <div v-if="act.accomplishmentForm?.financialLiquidationSummary" class="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <span class="font-bold flex items-center gap-1 text-emerald-950">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                <span>Liquidation Summary:</span>
              </span>
              <p class="leading-relaxed">{{ act.accomplishmentForm.financialLiquidationSummary }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="p-12 text-center text-slate-400 space-y-2">
        <AlertCircle class="w-8 h-8 mx-auto text-slate-300" />
        <h4 class="text-sm font-bold text-slate-700">No Financial Records Found</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          No activities match your current search query or liquidation filter for {{ selectedOrgData.name }}.
        </p>
      </div>
    </div>
  </div>
</template>
