import { fetchCardsInDeck } from './get-cards-in-deck'

const FETCH_ALL_PAGE_SIZE = 200

/**
 * Every card in a deck, in rank order.
 *
 * Asking for the lot in one request doesn't work: PostgREST caps any response
 * at `max_rows` (1000 in `config.toml`) and truncates silently past it, so a
 * big deck would come back short with nothing to signal it. Paging until the
 * deck runs out is what makes the read complete.
 */
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
