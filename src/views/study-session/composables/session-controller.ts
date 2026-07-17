import { computed, inject, provide, watch, type InjectionKey } from 'vue'
import { type Grade } from 'ts-fsrs'
import { useFlashcardSession } from './flashcard-session'
import { FSRS_MAX_INTERVAL } from '@/utils/review-pacing/defaults'
import { useCardPreview } from './card-preview'
import { useCardEdit } from './card-edit'
import { useActiveCardActions } from './card-actions'
import { useSessionCards } from './session-cards'
import { useFlushDeckReviews } from '@/api/reviews'
import { useUpsertMemberMutation } from '@/api/members'
import { useMemberStore } from '@/stores/member'
import { emitSfx } from '@/sfx/bus'
import type { CardReviewResult } from './session-queue'

export type StudySessionController = ReturnType<typeof useStudySessionController>

const StudySessionControllerKey: InjectionKey<StudySessionController> = Symbol(
  'flashcard-session.controller'
)

type UseStudySessionControllerOptions = {
  deck_ids: number[]
  onFinished: (results: CardReviewResult[]) => void
  onClosed: () => void
}

/**
 * Owns the whole study session — FSRS queue, card editing/actions, review
 * flushing — and provides it to the subtree. Called once by the session's
 * modal root (`study-session/index.vue`) so the header (which lives at
 * that level, via `dialog-card`'s native slots) and the studying view
 * (`session-studying/index.vue`) read the same instance instead of duplicating it.
 */
export function provideStudySessionController(options: UseStudySessionControllerOptions) {
  const controller = useStudySessionController(options)
  provide(StudySessionControllerKey, controller)
  return controller
}

export function useInjectedStudySessionController(): StudySessionController {
  const controller = inject(StudySessionControllerKey)
  if (!controller) throw new Error('No StudySessionController provided above this component')
  return controller
}

function useStudySessionController({
  deck_ids,
  onFinished,
  onClosed
}: UseStudySessionControllerOptions) {
  // Pacing + study config come from the first session deck, resolved
  // asynchronously by the bootstrap. Getters so the reactive scheduler picks
  // them up once the fetch lands. (Commit 3 makes this per-deck.)
  const firstDeckPacing = (): ReviewPacingParams | undefined => {
    const deck = sessionDecks.value[0]
    if (!deck) return undefined
    return {
      desired_retention: deck.desired_retention,
      learning_steps: deck.learning_steps,
      relearning_steps: deck.relearning_steps,
      // null = uncapped -> the FSRS default max interval
      max_interval: deck.max_interval ?? FSRS_MAX_INTERVAL
    }
  }

  const firstDeckConfig = (): Partial<DeckConfig> | undefined => {
    const deck = sessionDecks.value[0]
    return deck ? { flip_cards: deck.flip_cards, shuffle: deck.shuffle } : undefined
  }

  const {
    mode,
    cards,
    results,
    current_card_side,
    current_index,
    active_card,
    active_card_preview,
    reviewed_count,
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
  } = useFlashcardSession(firstDeckPacing, firstDeckConfig)

  setSessionMeta(deck_ids)

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

  const { loading, sessionDecks } = useSessionCards({
    deckIds: () => deck_ids,
    seed: setCards,
    restore: onRestore,
    onMissingDeck: onClosed
  })

  const flushDeckReviews = useFlushDeckReviews()
  const member_store = useMemberStore()
  const upsert_member = useUpsertMemberMutation()

  const can_edit = computed(() => !loading.value && !editing.value && !is_cover.value)

  /**
   * Called by the shell's close button and by the modal backdrop / esc handler.
   */
  function requestClose() {
    if (is_cover.value || reviewed_count.value === 0) {
      onClosed()
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
    for (const id of deck_ids) flushDeckReviews(id)
    onFinished(results.value)
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

  async function onCardReviewed(grade?: Grade) {
    if (!active_card.value?.id || mode.value !== 'studying') return

    if (next_card.value) await awaitFlip(config.value.flip_cards ? 'back' : 'front')

    reviewCard(grade)
  }

  watch(mode, (m) => {
    if (m === 'completed') finishSession()
  })

  return {
    mode,
    cards,
    current_card_side,
    current_index,
    active_card,
    active_card_preview,
    reviewed_count,
    is_starting_side,
    config,
    show_all_ratings,
    next_card,
    next_card_side,
    preview_style,
    is_cover,
    loading,
    sessionDecks,
    editing,
    saving,
    can_edit,
    startSession,
    flipCurrentCard,
    dropCard,
    onDragProgress,
    onNextCardFlipped,
    onEditUpdate,
    stopEdit,
    startEdit,
    onMove,
    onDelete,
    toggleRatings,
    requestClose,
    onCardReviewed
  }
}
