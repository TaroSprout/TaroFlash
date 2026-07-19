<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { nextDepth, useAmbientDepth } from '@/composables/ui/depth'
import { type ButtonProps } from '../button.vue'
import { flipEnter, flipLeave } from '@/utils/animations/flip'
import { TYPE_SFX } from '@/sfx/config'

type DropdownCaretProps = {
  open: boolean
  icon?: string
  size?: NonNullable<ButtonProps['size']>
  disabled?: boolean
}

const {
  open,
  icon = 'arrow-drop-down',
  size = 'base',
  disabled = false
} = defineProps<DropdownCaretProps>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const ambient_depth = useAmbientDepth()

// Own inset scale, distinct from --btn-padding-y (a button's label padding) —
// this is the caret's circular hit-area inset, so it gets its own token.
const TRIGGER_PADDING: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: '4px',
  base: '4px',
  lg: '8px',
  xl: '8px'
}
const trigger_padding = computed(() => TRIGGER_PADDING[size])

// The caret is chrome, not identity: it steps one surface above the button it
// sits in. Painting it from --theme-secondary only ever stepped LIGHTER, so it
// vanished on a light accent. It owns no descendants, so it stamps data-depth
// without providing it.
const depth = computed(() => nextDepth(ambient_depth.value))

function onEnter(el: Element, done: () => void) {
  flipEnter(el, 'x', done)
}

function onLeave(el: Element, done: () => void) {
  flipLeave(el, 'x', done)
}
</script>

<template>
  <div
    :style="{ '--btn-trigger-padding': trigger_padding }"
    :class="[
      `ui-kit-btn-tokens--${size}`,
      'flex h-full p-(--btn-trigger-padding) pointer-coarse:p-0'
    ]"
    data-testid="dropdown-button__trigger-wrap"
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
        :data-depth="depth"
        class="relative z-1 flex aspect-square h-full items-center justify-center rounded-[calc(var(--btn-border-radius)-var(--btn-trigger-padding))] pointer-coarse:rounded-(--btn-border-radius) transition-[scale] duration-120 ease-[ease] bg-surface text-ink shadow-[inset_0_0_0_1px_var(--theme-primary)]"
        :class="disabled ? 'opacity-50' : 'cursor-pointer hover:scale-110'"
        data-testid="dropdown-button__trigger"
        v-sfx="{ hover: disabled ? undefined : TYPE_SFX }"
        @click.stop="!disabled && emit('toggle')"
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
