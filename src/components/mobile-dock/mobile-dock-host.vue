<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { useMobileDock } from './use-mobile-dock'
import { useKeyboardOpen } from '@/composables/ui/keyboard'

const { el, fills } = useMobileDock()
const { is_open: is_keyboard_open } = useKeyboardOpen()

const bar = useTemplateRef<HTMLElement>('bar')

let observer: ResizeObserver | null = null

// Publish the dock's live height to :root so any view can pad its content clear
// of the bar. 0 while the dock is empty/hidden so layouts collapse the gap.
function publishHeight() {
  const visible = fills.value > 0 && !is_keyboard_open.value
  const height = visible ? (bar.value?.offsetHeight ?? 0) : 0
  document.documentElement.style.setProperty('--mobile-dock-height', `${height}px`)
}

onMounted(() => {
  el.value = bar.value
  observer = new ResizeObserver(publishHeight)
  if (bar.value) observer.observe(bar.value)
  publishHeight()
})

// RO covers content + show/hide size changes; the post-flush watch guarantees a
// measure once the DOM reflects a fills/keyboard toggle.
watch([fills, is_keyboard_open], publishHeight, { flush: 'post' })

onBeforeUnmount(() => {
  observer?.disconnect()
  document.documentElement.style.removeProperty('--mobile-dock-height')
})
</script>

<template>
  <footer
    v-show="fills > 0 && !is_keyboard_open"
    ref="bar"
    data-testid="mobile-dock-host"
    class="fixed bottom-0 left-0 z-30 w-full rounded-t-6 bg-brown-300 contain-[layout_style] transform-[translateZ(0)] dark:bg-stone-900 sm:bottom-3 sm:left-auto sm:right-3 sm:w-96 sm:rounded-6 xl:hidden [--dock-px:1.25rem] [--dock-pt:1rem] [--dock-pb:0.5rem] max-sm:[--dock-pb:calc(0.5rem+var(--edge-safe-padding))] ring-1 ring-brown-100 dark:ring-grey-900"
  >
    <div
      mobile-dock-above
      data-testid="mobile-dock-host__above"
      class="pointer-events-none absolute inset-x-0 bottom-full flex justify-end px-(--dock-px) pb-3"
    ></div>

    <div mobile-dock-content data-testid="mobile-dock-host__content" class="relative w-full"></div>
  </footer>
</template>
