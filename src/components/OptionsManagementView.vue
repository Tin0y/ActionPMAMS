<script setup lang="ts">
import { ref, computed } from 'vue';
import { SystemDropdownOption, SystemOptionCategory, Activity, StudentOrganization, UserAccount } from '../types';
import { 
  systemOptions, 
  OPTION_CATEGORIES, 
  OptionCategoryConfig,
  saveDropdownOption,
  toggleDropdownOptionActive,
  deleteDropdownOption,
  reorderDropdownOptions,
  countOptionUsage
} from '../services/optionsService';
import AddOptionModal from './AddOptionModal.vue';
import { 
  Sliders, 
  Plus, 
  Search, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ShieldAlert, 
  ShieldCheck, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Building2,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-vue-next';
import { areVenuesMatching, getActivityConflictSummary, ConflictItem } from '../utils/conflictDetection';

const props = defineProps<{
  activities: Activity[];
  organizations: StudentOrganization[];
  currentUser?: UserAccount | null;
}>();

// UI Filter States
const activeCategoryFilter = ref<string>('ALL');
const searchQuery = ref<string>('');
const statusFilter = ref<'ALL' | 'ACTIVE' | 'DEACTIVATED'>('ALL');

// Modal States
const isAddModalOpen = ref<boolean>(false);
const editingOption = ref<SystemDropdownOption | null>(null);
const feedbackMessage = ref<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

// Venue Reservations Inspection Modal (Section 9)
const isVenueReservationsModalOpen = ref(false);
const selectedVenueForInspection = ref<SystemDropdownOption | null>(null);

const handleInspectVenue = (opt: SystemDropdownOption) => {
  selectedVenueForInspection.value = opt;
  isVenueReservationsModalOpen.value = true;
};

const venueActivities = computed(() => {
  if (!selectedVenueForInspection.value) return [];
  const vLabel = selectedVenueForInspection.value.label;
  return props.activities.filter(a => {
    const v = a.designForm?.venue || a.venue;
    return areVenuesMatching(v, vLabel);
  });
});

const venueConflicts = computed(() => {
  if (!selectedVenueForInspection.value) return [];
  const vLabel = selectedVenueForInspection.value.label;
  const list: ConflictItem[] = [];
  for (const act of venueActivities.value) {
    const sum = getActivityConflictSummary(act, props.activities);
    if (sum.primaryConflict && areVenuesMatching(sum.primaryConflict.conflictingVenue, vLabel)) {
      list.push(sum.primaryConflict);
    }
  }
  return list;
});

const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
  feedbackMessage.value = { type, text };
  setTimeout(() => {
    if (feedbackMessage.value?.text === text) {
      feedbackMessage.value = null;
    }
  }, 4500);
};

// Summary Metrics
const totalOptionsCount = computed(() => systemOptions.value.length);

// Filtered Options List
const filteredOptions = computed(() => {
  return systemOptions.value.filter(opt => {
    // Category filter
    if (activeCategoryFilter.value !== 'ALL' && opt.category !== activeCategoryFilter.value) {
      return false;
    }
    // Status filter
    if (statusFilter.value === 'ACTIVE' && opt.isActive === false) {
      return false;
    }
    if (statusFilter.value === 'DEACTIVATED' && opt.isActive !== false) {
      return false;
    }
    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchValue = opt.value.toLowerCase().includes(q);
      const matchDesc = (opt.description || '').toLowerCase().includes(q);
      const matchCat = opt.category.toLowerCase().includes(q);
      if (!matchLabel && !matchValue && !matchDesc && !matchCat) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return (a.order - b.order) || a.label.localeCompare(b.label);
  });
});

// Category lookup helper
const getCategoryConfig = (catKey: string): OptionCategoryConfig => {
  return OPTION_CATEGORIES.find(c => c.key === catKey) || {
    key: 'other' as SystemOptionCategory,
    name: catKey,
    description: 'System Configurable Option',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200'
  };
};

// Usage calculation
const getUsage = (opt: SystemDropdownOption) => {
  return countOptionUsage(opt.category, opt.value, props.activities, props.organizations);
};

// Actions
const handleToggleActive = async (opt: SystemDropdownOption) => {
  try {
    const updated = await toggleDropdownOptionActive(opt.id);
    if (updated) {
      showFeedback('success', `Option "${opt.label}" is now ${updated.isActive ? 'Active' : 'Deactivated'}.`);
    }
  } catch (err: any) {
    showFeedback('error', err.message || 'Failed to update status.');
  }
};

const handleEdit = (opt: SystemDropdownOption) => {
  editingOption.value = opt;
  isAddModalOpen.value = true;
};

const handleDelete = async (opt: SystemDropdownOption) => {
  if (opt.isSystemProtected) {
    showFeedback('error', `Cannot delete "${opt.label}" because it is a protected system option.`);
    return;
  }

  const usage = getUsage(opt);
  if (usage.count > 0) {
    showFeedback(
      'error', 
      `"${opt.label}" is referenced by ${usage.count} record(s) and cannot be deleted. Deactivate it instead to preserve historical records.`
    );
    return;
  }

  if (!confirm(`Are you sure you want to permanently remove the option "${opt.label}"?`)) {
    return;
  }

  const res = await deleteDropdownOption(opt.id, props.activities, props.organizations);
  if (res.success) {
    showFeedback('success', `Removed option "${opt.label}".`);
  } else {
    showFeedback('error', res.message || 'Failed to delete option.');
  }
};

const handleMoveUp = async (opt: SystemDropdownOption) => {
  const sameCat = systemOptions.value
    .filter(o => o.category === opt.category)
    .sort((a, b) => a.order - b.order);

  const idx = sameCat.findIndex(o => o.id === opt.id);
  if (idx > 0) {
    const prev = sameCat[idx - 1];
    const prevOrder = prev.order;
    prev.order = opt.order;
    opt.order = prevOrder;
    await reorderDropdownOptions(opt.category, sameCat.map(o => o.id));
    showFeedback('info', `Moved "${opt.label}" up.`);
  }
};

const handleMoveDown = async (opt: SystemDropdownOption) => {
  const sameCat = systemOptions.value
    .filter(o => o.category === opt.category)
    .sort((a, b) => a.order - b.order);

  const idx = sameCat.findIndex(o => o.id === opt.id);
  if (idx < sameCat.length - 1) {
    const next = sameCat[idx + 1];
    const nextOrder = next.order;
    next.order = opt.order;
    opt.order = nextOrder;
    await reorderDropdownOptions(opt.category, sameCat.map(o => o.id));
    showFeedback('info', `Moved "${opt.label}" down.`);
  }
};

const onModalClose = () => {
  isAddModalOpen.value = false;
  editingOption.value = null;
};

const onOptionSaved = (opt: SystemDropdownOption) => {
  showFeedback('success', `Successfully saved option "${opt.label}".`);
};
</script>

<template>
  <div class="h-full flex flex-col bg-slate-50 overflow-y-auto">
    
    <!-- Top Header Banner -->
    <div class="bg-white border-b border-slate-200 px-6 py-5 shrink-0">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase bg-blue-100 text-blue-800 tracking-wider">
              System Administration
            </span>
            <span class="text-slate-300">&bull;</span>
            <span class="text-xs font-bold text-slate-500">APMAMS UPDATE 7</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Dropdown & Options Management</span>
          </h1>
          <p class="text-xs text-slate-500 mt-1 max-w-2xl">
            Centralized database-driven configuration for all dropdowns, choices, and selection lists across the university system.
          </p>
        </div>

        <!-- Add Option Button -->
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            @click="editingOption = null; isAddModalOpen = true"
            class="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-900/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus class="w-4 h-4 stroke-[2.5]" />
            <span>Add New Option</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Alert / Feedback Notification -->
    <div v-if="feedbackMessage" class="max-w-7xl mx-auto w-full px-6 pt-4 shrink-0">
      <div
        class="p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2"
        :class="{
          'bg-emerald-50 border-emerald-200 text-emerald-800': feedbackMessage.type === 'success',
          'bg-rose-50 border-rose-200 text-rose-800': feedbackMessage.type === 'error',
          'bg-blue-50 border-blue-200 text-blue-800': feedbackMessage.type === 'info'
        }"
      >
        <div class="flex items-center gap-2">
          <CheckCircle2 v-if="feedbackMessage.type === 'success'" class="w-4 h-4 text-emerald-600 shrink-0" />
          <AlertTriangle v-else-if="feedbackMessage.type === 'error'" class="w-4 h-4 text-rose-600 shrink-0" />
          <Info v-else class="w-4 h-4 text-blue-600 shrink-0" />
          <span>{{ feedbackMessage.text }}</span>
        </div>
        <button @click="feedbackMessage = null" class="text-slate-400 hover:text-slate-700">
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="max-w-7xl mx-auto w-full px-6 py-6 space-y-6 flex-1">
      
      <!-- Category Filter Pills Bar -->
      <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Category:</span>
          <span class="text-[11px] text-slate-400">{{ filteredOptions.length }} options shown</span>
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            @click="activeCategoryFilter = 'ALL'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0"
            :class="activeCategoryFilter === 'ALL' ? 'bg-blue-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            All Categories ({{ totalOptionsCount }})
          </button>

          <button
            v-for="cat in OPTION_CATEGORIES"
            :key="cat.key"
            type="button"
            @click="activeCategoryFilter = cat.key"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5"
            :class="activeCategoryFilter === cat.key ? 'bg-blue-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            <span>{{ cat.name }}</span>
            <span class="text-[10px] opacity-75">({{ systemOptions.filter(o => o.category === cat.key).length }})</span>
          </button>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Search Input (Expanded/Stretched to fill available space consistent with other views) -->
        <div class="relative flex-1 w-full">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search option name, value, description..."
            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <!-- Status Filter Selector -->
        <div class="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <span class="text-xs font-bold text-slate-500">Status:</span>
          <div class="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              @click="statusFilter = 'ALL'"
              class="px-2.5 py-1 rounded-lg transition cursor-pointer"
              :class="statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'"
            >
              All
            </button>
            <button
              type="button"
              @click="statusFilter = 'ACTIVE'"
              class="px-2.5 py-1 rounded-lg transition cursor-pointer"
              :class="statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-2xs' : 'hover:text-slate-900'"
            >
              Active
            </button>
            <button
              type="button"
              @click="statusFilter = 'DEACTIVATED'"
              class="px-2.5 py-1 rounded-lg transition cursor-pointer"
              :class="statusFilter === 'DEACTIVATED' ? 'bg-white text-slate-700 shadow-2xs' : 'hover:text-slate-900'"
            >
              Deactivated
            </button>
          </div>
        </div>
      </div>

      <!-- Options Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th class="py-3 px-3 w-16 text-center">Order</th>
                <th class="py-3 px-4">Option Name & Label</th>
                <th class="py-3 px-3">Category</th>
                <th class="py-3 px-3">Usage in Records</th>
                <th class="py-3 px-3 text-center w-28">Status</th>
                <th class="py-3 px-4 text-right w-44">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr 
                v-for="opt in filteredOptions" 
                :key="opt.id" 
                class="hover:bg-slate-50/80 transition-colors"
                :class="{ 'opacity-60 bg-slate-50/40': opt.isActive === false }"
              >
                <!-- Order & Move Buttons -->
                <td class="py-3 px-3 text-center">
                  <div class="flex items-center justify-center gap-1 font-mono font-bold text-slate-700">
                    <div class="flex flex-col gap-0.5">
                      <button
                        type="button"
                        @click="handleMoveUp(opt)"
                        title="Move Up"
                        class="p-0.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <ArrowUp class="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        @click="handleMoveDown(opt)"
                        title="Move Down"
                        class="p-0.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <ArrowDown class="w-3 h-3" />
                      </button>
                    </div>
                    <span>{{ opt.order }}</span>
                  </div>
                </td>

                <!-- Option Label & Value -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-900 text-xs">{{ opt.label }}</span>
                    <span 
                      v-if="opt.isSystemProtected" 
                      title="System protected option" 
                      class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1"
                    >
                      <ShieldCheck class="w-3 h-3 text-amber-600" />
                      <span>Protected</span>
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span class="font-mono">val: "{{ opt.value }}"</span>
                    <span v-if="opt.description" class="italic">&bull; {{ opt.description }}</span>
                  </div>
                </td>

                <!-- Category Badge -->
                <td class="py-3 px-3">
                  <span 
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-block"
                    :class="getCategoryConfig(opt.category).badgeColor"
                  >
                    {{ getCategoryConfig(opt.category).name }}
                  </span>
                </td>

                <!-- Usage in Records -->
                <td class="py-3 px-3">
                  <div v-if="getUsage(opt).count > 0" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                    <span>Used in {{ getUsage(opt).count }} record(s)</span>
                  </div>
                  <div v-else class="text-slate-400 text-[11px]">
                    Unused (0 records)
                  </div>
                </td>

                <!-- Status Badge -->
                <td class="py-3 px-3 text-center">
                  <button
                    type="button"
                    @click="handleToggleActive(opt)"
                    title="Click to toggle Active / Deactivated"
                    class="px-2.5 py-1 rounded-full text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                    :class="opt.isActive !== false ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="opt.isActive !== false ? 'bg-emerald-600' : 'bg-slate-500'"></span>
                    <span>{{ opt.isActive !== false ? 'Active' : 'Deactivated' }}</span>
                  </button>
                </td>

                <!-- Actions -->
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Venue Reservations & Conflicts Inspection Button (Section 9) -->
                    <button
                      v-if="opt.category === 'venue'"
                      type="button"
                      @click="handleInspectVenue(opt)"
                      title="View Venue Reservations & Unresolved Conflicts"
                      class="p-1.5 text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg transition cursor-pointer"
                    >
                      <Building2 class="w-3.5 h-3.5" />
                    </button>

                    <!-- Edit Button -->
                    <button
                      type="button"
                      @click="handleEdit(opt)"
                      title="Edit Option"
                      class="p-1.5 text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition cursor-pointer"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                    </button>

                    <!-- Toggle Deactivate Button -->
                    <button
                      type="button"
                      @click="handleToggleActive(opt)"
                      :title="opt.isActive !== false ? 'Deactivate Option' : 'Reactivate Option'"
                      class="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                    >
                      <RotateCcw v-if="opt.isActive === false" class="w-3.5 h-3.5 text-emerald-600" />
                      <X v-else class="w-3.5 h-3.5" />
                    </button>

                    <!-- Delete Button (Only for unused & non-protected options) -->
                    <button
                      type="button"
                      @click="handleDelete(opt)"
                      :disabled="opt.isSystemProtected || getUsage(opt).count > 0"
                      :title="
                        opt.isSystemProtected 
                          ? 'Protected system option cannot be deleted' 
                          : (getUsage(opt).count > 0 
                              ? `Referenced by ${getUsage(opt).count} records. Deactivate instead to preserve historical data.` 
                              : 'Permanently Remove Option')
                      "
                      class="p-1.5 rounded-lg border transition cursor-pointer"
                      :class="
                        (opt.isSystemProtected || getUsage(opt).count > 0)
                          ? 'text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                          : 'text-rose-600 hover:bg-rose-50 border-rose-200 hover:border-rose-300'
                      "
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-if="filteredOptions.length === 0">
                <td colspan="6" class="py-12 text-center text-slate-400">
                  <Sliders class="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p class="font-bold text-slate-600 text-sm">No dropdown options found</p>
                  <p class="text-xs text-slate-400 mt-0.5">Try adjusting your category filter or search keywords.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Add / Edit Option Modal -->
    <AddOptionModal
      :is-open="isAddModalOpen"
      :category="activeCategoryFilter !== 'ALL' ? activeCategoryFilter : undefined"
      :edit-option="editingOption"
      @close="onModalClose"
      @saved="onOptionSaved"
    />

    <!-- Venue Schedule & Conflicts Inspection Modal (Section 9) -->
    <div
      v-if="isVenueReservationsModalOpen && selectedVenueForInspection"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      @click.self="isVenueReservationsModalOpen = false"
    >
      <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Building2 class="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900">
                Venue Management: {{ selectedVenueForInspection.label }}
              </h3>
              <p class="text-xs text-slate-500">
                System Administrator Reservations & Conflict Audit
              </p>
            </div>
          </div>
          <button 
            @click="isVenueReservationsModalOpen = false"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-4 pr-1">
          <!-- Venue Details Summary -->
          <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span class="text-slate-500 block">Identifier:</span>
              <strong class="text-slate-900">{{ selectedVenueForInspection.id }}</strong>
            </div>
            <div>
              <span class="text-slate-500 block">Status:</span>
              <span 
                class="font-bold text-xs"
                :class="selectedVenueForInspection.isActive !== false ? 'text-emerald-700' : 'text-slate-500'"
              >
                {{ selectedVenueForInspection.isActive !== false ? 'Active & Available' : 'Deactivated' }}
              </span>
            </div>
            <div>
              <span class="text-slate-500 block">Active Bookings:</span>
              <strong class="text-blue-700">{{ venueActivities.length }} Activity Record(s)</strong>
            </div>
          </div>

          <!-- Unresolved Conflicts Section -->
          <div v-if="venueConflicts.length > 0" class="space-y-2">
            <div class="flex items-center gap-1.5 text-xs font-black text-red-900">
              <AlertTriangle class="w-4 h-4 text-red-600" />
              <span>Unresolved Scheduling Conflicts Detected:</span>
            </div>

            <div 
              v-for="c in venueConflicts" 
              :key="c.id"
              class="p-3 rounded-xl border border-red-200 bg-red-50/70 text-xs text-red-950 space-y-1"
            >
              <div class="flex items-center justify-between">
                <span class="font-extrabold">{{ c.title }}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 uppercase">
                  {{ c.type.replace('_', ' ') }}
                </span>
              </div>
              <p class="text-[11px] text-red-800">{{ c.message }}</p>
            </div>
          </div>

          <div v-else class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No unresolved scheduling conflicts detected for this venue.</span>
          </div>

          <!-- Scheduled Activities List -->
          <div>
            <h4 class="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Scheduled Proposals & Reservations:</span>
              <span class="text-[11px] text-slate-400 font-normal">{{ venueActivities.length }} scheduled</span>
            </h4>

            <div v-if="venueActivities.length > 0" class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th class="p-2.5">Date</th>
                    <th class="p-2.5">Council</th>
                    <th class="p-2.5">Activity</th>
                    <th class="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="act in venueActivities" :key="act.id" class="hover:bg-slate-50">
                    <td class="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                      {{ act.designForm?.dateImplementation || act.startDate }}
                    </td>
                    <td class="p-2.5">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800 border uppercase">
                        {{ act.orgId }}
                      </span>
                    </td>
                    <td class="p-2.5 text-slate-800 font-medium">
                      {{ act.title }}
                    </td>
                    <td class="p-2.5">
                      <span 
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        :class="act.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                      >
                        {{ act.status === 'Approved' ? 'Confirmed' : 'Tentative' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              No active Action Plan proposals or DAD reservations currently target this venue.
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-end shrink-0">
          <button
            @click="isVenueReservationsModalOpen = false"
            class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

