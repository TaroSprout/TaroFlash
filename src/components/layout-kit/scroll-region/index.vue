<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import UiScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { scrollHandleEnter } from '@/utils/animations/scroll-handle'
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

    <transition :css="false" @enter="scrollHandleEnter">
      <ui-scroll-bar
        v-if="overflowing"
        data-testid="scroll-region__handle"
        class="scroll-region__handle"
        :progress="progress"
        :visible_fraction="visible_fraction"
        @drag="scrollToProgress"
        @jump="scrollToProgress"
      />
    </transition>
  </div>
</template>

<style scoped>
/* Every distance below starts from the gutter, which stays 0 where no handle is
   drawn — the bar hides on a coarse pointer, and a band no one can grab is dead
   space. */
.scroll-region {
  --scroll-gutter: 0px;

  /* How far in from this box's end edge content stops; a consumer moves it with `--scroll-content-inset`. */
  --scroll-content-end: var(--scroll-content-inset, var(--scroll-gutter));

  /* Never wider than the space the consumer allotted, so its content column is never pushed further in. */
  --scroll-handle-band: min(var(--scroll-gutter), var(--scroll-content-end));

  /* End padding a consumer applies instead of the inset it asked for — the band takes the rest. */
  --scroll-content-pad-end: calc(var(--scroll-content-end) - var(--scroll-handle-band));

  /* Clear air between handle and content, tuned here for every region at once. */
  --scroll-handle-gap: 0.5rem;

  /* Only ever eats padding the consumer has going spare, so the handle can't be pushed off the edge. */
  --scroll-handle-inset-end: max(
    0px,
    calc(var(--scroll-content-pad-end) - var(--scroll-handle-gap))
  );
}

@media (pointer: fine) {
  .scroll-region {
    --scroll-gutter: 2rem;
  }
}

/* The handle is placed against this box; a region pointed at an outside scroller is positioned by
   its host instead. */
.scroll-region[data-scroll='self'] {
  position: relative;
}

/* A host stops this box scrolling by setting `--scroll-overflow: visible` above the region, never a
   class — this rule out-specifies a utility, and rewriting a scrolling box's class mid-gesture
   kills iOS momentum scroll. →[K:mid-gesture-mutation-kills-momentum-scroll] */
.scroll-region[data-scroll='self'] > .scroll-region__scroller {
  overflow-y: var(--scroll-overflow, auto);
}

/* Pads the scrolling box, never the region — the handle is placed against the region's padding box,
   so padding there would shift it a second time. */
.scroll-region[data-scroll='self'][data-gutter='inside'] > .scroll-region__scroller {
  padding-inline-end: var(--scroll-handle-band);
}

.scroll-region > .scroll-region__handle {
  position: absolute;
  top: var(--scroll-track-inset-start, 0px);
  right: 0;
  bottom: var(--scroll-track-inset-end, 0px);
}

.scroll-region[data-gutter='outside'] > .scroll-region__handle {
  right: calc(-1 * var(--scroll-gutter));
}

/* Centres the bar on the band just outside where content ends, so it reads as belonging to the rows
   rather than to the box they scroll in. */
.scroll-region[data-scroll='self'][data-gutter='inside'] > .scroll-region__handle {
  right: calc(var(--scroll-handle-inset-end) + var(--scroll-handle-band) / 2);
  transform: translateX(50%);
}
</style>
