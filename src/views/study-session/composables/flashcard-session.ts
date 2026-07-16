import { ref, computed } from 'vue'
import { type Grade } from 'ts-fsrs'
import { useSessionQueue } from './session-queue'
import { emitStudySfx } from '@/sfx/bus'

export type { StudyCard, CardReviewResult } from './session-queue'

/**
 * Wraps `useSessionQueue` with the concept of card sides: a card can be on
 * its front, back, or cover (pre-session splash). All side transitions live
 * here. This is the composable used directly by flashcard/index.vue.
 */
export function useFlashcardSession(pacing: ReviewPacingParams, _config?: Partial<DeckConfig>) {
  const core = useSessionQueue(pacing, _config)

  const current_card_side = ref<CardSide>('cover')

  const starting_side = computed<'front' | 'back'>(() =>
    core.config.flip_cards ? 'back' : 'front'
  )

  const is_starting_side = computed(() => current_card_side.value === starting_side.value)

  const next_card = computed(() =>
    core.cards.value.slice(core.current_index.value + 1).find((c) => c.state === 'unreviewed')
  )

  const is_cover = computed(() => current_card_side.value === 'cover')

  /**
   * Transitions from the cover into the active session.
   * Sets current_card_side to the starting side for the deck config.
   * `silent` skips the start jingle — used when a refresh-restore drops the
   * user back into an already-started session rather than a deliberate tap.
   */
  function startSession({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) emitStudySfx('music_plink_chordyes')
    current_card_side.value = starting_side.value
  }

  function flipCurrentCard() {
    emitStudySfx(is_starting_side.value ? 'transition_up' : 'transition_down')
    current_card_side.value = current_card_side.value === 'front' ? 'back' : 'front'
  }

  function dropCard(card_id: number) {
    core.dropCard(card_id)
    if (core.mode.value === 'studying' && core.active_card.value) {
      current_card_side.value = starting_side.value
    }
  }

  function reviewCard(grade?: Grade) {
    const promise = core.reviewCard(grade)
    // Reset to the starting side for the incoming card.
    // core.reviewCard is synchronous up to the API call, so active_card
    // and mode are already updated by the time we read them here.
    if (core.mode.value === 'studying' && core.active_card.value) {
      current_card_side.value = starting_side.value
    }
    return promise
  }

  return {
    ...core,
    current_card_side,
    is_starting_side,
    next_card,
    is_cover,
    startSession,
    flipCurrentCard,
    reviewCard,
    dropCard
  }
}
