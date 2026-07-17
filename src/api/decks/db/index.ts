import { supabase } from '@/supabase-client'
import { useMemberStore } from '@/stores/member'
import logger from '@/utils/logger'
import { localDayStart } from '@/utils/date'

export async function fetchMemberDecks(): Promise<Deck[]> {
  const { data, error } = await supabase
    .rpc('get_member_decks', { p_today_start: localDayStart() })
    .select('*')
    .eq('member_id', useMemberStore().id)

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data
}

export async function fetchDeck(id: number): Promise<Deck> {
  const { data, error } = await supabase
    .rpc('get_member_decks', { p_today_start: localDayStart() })
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as Deck
}

/**
 * Fetches decks by explicit id — used to reopen a study session's decks after
 * a page refresh, when only the deck ids survive in sessionStorage.
 */
export async function fetchDecksByIds(ids: number[]): Promise<Deck[]> {
  if (!ids.length) return []

  const { data, error } = await supabase
    .rpc('get_member_decks', { p_today_start: localDayStart() })
    .select('*')
    .in('id', ids)

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data ?? []
}

export async function fetchMemberDeckCount(): Promise<number> {
  const { count, error } = await supabase
    .from('decks')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', useMemberStore().id)

  if (error) {
    logger.error(error.message)
    throw error
  }

  return count ?? 0
}

export async function upsertDeck(deck: Deck): Promise<Deck> {
  const { data, error } = await supabase.rpc('save_deck', {
    p_deck_id: deck.id ?? null,
    p_title: deck.title ?? null,
    p_description: deck.description ?? null,
    p_is_public: deck.is_public ?? false,
    p_study_config: deck.study_config ?? {},
    p_cover_config: deck.cover_config ?? {},
    p_card_attributes: deck.card_attributes ?? {},
    p_review_pacing_preset_id: deck.review_pacing_preset_id ?? null,
    p_desired_retention_override: deck.desired_retention_override ?? null,
    p_learning_steps_override: deck.learning_steps_override ?? null,
    p_relearning_steps_override: deck.relearning_steps_override ?? null,
    p_has_max_reviews_override: deck.has_max_reviews_override ?? false,
    p_max_reviews_per_day_override: deck.max_reviews_per_day_override ?? null,
    p_has_max_new_override: deck.has_max_new_override ?? false,
    p_max_new_per_day_override: deck.max_new_per_day_override ?? null,
    p_leech_threshold_override: deck.leech_threshold_override ?? null,
    p_has_max_interval_override: deck.has_max_interval_override ?? false,
    p_max_interval_override: deck.max_interval_override ?? null
  })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return (Array.isArray(data) ? data[0] : data) as Deck
}

export async function deleteDeck(id: number): Promise<void> {
  const { error } = await supabase.rpc('delete_deck', { p_deck_id: id })

  if (error) {
    logger.error(error.message)
    throw error
  }
}

export type MoveDeckParams = {
  deck_id: number
  anchor_id: number
  side: 'before' | 'after'
}

export async function moveDeck(params: MoveDeckParams): Promise<number> {
  const { data, error } = await supabase.rpc('move_deck', {
    p_deck_id: params.deck_id,
    p_anchor_id: params.anchor_id,
    p_side: params.side
  })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data
}
