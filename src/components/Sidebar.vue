<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';
import { SidebarTab, OrgId } from '../types';
import { getActiveParentOrganizationsCount } from '../data/initialData';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  CalendarRange, 
  Coins, 
  Users, 
  ChevronRight,
  X
} from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    currentTab: SidebarTab;
    selectedOrgFilter?: OrgId | 'ALL';
    activitiesCount: number;
    actionPlanCount?: number;
    fiscalYear?: string;
    isOpen: boolean;
  }>(),
  {
    actionPlanCount: undefined,
    fiscalYear: 'FY 2027'
  }
);

const emit = defineEmits<{
  (e: 'selectTab', tab: SidebarTab): void;
  (e: 'selectOrgFilter', org: OrgId | 'ALL'): void;
  (e: 'close'): void;
}>();

const handleSelect = (tab: SidebarTab) => {
  emit('selectTab', tab);
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const navItems = computed(() => [
  {
    id: 'dashboard' as SidebarTab,
    label: 'Dashboard',
    subtitle: "Welcome back! Here's what's happening with your organization",
    icon: LayoutDashboard,
    badge: 'Live'
  },
  {
    id: 'action_plan' as SidebarTab,
    label: 'Action Plan',
    subtitle: 'View and manage student organization action plans',
    icon: FileSpreadsheet,
    badge: props.actionPlanCount !== undefined 
      ? `${props.actionPlanCount}` 
      : (props.fiscalYear?.replace('Fiscal Year ', 'FY ') || 'FY 2027')
  },
  {
    id: 'activity' as SidebarTab,
    label: 'Activity',
    subtitle: 'Create, Manage, and Track all organizational activities and proposals',
    icon: CalendarRange,
    badge: `${props.activitiesCount}`
  },
  {
    id: 'financial' as SidebarTab,
    label: 'Financial',
    subtitle: 'Track budgets, expenses, and financial reports across all organizations',
    icon: Coins,
    badge: `${getActiveParentOrganizationsCount()} Orgs`
  },
  {
    id: 'organizations' as SidebarTab,
    label: 'Organizations',
    subtitle: 'Manage and monitor all student organizations at MSUN',
    icon: Users,
    badge: `${getActiveParentOrganizationsCount()} Active`
  }
]);
</script>

<template>
  <aside
    class="shrink-0 bg-white border-r border-[#E0E7F1] flex flex-col select-none transition-all duration-300 z-30 lg:z-20 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]"
    :class="[
      'fixed inset-y-0 left-0 top-16 lg:static shadow-2xl lg:shadow-none',
      isOpen ? 'w-64 sm:w-72 translate-x-0' : 'w-0 lg:w-18 sm:lg:w-20 -translate-x-full lg:translate-x-0 overflow-hidden'
    ]"
  >
    <!-- Mobile Drawer Header with Close Button -->
    <div v-if="isOpen" class="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80 shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-xs font-black text-slate-800 uppercase tracking-wider">Navigation Menu</span>
      </div>
      <button
        type="button"
        @click="emit('close')"
        class="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
        title="Close menu"
        aria-label="Close menu"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Main Navigation List -->
    <div class="w-full p-2 sm:p-2.5 space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden pt-3 touch-scroll">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="handleSelect(item.id)"
        class="w-full text-left rounded-xl transition-all duration-200 flex items-center relative group cursor-pointer"
        :class="[
          isOpen ? 'p-3 gap-3' : 'p-2.5 justify-center',
          currentTab === item.id
            ? 'bg-blue-50/80 text-blue-900 border border-blue-200/80 shadow-xs'
            : 'text-slate-700 hover:bg-slate-100/70 border border-transparent'
        ]"
        :title="item.label + ' — ' + item.subtitle"
      >
        <!-- Icon -->
        <div
          class="p-2 rounded-lg shrink-0 transition-colors"
          :class="currentTab === item.id
            ? 'bg-blue-600 text-white shadow-2xs'
            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900'"
        >
          <component :is="item.icon" class="w-4 h-4" />
        </div>

        <!-- Details (hidden when hamburger menu collapses the sidebar) -->
        <div v-if="isOpen" class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span
              class="text-sm font-bold truncate"
              :class="currentTab === item.id ? 'text-blue-950' : 'text-slate-800'"
            >
              {{ item.label }}
            </span>
            <span
              v-if="item.badge"
              class="text-[10px] font-semibold px-1.5 py-0.2 rounded-md"
              :class="currentTab === item.id
                ? 'bg-blue-200/80 text-blue-900'
                : 'bg-slate-200/70 text-slate-600'"
            >
              {{ item.badge }}
            </span>
          </div>
          <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-tight">
            {{ item.subtitle }}
          </p>
        </div>

        <ChevronRight
          v-if="isOpen && currentTab === item.id"
          class="w-4 h-4 text-blue-600 self-center shrink-0 ml-auto"
        />
      </button>
    </div>
  </aside>
</template>
