import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import type { ReviewLog } from 'ts-fsrs'

export async function saveReview(card_id: number, card: Review, log: ReviewLog): Promise<void> {
  const { error } = await supabase.rpc('save_review', {
    p_card_id: card_id,

    // Current FSRS card state
    p_due: card.due,
    p_stability: card.stability,
    p_difficulty: card.difficulty,
    p_elapsed_days: card.elapsed_days,
    p_scheduled_days: card.scheduled_days,
    p_reps: card.reps,
    p_lapses: card.lapses,
    p_last_review: card.last_review ?? null,
    p_card_state: card.state,
    p_learning_steps: card.learning_steps,

    // Review event log
    p_rating: log.rating,
    p_state: log.state,
    p_log_due: log.due,
    p_log_stability: log.stability,
    p_log_difficulty: log.difficulty,
    p_log_scheduled_days: log.scheduled_days,
    p_review: log.review
  })

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }
}

export async function resetDeckReviews(deck_id: number): Promise<void> {
  const { error } = await supabase.rpc('reset_deck_reviews', { p_deck_id: deck_id })

  if (error) {
    logger.error(error.message)
    throw new Error(error.message)
  }
}
