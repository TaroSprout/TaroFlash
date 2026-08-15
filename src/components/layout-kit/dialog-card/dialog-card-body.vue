<script setup lang="ts">
import { computed } from 'vue'
import ScrollRegion from '@/components/layout-kit/scroll-region/index.vue'

/**
 * The dialog-card's opt-in scrolling region — owns the overflow and the bottom padding. →[K:dialog-card-overflow-bleed]
 */

type DialogCardBodyProps = {
  /** Selector or element for an inner scroller (an options-panel's content, say) when the overflow lives deeper than this wrapper; omitted, the body scrolls. */
  scroll_target?: string | HTMLElement
  /** Opt-in horizontal bleed for corner-overhang content that `overflow-y-auto` would otherwise clip. →[K:dialog-card-overflow-bleed] */
  overflow_bleed?: boolean
}

const { scroll_target, overflow_bleed = false } = defineProps<DialogCardBodyProps>()

const scroller_class = computed(() =>
  ['pb-(--dialog-body-pb,var(--dialog-px))', overflow_bleed ? 'px-2.5 -mx-2.5' : ''].join(' ')
)
</script>

<template>
  <scroll-region
    data-testid="dialog-card-body"
    :data-overflow-bleed="overflow_bleed || undefined"
    class="relative flex min-h-0 flex-col"
    :style="{ '--scroll-track-inset-end': 'var(--dialog-body-pb, var(--dialog-px))' }"
    :target="scroll_target"
    :scroller_class="scroller_class"
  >
    <slot></slot>
  </scroll-region>
</template>
