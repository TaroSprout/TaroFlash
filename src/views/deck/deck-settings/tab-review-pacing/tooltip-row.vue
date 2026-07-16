<script setup lang="ts">
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

defineProps<{
  label: string
  tooltip?: string
}>()

defineSlots<{
  default(): any
}>()
</script>

<template>
  <div data-testid="tooltip-row" class="flex items-center justify-between gap-4">
    <span
      data-testid="tooltip-row__label"
      class="flex items-center gap-2 text-brown-700 dark:text-brown-100"
    >
      {{ label }}
      <ui-tooltip
        v-if="tooltip"
        element="span"
        :text="tooltip"
        class="flex cursor-pointer items-center"
      >
        <ui-icon src="info-circle" class="size-4 shrink-0" />
      </ui-tooltip>
    </span>

    <slot></slot>
  </div>
</template>
