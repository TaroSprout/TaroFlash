<script setup lang="ts">
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import TooltipRow from './tooltip-row.vue'
import { useCappedToggle } from '@/composables/ui/capped-toggle'

type CappedSpinboxRowProps = {
  label: string
  all_label: string
  min: number
  max: number
  step: number
  default_value: number
  prefill_when_all?: number
  tooltip?: string
  overridden?: boolean
}

const { max, default_value, prefill_when_all } = defineProps<CappedSpinboxRowProps>()

const emit = defineEmits<{ reset: [] }>()

const model = defineModel<number | null | undefined>('value')

const { spin_value, is_all, onSpin } = useCappedToggle(
  model,
  max,
  default_value,
  () => prefill_when_all
)
</script>

<template>
  <tooltip-row
    data-testid="capped-spinbox-row"
    :label="label"
    :tooltip="tooltip"
    :overridden="overridden"
    class="w-full"
    @reset="emit('reset')"
  >
    <ui-spinbox
      data-testid="capped-spinbox-row__spinbox"
      :value="spin_value"
      :min="min"
      :max="max"
      :step="step"
      :pill_label="all_label"
      pill_theme="green-500"
      pill_theme_dark="green-800"
      v-model:pill_active="is_all"
      wrap
      @update:value="onSpin"
    />
  </tooltip-row>
</template>
