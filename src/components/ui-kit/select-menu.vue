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

const {
  options,
  modelValue,
  menuTheme = 'brown-200',
  menuThemeDark = 'stone-700',
  menuClass = 'outline-1 outline-brown-100 dark:outline-grey-900'
} = defineProps<{
  options: SelectMenuOption[]
  modelValue: T
  menuTheme?: Theme
  menuThemeDark?: Theme
  menuClass?: string
}>()

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
    data-theme="brown-200"
    data-theme-dark="stone-700"
    open-on-trigger
    full-width
    :options="options"
    :menu-theme="menuTheme"
    :menu-theme-dark="menuThemeDark"
    :menu-class="menuClass"
    v-bind="$attrs"
    @select="onSelect"
  >
    <span data-testid="ui-select-menu__label">{{ current_label }}</span>
  </ui-dropdown-button>
</template>
