<script setup lang="ts">
import Card from '@/components/card/index.vue'
import TextEditor from '@/components/card/text-editor.vue'
import { computed } from 'vue'
import { useDeckContext } from '../deck-context'

type CardSide = 'front' | 'back'

const { card, side } = defineProps<{
  card?: Card
  side: CardSide
}>()

const emit = defineEmits<{
  (e: 'update', side: CardSide, text: string): void
}>()

const deck_context = useDeckContext()

const attributes = computed(() =>
  side === 'front'
    ? deck_context.value.card_attributes?.front
    : deck_context.value.card_attributes?.back
)

const text = computed(() => (side === 'front' ? card?.front_text : card?.back_text))
</script>

<template>
  <card
    data-testid="study-card-edit"
    size="xl"
    mode="edit"
    :side="side"
    v-bind="card"
    :card_attributes="deck_context.card_attributes"
  >
    <template #editor>
      <text-editor
        :key="`${card?.id}-${side}`"
        data-testid="study-card-edit__input"
        :content="text"
        :attributes="attributes"
        :placeholder="
          side === 'front'
            ? $t('study-session.edit.front-placeholder')
            : $t('study-session.edit.back-placeholder')
        "
        class="w-full h-full"
        @update="emit('update', side, $event)"
      />
    </template>
  </card>
</template>
