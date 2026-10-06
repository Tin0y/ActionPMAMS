<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Activity, 
  OrgId, 
  CalendarViewMode, 
  SidebarTab 
} from '../types';
import { 
  Calendar as CalendarIcon, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Coins, 
  Sparkles,
  Info
} from 'lucide-vue-next';
import { ORGANIZATIONS, getOrgTheme } from '../data/initialData';
import OrgBadge from './OrgBadge.vue';

const props = defineProps<{
  activities: Activity[];
  selectedOrgFilter: OrgId | 'ALL';
}>();

const emit = defineEmits<{
  (e: 'downloadCalendar'): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'navigateToTab', tab: SidebarTab): void;
}>();

// Filter activities based on organization
const filteredActivities = computed(() => {
  if (props.selectedOrgFilter === 'ALL') return props.activities;
  return props.activities.filter((act) => act.orgId === props.selectedOrgFilter);
});

// Calendar State
const viewMode = ref<'Month' | 'Week' | 'Schedule'>('Month');
const selectedDate = ref<Date>(new Date(2026, 8, 19)); // Sep 19, 2026
const selectedDayDateStr = ref<string>('2026-09-19');

// Activities for currently selected day
const selectedDayActivities = computed(() => {
  if (!selectedDayDateStr.value) return [];
  return getActivitiesForDate(selectedDayDateStr.value);
});

// Month activities for Schedule view
const currentMonthActivitiesList = computed(() => {
  const year = selectedDate.value.getFullYear();
  const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}`;
  return filteredActivities.value
    .filter(a => a.startDate.startsWith(prefix) || a.endDate.startsWith(prefix))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
});

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

// Formatted Header for Calendar
const calendarTitle = computed(() => {
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  return selectedDate.value.toLocaleDateString('default', options);
});

// Generate 35 calendar cells for Month View
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

// Week View Days calculation (7 days)
const weekViewDays = computed(() => {
  const start = new Date(selectedDate.value);
  const day = start.getDay();
  start.setDate(start.getDate() - day); // Sunday

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    week.push({
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      dayNumber: d.getDate(),
      dateString: `${d.getFullYear()}-${monthStr}-${dayStr}`,
      isCurrentMonth: d.getMonth() === selectedDate.value.getMonth()
    });
  }
  return week;
});

// Find activities occurring on a date
const getActivitiesForDate = (dateStr: string) => {
  return filteredActivities.value.filter(
    (act) => act.startDate <= dateStr && act.endDate >= dateStr
  );
};

// Upcoming Events list (Chronologically sorted)
const upcomingEvents = computed(() => {
  return [...filteredActivities.value]
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Header Banner (Visibility & System Status) -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 relative overflow-hidden">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Active Session: FY 2026
            </span>
            <span class="text-xs text-slate-500">Mindanao State University at Naawan</span>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome back! Here's what's happening with your organization
          </h2>
        </div>
      </div>
    </div>

    <!-- Calendar & Schedule Section -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Left Column: Main Interactive Calendar (8 cols) -->
      <div class="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col">
        
        <!-- Calendar Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          
          <!-- Date and Month Navigation -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                @click="handlePrev"
                class="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                title="Previous interval"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>

              <div class="px-2.5 py-0.5 text-center">
                <span class="text-sm font-bold text-slate-900 whitespace-nowrap">
                  {{ calendarTitle }}
                </span>
              </div>

              <button
                @click="handleNext"
                class="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                title="Next interval"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Controls: View Mode & Download -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- View Mode (Month, Week, or Schedule View) -->
            <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                v-for="m in (['Month', 'Week', 'Schedule'] as const)"
                :key="m"
                @click="viewMode = m"
                class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                :class="viewMode === m
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'"
              >
                {{ m }} View
              </button>
            </div>

            <!-- Calendar Download Button (Affordance & Feedback) -->
            <button
              @click="emit('downloadCalendar')"
              class="btn-secondary btn-sm"
              title="Download official MSUN Action Plan schedule as .ics calendar file"
            >
              <Download class="w-3.5 h-3.5 text-blue-600" />
              <span>Download</span>
            </button>
          </div>
        </div>

        <!-- Status Legend (Approved or Pending Activity) -->
        <div class="flex flex-wrap items-center justify-between py-2.5 px-1 text-xs border-b border-slate-100/80 gap-2">
          <div class="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200"></span>
              <span class="font-semibold text-slate-700">Approved</span>
            </div>

            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
              <span class="font-semibold text-slate-700">Pending</span>
            </div>
          </div>

          <span class="text-[11px] text-slate-400">
            Tap any event to view proposal
          </span>
        </div>

        <!-- Calendar Body: Month View, Week View, or Schedule View -->
        <div class="pt-3 flex-1">
          
          <!-- ==================== 1. MONTH GRID VIEW ==================== -->
          <div v-if="viewMode === 'Month'" class="space-y-3">
            <!-- Days of Week Header -->
            <div class="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 pb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <!-- 35-Day Grid Cells -->
            <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
              <div
                v-for="(day, idx) in daysInMonthGrid"
                :key="idx"
                @click="selectedDayDateStr = day.dateString"
                class="min-h-[58px] sm:min-h-[82px] p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between transition-colors cursor-pointer"
                :class="[
                  selectedDayDateStr === day.dateString ? 'ring-2 ring-blue-600 border-blue-500 bg-blue-50/40' : '',
                  day.isCurrentMonth
                    ? (day.dateString === '2026-09-19' && selectedDayDateStr !== day.dateString
                      ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300/60'
                      : 'bg-white border-slate-200/90 hover:border-slate-300')
                    : 'bg-slate-50/40 border-slate-100 text-slate-400'
                ]"
              >
                <div class="flex items-center justify-between text-[11px]">
                  <span
                    class="font-bold"
                    :class="day.dateString === '2026-09-19' ? 'text-blue-600' : 'text-slate-700'"
                  >
                    {{ day.dayNumber }}
                  </span>
                  <span
                    v-if="getActivitiesForDate(day.dateString).length > 0"
                    class="text-[9px] font-extrabold px-1 rounded bg-slate-100 text-slate-600"
                  >
                    {{ getActivitiesForDate(day.dateString).length }}
                  </span>
                </div>

                <!-- Compact Dots for Mobile Phones -->
                <div class="sm:hidden flex items-center justify-center gap-0.5 mt-1 overflow-hidden">
                  <span
                    v-for="act in getActivitiesForDate(day.dateString).slice(0, 3)"
                    :key="act.id"
                    class="w-1.5 h-1.5 rounded-full"
                    :class="act.status === 'Approved' ? 'bg-blue-600' : 'bg-amber-500'"
                  ></span>
                </div>

                <!-- Activity Events Pills (Tablet & Desktop) -->
                <div class="hidden sm:block space-y-1 overflow-hidden mt-1">
                  <div
                    v-for="act in getActivitiesForDate(day.dateString).slice(0, 2)"
                    :key="act.id"
                    @click.stop="emit('selectActivity', act)"
                    class="text-[9px] px-1.5 py-0.5 rounded-md truncate font-bold cursor-pointer transition-transform hover:scale-[1.02] border flex items-center gap-1 shadow-2xs"
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

                  <div
                    v-if="getActivitiesForDate(day.dateString).length > 2"
                    class="text-[9px] text-slate-400 font-medium px-1"
                  >
                    +{{ getActivitiesForDate(day.dateString).length - 2 }} more
                  </div>
                </div>
              </div>
            </div>

            <!-- Selected Date Activities Drawer / Panel (Especially valuable on mobile) -->
            <div class="mt-3 pt-3 border-t border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock class="w-3.5 h-3.5 text-blue-600" />
                  <span>Events on {{ selectedDayDateStr }} ({{ selectedDayActivities.length }})</span>
                </span>
                <span class="text-[10px] text-slate-400">Click day in grid to inspect</span>
              </div>

              <div v-if="selectedDayActivities.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="act in selectedDayActivities"
                  :key="act.id"
                  @click="emit('selectActivity', act)"
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
                  <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </div>
              </div>

              <div v-else class="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                No scheduled activities for this date.
              </div>
            </div>
          </div>

          <!-- ==================== 2. WEEK VIEW (Scrollable on small devices) ==================== -->
          <div v-else-if="viewMode === 'Week'" class="space-y-2">
            <div class="overflow-x-auto pb-2">
              <div class="grid grid-cols-7 gap-2 min-w-[620px]">
                <div
                  v-for="col in weekViewDays"
                  :key="col.dateString"
                  class="p-2.5 rounded-xl border bg-white border-slate-200 min-h-[160px] flex flex-col"
                >
                  <div class="text-center pb-2 border-b border-slate-100">
                    <span class="text-xs font-semibold text-slate-400 uppercase">{{ col.dayName }}</span>
                    <p
                      class="text-sm font-extrabold"
                      :class="col.dateString === '2026-09-19' ? 'text-blue-600' : 'text-slate-800'"
                    >
                      {{ col.dayNumber }}
                    </p>
                  </div>

                  <div class="space-y-1.5 mt-2 flex-1 overflow-y-auto">
                    <div
                      v-for="act in getActivitiesForDate(col.dateString)"
                      :key="act.id"
                      @click="emit('selectActivity', act)"
                      class="p-1.5 rounded-lg text-[10px] cursor-pointer font-medium leading-tight border transition-transform hover:scale-[1.02] shadow-2xs"
                      :class="[
                        getOrgTheme(act.orgId).badgeBg,
                        getOrgTheme(act.orgId).badgeText,
                        getOrgTheme(act.orgId).badgeBorder
                      ]"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <OrgBadge :org-id="act.orgId" size="xs" />
                        <span class="text-[8px] font-bold">{{ act.status }}</span>
                      </div>
                      <div class="line-clamp-2 font-bold">{{ act.title }}</div>
                    </div>

                    <div
                      v-if="getActivitiesForDate(col.dateString).length === 0"
                      class="text-[10px] text-slate-400 text-center py-4"
                    >
                      No activity
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ==================== 3. SCHEDULE / AGENDA VIEW ==================== -->
          <div v-else class="space-y-2">
            <div v-if="currentMonthActivitiesList.length > 0" class="space-y-2">
              <div
                v-for="act in currentMonthActivitiesList"
                :key="act.id"
                @click="emit('selectActivity', act)"
                class="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs group"
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
                        :class="act.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
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
              No events found for this period.
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Display of Upcoming Events & Quick Insights (4 cols) -->
      <div class="lg:col-span-4 space-y-6">
        
        <!-- Display of Upcoming Events -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-bold text-slate-900">
                Display of Upcoming Events
              </h3>
              <p class="text-xs text-slate-500">Scheduled in FY 2026 Action Plan</p>
            </div>

            <button
              @click="emit('navigateToTab', 'activity')"
              class="btn-secondary btn-sm"
            >
              <span>View All</span>
              <ChevronRight class="w-3 h-3 text-slate-500" />
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="act in upcomingEvents"
              :key="act.id"
              @click="emit('selectActivity', act)"
              class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all cursor-pointer group"
            >
              <div class="flex items-start justify-between gap-2 mb-1.5">
                <OrgBadge :org-id="act.orgId" size="xs" />
                
                <span
                  class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  :class="act.status === 'Approved'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-800'"
                >
                  <CheckCircle2 v-if="act.status === 'Approved'" class="w-3 h-3 text-blue-600" />
                  <Clock v-else class="w-3 h-3 text-amber-600" />
                  <span>{{ act.status }}</span>
                </span>
              </div>

              <h4 class="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1 leading-snug">
                {{ act.title }}
              </h4>

              <div class="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                <span class="flex items-center gap-1">
                  <CalendarIcon class="w-3 h-3 text-slate-400" />
                  <span>{{ act.startDate }}</span>
                </span>
                <span class="flex items-center gap-1">
                  <MapPin class="w-3 h-3 text-slate-400" />
                  <span class="truncate max-w-[110px]">{{ act.venue }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
