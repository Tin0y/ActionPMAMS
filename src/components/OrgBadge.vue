<script setup lang="ts">
import { computed } from 'vue';
import { getOrgTheme } from '../data/initialData';

const props = withDefaults(
  defineProps<{
    orgId: string;
    size?: 'xs' | 'sm' | 'md';
    customLabel?: string;
  }>(),
  {
    size: 'sm'
  }
);

const theme = computed(() => getOrgTheme(props.orgId));

const normalizedLabel = computed(() => {
  if (props.customLabel) return props.customLabel;
  const key = (props.orgId || '').trim().toUpperCase();
  if (key === 'CBIT') return 'CBIT SEC';
  if (key === 'CELS') return 'ELSSA';
  if (key === 'CESS') return 'CESS SO';
  if (key === 'CMFS' || key === 'CFMS') return 'FIMSSO';
  if (key === 'SENSO' || key === 'SENSSO') return 'SenSSo';
  if (key === 'KAABAG') return 'KAABAG';
  return props.orgId;
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'text-[9px] px-1.5 py-0.5 rounded';
    case 'md':
      return 'text-xs px-3 py-1 rounded-lg';
    case 'sm':
    default:
      return 'text-[11px] px-2 py-0.5 rounded-md';
  }
});
</script>

<template>
  <span
    class="inline-flex items-center justify-center font-black tracking-wide border shadow-2xs transition-transform select-none"
    :class="[
      theme.badgeBg,
      theme.badgeText,
      theme.badgeBorder,
      sizeClasses
    ]"
    :title="`${normalizedLabel} (${theme.name})`"
  >
    {{ normalizedLabel }}
  </span>
</template>
