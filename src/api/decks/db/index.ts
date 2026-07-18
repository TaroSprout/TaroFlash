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
    p_pacing_overrides: deck.pacing_overrides ?? {}
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
