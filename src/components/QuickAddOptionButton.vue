<script setup lang="ts">
import { ref, computed } from 'vue';
import { UserAccount, SystemOptionCategory, SystemDropdownOption } from '../types';
import AddOptionModal from './AddOptionModal.vue';
import { Plus } from 'lucide-vue-next';

const props = defineProps<{
  category: SystemOptionCategory | string;
  categoryName?: string;
  currentUser?: UserAccount | null;
  size?: 'sm' | 'md';
}>();

const emit = defineEmits<{
  (e: 'created', option: SystemDropdownOption): void;
}>();

const isModalOpen = ref<boolean>(false);

// Strict Permission: Only visible and accessible to System Administrator
const isSystemAdmin = computed(() => {
  if (!props.currentUser) {
    // Check localStorage fallback for active user if prop is not passed
    try {
      const stored = localStorage.getItem('msun_active_user');
      if (stored) {
        const u = JSON.parse(stored);
        const r = u?.activeRole || u?.role;
        return r === 'ROLE_ADMIN' || r === 'System Administrator' || r === 'SysAd';
      }
    } catch (e) {}
    return false;
  }
  const role = props.currentUser.activeRole || props.currentUser.role;
  return role === 'ROLE_ADMIN' || role === 'System Administrator' || role === 'SysAd';
});

const onOptionSaved = (opt: SystemDropdownOption) => {
  emit('created', opt);
};
</script>

<template>
  <div v-if="isSystemAdmin" class="inline-flex items-center shrink-0">
    <button
      type="button"
      @click.stop="isModalOpen = true"
      :title="`Add new ${categoryName || category} option (System Administrator)`"
      class="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-2xs cursor-pointer group"
      :class="size === 'sm' ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-xs'"
    >
      <Plus class="w-3.5 h-3.5 group-hover:scale-110 transition-transform stroke-[2.5]" />
    </button>

    <!-- Modal for Adding New Option -->
    <AddOptionModal
      :is-open="isModalOpen"
      :category="category"
      :category-name="categoryName"
      @close="isModalOpen = false"
      @saved="onOptionSaved"
    />
  </div>
</template>

