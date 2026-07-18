<script setup lang="ts">
import DeckDesignPreview from './deck-design-preview.vue'
import Card from '@/components/card/index.vue'
import UiPinnedCard from '@/components/ui-kit/pinned-card.vue'

type DeckPinnedPreviewProps = {
  cover: DeckCover
  card_attributes: DeckCardAttributes
  side: CardSide
  front_text?: string
  back_text?: string
  tucked?: boolean
}

const { cover, card_attributes, side, front_text, back_text, tucked } =
  defineProps<DeckPinnedPreviewProps>()

const emit = defineEmits<{
  'update:side': [value: CardSide]
}>()
</script>

<template>
  <ui-pinned-card data-testid="deck-pinned-preview" :tucked="tucked">
    <template #backdrop>
      <card
        data-testid="deck-pinned-preview__shadow-card"
        size="xl"
        class="absolute! -top-2 right-1"
        face_classes="bg-white! dark:bg-stone-700!"
      />
    </template>

    <deck-design-preview
      data-testid="deck-pinned-preview__preview"
      :cover="cover"
      :card_attributes="card_attributes"
      :side="side"
      :front_text="front_text"
      :back_text="back_text"
      @update:side="emit('update:side', $event)"
    />
  </ui-pinned-card>
</template>
