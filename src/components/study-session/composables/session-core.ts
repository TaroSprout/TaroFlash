import { ref, computed, shallowRef, reactive } from 'vue'
import {
  createEmptyCard,
  FSRS,
  generatorParameters,
  Rating,
  type Grade,
  type RecordLog
} from 'ts-fsrs'
import { useSaveReviewMutation } from '@/api/reviews'
import { withDeckConfigDefaults } from '@/utils/deck/defaults'
import { useMemberStore } from '@/stores/member'
import { usePersistedSession, type PersistedSession } from './session-persistence'

export type StudyCard = Card & { preview?: RecordLog; state: ReviewState }

type ReviewState = 'failed' | 'passed' | 'unreviewed'

/**
 * Per-card snapshot captured at the moment of review, before the card's FSRS
 * state is overwritten. This is the raw material the post-session summary
 * aggregates — the "before" interval is lost otherwise.
 */
export type CardReviewResult = {
  card_id: number
  front_text?: string
  is_new: boolean
  before_interval: number
  after_interval: number
  lapses: number
  passed: boolean
}

export type StudySessionCore = ReturnType<typeof useStudySessionCore>

/**
 * Mode-agnostic study session core: queue management, FSRS scheduling,
 * session lifecycle, and stats. Does not know about flashcard sides, flipping,
 * or any other interaction model — those live in mode-specific composables.
 *
 * Future study modes (matching pairs, cloze, etc.) build on top of this core.
 */
export function useStudySessionCore(_config?: Partial<DeckConfig>) {
  const member_store = useMemberStore()

  // Ratings mode is a member-wide preference, not per-deck — seeded once here,
  // toggled locally for instant feedback, and persisted by the caller.
  const show_all_ratings = ref(member_store.preferences.study.show_all_ratings)

  const _PARAMS = generatorParameters({
    enable_fuzz: true,
    learning_steps: [],
    relearning_steps: [],
    // desired_retention is stored as a whole-number percent (e.g. 90 = 90%).
    request_retention: member_store.preferences.study.desired_retention / 100
  })

  const config = reactive<Required<DeckConfig>>(withDeckConfigDefaults(_config))

  const _FSRS_INSTANCE: FSRS = new FSRS(_PARAMS)
  const _raw_cards = shallowRef<Card[]>([])
  const _cards_in_deck = shallowRef<StudyCard[]>([])
  const _deck_ids = shallowRef<number[]>([])
  const _config_override = shallowRef<Partial<DeckConfig> | undefined>(undefined)

  const save_review_mutation = useSaveReviewMutation()
  const persisted_session = usePersistedSession()

  const mode = ref<'studying' | 'completed'>('studying')
  const active_card = shallowRef<StudyCard | undefined>(undefined)
  const results = shallowRef<CardReviewResult[]>([])

  let _has_seeded = false

  const cards = computed(() => {
    return _cards_in_deck.value
  })

  const num_correct = computed(() => cards.value.filter((c) => c.state === 'passed').length)
  const reviewed_count = computed(() => cards.value.filter((c) => c.state !== 'unreviewed').length)

  const remaining_due_count = computed(() => {
    if (config.study_all_cards) return 0
    const total_due = _raw_cards.value.filter(_isCardDue).length
    return Math.max(0, total_due - reviewed_count.value)
  })

  const current_index = computed(() => {
    if (!active_card.value) return cards.value.length
    return cards.value.findIndex((c) => c.id === active_card.value!.id)
  })

  /**
   * Records which decks/config this session belongs to, so a refresh-resume
   * knows what to reopen the modal with. Doesn't touch the card queue —
   * call once, up front, alongside setCards()/restoreCards().
   */
  function setSessionMeta(deck_ids: number[], config_override?: Partial<DeckConfig>) {
    _deck_ids.value = deck_ids
    _config_override.value = config_override
  }

  function setCards(raw: Card[]) {
    _raw_cards.value = raw
    results.value = []
    _processCards()
    _has_seeded = true
    _persist()
  }

  /**
   * Rebuilds the session from a sessionStorage snapshot after a refresh.
   * `raw` is only the still-unreviewed remainder, fetched by id so newly-due
   * cards can't leak into the locked queue; already-reviewed cards are
   * rebuilt from `persisted.results` alone (they're never shown again).
   */
  function restoreCards(raw: Card[], persisted: PersistedSession) {
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
    mode.value = persisted.mode
    if (mode.value === 'studying' && !active_card.value) mode.value = 'completed'
    _has_seeded = true
    _persist()
  }

  function updateConfig(updates: Partial<DeckConfig>) {
    config.study_mode = updates.study_mode ?? config.study_mode
    config.study_all_cards = updates.study_all_cards ?? config.study_all_cards
    config.shuffle = updates.shuffle ?? config.shuffle
    config.max_reviews_per_day = updates.max_reviews_per_day ?? config.max_reviews_per_day
    config.max_new_per_day = updates.max_new_per_day ?? config.max_new_per_day
    config.flip_cards = updates.flip_cards ?? config.flip_cards

    if (_raw_cards.value.length) _processCards()
  }

  function _processCards() {
    let filtered = [..._raw_cards.value]

    if (!config.study_all_cards) {
      filtered = filtered.filter(_isCardDue)
    }

    if (config.shuffle) {
      filtered.sort(() => Math.random() - 0.5)
    }

    _cards_in_deck.value = filtered.map(_setupCard)
    mode.value = 'studying'
    active_card.value = cards.value.find((c) => c.state === 'unreviewed')

    if (!active_card.value) {
      mode.value = 'completed'
    }
  }

  /**
   * Remove a card from the session entirely — used when it's deleted or
   * moved out of the deck mid-session. Drops it from both the raw pool and
   * the processed queue; when it was the active card, advances to the next
   * unreviewed card (or completes the session if none remain).
   */
  function dropCard(card_id: number) {
    const was_active = active_card.value?.id === card_id

    _raw_cards.value = _raw_cards.value.filter((c) => c.id !== card_id)
    _cards_in_deck.value = _cards_in_deck.value.filter((c) => c.id !== card_id)

    if (!was_active) {
      _persist()
      return
    }

    active_card.value = cards.value.find((c) => c.state === 'unreviewed')
    if (!active_card.value) mode.value = 'completed'
    _persist()
  }

  /**
   * Patches a card's fields in the local session queue (and active_card, if
   * it's the one showing). The session keeps its own copy of cards separate
   * from the deck-list query cache, so an edit made mid-session needs its own
   * patch path rather than relying on cache invalidation.
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

    if (grade !== undefined) {
      // Compute scheduling at the moment the user rates, not at session start.
      // _FSRS_INSTANCE.next() is the single-grade version of repeat() — it
      // returns a fresh RecordLogItem with item.log.review = now and
      // item.card.due calculated from this exact moment.
      const review = card.review ?? (createEmptyCard(new Date()) as Review)
      const item = _FSRS_INSTANCE.next(review, new Date(), grade)

      if (card.id) {
        results.value.push({
          card_id: card.id,
          front_text: card.front_text,
          is_new: (review.reps ?? 0) === 0,
          before_interval: review.scheduled_days ?? 0,
          after_interval: item.card.scheduled_days ?? 0,
          lapses: item.card.lapses ?? 0,
          passed: grade !== Rating.Again
        })
      }

      card.review = item.card
      _markCurrentCardStudied(grade)

      active_card.value = cards.value.find((c) => c.state === 'unreviewed')
      if (!active_card.value) mode.value = 'completed'
      _persist()

      if (card.id && card.deck_id !== undefined) {
        return save_review_mutation.mutateAsync({
          card_id: card.id,
          deck_id: card.deck_id,
          card: item.card,
          log: item.log
        })
      }
    } else {
      card.state = 'passed'
      active_card.value = cards.value.find((c) => c.state === 'unreviewed')
      if (!active_card.value) mode.value = 'completed'
      _persist()
    }
  }

  function _setupCard(card: Card): StudyCard {
    const review = card.review ?? (createEmptyCard(new Date()) as Review)
    const preview = _FSRS_INSTANCE.repeat(review, new Date())
    return { ...card, review, preview, state: 'unreviewed' }
  }

  function _markCurrentCardStudied(grade: Grade) {
    const card = active_card.value
    if (!card || !card.id) return

    card.state = grade === Rating.Again ? 'failed' : 'passed'
  }

  function _isCardDue(card: Card) {
    if (!card.review?.due) return true
    const raw = card.review.due
    const due = raw instanceof Date ? raw : new Date(String(raw))
    return due.getTime() <= Date.now()
  }

  /**
   * `results` and `_cards_in_deck` are shallowRefs mutated in place
   * (`.push()`, direct property writes) for performance — a `watch()` on them
   * would never fire, since shallow refs only react to `.value` reassignment.
   * So persistence is an explicit call at every state-changing call site
   * instead of a reactive side effect.
   */
  function _persist() {
    if (!_has_seeded) return
    persisted_session.value = {
      deck_ids: _deck_ids.value,
      config_override: _config_override.value,
      card_ids: _cards_in_deck.value.map((c) => c.id),
      results: results.value,
      mode: mode.value
    }
  }

  return {
    mode,
    active_card,
    results,
    cards,
    num_correct,
    reviewed_count,
    remaining_due_count,
    current_index,
    config,
    show_all_ratings,
    setSessionMeta,
    setCards,
    restoreCards,
    updateConfig,
    reviewCard,
    dropCard,
    updateCard
  }
}
