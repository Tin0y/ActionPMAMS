<script setup lang="ts">
import { ref, computed } from 'vue';
import { StudentOrganization, OrganizationMember } from '../types';
import { ORG_COLORS } from '../data/initialData';
import { 
  X, 
  Building2, 
  Info, 
  Users, 
  Paperclip, 
  Download, 
  Search, 
  CheckCircle2, 
  Calendar, 
  Target, 
  Mail, 
  Phone, 
  UserCheck, 
  FileText,
  ShieldCheck
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  organization: StudentOrganization | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

const activeTab = ref<'overview' | 'members' | 'attachments'>('overview');
const searchMemberQuery = ref<string>('');

// Default mockup members generator if org.membersList is empty
const defaultMembers = computed<OrganizationMember[]>(() => {
  if (!props.organization) return [];
  if (props.organization.membersList && props.organization.membersList.length > 0) {
    return props.organization.membersList;
  }

  const orgCode = props.organization.acronym;
  const pres = props.organization.president || 'Maria Clarisse Santos';
  const adv = props.organization.facultyAdviser || 'Prof. Rolando Gutierrez';

  return [
    {
      id: 'm-1',
      fullName: pres,
      contactNumber: '+63 917 842 1092',
      email: `${pres.toLowerCase().replace(/[^a-z]/g, '.')}@msun.edu.ph`,
      role: 'President'
    },
    {
      id: 'm-2',
      fullName: 'Joshua Paul Mendoza',
      contactNumber: '+63 928 451 9023',
      email: 'joshua.mendoza@msun.edu.ph',
      role: 'Vice President'
    },
    {
      id: 'm-3',
      fullName: 'Beatrice Mae Flores',
      contactNumber: '+63 919 332 7811',
      email: 'beatrice.flores@msun.edu.ph',
      role: 'Secretary General'
    },
    {
      id: 'm-4',
      fullName: 'Karlo Emmanuel Tan',
      contactNumber: '+63 927 619 4430',
      email: 'karlo.tan@msun.edu.ph',
      role: 'Treasurer'
    },
    {
      id: 'm-5',
      fullName: 'Althea Nicole Gomez',
      contactNumber: '+63 918 204 8819',
      email: 'althea.gomez@msun.edu.ph',
      role: 'Auditor'
    },
    {
      id: 'm-6',
      fullName: 'Gabriel Angelo Cruz',
      contactNumber: '+63 922 751 3302',
      email: 'gabriel.cruz@msun.edu.ph',
      role: 'Public Information Officer'
    },
    {
      id: 'm-7',
      fullName: 'Corazon Patricia Lim',
      contactNumber: '+63 917 662 9014',
      email: 'corazon.lim@msun.edu.ph',
      role: 'Business Manager'
    },
    {
      id: 'm-8',
      fullName: 'Mark Christopher Diaz',
      contactNumber: '+63 928 114 5590',
      email: 'mark.diaz@msun.edu.ph',
      role: 'Logistics Head'
    },
    {
      id: 'm-9',
      fullName: adv,
      contactNumber: '+63 917 000 8821',
      email: `${adv.toLowerCase().replace(/[^a-z]/g, '.')}@msun.edu.ph`,
      role: 'Faculty Adviser'
    }
  ];
});

// Filtered members by search query
const filteredMembers = computed(() => {
  const list = defaultMembers.value;
  if (!searchMemberQuery.value.trim()) return list;
  const q = searchMemberQuery.value.toLowerCase();
  return list.filter(m => 
    m.fullName.toLowerCase().includes(q) || 
    m.email.toLowerCase().includes(q) ||
    m.contactNumber.includes(q) ||
    m.role.toLowerCase().includes(q)
  );
});

// Default objectives if org.objectives is empty
const defaultObjectives = computed<string[]>(() => {
  if (!props.organization) return [];
  if (props.organization.objectives && props.organization.objectives.length > 0) {
    return props.organization.objectives;
  }
  return [
    `Represent and support the academic welfare and student concerns of all member students in ${props.organization.name}.`,
    `Implement approved action plan activities, student seminars, leadership workshops, and community outreach projects.`,
    `Maintain transparent financial records, active meeting records, and collaboration with the Office of Student Affairs.`,
    `Support student skills development, academic training, and organization activities across member courses.`
  ];
});

const handleDownloadFile = (fileName: string) => {
  // Simulate file download
  const blob = new Blob([`Official Document Content for ${fileName}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  emit('showToast', 'Download Started', `Downloading ${fileName}...`, 'success');
};
</script>

<template>
  <div v-if="isOpen && organization">
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      @click.self="emit('close')"
    >
      <!-- Main Profile Modal Container -->
      <div class="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        <!-- Top Modal Header Banner -->
        <div class="px-6 py-5 bg-slate-900 text-white border-b border-slate-800 relative">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <div 
                class="w-12 h-12 rounded-xl font-black flex items-center justify-center shrink-0 shadow-sm border"
                :class="[
                  ORG_COLORS[organization.id]?.badgeBg || 'bg-blue-50', 
                  ORG_COLORS[organization.id]?.badgeText || 'text-blue-700',
                  ORG_COLORS[organization.id]?.badgeBorder || 'border-blue-300',
                  organization.acronym.length > 4 ? 'text-xs tracking-tight px-1' : 'text-sm tracking-wider'
                ]"
              >
                {{ organization.acronym }}
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {{ organization.registeredNumber }}
                  </span>
                  <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {{ organization.status }}
                  </span>
                </div>
                <h2 class="text-base sm:text-lg font-extrabold text-white leading-tight">
                  {{ organization.name }}
                </h2>
              </div>
            </div>

            <button
              @click="emit('close')"
              title="Close Profile"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- 3-Tab Header Bar -->
        <div class="bg-slate-50 border-b border-slate-200/90 px-6 shrink-0 flex items-center gap-2">
          <!-- Overview Tab -->
          <button
            @click="activeTab = 'overview'"
            class="py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2"
            :class="activeTab === 'overview'
              ? 'border-blue-900 text-blue-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            <Info class="w-4 h-4" />
            <span>Overview</span>
          </button>

          <!-- Members Tab -->
          <button
            @click="activeTab = 'members'"
            class="py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2"
            :class="activeTab === 'members'
              ? 'border-blue-900 text-blue-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            <Users class="w-4 h-4" />
            <span>Members</span>
            <span 
              class="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              :class="activeTab === 'members' ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-600'"
            >
              {{ defaultMembers.length }}
            </span>
          </button>

          <!-- Attachments Tab -->
          <button
            @click="activeTab = 'attachments'"
            class="py-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2"
            :class="activeTab === 'attachments'
              ? 'border-blue-900 text-blue-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            <Paperclip class="w-4 h-4" />
            <span>Attachments</span>
            <span 
              class="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
              :class="activeTab === 'attachments' ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-600'"
            >
              {{ organization.attachments?.length || 0 }}
            </span>
          </button>
        </div>

        <!-- Modal Body Content -->
        <div class="p-6 overflow-y-auto flex-1 text-slate-800 space-y-5">

          <!-- ==================== TAB 1: OVERVIEW ==================== -->
          <div v-if="activeTab === 'overview'" class="space-y-5 animate-in fade-in duration-200">
            <!-- Basic Details Card Grid -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                <Building2 class="w-5 h-5 text-blue-900" />
                <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Organization Specification Details
                </h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <!-- 1. Name of the Organization -->
                <div class="space-y-1">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Name of the Organization
                  </span>
                  <strong class="text-sm font-extrabold text-slate-900 block leading-snug">
                    {{ organization.name }}
                  </strong>
                </div>

                <!-- 2. Registration Number -->
                <div class="space-y-1">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Registration Number
                  </span>
                  <strong class="text-xs sm:text-sm font-extrabold text-blue-900 block bg-white px-3 py-1.5 rounded-lg border border-slate-200/80">
                    {{ organization.registeredNumber }}
                  </strong>
                </div>

                <!-- 3. Date of Application -->
                <div class="space-y-1">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Date of Application
                  </span>
                  <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar class="w-3.5 h-3.5 text-blue-600" />
                    <span>{{ organization.dateOfApplication || 'October 12, 2025' }}</span>
                  </span>
                </div>

                <!-- 4. Nature of Organization -->
                <div class="space-y-1">
                  <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nature of Organization
                  </span>
                  <span class="text-xs font-semibold text-slate-800 block bg-white px-3 py-1.5 rounded-lg border border-slate-200/80">
                    {{ organization.nature }}
                  </span>
                </div>
              </div>

            </div>

            <!-- 5. Objectives of the Organization -->
            <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <div class="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Target class="w-5 h-5 text-blue-900" />
                <h4 class="text-sm font-extrabold text-slate-900">Objectives of the Organization</h4>
              </div>

              <div class="space-y-2.5 text-xs">
                <div 
                  v-for="(obj, idx) in defaultObjectives" 
                  :key="idx"
                  class="flex items-start gap-2.5 text-slate-700 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60"
                >
                  <CheckCircle2 class="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <span class="leading-relaxed font-medium">{{ obj }}</span>
                </div>
              </div>
            </div>
          </div>


          <!-- ==================== TAB 2: MEMBERS ==================== -->
          <div v-else-if="activeTab === 'members'" class="space-y-4 animate-in fade-in duration-200">
            <!-- Top Controls Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users class="w-4 h-4 text-blue-900" />
                  <span>Organization Roster & Contact Directory</span>
                </h4>
                <p class="text-xs text-slate-500">
                  Full names, contact numbers, and email addresses for organization members
                </p>
              </div>

              <!-- Search Member Input -->
              <div class="relative w-full sm:w-64">
                <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  v-model="searchMemberQuery"
                  placeholder="Filter by name, email..."
                  class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                />
              </div>
            </div>

            <!-- Members Table -->
            <div class="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th class="p-3">Full Name</th>
                    <th class="p-3">Contact Number</th>
                    <th class="p-3">Email Address</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr 
                    v-for="member in filteredMembers" 
                    :key="member.id"
                    class="hover:bg-slate-50/70 transition-colors"
                  >
                    <!-- Full Name -->
                    <td class="p-3">
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs shrink-0">
                          {{ member.fullName.charAt(0) }}
                        </div>
                        <span class="font-bold text-slate-900 text-xs">{{ member.fullName }}</span>
                      </div>
                    </td>

                    <!-- Contact Number -->
                    <td class="p-3 text-slate-700 text-xs">
                      <div class="flex items-center gap-1.5">
                        <Phone class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{{ member.contactNumber }}</span>
                      </div>
                    </td>

                    <!-- Email Address -->
                    <td class="p-3 font-medium text-slate-800 text-xs">
                      <div class="flex items-center gap-1.5">
                        <Mail class="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span class="text-blue-900 underline">{{ member.email }}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>


          <!-- ==================== TAB 3: ATTACHMENTS ==================== -->
          <div v-else-if="activeTab === 'attachments'" class="space-y-4 animate-in fade-in duration-200">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Paperclip class="w-4 h-4 text-blue-900" />
                  <span>Attached Accreditation Documents</span>
                </h4>
                <p class="text-xs text-slate-500">
                  Official university filings, constitutions, and audit reports
                </p>
              </div>

              <span class="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {{ organization.attachments?.length || 0 }} Attached Files
              </span>
            </div>

            <!-- Attachments List -->
            <div v-if="organization.attachments && organization.attachments.length > 0" class="space-y-3">
              <div 
                v-for="att in organization.attachments" 
                :key="att.id"
                class="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:bg-white transition-all shadow-2xs gap-3"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold shrink-0">
                    <FileText class="w-5 h-5" />
                  </div>

                  <div>
                    <h5 class="text-xs font-bold text-slate-900 leading-snug">
                      {{ att.title }}
                    </h5>
                    <div class="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <span>Format: <strong class="text-slate-700">{{ att.type }}</strong></span>
                      <span>Size: <strong class="text-slate-700">{{ att.fileSize }}</strong></span>
                      <span>Uploaded: <strong class="text-slate-700">{{ att.uploadDate }}</strong></span>
                    </div>
                  </div>
                </div>

                <!-- Download Button -->
                <button
                  @click="handleDownloadFile(att.title)"
                  class="btn-secondary btn-sm shrink-0 self-start sm:self-auto"
                >
                  <Download class="w-4 h-4 text-blue-600" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <!-- Fallback if no attachments -->
            <div v-else class="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Paperclip class="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p class="text-xs font-bold text-slate-700">No Attachments Available</p>
              <p class="text-[11px] text-slate-500 mt-0.5">No files attached to this organization record.</p>
            </div>
          </div>

        </div>

        <!-- Modal Footer Bar -->
        <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span class="text-[11px] text-slate-400">
            Institutional Registry • MSUN Student Affairs
          </span>
          <button
            @click="emit('close')"
            class="btn-secondary btn-sm cursor-pointer"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
