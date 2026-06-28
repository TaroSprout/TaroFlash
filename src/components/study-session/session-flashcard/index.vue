<script setup lang="ts">
import SessionHeader from './session-header.vue'
import SessionProgress from './session-progress.vue'
import CardStage from './card-stage.vue'
import StudyEditFooter from './study-edit-footer.vue'
import RatingButtons from './rating-buttons/index.vue'
import { useFlashcardSession } from '@/components/study-session/composables/flashcard-session'
import { useCardPreview } from '@/components/study-session/composables/card-preview'
import { useCardEdit } from '@/components/study-session/composables/card-edit'
import { useActiveCardActions } from '@/components/study-session/composables/card-actions'
import { useSessionCards } from '@/components/study-session/composables/session-cards'
import { useCoverIntro } from './use-cover-intro'
import { useModalRequestClose } from '@/composables/modal'
import { type Grade } from 'ts-fsrs'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useFlushDeckReviews } from '@/api/reviews'
import { useUpsertDeckMutation } from '@/api/decks'
import { emitSfx } from '@/sfx/bus'
import { withDeckConfigDefaults } from '@/utils/deck/defaults'
import type { CardReviewResult } from '@/components/study-session/composables/session-core'

const { deck, config_override } = defineProps<{
  deck: Deck
  config_override?: Partial<DeckConfig>
}>()

const emit = defineEmits<{
  (e: 'closed'): void
  (e: 'finished', results: CardReviewResult[], remaining_due: number, study_all_used: boolean): void
}>()

defineExpose({ requestClose })
useModalRequestClose(requestClose)

const {
  mode,
  cards,
  results,
  current_card_side,
  current_index,
  active_card,
  reviewed_count,
  remaining_due_count,
  is_starting_side,
  config,
  next_card,
  is_cover,
  reviewCard,
  setCards,
  startSession,
  flipCurrentCard,
  dropCard
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

const { onMove, onDelete } = useActiveCardActions({
  active_card,
  deck_id: () => deck.id,
  onRemoved: dropCard
})

const { loading } = useSessionCards({
  deckId: () => deck.id,
  studyAllCards: () => !!config.study_all_cards,
  seed: setCards,
  onMissingDeck: () => emit('closed')
})

const stage = useTemplateRef('stage')
const header = useTemplateRef('header')
const progress = useTemplateRef('progress')
const primed_grade = ref<Grade | null>(null)
const flushDeckReviews = useFlushDeckReviews()
const upsert_deck = useUpsertDeckMutation()

useCoverIntro({
  isCover: () => is_cover.value,
  title: () => header.value?.title_el,
  progress: () => progress.value?.root
})

const can_edit = computed(() => !loading.value && !editing.value && !is_cover.value)

/** Called by the shell's close button and by the modal backdrop / esc handler. */
function requestClose() {
  if (is_cover.value || reviewed_count.value === 0) {
    emit('closed')
    return
  }

  mode.value = 'completed'
}

/**
 * Session is over — flush the queued reviews and hand the results up so the
 * shell can pop the summary in. Fires for every path that ends the session
 * (last card reviewed, stop button, last card dropped, empty queue).
 */
function finishSession() {
  if (deck.id) flushDeckReviews(deck.id)
  emit('finished', results.value, remaining_due_count.value, config.study_all_cards)
}

function toggleRatings() {
  emitSfx('snappy_button_5')
  config.show_all_ratings = !config.show_all_ratings
  upsert_deck.mutate({
    ...deck,
    study_config: withDeckConfigDefaults({
      ...deck.study_config,
      show_all_ratings: config.show_all_ratings
    })
  })
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

watch(mode, (m) => {
  if (m === 'completed') finishSession()
})
</script>

<template>
  <div data-testid="session-flashcard" class="relative h-full w-full">
    <div
      data-testid="study-session__main"
      class="h-full flex flex-col items-center gap-8 p-(--session-padding)"
      :class="{ 'opacity-0 pointer-events-none': mode !== 'studying' }"
    >
      <session-header
        ref="header"
        :title="deck.title"
        :can_edit="can_edit"
        :is_cover="is_cover"
        :show_all_ratings="config.show_all_ratings"
        @stop="requestClose"
        @edit="startEdit"
        @move="onMove"
        @delete="onDelete"
        @toggle-ratings="toggleRatings"
      />

      <div
        data-testid="study-session__body"
        class="flex-1 min-h-0 w-full max-w-117 flex flex-col items-center justify-between"
      >
        <session-progress
          ref="progress"
          :editing="editing"
          :saving="saving"
          :reviewed="current_index"
          :total="cards.length"
        />

        <card-stage
          ref="stage"
          :loading="loading"
          :editing="editing"
          :active_card="active_card"
          :current_card_side="current_card_side"
          :show_all_ratings="config.show_all_ratings"
          :next_card="next_card"
          :next_card_side="next_card_side"
          :preview_style="preview_style"
          @started="startSession"
          @side-changed="flipCurrentCard"
          @reviewed="onCardReviewed"
          @drag-progress="onDragProgress"
          @drag-rating="(grade) => (primed_grade = grade)"
          @next-flipped="onNextCardFlipped"
          @edit-update="onEditUpdate"
        />

        <rating-buttons
          v-if="!editing"
          class="z-10 w-full"
          :options="active_card?.preview"
          :side="current_card_side"
          :show_all_ratings="config.show_all_ratings"
          :primed_grade="primed_grade"
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
    </div>
  </div>
</template>
