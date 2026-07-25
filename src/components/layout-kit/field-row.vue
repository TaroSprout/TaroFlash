<script setup lang="ts">
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

type FieldRowProps = {
  label: string
  tooltip?: string
}

const { label, tooltip } = defineProps<FieldRowProps>()

defineSlots<{
  /** The row's control, right-aligned against the label. */
  default(): any
}>()
</script>

<template>
  <div data-testid="field-row" class="group flex items-center justify-between gap-4">
    <span data-testid="field-row__label" class="flex items-center gap-2 text-ink-muted">
      {{ label }}
      <ui-tooltip
        v-if="tooltip"
        element="span"
        :text="tooltip"
        class="flex cursor-pointer items-center opacity-0 group-hover:opacity-100"
      >
        <ui-icon src="info-circle" class="size-3.25 shrink-0" />
      </ui-tooltip>
    </span>

    <div data-testid="field-row__control" class="relative flex items-center gap-1">
      <slot></slot>
    </div>
  </div>
</template>
