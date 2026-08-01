import { computed, inject, provide, ref, watch, type InjectionKey } from 'vue'
import { type Grade } from 'ts-fsrs'
import { useSessionEngine } from './session-engine'
import { useCardPreview } from './card-preview'
import { useCardEdit } from './card-edit'
import { useActiveCardActions } from './card-actions'
import { useSessionCards } from './session-cards'
import { useSessionPrefs } from './session-prefs'
import { useRatingTimes } from './rating-times'
import { usePersistedSession } from './session-persistence'
import { buildDeckResolution, provideDeckResolution } from '../deck-resolution'
import { useFlushDeckReviews } from '@/api/reviews'
import type { PersistedSession } from './session-persistence'
import type { SummaryCategory } from '../session-summary/aggregate'

export type StudySessionController = ReturnType<typeof useStudySessionController>

const StudySessionControllerKey: InjectionKey<StudySessionController> = Symbol(
  'study-session.controller'
)

type UseStudySessionControllerOptions = {
  deck_ids: number[]
  onClosed: () => void
}

/**
 * The session's composition root: wires the deck resolution, the deck-blind
 * engine, card edit/preview/actions, review flushing, and the prefs seam, then
 * provides the whole thing to the subtree. Called once by the modal root
 * (`study-session/index.vue`); the header and the studying view read the same
 * instance via inject rather than duplicating it.
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

function useStudySessionController({ deck_ids, onClosed }: UseStudySessionControllerOptions) {
  const persisted_session = usePersistedSession()
  const flushDeckReviews = useFlushDeckReviews()

  const resolution = buildDeckResolution(
    () => sessionDecks.value,
    () => multi_deck_ordering.value
  )
  provideDeckResolution(resolution)

  const engine = useSessionEngine({
    schedulerFor: resolution.schedulerFor,
    startingSideFor: resolution.startingSideFor,
    orderCards: resolution.orderCards,
    onChange: persist
  })

  const { next_card_side, preview_style, onDragProgress, onNextCardFlipped, awaitFlip } =
    useCardPreview(engine.next_card)

  const {
    editing,
    saving,
    start: startEdit,
    stop: stopEdit,
    update: onEditUpdate
  } = useCardEdit(engine.active_card, () => engine.active_card.value?.deck_id, engine.updateCard)

  const { onMove, onDelete } = useActiveCardActions({
    active_card: engine.active_card,
    deck_id: () => engine.active_card.value?.deck_id,
    onRemoved: engine.dropCard
  })

  const { loading, sessionDecks } = useSessionCards({
    deckIds: () => deck_ids,
    seed: engine.setCards,
    restore: onRestore,
    onMissingDeck: onClosed
  })

  const {
    show_all_ratings,
    show_rating_buttons,
    show_button_preview,
    show_card_preview,
    multi_deck_ordering,
    is_default: prefs_are_default,
    toggleRatings,
    resetToDefaults
  } = useSessionPrefs()

  const active_page = ref<'settings' | null>(null)
  const summary_category = ref<SummaryCategory | null>(null)

  const rating_times = useRatingTimes(() => engine.active_card_preview.value)

  const can_edit = computed(() => !loading.value && !editing.value && !engine.is_cover.value)

  /** Open the in-pager settings page (reachable only mid-study). */
  function openSettings() {
    active_page.value = 'settings'
  }

  /** Return from the settings page to studying. */
  function closeSettings() {
    active_page.value = null
  }

  /** Open the summary's per-category card page (reachable only from the summary). */
  function openSummaryCategory(category: SummaryCategory) {
    summary_category.value = category
  }

  /** Return from a category page to the summary's stats list. */
  function closeSummaryCategory() {
    summary_category.value = null
  }

  /**
   * Persistence lives here, not in the engine — the engine is deck-blind, and
   * only the controller knows the deck ids to reopen with. Called via the
   * engine's `onChange` after every state-changing mutation, since its
   * shallowRefs are mutated in place (a watch wouldn't fire).
   */
  function persist() {
    persisted_session.value = {
      deck_ids,
      card_ids: engine.cards.value.map((c) => c.id),
      // Only durably-saved reviews are persisted, so a card whose save never
      // confirmed is re-served as unreviewed on resume rather than rebuilt done.
      results: engine.durableResults(),
      completed: engine.state.value === 'summary'
    }
  }

  /** Shell close button + modal backdrop / esc handler. */
  function requestClose() {
    if (engine.is_cover.value || engine.reviewed_count.value === 0) {
      onClosed()
      return
    }

    engine.state.value = 'summary'
  }

  /** A refresh-restore drops the user straight back into the card they were on. */
  function onRestore(raw: Card[], persisted: PersistedSession) {
    engine.restoreCards(raw, {
      card_ids: persisted.card_ids,
      results: persisted.results,
      completed: persisted.completed
    })
    if (engine.state.value !== 'summary') engine.startSession({ silent: true })
  }

  async function onCardReviewed(grade?: Grade) {
    if (!engine.active_card.value?.id || engine.state.value !== 'studying') return

    if (engine.next_card.value) {
      await awaitFlip(engine.startingSideForCard(engine.next_card.value))
    }

    engine.reviewCard(grade)
  }

  // The session ends the moment the engine reaches `summary` (last card reviewed
  // or stop button) — flush every deck's queued reviews. Shell derives its own
  // view from `state`, so there's no onFinished callback to relay results.
  watch(
    () => engine.state.value,
    (state) => {
      if (state === 'summary') for (const id of deck_ids) flushDeckReviews(id)
    }
  )

  return {
    state: engine.state,
    cards: engine.cards,
    display_side: engine.display_side,
    current_index: engine.current_index,
    active_card: engine.active_card,
    active_card_preview: engine.active_card_preview,
    rating_times,
    reviewed_count: engine.reviewed_count,
    is_starting_side: engine.is_starting_side,
    results: engine.results,
    next_card: engine.next_card,
    next_card_side,
    preview_style,
    is_cover: engine.is_cover,
    loading,
    sessionDecks,
    show_all_ratings,
    show_rating_buttons,
    show_button_preview,
    show_card_preview,
    multi_deck_ordering,
    prefs_are_default,
    active_page,
    summary_category,
    editing,
    saving,
    can_edit,
    startSession: engine.startSession,
    flipCurrentCard: engine.flipCurrentCard,
    onDragProgress,
    onNextCardFlipped,
    onEditUpdate,
    stopEdit,
    startEdit,
    onMove,
    onDelete,
    toggleRatings,
    resetToDefaults,
    openSettings,
    closeSettings,
    openSummaryCategory,
    closeSummaryCategory,
    requestClose,
    onCardReviewed
  }
}
