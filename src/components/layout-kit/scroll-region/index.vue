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
/* The gutter only exists where a handle is drawn — `ui-kit/scroll-bar` hides
   itself on a coarse pointer, so reserving space for it there would leave a
   dead band no one can grab. Everything else here is derived from it, so on a
   coarse pointer the consumer keeps all of its own padding and the band the
   handle would have sat in disappears. */
.scroll-region {
  --scroll-gutter: 0px;

  /* How far in from this box's end edge the consumer wants its content to stop,
     named in `--scroll-content-inset` on any element above this one. A consumer
     that names nothing gets the handle's full band and nothing beyond it. */
  --scroll-content-end: var(--scroll-content-inset, var(--scroll-gutter));

  /* The slice of that space the handle's band takes. Never wider than the space
     the consumer allotted — a window whose content sits closer in than the band
     narrows the band, rather than having its content column pushed in past
     where the design put it and its end edge left wider than its start one. */
  --scroll-handle-band: min(var(--scroll-gutter), var(--scroll-content-end));

  /* End padding a consumer applies instead of the inset it asked for in
     `--scroll-content-inset`: the handle's band takes the rest, so the content
     column ends up in the same place whether or not a handle is drawn. */
  --scroll-content-pad-end: calc(var(--scroll-content-end) - var(--scroll-handle-band));

  /* Clear air the handle keeps between itself and where the content ends. Turn
     this one number to re-tune every region at once — a consumer setting its own
     would put the per-window guesswork back that `--scroll-content-inset` took
     out. */
  --scroll-handle-gap: 0.5rem;

  /* Where the handle's band ends, measured in from this box's own end edge. The
     gap is only ever taken out of padding the consumer actually has going spare,
     so a consumer whose content already reaches the handle's band keeps the
     handle where it was rather than having it pushed off the edge. */
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

/* The handle is absolutely positioned, so a region owning its own scroller has
   to be the box it measures against. An external target keeps the host's
   positioning — the host is what placed the region. */
.scroll-region[data-scroll='self'] {
  position: relative;
}

/* Whether the box scrolls is an attribute the browser reads, not a bound class —
   Vue re-writing `class` on a scrolling element mid-gesture kills iOS momentum
   scroll. */
.scroll-region[data-scroll='self'] > .scroll-region__scroller {
  overflow-y: auto;
}

/* Holds the content column to the same width it has where no handle is drawn.
   It sits on the scrolling box, never on the region itself — the handle is
   positioned against the region's padding box, so padding here would shift the
   handle by the same width a second time. */
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

/* Puts the bar in the band a short way outside where the content ends, so it
   reads as belonging to the rows rather than to the box they scroll in. A
   consumer that wants that says how far in its content sits by setting
   `--scroll-content-inset` on any element above this one, and pads its own end
   edge with the `--scroll-content-pad-end` published above; leaving both alone
   parks the bar at this box's own edge. The `translateX` centres the bar on the
   band's midline by half its own width, so it can be re-sized without retuning
   this. */
.scroll-region[data-scroll='self'][data-gutter='inside'] > .scroll-region__handle {
  right: calc(var(--scroll-handle-inset-end) + var(--scroll-handle-band) / 2);
  transform: translateX(50%);
}
</style>
