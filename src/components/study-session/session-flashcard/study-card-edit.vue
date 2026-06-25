<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CardEditFace from '@/components/card/edit-face.vue'
import { useDeckContext } from '../deck-context'

type CardSide = 'front' | 'back'

const { card, side } = defineProps<{
  card?: Card
  side: CardSide
}>()

const emit = defineEmits<{
  (e: 'update', side: CardSide, text: string): void
}>()

const { t } = useI18n()
const deck_context = useDeckContext()

const card_attributes = computed(
  () => deck_context.value.card_attributes ?? { front: {}, back: {} }
)
const placeholder = computed(() =>
  side === 'front'
    ? t('study-session.edit.front-placeholder')
    : t('study-session.edit.back-placeholder')
)
</script>

<template>
  <card-edit-face
    data-testid="study-card-edit"
    input_testid="study-card-edit__input"
    :card="card"
    :side="side"
    :card_attributes="card_attributes"
    :placeholder="placeholder"
    @update="(s, text) => emit('update', s, text)"
  />
</template>
