<script setup lang="ts">
import SessionHeader from './session-header.vue'
import CardStage from './card-stage.vue'
import StudyEditFooter from './study-edit-footer.vue'
import RatingButtons from './rating-buttons.vue'
import FinishAnimation from './finish-animation.vue'
import { useFlashcardSession } from '@/composables/study-session/flashcard-session'
import { useCardPreview } from '@/composables/study-session/card-preview'
import { useCardEdit } from '@/composables/study-session/card-edit'
import { useSessionCards } from '@/composables/study-session/session-cards'
import { useModalRequestClose } from '@/composables/modal'
import { type Grade } from 'ts-fsrs'
import { computed, useTemplateRef } from 'vue'
import { useFlushDeckReviews } from '@/api/reviews'

const { deck, config_override } = defineProps<{
  deck: Deck
  config_override?: Partial<DeckConfig>
}>()

const emit = defineEmits<{
  (e: 'closed'): void
  (
    e: 'finished',
    score: number,
    total: number,
    remaining_due: number,
    study_all_used: boolean
  ): void
}>()

defineExpose({ requestClose })
useModalRequestClose(requestClose)

const {
  mode,
  cards,
  current_card_side,
  current_index,
  active_card,
  num_correct,
  reviewed_count,
  remaining_due_count,
  is_starting_side,
  config,
  next_card,
  is_cover,
  reviewCard,
  setCards,
  startSession,
  flipCurrentCard
} = useFlashcardSession({ ...deck.study_config, ...config_override })

const { next_card_side, preview_style, onDragProgress, onNextCardFlipped, awaitFlip } =
  useCardPreview(next_card)

const {
  editing,
  saving,
  start: startEdit,
  stop: stopEdit,
  update: onEditUpdate
} = useCardEdit(active_card, () => deck.id)

const { loading } = useSessionCards({
  deckId: () => deck.id,
  studyAllCards: () => !!config.study_all_cards,
  seed: setCards,
  onMissingDeck: () => emit('closed')
})

const stage = useTemplateRef('stage')
const flushDeckReviews = useFlushDeckReviews()

const can_edit = computed(() => !loading.value && !editing.value && !is_cover.value)

/** Called by the shell's close button and by the modal backdrop / esc handler. */
function requestClose() {
  if (is_cover.value || reviewed_count.value === 0) {
    emit('closed')
    return
  }

  mode.value = 'completed'
}

function onFinishAnimationDone() {
  if (deck.id) flushDeckReviews(deck.id)
  emit(
    'finished',
    num_correct.value,
    cards.value.length,
    remaining_due_count.value,
    config.study_all_cards
  )
}

/** Triggers the fling animation on the card stage; reviewed event follows. */
function onRated(grade: Grade) {
  stage.value?.rate(grade)
}

async function onCardReviewed(grade?: Grade) {
  if (!active_card.value?.id || mode.value !== 'studying') return

  if (next_card.value) await awaitFlip(config.flip_cards ? 'back' : 'front')

  reviewCard(grade)
}
</script>

<template>
  <div
    data-testid="study-session__body"
    :data-theme="deck.cover_config?.theme ?? 'purple-500'"
    class="w-full flex flex-col items-center justify-between gap-4 self-center pb-8 px-8"
    :class="{ 'opacity-0 pointer-events-none': mode !== 'studying' }"
  >
    <session-header
      :editing="editing"
      :saving="saving"
      :current_index="current_index"
      :total="cards.length"
      :is_cover="is_cover"
      :can_edit="can_edit"
      @edit="startEdit"
    />

    <card-stage
      ref="stage"
      :loading="loading"
      :editing="editing"
      :active_card="active_card"
      :current_card_side="current_card_side"
      :next_card="next_card"
      :next_card_side="next_card_side"
      :preview_style="preview_style"
      @started="startSession"
      @side-changed="flipCurrentCard"
      @reviewed="onCardReviewed"
      @drag-progress="onDragProgress"
      @next-flipped="onNextCardFlipped"
      @edit-update="onEditUpdate"
    />

    <rating-buttons
      v-if="!editing"
      class="z-10 mt-4"
      :options="active_card?.preview"
      :side="current_card_side"
      @started="startSession"
      @rated="onRated"
      @revealed="flipCurrentCard"
    />

    <study-edit-footer
      v-else
      :is_starting_side="is_starting_side"
      @flip="flipCurrentCard"
      @done="stopEdit"
    />
  </div>

  <finish-animation v-if="mode === 'completed'" @done="onFinishAnimationDone" />
</template>
