import { supabase } from '@/supabase-client'
import { useMemberStore } from '@/stores/member'
import logger from '@/utils/logger'
import { isoNow, localDayStart } from '@/utils/date'

export async function fetchMemberDecks(): Promise<Deck[]> {
  const { data, error } = await supabase
    .rpc('decks_with_stats', { p_today_start: localDayStart() })
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
    .rpc('decks_with_stats', { p_today_start: localDayStart() })
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
    .rpc('decks_with_stats', { p_today_start: localDayStart() })
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
  const payload = { ...deck, updated_at: isoNow() }
  const { data, error } = await supabase
    .from('decks')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as Deck
}

export async function deleteDeck(id: number): Promise<void> {
  const { error } = await supabase.rpc('delete_deck', { p_deck_id: id })

  if (error) {
    logger.error(error.message)
    throw error
  }
}
