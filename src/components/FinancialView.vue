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
  Award
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
  const liquidatedCount = acts.filter(a => a.accomplishmentForm?.isCompleted).length;
  const liquidationRate = acts.length > 0 ? Math.round((liquidatedCount / acts.length) * 100) : 0;

  const totalDisbursed = selectedOrgData.value.disbursed;
  const totalAllocated = selectedOrgData.value.allocated;
  const utilizationRate = totalAllocated > 0 ? Math.round(((totalDisbursed + selectedOrgData.value.committed) / totalAllocated) * 100) : 0;
  const avgBudget = acts.length > 0 ? Math.round(totalApprovedBudget / acts.length) : 0;

  return {
    totalActivities: acts.length,
    totalApprovedBudget,
    liquidatedCount,
    liquidationRate,
    utilizationRate,
    avgBudget
  };
});

// SVG Pie/Donut Chart breakdown calculations for financial statistics
const pieChartData = computed(() => {
  const total = selectedOrgData.value.allocated || 1;
  const disbursed = Math.max(0, selectedOrgData.value.disbursed);
  const committed = Math.max(0, selectedOrgData.value.committed);
  const remaining = Math.max(0, selectedOrgData.value.remaining);

  const pctDisbursed = Math.round((disbursed / total) * 100);
  const pctCommitted = Math.round((committed / total) * 100);
  const pctRemaining = Math.max(0, 100 - pctDisbursed - pctCommitted);

  // Circumference for r = 40 is 2 * PI * 40 = 251.327
  const circumference = 251.327;
  const strokeDisbursed = (disbursed / total) * circumference;
  const strokeCommitted = (committed / total) * circumference;
  const strokeRemaining = (remaining / total) * circumference;

  const offsetDisbursed = 0;
  const offsetCommitted = -strokeDisbursed;
  const offsetRemaining = -(strokeDisbursed + strokeCommitted);

  return {
    disbursed: {
      amount: disbursed,
      percent: pctDisbursed,
      dasharray: `${strokeDisbursed} ${circumference}`,
      dashoffset: offsetDisbursed
    },
    committed: {
      amount: committed,
      percent: pctCommitted,
      dasharray: `${strokeCommitted} ${circumference}`,
      dashoffset: offsetCommitted
    },
    remaining: {
      amount: remaining,
      percent: pctRemaining,
      dasharray: `${strokeRemaining} ${circumference}`,
      dashoffset: offsetRemaining
    },
    circumference
  };
});

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
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
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
            Select a student organization below to view activity budgets, expenses, liquidation status, and financial reports.
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


    <!-- ==================== SELECTED ORGANIZATION STATISTICS DASHBOARD WITH PIE CHART ==================== -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <PieChart class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Sub-Account Analytics
              </span>
              <span class="text-xs font-bold text-slate-500">{{ selectedOrgData.orgId }}</span>
            </div>
            <h3 class="text-base font-extrabold text-slate-900 leading-tight mt-0.5">
              {{ selectedOrgData.name }} • Financial Statistics
            </h3>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-semibold text-slate-500">
            Total Activities: <strong class="text-slate-900 font-bold">{{ selectedOrgStats.totalActivities }}</strong>
          </span>
        </div>
      </div>

      <!-- Pie Chart & Financial Breakdown Container -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <!-- Left: Crisp SVG Pie / Donut Chart with Center Summary -->
        <div class="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-2xl border border-slate-200/90">
          <div class="relative w-56 h-56 flex items-center justify-center">
            <!-- SVG Pie / Donut -->
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <!-- Background Ring -->
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#e2e8f0"
                stroke-width="15"
                fill="transparent"
              />
              <!-- Disbursed Slice (Blue) -->
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#2563eb"
                stroke-width="15"
                fill="transparent"
                :stroke-dasharray="pieChartData.disbursed.dasharray"
                :stroke-dashoffset="pieChartData.disbursed.dashoffset"
                stroke-linecap="round"
                class="transition-all duration-700 ease-out"
              />
              <!-- Committed Slice (Amber) -->
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#f59e0b"
                stroke-width="15"
                fill="transparent"
                :stroke-dasharray="pieChartData.committed.dasharray"
                :stroke-dashoffset="pieChartData.committed.dashoffset"
                stroke-linecap="round"
                class="transition-all duration-700 ease-out"
              />
              <!-- Remaining Slice (Emerald) -->
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#10b981"
                stroke-width="15"
                fill="transparent"
                :stroke-dasharray="pieChartData.remaining.dasharray"
                :stroke-dashoffset="pieChartData.remaining.dashoffset"
                stroke-linecap="round"
                class="transition-all duration-700 ease-out"
              />
            </svg>

            <!-- Center Display -->
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Allocated Treasury</span>
              <span class="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                ₱{{ selectedOrgData.allocated.toLocaleString() }}
              </span>
              <span class="text-[10px] font-semibold text-slate-500">FY 2026 Budget</span>
            </div>
          </div>

          <!-- Bottom Legend for Slices -->
          <div class="mt-4 flex items-center justify-center gap-3 flex-wrap text-xs">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
              <span class="font-bold text-slate-700">Disbursed ({{ pieChartData.disbursed.percent }}%)</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
              <span class="font-bold text-slate-700">Committed ({{ pieChartData.committed.percent }}%)</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
              <span class="font-bold text-slate-700">Reserve ({{ pieChartData.remaining.percent }}%)</span>
            </div>
          </div>
        </div>

        <!-- Right: Detailed Financial Statistics Cards -->
        <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <!-- Disbursed Advances -->
          <div class="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Disbursed Advances</span>
              <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-200/70 text-blue-900">
                {{ pieChartData.disbursed.percent }}%
              </span>
            </div>
            <div class="text-base sm:text-lg font-black text-blue-900 mt-1.5">
              ₱{{ selectedOrgData.disbursed.toLocaleString() }}
            </div>
            <p class="text-[10px] text-blue-600 mt-0.5">Released Funds</p>
          </div>

          <!-- Committed Funds -->
          <div class="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Committed Proposals</span>
              <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900">
                {{ pieChartData.committed.percent }}%
              </span>
            </div>
            <div class="text-base sm:text-lg font-black text-amber-900 mt-1.5">
              ₱{{ selectedOrgData.committed.toLocaleString() }}
            </div>
            <p class="text-[10px] text-amber-700 mt-0.5">Approved Plans</p>
          </div>

          <!-- Remaining Reserve -->
          <div class="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Remaining Reserve</span>
              <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900">
                {{ pieChartData.remaining.percent }}%
              </span>
            </div>
            <div class="text-base sm:text-lg font-black text-emerald-900 mt-1.5">
              ₱{{ selectedOrgData.remaining.toLocaleString() }}
            </div>
            <p class="text-[10px] text-emerald-700 mt-0.5">Available Balance</p>
          </div>

          <!-- Budget Utilization -->
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/90 sm:col-span-2 lg:col-span-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Budget Execution Efficiency</span>
              <span class="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {{ selectedOrgStats.utilizationRate }}% Utilized
              </span>
            </div>
            <div class="w-full bg-slate-200 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                class="bg-blue-600 h-full rounded-full transition-all duration-500"
                :style="{ width: `${Math.min(100, selectedOrgStats.utilizationRate)}%` }"
              ></div>
            </div>
            <p class="text-[10px] text-slate-500 mt-1.5">Combined released and committed allocation ratio</p>
          </div>

          <!-- Liquidation Rate -->
          <div class="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80">
            <span class="text-[10px] font-bold text-purple-800 uppercase block tracking-wider">Liquidation Rate</span>
            <div class="text-base sm:text-lg font-black text-purple-900 mt-1.5">
              {{ selectedOrgStats.liquidationRate }}%
            </div>
            <p class="text-[10px] text-purple-700 mt-0.5">{{ selectedOrgStats.liquidatedCount }} of {{ selectedOrgStats.totalActivities }} Filed</p>
          </div>
        </div>
      </div>
    </div>


    <!-- ==================== ACTIVITIES FINANCIAL INFORMATION LIST ==================== -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
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

          <!-- Secondary Financial Information Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span class="text-[10px] text-slate-400 font-semibold block uppercase">Budget Source</span>
              <span class="font-bold text-slate-800 truncate block">{{ act.fundSource || `${act.orgId}-SEC Fund` }}</span>
            </div>

            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span class="text-[10px] text-slate-400 font-semibold block uppercase">Disbursed Spend</span>
              <span class="font-bold text-blue-700 block">₱{{ (act.budget || 0).toLocaleString() }}</span>
            </div>

            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span class="text-[10px] text-slate-400 font-semibold block uppercase">Financial Variance</span>
              <span class="font-bold text-emerald-700 block">₱0.00 (Balanced)</span>
            </div>

            <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span class="text-[10px] text-slate-400 font-semibold block uppercase">Liquidation Status</span>
              <span 
                class="font-extrabold text-[11px] block"
                :class="act.accomplishmentForm?.isCompleted ? 'text-emerald-700' : 'text-amber-700'"
              >
                {{ act.accomplishmentForm?.isCompleted ? '✓ Fully Liquidated' : '⏳ Pending Liquidation' }}
              </span>
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
