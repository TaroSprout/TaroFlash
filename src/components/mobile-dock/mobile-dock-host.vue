<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { useMobileDock } from './use-mobile-dock'
import { useStageHeight } from '@/components/layout-kit/stage/use-stage-height'
import { useBottomChromeCover } from '@/composables/ui/safe-area'
import { dockSlideIn, dockSlideOut } from '@/utils/animations/dock-slide'

const { el, is_visible, is_flush, setHeightOwner } = useMobileDock()

const { is_covered: is_bottom_chrome_covering } = useBottomChromeCover()

const bar = useTemplateRef<HTMLElement>('bar')
const content_wrapper = useTemplateRef<HTMLElement>('content_wrapper')
const content = useTemplateRef<HTMLElement>('content')

// The allowance is earned by being flush to the edge, not by being on a touch device, and
// floors at the bar's own top padding so a browser reporting no inset still clears it.
// →[K:dock-edge-inset-follows-flush]
const has_edge_allowance = computed(() => is_flush.value && !is_bottom_chrome_covering.value)

/**
 * Publishes the dock's live height to `--mobile-dock-height` on `:root`, so any view can
 * pad content clear of the bar. Reports 0 while the dock is hidden, collapsing the gap.
 */
function publishHeight() {
  const height = is_visible.value ? (content.value?.offsetHeight ?? 0) : 0
  document.documentElement.style.setProperty('--mobile-dock-height', `${height}px`)
}

// The bar follows its content's height through the stage — clipping and releasing
// the box itself while it moves, standing down while content inside claims the
// height so only one tween ever runs. The claim is published for that content to
// take. →[K:dock-height-single-owner]
const { claimHeight } = useStageHeight(content_wrapper, content, {
  active: () => is_visible.value,
  onSettled: publishHeight
})

// Wrap the stage claim so releasing it republishes the settled height: the claimed
// animation drove the content past what `--mobile-dock-height` last saw, and no
// resize follows to catch it up otherwise. →[K:dock-height-single-owner]
function claimDockHeight() {
  const release = claimHeight()

  return () => {
    release()
    publishHeight()
  }
}

onMounted(() => {
  el.value = bar.value
  setHeightOwner(claimDockHeight)
  publishHeight()
})

onBeforeUnmount(() => {
  setHeightOwner(null)
  document.documentElement.style.removeProperty('--mobile-dock-height')
})

watch(is_visible, publishHeight, { flush: 'post' })
</script>

<template>
  <Transition :css="false" @enter="dockSlideIn" @leave="dockSlideOut">
    <footer
      v-show="is_visible"
      ref="bar"
      data-testid="mobile-dock-host"
      data-station="panel"
      class="fixed bottom-0 left-0 z-30 w-full rounded-t-6 bg-surface contain-[layout_style] transform-[translateZ(0)] sm:bottom-3 sm:left-auto sm:right-3 sm:w-96 sm:rounded-6 [--dock-px:1.25rem] [--dock-pt:1rem] [--dock-pb:0.5rem] ring-1 ring-line"
      :class="
        has_edge_allowance && '[--dock-pb:max(1rem,calc(0.5rem+env(safe-area-inset-bottom)))]'
      "
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
  </Transition>
</template>
