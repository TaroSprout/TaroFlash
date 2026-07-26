<script setup lang="ts">
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

type FieldRowProps = {
  label: string
  tooltip?: string
  // Stack the label above the control below `md` — for wide controls that don't
  // fit beside the label on narrow screens.
  stack?: boolean
}

const { label, tooltip, stack = false } = defineProps<FieldRowProps>()

defineSlots<{
  /** The row's control, right-aligned against the label. */
  default(): any
}>()
</script>

<template>
  <div
    data-testid="field-row"
    class="group flex justify-between gap-4"
    :class="
      stack ? 'flex-col items-start gap-2 md:flex-row md:items-center md:gap-4' : 'items-center'
    "
  >
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

    <div
      data-testid="field-row__control"
      class="relative flex items-center gap-1"
      :class="stack && 'w-full md:w-auto'"
    >
      <slot></slot>
    </div>
  </div>
</template>
