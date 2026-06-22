<script setup lang="ts">
import Card from '@/components/card/index.vue'
import StudyCard from './study-card.vue'
import StudyCardEdit from './study-card-edit.vue'
import StudyCardSkeleton from './study-card-skeleton.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { computed, useTemplateRef, type StyleValue } from 'vue'
import { type Grade } from 'ts-fsrs'
import { useDeckContext } from '../deck-context'
import { type StudyCard as StudyCardType } from '@/composables/study-session/flashcard-session'

type CardStageProps = {
  loading: boolean
  editing: boolean
  active_card?: StudyCardType
  current_card_side: CardSide
  next_card?: StudyCardType
  next_card_side: CardSide
  preview_style: StyleValue
  is_cover: boolean
}

const { loading, editing, active_card, current_card_side, next_card, next_card_side, is_cover } =
  defineProps<CardStageProps>()

const emit = defineEmits<{
  (e: 'started'): void
  (e: 'side-changed'): void
  (e: 'reviewed', grade: Grade | undefined): void
  (e: 'drag-progress', progress: number, duration: number): void
  (e: 'next-flipped'): void
  (e: 'edit-start'): void
  (e: 'edit-update', side: 'front' | 'back', text: string): void
}>()

defineExpose({ rate })

const deck_context = useDeckContext()
const study_card_ref = useTemplateRef('study-card')

const card_view = computed<'skeleton' | 'edit' | 'read'>(() => {
  if (loading) return 'skeleton'
  if (editing) return 'edit'
  return 'read'
})

/** Triggers the fling animation on the active card; its `reviewed` event follows. */
function rate(grade: Grade) {
  study_card_ref.value?.rate(grade)
}
</script>

<template>
  <div data-testid="study-card__container" class="relative flex items-center justify-center">
    <div
      v-if="!loading && next_card"
      data-testid="study-card__preview"
      class="absolute pointer-events-none"
      :style="preview_style"
    >
      <card
        :key="next_card.id"
        size="xl"
        :side="next_card_side"
        v-bind="next_card"
        :cover_config="deck_context.cover_config"
        :card_attributes="deck_context.card_attributes"
        @flip-complete="emit('next-flipped')"
      />
    </div>

    <study-card
      v-if="card_view === 'read'"
      ref="study-card"
      :key="active_card?.id"
      :card="active_card"
      :side="current_card_side"
      :options="active_card?.preview"
      @started="emit('started')"
      @side-changed="emit('side-changed')"
      @reviewed="(grade) => emit('reviewed', grade)"
      @drag-progress="(progress, duration) => emit('drag-progress', progress, duration)"
    />
    <study-card-edit
      v-else-if="card_view === 'edit' && active_card"
      :card="active_card"
      :side="current_card_side === 'back' ? 'back' : 'front'"
      @update="(side, text) => emit('edit-update', side, text)"
    />
    <study-card-skeleton v-else />

    <ui-button
      v-if="card_view === 'read' && !is_cover"
      data-testid="study-session__edit"
      data-theme="blue-500"
      class="absolute! -top-2 -right-2 z-20"
      icon-only
      rounded-full
      size="lg"
      inverted
      icon-left="edit"
      :sfx="{ press: 'pop_window' }"
      @press="emit('edit-start')"
    >
      {{ $t('study-session.flashcard.edit-card-button') }}
    </ui-button>
  </div>
</template>
