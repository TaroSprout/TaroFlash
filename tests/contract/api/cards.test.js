import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser } from '../setup.js'
import { createDeck, insertCardDirect } from '../fixtures.js'
import {
  insertCard,
  bulkInsertCardsInDeck,
  fetchCardsPageByDeckId,
  fetchCardsInDeck,
  fetchCardsByIds,
  fetchMemberCardCount,
  fetchSessionBootstrap,
  moveCard,
  deleteCards,
  deleteCardsInDeck,
  upsertCard,
  upsertCards,
  moveCardsToDeck
} from '@/api/cards/db'

let session
let deck

beforeEach(async () => {
  session = await signInAsTestUser()
  deck = await createDeck(session.client, session.userId, { title: 'Cards Test Deck' })
})

afterEach(async () => {
  await session?.cleanup()
  session = null
  deck = null
})

describe('insertCard (contract)', () => {
  test('inserts a card at an explicit key and returns id+rank', async () => {
    const result = await insertCard({
      deck_id: deck.id,
      rank: 'a0',
      front_text: 'Front',
      back_text: 'Back'
    })
    expect(result.id).toEqual(expect.any(Number))
    expect(result.rank).toBe('a0')
  })

  test('appends after the current tail when rank is omitted', async () => {
    const first = await insertCard({
      deck_id: deck.id,
      rank: 'a0',
      front_text: 'A',
      back_text: 'a'
    })
    const second = await insertCard({
      deck_id: deck.id,
      front_text: 'B',
      back_text: 'b'
    })
    expect(second.rank > first.rank).toBe(true)
  })
})

describe('bulkInsertCardsInDeck (contract)', () => {
  test('returns the inserted rows in order', async () => {
    const cards = await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'F1', back_text: 'B1' },
        { front_text: 'F2', back_text: 'B2' }
      ]
    })
    expect(cards).toHaveLength(2)
    expect(cards.map((c) => c.front_text)).toEqual(['F1', 'F2'])
    expect(cards[1].rank > cards[0].rank).toBe(true)
  })
})

describe('fetchCardsPageByDeckId (contract)', () => {
  test('returns the page slice ordered by rank with embedded review', async () => {
    await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: Array.from({ length: 5 }, (_, i) => ({
        front_text: `F${i}`,
        back_text: `B${i}`
      }))
    })
    const page = await fetchCardsPageByDeckId({ deck_id: deck.id, offset: 1, limit: 2 })
    expect(page).toHaveLength(2)
    expect(page[0].rank < page[1].rank).toBe(true)
    expect(page[0]).toHaveProperty('review')
  })
})

describe('fetchMemberCardCount (contract)', () => {
  test('counts cards owned by the current member', async () => {
    expect(await fetchMemberCardCount({ only_due_cards: false })).toBe(0)
    await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'a', back_text: 'a' },
        { front_text: 'b', back_text: 'b' }
      ]
    })
    expect(await fetchMemberCardCount({ only_due_cards: false })).toBe(2)
  })
})

describe('fetchCardsInDeck (contract)', () => {
  test('returns cards in default rank order when sort_by="default" and query=null', async () => {
    await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'A', back_text: 'a' },
        { front_text: 'B', back_text: 'b' }
      ]
    })
    const result = await fetchCardsInDeck({
      deck_id: deck.id,
      sort_by: 'default',
      query: null,
      offset: 0,
      limit: 50
    })
    expect(result.cards).toHaveLength(2)
    expect(result.cards[0]).toHaveProperty('front_text')
    expect(result.cards[0]).toHaveProperty('review')
  })

  test('filters by query with ilike when query is a non-null string', async () => {
    await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'Hello world', back_text: 'greeting' },
        { front_text: 'goodbye', back_text: 'farewell' }
      ]
    })
    const result = await fetchCardsInDeck({
      deck_id: deck.id,
      sort_by: 'default',
      query: 'WORLD',
      offset: 0,
      limit: 50
    })
    expect(result.cards).toHaveLength(1)
    expect(result.cards[0].front_text).toBe('Hello world')
  })

  test('returns all cards when query is null — no spurious ilike fires', async () => {
    await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'one', back_text: '' },
        { front_text: 'two', back_text: '' }
      ]
    })
    const result = await fetchCardsInDeck({
      deck_id: deck.id,
      sort_by: 'default',
      query: null,
      offset: 0,
      limit: 50
    })
    expect(result.cards).toHaveLength(2)
  })

  test('respects offset and limit for pagination, capping cards at limit', async () => {
    await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: Array.from({ length: 5 }, (_, i) => ({ front_text: `F${i}`, back_text: '' }))
    })
    const page = await fetchCardsInDeck({
      deck_id: deck.id,
      sort_by: 'default',
      query: null,
      offset: 2,
      limit: 2
    })
    expect(page.cards).toHaveLength(2)
  })

  // the lookahead row is what makes writes at a page boundary land correctly
  test('next_rank carries the rank of the row past the page, null at the end of the deck', async () => {
    await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: Array.from({ length: 3 }, (_, i) => ({ front_text: `F${i}`, back_text: '' }))
    })

    const first_page = await fetchCardsInDeck({
      deck_id: deck.id,
      sort_by: 'default',
      query: null,
      offset: 0,
      limit: 2
    })
    expect(first_page.next_rank).toEqual(expect.any(String))

    const last_page = await fetchCardsInDeck({
      deck_id: deck.id,
      sort_by: 'default',
      query: null,
      offset: 2,
      limit: 2
    })
    expect(last_page.next_rank).toBeNull()
  })
})

describe('moveCard (contract)', () => {
  test('writes the given key as the card rank — a plain update, no RPC', async () => {
    const [a, b, c] = await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'A', back_text: '' },
        { front_text: 'B', back_text: '' },
        { front_text: 'C', back_text: '' }
      ]
    })
    await moveCard({ card_id: c.id, rank: 'a0' })

    const page = await fetchCardsPageByDeckId({ deck_id: deck.id, offset: 0, limit: 10 })
    const moved = page.find((card) => card.id === c.id)
    expect(moved.rank).toBe('a0')
    void a
    void b
  })
})

describe('deleteCards (contract)', () => {
  test('removes cards by id', async () => {
    const cards = await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'x', back_text: '' },
        { front_text: 'y', back_text: '' }
      ]
    })
    await deleteCards(cards)
    const remaining = await fetchCardsPageByDeckId({ deck_id: deck.id, offset: 0, limit: 1000 })
    expect(remaining).toHaveLength(0)
  })
})

describe('deleteCardsInDeck (contract)', () => {
  test('deletes all cards except the listed ids', async () => {
    const cards = await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'keep', back_text: '' },
        { front_text: 'drop1', back_text: '' },
        { front_text: 'drop2', back_text: '' }
      ]
    })
    const [keep] = cards
    const deleted = await deleteCardsInDeck({ deck_id: deck.id, except_ids: [keep.id] })
    expect(deleted).toBe(2)
    const remaining = await fetchCardsPageByDeckId({ deck_id: deck.id, offset: 0, limit: 1000 })
    expect(remaining.map((c) => c.id)).toEqual([keep.id])
  })
})

describe('upsertCard / upsertCards (contract)', () => {
  test('upsertCard updates an existing card', async () => {
    const card = await insertCardDirect(session.client, deck.id, { front_text: 'old' })
    const updated = await upsertCard({ ...card, front_text: 'new' })
    expect(updated.front_text).toBe('new')
  })

  test('upsertCards updates many in one round-trip', async () => {
    const cards = await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'one', back_text: '' },
        { front_text: 'two', back_text: '' }
      ]
    })
    const result = await upsertCards(cards.map((c) => ({ ...c, front_text: `${c.front_text}!` })))
    expect(result).toHaveLength(2)
    expect(result.every((c) => c.front_text.endsWith('!'))).toBe(true)
  })
})

describe('moveCardsToDeck (contract)', () => {
  test('reassigns deck_id on the given cards', async () => {
    const target = await createDeck(session.client, session.userId, { title: 'Target' })
    const [card] = await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [{ front_text: 'mover', back_text: '' }]
    })
    await moveCardsToDeck({ target_deck_id: target.id, card_ids: [card.id] })
    const inTarget = await fetchCardsPageByDeckId({
      deck_id: target.id,
      offset: 0,
      limit: 1000
    })
    expect(inTarget.map((c) => c.id)).toContain(card.id)
  })
})

describe('fetchCardsByIds (contract)', () => {
  test('returns an empty array for an empty id list', async () => {
    expect(await fetchCardsByIds([])).toEqual([])
  })

  test('returns cards matching the given ids, with review embedded, ignoring due-ness', async () => {
    const cards = await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'F1', back_text: 'B1' },
        { front_text: 'F2', back_text: 'B2' },
        { front_text: 'F3', back_text: 'B3' }
      ]
    })
    const [first, second] = cards

    const result = await fetchCardsByIds([first.id, second.id])

    const byId = (x, y) => x - y
    expect(result.map((c) => c.id).sort(byId)).toEqual([first.id, second.id].sort(byId))
    expect(result[0]).toHaveProperty('review')
  })
})

describe('fetchSessionBootstrap (contract)', () => {
  test('returns the resolved deck and its cards for a single requested deck', async () => {
    await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'F1', back_text: 'B1' },
        { front_text: 'F2', back_text: 'B2' }
      ]
    })

    const result = await fetchSessionBootstrap([deck.id])

    expect(result.decks).toHaveLength(1)
    expect(result.decks[0]).toMatchObject({
      id: deck.id,
      desired_retention: expect.any(Number),
      learning_steps: expect.any(Array)
    })
    expect(result.cards).toHaveLength(2)
    expect(result.cards[0]).toHaveProperty('review')
  })

  test('merges cards across multiple decks, in the requested deck order', async () => {
    const deck2 = await createDeck(session.client, session.userId, { title: 'Second Deck' })
    await insertCardDirect(session.client, deck.id, { front_text: 'Deck1 Card' })
    await insertCardDirect(session.client, deck2.id, { front_text: 'Deck2 Card' })

    const result = await fetchSessionBootstrap([deck2.id, deck.id])

    expect(result.decks.map((d) => d.id)).toEqual([deck2.id, deck.id])
    expect(result.cards.map((c) => c.front_text)).toEqual(['Deck2 Card', 'Deck1 Card'])
  })

  test('returns empty decks/cards for an empty deck_ids list', async () => {
    const result = await fetchSessionBootstrap([])
    expect(result).toEqual({ decks: [], cards: [] })
  })
})
