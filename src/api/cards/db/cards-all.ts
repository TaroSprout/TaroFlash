import { fetchCardsInDeck } from './get-cards-in-deck'

const FETCH_ALL_PAGE_SIZE = 200

// Trap: an oversized read comes back short with nothing to say so
// →[K:postgrest-max-rows-truncates-silently]

/** Every card in a deck, in rank order — paged, never asked for in one request. */
export async function fetchAllCardsInDeck(deck_id: number): Promise<Card[]> {
  const cards: Card[] = []
  let offset = 0
  let next_rank: string | null = ''

  while (next_rank !== null) {
    const page = await fetchCardsInDeck({
      deck_id,
      sort_by: 'default',
      query: null,
      offset,
      limit: FETCH_ALL_PAGE_SIZE
    })

    cards.push(...page.cards)
    offset += page.cards.length
    next_rank = page.next_rank
  }

  return cards
}
