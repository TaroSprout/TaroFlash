<script setup lang="ts">
import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'
import { useCappedToggle } from '@/composables/ui/capped-toggle'

type CappedSpinboxRowProps = {
  label: string
  all_label: string
  min: number
  max: number
  step: number
  default_value: number
  prefill_when_all?: number
}

const { max, default_value, prefill_when_all } = defineProps<CappedSpinboxRowProps>()

const model = defineModel<number | null | undefined>('value')

const { spin_value, is_all, onSpin } = useCappedToggle(
  model,
  max,
  default_value,
  () => prefill_when_all
)
</script>

<template>
  <div data-testid="capped-spinbox-row" class="flex items-center justify-between gap-4">
    <span data-testid="capped-spinbox-row__label" class="text-brown-700 dark:text-brown-100">
      {{ label }}
    </span>

    <ui-spinbox
      data-testid="capped-spinbox-row__spinbox"
      :value="spin_value"
      :min="min"
      :max="max"
      :step="step"
      :pill_label="all_label"
      v-model:pill_active="is_all"
      wrap
      @update:value="onSpin"
    />
  </div>
</template>
