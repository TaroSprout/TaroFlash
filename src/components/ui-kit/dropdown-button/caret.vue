<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { type ButtonProps } from '../button.vue'
import { flipEnter, flipLeave } from '@/utils/animations/flip'
import { TYPE_SFX } from '@/sfx/config'

type DropdownCaretProps = {
  open: boolean
  icon?: string
  size?: NonNullable<ButtonProps['size']>
  // Re-bases just the caret to its own palette; see `surface` below.
  triggerTheme?: Theme
  triggerThemeDark?: Theme
  disabled?: boolean
}

const {
  open,
  icon = 'arrow-drop-down',
  size = 'base',
  triggerTheme,
  triggerThemeDark,
  disabled = false
} = defineProps<DropdownCaretProps>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

// The caret normally contrasts against the main button via theme-secondary. A
// `triggerTheme` re-bases the caret to its own palette, so it reads as that
// palette's primary surface instead (matching how the menu maps its theme).
const surface = computed(() =>
  triggerTheme
    ? 'bg-(--theme-primary) text-(--theme-on-primary)'
    : 'bg-(--theme-secondary) text-(--theme-on-secondary)'
)

// Only re-base dark when a triggerTheme is set: a lone light override would
// otherwise stay light in dark mode. With no triggerTheme the caret inherits
// the surrounding theme in both modes, so leave dark unset.
const trigger_theme_dark = computed(
  () => triggerThemeDark ?? (triggerTheme ? 'stone-900' : undefined)
)

// Own inset scale, distinct from --btn-padding-y (a button's label padding) —
// this is the caret's circular hit-area inset, so it gets its own token.
const TRIGGER_PADDING: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: '4px',
  base: '4px',
  lg: '8px',
  xl: '8px'
}
const trigger_padding = computed(() => TRIGGER_PADDING[size])

function onEnter(el: Element, done: () => void) {
  flipEnter(el, 'x', done)
}

function onLeave(el: Element, done: () => void) {
  flipLeave(el, 'x', done)
}
</script>

<template>
  <div
    :data-theme="triggerTheme"
    :data-theme-dark="trigger_theme_dark"
    :style="{ '--btn-trigger-padding': trigger_padding }"
    :class="[
      `ui-kit-btn-tokens--${size}`,
      'flex h-full p-(--btn-trigger-padding) pointer-coarse:p-0'
    ]"
    data-testid="dropdown-button__trigger-wrap"
    @click.stop="!disabled && emit('toggle')"
  >
    <transition mode="out-in" @enter="onEnter" @leave="onLeave">
      <span
        :key="String(open)"
        role="button"
        :tabindex="disabled ? -1 : 0"
        aria-haspopup="menu"
        :aria-expanded="open"
        :aria-disabled="disabled || undefined"
        :data-active="open"
        class="relative z-1 flex aspect-square h-full items-center justify-center rounded-[calc(var(--btn-border-radius)-var(--btn-trigger-padding))] pointer-coarse:rounded-(--btn-border-radius) transition-[scale] duration-120 ease-[ease]"
        :class="[surface, disabled ? 'opacity-50' : 'cursor-pointer hover:scale-110']"
        data-testid="dropdown-button__trigger"
        v-sfx="{ hover: disabled ? undefined : TYPE_SFX }"
        @keydown.enter.space.stop.prevent="!disabled && emit('toggle')"
      >
        <ui-icon
          :src="icon"
          class="size-[calc(var(--icon-size,20px)-6px)]"
          :class="{ 'rotate-180': open }"
        />
      </span>
    </transition>
  </div>
</template>
