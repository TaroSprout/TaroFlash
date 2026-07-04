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
import { useModalRequestClose } from '@/composables/modal'
import { type Grade } from 'ts-fsrs'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { providePrimedGrade } from './primed-grade-context'
import { useFlushDeckReviews } from '@/api/reviews'
import { useUpsertMemberMutation } from '@/api/members'
import { useMemberStore } from '@/stores/member'
import { emitSfx } from '@/sfx/bus'
import type { CardReviewResult } from '@/components/study-session/composables/session-core'

const { decks, config_override } = defineProps<{
  decks: Deck[]
  title: string
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
  active_card_preview,
  reviewed_count,
  remaining_due_count,
  is_starting_side,
  config,
  show_all_ratings,
  next_card,
  is_cover,
  reviewCard,
  setCards,
  restoreCards,
  setSessionMeta,
  startSession,
  flipCurrentCard,
  dropCard,
  updateCard
} = useFlashcardSession({ ...decks[0]?.study_config, ...config_override })

setSessionMeta(
  decks.map((deck) => deck.id),
  config_override
)

const { next_card_side, preview_style, onDragProgress, onNextCardFlipped, awaitFlip } =
  useCardPreview(next_card)

const {
  editing,
  saving,
  start: startEdit,
  stop: stopEdit,
  update: onEditUpdate
} = useCardEdit(active_card, () => active_card.value?.deck_id, updateCard)

const { onMove, onDelete } = useActiveCardActions({
  active_card,
  deck_id: () => active_card.value?.deck_id,
  onRemoved: dropCard
})

const { loading } = useSessionCards({
  deckIds: () => decks.map((deck) => deck.id),
  studyAllCards: () => !!config.study_all_cards,
  seed: setCards,
  restore: onRestore,
  onMissingDeck: () => emit('closed')
})

const stage = useTemplateRef('stage')
const primed_grade = ref<Grade | null>(null)
providePrimedGrade(primed_grade)
const flushDeckReviews = useFlushDeckReviews()
const member_store = useMemberStore()
const upsert_member = useUpsertMemberMutation()

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
  for (const deck of decks) flushDeckReviews(deck.id)
  emit('finished', results.value, remaining_due_count.value, config.study_all_cards)
}

function toggleRatings() {
  emitSfx('snappy_button_5')
  show_all_ratings.value = !show_all_ratings.value

  if (!member_store.id) return
  upsert_member.mutate({
    id: member_store.id,
    preferences: {
      ...member_store.preferences,
      study: { ...member_store.preferences.study, show_all_ratings: show_all_ratings.value }
    }
  })
}

/**
 * A refresh-restore should drop the user straight back into the card they
 * were on, not back at the cover screen requiring another Start click.
 */
function onRestore(...restoreArgs: Parameters<typeof restoreCards>) {
  restoreCards(...restoreArgs)
  if (mode.value === 'studying') startSession({ silent: true })
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
      class="h-full flex flex-col items-center gap-8 p-(--dialog-px)"
      :class="{ 'opacity-0 pointer-events-none': mode !== 'studying' }"
    >
      <session-header
        :title="title"
        :can_edit="can_edit"
        :is_cover="is_cover"
        :show_all_ratings="show_all_ratings"
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
          :editing="editing"
          :saving="saving"
          :is_cover="is_cover"
          :reviewed="current_index"
          :total="cards.length"
        />

        <card-stage
          ref="stage"
          :loading="loading"
          :editing="editing"
          :active_card="active_card"
          :active_card_preview="active_card_preview"
          :current_card_side="current_card_side"
          :show_all_ratings="show_all_ratings"
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
          :options="active_card_preview"
          :side="current_card_side"
          :show_all_ratings="show_all_ratings"
          :loading="loading"
          @started="startSession"
          @rated="onRated"
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
