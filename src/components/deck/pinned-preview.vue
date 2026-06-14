<script setup lang="ts">
import DeckDesignPreview from './deck-design-preview.vue'
import Card from '@/components/card/index.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

type DeckPinnedPreviewProps = {
  deck_id?: number
  cover: DeckCover
  card_attributes: DeckCardAttributes
  side: CardSide
}

const { deck_id, cover, card_attributes, side } = defineProps<DeckPinnedPreviewProps>()

const emit = defineEmits<{
  'update:side': [value: CardSide]
}>()
</script>

<template>
  <div data-testid="deck-pinned-preview" class="relative">
    <card
      data-testid="deck-pinned-preview__shadow-card"
      size="xl"
      class="absolute! -top-2 right-1"
      face_classes="bg-white! dark:bg-stone-700!"
    />

    <div
      data-testid="deck-pinned-preview__paperclip"
      class="absolute -top-8 right-15 -translate-x-1/2 z-10 drop-shadow-2xs"
    >
      <ui-icon src="paperclip" class="w-16 h-16 -rotate-186 text-grey-300" />
    </div>

    <deck-design-preview
      data-testid="deck-pinned-preview__preview"
      :deck_id="deck_id"
      :cover="cover"
      :card_attributes="card_attributes"
      :side="side"
      class="rotate-4 drop-shadow-sm"
      @update:side="emit('update:side', $event)"
    />
  </div>
</template>
