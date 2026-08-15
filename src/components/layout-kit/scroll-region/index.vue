<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import UiScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { useScrollMetrics, type ScrollTarget } from './use-scroll-metrics'

/** A scrolling area that draws its own handle beside itself. The host positions this root — the handle anchors to it. */

type ScrollRegionProps = {
  /** An outside element that scrolls in this one's place — an element, a selector, or `html` for the page. */
  target?: ScrollTarget
  /** `outside` hangs the handle in a gutter beyond the region's edge; `inside` reserves that gutter within it. */
  gutter?: 'outside' | 'inside'
  /** Classes for the scrolling box itself — anything that has to sit inside the clipped area. */
  scroller_class?: string
}

const { target, gutter = 'outside', scroller_class = '' } = defineProps<ScrollRegionProps>()

const scroller_el = useTemplateRef<HTMLElement>('scroller')

const scroll_target = computed<ScrollTarget>(() => target ?? scroller_el.value)

const { overflowing, progress, visible_fraction, scrollToProgress } =
  useScrollMetrics(scroll_target)
</script>

<template>
  <div
    data-testid="scroll-region"
    class="scroll-region"
    :data-gutter="gutter"
    :data-scroll="target ? 'external' : 'self'"
  >
    <div
      ref="scroller"
      data-testid="scroll-region__scroller"
      class="scroll-region__scroller scroll-hidden flex min-h-0 flex-1 flex-col"
      :class="scroller_class"
    >
      <slot></slot>
    </div>

    <ui-scroll-bar
      v-if="overflowing"
      data-testid="scroll-region__handle"
      class="scroll-region__handle"
      :progress="progress"
      :visible_fraction="visible_fraction"
      @drag="scrollToProgress"
      @jump="scrollToProgress"
    />
  </div>
</template>

<style scoped>
.scroll-region {
  --scroll-gutter: 2rem;
}

/* Whether the box scrolls is an attribute the browser reads, not a bound class —
   Vue re-writing `class` on a scrolling element mid-gesture kills iOS momentum
   scroll. */
.scroll-region[data-scroll='self'] > .scroll-region__scroller {
  overflow-y: auto;
}

.scroll-region[data-scroll='self'][data-gutter='inside'] {
  padding-inline-end: var(--scroll-gutter);
}

.scroll-region > .scroll-region__handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: var(--scroll-track-inset-end, 0px);
}

.scroll-region[data-gutter='outside'] > .scroll-region__handle {
  right: calc(-1 * var(--scroll-gutter));
}
</style>
