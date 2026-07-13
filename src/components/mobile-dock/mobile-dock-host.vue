<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { useMobileDock } from './use-mobile-dock'
import { useKeyboardOpen } from '@/composables/ui/keyboard'
import { useAnimatedHeight } from '@/composables/ui/animated-height'
import { useMatchMedia } from '@/composables/ui/media-query'

const { el, breakpoint } = useMobileDock()
const { is_open: is_keyboard_open } = useKeyboardOpen()
const is_mobile = computed(() => useMatchMedia(`w<${breakpoint.value}`).value)

const bar = useTemplateRef<HTMLElement>('bar')
const content_wrapper = useTemplateRef<HTMLElement>('content_wrapper')
const content = useTemplateRef<HTMLElement>('content')

// Publish the dock's live height to :root so any view can pad its content clear
// of the bar. 0 while hidden (keyboard open, or the current route's breakpoint
// doesn't match) so layouts collapse the gap.
function publishHeight() {
  const visible = is_mobile.value && !is_keyboard_open.value
  const height = visible ? (content.value?.offsetHeight ?? 0) : 0
  document.documentElement.style.setProperty('--mobile-dock-height', `${height}px`)
}

// Tweens content_wrapper across route swaps (a fixed footer with tiny, cheap
// content — real height tween is safe here, unlike the transcript case).
useAnimatedHeight(
  content_wrapper,
  content,
  () => is_mobile.value && !is_keyboard_open.value,
  publishHeight,
  true
)

onMounted(() => {
  el.value = bar.value
  publishHeight()
})

onBeforeUnmount(() => {
  document.documentElement.style.removeProperty('--mobile-dock-height')
})

watch([is_mobile, is_keyboard_open], publishHeight, { flush: 'post' })
</script>

<template>
  <footer
    v-show="is_mobile && !is_keyboard_open"
    ref="bar"
    data-testid="mobile-dock-host"
    class="fixed bottom-0 left-0 z-30 w-full rounded-t-6 bg-brown-300 contain-[layout_style] transform-[translateZ(0)] dark:bg-stone-900 sm:bottom-3 sm:left-auto sm:right-3 sm:w-96 sm:rounded-6 [--dock-px:1.25rem] [--dock-pt:1rem] [--dock-pb:0.5rem] max-sm:[--dock-pb:calc(0.5rem+var(--edge-safe-padding))] ring-1 ring-brown-100 dark:ring-grey-900"
  >
    <div
      mobile-dock-above
      data-testid="mobile-dock-host__above"
      class="pointer-events-none absolute inset-x-0 bottom-full flex justify-end px-(--dock-px) pb-3"
    ></div>

    <div
      ref="content_wrapper"
      data-testid="mobile-dock-host__content-wrapper"
      class="relative w-full"
    >
      <div ref="content" mobile-dock-content data-testid="mobile-dock-host__content"></div>
    </div>
  </footer>
</template>
