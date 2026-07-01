import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { signInAsTestUser } from '../setup.js'
import { fetchMemberDecks, fetchDeck, fetchMemberDeckCount, fetchDecksByIds } from '@/api/decks/db'

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

describe('fetchDecksByIds (contract)', () => {
  test('returns an empty array for an empty id list', async () => {
    expect(await fetchDecksByIds([])).toEqual([])
  })

  test('returns the decks matching the given ids, with stats columns populated', async () => {
    const a = await insertDeck({ title: 'A' })
    const b = await insertDeck({ title: 'B' })
    await insertDeck({ title: 'Not requested' })

    const decks = await fetchDecksByIds([a.id, b.id])

    const byId = (x, y) => x - y
    expect(decks.map((d) => d.id).sort(byId)).toEqual([a.id, b.id].sort(byId))
    expect(decks[0]).toHaveProperty('card_count')
  })
})
