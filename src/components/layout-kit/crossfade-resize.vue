<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import {
  crossfadeResizeBeforeLeave,
  crossfadeResizeEnter,
  crossfadeResizeLeave
} from '@/utils/animations/crossfade-resize'
import { useStageHeight } from '@/components/layout-kit/stage/use-stage-height'

type CrossfadeResizeProps = {
  /** Snaps the wrapper's height instead of tweening it; set false only for panes with heavy DOM (a long transcript) — see the perf note in `crossfadeResizeEnter`. */
  animateHeight?: boolean
}

const { animateHeight = true } = defineProps<CrossfadeResizeProps>()

const emit = defineEmits<{
  (e: 'swap-start'): void
  (e: 'swap-end'): void
}>()

const wrapper = useTemplateRef<HTMLElement>('wrapper')
const stage_content = ref<HTMLElement | null>(null)

const { driveHeight } = useStageHeight(wrapper, stage_content)

let cancel_enter: (() => void) | null = null

// Stays full-bleed so slotted children's own inset keeps outlines/shadows clear of the overflow clip mid-tween.
function onBeforeLeave() {
  emit('swap-start')
  if (wrapper.value) crossfadeResizeBeforeLeave(wrapper.value)()
}

function onEnter(el: Element, done: () => void) {
  if (wrapper.value)
    cancel_enter = crossfadeResizeEnter(wrapper.value, driveHeight, animateHeight)(el, done)
  else done()
}

function onEnterCancelled() {
  cancel_enter?.()
  cancel_enter = null
}

function onAfterEnter() {
  cancel_enter = null
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
      @enter-cancelled="onEnterCancelled"
      @after-enter="onAfterEnter"
    >
      <slot />
    </transition>
  </div>
</template>
