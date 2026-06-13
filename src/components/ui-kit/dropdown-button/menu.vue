<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import { type ButtonProps } from '../button.vue'
import { emitSfx } from '@/sfx/bus'
import type { DropdownOption } from './types'

type DropdownMenuProps = {
  options: DropdownOption[]
  size: NonNullable<ButtonProps['size']>
  // The menu is teleported, so it can't inherit a `data-theme` ancestor — it
  // takes its theme explicitly.
  menuTheme?: Theme
  menuThemeDark?: Theme
}

const { options, size, menuTheme = 'brown-300', menuThemeDark } = defineProps<DropdownMenuProps>()

const emit = defineEmits<{
  (e: 'select', option: DropdownOption): void
}>()

function onSelect(option: DropdownOption) {
  emitSfx('ui.select')
  emit('select', option)
}
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-(--btn-border-radius) bg-(--theme-primary) py-2 text-(length:--btn-font-size) leading-(--btn-font-size--line-height) text-(--theme-on-primary)"
    :class="`ui-kit-btn-tokens--${size}`"
    :data-theme="menuTheme"
    :data-theme-dark="menuThemeDark"
    data-testid="dropdown-button__menu"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex w-full cursor-pointer items-center gap-(--btn-gap) p-(--btn-padding) text-start whitespace-nowrap hover:bg-[color-mix(in_srgb,var(--theme-on-primary)_14%,transparent)]"
      data-testid="dropdown-button__option"
      @click="onSelect(option)"
    >
      <ui-icon v-if="option.icon" :src="option.icon" class="size-(--icon-size,20px) shrink-0" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>
