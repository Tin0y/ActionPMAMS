<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ModuleType, UserAccount, formatUserRole } from '../types';
import { Menu, ChevronDown, Building2, UserCheck, Check, Search, Sparkles, ArrowRight, Bell, User } from 'lucide-vue-next';
import { getOrgTheme } from '../data/initialData';

const props = defineProps<{
  currentModule: ModuleType;
  pendingApprovalCount: number;
  isSidebarOpen?: boolean;
  currentUser?: UserAccount;
  userAccounts?: UserAccount[];
}>();

const emit = defineEmits<{
  (e: 'selectModule', module: ModuleType): void;
  (e: 'quickAddActivity'): void;
  (e: 'toggleSidebar'): void;
  (e: 'switchUser', user: UserAccount): void;
  (e: 'openLanding'): void;
  (e: 'openProfile'): void;
}>();

const isUserMenuOpen = ref(false);
const userMenuSearch = ref('');
const selectedAccountCategory = ref<'ALL' | 'OSD' | 'APPROVER' | 'ORG' | 'ADMIN'>('ALL');

// 1. System Administration: Accessible ONLY by System Administrator
const canAccessSystemAdmin = computed(() => {
  if (!props.currentUser) return false;
  return props.currentUser.role === 'ROLE_ADMIN' || props.currentUser.role === 'System Administrator';
});

// 2. Approval Management: Accessible ONLY by Reviewers and Approvers (Faculty Adviser, Dean, OSD, OVCSAS, Chancellor)
const canAccessApprovalManagement = computed(() => {
  if (!props.currentUser) return false;
  return [
    'ROLE_ADVISER',
    'ROLE_DEAN',
    'ROLE_OSD',
    'ROLE_OVCSAS',
    'ROLE_OC',
    'Faculty Adviser',
    'College Dean',
    'Dean / College Reviewer',
    'OSD Officer',
    'OSD Director',
    'OVCSAS Officer',
    'Office of the Chancellor',
    'OSA Director',
    'Vice Chancellor / Chancellor'
  ].includes(props.currentUser.role);
});

// 3. Activity Management: Accessible ONLY by Student Organizations
const canAccessActivityManagement = computed(() => {
  if (!props.currentUser) return false;
  return [
    'ROLE_ORGANIZATION',
    'Org President',
    'Org Treasurer'
  ].includes(props.currentUser.role);
});

const isOrgUser = computed(() => {
  return props.currentUser?.role === 'ROLE_ORGANIZATION' || props.currentUser?.role === 'Org President';
});

const filteredUserAccounts = computed(() => {
  const accounts = props.userAccounts || [];
  const q = userMenuSearch.value.trim().toLowerCase();
  
  return accounts.filter((acc) => {
    const matchesSearch = !q ||
      acc.name.toLowerCase().includes(q) ||
      acc.role.toLowerCase().includes(q) ||
      (acc.orgId && acc.orgId.toLowerCase().includes(q)) ||
      (acc.orgName && acc.orgName.toLowerCase().includes(q)) ||
      acc.email.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedAccountCategory.value === 'OSD') {
      return acc.role === 'ROLE_OSD' || acc.orgId === 'OSD' || acc.name.toLowerCase().includes('osd');
    }
    if (selectedAccountCategory.value === 'APPROVER') {
      return [
        'ROLE_ADVISER',
        'ROLE_DEAN',
        'ROLE_OSD',
        'ROLE_OVCSAS',
        'ROLE_OC',
        'Faculty Adviser',
        'College Dean',
        'Dean / College Reviewer',
        'OSD Officer',
        'OSD Director',
        'OVCSAS Officer',
        'Office of the Chancellor',
        'OSA Director',
        'Vice Chancellor / Chancellor'
      ].includes(acc.role);
    }
    if (selectedAccountCategory.value === 'ORG') {
      return ['ROLE_ORGANIZATION', 'Org President', 'Org Treasurer'].includes(acc.role);
    }
    if (selectedAccountCategory.value === 'ADMIN') {
      return acc.role === 'ROLE_ADMIN' || acc.role === 'System Administrator';
    }

    return true;
  });
});

const closeUserMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('#user-profile-menu-container')) {
    isUserMenuOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', closeUserMenu);
});

onUnmounted(() => {
  window.removeEventListener('click', closeUserMenu);
});

const handleSelectAccount = (account: UserAccount) => {
  emit('switchUser', account);
  isUserMenuOpen.value = false;
};
</script>

<template>
  <header class="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs w-full">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Brand & Identity with Hamburger Menu Toggle -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Hamburger Menu Toggle Button -->
          <button
            type="button"
            @click="emit('toggleSidebar')"
            class="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
            title="Toggle sidebar navigation (hide / show details)"
            aria-label="Toggle navigation menu"
          >
            <Menu class="w-5 h-5 text-slate-700" />
          </button>

          <img
            src="/msunlogo.png"
            alt="MSU Naawan"
            class="w-10 h-10 object-contain shrink-0 drop-shadow-xs"
          />
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base font-bold text-slate-900 tracking-tight leading-none">
                MSUN Action Plan
              </h1>
            </div>
          </div>
        </div>

        <!-- Right Action Icons: Notification Bell & User Profile (Image 1) -->
        <div class="flex items-center gap-3 relative" id="user-profile-menu-container">
          <!-- Notification Bell Icon (Image 1) -->
          <button
            type="button"
            class="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer relative"
            title="Notifications"
          >
            <Bell class="w-5 h-5 text-slate-800" />
            <span v-if="pendingApprovalCount > 0" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
          </button>

          <!-- User Profile Button (Matches Image 1 exactly) -->
          <button
            type="button"
            @click="emit('openProfile')"
            class="flex items-center gap-2.5 px-2 py-1.5 rounded-2xl hover:bg-slate-100/80 transition-all text-left cursor-pointer group"
            title="View Profile Settings"
          >
            <!-- Circular Avatar: Shows uploaded image if present, otherwise default silhouette -->
            <div class="w-9 h-9 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-xs ring-1 ring-slate-200 overflow-hidden">
              <img 
                v-if="currentUser?.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http'))"
                :src="currentUser.avatar"
                :alt="currentUser?.name || 'User'"
                class="w-full h-full object-cover"
              />
              <User v-else class="w-5 h-5 text-white" />
            </div>

            <!-- User Text Stack (Responsive on small screens) -->
            <div class="text-left leading-tight hidden sm:block">
              <h4 class="font-extrabold text-slate-950 text-sm tracking-tight truncate max-w-[140px]">
                {{ currentUser?.name ? (currentUser.name.split(' ')[0] || 'User') : 'User' }}
              </h4>
              <p class="text-xs text-slate-600 font-medium truncate max-w-[140px]">
                {{ formatUserRole(currentUser?.role) }}
              </p>
            </div>

            <ChevronDown class="w-4 h-4 text-slate-800 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
