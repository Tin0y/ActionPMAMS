<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { SentEmail, UserAccount } from '../types';
import { 
  Mail, 
  X, 
  Search, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Building2, 
  User, 
  ShieldCheck, 
  Inbox, 
  Sparkles,
  ArrowRight,
  FileText,
  Send,
  Eye
} from 'lucide-vue-next';

const props = defineProps<{
  emails: SentEmail[];
  currentUser?: UserAccount | null;
  selectedEmailId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'markEmailAsRead', id: string): void;
  (e: 'referToActivity', activityId: string): void;
  (e: 'simulateApprovalEmail'): void;
}>();

const searchQuery = ref('');
const activeEmailId = ref<string>(props.selectedEmailId || props.emails[0]?.id || '');

onMounted(() => {
  if (props.selectedEmailId) {
    activeEmailId.value = props.selectedEmailId;
    emit('markEmailAsRead', props.selectedEmailId);
  } else if (props.emails.length > 0 && props.emails[0]) {
    activeEmailId.value = props.emails[0].id;
    if (!props.emails[0].isRead) {
      emit('markEmailAsRead', props.emails[0].id);
    }
  }
});

const filteredEmails = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return props.emails;
  return props.emails.filter(e => 
    e.subject.toLowerCase().includes(q) ||
    (e.activityTitle && e.activityTitle.toLowerCase().includes(q)) ||
    e.fromName.toLowerCase().includes(q) ||
    e.previewText.toLowerCase().includes(q)
  );
});

const activeEmail = computed(() => {
  return props.emails.find(e => e.id === activeEmailId.value) || props.emails[0] || null;
});

const selectEmail = (email: SentEmail) => {
  activeEmailId.value = email.id;
  if (!email.isRead) {
    emit('markEmailAsRead', email.id);
  }
};

const handleReferToSystem = () => {
  if (activeEmail.value && activeEmail.value.activityId) {
    emit('referToActivity', activeEmail.value.activityId);
    emit('close');
  }
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return iso;
  }
};
</script>

<template>
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    @click.self="emit('close')"
  >
    <div 
      class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] max-h-[820px] flex flex-col overflow-hidden"
    >
      <!-- Modal Top Header / Webmail Bar -->
      <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md border border-blue-400/30">
            <Mail class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm sm:text-base font-extrabold tracking-tight">MSUN Institutional Mailbox</h2>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Official Webmail
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Logged in as: <span class="text-white font-medium">{{ currentUser?.email || 'user@msunaawan.edu.ph' }}</span> ({{ currentUser?.orgId || 'MSUN' }})
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Simulation Button -->
          <button
            type="button"
            @click="emit('simulateApprovalEmail')"
            class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            title="Simulate receiving an approval email notification"
          >
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Approval Email</span>
          </button>

          <button
            type="button"
            @click="emit('close')"
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close Email Client"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Main Layout: Sidebar & Email Reading Pane -->
      <div class="flex-1 flex overflow-hidden">
        
        <!-- Left Pane: Mailbox List (Hidden on mobile if viewing email) -->
        <div class="w-full sm:w-[320px] md:w-[360px] border-r border-slate-200 bg-slate-50/60 flex flex-col shrink-0">
          <!-- Search in Mailbox -->
          <div class="p-3 border-b border-slate-200/80 bg-white">
            <div class="relative">
              <Search class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search mail notifications..."
                class="w-full pl-9 pr-3 py-1.5 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs rounded-xl border border-transparent focus:border-blue-500 focus:outline-hidden transition-all"
              />
            </div>
          </div>

          <!-- Email Items List -->
          <div class="flex-1 overflow-y-auto divide-y divide-slate-100">
            <div v-if="filteredEmails.length === 0" class="py-12 px-4 text-center text-slate-400">
              <Inbox class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p class="text-xs font-semibold">No emails in inbox</p>
            </div>

            <div
              v-for="email in filteredEmails"
              :key="email.id"
              @click="selectEmail(email)"
              class="p-3.5 transition-all cursor-pointer relative hover:bg-white flex flex-col gap-1 border-l-4"
              :class="[
                activeEmailId === email.id ? 'bg-white border-l-blue-600 shadow-2xs' : 'border-l-transparent',
                !email.isRead ? 'font-bold bg-blue-50/40' : 'text-slate-600'
              ]"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-extrabold text-slate-900 truncate">
                  {{ email.fromName }}
                </span>
                <span class="text-[10px] text-slate-400 shrink-0">
                  {{ formatDate(email.timestamp).split(',')[0] }}
                </span>
              </div>

              <h4 class="text-xs text-slate-900 font-bold line-clamp-1 leading-snug">
                {{ email.subject }}
              </h4>

              <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {{ email.previewText }}
              </p>

              <div class="flex items-center gap-1.5 mt-1">
                <span 
                  class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md"
                  :class="email.statusBadge === 'Approved' || email.statusBadge?.includes('Cleared') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
                >
                  {{ email.statusBadge || 'Official' }}
                </span>
                <span v-if="!email.isRead" class="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Pane: Email Reader Pane -->
        <div class="flex-1 flex flex-col bg-white overflow-y-auto">
          <div v-if="!activeEmail" class="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
            <div>
              <Mail class="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 class="text-sm font-bold text-slate-700">Select an email to read</h3>
              <p class="text-xs text-slate-400 mt-1">Choose an approval notice from the inbox on the left.</p>
            </div>
          </div>

          <div v-else class="flex-1 flex flex-col">
            <!-- Email Header Info -->
            <div class="p-6 border-b border-slate-200/80 bg-slate-50/40">
              <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span class="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                    <span>{{ activeEmail.statusBadge || 'Official Clearance Notice' }}</span>
                  </span>
                  <h3 class="text-base sm:text-lg font-black text-slate-950 leading-snug">
                    {{ activeEmail.subject }}
                  </h3>
                </div>

                <!-- DIRECT SYSTEM REFERRAL BUTTON -->
                <button
                  type="button"
                  @click="handleReferToSystem"
                  class="btn-primary btn-sm shrink-0 cursor-pointer shadow-sm flex items-center gap-1.5 font-bold"
                  title="Open this activity inside the Action Plan system"
                >
                  <span>Open in System</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- From / To Meta Card -->
              <div class="flex items-center justify-between flex-wrap gap-3 text-xs bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-blue-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                    MSU
                  </div>
                  <div>
                    <p class="font-bold text-slate-900">
                      {{ activeEmail.fromName }} 
                      <span class="text-slate-400 font-normal">&lt;{{ activeEmail.fromEmail }}&gt;</span>
                    </p>
                    <p class="text-slate-500 text-[11px]">
                      To: <span class="font-medium text-slate-700">{{ activeEmail.toName }} &lt;{{ activeEmail.toEmail }}&gt;</span>
                    </p>
                  </div>
                </div>

                <div class="text-right text-[11px] text-slate-400 font-medium">
                  <div class="flex items-center gap-1 justify-end">
                    <Clock class="w-3.5 h-3.5" />
                    <span>{{ formatDate(activeEmail.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Email Letterhead Body -->
            <div class="p-6 sm:p-8 flex-1 bg-white">
              <div class="max-w-2xl mx-auto border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs bg-white">
                
                <!-- Institutional Header Banner -->
                <div class="text-center pb-6 border-b border-slate-200">
                  <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-900 text-amber-400 font-serif font-black text-lg mb-2 shadow-sm">
                    MSU
                  </div>
                  <h4 class="text-xs font-black tracking-widest text-slate-500 uppercase">
                    Republic of the Philippines
                  </h4>
                  <h3 class="text-sm font-extrabold text-blue-950 uppercase tracking-tight">
                    Mindanao State University at Naawan
                  </h3>
                  <p class="text-[11px] text-slate-500 font-medium">
                    Office of Student Development (OSD) &bull; 9023 Naawan, Misamis Oriental
                  </p>
                </div>

                <!-- Official Banner -->
                <div class="my-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 class="w-5 h-5" />
                  </div>
                  <div>
                    <h4 class="text-sm font-extrabold text-emerald-950">
                      Action Plan Activity Clearance Approved
                    </h4>
                    <p class="text-xs text-emerald-800 leading-relaxed">
                      This official electronic notice confirms that your student organization activity proposal has been reviewed and cleared at the designated workflow stage.
                    </p>
                  </div>
                </div>

                <!-- Activity Details Table / Card -->
                <div class="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-xs">
                  <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span class="text-slate-500 font-medium">Activity Code & Title:</span>
                    <span class="font-extrabold text-slate-900 text-right max-w-sm">
                      {{ activeEmail.activityTitle }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span class="text-slate-500 font-medium">Workflow Stage:</span>
                    <span class="font-bold text-blue-700">
                      {{ activeEmail.stageName || 'Approved / Completed' }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span class="text-slate-500 font-medium">Approved / Endorsed By:</span>
                    <span class="font-extrabold text-slate-900">
                      {{ activeEmail.approverName }} ({{ activeEmail.approverRole }})
                    </span>
                  </div>

                  <div class="flex flex-col gap-1 pt-1">
                    <span class="text-slate-500 font-medium">Official Remarks / Directives:</span>
                    <blockquote class="p-3 bg-white rounded-xl border border-slate-200/90 text-slate-700 italic leading-relaxed">
                      "{{ activeEmail.remarks || 'Activity endorsed and approved for implementation pursuant to university student governance guidelines.' }}"
                    </blockquote>
                  </div>
                </div>

                <!-- PROMINENT CALL TO ACTION / SYSTEM REFERRAL (As requested) -->
                <div class="mt-8 text-center p-6 rounded-3xl bg-linear-to-b from-blue-50/80 to-indigo-50/50 border border-blue-200/80">
                  <h4 class="text-sm font-extrabold text-blue-950 mb-1">
                    Refer Directly to the System Record
                  </h4>
                  <p class="text-xs text-slate-600 mb-4 max-w-md mx-auto leading-relaxed">
                    Click the button below to be referred directly to the Action Plan Monitoring & Management System and view full details, attachments, and liquidation milestones for this activity.
                  </p>

                  <button
                    type="button"
                    @click="handleReferToSystem"
                    class="btn-primary py-2.5 px-6 rounded-xl font-bold shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 text-sm"
                  >
                    <span>🚀 Open Activity in MSUN Action Plan System</span>
                    <ArrowRight class="w-4 h-4" />
                  </button>
                </div>

                <!-- Footer Sign-off -->
                <div class="mt-8 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400 space-y-1">
                  <p class="font-semibold text-slate-500">
                    Mindanao State University at Naawan &bull; Action Plan Monitoring and Management System (AP-MAMS)
                  </p>
                  <p>
                    This is an automated notification dispatch. For questions, contact the Office of Student Development (OSD).
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>
