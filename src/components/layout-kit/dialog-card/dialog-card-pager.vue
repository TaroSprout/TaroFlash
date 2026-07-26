<script setup lang="ts">
import { sessionPaneEnter, sessionPaneLeave } from '@/utils/animations/session-pane'

export type DialogCardPagerProps = {
  mode?: 'in-out' | 'out-in'
  // Skip the entering pane's pre-enter delay (snappy reversible navigation).
  instant?: boolean
}

const { mode, instant = false } = defineProps<DialogCardPagerProps>()

const emit = defineEmits<{
  (e: 'enter-start'): void
}>()

function onLeave(el: Element, done: () => void) {
  sessionPaneLeave(el, done)
}

function onEnter(el: Element, done: () => void) {
  sessionPaneEnter(el, done, { instant, onStart: () => emit('enter-start') })
}
</script>

<template>
  <transition :css="false" :mode="mode" @leave="onLeave" @enter="onEnter">
    <slot></slot>
  </transition>
</template>
