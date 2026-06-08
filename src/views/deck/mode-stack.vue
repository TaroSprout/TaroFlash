<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import CardGrid from './card-grid/scroll-grid.vue'
import CardEditor from './card-editor/index.vue'
import CardImporter from './card-importer.vue'
import {
  fadeScaleEnter,
  fadeScaleLeave,
  primeOverlayBelow,
  slideOverlayUp,
  settleOverlay,
  slideOverlayDown
} from '@/utils/animations/deck-view/card-overlay'
import type { CardListController } from '@/composables/card-editor/card-list-controller'

const editor = inject<CardListController>('card-editor')!

const sliding = ref(0)

const is_view = computed(() => editor.mode.value === 'view')
const overlay_component = computed(() =>
  editor.mode.value === 'import-export' ? CardImporter : CardEditor
)
const is_transitioning = computed(() => sliding.value > 0)

// The overlay overhangs the container as it travels, so clip only while it
// slides — released at rest so card menus can overflow normally.
function onOverlayBeforeEnter(el: Element) {
  sliding.value++
  primeOverlayBelow(el)
}

function onOverlayAfterEnter(el: Element) {
  settleOverlay(el)
  sliding.value--
}

function onOverlayBeforeLeave() {
  sliding.value++
}

function onOverlayAfterLeave() {
  sliding.value--
}
</script>

<template>
  <div
    data-testid="deck-view__mode-stack"
    class="relative w-full"
    :class="{ 'overflow-hidden': is_transitioning }"
  >
    <Transition :css="false" @enter="fadeScaleEnter" @leave="fadeScaleLeave">
      <card-grid v-show="is_view" class="w-full" />
    </Transition>

    <Transition
      :css="false"
      @before-enter="onOverlayBeforeEnter"
      @enter="slideOverlayUp"
      @after-enter="onOverlayAfterEnter"
      @before-leave="onOverlayBeforeLeave"
      @leave="slideOverlayDown"
      @after-leave="onOverlayAfterLeave"
    >
      <component :is="overlay_component" v-if="!is_view" :key="editor.mode.value" class="w-full" />
    </Transition>
  </div>
</template>
