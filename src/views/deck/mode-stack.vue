<script setup lang="ts">
import { computed, inject } from 'vue'
import CardEditor from './card-editor/index.vue'
import CardGrid from './card-grid/scroll-grid.vue'
import CardImporter from './card-importer.vue'
import {
  primeOverlayBelow,
  slideOverlayUp,
  slideOverlayDown
} from '@/utils/animations/deck-view/card-overlay'
import type { CardListController } from '@/composables/card-editor/card-list-controller'

const editor = inject<CardListController>('card-editor')!

const is_editing = computed(() => editor.mode.value === 'edit')
const is_importing = computed(() => editor.mode.value === 'import-export')
</script>

<template>
  <div data-testid="deck-view__mode-stack" class="relative">
    <card-grid
      class="transition-transform duration-300 ease-out"
      :class="{ 'scale-95': editor.mode.value !== 'view' }"
    />
    <div
      data-testid="deck-view__mode-stack__overlay-clip"
      class="absolute inset-0 overflow-hidden pointer-events-none"
    >
      <Transition
        :css="false"
        @before-enter="primeOverlayBelow"
        @enter="slideOverlayUp"
        @leave="slideOverlayDown"
      >
        <div v-show="is_editing" class="size-full pointer-events-auto">
          <card-editor class="size-full" />
        </div>
      </Transition>

      <Transition
        :css="false"
        @before-enter="primeOverlayBelow"
        @enter="slideOverlayUp"
        @leave="slideOverlayDown"
      >
        <card-importer v-if="is_importing" class="size-full pointer-events-auto" />
      </Transition>
    </div>
  </div>
</template>
