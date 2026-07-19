<script setup lang="ts" generic="T extends string">
import { computed } from 'vue'
import UiDropdownButton, {
  type DropdownOption
} from '@/components/ui-kit/dropdown-button/index.vue'

defineOptions({ inheritAttrs: false })

type SelectMenuOption = {
  value: T
  label: string
}

type SelectMenuProps = {
  options: SelectMenuOption[]
  modelValue: T
}

const { options, modelValue } = defineProps<SelectMenuProps>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const current_label = computed(() => options.find((o) => o.value === modelValue)?.label ?? '')

function onSelect(option: DropdownOption) {
  emit('update:modelValue', option.value as T)
}
</script>

<template>
  <ui-dropdown-button
    data-testid="ui-select-menu"
    open-on-trigger
    full-width
    :options="options"
    v-bind="$attrs"
    @select="onSelect"
  >
    <span data-testid="ui-select-menu__label">{{ current_label }}</span>
  </ui-dropdown-button>
</template>
