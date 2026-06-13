<script setup lang="ts">
import { ref } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { type ButtonProps } from '../button.vue'
import { usePlayOnTap } from '@/composables/use-play-on-tap'
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

const {
  options,
  size,
  menuTheme = 'brown-300',
  menuThemeDark = 'stone-700'
} = defineProps<DropdownMenuProps>()

const emit = defineEmits<{
  (e: 'select', option: DropdownOption): void
}>()

// Always-quiet tap (no bounce variant), so animate is hard-off; it just holds
// `playing` for the duration so the bgx sweep can run off `[data-playing]`.
const { interceptClick } = usePlayOnTap({ animate: false, reset: true })

// Which option is mid-tap, so only its row shows the sweep.
const playing_value = ref<DropdownOption['value'] | null>(null)

// Mirror ui-button: on coarse the capture intercept plays the quiet tap then
// fires the select; on fine it bails and the bubble `@click` selects immediately.
function onOptionTap(option: DropdownOption, e: MouseEvent) {
  interceptClick(e, {
    beforePlay: () => {
      emitSfx('ui.snappy_button_5')
      playing_value.value = option.value
    },
    onAfter: () => emit('select', option)
  })
}
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-(--btn-border-radius) bg-(--theme-primary) p-1.5 text-(length:--btn-font-size) leading-(--btn-font-size--line-height) text-(--theme-on-primary)"
    :class="`ui-kit-btn-tokens--${size}`"
    :data-theme="menuTheme"
    :data-theme-dark="menuThemeDark"
    data-testid="dropdown-button__menu"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="group/option relative flex w-full cursor-pointer items-center gap-(--btn-gap) overflow-hidden rounded-[calc(var(--btn-border-radius)-6px)] py-(--btn-padding-y) px-[calc(var(--btn-padding-x)-6px)] text-start whitespace-nowrap"
      :data-playing="playing_value === option.value || null"
      data-testid="dropdown-button__option"
      v-sfx.hover="'ui.click_04'"
      @click.capture="onOptionTap(option, $event)"
      @click="emit('select', option)"
    >
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 hidden bgx-diagonal-stripes bgx-color-[var(--theme-neutral)] animation-safe:bgx-slide group-hover/option:block group-data-[playing=true]/option:block"
      ></div>
      <ui-icon
        v-if="option.icon"
        :src="option.icon"
        class="relative size-(--icon-size,20px) shrink-0"
      />
      <span class="relative">{{ option.label }}</span>
    </button>
  </div>
</template>
