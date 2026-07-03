<script setup lang="ts">
import { ref } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { type ButtonProps } from '../button.vue'
import { useStagedTap } from '@/composables/ui/staged-tap'
import { TYPE_SFX } from '@/sfx/config'
import type { DropdownOption } from './types'

type DropdownMenuProps = {
  options?: DropdownOption[]
  size: NonNullable<ButtonProps['size']>
  // The menu is teleported, so it can't inherit a `data-theme` ancestor — it
  // takes its theme explicitly.
  menuTheme?: Theme
  menuThemeDark?: Theme
  // Extra classes for the menu panel (e.g. an outline), merged onto the root.
  menuClass?: string
}

const {
  options = [],
  size,
  menuTheme = 'brown-300',
  menuThemeDark = 'stone-700',
  menuClass
} = defineProps<DropdownMenuProps>()

const emit = defineEmits<{
  (e: 'select', option: DropdownOption): void
}>()

// Raw body — replaces the option list while keeping the panel chrome.
defineSlots<{ default(): unknown }>()

const { tap } = useStagedTap()

// Which option is mid-tap, so only its row shows the sweep.
const playing_value = ref<DropdownOption['value'] | null>(null)

function onOptionTap(option: DropdownOption, e: MouseEvent) {
  if (option.disabled) return

  playing_value.value = option.value
  tap(() => {
    emit('select', option)
    playing_value.value = null
  })(e)
}
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-(--btn-border-radius) bg-(--theme-primary) p-1.5 text-(length:--btn-font-size) leading-(--btn-font-size--line-height) text-(--theme-on-primary)"
    :class="[`ui-kit-btn-tokens--${size}`, menuClass]"
    :data-theme="menuTheme"
    :data-theme-dark="menuThemeDark"
    data-testid="dropdown-button__menu"
  >
    <slot>
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :disabled="option.disabled"
        class="group/option relative flex w-full cursor-pointer items-center gap-(--btn-gap) overflow-hidden rounded-[calc(var(--btn-border-radius)-6px)] py-(--btn-padding-y) px-[calc(var(--btn-padding-x)-6px)] text-start whitespace-nowrap disabled:cursor-default disabled:opacity-40"
        :data-active="playing_value === option.value || option.selected || null"
        data-testid="dropdown-button__option"
        v-sfx="option.disabled ? {} : { hover: TYPE_SFX }"
        @click="onOptionTap(option, $event)"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 hidden bgx-diagonal-stripes bgx-color-[var(--theme-neutral)] animation-safe:bgx-slide group-hover/option:block group-data-[active=true]/option:block"
        ></div>
        <ui-icon
          v-if="option.icon"
          :src="option.icon"
          class="relative size-(--icon-size,20px) shrink-0"
        />
        <span class="relative">{{ option.label }}</span>
      </button>
    </slot>
  </div>
</template>
