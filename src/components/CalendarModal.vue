<script setup lang="ts">
import { ref, computed } from 'vue';
import { Activity } from '../types';
import { getOrgTheme } from '../data/initialData';
import { 
  X, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  ListFilter,
  LayoutGrid,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  activities: Activity[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'downloadCalendar'): void;
}>();

const currentDate = ref<Date>(new Date(2026, 8, 19));
const viewMode = ref<'month' | 'agenda'>('month');
const selectedDateStr = ref<string>('2026-09-19');

const handlePrev = () => {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() - 1);
  currentDate.value = d;
};

const handleNext = () => {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() + 1);
  currentDate.value = d;
};

const currentMonthName = computed(() => {
  return currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' });
});

const currentMonthPrefix = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = String(currentDate.value.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
});

const daysGrid = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
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
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(i).padStart(2, '0');
    days.push({
      dayNumber: i,
      isCurrentMonth: true,
      dateString: `${year}-${monthStr}-${dayStr}`
    });
  }

  const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length);
  for (let i = 1; i <= remaining; i++) {
    const nextMonth = month + 2 > 12 ? 1 : month + 2;
    const nextYear = month + 2 > 12 ? year + 1 : year;
    days.push({
      dayNumber: i,
      isCurrentMonth: false,
      dateString: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }
  return days;
});

const getActs = (dateStr: string) => {
  return props.activities.filter((act) => act.startDate <= dateStr && act.endDate >= dateStr);
};

// All activities in current month for Agenda view
const currentMonthActivities = computed(() => {
  return props.activities
    .filter(a => a.startDate.startsWith(currentMonthPrefix.value) || a.endDate.startsWith(currentMonthPrefix.value))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
});

const selectedDateActivities = computed(() => {
  if (!selectedDateStr.value) return [];
  return getActs(selectedDateStr.value);
});

const onActivityClick = (act: Activity) => {
  emit('close');
  emit('selectActivity', act);
};

const handleSelectDay = (dateString: string) => {
  selectedDateStr.value = dateString;
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
  >
    <div class="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-2 sm:my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-2 shrink-0">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <CalendarIcon class="w-5 h-5 text-blue-600" />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm sm:text-lg font-bold text-slate-900 truncate">
              Activity Schedule: {{ currentMonthName }}
            </h3>
            <p class="text-[11px] sm:text-xs text-slate-500 truncate">
              Action Plan calendar tracking MSUN student council events
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            @click="emit('downloadCalendar')"
            class="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download .ics calendar"
          >
            <Download class="w-3.5 h-3.5 text-blue-600" />
            <span class="hidden sm:inline">Download (.ics)</span>
          </button>
          <button
            @click="emit('close')"
            class="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Toolbar & Controls -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2.5 shrink-0">
        <!-- Month Navigator -->
        <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            @click="handlePrev"
            class="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <div class="px-2 py-0.5 text-center">
            <span class="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
              {{ currentMonthName }}
            </span>
          </div>
          <button
            @click="handleNext"
            class="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
            title="Next month"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <!-- Mode Toggle (Grid vs Agenda) & Status Indicators -->
        <div class="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <!-- View Switcher -->
          <div class="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              @click="viewMode = 'month'"
              class="px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              :class="viewMode === 'month' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            >
              <LayoutGrid class="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              @click="viewMode = 'agenda'"
              class="px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              :class="viewMode === 'agenda' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            >
              <ListFilter class="w-3.5 h-3.5" />
              <span>List ({{ currentMonthActivities.length }})</span>
            </button>
          </div>

          <!-- Status Legend -->
          <div class="hidden md:flex items-center gap-3 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span class="font-medium text-slate-700">Approved</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span class="font-medium text-slate-700">Pending</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL CONTENT: Scrollable -->
      <div class="flex-1 overflow-y-auto space-y-4 pr-1">
        
        <!-- ==================== VIEW 1: MONTH GRID ==================== -->
        <div v-if="viewMode === 'month'" class="space-y-4">
          <!-- Days of Week Header -->
          <div class="grid grid-cols-7 gap-1 text-center font-bold text-[11px] sm:text-xs text-slate-500">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <!-- Calendar Grid Cells -->
          <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
            <div
              v-for="(day, idx) in daysGrid"
              :key="idx"
              @click="handleSelectDay(day.dateString)"
              class="min-h-[58px] sm:min-h-[76px] p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative"
              :class="[
                selectedDateStr === day.dateString ? 'ring-2 ring-blue-600 border-blue-500 bg-blue-50/50' : '',
                day.isCurrentMonth
                  ? (day.dateString === '2026-09-19' && selectedDateStr !== day.dateString
                    ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200'
                    : 'bg-white border-slate-200 hover:border-blue-300')
                  : 'bg-slate-50/50 border-slate-100 text-slate-400'
              ]"
            >
              <!-- Cell Top: Day Number & Count -->
              <div class="flex items-center justify-between text-[11px]">
                <span
                  class="font-bold text-xs"
                  :class="day.dateString === '2026-09-19' ? 'text-blue-600' : 'text-slate-800'"
                >
                  {{ day.dayNumber }}
                </span>
                <span 
                  v-if="getActs(day.dateString).length > 0" 
                  class="text-[9px] font-extrabold px-1 rounded-full bg-blue-100 text-blue-700 shrink-0"
                >
                  {{ getActs(day.dateString).length }}
                </span>
              </div>

              <!-- Compact Dots on Mobile Screens -->
              <div class="sm:hidden flex items-center justify-center gap-0.5 mt-1 overflow-hidden">
                <span
                  v-for="act in getActs(day.dateString).slice(0, 3)"
                  :key="act.id"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="act.status === 'Approved' ? 'bg-blue-600' : 'bg-amber-500'"
                ></span>
              </div>

              <!-- Desktop Activity Badges -->
              <div class="hidden sm:block space-y-1 overflow-hidden mt-1">
                <div
                  v-for="act in getActs(day.dateString).slice(0, 2)"
                  :key="act.id"
                  @click.stop="onActivityClick(act)"
                  class="text-[9px] px-1.5 py-0.5 rounded truncate font-bold cursor-pointer border flex items-center gap-1 shadow-2xs hover:scale-[1.02] transition-transform"
                  :class="[
                    getOrgTheme(act.orgId).badgeBg,
                    getOrgTheme(act.orgId).badgeText,
                    getOrgTheme(act.orgId).badgeBorder
                  ]"
                  :title="`${act.orgId}: ${act.title} (${act.status})`"
                >
                  <span class="font-black shrink-0">[{{ act.orgId }}]</span>
                  <span class="truncate">{{ act.title }}</span>
                </div>
                <div v-if="getActs(day.dateString).length > 2" class="text-[9px] text-slate-400 font-medium">
                  +{{ getActs(day.dateString).length - 2 }} more
                </div>
              </div>
            </div>
          </div>

          <!-- Selected Day Schedule Detail (Solves mobile tightness) -->
          <div class="mt-3 pt-3 border-t border-slate-100">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5 text-blue-600" />
                <span>Activities for {{ selectedDateStr }} ({{ selectedDateActivities.length }})</span>
              </h4>
              <span class="text-[11px] text-slate-400">Tap an activity to view details</span>
            </div>

            <div v-if="selectedDateActivities.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="act in selectedDateActivities"
                :key="act.id"
                @click="onActivityClick(act)"
                class="p-2.5 rounded-xl border bg-slate-50/80 hover:bg-white hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 mb-1">
                    <span 
                      class="text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider"
                      :class="[
                        getOrgTheme(act.orgId).badgeBg,
                        getOrgTheme(act.orgId).badgeText,
                        getOrgTheme(act.orgId).badgeBorder
                      ]"
                    >
                      {{ act.orgId }}
                    </span>
                    <span 
                      class="text-[9px] font-bold px-1.5 py-0.2 rounded-full"
                      :class="act.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                    >
                      {{ act.status }}
                    </span>
                  </div>
                  <h5 class="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {{ act.title }}
                  </h5>
                  <p class="text-[10px] text-slate-500 mt-0.5 truncate">
                    ₱{{ (act.budget || 0).toLocaleString() }} • {{ act.venue || 'Campus Venue' }}
                  </p>
                </div>
                <ExternalLink class="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </div>
            </div>

            <div v-else class="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
              No events scheduled for this date. Click on days with event badges to view schedules.
            </div>
          </div>
        </div>

        <!-- ==================== VIEW 2: AGENDA / SCHEDULE LIST ==================== -->
        <div v-else class="space-y-2">
          <div v-if="currentMonthActivities.length > 0" class="space-y-2">
            <div
              v-for="act in currentMonthActivities"
              :key="act.id"
              @click="onActivityClick(act)"
              class="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group"
            >
              <div class="flex items-start gap-3 min-w-0">
                <div class="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-center shrink-0">
                  <span class="block text-[10px] font-bold uppercase text-blue-600">{{ act.startDate.slice(5, 7) }}</span>
                  <span class="block text-base font-extrabold text-blue-900 leading-none">{{ act.startDate.slice(8, 10) }}</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span 
                      class="text-[10px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider"
                      :class="[
                        getOrgTheme(act.orgId).badgeBg,
                        getOrgTheme(act.orgId).badgeText,
                        getOrgTheme(act.orgId).badgeBorder
                      ]"
                    >
                      {{ act.orgId }}
                    </span>
                    <span 
                      class="text-[10px] font-bold px-1.5 py-0.2 rounded-full"
                      :class="act.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'"
                    >
                      {{ act.status }}
                    </span>
                    <span class="text-[10px] text-slate-400">
                      {{ act.startDate === act.endDate ? act.startDate : `${act.startDate} to ${act.endDate}` }}
                    </span>
                  </div>
                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                    {{ act.title }}
                  </h4>
                  <p class="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {{ act.description || 'Institutional activity under MSUN student organization Action Plan.' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                <span class="text-xs font-bold text-slate-800">
                  ₱{{ (act.budget || 0).toLocaleString() }}
                </span>
                <span class="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Details</span>
                  <ChevronRight class="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          <div v-else class="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            No events scheduled for {{ currentMonthName }}. Use the arrows to browse other months.
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <span class="hidden sm:inline">Tap any event to view proposal details</span>
        <button
          @click="emit('close')"
          class="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
        >
          Close Calendar
        </button>
      </div>

    </div>
  </div>
</template>
