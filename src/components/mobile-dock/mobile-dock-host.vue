<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { useMobileDock } from './use-mobile-dock'
import { useAnimatedHeight } from '@/composables/ui/animated-height'
import { useBottomChromeCover } from '@/composables/ui/safe-area'

const { el, is_visible, is_flush, height_claims } = useMobileDock()

const { is_covered: is_bottom_chrome_covering } = useBottomChromeCover()

const bar = useTemplateRef<HTMLElement>('bar')
const content_wrapper = useTemplateRef<HTMLElement>('content_wrapper')
const content = useTemplateRef<HTMLElement>('content')

// Trap: the edge inset is earned by being flush against the screen edge, not by being on a touch device →[K:dock-edge-inset-follows-flush]
// No floor under the allowance: where the browser reports no inset the strip is already covered, and padding it there lifts the bar off the edge →[K:dock-edge-inset-follows-flush]
const has_edge_allowance = computed(() => is_flush.value && !is_bottom_chrome_covering.value)

/**
 * Publishes the dock's live height to `--mobile-dock-height` on `:root`, so any view can
 * pad content clear of the bar. Reports 0 while the dock is hidden, collapsing the gap.
 */
function publishHeight() {
  const height = is_visible.value ? (content.value?.offsetHeight ?? 0) : 0
  document.documentElement.style.setProperty('--mobile-dock-height', `${height}px`)
}

// Tiny, cheap footer content — a real height tween is safe here, unlike the transcript case.
// Stands down while content inside claims the height, so only one tween ever runs. →[K:dock-height-single-owner]
useAnimatedHeight(
  content_wrapper,
  content,
  () => is_visible.value && height_claims.value === 0,
  publishHeight,
  true
)

/**
 * Hand the bar's height back to the browser for the length of a claim.
 *
 * The height tween leaves an inline height behind, which would hold the bar at
 * whatever it last measured while the claimed animation resizes the content
 * underneath it. Cleared, the bar sizes to its content and follows along.
 */
function releaseHeightControl() {
  const wrapper = content_wrapper.value
  if (!wrapper) return

  gsap.killTweensOf(wrapper)
  wrapper.style.height = ''
  wrapper.style.overflow = ''
}

onMounted(() => {
  el.value = bar.value
  publishHeight()
})

onBeforeUnmount(() => {
  document.documentElement.style.removeProperty('--mobile-dock-height')
})

watch(height_claims, (claims) => {
  if (claims > 0) releaseHeightControl()
})

watch([is_visible, height_claims], publishHeight, { flush: 'post' })
</script>

<template>
  <footer
    v-show="is_visible"
    ref="bar"
    data-testid="mobile-dock-host"
    data-station="panel"
    class="fixed bottom-0 left-0 z-30 w-full rounded-t-6 bg-surface contain-[layout_style] transform-[translateZ(0)] sm:bottom-3 sm:left-auto sm:right-3 sm:w-96 sm:rounded-6 [--dock-px:1.25rem] [--dock-pt:1rem] [--dock-pb:0.5rem] ring-1 ring-line"
    :class="has_edge_allowance && '[--dock-pb:calc(0.5rem+env(safe-area-inset-bottom))]'"
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
