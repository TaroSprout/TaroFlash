<script setup lang="ts">
import { computed } from 'vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { type ButtonProps } from '../button.vue'
import { flipEnter, flipLeave } from '@/utils/animations/flip'

type DropdownCaretProps = {
  open: boolean
  icon?: string
  size?: NonNullable<ButtonProps['size']>
  disabled?: boolean
  // A neutral caret fills with the darker companion of the button beside it;
  // otherwise it rings itself in `--color-accent`, inherited from that button.
  neutral?: boolean
}

const {
  open,
  icon = 'arrow-drop-down',
  size = 'base',
  disabled = false,
  neutral = false
} = defineProps<DropdownCaretProps>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

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
        :class="[
          disabled ? 'opacity-disabled' : 'cursor-pointer hover:scale-110',
          neutral
            ? 'bg-raised-shade text-ink'
            : 'bg-raised-tint text-ink shadow-[inset_0_0_0_1px_var(--color-accent)]'
        ]"
        data-testid="dropdown-button__trigger"
        v-sfx="{ hover: disabled ? undefined : 'ui.hover' }"
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
