<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiTooltip from '@/components/ui-kit/tooltip.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import UiButton from '@/components/ui-kit/button.vue'

type FieldRowProps = {
  label: string
  tooltip?: string
  field?: { overridden: { value: boolean }; reset: () => void }
}

const { label, tooltip, field } = defineProps<FieldRowProps>()

defineSlots<{
  default(): any
}>()

const { t } = useI18n()
</script>

<template>
  <div data-testid="field-row" class="flex items-center justify-between gap-4 group">
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

    <div class="relative flex items-center gap-1">
      <slot></slot>

      <ui-button
        neutral
        v-if="field?.overridden.value"
        data-testid="field-row__reset"
        variant="ghost"
        size="sm"
        icon-only
        icon-left="refresh"
        :sfx="{ press: 'snappy_button_5' }"
        @press="field?.reset()"
        class="absolute! -left-8"
      >
        {{ t('deck.settings-modal.review-pacing.reset-to-preset') }}
      </ui-button>
    </div>
  </div>
</template>
