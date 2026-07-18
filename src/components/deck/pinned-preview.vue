<script setup lang="ts">
import DeckDesignPreview from './deck-design-preview.vue'
import Card from '@/components/card/index.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

type DeckPinnedPreviewProps = {
  cover: DeckCover
  card_attributes: DeckCardAttributes
  side: CardSide
  front_text?: string
  back_text?: string
}

const { cover, card_attributes, side, front_text, back_text } =
  defineProps<DeckPinnedPreviewProps>()

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
      class="absolute -top-8 right-15 -translate-x-1/2 z-10 drop-shadow-2xs transition-opacity duration-100 group-data-[tucked=true]:opacity-0"
    >
      <ui-icon src="paperclip" class="w-16 h-16 -rotate-186 text-grey-300" />
    </div>

    <deck-design-preview
      data-testid="deck-pinned-preview__preview"
      :cover="cover"
      :card_attributes="card_attributes"
      :side="side"
      :front_text="front_text"
      :back_text="back_text"
      class="rotate-4 drop-shadow-sm"
      @update:side="emit('update:side', $event)"
    />
  </div>
</template>
