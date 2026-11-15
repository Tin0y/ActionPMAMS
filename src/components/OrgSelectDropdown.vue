<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Building2, ChevronDown, Check } from 'lucide-vue-next';
import { OrgOptionConfig } from '../utils/organizationUtils';

const props = withDefaults(
  defineProps<{
    id?: string;
    modelValue: string;
    offices: OrgOptionConfig[];
    studentOrgs: OrgOptionConfig[];
    placeholder?: string;
    hasError?: boolean;
  }>(),
  {
    id: undefined,
    placeholder: 'Select Organization / Office',
    hasError: false
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

const isOpen = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const menuStyle = ref<Record<string, string>>({});

const selectedLabel = computed(() => {
  if (!props.modelValue) return '';
  const all = [...props.offices, ...props.studentOrgs];
  return all.find(o => o.value === props.modelValue)?.label || props.modelValue;
});

const updatePosition = () => {
  if (!triggerRef.value || typeof window === 'undefined') return;
  const rect = triggerRef.value.getBoundingClientRect();
  const availableBelow = window.innerHeight - rect.bottom - 12;
  const maxHeight = Math.max(160, Math.min(260, availableBelow));
  menuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${maxHeight}px`
  };
};

const toggleOpen = async () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await nextTick();
    updatePosition();
  }
};

const selectOption = (value: string) => {
  emit('update:modelValue', value);
  emit('change', value);
  isOpen.value = false;
};

const handleDocumentMouseDown = (event: MouseEvent) => {
  if (!isOpen.value) return;
  const target = event.target as Node | null;
  if (
    target &&
    !triggerRef.value?.contains(target) &&
    !menuRef.value?.contains(target)
  ) {
    isOpen.value = false;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
  }
};

const handleViewportChange = () => {
  if (isOpen.value) updatePosition();
};

watch(
  () => props.modelValue,
  () => {
    // Close if model resets externally (e.g. reopening modal)
    if (!props.modelValue && isOpen.value) {
      isOpen.value = false;
    }
  }
);

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentMouseDown);
  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown);
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('resize', handleViewportChange);
  window.removeEventListener('scroll', handleViewportChange, true);
});
</script>

<template>
  <div class="relative">
    <button
      ref="triggerRef"
      :id="id"
      type="button"
      :aria-expanded="isOpen"
      @click="toggleOpen"
      class="w-full pl-9 pr-8 py-2 text-xs border rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer flex items-center justify-between"
      :class="[
        hasError
          ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20'
          : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
            : 'border-slate-200 bg-slate-50 hover:bg-white'
      ]"
    >
      <Building2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <span class="truncate" :class="selectedLabel ? 'text-slate-900 font-medium' : 'text-slate-400'">
        {{ selectedLabel || placeholder }}
      </span>
      <ChevronDown
        class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-150"
        :class="isOpen ? 'rotate-180 text-blue-600' : ''"
      />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        :style="menuStyle"
        class="z-[120] bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto overscroll-contain py-1"
      >
        <div v-if="offices.length > 0">
          <div class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
            University Offices
          </div>
          <button
            v-for="org in offices"
            :key="org.value"
            type="button"
            @click="selectOption(org.value)"
            class="w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-blue-50 transition-colors cursor-pointer"
            :class="modelValue === org.value ? 'bg-blue-50/80 text-blue-700 font-semibold' : 'text-slate-700'"
          >
            <span class="truncate">{{ org.label }}</span>
            <Check v-if="modelValue === org.value" class="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </button>
        </div>

        <div v-if="studentOrgs.length > 0">
          <div class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-y border-slate-100 sticky top-0 z-10">
            Student Organizations
          </div>
          <button
            v-for="org in studentOrgs"
            :key="org.value"
            type="button"
            @click="selectOption(org.value)"
            class="w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-blue-50 transition-colors cursor-pointer"
            :class="modelValue === org.value ? 'bg-blue-50/80 text-blue-700 font-semibold' : 'text-slate-700'"
          >
            <span class="truncate">{{ org.label }}</span>
            <Check v-if="modelValue === org.value" class="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
