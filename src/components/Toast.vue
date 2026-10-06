<script setup lang="ts">
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X } from 'lucide-vue-next';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info' | 'warning' | 'danger';
}

const props = defineProps<{
  toasts: ToastMessage[];
}>();

const emit = defineEmits<{
  (e: 'dismiss', id: string): void;
}>();
</script>

<template>
  <div class="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all flex items-start gap-3 bg-white"
      :class="[
        toast.type === 'info'
          ? 'border-blue-200 text-blue-900 bg-blue-50/95'
          : toast.type === 'warning'
          ? 'border-amber-200 text-amber-900 bg-amber-50/95'
          : toast.type === 'danger'
          ? 'border-rose-200 text-rose-900 bg-rose-50/95'
          : 'border-emerald-200 text-emerald-900 bg-emerald-50/95'
      ]"
    >
      <div class="shrink-0 mt-0.5">
        <Info v-if="toast.type === 'info'" class="w-5 h-5 text-blue-600" />
        <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5 text-amber-600" />
        <AlertCircle v-else-if="toast.type === 'danger'" class="w-5 h-5 text-rose-600" />
        <CheckCircle2 v-else class="w-5 h-5 text-emerald-600" />
      </div>

      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-bold leading-tight">{{ toast.title }}</h4>
        <p v-if="toast.message" class="text-xs opacity-90 mt-0.5 leading-snug line-clamp-3">
          {{ toast.message }}
        </p>
      </div>

      <button
        @click="emit('dismiss', toast.id)"
        class="shrink-0 p-1 rounded-md hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        aria-label="Dismiss Notification"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
