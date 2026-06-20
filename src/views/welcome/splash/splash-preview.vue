<script setup lang="ts">
import PinnedPreview from '@/components/deck/pinned-preview.vue'
import { ref } from 'vue'
import { emitSfx } from '@/sfx/bus'

const preview_side = ref<CardSide>('cover')

const preview_cover: DeckCover = {
  theme: 'red-500',
  theme_dark: 'red-600',
  pattern: 'endless-clouds',
  icon: 'piggy-bank'
}

const preview_attributes: DeckCardAttributes = {
  front: { horizontal_alignment: 'center', vertical_alignment: 'center' },
  back: { horizontal_alignment: 'center', vertical_alignment: 'center' }
}

function flipPreviewSide(side: CardSide) {
  preview_side.value = side
  emitSfx('slide_up')
}
</script>

<template>
  <div data-testid="welcome-hero__preview" class="flex justify-center md:justify-end pr-4">
    <pinned-preview
      :cover="preview_cover"
      :card_attributes="preview_attributes"
      :side="preview_side"
      @update:side="flipPreviewSide"
    />
  </div>
</template>
