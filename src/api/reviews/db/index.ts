import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import type { ReviewLog } from 'ts-fsrs'

export async function saveReview(card_id: number, card: Review, log: ReviewLog): Promise<void> {
  const { error } = await supabase.rpc('save_review', {
    p_card_id: card_id,

    // Current FSRS card state → reviews
    p_card: {
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      last_review: card.last_review ?? null,
      state: card.state,
      learning_steps: card.learning_steps ?? null
    },

    // Review event → review_logs
    p_log: {
      rating: log.rating,
      state: log.state,
      due: log.due,
      stability: log.stability,
      difficulty: log.difficulty,
      scheduled_days: log.scheduled_days,
      review: log.review
    }
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
