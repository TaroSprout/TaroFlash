<script setup lang="ts">
import StudyCard from './study-card.vue'
import StudyCardEdit from './study-card-edit.vue'
import StudyCardSkeleton from './study-card-skeleton.vue'
import StudyEditFooter from './study-edit-footer.vue'
import RatingButtons from './rating-buttons.vue'
import FinishAnimation from './finish-animation.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiIcon from '@/components/ui-kit/icon.vue'
import { useFlashcardSession } from '@/composables/study-session/flashcard-session'
import { useCardPreview } from '@/composables/study-session/card-preview'
import { useCardEdit } from '@/composables/study-session/card-edit'
import { useModalRequestClose } from '@/composables/modal'
import { type Grade } from 'ts-fsrs'
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import Card from '@/components/card/index.vue'
import { useStudySessionCardsQuery } from '@/api/cards'
import { useFlushDeckReviews } from '@/api/reviews'
import { emitSfx } from '@/sfx/bus'

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
} = useCardEdit(active_card)

const study_card_ref = useTemplateRef('study-card')
const loading = ref(true)

const card_view = computed<'skeleton' | 'edit' | 'read'>(() => {
  if (loading.value) return 'skeleton'
  if (editing.value) return 'edit'
  return 'read'
})

const cards_query = useStudySessionCardsQuery(
  () => deck.id!,
  () => !!config.study_all_cards
)
const flushDeckReviews = useFlushDeckReviews()

// Force a fresh fetch on mount and seed only from its resolved state. Pinia
// Colada exposes the cached value synchronously while a background refetch
// runs, and after the prior session's `useFlushDeckReviews` invalidation the
// cache often holds an empty `[]` (everything was capped/done) or cards with
// future-dated `review.due` timestamps that the FE due-filter rejects. Seeding
// from either snapshot ends the session immediately. Awaiting `refetch()`
// guarantees the queue is populated from server truth.
onMounted(async () => {
  if (!deck.id) {
    emit('closed')
    return
  }
  const state = await cards_query.refetch()
  if (state.status !== 'success') return
  setCards(state.data ?? [])
  loading.value = false
})

function onSideChanged() {
  emitSfx(is_starting_side.value ? 'ui.transition_up' : 'ui.transition_down')
  flipCurrentCard()
}

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

function onStart() {
  emitSfx('ui.music_plink_chordyes')
  startSession()
}

/** Triggers the fling animation on the card component; reviewed event follows. */
function onRated(grade: Grade) {
  study_card_ref.value?.rate(grade)
}

async function onCardReviewed(grade?: Grade) {
  if (!active_card.value?.id || mode.value !== 'studying') return

  if (next_card.value) {
    emitSfx('ui.slide_up')
    await awaitFlip(config.flip_cards ? 'back' : 'front')
  }

  reviewCard(grade)
}
</script>

<template>
  <div
    data-testid="study-session__body"
    :data-theme="deck.cover_config?.theme ?? 'purple-500'"
    class="w-full flex flex-col items-center justify-between gap-4 self-center pb-8"
    :class="{ 'opacity-0 pointer-events-none': mode !== 'studying' }"
  >
    <div
      data-testid="study-session__counter"
      class="text-brown-700 dark:text-brown-300 text-lg flex items-center gap-1"
      :class="{ invisible: is_cover }"
    >
      <template v-if="editing">
        <ui-icon :src="saving ? 'loading-dots' : 'check'" class="h-5 w-5" />
        <span data-testid="study-session__save-status" class="text-sm">
          {{ saving ? $t('study-session.flashcard.saving') : $t('study-session.flashcard.saved') }}
        </span>
      </template>
      <template v-else>
        {{ current_index + 1 }}<span class="text-sm">/{{ cards.length }}</span>
      </template>
    </div>

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
          :cover_config="deck.cover_config"
          :card_attributes="deck.card_attributes"
          @flip-complete="onNextCardFlipped"
        />
      </div>

      <study-card
        v-if="card_view === 'read'"
        ref="study-card"
        :key="active_card?.id"
        :card="active_card"
        :side="current_card_side"
        :options="active_card?.preview"
        @started="onStart"
        @side-changed="onSideChanged"
        @reviewed="onCardReviewed"
        @drag-progress="onDragProgress"
      />
      <study-card-edit
        v-else-if="card_view === 'edit' && active_card"
        :card="active_card"
        :side="current_card_side === 'back' ? 'back' : 'front'"
        @update="onEditUpdate"
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
        :sfx="{ press: 'ui.pop_window' }"
        @click="startEdit"
      >
        {{ $t('study-session.flashcard.edit-card-button') }}
      </ui-button>
    </div>

    <rating-buttons
      v-if="!editing"
      class="z-10 mt-4"
      :options="active_card?.preview"
      :side="current_card_side"
      @started="onStart"
      @rated="onRated"
      @revealed="onSideChanged"
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
