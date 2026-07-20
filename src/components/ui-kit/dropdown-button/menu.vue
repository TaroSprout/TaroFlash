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
  // Depth of the trigger this menu belongs to. The menu is teleported and can't
  // inherit the trigger's depth context, so it's passed explicitly — the menu
  // then paints --color-element at the SAME value as its neutral button, and its
  // seam (outline-surface) reads the surface the menu floats over.
  depth?: number
}

const { options = [], size, depth } = defineProps<DropdownMenuProps>()

const emit = defineEmits<{
  (e: 'select', option: DropdownOption): void
}>()

// Raw body — replaces the option list while keeping the panel chrome.
defineSlots<{ default(): unknown }>()

const { tap } = useStagedTap()

// Which option is mid-tap, so only its row shows the sweep.
const tapping_value = ref<DropdownOption['value'] | null>(null)

function onOptionTap(option: DropdownOption, e: MouseEvent) {
  if (option.disabled) return

  tapping_value.value = option.value
  tap(() => {
    emit('select', option)
    tapping_value.value = null
  })(e)
}
</script>

<template>
  <div
    class="flex flex-col overflow-hidden rounded-(--btn-border-radius) bg-element p-1.5 text-(length:--btn-font-size) leading-(--btn-font-size--line-height) text-on-element outline-1 outline-surface"
    :class="`ui-kit-btn-tokens--${size}`"
    :data-depth="depth"
    data-testid="dropdown-button__menu"
  >
    <slot>
      <template v-for="option in options" :key="option.value">
        <div
          v-if="option.separator"
          aria-hidden="true"
          data-testid="dropdown-button__separator"
          class="my-1.5 h-px shrink-0 bg-ink-muted opacity-40"
        ></div>

        <button
          type="button"
          :disabled="option.disabled"
          class="group/option relative flex w-full cursor-pointer items-center gap-(--btn-gap) overflow-hidden rounded-[calc(var(--btn-border-radius)-6px)] py-(--btn-padding-y) px-[calc(var(--btn-padding-x)-6px)] text-start whitespace-nowrap data-[active=true]:bg-element-strong data-[active=true]:text-on-element disabled:cursor-default disabled:opacity-40"
          :data-active="option.selected || null"
          :data-tapping="tapping_value === option.value || null"
          data-testid="dropdown-button__option"
          v-sfx="option.disabled ? {} : { hover: TYPE_SFX }"
          @click="onOptionTap(option, $event)"
        >
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 hidden bgx-diagonal-stripes bgx-color-[var(--color-ink-muted)] animation-safe:bgx-slide group-hover/option:block group-data-[tapping=true]/option:block"
          ></div>
          <ui-icon
            v-if="option.icon"
            :src="option.icon"
            class="relative size-(--icon-size,20px) shrink-0"
          />
          <span class="relative">{{ option.label }}</span>
        </button>
      </template>
    </slot>
  </div>
</template>
