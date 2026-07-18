import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser } from '../setup.js'
import { fetchMemberDecks, fetchDeck, fetchMemberDeckCount, upsertDeck } from '@/api/decks/db'

let session
let displayName

beforeEach(async () => {
  session = await signInAsTestUser()
  displayName = `Contract Tester ${session.userId.slice(0, 8)}`
  const { error } = await session.client
    .from('members')
    .update({ display_name: displayName })
    .eq('id', session.userId)
  if (error) throw error
})

afterEach(async () => {
  await session?.cleanup()
  session = null
})

async function insertDeck(overrides = {}) {
  const { data, error } = await session.client
    .from('decks')
    .insert({ title: 'Test Deck', member_id: session.userId, ...overrides })
    .select()
    .single()
  if (error) throw error
  return data
}

describe('fetchMemberDecks (contract)', () => {
  test('returns an empty array when the member has no decks', async () => {
    const decks = await fetchMemberDecks()
    expect(decks).toEqual([])
  })

  test('returns the member’s decks with member_display_name populated', async () => {
    const inserted = await insertDeck({ title: 'My Deck' })
    const decks = await fetchMemberDecks()
    expect(decks).toHaveLength(1)
    expect(decks[0]).toMatchObject({
      id: inserted.id,
      title: 'My Deck',
      member_display_name: displayName,
      member_id: session.userId
    })
  })

  test('exposes the stats columns the FE consumes', async () => {
    await insertDeck()
    const [deck] = await fetchMemberDecks()
    expect(deck).toHaveProperty('card_count')
    expect(deck).toHaveProperty('due_count')
    expect(deck).toHaveProperty('reviewed_today_count')
    expect(deck).toHaveProperty('new_reviewed_today_count')
  })
})

describe('fetchDeck (contract)', () => {
  test('returns the deck with member_display_name embedded into the row', async () => {
    const inserted = await insertDeck({ title: 'Solo Deck' })
    const deck = await fetchDeck(inserted.id)
    expect(deck).toMatchObject({
      id: inserted.id,
      title: 'Solo Deck',
      member_display_name: displayName
    })
  })

  test('rejects when the id does not match a visible deck', async () => {
    await expect(fetchDeck(-1)).rejects.toBeTruthy()
  })
})

describe('fetchMemberDeckCount (contract)', () => {
  test('counts only the current member’s decks', async () => {
    expect(await fetchMemberDeckCount()).toBe(0)
    await insertDeck()
    await insertDeck({ title: 'Second' })
    expect(await fetchMemberDeckCount()).toBe(2)
  })
})

describe('upsertDeck (contract)', () => {
  test('creates a new deck via save_deck and returns the resolved shape', async () => {
    const deck = await upsertDeck({ title: 'Brand New Deck' })

    expect(deck).toMatchObject({ title: 'Brand New Deck', member_id: session.userId })
    expect(deck).toHaveProperty('card_count')
    expect(deck).toHaveProperty('due_count')
    expect(deck).toHaveProperty('max_reviews_per_day')
    expect(deck).toHaveProperty('pacing_overrides')
  })

  test('updates an existing deck via save_deck', async () => {
    const created = await upsertDeck({ title: 'Original' })

    const updated = await upsertDeck({ id: created.id, title: 'Renamed' })

    expect(updated.id).toBe(created.id)
    expect(updated.title).toBe('Renamed')
  })

  test('persists a daily-limit override in the pacing_overrides jsonb bag', async () => {
    const created = await upsertDeck({ title: 'Capped Deck' })

    const updated = await upsertDeck({
      id: created.id,
      title: 'Capped Deck',
      pacing_overrides: { max_reviews_per_day: 15 }
    })

    expect(updated.pacing_overrides).toEqual({ max_reviews_per_day: 15 })
    expect(updated.max_reviews_per_day).toBe(15)
  })

  test('persists leech_threshold and a pinned-null max_interval override [obligation]', async () => {
    const created = await upsertDeck({ title: 'Leech + Interval Deck' })

    const updated = await upsertDeck({
      id: created.id,
      title: 'Leech + Interval Deck',
      pacing_overrides: { leech_threshold: 12, max_interval: null }
    })

    expect(updated.leech_threshold).toBe(12)
    expect(updated.pacing_overrides).toEqual({ leech_threshold: 12, max_interval: null })
    expect(updated.max_interval).toBeNull()
  })
})
