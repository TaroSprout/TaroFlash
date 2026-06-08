<script setup lang="ts">
import { computed, inject } from 'vue'
import CardGrid from './card-grid/scroll-grid.vue'
import CardEditor from './card-editor/index.vue'
import CardImporter from './card-importer.vue'
import {
  primeOverlayBelow,
  slideOverlayUp,
  settleOverlay,
  slideOverlayDown
} from '@/utils/animations/deck-view/card-overlay'
import type { CardListController } from '@/composables/card-editor/card-list-controller'

const editor = inject<CardListController>('card-editor')!

const mode_component = computed(() => {
  if (editor.mode.value === 'edit') return CardEditor
  if (editor.mode.value === 'import-export') return CardImporter
  return CardGrid
})
</script>

<template>
  <div data-testid="deck-view__mode-stack" class="relative w-full">
    <Transition
      :css="false"
      @before-enter="primeOverlayBelow"
      @enter="slideOverlayUp"
      @after-enter="settleOverlay"
      @leave="slideOverlayDown"
    >
      <component :is="mode_component" :key="editor.mode.value" class="w-full" />
    </Transition>
  </div>
</template>
