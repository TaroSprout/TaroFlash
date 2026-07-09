<script setup lang="ts">
import { computed, inject, ref, useTemplateRef, watch } from 'vue'
import { DECK_MODES } from './modes'
import {
  captureModeSwitch,
  distanceToViewportBottom,
  fadeScaleEnter,
  fadeScaleLeave,
  primeOverlayBelow,
  slideOverlayUp,
  settleOverlay,
  slideOverlayDown,
  cancelOverlayAnimation,
  type ModeSwitchViewport
} from '@/utils/animations/deck-view/card-overlay'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

type ModeStackProps = {
  sticky_header?: HTMLElement | null
}

const { sticky_header = null } = defineProps<ModeStackProps>()

const shell = inject(deckViewShellKey)!

const stack = useTemplateRef<HTMLElement>('stack')
// Panes currently mid-slide, keyed by element. A Set (not a counter) so an
// interrupted transition can't unbalance it: delete is idempotent, and the next
// add/delete cycle reconciles a missed terminal hook.
const sliding_panes = ref(new Set<Element>())
const switch_pending = ref(false)
const clip_min_height = ref(0)

let viewport: ModeSwitchViewport = { from_y: 0, settle_y: 0, stack_top: 0 }

const overlay_pane = computed(() =>
  shell.is_view.value ? null : DECK_MODES[shell.mode.value].pane
)
const is_transitioning = computed(() => switch_pending.value || sliding_panes.value.size > 0)
const clip_style = computed(() =>
  is_transitioning.value ? { minHeight: `${clip_min_height.value}px` } : undefined
)

function onGridEnter(el: Element, done: () => void) {
  switch_pending.value = false
  fadeScaleEnter(el, () => {
    done()
    shell.notifyModeSettled()
  })
}

function onGridLeave(el: Element, done: () => void) {
  fadeScaleLeave(el, viewport, done)
}

// The overlay overhangs the container as it travels, so clip only while it
// slides — released at rest so card menus can overflow normally.
function onOverlayBeforeEnter(el: Element) {
  switch_pending.value = false
  sliding_panes.value.add(el)
  primeOverlayBelow(el, viewport)
}

function onOverlayAfterEnter(el: Element) {
  settleOverlay(el)
  sliding_panes.value.delete(el)
  shell.notifyModeSettled()
}

function onOverlayBeforeLeave(el: Element) {
  sliding_panes.value.add(el)
}

function onOverlayLeave(el: Element, done: () => void) {
  slideOverlayDown(el, viewport, done)
}

function onOverlayAfterLeave(el: Element) {
  sliding_panes.value.delete(el)
}

// A rapid mode flip can yank an entering/leaving pane before its slide
// finishes; Vue fires the *-cancelled hook instead of *-after. Stop the tween
// and drop the pane from the in-flight set so `is_transitioning` can't latch on
// forever — which would strand the clip min-height and leave the page scrolled
// past its content.
function onOverlayCancelled(el: Element) {
  cancelOverlayAnimation(el)
  sliding_panes.value.delete(el)
}

// Sync flush: the DOM still shows the outgoing mode, so the capture reads the
// scroll and rects the user is actually looking at. The scroll jump is never
// seen — the transition hooks re-offset both panes before the next paint.
// `switch_pending` holds the clip from this moment until the entering pane's
// transition starts: a lazy overlay pane can take a beat to load on first
// entry, and without the held min-height the stack collapses in that gap.
watch(
  shell.mode,
  () => {
    if (!stack.value) return

    switch_pending.value = true
    viewport = captureModeSwitch(stack.value, sticky_header)
    clip_min_height.value = distanceToViewportBottom(viewport)
    window.scrollTo(0, viewport.settle_y)
  },
  { flush: 'sync' }
)
</script>

<template>
  <div
    ref="stack"
    data-testid="deck-view__mode-stack"
    class="relative w-full"
    :class="{ 'overflow-hidden': is_transitioning }"
    :style="clip_style"
  >
    <Transition :css="false" @enter="onGridEnter" @leave="onGridLeave">
      <component :is="DECK_MODES.view.pane" v-show="shell.is_view.value" class="w-full" />
    </Transition>

    <Transition
      :css="false"
      @before-enter="onOverlayBeforeEnter"
      @enter="slideOverlayUp"
      @after-enter="onOverlayAfterEnter"
      @enter-cancelled="onOverlayCancelled"
      @before-leave="onOverlayBeforeLeave"
      @leave="onOverlayLeave"
      @after-leave="onOverlayAfterLeave"
      @leave-cancelled="onOverlayCancelled"
    >
      <component :is="overlay_pane" v-if="overlay_pane" :key="shell.mode.value" class="w-full" />
    </Transition>
  </div>
</template>
