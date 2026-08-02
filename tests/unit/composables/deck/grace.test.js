import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { useDeckGrace } from '@/composables/deck/grace'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeDeck(id, rank, is_locked = false) {
  return { id, rank, is_locked }
}

function makeTwelveDecks() {
  // ids/ranks 1..12, ascending — only the last (rank 12) is flagged is_locked
  // by the backend, which is enough to signal "in grace" per the composable.
  return Array.from({ length: 12 }, (_, i) => makeDeck(i + 1, i + 1, i === 11))
}

// ── in_grace [obligation] ────────────────────────────────────────────────────

describe('useDeckGrace — in_grace', () => {
  test('is true when at least one deck is_locked [obligation]', () => {
    const decks = [makeDeck(1, 1, false), makeDeck(2, 2, true)]
    const { in_grace } = useDeckGrace(() => decks)
    expect(in_grace.value).toBe(true)
  })

  test('is false when no deck is_locked [obligation]', () => {
    const decks = [makeDeck(1, 1, false), makeDeck(2, 2, false)]
    const { in_grace } = useDeckGrace(() => decks)
    expect(in_grace.value).toBe(false)
  })

  test('is false for an empty deck list', () => {
    const { in_grace } = useDeckGrace(() => [])
    expect(in_grace.value).toBe(false)
  })
})

// ── lockedIds while in grace [obligation] ────────────────────────────────────

describe('useDeckGrace — lockedIds while in grace', () => {
  test('locks only the decks ranked below the top 10; the top 10 by rank are excluded [obligation]', () => {
    const decks = makeTwelveDecks()
    const { lockedIds } = useDeckGrace(() => decks)
    const locked = lockedIds.value

    for (let rank = 1; rank <= 10; rank++) expect(locked.has(rank)).toBe(false)
    expect(locked.has(11)).toBe(true)
    expect(locked.has(12)).toBe(true)
    expect(locked.size).toBe(2)
  })

  test('ranks ascending, not insertion order — sorts before slicing', () => {
    const decks = makeTwelveDecks().reverse()
    const { lockedIds } = useDeckGrace(() => decks)
    const locked = lockedIds.value

    expect(locked.has(11)).toBe(true)
    expect(locked.has(12)).toBe(true)
    expect(locked.has(10)).toBe(false)
  })
})

// ── lockedIds outside grace [obligation] ─────────────────────────────────────

describe('useDeckGrace — lockedIds outside grace', () => {
  test('is empty even with more than 10 decks when none are locked [obligation]', () => {
    const decks = Array.from({ length: 15 }, (_, i) => makeDeck(i + 1, i + 1, false))
    const { lockedIds } = useDeckGrace(() => decks)
    expect(lockedIds.value.size).toBe(0)
  })

  test('is empty for an empty deck list', () => {
    const { lockedIds } = useDeckGrace(() => [])
    expect(lockedIds.value.size).toBe(0)
  })
})

// ── recomputes from local rank [obligation] ──────────────────────────────────

describe('useDeckGrace — recomputes from local rank', () => {
  test('a rank mutation crossing the 10th position flips lockedIds membership without an is_locked change [obligation]', () => {
    const decksRef = ref(makeTwelveDecks())
    const { lockedIds } = useDeckGrace(() => decksRef.value)

    expect(lockedIds.value.has(11)).toBe(true)

    // Promote deck 11 (currently rank 11, below the top 10) above deck 1
    // (rank 1) purely by rank — mirrors an optimistic drag-reorder patching
    // the cache. Neither deck's is_locked flag changes (only id 12 carries
    // the backend flag that put the list into grace).
    const deck_11 = decksRef.value.find((deck) => deck.id === 11)
    const deck_1 = decksRef.value.find((deck) => deck.id === 1)
    deck_11.rank = 0
    deck_1.rank = 11

    expect(deck_11.is_locked).toBe(false)
    expect(deck_1.is_locked).toBe(false)
    expect(lockedIds.value.has(11)).toBe(false)
    expect(lockedIds.value.has(1)).toBe(true)
  })
})

// ── deck rank fallback ────────────────────────────────────────────────────────

describe('useDeckGrace — missing rank fallback', () => {
  test('treats a deck with no rank as rank 0 when sorting', () => {
    const decks = [
      { id: 1, is_locked: true }, // no rank -> falls back to 0, sorts first
      ...Array.from({ length: 10 }, (_, i) => makeDeck(i + 2, i + 1, false))
    ]
    const { lockedIds } = useDeckGrace(() => decks)
    // 11 decks total, id 1 sorts to rank 0 (first), so it's within the top 10 —
    // the deck ranked last (id 11, rank 10) is the one that falls outside.
    expect(lockedIds.value.has(1)).toBe(false)
    expect(lockedIds.value.has(11)).toBe(true)
  })
})
