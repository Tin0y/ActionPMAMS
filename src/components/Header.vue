<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ModuleType, UserAccount, formatUserRole, AppNotification } from '../types';
import { getAccountDisplayRole } from '../utils/organizationUtils';
import { Menu, ChevronDown, Building2, UserCheck, Check, Search, Sparkles, ArrowRight, Bell, User } from 'lucide-vue-next';
import { getOrgTheme } from '../data/initialData';
import { notificationService } from '../services/notificationService';
import NotificationMenu from './NotificationMenu.vue';

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
  (e: 'openActivity', activityId: string): void;
  (e: 'openEmailInbox', emailId?: string): void;
}>();

const isUserMenuOpen = ref(false);
const isNotificationOpen = ref(false);
const notifications = ref<AppNotification[]>(notificationService.getNotifications(props.currentUser));

const refreshNotifications = () => {
  notifications.value = notificationService.getNotifications(props.currentUser);
};

watch(() => props.currentUser, () => {
  refreshNotifications();
});

const unreadCount = computed(() => {
  return notificationService.getUnreadNotificationCount(props.currentUser);
});

const unreadEmailCount = computed(() => {
  return notificationService.getUnreadEmailCount(props.currentUser);
});
const userMenuSearch = ref('');
const selectedAccountCategory = ref<'ALL' | 'OSD' | 'APPROVER' | 'ORG' | 'ADMIN'>('ALL');

// 1. System Administration: Accessible ONLY by System Administrator
const canAccessSystemAdmin = computed(() => {
  if (!props.currentUser) return false;
  return props.currentUser.role === 'ROLE_ADMIN' || props.currentUser.role === 'System Administrator';
});

// 2. Approval Management: Accessible ONLY by Reviewers and Approvers (Faculty Adviser, Dean, OSD, OVCSAS)
const canAccessApprovalManagement = computed(() => {
  if (!props.currentUser) return false;
  return [
    'ROLE_ADVISER',
    'ROLE_DEAN',
    'ROLE_OSD',
    'ROLE_OVCSAS',
    'Faculty Adviser',
    'College Dean',
    'Dean / College Reviewer',
    'OSD Officer',
    'OSD Director',
    'OVCSAS Officer',
    'OSA Director'
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

const closeMenus = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('#user-profile-menu-container')) {
    isUserMenuOpen.value = false;
  }
  if (!target.closest('#notification-bell-container')) {
    isNotificationOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', closeMenus);
  window.addEventListener('msun-notifications-updated', refreshNotifications);
});

onUnmounted(() => {
  window.removeEventListener('click', closeMenus);
  window.removeEventListener('msun-notifications-updated', refreshNotifications);
});

const handleSelectAccount = (account: UserAccount) => {
  emit('switchUser', account);
  isUserMenuOpen.value = false;
};
</script>

<template>
  <header class="border-b border-[#28277d] bg-[#1b1a69] text-white shrink-0 z-30 shadow-md w-full pt-safe select-none">
    <div class="w-full px-3 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Brand & Identity with Hamburger Menu Toggle -->
        <div class="flex items-center gap-1.5 sm:gap-3">
          <!-- Hamburger Menu Toggle Button (44x44px touch target) -->
          <button
            type="button"
            @click="emit('toggleSidebar')"
            class="p-2.5 -ml-1.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px]"
            title="Toggle sidebar navigation"
            aria-label="Toggle navigation menu"
          >
            <Menu class="w-5 h-5 text-slate-200" />
          </button>

          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-sm sm:text-base font-black text-white tracking-tight leading-none whitespace-nowrap">
                Action Plan Monitoring and Management System
              </h1>
            </div>
          </div>
        </div>

        <!-- Right Action Icons: Notification Bell & User Profile (Image 1) -->
        <div class="flex items-center gap-1.5 sm:gap-3 relative" id="user-profile-menu-container">
          <!-- Notification Bell Icon (Interactive with Menu & Dropdown) -->
          <div class="relative" id="notification-bell-container">
            <button
              type="button"
              @click.stop="isNotificationOpen = !isNotificationOpen"
              class="p-2.5 text-slate-200 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-xl transition-colors cursor-pointer relative min-w-[44px] min-h-[44px] flex items-center justify-center"
              :class="{ 'bg-white/15 text-white': isNotificationOpen }"
              title="Notifications & Approval Alerts"
              aria-label="View notifications"
            >
              <Bell class="w-5 h-5 text-slate-200" />
              
              <!-- Unread Notification Badge (Image 1 match + Dynamic unread counter) -->
              <span 
                v-if="unreadCount > 0" 
                class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center ring-2 ring-[#1b1a69] shadow-xs"
              >
                {{ unreadCount > 9 ? '9+' : unreadCount }}
              </span>
            </button>

            <!-- Notifications Dropdown Menu -->
            <NotificationMenu
              v-if="isNotificationOpen"
              :notifications="notifications"
              :current-user="currentUser"
              :unread-email-count="unreadEmailCount"
              @close="isNotificationOpen = false"
              @mark-as-read="notificationService.markNotificationAsRead($event); refreshNotifications()"
              @mark-all-as-read="notificationService.markAllNotificationsAsRead(currentUser); refreshNotifications()"
              @delete-notification="notificationService.deleteNotification($event); refreshNotifications()"
              @open-activity="emit('openActivity', $event)"
              @open-email-inbox="emit('openEmailInbox', $event)"
            />
          </div>

          <!-- User Profile Button (Matches Image 1 exactly) -->
          <button
            type="button"
            @click="emit('openProfile')"
            class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-2xl hover:bg-white/10 transition-all text-left cursor-pointer group"
            title="View Profile Settings"
          >
            <!-- Circular Avatar: Shows uploaded image if present, otherwise default silhouette -->
            <div class="w-9 h-9 rounded-full bg-blue-900/80 text-white flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/20 overflow-hidden">
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
              <h4 class="font-extrabold text-white text-sm tracking-tight truncate max-w-[140px]">
                {{ currentUser?.name ? (currentUser.name.split(' ')[0] || 'User') : 'User' }}
              </h4>
              <p class="text-xs text-blue-200/80 font-medium truncate max-w-[140px]">
                {{ getAccountDisplayRole(currentUser) }}
              </p>
            </div>

            <ChevronDown class="w-4 h-4 text-slate-300 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
