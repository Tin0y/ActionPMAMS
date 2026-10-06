<script setup lang="ts">
import { ref, computed } from 'vue';
import { Activity, OrgId, ActivityStatus, UserAccount } from '../types';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Coins, 
  Users, 
  Tag, 
  Calendar,
  Building2, 
  SlidersHorizontal, 
  FileText, 
  Award,
  ShieldAlert
} from 'lucide-vue-next';
import { ORGANIZATIONS, ORG_COLORS, getOrgTheme } from '../data/initialData';
import OrgBadge from './OrgBadge.vue';

const props = defineProps<{
  activities: Activity[];
  selectedOrgFilter: OrgId | 'ALL';
  currentUser?: UserAccount | null;
}>();

const emit = defineEmits<{
  (e: 'selectOrgFilter', org: OrgId | 'ALL'): void;
  (e: 'openCalendarModal'): void;
  (e: 'addActivityClick'): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'toggleStatus', activityId: string): void;
}>();

const searchQuery = ref('');
const statusFilter = ref<'ALL' | ActivityStatus>('ALL');
const displayMode = ref<'cards' | 'table'>('cards');

// Detect user's own organization. In Activity Management, student orgs can ONLY see their own activities.
const userOrg = computed<OrgId | null>(() => {
  if (props.currentUser?.orgId && props.currentUser.orgId !== 'OSA' && props.currentUser.orgId !== 'ADMIN' && props.currentUser.orgId !== 'COLLEGE') {
    return props.currentUser.orgId as OrgId;
  }
  return null;
});

const filtered = computed(() => {
  return props.activities.filter((act) => {
    // If the active user belongs to an organization, strictly hide other organizations' activities
    if (userOrg.value) {
      if (act.orgId !== userOrg.value) return false;
    } else {
      if (props.selectedOrgFilter !== 'ALL' && act.orgId !== props.selectedOrgFilter) return false;
    }

    const isApproved = act.status === 'Approved' || act.status === 'COMPLETED';
    const isPending = !isApproved;

    if (statusFilter.value === 'Approved' && !isApproved) return false;
    if (statusFilter.value === 'Pending' && isApproved) return false;

    const matchesSearch =
      searchQuery.value === '' ||
      act.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      act.venue.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      act.orgId.toLowerCase().includes(searchQuery.value.toLowerCase());

    return matchesSearch;
  });
});

const getOrgName = (orgId: OrgId) => {
  const org = ORGANIZATIONS.find((o) => o.id === orgId);
  return org ? org.name : orgId;
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header: Activity Management -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Activities &amp; Proposals
            </span>
            <span class="text-xs text-slate-500">Mindanao State University at Naawan</span>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Activity: Create, Manage, and Track
          </h2>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl">
            Track your organization's activities, detailed activity designs (DAD), venues, and review status for FY 2026.
          </p>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <button
            @click="emit('openCalendarModal')"
            class="btn-primary"
            title="Open Activity Calendar Schedule"
          >
            <Calendar class="w-4 h-4 text-white" />
            <span>Open Calendar Schedule</span>
          </button>
        </div>
      </div>

      <!-- Organization Selection Bar: If organization user, only show their own council (other orgs cannot be seen) -->
      <div v-if="userOrg" class="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2 min-w-0 max-w-full">
          <span class="text-xs font-semibold text-slate-500 shrink-0">Your Organization:</span>
          <span 
            class="px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs inline-flex items-center gap-1.5 max-w-full overflow-hidden leading-snug"
            :class="[
              getOrgTheme(userOrg).badgeBg,
              getOrgTheme(userOrg).badgeText,
              getOrgTheme(userOrg).badgeBorder
            ]"
          >
            <span class="font-extrabold shrink-0">{{ userOrg }}</span>
            <span class="font-medium opacity-85 text-[11px] truncate max-w-[200px] sm:max-w-md">— {{ getOrgName(userOrg) }}</span>
          </span>
        </div>
        <span class="text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md shrink-0">
          🔒 Organization Workspace: Showing activities for {{ userOrg }}
        </span>
      </div>

      <!-- Organization Selection Bar for Admin / Institutional Reviewers -->
      <div v-else class="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <!-- All Councils Button -->
        <button
          type="button"
          @click="emit('selectOrgFilter', 'ALL')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border"
          :class="selectedOrgFilter === 'ALL'
            ? 'bg-[#0f172a] text-white border-transparent shadow-xs'
            : 'bg-slate-50/70 text-blue-900 border-slate-200/90 hover:bg-blue-50/60 hover:border-blue-200 hover:text-blue-800'"
          title="All Councils"
        >
          All Councils
        </button>

        <!-- Individual Council Buttons with distinct organization color identification -->
        <button
          v-for="org in ORGANIZATIONS"
          :key="org.id"
          type="button"
          @click="emit('selectOrgFilter', org.id)"
          class="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5"
          :class="[
            getOrgTheme(org.id).badgeBg,
            getOrgTheme(org.id).badgeText,
            getOrgTheme(org.id).badgeBorder,
            selectedOrgFilter === org.id
              ? 'ring-2 ring-slate-900 ring-offset-1 font-black shadow-xs scale-105'
              : 'hover:opacity-90'
          ]"
          :title="`${org.acronym} - ${org.name}`"
        >
          <span>{{ org.acronym }}</span>
        </button>
      </div>
    </div>

    <!-- Filters and Layout controls -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <!-- Search Input -->
      <div class="relative flex-1">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Filter activities by keyword, title, venue, or details..."
          class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Status Filter -->
        <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            v-for="s in (['ALL', 'Approved', 'Pending'] as const)"
            :key="s"
            @click="statusFilter = s"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            :class="statusFilter === s
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'"
          >
            {{ s }}
          </button>
        </div>

        <!-- View Switcher (Cards vs Table) -->
        <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            @click="displayMode = 'cards'"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            :class="displayMode === 'cards'
              ? 'bg-white text-blue-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'"
          >
            Cards
          </button>
          <button
            @click="displayMode = 'table'"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            :class="displayMode === 'table'
              ? 'bg-white text-blue-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'"
          >
            Table
          </button>
        </div>
      </div>
    </div>

    <!-- Cards Mode -->
    <div v-if="displayMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div
        v-for="activity in filtered"
        :key="activity.id"
        class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden group"
      >
        <div class="p-5">
          <div class="flex items-start justify-between gap-2 mb-2">
            <OrgBadge :org-id="activity.orgId" size="sm" />
            <!-- Non-clickable status badge: Pending when awaiting/intermediate stages, Approved when finished -->
            <span
              class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full select-none cursor-default"
              :class="activity.status === 'Approved'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'"
            >
              <CheckCircle2 v-if="activity.status === 'Approved'" class="w-3 h-3 text-emerald-600" />
              <Clock v-else class="w-3 h-3 text-amber-600" />
              <span>{{ activity.status === 'Approved' ? 'Approved' : 'Pending' }}</span>
            </span>
          </div>

          <h3
            @click="emit('selectActivity', activity)"
            class="text-sm font-bold text-slate-900 hover:text-blue-700 cursor-pointer transition-colors leading-snug line-clamp-2"
          >
            {{ activity.title }}
          </h3>

          <p class="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {{ activity.description }}
          </p>

          <!-- Embedded Form Submission Status Pills -->
          <div class="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-slate-100">
            <span
              class="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
              :class="activity.designForm?.isCompleted
                ? 'bg-teal-50 text-teal-800 border border-teal-200/70 font-bold'
                : 'bg-slate-100 text-slate-500'"
            >
              <FileText class="w-3 h-3 text-teal-600" v-if="activity.designForm?.isCompleted" />
              <span>Design: {{ activity.designForm?.isCompleted ? 'Submitted' : 'Pending' }}</span>
            </span>

            <span
              class="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
              :class="activity.accomplishmentForm?.isCompleted
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-bold'
                : 'bg-slate-100 text-slate-500'"
            >
              <Award class="w-3 h-3 text-emerald-600" v-if="activity.accomplishmentForm?.isCompleted" />
              <span>Report: {{ activity.accomplishmentForm?.isCompleted ? 'Filed' : 'Pending' }}</span>
            </span>
          </div>

          <div class="space-y-1.5 mt-2.5 text-xs text-slate-600">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Date</span>
              <span class="font-medium text-slate-800">{{ activity.startDate }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Budget</span>
              <span class="font-bold text-teal-700">₱{{ activity.budget.toLocaleString() }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Venue</span>
              <span class="font-medium text-slate-700 truncate max-w-[140px]">{{ activity.venue }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Target Pax</span>
              <span class="font-medium text-slate-700">{{ activity.targetParticipants }} students</span>
            </div>
          </div>
        </div>

        <div class="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            @click="emit('selectActivity', activity)"
            class="btn-info btn-sm cursor-pointer w-full justify-center"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Table Mode -->
    <div v-else class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
          <tr>
            <th class="p-3.5">Code & Title</th>
            <th class="p-3.5">Org</th>
            <th class="p-3.5">Timeline</th>
            <th class="p-3.5">Venue</th>
            <th class="p-3.5">Budget</th>
            <th class="p-3.5">Status</th>
            <th class="p-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="activity in filtered" :key="activity.id" class="hover:bg-slate-50/60">
            <td class="p-3.5 max-w-xs">
              <span class="text-[10px] text-slate-400 block">{{ activity.id }}</span>
              <span
                @click="emit('selectActivity', activity)"
                class="font-bold text-slate-900 hover:text-blue-700 cursor-pointer block truncate"
              >
                {{ activity.title }}
              </span>
            </td>
            <td class="p-3.5">
              <OrgBadge :org-id="activity.orgId" size="xs" />
            </td>
            <td class="p-3.5 text-slate-600 font-medium">
              {{ activity.startDate }}
            </td>
            <td class="p-3.5 text-slate-600 truncate max-w-[130px]">
              {{ activity.venue }}
            </td>
            <td class="p-3.5 font-bold text-blue-700">
              ₱{{ activity.budget.toLocaleString() }}
            </td>
            <td class="p-3.5">
              <!-- Non-clickable status badge -->
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 select-none cursor-default"
                :class="activity.status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'"
              >
                <CheckCircle2 v-if="activity.status === 'Approved'" class="w-3 h-3 text-emerald-600" />
                <Clock v-else class="w-3 h-3 text-amber-600" />
                <span>{{ activity.status === 'Approved' ? 'Approved' : 'Pending' }}</span>
              </span>
            </td>
            <td class="p-3.5 text-right space-x-2 whitespace-nowrap">
              <button
                @click="emit('selectActivity', activity)"
                class="btn-info btn-sm cursor-pointer"
              >
                <FileText class="w-3.5 h-3.5" />
                <span>View Details</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
