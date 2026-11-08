<script setup lang="ts">
import { ref, computed } from 'vue';
import { AppNotification, UserAccount } from '../types';
import { 
  Bell, 
  CheckCircle2, 
  RotateCcw, 
  FileText, 
  Mail, 
  Clock, 
  CheckCheck, 
  ExternalLink, 
  Trash2, 
  ChevronRight,
  Inbox,
  X,
  User,
  Check
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

const getNotificationTypeLabel = (type: string): string => {
  switch (type) {
    case 'APPROVAL':
      return 'Approval';
    case 'DEFERRAL':
      return 'Revision Required';
    case 'SUBMISSION':
      return 'Action Plan';
    case 'EMAIL':
      return 'Official Email';
    case 'SYSTEM':
    default:
      return 'System Notice';
  }
};

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

const handleMarkAllAsRead = () => {
  props.notifications.forEach((n) => {
    n.isRead = true;
  });
  emit('markAllAsRead');
};

const handleMarkItemRead = (notif: AppNotification) => {
  notif.isRead = true;
  emit('markAsRead', notif.id);
};

const handleItemClick = (notif: AppNotification) => {
  if (!notif.isRead) {
    notif.isRead = true;
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
</script>

<template>
  <div 
    class="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-2 w-auto sm:w-[420px] max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[82vh]"
    @click.stop
  >
    <!-- Header: Matching Institutional Inbox Theme -->
    <div class="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md border border-blue-400/30 shrink-0">
          <Bell class="w-4 h-4 text-white" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-extrabold text-sm text-white tracking-tight">Notifications</h3>
            <span 
              v-if="unreadCount > 0"
              class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30"
            >
              {{ unreadCount }} new
            </span>
          </div>
          <p class="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
            {{ currentUser?.orgId || 'MSUN' }} Updates & Workflows
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          v-if="unreadCount > 0"
          type="button"
          @click="handleMarkAllAsRead"
          class="text-xs font-bold text-blue-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer border border-blue-400/20"
          title="Mark all notifications as read"
        >
          <CheckCheck class="w-3.5 h-3.5 text-blue-400" />
          <span>Mark read</span>
        </button>

        <button
          type="button"
          @click="emit('close')"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Close notifications"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Filter Tabs (Modern Segmented Pills) -->
    <div class="px-3.5 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1 text-xs">
      <button
        type="button"
        @click="selectedTab = 'all'"
        class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px]"
        :class="selectedTab === 'all' ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'"
      >
        All ({{ notifications.length }})
      </button>

      <button
        type="button"
        @click="selectedTab = 'unread'"
        class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5"
        :class="selectedTab === 'unread' ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'"
      >
        <span>Unread</span>
        <span v-if="unreadCount > 0" class="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-100 text-blue-700">
          {{ unreadCount }}
        </span>
      </button>

      <button
        type="button"
        @click="selectedTab = 'approvals'"
        class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px]"
        :class="selectedTab === 'approvals' ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'"
      >
        Approvals
      </button>

      <button
        type="button"
        @click="selectedTab = 'system'"
        class="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px]"
        :class="selectedTab === 'system' ? 'bg-white text-purple-700 shadow-2xs border border-slate-200/80' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'"
      >
        System
      </button>
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
        <p class="text-xs font-bold text-slate-700">No notifications found</p>
        <p class="text-[11px] text-slate-400 mt-0.5 max-w-[240px] mx-auto">
          {{ selectedTab === 'unread' ? 'All notifications have been read.' : 'You will be notified here whenever workflows are updated.' }}
        </p>
      </div>

      <div
        v-for="notif in filteredNotifications"
        :key="notif.id"
        @click="handleItemClick(notif)"
        class="p-4 hover:bg-slate-50/80 transition-all cursor-pointer group relative flex items-start gap-3.5 border-b border-slate-100 last:border-b-0"
        :class="{ 'bg-blue-50/20': !notif.isRead }"
      >
        <!-- Icon Indicator Badge -->
        <div 
          class="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center mt-0.5 transition-transform group-hover:scale-105"
          :class="{
            'bg-emerald-50 text-emerald-600 border border-emerald-200/80': notif.type === 'APPROVAL',
            'bg-amber-50 text-amber-600 border border-amber-200/80': notif.type === 'DEFERRAL',
            'bg-blue-50 text-blue-600 border border-blue-200/80': notif.type === 'SUBMISSION',
            'bg-purple-50 text-purple-600 border border-purple-200/80': notif.type === 'SYSTEM',
            'bg-sky-50 text-sky-600 border border-sky-200/80': notif.type === 'EMAIL'
          }"
        >
          <CheckCircle2 v-if="notif.type === 'APPROVAL'" class="w-4 h-4" />
          <RotateCcw v-else-if="notif.type === 'DEFERRAL'" class="w-4 h-4" />
          <FileText v-else-if="notif.type === 'SUBMISSION'" class="w-4 h-4" />
          <Mail v-else-if="notif.type === 'EMAIL'" class="w-4 h-4" />
          <Bell v-else class="w-4 h-4" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span 
                class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                :class="{
                  'bg-emerald-100/70 text-emerald-800': notif.type === 'APPROVAL',
                  'bg-amber-100/70 text-amber-800': notif.type === 'DEFERRAL',
                  'bg-blue-100/70 text-blue-800': notif.type === 'SUBMISSION',
                  'bg-purple-100/70 text-purple-800': notif.type === 'SYSTEM',
                  'bg-sky-100/70 text-sky-800': notif.type === 'EMAIL'
                }"
              >
                {{ getNotificationTypeLabel(notif.type) }}
              </span>
              <span v-if="!notif.isRead" class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            </div>

            <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1">
              <Clock class="w-3 h-3 text-slate-300" />
              {{ formatTimeAgo(notif.timestamp) }}
            </span>
          </div>

          <h4 
            class="text-xs font-bold leading-snug group-hover:text-blue-600 transition-colors"
            :class="!notif.isRead ? 'text-slate-900 font-extrabold' : 'text-slate-700'"
          >
            {{ notif.title }}
          </h4>

          <p class="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
            {{ notif.message }}
          </p>

          <!-- Origin / Actor & Action Chips -->
          <div class="flex items-center gap-2 flex-wrap mt-2.5 pt-0.5">
            <span 
              v-if="notif.actorName" 
              class="text-[10px] text-slate-400 font-medium flex items-center gap-1"
            >
              <User class="w-3 h-3 text-slate-300" />
              <span>by {{ notif.actorName }}</span>
            </span>

            <span 
              v-if="notif.activityTitle" 
              class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 max-w-[200px] truncate"
              :title="notif.activityTitle"
            >
              {{ notif.activityTitle }}
            </span>

            <div class="ml-auto flex items-center gap-1.5 shrink-0">
              <button
                v-if="!notif.isRead"
                type="button"
                @click.stop="handleMarkItemRead(notif)"
                class="text-[10px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                title="Mark notification as read"
              >
                <Check class="w-2.5 h-2.5 text-blue-600" />
                <span>Mark read</span>
              </button>

              <button
                v-if="notif.emailId"
                type="button"
                @click.stop="emit('openEmailInbox', notif.emailId); emit('close')"
                class="text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200/60 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="View notification email in Institutional Mailbox"
              >
                <Mail class="w-2.5 h-2.5" />
                <span>View Email</span>
              </button>

              <a
                v-if="notif.gmailComposeUrl"
                :href="notif.gmailComposeUrl"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
                class="text-[10px] font-semibold text-slate-500 hover:text-red-700 bg-white hover:bg-red-50 px-2 py-0.5 rounded-md border border-slate-200 hover:border-red-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                title="Open optional web draft in Gmail"
              >
                <ExternalLink class="w-2.5 h-2.5 text-red-500" />
                <span>Gmail Web</span>
              </a>

              <button
                type="button"
                @click.stop="emit('deleteNotification', notif.id)"
                class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1 rounded-md cursor-pointer hover:bg-slate-100"
                title="Dismiss notification"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Clean Minimal Footer -->
    <div class="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Mail class="w-3.5 h-3.5" />
        </div>
        <div class="min-w-0">
          <p class="text-[11px] font-semibold text-slate-800 truncate">
            MSUN Institutional Mailbox
          </p>
          <p class="text-[10px] text-slate-400 truncate -mt-0.5">
            {{ currentUser?.email || 'Logged in account' }}
          </p>
        </div>
      </div>

      <button
        type="button"
        @click="emit('openEmailInbox'); emit('close')"
        class="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition cursor-pointer shrink-0 hover:underline"
      >
        <span>Open Inbox</span>
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
