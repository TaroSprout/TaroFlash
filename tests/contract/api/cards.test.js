import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser } from '../setup.js'
import { createDeck, insertCardDirect } from '../fixtures.js'
import {
  insertCardAt,
  bulkInsertCardsInDeck,
  fetchCardsPageByDeckId,
  fetchCardsInDeck,
  fetchMemberCardCount,
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

describe('insertCardAt (contract)', () => {
  test('inserts a card at the head of an empty deck and returns id+rank', async () => {
    const result = await insertCardAt({
      deck_id: deck.id,
      anchor_id: null,
      side: null,
      front_text: 'Front',
      back_text: 'Back'
    })
    expect(result.id).toEqual(expect.any(Number))
    expect(result.rank).toEqual(expect.any(Number))
  })

  test('places after the anchor when side="after"', async () => {
    const first = await insertCardAt({
      deck_id: deck.id,
      anchor_id: null,
      side: null,
      front_text: 'A',
      back_text: 'a'
    })
    const second = await insertCardAt({
      deck_id: deck.id,
      anchor_id: first.id,
      side: 'after',
      front_text: 'B',
      back_text: 'b'
    })
    expect(second.rank).toBeGreaterThan(first.rank)
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
    expect(cards[1].rank).toBeGreaterThan(cards[0].rank)
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
    expect(page[0].rank).toBeLessThan(page[1].rank)
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
    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('front_text')
    expect(result[0]).toHaveProperty('review')
  })

  test('filters by query with ilike when query is a non-null string [obligation]', async () => {
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
    expect(result).toHaveLength(1)
    expect(result[0].front_text).toBe('Hello world')
  })

  test('returns all cards when query is null — no spurious ilike fires [obligation]', async () => {
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
    expect(result).toHaveLength(2)
  })

  test('respects offset and limit for pagination', async () => {
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
    expect(page).toHaveLength(2)
  })
})

describe('moveCard (contract)', () => {
  test('updates the rank of the moved card to sit beside the anchor', async () => {
    const [a, b, c] = await bulkInsertCardsInDeck({
      deck_id: deck.id,
      cards: [
        { front_text: 'A', back_text: '' },
        { front_text: 'B', back_text: '' },
        { front_text: 'C', back_text: '' }
      ]
    })
    const new_rank = await moveCard({ card_id: c.id, anchor_id: a.id, side: 'before' })
    expect(new_rank).toBeLessThan(a.rank)
    expect(new_rank).toEqual(expect.any(Number))
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
