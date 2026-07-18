<script setup lang="ts">
import { computed, inject } from 'vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'
import { pacingFieldsKey } from './pacing-fields'

const { preset_options, selected_preset_value } = inject(pacingFieldsKey)!

const selected_preset_label = computed(
  () => preset_options.value.find((option) => option.value === selected_preset_value.value)?.label
)

function onSelect(option: DropdownOption) {
  selected_preset_value.value = option.value as string
}
</script>

<template>
  <ui-dropdown-button
    data-testid="preset-chip"
    data-theme="brown-100"
    data-theme-dark="stone-700"
    menu-theme="brown-100"
    menu-theme-dark="stone-700"
    size="sm"
    open-on-trigger
    :options="preset_options"
    @select="onSelect"
  >
    {{ selected_preset_label }}
  </ui-dropdown-button>
</template>
