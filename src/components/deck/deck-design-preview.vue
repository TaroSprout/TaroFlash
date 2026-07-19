<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '@/components/card/index.vue'

type DeckPreviewProps = {
  cover: DeckCover
  card_attributes: DeckCardAttributes
  side: CardSide
  front_text?: string
  back_text?: string
}

const SIDE_ORDER: CardSide[] = ['cover', 'front', 'back']

const { side, front_text, back_text } = defineProps<DeckPreviewProps>()

const emit = defineEmits<{
  (e: 'update:side', value: CardSide): void
}>()

const { t } = useI18n()

const preview_text = computed(() => {
  if (side === 'front') return front_text || t('deck.settings-modal.preview.front-fallback')
  return back_text || t('deck.settings-modal.preview.back-fallback')
})

function cycleSide() {
  const index = SIDE_ORDER.indexOf(side)
  emit('update:side', SIDE_ORDER[(index + 1) % SIDE_ORDER.length])
}
</script>

<template>
  <div data-testid="deck-design-preview">
    <card
      class="w-(--card-w-full) cursor-pointer"
      :side="side"
      :front_text="side === 'front' ? preview_text : undefined"
      :back_text="side === 'back' ? preview_text : undefined"
      :cover_config="cover"
      :card_attributes="card_attributes"
      face_classes="border-t border-l border-brown-100 dark:border-stone-900"
      @click="cycleSide"
    />
  </div>
</template>
