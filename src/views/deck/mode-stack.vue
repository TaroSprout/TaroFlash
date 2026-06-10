<script setup lang="ts">
import { computed, inject, ref, useTemplateRef, watch } from 'vue'
import CardGrid from './card-grid/scroll-grid.vue'
import CardEditor from './card-editor/index.vue'
import CardImporter from './card-importer.vue'
import {
  captureModeSwitch,
  distanceToViewportBottom,
  fadeScaleEnter,
  fadeScaleLeave,
  primeOverlayBelow,
  slideOverlayUp,
  settleOverlay,
  slideOverlayDown,
  type ModeSwitchViewport
} from '@/utils/animations/deck-view/card-overlay'
import type { CardListController } from '@/composables/card-editor/card-list-controller'

type ModeStackProps = {
  sticky_header?: HTMLElement | null
}

const { sticky_header = null } = defineProps<ModeStackProps>()

const editor = inject<CardListController>('card-editor')!

const stack = useTemplateRef<HTMLElement>('stack')
const sliding = ref(0)
const clip_min_height = ref(0)

let viewport: ModeSwitchViewport = { from_y: 0, settle_y: 0, stack_top: 0 }

const is_view = computed(() => editor.mode.value === 'view')
const overlay_component = computed(() =>
  editor.mode.value === 'import-export' ? CardImporter : CardEditor
)
const is_transitioning = computed(() => sliding.value > 0)
const clip_style = computed(() =>
  is_transitioning.value ? { minHeight: `${clip_min_height.value}px` } : undefined
)

function onGridEnter(el: Element, done: () => void) {
  fadeScaleEnter(el, done)
}

function onGridLeave(el: Element, done: () => void) {
  fadeScaleLeave(el, viewport, done)
}

// The overlay overhangs the container as it travels, so clip only while it
// slides — released at rest so card menus can overflow normally.
function onOverlayBeforeEnter(el: Element) {
  sliding.value++
  primeOverlayBelow(el, viewport)
}

function onOverlayAfterEnter(el: Element) {
  settleOverlay(el)
  sliding.value--
}

function onOverlayBeforeLeave() {
  sliding.value++
}

function onOverlayLeave(el: Element, done: () => void) {
  slideOverlayDown(el, viewport, done)
}

function onOverlayAfterLeave() {
  sliding.value--
}

// Sync flush: the DOM still shows the outgoing mode, so the capture reads the
// scroll and rects the user is actually looking at. The scroll jump is never
// seen — the transition hooks re-offset both panes before the next paint.
watch(
  editor.mode,
  () => {
    if (!stack.value) return

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
      <card-grid v-show="is_view" class="w-full" />
    </Transition>

    <Transition
      :css="false"
      @before-enter="onOverlayBeforeEnter"
      @enter="slideOverlayUp"
      @after-enter="onOverlayAfterEnter"
      @before-leave="onOverlayBeforeLeave"
      @leave="onOverlayLeave"
      @after-leave="onOverlayAfterLeave"
    >
      <component :is="overlay_component" v-if="!is_view" :key="editor.mode.value" class="w-full" />
    </Transition>
  </div>
</template>
