<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import { SystemDropdownOption, SystemOptionCategory } from '../types';
import { OPTION_CATEGORIES, saveDropdownOption } from '../services/optionsService';
import { X, Plus, Check, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  category?: SystemOptionCategory | string;
  categoryName?: string;
  editOption?: SystemDropdownOption | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', option: SystemDropdownOption): void;
}>();

const selectedCategory = ref<string>('fund_source');
const label = ref<string>('');
const value = ref<string>('');
const description = ref<string>('');
const order = ref<number>(1);
const isActive = ref<boolean>(true);
const isSubmitting = ref<boolean>(false);
const errorMessage = ref<string>('');
const nameInputRef = ref<HTMLInputElement | null>(null);

const isEditing = computed(() => !!props.editOption);

const resolvedCategoryName = computed(() => {
  if (props.categoryName) return props.categoryName;
  const found = OPTION_CATEGORIES.find(c => c.key === selectedCategory.value);
  return found ? found.name : selectedCategory.value;
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      errorMessage.value = '';
      if (props.editOption) {
        selectedCategory.value = props.editOption.category;
        label.value = props.editOption.label;
        value.value = props.editOption.value;
        description.value = props.editOption.description || '';
        order.value = props.editOption.order || 1;
        isActive.value = props.editOption.isActive !== false;
      } else {
        selectedCategory.value = props.category || 'fund_source';
        label.value = '';
        value.value = '';
        description.value = '';
        order.value = 1;
        isActive.value = true;
      }
      nextTick(() => {
        nameInputRef.value?.focus();
      });
    }
  },
  { immediate: true }
);

// Auto-sync value with label for new options unless manually modified
const onLabelInput = () => {
  if (!isEditing.value && (!value.value || value.value === label.value.slice(0, -1))) {
    value.value = label.value;
  }
};

const handleSave = async () => {
  if (!label.value.trim()) {
    errorMessage.value = 'Please enter an option name.';
    nameInputRef.value?.focus();
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const saved = await saveDropdownOption({
      id: props.editOption?.id,
      category: selectedCategory.value as SystemOptionCategory,
      label: label.value.trim(),
      value: (value.value || label.value).trim(),
      description: description.value.trim(),
      order: Number(order.value) || 1,
      isActive: isActive.value,
      isSystemProtected: props.editOption?.isSystemProtected || false
    });

    emit('saved', saved);
    emit('close');
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to save option.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
      
      <!-- Modal Header -->
      <div class="px-5 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold">
            <Plus v-if="!isEditing" class="w-4 h-4 text-white" />
            <span v-else class="text-xs">✎</span>
          </div>
          <div>
            <h3 class="text-sm font-black tracking-tight">
              {{ isEditing ? 'Edit Dropdown Option' : 'Add New Option' }}
            </h3>
            <p class="text-[11px] text-blue-100/80">
              {{ isEditing ? 'Update option in' : 'Create new option for' }} <strong class="text-white">{{ resolvedCategoryName }}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body Form -->
      <form @submit.prevent="handleSave" class="p-5 space-y-4 text-xs">
        
        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2">
          <AlertCircle class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span class="font-medium text-xs leading-relaxed">{{ errorMessage }}</span>
        </div>

        <!-- Category (Read-only or selectable) -->
        <div>
          <label class="block font-bold text-slate-700 mb-1">Target Category</label>
          <select
            v-model="selectedCategory"
            :disabled="!!props.category || isEditing"
            class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-75"
          >
            <option v-for="cat in OPTION_CATEGORIES" :key="cat.key" :value="cat.key">
              {{ cat.name }} ({{ cat.description }})
            </option>
          </select>
        </div>

        <!-- Option Name / Label -->
        <div>
          <label class="block font-bold text-slate-800 mb-1 flex items-center justify-between">
            <span>Option Name / Display Label <span class="text-rose-500">*</span></span>
            <span class="text-[10px] text-slate-400 font-normal">Shown in dropdowns</span>
          </label>
          <input
            ref="nameInputRef"
            type="text"
            required
            v-model="label"
            @input="onLabelInput"
            placeholder="e.g. External Sponsorship / Science Complex"
            class="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
          />
        </div>

        <!-- Optional Description -->
        <div>
          <label class="block font-bold text-slate-700 mb-1">Description / Notes <span class="text-slate-400 font-normal">(Optional)</span></label>
          <input
            type="text"
            v-model="description"
            placeholder="e.g. Approved sponsor funding, donor grants"
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
          />
        </div>

        <!-- Status & Order Row -->
        <div class="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Display Order</label>
            <input
              type="number"
              min="1"
              v-model.number="order"
              class="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            />
          </div>

          <div class="flex items-center pt-5">
            <label class="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="isActive"
                class="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-600"
              />
              <span class="text-xs font-bold text-slate-700">Active Status</span>
            </label>
          </div>
        </div>

        <p class="text-[11px] text-slate-500 italic bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
          Newly added options are saved immediately in the system database and become accessible to all officers in real-time.
        </p>

        <!-- Footer Buttons -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-2 font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-xl transition shadow-md shadow-blue-900/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Option') }}</span>
          </button>
        </div>

      </form>

    </div>
  </div>
</template>

