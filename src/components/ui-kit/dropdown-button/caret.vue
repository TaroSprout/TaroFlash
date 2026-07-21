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
  // Chrome vs identity: a neutral caret rings itself in the `element` role;
  // otherwise it reads `--color-accent`, which it inherits from the identity
  // button it sits inside (that button carries the `data-palette`).
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

// A NEUTRAL caret is the two-tone companion of its button: it fills
// --color-element-soft (a subtle adjacent neutral, brown-200 in light) at the
// button's own ambient depth, so the pair reads as button + companion caret with
// no ring. An IDENTITY caret has no such companion role, so it keeps the stepped
// surface + accent pixel-seam: it sits one surface above (data-depth) and rings
// itself in --color-accent, inherited from the identity button it sits in.
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
        :data-depth="neutral ? undefined : depth"
        class="relative z-1 flex aspect-square h-full items-center justify-center rounded-[calc(var(--btn-border-radius)-var(--btn-trigger-padding))] pointer-coarse:rounded-(--btn-border-radius) transition-[scale] duration-120 ease-[ease]"
        :class="[
          disabled ? 'opacity-50' : 'cursor-pointer hover:scale-110',
          neutral
            ? 'bg-(--color-element-soft) text-(--color-on-element)'
            : 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-accent)]'
        ]"
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
