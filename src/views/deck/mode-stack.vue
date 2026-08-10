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
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import { useMatchMedia } from '@/composables/ui/media-query'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

type ModeStackProps = {
  sticky_header?: HTMLElement | null
}

const { sticky_header = null } = defineProps<ModeStackProps>()

const shell = inject(deckViewShellKey)!

// The overlay travels up from below the fold on a wide screen. There is no fold
// to travel from on a phone, where the pane fills the width, so it crossfades.
const is_mobile = useMatchMedia('w<md')

const stack = useTemplateRef<HTMLElement>('stack')
// A Set, not a counter — delete is idempotent, so an interrupted transition can't unbalance it.
const sliding_panes = ref(new Set<Element>())
// Holds the clip from mode-switch until the entering pane's transition starts
// — a lazy overlay pane can take a beat to load, and without this the stack collapses in that gap.
const switch_pending = ref(false)
const clip_min_height = ref(0)

let viewport: ModeSwitchViewport = { from_y: 0, settle_y: 0, stack_top: 0 }

const overlay_pane = computed(() =>
  shell.is_view.value ? null : DECK_MODES[shell.mode.value].pane
)
const is_transitioning = computed(
  () => !is_mobile.value && (switch_pending.value || sliding_panes.value.size > 0)
)
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
  if (is_mobile.value) return

  sliding_panes.value.add(el)
  primeOverlayBelow(el, viewport)
}

function onOverlayEnter(el: Element, done: () => void) {
  if (is_mobile.value) return fadeEnter(el, done)

  slideOverlayUp(el, done)
}

function onOverlayAfterEnter(el: Element) {
  if (!is_mobile.value) {
    settleOverlay(el)
    sliding_panes.value.delete(el)
  }

  shell.notifyModeSettled()
}

function onOverlayBeforeLeave(el: Element) {
  if (!is_mobile.value) sliding_panes.value.add(el)
}

function onOverlayLeave(el: Element, done: () => void) {
  if (is_mobile.value) return fadeLeave(el, done)

  slideOverlayDown(el, viewport, done)
}

function onOverlayAfterLeave(el: Element) {
  sliding_panes.value.delete(el)
}

// On a rapid mode flip Vue fires *-cancelled instead of *-after — drop the
// pane from the in-flight set so `is_transitioning` can't latch on forever.
function onOverlayCancelled(el: Element) {
  cancelOverlayAnimation(el)
  sliding_panes.value.delete(el)
}

// Sync flush: the DOM still shows the outgoing mode, so the capture reads the
// scroll and rects the user is actually looking at.
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
      @enter="onOverlayEnter"
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
