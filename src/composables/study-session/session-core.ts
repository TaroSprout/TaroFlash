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

export type StudyCard = Card & { preview?: RecordLog; state: ReviewState }

type ReviewState = 'failed' | 'passed' | 'unreviewed'

export type StudySessionCore = ReturnType<typeof useStudySessionCore>

/**
 * Mode-agnostic study session core: queue management, FSRS scheduling,
 * session lifecycle, and stats. Does not know about flashcard sides, flipping,
 * or any other interaction model — those live in mode-specific composables.
 *
 * Future study modes (matching pairs, cloze, etc.) build on top of this core.
 */
export function useStudySessionCore(_config?: Partial<DeckConfig>) {
  const _PARAMS = generatorParameters({
    enable_fuzz: true,
    learning_steps: [],
    relearning_steps: []
  })

  const config = reactive<Required<DeckConfig>>(withDeckConfigDefaults(_config))

  const _FSRS_INSTANCE: FSRS = new FSRS(_PARAMS)
  const _raw_cards = shallowRef<Card[]>([])
  const _cards_in_deck = shallowRef<StudyCard[]>([])

  const save_review_mutation = useSaveReviewMutation()

  const mode = ref<'studying' | 'completed'>('studying')
  const active_card = shallowRef<StudyCard | undefined>(undefined)

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

  function setCards(raw: Card[]) {
    _raw_cards.value = raw
    _processCards()
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
      const new_cards = filtered.filter((c) => !c.review)
      const review_cards = filtered.filter((c) => c.review)
      review_cards.sort(() => Math.random() - 0.5)
      filtered = [...new_cards, ...review_cards]
    }

    _cards_in_deck.value = filtered.map(_setupCard)
    mode.value = 'studying'
    active_card.value = cards.value.find((c) => c.state === 'unreviewed')

    if (!active_card.value) {
      mode.value = 'completed'
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

      card.review = item.card
      _markCurrentCardStudied(grade)

      active_card.value = cards.value.find((c) => c.state === 'unreviewed')
      if (!active_card.value) mode.value = 'completed'

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

  return {
    mode,
    active_card,
    cards,
    num_correct,
    reviewed_count,
    remaining_due_count,
    current_index,
    config,
    setCards,
    updateConfig,
    reviewCard
  }
}
