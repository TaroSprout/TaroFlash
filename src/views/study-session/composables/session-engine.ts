import { ref, computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { createEmptyCard, FSRS, Rating, type Grade, type RecordLog } from 'ts-fsrs'
import { useSaveReviewMutation } from '@/api/reviews'
import { useNoticeStore } from '@/stores/notice-store'
import { emitStudySfx } from '@/sfx/bus'

export type StudyCard = Card & { state: ReviewState }

type ReviewState = 'failed' | 'passed' | 'unreviewed'

/** loading -> cover -> studying -> summary. The single lifecycle source. */
export type SessionState = 'loading' | 'cover' | 'studying' | 'summary'

/**
 * Per-card snapshot captured at the moment of review, before the card's FSRS
 * state is overwritten. This is the raw material the post-session summary
 * aggregates — the "before" interval is lost otherwise. `deck_id` rides along so
 * the summary can resolve each card's own deck's leech threshold.
 */
export type CardReviewResult = {
  card_id: number
  deck_id?: number
  front_text?: string
  is_new: boolean
  before_interval: number
  after_interval: number
  lapses: number
  passed: boolean
}

type SessionEngineDeps = {
  /** Per-deck FSRS scheduler for the given card's deck. */
  schedulerFor: (deck_id?: number) => FSRS
  /** Whether the given card's deck starts on its back (flipped). */
  flipFor: (deck_id?: number) => boolean
  /** Whether the merged queue should be shuffled. */
  shuffle: () => boolean
  /** Called after every state-changing mutation, so the owner can persist. */
  onChange: () => void
}

/**
 * The deck-blind session core: one state machine owning the whole lifecycle
 * (loading -> cover -> studying -> summary), the FSRS queue, card sides, and
 * per-card scheduling. It knows nothing about decks beyond each card's
 * `deck_id`, which it hands to the injected `schedulerFor` / `flipFor` — so a
 * merged multi-deck queue schedules each card against its own deck's pacing.
 */
export function useSessionEngine({ schedulerFor, flipFor, shuffle, onChange }: SessionEngineDeps) {
  const { t } = useI18n()
  const notice = useNoticeStore()

  const save_review_mutation = useSaveReviewMutation()

  const state = ref<SessionState>('loading')
  const current_card_side = ref<'front' | 'back'>('front')

  const _raw_cards = shallowRef<Card[]>([])
  const _cards_in_deck = shallowRef<StudyCard[]>([])
  const active_card = shallowRef<StudyCard | undefined>(undefined)
  const results = shallowRef<CardReviewResult[]>([])

  const cards = computed(() => _cards_in_deck.value)

  const reviewed_count = computed(() => cards.value.filter((c) => c.state !== 'unreviewed').length)

  const current_index = computed(() => {
    if (!active_card.value) return cards.value.length
    return cards.value.findIndex((c) => c.id === active_card.value!.id)
  })

  const next_card = computed(() =>
    cards.value.slice(current_index.value + 1).find((c) => c.state === 'unreviewed')
  )

  // The cover is showing whenever we're not actively studying or done — that
  // includes the loading window, where the cover card rises in.
  const is_cover = computed(() => state.value === 'loading' || state.value === 'cover')

  const active_starting_side = computed<'front' | 'back'>(() =>
    flipFor(active_card.value?.deck_id) ? 'back' : 'front'
  )

  const is_starting_side = computed(() => current_card_side.value === active_starting_side.value)

  /** The side the card component renders — only `studying` shows a real side. */
  const display_side = computed<CardSide>(() =>
    state.value === 'studying' ? current_card_side.value : 'cover'
  )

  /**
   * FSRS scheduling preview for the active card only, computed fresh against
   * `new Date()` whenever `active_card` changes identity — using that card's own
   * deck scheduler. Lazy per active card keeps the "now" baseline close to when
   * the preview is shown (bulk-precomputed previews drifted negative late in a
   * long session).
   */
  const active_card_preview = computed<RecordLog | undefined>(() => {
    if (!active_card.value) return undefined
    const review = active_card.value.review ?? (createEmptyCard(new Date()) as Review)
    return schedulerFor(active_card.value.deck_id).repeat(review, new Date())
  })

  function setCards(raw: Card[]) {
    _raw_cards.value = raw
    results.value = []

    const ordered = shuffle() ? _shuffle(_raw_cards.value) : _raw_cards.value
    _cards_in_deck.value = ordered.map(_setupCard)

    active_card.value = cards.value.find((c) => c.state === 'unreviewed')
    state.value = active_card.value ? 'cover' : 'summary'
    onChange()
  }

  /**
   * Rebuilds the session from a sessionStorage snapshot after a refresh. `raw`
   * is only the still-unreviewed remainder, fetched by id so newly-due cards
   * can't leak into the locked queue; already-reviewed cards are rebuilt from
   * `results` alone (they're never shown again). Lands on the cover — the owner
   * decides whether to jump straight into studying.
   */
  function restoreCards(
    raw: Card[],
    persisted: { card_ids: number[]; results: CardReviewResult[]; completed: boolean }
  ) {
    const reviewed_by_id = new Map(persisted.results.map((r) => [r.card_id, r]))
    const fetched_by_id = new Map(raw.map((c) => [c.id, c]))

    _raw_cards.value = raw
    results.value = persisted.results

    _cards_in_deck.value = persisted.card_ids.flatMap((id): StudyCard[] => {
      const reviewed = reviewed_by_id.get(id)
      if (reviewed) {
        return [
          { id, front_text: reviewed.front_text, state: reviewed.passed ? 'passed' : 'failed' }
        ]
      }

      const card = fetched_by_id.get(id)
      return card ? [_setupCard(card)] : []
    })

    active_card.value = cards.value.find((c) => c.state === 'unreviewed')
    state.value = persisted.completed || !active_card.value ? 'summary' : 'cover'
    onChange()
  }

  /** Transitions from the cover into the active session. `silent` skips the start jingle (refresh-restore). */
  function startSession({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) emitStudySfx('music_plink_chordyes')
    current_card_side.value = active_starting_side.value
    state.value = 'studying'
  }

  function flipCurrentCard() {
    emitStudySfx(is_starting_side.value ? 'transition_up' : 'transition_down')
    current_card_side.value = current_card_side.value === 'front' ? 'back' : 'front'
  }

  /**
   * Advance to the next unreviewed card, resetting to its starting side; end the
   * session when none remain. The single advance path shared by review + drop.
   */
  function _advance() {
    active_card.value = cards.value.find((c) => c.state === 'unreviewed')

    if (!active_card.value) {
      state.value = 'summary'
      return
    }

    current_card_side.value = active_starting_side.value
  }

  /**
   * Remove a card from the session entirely — used when it's deleted or moved
   * out of its deck mid-session. When it was the active card, advances.
   */
  function dropCard(card_id: number) {
    const was_active = active_card.value?.id === card_id

    _raw_cards.value = _raw_cards.value.filter((c) => c.id !== card_id)
    _cards_in_deck.value = _cards_in_deck.value.filter((c) => c.id !== card_id)

    if (was_active) _advance()
    onChange()
  }

  /**
   * Patches a card's fields in the local session queue (and active_card, if it's
   * showing). The session keeps its own copy separate from the deck-list query
   * cache, so a mid-session edit needs its own patch path.
   */
  function updateCard(card_id: number, values: Partial<Card>) {
    _cards_in_deck.value = _cards_in_deck.value.map((c) =>
      c.id === card_id ? { ...c, ...values } : c
    )
    if (active_card.value?.id === card_id) {
      active_card.value = { ...active_card.value, ...values }
    }
  }

  function reviewCard(grade?: Grade) {
    if (!active_card.value) return

    const card = active_card.value

    if (grade === undefined) {
      card.state = 'passed'
      _advance()
      onChange()
      return
    }

    // Compute scheduling at the moment the user rates, against this card's own
    // deck scheduler. next() is the single-grade repeat() — item.card.due is
    // calculated from now.
    const review = card.review ?? (createEmptyCard(new Date()) as Review)
    const item = schedulerFor(card.deck_id).next(review, new Date(), grade)

    if (card.id) {
      results.value.push({
        card_id: card.id,
        deck_id: card.deck_id,
        front_text: card.front_text,
        is_new: (review.reps ?? 0) === 0,
        before_interval: review.scheduled_days ?? 0,
        after_interval: item.card.scheduled_days ?? 0,
        lapses: item.card.lapses ?? 0,
        passed: grade !== Rating.Again
      })
    }

    card.review = item.card
    card.state = grade === Rating.Again ? 'failed' : 'passed'
    _advance()
    onChange()

    if (card.id && card.deck_id !== undefined) {
      return save_review_mutation
        .mutateAsync({ card_id: card.id, deck_id: card.deck_id, card: item.card, log: item.log })
        .catch(() => {
          notice.error(t('study-session.review-save-error'), {
            subMessage: t('study-session.review-save-error-sub'),
            variant: 'panel',
            actions: [{ label: t('notice.refresh-label'), onClick: () => location.reload() }]
          })
        })
    }
  }

  function _setupCard(card: Card): StudyCard {
    const review = card.review ?? (createEmptyCard(new Date()) as Review)
    return { ...card, review, state: 'unreviewed' }
  }

  /**
   * Fisher-Yates. `sort(() => Math.random() - 0.5)` is a known-biased shuffle
   * (comparator-sort shuffles skew depending on the engine's sort), not uniform.
   */
  function _shuffle<T>(items: T[]): T[] {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  return {
    state,
    current_card_side,
    display_side,
    active_card,
    active_card_preview,
    results,
    cards,
    reviewed_count,
    current_index,
    is_starting_side,
    next_card,
    is_cover,
    setCards,
    restoreCards,
    startSession,
    flipCurrentCard,
    reviewCard,
    dropCard,
    updateCard
  }
}
