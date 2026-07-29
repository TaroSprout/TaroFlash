<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import UiScrollBar from '@/components/ui-kit/scroll-bar.vue'
import { useDialogCardViewport } from './dialog-card-viewport'

/**
 * The dialog-card's scrolling region. Opt-in: wrap the default slot in it when
 * the body can overflow, and it owns the overflow, the bottom padding, and the
 * custom scroll-bar's placement — the three things every scrolling call site
 * used to hand-roll slightly differently.
 *
 * `--dialog-body-pb` comes from the card and collapses to 0 when the card has a
 * `#toolbar`, since the toolbar row then owns the space above the bottom edge.
 * The fallback keeps a body rendered outside a dialog-card sane.
 *
 * The scroll-bar hangs in the card's own horizontal padding (`-right-6` against
 * a `--dialog-px` of 1.5–2rem), so the body has to sit in the content column
 * rather than break out of it.
 */

type DialogCardBodyProps = {
  // Selector or element for an inner scroller (an options-panel's content, say)
  // when the overflow lives deeper than this wrapper. Omitted, the body scrolls.
  scroll_target?: string | HTMLElement
}

const { scroll_target } = defineProps<DialogCardBodyProps>()

const viewport = useDialogCardViewport()

const content_el = useTemplateRef<HTMLElement>('content')

const target = computed(() => scroll_target ?? content_el.value ?? undefined)
</script>

<template>
  <div data-testid="dialog-card-body" class="relative flex min-h-0 flex-col">
    <div
      ref="content"
      data-testid="dialog-card-body__content"
      class="flex min-h-0 flex-1 flex-col pb-(--dialog-body-pb,var(--dialog-px))"
      :class="scroll_target ? '' : 'overflow-y-auto scroll-hidden'"
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
