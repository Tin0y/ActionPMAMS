<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';
import { AdminTab } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  Building2, 
  ChevronRight
} from 'lucide-vue-next';

const props = defineProps<{
  currentTab: AdminTab;
  isOpen: boolean;
  accountsCount: number;
  actionPlansCount: number;
}>();

const emit = defineEmits<{
  (e: 'selectTab', tab: AdminTab): void;
  (e: 'close'): void;
}>();

const handleSelect = (tab: AdminTab) => {
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
    id: 'dashboard' as AdminTab,
    label: 'Dashboard',
    subtitle: "Welcome back! Here's what's happening with the organization",
    icon: LayoutDashboard,
    badge: 'Live'
  },
  {
    id: 'accounts' as AdminTab,
    label: 'Accounts',
    subtitle: 'Manage user accounts, roles, and permissions across the system',
    icon: Users,
    badge: `${props.accountsCount}`
  },
  {
    id: 'action_plan' as AdminTab,
    label: 'Action Plan',
    subtitle: 'Manage action plan folders and files',
    icon: FileSpreadsheet,
    badge: `${props.actionPlansCount}`
  },
  {
    id: 'organizations' as AdminTab,
    label: 'Organizations',
    subtitle: 'Manage and monitor all student organizations at MSUN',
    icon: Building2,
    badge: '8 Orgs'
  }
]);
</script>

<template>
  <aside
    class="shrink-0 bg-white border-r border-slate-200/90 flex flex-col select-none transition-all duration-300 z-30 md:z-20 md:sticky md:top-16 md:h-[calc(100vh-4rem)]"
    :class="[
      'fixed inset-y-0 left-0 top-16 md:static shadow-2xl md:shadow-none',
      isOpen ? 'w-64 sm:w-72 translate-x-0' : 'w-0 md:w-18 sm:md:w-20 -translate-x-full md:translate-x-0 overflow-hidden'
    ]"
  >
    <!-- Main Navigation List -->
    <div class="w-full p-2 sm:p-2.5 space-y-1.5 flex-1 overflow-y-auto overflow-x-hidden pt-3">
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
