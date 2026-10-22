<script setup lang="ts">
import { ref, computed } from 'vue';
import { AppNotification, UserAccount } from '../types';
import { notificationService } from '../services/notificationService';
import { 
  Bell, 
  CheckCircle2, 
  RotateCcw, 
  FileText, 
  Mail, 
  Clock, 
  CheckCheck, 
  ExternalLink, 
  Sparkles, 
  Trash2, 
  Info,
  ChevronRight,
  Inbox
} from 'lucide-vue-next';

const props = defineProps<{
  notifications: AppNotification[];
  currentUser?: UserAccount | null;
  unreadEmailCount: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'markAsRead', id: string): void;
  (e: 'markAllAsRead'): void;
  (e: 'deleteNotification', id: string): void;
  (e: 'openActivity', activityId: string): void;
  (e: 'openEmailInbox', emailId?: string): void;
}>();

const selectedTab = ref<'all' | 'unread' | 'approvals' | 'system'>('all');

const filteredNotifications = computed(() => {
  if (selectedTab.value === 'unread') {
    return props.notifications.filter(n => !n.isRead);
  }
  if (selectedTab.value === 'approvals') {
    return props.notifications.filter(n => n.type === 'APPROVAL');
  }
  if (selectedTab.value === 'system') {
    return props.notifications.filter(n => n.type === 'SYSTEM');
  }
  return props.notifications;
});

const unreadCount = computed(() => {
  return props.notifications.filter(n => !n.isRead).length;
});

const formatTimeAgo = (isoString: string): string => {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
};

const handleItemClick = (notif: AppNotification) => {
  if (!notif.isRead) {
    emit('markAsRead', notif.id);
  }
  if (notif.activityId) {
    emit('openActivity', notif.activityId);
    emit('close');
  } else if (notif.emailId) {
    emit('openEmailInbox', notif.emailId);
    emit('close');
  }
};

const handleTestRealtime = () => {
  notificationService.playChime();
  notificationService.requestDesktopNotificationPermission();
  window.dispatchEvent(
    new CustomEvent('msun-realtime-alert', {
      detail: {
        id: `test-${Date.now()}`,
        type: 'APPROVAL',
        title: 'Real-Time Notification Verified! 🔔',
        message: 'Activity received official sign-off with real-time Gmail dispatch.',
        timestamp: new Date().toISOString()
      }
    })
  );
};
</script>

<template>
  <div 
    class="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-2 w-auto sm:w-[430px] max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[82vh]"
    @click.stop
  >
    <!-- Header -->
    <div class="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
          <Bell class="w-4 h-4" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-sm tracking-tight">Notifications</h3>
            <span 
              v-if="unreadCount > 0"
              class="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 uppercase"
            >
              {{ unreadCount }} new
            </span>
          </div>
          <p class="text-[11px] text-slate-400 leading-none mt-0.5">
            {{ currentUser?.orgId || 'All' }} Updates & Workflows
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          @click="handleTestRealtime"
          class="text-[10px] font-bold text-amber-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer border border-amber-500/30"
          title="Simulate incoming real-time chime and notification alert"
        >
          <Sparkles class="w-3 h-3 text-amber-400" />
          <span class="hidden sm:inline">Test Alert</span>
        </button>

        <button
          v-if="unreadCount > 0"
          type="button"
          @click="emit('markAllAsRead')"
          class="text-[11px] font-semibold text-blue-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
          title="Mark all notifications as read"
        >
          <CheckCheck class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Mark read</span>
        </button>

        <button
          type="button"
          @click="emit('openEmailInbox')"
          class="text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          title="Open Official Email Inbox"
        >
          <Mail class="w-3.5 h-3.5" />
          <span>Mailbox</span>
          <span v-if="unreadEmailCount > 0" class="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-blue-600"></span>
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs gap-1">
      <div class="flex items-center gap-1 overflow-x-auto py-0.5">
        <button
          type="button"
          @click="selectedTab = 'all'"
          class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px]"
          :class="selectedTab === 'all' ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'"
        >
          All ({{ notifications.length }})
        </button>
        <button
          type="button"
          @click="selectedTab = 'unread'"
          class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1"
          :class="selectedTab === 'unread' ? 'bg-white text-amber-700 shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>Unread</span>
          <span v-if="unreadCount > 0" class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        </button>
        <button
          type="button"
          @click="selectedTab = 'approvals'"
          class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px]"
          :class="selectedTab === 'approvals' ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'"
        >
          Approvals
        </button>
        <button
          type="button"
          @click="selectedTab = 'system'"
          class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px]"
          :class="selectedTab === 'system' ? 'bg-white text-purple-700 shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'"
        >
          System
        </button>
      </div>
    </div>

    <!-- Notifications List -->
    <div class="overflow-y-auto divide-y divide-slate-100 flex-1">
      <div 
        v-if="filteredNotifications.length === 0" 
        class="py-12 px-6 text-center text-slate-400"
      >
        <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Inbox class="w-6 h-6" />
        </div>
        <p class="text-sm font-semibold text-slate-700">No notifications found</p>
        <p class="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
          {{ selectedTab === 'unread' ? 'All notifications have been read.' : 'You will be notified here whenever workflows are approved.' }}
        </p>
      </div>

      <div
        v-for="notif in filteredNotifications"
        :key="notif.id"
        @click="handleItemClick(notif)"
        class="p-3.5 hover:bg-slate-50/90 transition-all cursor-pointer group relative flex items-start gap-3"
        :class="{ 'bg-blue-50/30': !notif.isRead }"
      >
        <!-- Icon Indicator -->
        <div 
          class="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-2xs mt-0.5"
          :class="{
            'bg-emerald-100 text-emerald-700 border border-emerald-200': notif.type === 'APPROVAL',
            'bg-rose-100 text-rose-700 border border-rose-200': notif.type === 'DEFERRAL',
            'bg-blue-100 text-blue-700 border border-blue-200': notif.type === 'SUBMISSION',
            'bg-purple-100 text-purple-700 border border-purple-200': notif.type === 'SYSTEM'
          }"
        >
          <CheckCircle2 v-if="notif.type === 'APPROVAL'" class="w-4 h-4" />
          <RotateCcw v-else-if="notif.type === 'DEFERRAL'" class="w-4 h-4" />
          <FileText v-else-if="notif.type === 'SUBMISSION'" class="w-4 h-4" />
          <Sparkles v-else class="w-4 h-4" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 pr-2">
          <div class="flex items-center justify-between gap-2 mb-0.5">
            <h4 
              class="text-xs font-bold text-slate-900 truncate leading-snug group-hover:text-blue-700 transition-colors"
              :class="{ 'font-black text-slate-950': !notif.isRead }"
            >
              {{ notif.title }}
            </h4>
            <span class="text-[10px] text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1 font-medium">
              <Clock class="w-3 h-3 text-slate-300" />
              {{ formatTimeAgo(notif.timestamp) }}
            </span>
          </div>

          <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {{ notif.message }}
          </p>

          <!-- Linked Activity / Email Chips -->
          <div class="flex items-center gap-1.5 flex-wrap mt-2">
            <span 
              v-if="notif.activityTitle" 
              class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 truncate max-w-[210px] flex items-center gap-1 border border-slate-200/60"
            >
              <FileText class="w-2.5 h-2.5 text-blue-600 shrink-0" />
              <span class="truncate">{{ notif.activityTitle }}</span>
            </span>

            <span 
              v-if="notif.actorName" 
              class="text-[10px] text-slate-500 font-medium truncate max-w-[150px]"
            >
              by {{ notif.actorName }}
            </span>

            <div class="ml-auto flex items-center gap-1.5 shrink-0">
              <a
                v-if="notif.gmailComposeUrl"
                :href="notif.gmailComposeUrl"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
                class="text-[10px] font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-md border border-red-200/80 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="Open and view in Google Gmail"
              >
                <ExternalLink class="w-2.5 h-2.5 text-red-600" />
                <span>Gmail</span>
              </a>

              <button
                v-if="notif.emailId"
                type="button"
                @click.stop="emit('openEmailInbox', notif.emailId); emit('close')"
                class="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200/60 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="Read official email notification"
              >
                <Mail class="w-3 h-3" />
                <span>Read Email</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Read status dot / Delete action -->
        <div class="flex flex-col items-center justify-between self-stretch shrink-0 py-0.5">
          <span 
            v-if="!notif.isRead"
            class="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100"
            title="Unread notification"
          ></span>
          
          <button
            type="button"
            @click.stop="emit('deleteNotification', notif.id)"
            class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition-opacity p-1 rounded-md cursor-pointer mt-auto"
            title="Dismiss notification"
          >
            <Trash2 class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Footer: Email Referrals Banner -->
    <div class="p-3 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
          <Mail class="w-3.5 h-3.5" />
        </div>
        <div class="min-w-0">
          <h5 class="text-[11px] font-bold text-slate-900 truncate leading-tight">
            MSUN Institutional Mailbox
          </h5>
          <p class="text-[10px] text-slate-500 truncate">
            {{ currentUser?.email || 'Logged in account' }}
          </p>
        </div>
      </div>

      <button
        type="button"
        @click="emit('openEmailInbox'); emit('close')"
        class="btn-primary btn-xs cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1 font-bold"
      >
        <span>Open Inbox</span>
        <ChevronRight class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>
