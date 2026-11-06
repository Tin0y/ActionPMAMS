<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Activity, UserAccount } from '../types';
import { getOrgTheme, ORGANIZATIONS } from '../data/initialData';
import { 
  X, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ListFilter, 
  LayoutGrid, 
  CalendarDays,
  CheckCircle2, 
  Clock, 
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
  Building2,
  Filter,
  Check,
  Search,
  Sparkles,
  ShieldCheck,
  RotateCcw
} from 'lucide-vue-next';
import { 
  getActivityConflictSummary, 
  checkVenueAvailability,
  areVenuesMatching,
  ConflictItem, 
  ActivityConflictSummary,
  VenueAvailabilityCheckResult
} from '../utils/conflictDetection';
import { getOptionLabelsByCategory } from '../services/optionsService';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    activities: Activity[];
    currentUser?: UserAccount | null;
  }>(),
  {
    currentUser: null
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'downloadCalendar'): void;
}>();

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const todayDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const currentDate = ref<Date>(new Date());
const viewMode = ref<'month' | 'week' | 'schedule'>('month');
const selectedDateStr = ref<string>(todayDateStr);

// Dynamic Venues list from database-driven Options Management
const dynamicVenues = getOptionLabelsByCategory('venue');
const allVenuesList = computed(() => {
  const extracted = Array.from(new Set(props.activities.map(a => a.venue).filter(Boolean)));
  return Array.from(new Set(['MSUN Gymnasium', 'CBIT Amphitheater', 'Audio Visual Room (AVR)', 'University Function Hall', ...dynamicVenues.value, ...extracted]));
});

// Conflict Map for all activities
const activityConflictMap = computed(() => {
  const map = new Map<string, ActivityConflictSummary>();
  for (const act of props.activities) {
    map.set(act.id, getActivityConflictSummary(act, props.activities));
  }
  return map;
});

const getConflictSummary = (actId: string): ActivityConflictSummary | undefined => {
  return activityConflictMap.value.get(actId);
};

// Selected Conflict for Details Modal
const selectedConflictItem = ref<ConflictItem | null>(null);
const isConflictModalOpen = ref(false);

const handleOpenConflictDetails = (conflict: ConflictItem, e?: Event) => {
  if (e) e.stopPropagation();
  selectedConflictItem.value = conflict;
  isConflictModalOpen.value = true;
};

// ==================== VENUE AVAILABILITY FILTER (Section 5) ====================
const isVenueFilterOpen = ref(false);
const filterVenue = ref<string>('MSUN Gymnasium');
const filterDate = ref<string>(todayDateStr);
const filterTimeRange = ref<string>('');
const isCheckingAvailability = ref(false);

const venueAvailabilityResult = computed<VenueAvailabilityCheckResult>(() => {
  return checkVenueAvailability(
    filterVenue.value,
    filterDate.value,
    props.activities,
    filterTimeRange.value
  );
});

// Navigation handlers
const handleToday = () => {
  const current = new Date();
  currentDate.value = current;
  selectedDateStr.value = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
  filterDate.value = selectedDateStr.value;
};

const handlePrev = () => {
  const d = new Date(currentDate.value);
  if (viewMode.value === 'week') {
    d.setDate(d.getDate() - 7);
  } else {
    d.setMonth(d.getMonth() - 1);
  }
  currentDate.value = d;
};

const handleNext = () => {
  const d = new Date(currentDate.value);
  if (viewMode.value === 'week') {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
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

// Month Grid Days computation
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

// Week View Days computation
const weekDaysGrid = computed(() => {
  const curr = new Date(currentDate.value);
  const dayOfWeek = curr.getDay(); // 0 is Sunday
  const startOfWeek = new Date(curr);
  startOfWeek.setDate(curr.getDate() - dayOfWeek);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const dayN = pad(d.getDate());
    const dateStr = `${y}-${m}-${dayN}`;
    days.push({
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      dayNumber: d.getDate(),
      dateString: dateStr,
      isToday: dateStr === todayDateStr
    });
  }
  return days;
});

const getActs = (dateStr: string) => {
  return props.activities.filter((act) => {
    const start = act.startDate || act.designForm?.dateImplementation || '';
    const end = act.endDate || start;
    return start <= dateStr && end >= dateStr;
  });
};

// All activities in current month for Schedule / List view
const currentMonthActivities = computed(() => {
  return props.activities
    .filter(a => {
      const start = a.startDate || a.designForm?.dateImplementation || '';
      const end = a.endDate || start;
      return start.startsWith(currentMonthPrefix.value) || end.startsWith(currentMonthPrefix.value);
    })
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
});

// Upcoming Events for Schedule view
const upcomingActivities = computed(() => {
  return props.activities
    .filter(a => (a.startDate || '') >= todayDateStr || (a.endDate || '') >= todayDateStr)
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
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
  filterDate.value = dateString;
};

// Total unresolved conflicts count across current view
const totalConflictsCount = computed(() => {
  let count = 0;
  activityConflictMap.value.forEach(sum => {
    if (sum.hasConfirmedConflict || sum.hasPotentialConflict || sum.hasSimilarActivity) {
      count++;
    }
  });
  return count;
});
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
  >
    <div class="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-2 sm:my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-2 shrink-0">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <CalendarIcon class="w-5 h-5 text-blue-600" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-lg font-bold text-slate-900 truncate">
                Centralized Calendar: {{ currentMonthName }}
              </h3>
              <!-- Unresolved Conflicts Indicator Pill -->
              <span
                v-if="totalConflictsCount > 0"
                class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200"
                title="Scheduling, venue, or activity redundancy issues detected"
              >
                <AlertTriangle class="w-3 h-3 text-amber-600" />
                <span>{{ totalConflictsCount }} Conflict / Notice(s)</span>
              </span>
            </div>
            <p class="text-[11px] sm:text-xs text-slate-500 truncate">
              Smart scheduling matrix, venue availability validation, and multi-council event coordination
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <!-- Venue Availability Filter Toggle Button (Section 5) -->
          <button
            @click="isVenueFilterOpen = !isVenueFilterOpen"
            class="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border"
            :class="isVenueFilterOpen 
              ? 'bg-blue-900 text-white border-blue-900 shadow-sm' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'"
            title="Check venue availability and reservations"
          >
            <Building2 class="w-3.5 h-3.5" :class="isVenueFilterOpen ? 'text-white' : 'text-blue-600'" />
            <span class="hidden sm:inline">Venue Availability</span>
          </button>

          <!-- Download .ics button -->
          <button
            @click="emit('downloadCalendar')"
            class="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download .ics calendar"
          >
            <Download class="w-3.5 h-3.5 text-blue-600" />
            <span class="hidden md:inline">Download (.ics)</span>
          </button>

          <!-- Close button -->
          <button
            @click="emit('close')"
            class="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- ==================== VENUE AVAILABILITY FILTER PANEL (Section 5) ==================== -->
      <div 
        v-if="isVenueFilterOpen"
        class="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 sm:p-4 my-2 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-blue-200/80">
          <div class="flex items-center gap-2">
            <Building2 class="w-4 h-4 text-blue-800" />
            <h4 class="text-xs sm:text-sm font-black text-blue-950">
              Venue Availability & Scheduling Checker
            </h4>
          </div>
          
          <!-- Overall Status Badge -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-600">Status for Selected Slot:</span>
            <span 
              class="px-2.5 py-0.5 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-2xs"
              :class="{
                'bg-emerald-100 text-emerald-800 border-emerald-300': venueAvailabilityResult.overallStatus === 'Available',
                'bg-amber-100 text-amber-800 border-amber-300': venueAvailabilityResult.overallStatus === 'Tentatively Reserved',
                'bg-red-100 text-red-800 border-red-300': venueAvailabilityResult.overallStatus === 'Confirmed Reservation',
                'bg-slate-200 text-slate-800 border-slate-300': venueAvailabilityResult.overallStatus === 'Unavailable'
              }"
            >
              <CheckCircle2 v-if="venueAvailabilityResult.overallStatus === 'Available'" class="w-3.5 h-3.5 text-emerald-700" />
              <AlertTriangle v-else-if="venueAvailabilityResult.overallStatus === 'Tentatively Reserved'" class="w-3.5 h-3.5 text-amber-700" />
              <AlertCircle v-else class="w-3.5 h-3.5 text-red-700" />
              <span>{{ venueAvailabilityResult.overallStatus }}</span>
            </span>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 text-xs">
          <!-- Venue Dropdown -->
          <div>
            <label class="block font-bold text-slate-700 mb-1">Select Campus Venue</label>
            <select
              v-model="filterVenue"
              class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option v-for="ven in allVenuesList" :key="ven" :value="ven">{{ ven }}</option>
            </select>
          </div>

          <!-- Date Picker -->
          <div>
            <label class="block font-bold text-slate-700 mb-1">Implementation Date</label>
            <input
              type="date"
              v-model="filterDate"
              class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <!-- Optional Time Range -->
          <div>
            <label class="block font-bold text-slate-700 mb-1">Time Range (e.g. 1:00 PM - 4:00 PM)</label>
            <input
              type="text"
              v-model="filterTimeRange"
              placeholder="Leave blank for full day or specify"
              class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <!-- Reservations Breakdown Table (Section 5 Example) -->
        <div class="mt-3 pt-2.5 border-t border-blue-200/80">
          <div class="flex items-center justify-between mb-1.5 text-[11px] font-bold text-slate-700">
            <span>Reservations & Schedule Breakdown on {{ filterDate }}:</span>
            <span class="text-slate-500 font-normal">{{ venueAvailabilityResult.slots.length }} event(s) recorded</span>
          </div>

          <div v-if="venueAvailabilityResult.slots.length > 0" class="overflow-x-auto border border-blue-200 rounded-xl bg-white shadow-2xs">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-50 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th class="p-2">Time Schedule</th>
                  <th class="p-2">Organization</th>
                  <th class="p-2">Activity Proposal</th>
                  <th class="p-2">Reservation Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr 
                  v-for="(slot, sIdx) in venueAvailabilityResult.slots" 
                  :key="sIdx"
                  class="hover:bg-slate-50/80"
                >
                  <td class="p-2 font-bold text-slate-900">{{ slot.timeRange }}</td>
                  <td class="p-2">
                    <span 
                      class="px-1.5 py-0.5 rounded text-[10px] font-black border uppercase"
                      :class="[
                        getOrgTheme(slot.organization).badgeBg,
                        getOrgTheme(slot.organization).badgeText,
                        getOrgTheme(slot.organization).badgeBorder
                      ]"
                    >
                      {{ slot.organization }}
                    </span>
                  </td>
                  <td class="p-2 text-slate-700 max-w-[220px] truncate" :title="slot.activityTitle">
                    {{ slot.activityTitle }}
                  </td>
                  <td class="p-2">
                    <span 
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      :class="{
                        'bg-emerald-100 text-emerald-800': slot.status === 'Confirmed Reservation',
                        'bg-amber-100 text-amber-800': slot.status === 'Tentatively Reserved',
                        'bg-slate-100 text-slate-800': slot.status === 'Available'
                      }"
                    >
                      {{ slot.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="p-2.5 rounded-xl bg-white border border-blue-100 text-center text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1.5">
            <CheckCircle2 class="w-4 h-4 text-emerald-600" />
            <span>Venue is completely Available on this date. No tentative or confirmed reservations established.</span>
          </div>
        </div>
      </div>

      <!-- Toolbar & Controls -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 sm:py-3 gap-2.5 shrink-0">
        <!-- Month / Week Navigator -->
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              @click="handlePrev"
              class="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <div class="px-2 py-0.5 text-center min-w-[120px]">
              <span class="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                {{ viewMode === 'week' ? `Week of ${weekDaysGrid[0]?.dateString}` : currentMonthName }}
              </span>
            </div>
            <button
              @click="handleNext"
              class="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>

          <button
            @click="handleToday"
            class="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-white border border-slate-200 rounded-xl transition-all cursor-pointer"
            title="Jump to today"
          >
            Today
          </button>
        </div>

        <!-- Mode Toggle: Month | Week | Schedule (Preserves and fulfills Section 1) -->
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
              @click="viewMode = 'week'"
              class="px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              :class="viewMode === 'week' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            >
              <CalendarDays class="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
            <button
              @click="viewMode = 'schedule'"
              class="px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              :class="viewMode === 'schedule' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'"
            >
              <ListFilter class="w-3.5 h-3.5" />
              <span>Schedule ({{ currentMonthActivities.length }})</span>
            </button>
          </div>

          <!-- Conflict Status Legend (Section 6) -->
          <div class="hidden lg:flex items-center gap-2.5 text-[11px] bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            <div class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-red-600"></span>
              <span class="font-medium text-slate-700">Confirmed Conflict</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span class="font-medium text-slate-700">Potential Overlap</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              <span class="font-medium text-slate-700">Similar Activity</span>
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
              class="min-h-[62px] sm:min-h-[82px] p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative"
              :class="[
                selectedDateStr === day.dateString ? 'ring-2 ring-blue-600 border-blue-500 bg-blue-50/50' : '',
                day.isCurrentMonth
                  ? (day.dateString === todayDateStr && selectedDateStr !== day.dateString
                    ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200'
                    : 'bg-white border-slate-200 hover:border-blue-300')
                  : 'bg-slate-50/50 border-slate-100 text-slate-400'
              ]"
            >
              <!-- Cell Top: Day Number & Count -->
              <div class="flex items-center justify-between text-[11px]">
                <span
                  class="font-bold text-xs"
                  :class="day.dateString === todayDateStr ? 'text-blue-600' : 'text-slate-800'"
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

              <!-- Compact Dots on Mobile Screens with Conflict Colors -->
              <div class="sm:hidden flex items-center justify-center gap-0.5 mt-1 overflow-hidden">
                <span
                  v-for="act in getActs(day.dateString).slice(0, 3)"
                  :key="act.id"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="[
                    getConflictSummary(act.id)?.hasConfirmedConflict ? 'bg-red-600 ring-1 ring-red-400' :
                    getConflictSummary(act.id)?.hasPotentialConflict ? 'bg-amber-500' :
                    getConflictSummary(act.id)?.hasSimilarActivity ? 'bg-blue-500' :
                    act.status === 'Approved' ? 'bg-blue-600' : 'bg-slate-400'
                  ]"
                ></span>
              </div>

              <!-- Desktop Activity Badges with Conflict Indicators (Section 6) -->
              <div class="hidden sm:block space-y-1 overflow-hidden mt-1">
                <div
                  v-for="act in getActs(day.dateString).slice(0, 2)"
                  :key="act.id"
                  @click.stop="onActivityClick(act)"
                  class="text-[9px] px-1.5 py-0.5 rounded truncate font-bold cursor-pointer border flex items-center justify-between gap-1 shadow-2xs hover:scale-[1.02] transition-transform"
                  :class="[
                    getOrgTheme(act.orgId).badgeBg,
                    getOrgTheme(act.orgId).badgeText,
                    getOrgTheme(act.orgId).badgeBorder
                  ]"
                  :title="`${act.orgId}: ${act.title} (${act.status})`"
                >
                  <div class="flex items-center gap-1 min-w-0 truncate">
                    <span class="font-black shrink-0">[{{ act.orgId }}]</span>
                    <span class="truncate">{{ act.title }}</span>
                  </div>

                  <!-- Conflict Indicator Badges (Section 6) -->
                  <div class="flex items-center gap-0.5 shrink-0" v-if="getConflictSummary(act.id)?.primaryConflict">
                    <!-- Confirmed Conflict (Red) -->
                    <button
                      v-if="getConflictSummary(act.id)?.hasConfirmedConflict"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="p-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                      title="Confirmed DAD Venue Conflict! Click for details"
                    >
                      <AlertCircle class="w-2.5 h-2.5" />
                    </button>
                    <!-- Potential Conflict (Yellow) -->
                    <button
                      v-else-if="getConflictSummary(act.id)?.hasPotentialConflict"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="p-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      title="Potential Schedule / Venue Conflict. Click for details"
                    >
                      <AlertTriangle class="w-2.5 h-2.5" />
                    </button>
                    <!-- Similar Activity (Blue) -->
                    <button
                      v-else-if="getConflictSummary(act.id)?.hasSimilarActivity"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="p-0.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      title="Similar Activity from another council. Click for details"
                    >
                      <Info class="w-2.5 h-2.5" />
                    </button>
                  </div>
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
                class="p-2.5 rounded-xl border bg-slate-50/80 hover:bg-white hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs group relative"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 mb-1 flex-wrap">
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

                    <!-- Conflict Badge on Selected Day Card -->
                    <span 
                      v-if="getConflictSummary(act.id)?.hasConfirmedConflict"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 cursor-pointer"
                    >
                      <AlertCircle class="w-3 h-3 text-red-600" />
                      <span>Confirmed Conflict</span>
                    </span>
                    <span 
                      v-else-if="getConflictSummary(act.id)?.hasPotentialConflict"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle class="w-3 h-3 text-amber-600" />
                      <span>Potential Overlap</span>
                    </span>
                    <span 
                      v-else-if="getConflictSummary(act.id)?.hasSimilarActivity"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Info class="w-3 h-3 text-blue-600" />
                      <span>Similar Activity</span>
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

        <!-- ==================== VIEW 2: WEEK VIEW (Section 1 Requirement) ==================== -->
        <div v-else-if="viewMode === 'week'" class="space-y-3">
          <div class="grid grid-cols-7 gap-1.5">
            <div
              v-for="wDay in weekDaysGrid"
              :key="wDay.dateString"
              @click="handleSelectDay(wDay.dateString)"
              class="border rounded-2xl p-2 min-h-[220px] flex flex-col justify-between transition-all cursor-pointer"
              :class="[
                selectedDateStr === wDay.dateString ? 'ring-2 ring-blue-600 border-blue-500 bg-blue-50/40' : 'bg-white border-slate-200',
                wDay.isToday ? 'border-blue-400 bg-blue-50/20' : ''
              ]"
            >
              <!-- Day Header -->
              <div class="text-center pb-2 border-b border-slate-100">
                <span class="block text-[11px] font-bold uppercase text-slate-500">{{ wDay.dayName }}</span>
                <span 
                  class="inline-block text-sm font-extrabold px-1.5 rounded-full"
                  :class="wDay.isToday ? 'bg-blue-600 text-white' : 'text-slate-900'"
                >
                  {{ wDay.dayNumber }}
                </span>
              </div>

              <!-- Day Activities in Week View -->
              <div class="flex-1 py-1.5 space-y-1.5 overflow-y-auto max-h-[260px]">
                <div
                  v-for="act in getActs(wDay.dateString)"
                  :key="act.id"
                  @click.stop="onActivityClick(act)"
                  class="p-1.5 rounded-lg border text-[10px] font-semibold cursor-pointer shadow-2xs hover:scale-[1.02] transition-transform space-y-1"
                  :class="[
                    getOrgTheme(act.orgId).badgeBg,
                    getOrgTheme(act.orgId).badgeText,
                    getOrgTheme(act.orgId).badgeBorder
                  ]"
                >
                  <div class="flex items-center justify-between gap-1">
                    <span class="font-extrabold uppercase">[{{ act.orgId }}]</span>
                    <span 
                      v-if="getConflictSummary(act.id)?.primaryConflict"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="px-1 rounded text-[8px] font-black uppercase text-white"
                      :class="[
                        getConflictSummary(act.id)?.hasConfirmedConflict ? 'bg-red-600' :
                        getConflictSummary(act.id)?.hasPotentialConflict ? 'bg-amber-500' : 'bg-blue-500'
                      ]"
                    >
                      Alert
                    </span>
                  </div>
                  <p class="truncate font-bold leading-tight">{{ act.title }}</p>
                  <p class="text-[9px] text-slate-500 truncate">{{ act.venue || 'Campus Venue' }}</p>
                </div>

                <div v-if="getActs(wDay.dateString).length === 0" class="h-full flex items-center justify-center text-[10px] text-slate-300 italic">
                  Free
                </div>
              </div>

              <!-- Day Bottom Summary -->
              <div class="pt-1 border-t border-slate-100 text-center text-[9px] font-bold text-slate-400">
                {{ getActs(wDay.dateString).length }} event(s)
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== VIEW 3: SCHEDULE / UPCOMING EVENTS VIEW (Section 1) ==================== -->
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
                  <span class="block text-[10px] font-bold uppercase text-blue-600">{{ (act.startDate || '').slice(5, 7) || 'MO' }}</span>
                  <span class="block text-base font-extrabold text-blue-900 leading-none">{{ (act.startDate || '').slice(8, 10) || '01' }}</span>
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

                    <!-- Conflict Badge Pill in List View -->
                    <span 
                      v-if="getConflictSummary(act.id)?.hasConfirmedConflict"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1 cursor-pointer hover:bg-red-200"
                    >
                      <AlertCircle class="w-3 h-3 text-red-600" />
                      <span>Confirmed DAD Conflict</span>
                    </span>
                    <span 
                      v-else-if="getConflictSummary(act.id)?.hasPotentialConflict"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 cursor-pointer hover:bg-amber-200"
                    >
                      <AlertTriangle class="w-3 h-3 text-amber-600" />
                      <span>Potential Venue Overlap</span>
                    </span>
                    <span 
                      v-else-if="getConflictSummary(act.id)?.hasSimilarActivity"
                      @click.stop="handleOpenConflictDetails(getConflictSummary(act.id)!.primaryConflict!, $event)"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 cursor-pointer hover:bg-blue-200"
                    >
                      <Info class="w-3 h-3 text-blue-600" />
                      <span>Similar Activity</span>
                    </span>
                  </div>

                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                    {{ act.title }}
                  </h4>
                  <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {{ act.venue || 'Campus Venue' }} • {{ act.description || 'Institutional activity under MSUN student organization Action Plan.' }}
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
        <span class="hidden sm:inline">Tap any event or conflict badge to review proposal details</span>
        <button
          @click="emit('close')"
          class="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
        >
          Close Calendar
        </button>
      </div>

    </div>

    <!-- ==================== CONFLICT DETAILS POPUP MODAL (Section 6) ==================== -->
    <div
      v-if="isConflictModalOpen && selectedConflictItem"
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      @click.self="isConflictModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
        <!-- Dialog Header -->
        <div class="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2.5">
            <div 
              class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              :class="{
                'bg-red-100 text-red-700': selectedConflictItem.severity === 'red',
                'bg-amber-100 text-amber-700': selectedConflictItem.severity === 'yellow',
                'bg-blue-100 text-blue-700': selectedConflictItem.severity === 'blue'
              }"
            >
              <AlertCircle v-if="selectedConflictItem.severity === 'red'" class="w-5 h-5 text-red-600" />
              <AlertTriangle v-else-if="selectedConflictItem.severity === 'yellow'" class="w-5 h-5 text-amber-600" />
              <Info v-else class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 class="text-sm font-black text-slate-900 leading-snug">
                {{ selectedConflictItem.title }}
              </h4>
              <p class="text-[11px] text-slate-500">
                Conflict Detection & Multi-Council Coordination Alert
              </p>
            </div>
          </div>
          <button 
            @click="isConflictModalOpen = false" 
            class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Description Message -->
        <p class="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
          {{ selectedConflictItem.message }}
        </p>

        <!-- Structured Conflict Breakdown (Section 6 requirement) -->
        <div class="text-xs space-y-2 border border-slate-200 rounded-xl p-3 bg-white divide-y divide-slate-100">
          <div class="flex items-center justify-between pb-1.5">
            <span class="text-slate-500 font-semibold">Conflict Classification:</span>
            <span 
              class="px-2 py-0.5 rounded-full font-black text-[10px] uppercase"
              :class="{
                'bg-red-100 text-red-800': selectedConflictItem.type === 'confirmed_conflict',
                'bg-amber-100 text-amber-800': selectedConflictItem.type === 'potential_conflict',
                'bg-blue-100 text-blue-800': selectedConflictItem.type === 'similar_activity'
              }"
            >
              {{ selectedConflictItem.type.replace('_', ' ') }}
            </span>
          </div>

          <div class="flex items-center justify-between py-1.5">
            <span class="text-slate-500 font-semibold">Conflicting Organization:</span>
            <span class="font-extrabold text-slate-900">{{ selectedConflictItem.conflictingOrgId }}</span>
          </div>

          <div class="flex items-start justify-between py-1.5 gap-2">
            <span class="text-slate-500 font-semibold shrink-0">Conflicting Activity:</span>
            <span class="font-bold text-slate-800 text-right">{{ selectedConflictItem.conflictingActivityTitle }}</span>
          </div>

          <div class="flex items-center justify-between py-1.5">
            <span class="text-slate-500 font-semibold">Date & Time:</span>
            <span class="font-bold text-slate-900">
              {{ selectedConflictItem.conflictingDate }}
              <span v-if="selectedConflictItem.conflictingTime" class="text-slate-500">({{ selectedConflictItem.conflictingTime }})</span>
            </span>
          </div>

          <div class="flex items-center justify-between py-1.5">
            <span class="text-slate-500 font-semibold">Venue:</span>
            <span class="font-bold text-slate-900">{{ selectedConflictItem.conflictingVenue }}</span>
          </div>

          <div class="flex items-center justify-between pt-1.5">
            <span class="text-slate-500 font-semibold">Reservation / Status:</span>
            <span class="font-bold text-blue-700">{{ selectedConflictItem.conflictingStatus }}</span>
          </div>
        </div>

        <!-- Suggested Action -->
        <div class="bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-xs">
          <span class="block font-black text-blue-900 mb-0.5 flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-blue-700" />
            <span>Recommended Action</span>
          </span>
          <p class="text-blue-800 leading-snug">
            {{ selectedConflictItem.suggestedAction }}
          </p>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            @click="isConflictModalOpen = false"
            class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
