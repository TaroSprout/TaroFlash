import { ref, computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { createEmptyCard, FSRS, Rating, type Grade, type RecordLog } from 'ts-fsrs'
import { useNoticeStore } from '@/stores/notice-store'
import { emitSfx } from '@/sfx/bus'
import { useReviewSaver } from './review-saver'
import type { SaveReviewVars } from '@/api/reviews'

export type StudyCard = Card & { state: ReviewState }

/**
 * A card's durability lifecycle within a session (orthogonal to its pass/fail
 * grade, which lives in the review result):
 * - `unreviewed` — not yet rated, or re-served on resume because its save
 *   never confirmed.
 * - `pending` — rated and advanced past optimistically; its `save_review` is
 *   in flight and it is not yet durable.
 * - `saved` — its `save_review` confirmed; the review is durable.
 * - `failed` — its save was ultimately given up; not counted as reviewed and
 *   excluded from the summary.
 */
type ReviewState = 'unreviewed' | 'pending' | 'saved' | 'failed'

/**
 * How long the summary waits for still-pending saves to confirm once the last
 * card is reviewed. Anything unresolved at the deadline is treated as `failed`
 * so the summary is never held on a stalled network.
 */
const SUMMARY_HOLD_MS = 1000

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
  is_new: boolean
  before_interval: number
  after_interval: number
  lapses: number
  passed: boolean
}

type SessionEngineDeps = {
  /** Per-deck FSRS scheduler for the given card's deck. */
  schedulerFor: (deck_id?: number) => FSRS
  /** Which face the given card's deck opens on (`random` is rolled per card here). */
  startingSideFor: (deck_id?: number) => CardStartingSide
  /** Orders the raw merged cards into the study queue (per-deck + session ordering). */
  orderCards: (cards: Card[]) => Card[]
  /** Called after every state-changing mutation, so the owner can persist. */
  onChange: () => void
}

/**
 * The deck-blind session core: one state machine owning the whole lifecycle
 * (loading -> cover -> studying -> summary), the FSRS queue, card sides, and
 * per-card scheduling. It knows nothing about decks beyond each card's
 * `deck_id`, which it hands to the injected `schedulerFor` / `startingSideFor` —
 * so a merged multi-deck queue schedules each card against its own deck's pacing.
 *
 * It also coordinates the durable-save lifecycle (pending/saved/failed, in-flight
 * tracking, the summary hold); the retry mechanics themselves live in
 * `review-saver.ts`. If that coordination grows further, lift it into its own
 * seam rather than letting this core keep swelling.
 */
export function useSessionEngine({
  schedulerFor,
  startingSideFor,
  orderCards,
  onChange
}: SessionEngineDeps) {
  const { t } = useI18n()
  const notice = useNoticeStore()

  const saver = useReviewSaver()

  // In-flight background saves, kept so the summary can wait on them when the
  // last card is reviewed. A save removes itself once it settles.
  const _in_flight = new Set<Promise<void>>()

  const state = ref<SessionState>('loading')
  const current_card_side = ref<'front' | 'back'>('front')

  const _raw_cards = shallowRef<Card[]>([])
  const _cards_in_deck = shallowRef<StudyCard[]>([])
  const active_card = shallowRef<StudyCard | undefined>(undefined)
  const results = shallowRef<CardReviewResult[]>([])

  // A `random` deck rolls each card's side once, the first time it's asked for,
  // and remembers it for the rest of the session. Without the memo the roll
  // would land differently on every read — and the preview card's intro flip
  // (played before the engine advances) would disagree with the side the card
  // actually opens on.
  const _rolled_sides = new Map<number, 'front' | 'back'>()

  const cards = computed(() => _cards_in_deck.value)

  // A card counts as reviewed once it's rated (pending) and stays counted once
  // saved; a save that ultimately fails drops back out (it's re-served later).
  const reviewed_count = computed(
    () => cards.value.filter((c) => c.state === 'pending' || c.state === 'saved').length
  )

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
    startingSideForCard(active_card.value)
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

    const ordered = orderCards(_raw_cards.value)
    _cards_in_deck.value = ordered.map(_setupCard)

    active_card.value = cards.value.find((c) => c.state === 'unreviewed')
    state.value = active_card.value ? 'cover' : 'summary'
    onChange()
  }

  /**
   * Rebuilds the session from a sessionStorage snapshot after a refresh. `raw`
   * is the whole locked queue, fetched by id so newly-due cards can't leak in.
   * Only cards whose save durably confirmed are carried in `persisted.results`,
   * so they're the only ones stamped `saved` (the summary renders them); a card
   * whose save was still pending or had failed isn't persisted, so it comes
   * back `unreviewed` and is re-served rather than silently marked done. Lands
   * on the cover — the owner decides whether to jump straight into studying.
   */
  function restoreCards(
    raw: Card[],
    persisted: { card_ids: number[]; results: CardReviewResult[]; completed: boolean }
  ) {
    const saved_ids = new Set(persisted.results.map((r) => r.card_id))
    const fetched_by_id = new Map(raw.map((c) => [c.id, c]))

    _raw_cards.value = raw
    results.value = persisted.results

    _cards_in_deck.value = persisted.card_ids.flatMap((id): StudyCard[] => {
      const card = fetched_by_id.get(id)
      if (!card) return []

      if (!saved_ids.has(id)) return [_setupCard(card)]

      return [{ ..._setupCard(card), state: 'saved' }]
    })

    active_card.value = cards.value.find((c) => c.state === 'unreviewed')
    state.value = persisted.completed || !active_card.value ? 'summary' : 'cover'
    onChange()
  }

  /** Transitions from the cover into the active session. `silent` skips the start jingle (refresh-restore). */
  function startSession({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) emitSfx('music_plink_chordyes')
    current_card_side.value = active_starting_side.value
    state.value = 'studying'
  }

  /**
   * The face `card` opens on, resolving its deck's `random` to a concrete side.
   * Stable per card: the controller calls this for the incoming preview card's
   * intro flip, and the engine reads the same answer when that card goes active.
   */
  function startingSideForCard(card?: StudyCard): 'front' | 'back' {
    if (!card) return 'front'

    const setting = startingSideFor(card.deck_id)
    if (setting !== 'random') return setting

    const rolled = _rolled_sides.get(card.id) ?? (Math.random() < 0.5 ? 'front' : 'back')
    _rolled_sides.set(card.id, rolled)
    return rolled
  }

  function flipCurrentCard() {
    emitSfx(is_starting_side.value ? 'transition_up' : 'transition_down')
    current_card_side.value = current_card_side.value === 'front' ? 'back' : 'front'
  }

  /**
   * Advance to the next unreviewed card, resetting to its starting side; end the
   * session when none remain. The single advance path shared by review + drop.
   */
  function _advance() {
    active_card.value = cards.value.find((c) => c.state === 'unreviewed')

    if (!active_card.value) {
      _finishSession()
      return
    }

    current_card_side.value = active_starting_side.value
  }

  /**
   * The last card is reviewed: show the summary, but if saves are still in
   * flight hold it briefly so a just-confirmed review isn't mislabelled as
   * failed. With nothing pending this is synchronous — the common case, and the
   * one the drop/stop paths always hit.
   */
  function _finishSession() {
    if (_in_flight.size === 0) {
      state.value = 'summary'
      return
    }
    _holdForPendingSaves()
  }

  /**
   * Wait up to `SUMMARY_HOLD_MS` for in-flight saves to settle, then open the
   * summary. Anything still pending at the deadline is force-failed so a stalled
   * network can't hold the summary open (no spinner is shown during the wait).
   */
  async function _holdForPendingSaves() {
    await _racePendingSaves(SUMMARY_HOLD_MS)

    for (const card of _cards_in_deck.value) {
      if (card.state === 'pending') _failSave(card.id)
    }

    state.value = 'summary'
    onChange()
  }

  /** Resolves when every in-flight save settles, or when `timeout` elapses. */
  function _racePendingSaves(timeout: number): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout>
    const timed_out = new Promise((resolve) => (timer = setTimeout(resolve, timeout)))
    return Promise.race([Promise.allSettled(_in_flight), timed_out]).finally(() =>
      clearTimeout(timer)
    )
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
      card.state = 'saved'
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
      _recordResult({
        card_id: card.id,
        deck_id: card.deck_id,
        is_new: (review.reps ?? 0) === 0,
        before_interval: review.scheduled_days ?? 0,
        after_interval: item.card.scheduled_days ?? 0,
        lapses: item.card.lapses ?? 0,
        passed: grade !== Rating.Again
      })
    }

    // The card advances instantly and is only `pending` — it becomes durably
    // reviewed once its background save confirms, or `failed` if it never does.
    card.review = item.card
    card.state = 'pending'

    let save_promise: Promise<void> | undefined
    if (card.id && card.deck_id !== undefined) {
      save_promise = _persistReview(card.id, {
        card_id: card.id,
        deck_id: card.deck_id,
        card: item.card,
        log: item.log
      })
    }

    _advance()
    onChange()

    return save_promise
  }

  /**
   * Upserts a card's review result by card_id, so re-rating a card that was
   * re-served on resume replaces its entry instead of adding a duplicate.
   */
  function _recordResult(result: CardReviewResult) {
    const rest = results.value.filter((r) => r.card_id !== result.card_id)
    results.value = [...rest, result]
  }

  /** Fire the durable save in the background and reconcile the card once it settles. */
  function _persistReview(card_id: number, vars: SaveReviewVars): Promise<void> {
    const promise = saver.save(vars).then((outcome) => {
      if (outcome === 'saved') _confirmSave(card_id)
      else _failSave(card_id)
    })
    _in_flight.add(promise)
    void promise.finally(() => _in_flight.delete(promise))
    return promise
  }

  /** A pending card's save confirmed — mark it durable so persistence keeps it. */
  function _confirmSave(card_id: number) {
    const card = _cards_in_deck.value.find((c) => c.id === card_id)
    if (!card || card.state !== 'pending') return
    card.state = 'saved'
    onChange()
  }

  /**
   * A pending card's save was ultimately given up: drop it from the summary
   * results, mark it `failed` (re-served next session), and surface a
   * non-blocking notice. Idempotent — a late online-retry that resolves after
   * the summary already force-failed the card is ignored.
   */
  function _failSave(card_id: number) {
    const card = _cards_in_deck.value.find((c) => c.id === card_id)
    if (!card || card.state !== 'pending') return
    card.state = 'failed'
    results.value = results.value.filter((r) => r.card_id !== card_id)
    onChange()
    notice.error(t('study-session.review-save-error'), {
      subMessage: t('study-session.review-save-error-sub')
    })
  }

  function _setupCard(card: Card): StudyCard {
    const review = card.review ?? (createEmptyCard(new Date()) as Review)
    return { ...card, review, state: 'unreviewed' }
  }

  /**
   * The results that are safe to persist for a resume: only cards whose save
   * durably confirmed. A pending or failed card is deliberately left out so a
   * refresh re-serves it as unreviewed instead of rebuilding it as done. Read
   * fresh (not a computed) because card `state` is mutated in place.
   */
  function durableResults(): CardReviewResult[] {
    const saved_ids = new Set(
      _cards_in_deck.value.filter((c) => c.state === 'saved').map((c) => c.id)
    )
    return results.value.filter((r) => saved_ids.has(r.card_id))
  }

  return {
    state,
    current_card_side,
    display_side,
    active_card,
    active_card_preview,
    results,
    durableResults,
    cards,
    reviewed_count,
    current_index,
    is_starting_side,
    next_card,
    is_cover,
    setCards,
    restoreCards,
    startSession,
    startingSideForCard,
    flipCurrentCard,
    reviewCard,
    dropCard,
    updateCard
  }
}
