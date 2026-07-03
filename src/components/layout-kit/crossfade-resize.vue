<script setup lang="ts">
import { useTemplateRef } from 'vue'
import {
  crossfadeResizeBeforeLeave,
  crossfadeResizeEnter,
  crossfadeResizeLeave
} from '@/utils/animations/crossfade-resize'

type CrossfadeResizeProps = {
  // Snaps the wrapper's height instead of tweening it — set false only for
  // panes with heavy DOM (a long transcript); see the perf note in
  // `crossfadeResizeEnter`.
  animateHeight?: boolean
}

const { animateHeight = true } = defineProps<CrossfadeResizeProps>()

const emit = defineEmits<{
  (e: 'swap-start'): void
  (e: 'swap-end'): void
}>()

const wrapper = useTemplateRef<HTMLElement>('wrapper')

// Stays full-bleed (no padding) so slotted children own their inset via the
// parent's padding var — outlines/shadows then sit clear of the overflow clip
// the swap applies mid-tween.
function onBeforeLeave() {
  emit('swap-start')
  if (wrapper.value) crossfadeResizeBeforeLeave(wrapper.value)()
}

function onEnter(el: Element, done: () => void) {
  if (wrapper.value) crossfadeResizeEnter(wrapper.value, animateHeight)(el, done)
  else done()
}

function onAfterEnter() {
  emit('swap-end')
}
</script>

<template>
  <div ref="wrapper" data-testid="crossfade-resize" class="relative w-full">
    <transition
      :css="false"
      @before-leave="onBeforeLeave"
      @leave="crossfadeResizeLeave"
      @enter="onEnter"
      @after-enter="onAfterEnter"
    >
      <slot />
    </transition>
  </div>
</template>
