<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import UiScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { useDialogCardViewport } from './dialog-card-viewport'

/** The dialog-card's opt-in scrolling region — owns the overflow, bottom padding, and custom scroll-bar placement. →[K:dialog-card-overflow-bleed] */

type DialogCardBodyProps = {
  /** Selector or element for an inner scroller (an options-panel's content, say) when the overflow lives deeper than this wrapper; omitted, the body scrolls. */
  scroll_target?: string | HTMLElement
  /** Opt-in horizontal bleed for corner-overhang content that `overflow-y-auto` would otherwise clip. →[K:dialog-card-overflow-bleed] */
  overflow_bleed?: boolean
}

const { scroll_target, overflow_bleed = false } = defineProps<DialogCardBodyProps>()

const viewport = useDialogCardViewport()

const content_el = useTemplateRef<HTMLElement>('content')

const target = computed(() => scroll_target ?? content_el.value ?? undefined)
</script>

<template>
  <div data-testid="dialog-card-body" class="relative flex min-h-0 flex-col">
    <div
      ref="content"
      data-testid="dialog-card-body__content"
      :data-overflow-bleed="overflow_bleed || undefined"
      class="flex min-h-0 flex-1 flex-col pb-(--dialog-body-pb,var(--dialog-px))"
      :class="[
        scroll_target ? '' : 'overflow-y-auto scroll-hidden',
        overflow_bleed ? 'px-2.5 -mx-2.5' : ''
      ]"
    >
      <slot></slot>
    </div>

    <ui-scroll-bar
      v-if="target && viewport !== 'mobile'"
      :target="target"
      min-width="sm"
      class="absolute -right-8 top-0 bottom-(--dialog-body-pb,var(--dialog-px))"
    />
  </div>
</template>
