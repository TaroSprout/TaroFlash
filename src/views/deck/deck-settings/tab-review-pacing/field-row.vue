<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import FieldRow from '@/components/layout-kit/field-row.vue'

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
  <field-row :label="label" :tooltip="tooltip">
    <ui-button
      neutral
      v-if="field?.overridden.value"
      data-testid="field-row__reset"
      variant="ghost"
      size="sm"
      icon-only
      icon-left="refresh"
      :sfx="{ press: 'ui.press' }"
      @press="field?.reset()"
      class="absolute! -left-8"
    >
      {{ t('deck.settings-modal.review-pacing.reset-to-preset') }}
    </ui-button>

    <slot></slot>
  </field-row>
</template>
