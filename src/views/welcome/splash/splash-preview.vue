<script setup lang="ts">
import PinnedPreview from '@/components/deck/pinned-preview.vue'
import DeckDesignPreview from '@/components/deck/deck-design-preview.vue'
import { ref } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import { emitSfx } from '@/sfx/bus'

const is_below_lg = useMatchMedia('w<lg')

const preview_side = ref<CardSide>('cover')

const preview_cover: DeckCover = {
  palette: 'red',
  pattern: 'endless-clouds',
  icon: 'logo'
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
  <div data-testid="welcome-hero__preview" class="flex justify-center md:justify-end">
    <deck-design-preview
      v-if="is_below_lg"
      :cover="preview_cover"
      :card_attributes="preview_attributes"
      :side="preview_side"
      @update:side="flipPreviewSide"
    />
    <pinned-preview
      v-else
      :cover="preview_cover"
      :card_attributes="preview_attributes"
      :side="preview_side"
      @update:side="flipPreviewSide"
    />
  </div>
</template>
