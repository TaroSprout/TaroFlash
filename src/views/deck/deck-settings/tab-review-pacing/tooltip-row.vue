<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'

defineProps<{
  label: string
  tooltip?: string
  overridden?: boolean
}>()

const emit = defineEmits<{ reset: [] }>()

defineSlots<{
  default(): any
}>()

const { t } = useI18n()
</script>

<template>
  <div data-testid="tooltip-row" class="flex items-center justify-between gap-4 group">
    <span data-testid="tooltip-row__label" class="flex items-center gap-2">
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

    <div class="relative flex items-center gap-1">
      <slot></slot>

      <ui-button
        v-if="overridden"
        data-testid="tooltip-row__reset"
        data-theme="brown-500"
        variant="ghost"
        size="sm"
        icon-only
        icon-left="refresh"
        :sfx="{ press: 'snappy_button_5' }"
        @press="emit('reset')"
        class="absolute! -left-8"
      >
        {{ t('deck.settings-modal.review-pacing.reset-to-preset') }}
      </ui-button>
    </div>
  </div>
</template>
