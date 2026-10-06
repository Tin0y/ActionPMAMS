<script setup lang="ts">
import { ref, computed } from 'vue';
import { ActionPlanFolder, Activity } from '../types';
import { 
  FolderPlus, 
  Folder, 
  Search, 
  Calendar, 
  Coins, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Unlock, 
  X, 
  Save, 
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  Eye,
  AlertTriangle
} from 'lucide-vue-next';

const props = defineProps<{
  folders: ActionPlanFolder[];
  activities?: Activity[];
}>();

const emit = defineEmits<{
  (e: 'createFolder', folder: Omit<ActionPlanFolder, 'id' | 'createdAt' | 'totalActivitiesCount' | 'approvedCount' | 'pendingCount'>): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

const searchQuery = ref('');
const statusFilter = ref<string>('ALL');
const isCreateFolderModalOpen = ref(false);
const fiscalYearInput = ref('');
const selectedFolderForExplorer = ref<string | null>(null);
const explorerSearch = ref('');

const filteredFolders = computed(() => {
  return props.folders.filter((f) => {
    const matchesSearch = 
      f.fiscalYear.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      f.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (f.theme && f.theme.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      f.description.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesStatus = statusFilter.value === 'ALL' || f.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const folderActivitiesList = computed(() => {
  if (!selectedFolderForExplorer.value || !props.activities) return [];
  const fy = selectedFolderForExplorer.value.toLowerCase();
  const q = explorerSearch.value.trim().toLowerCase();

  return props.activities.filter((act) => {
    const actYear = (act.fiscalYear || '').toLowerCase();
    const matchesYear = actYear === fy || actYear.includes(fy.replace('fy', '').trim());
    if (!matchesYear) return false;

    if (!q) return true;
    return act.title.toLowerCase().includes(q) ||
           act.orgId.toLowerCase().includes(q) ||
           (act.venue && act.venue.toLowerCase().includes(q)) ||
           act.status.toLowerCase().includes(q);
  });
});

const handleOpenCreateModal = () => {
  fiscalYearInput.value = `${new Date().getFullYear() + 2}`;
  isCreateFolderModalOpen.value = true;
};

const handleSaveCreateFolder = () => {
  const rawInput = fiscalYearInput.value.trim();
  if (!rawInput) {
    emit('showToast', 'Validation Error', 'Please input the Fiscal Year.', 'warning');
    return;
  }

  // Normalize: if user enters e.g. "2028", formatted as "FY 2028"
  let normalizedFY = rawInput;
  const digitsMatch = rawInput.match(/\d{4}/);
  const yearDigits = digitsMatch ? digitsMatch[0] : rawInput;
  
  if (/^\d{4}$/.test(rawInput)) {
    normalizedFY = `FY ${rawInput}`;
  } else if (/^fy\s*\d{4}$/i.test(rawInput)) {
    normalizedFY = `FY ${yearDigits}`;
  }

  // Check if folder for this Fiscal Year already exists
  const alreadyExists = props.folders.some(
    f => f.fiscalYear.toLowerCase() === normalizedFY.toLowerCase()
  );
  if (alreadyExists) {
    emit('showToast', 'Duplicate Fiscal Year', `An Action Plan repository for ${normalizedFY} already exists.`, 'warning');
    return;
  }

  emit('createFolder', {
    fiscalYear: normalizedFY,
    title: `Fiscal Year ${yearDigits} Strategic Action Plan Repository`,
    theme: 'Advancing Academic Leadership, Climate Stewardship & Student Empowerment',
    submissionDeadline: `${yearDigits}-10-31`,
    allocatedBudget: 650000,
    description: `Official master repository for storing and approving all organization activities for Fiscal Year ${yearDigits}.`,
    status: 'Open',
    createdBy: 'System Administrator'
  });

  isCreateFolderModalOpen.value = false;
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header Banner -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Action Plan Folders
            </span>
            <span class="text-xs text-slate-500">Mindanao State University at Naawan</span>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Action Plans by Fiscal Year
          </h2>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl">
            Create and maintain action plan folders for each fiscal year where student organizations submit their annual plans and activities.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Create Action Plan Button -->
          <button
            @click="handleOpenCreateModal"
            class="btn-primary"
          >
            <FolderPlus class="w-4 h-4" />
            <span>Create Action Plan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Search & Filters Container -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
      <div class="relative flex-1 w-full">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search action plans by fiscal year, title, strategic theme, or keywords..."
          class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      </div>

      <div class="flex items-center gap-2 w-full sm:w-auto">
        <select
          v-model="statusFilter"
          class="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto cursor-pointer"
        >
          <option value="ALL">All Statuses ({{ folders.length }})</option>
          <option value="Open">Open for Submissions</option>
          <option value="Locked">Locked / Finalized</option>
          <option value="Archived">Archived</option>
        </select>
      </div>
    </div>

    <!-- Container that has a List of all Action Plans -->
    <div class="space-y-4">
      <div
        v-if="filteredFolders.length === 0"
        class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center"
      >
        <Folder class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 class="text-sm font-bold text-slate-800">No Action Plan Repositories Found</h3>
        <p class="text-xs text-slate-500 mt-1">Try adjusting your search criteria or create a new Fiscal Year repository folder.</p>
      </div>

      <div
        v-for="folder in filteredFolders"
        :key="folder.id"
        class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 hover:border-slate-300 transition-all"
      >
        <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <!-- Left: Folder Identity & Descriptions -->
          <div class="flex items-start gap-4 flex-1">
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs"
              :class="folder.status === 'Open'
                ? 'bg-blue-100 text-blue-700'
                : folder.status === 'Locked'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'"
            >
              <Folder class="w-6 h-6" />
            </div>

            <div class="space-y-1.5 flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                  {{ folder.fiscalYear }}
                </span>
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1"
                  :class="folder.status === 'Open'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : folder.status === 'Locked'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'"
                >
                  <Unlock v-if="folder.status === 'Open'" class="w-3 h-3 text-emerald-600" />
                  <Lock v-else class="w-3 h-3 text-amber-600" />
                  <span>{{ folder.status === 'Open' ? 'Active / Open for Activities' : folder.status }}</span>
                </span>
                <span class="text-[10px] text-slate-400">ID: {{ folder.id }}</span>
              </div>

              <h3 class="text-base font-bold text-slate-900 leading-snug">
                {{ folder.title }}
              </h3>

              <p v-if="folder.theme" class="text-xs text-blue-700 font-medium italic">
                Strategic Theme: “{{ folder.theme }}”
              </p>

              <p class="text-xs text-slate-600 leading-relaxed pt-1">
                {{ folder.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Folder Footer & Action Bar -->
        <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div class="text-[11px] text-slate-500">
            Created on <span class="font-medium text-slate-700">{{ folder.createdAt }}</span> by {{ folder.createdBy }}
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="selectedFolderForExplorer = folder.fiscalYear; explorerSearch = ''"
              class="btn-info btn-sm cursor-pointer"
            >
              <span>Explore Activities in {{ folder.fiscalYear }}</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Repository Explorer Modal for System Admin -->
    <div
      v-if="selectedFolderForExplorer"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      @click.self="selectedFolderForExplorer = null"
    >
      <div class="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        <!-- Explorer Header -->
        <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Folder class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-slate-900 leading-tight">
                  Repository Explorer: {{ selectedFolderForExplorer }}
                </h3>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {{ folderActivitiesList.length }} Registered Activities
                </span>
              </div>
              <p class="text-xs text-slate-500">
                Action plan folder contents (System Administration View)
              </p>
            </div>
          </div>

          <button
            @click="selectedFolderForExplorer = null"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Explorer Search & Filter Bar -->
        <div class="p-4 border-b border-slate-100 bg-white">
          <div class="relative">
            <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="explorerSearch"
              type="text"
              placeholder="Search by title, organization (e.g. CBIT, SSC), venue, status..."
              class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <!-- Activities List Table / Cards -->
        <div class="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          <div v-if="folderActivitiesList.length === 0" class="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            <Folder class="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p class="font-bold text-slate-700">No activities found in {{ selectedFolderForExplorer }}</p>
            <p class="text-slate-400 mt-1">Activities submitted by student organizations under this Fiscal Year will appear here.</p>
          </div>

          <div
            v-for="act in folderActivitiesList"
            :key="act.id"
            class="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-900 text-white">
                  {{ act.orgId }}
                </span>
                <span class="text-xs font-bold text-slate-900 truncate">
                  {{ act.title }}
                </span>
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  :class="act.status === 'Approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : act.status.includes('DEFERRED')
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'"
                >
                  {{ act.status }}
                </span>
              </div>

              <p class="text-xs text-slate-500 truncate max-w-xl">
                {{ act.description }}
              </p>

              <div class="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                <span>Date: <strong class="text-slate-600">{{ act.startDate }}</strong></span>
                <span>•</span>
                <span>Budget: <strong class="text-emerald-700">₱{{ act.budget.toLocaleString() }}</strong></span>
                <span>•</span>
                <span>Venue: <strong class="text-slate-600">{{ act.venue }}</strong></span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                @click="emit('selectActivity', act)"
                class="btn-secondary btn-sm cursor-pointer flex items-center gap-1.5"
              >
                <Eye class="w-3.5 h-3.5" />
                <span>View Details</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Explorer Footer -->
        <div class="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <span class="text-xs text-slate-500">
            Viewing repository records for Fiscal Year <strong class="text-slate-800">{{ selectedFolderForExplorer }}</strong>
          </span>
          <button
            @click="selectedFolderForExplorer = null"
            class="btn-secondary btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Create Action Plan Fiscal Year Modal -->
    <div
      v-if="isCreateFolderModalOpen"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      @click.self="isCreateFolderModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
              <FolderPlus class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 leading-tight">Create Action Plan</h3>
              <p class="text-xs text-slate-500">Provision a Fiscal Year repository for organization activities</p>
            </div>
          </div>
          <button
            @click="isCreateFolderModalOpen = false"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Fiscal Year in that Year <span class="text-rose-500">*</span>
            </label>
            <div class="relative">
              <Calendar class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                v-model="fiscalYearInput"
                type="text"
                placeholder="e.g., 2028 or FY 2028"
                class="w-full pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs"
                @keyup.enter="handleSaveCreateFolder"
                autofocus
              />
            </div>
            <p class="text-xs text-slate-500 mt-2">
              Enter the target Fiscal Year (e.g. <span class="font-semibold text-slate-700">2028</span> or <span class="font-semibold text-slate-700">FY 2028</span>). All institutional folders and approval workflows will be initialized automatically.
            </p>
          </div>
        </div>

        <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            @click="isCreateFolderModalOpen = false"
            class="btn-secondary"
          >
            Cancel
          </button>
          <button
            @click="handleSaveCreateFolder"
            class="btn-primary"
          >
            <FolderPlus class="w-4 h-4" />
            <span>Create Action Plan</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
