import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { fetchCardsInDeckMock, useInfiniteQueryMock } = vi.hoisted(() => ({
  fetchCardsInDeckMock: vi.fn(),
  useInfiniteQueryMock: vi.fn()
}))

vi.mock('@/api/cards/db', () => ({
  fetchCardsInDeck: fetchCardsInDeckMock
}))

vi.mock('@pinia/colada', () => ({
  useInfiniteQuery: useInfiniteQueryMock
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  cardsInDeckQueryKey,
  useCardsInDeckInfiniteQuery,
  CARDS_PAGE_SIZE
} from '@/api/cards/queries/cards-page'

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  fetchCardsInDeckMock.mockReset()
  useInfiniteQueryMock.mockReset()
  useInfiniteQueryMock.mockReturnValue({})
})

describe('cardsInDeckQueryKey', () => {
  test('with only deck_id produces the default sort + empty query key [obligation]', () => {
    // drag-reorder mutation calls cardsInDeckQueryKey(deck_id) with no other args
    // and must always hit the default-sort cache
    expect(cardsInDeckQueryKey(5)).toEqual(['cards', 5, 'pages', CARDS_PAGE_SIZE, 'default', ''])
  })

  test('uses deck_id 0 when deck_id is undefined', () => {
    expect(cardsInDeckQueryKey(undefined)).toEqual([
      'cards',
      0,
      'pages',
      CARDS_PAGE_SIZE,
      'default',
      ''
    ])
  })

  test('includes sort_by and query in the key so different combos get separate cache entries [obligation]', () => {
    const key_a = cardsInDeckQueryKey(1, 'default', '')
    const key_b = cardsInDeckQueryKey(1, 'difficulty', '')
    const key_c = cardsInDeckQueryKey(1, 'default', 'cat')
    expect(key_a).not.toEqual(key_b)
    expect(key_a).not.toEqual(key_c)
    expect(key_b).not.toEqual(key_c)
  })

  test('key shape is [cards, deck_id, pages, page_size, sort_by, query]', () => {
    expect(cardsInDeckQueryKey(42, 'difficulty', 'fox', 25)).toEqual([
      'cards',
      42,
      'pages',
      25,
      'difficulty',
      'fox'
    ])
  })

  test('page_size defaults to CARDS_PAGE_SIZE (50) when omitted', () => {
    const key = cardsInDeckQueryKey(1, 'default', '')
    expect(key[3]).toBe(CARDS_PAGE_SIZE)
    expect(CARDS_PAGE_SIZE).toBe(50)
  })
})

describe('useCardsInDeckInfiniteQuery', () => {
  test('passes empty string search_query as null to fetchCardsInDeck — no spurious ilike [obligation]', () => {
    useCardsInDeckInfiniteQuery(ref(10), ref('default'), ref(''))
    const [{ query }] = useInfiniteQueryMock.mock.calls[0]
    // Invoke the query fn with a fake pageParam
    query({ pageParam: 0 })
    expect(fetchCardsInDeckMock).toHaveBeenCalledWith(expect.objectContaining({ query: null }))
  })

  test('passes non-empty search_query string through to fetchCardsInDeck', () => {
    useCardsInDeckInfiniteQuery(ref(10), ref('default'), ref('cat'))
    const [{ query }] = useInfiniteQueryMock.mock.calls[0]
    query({ pageParam: 0 })
    expect(fetchCardsInDeckMock).toHaveBeenCalledWith(expect.objectContaining({ query: 'cat' }))
  })

  test('key fn includes sort_by and search_query so different combos produce different keys [obligation]', () => {
    useCardsInDeckInfiniteQuery(ref(5), ref('default'), ref(''))
    const [{ key }] = useInfiniteQueryMock.mock.calls[0]
    const key_default_empty = key()

    useInfiniteQueryMock.mockClear()
    useCardsInDeckInfiniteQuery(ref(5), ref('difficulty'), ref(''))
    const [{ key: key2 }] = useInfiniteQueryMock.mock.calls[0]
    const key_difficulty_empty = key2()

    expect(key_default_empty).not.toEqual(key_difficulty_empty)
  })

  test('key fn changes when search_query changes [obligation]', () => {
    const search_query = ref('')
    useCardsInDeckInfiniteQuery(ref(5), ref('default'), search_query)
    const [{ key }] = useInfiniteQueryMock.mock.calls[0]

    const before = key()
    search_query.value = 'fox'
    const after = key()

    expect(before).not.toEqual(after)
  })

  test('key fn with no sort/query args produces default key (same as cardsInDeckQueryKey(deck_id))', () => {
    useCardsInDeckInfiniteQuery(ref(7))
    const [{ key }] = useInfiniteQueryMock.mock.calls[0]
    expect(key()).toEqual(cardsInDeckQueryKey(7))
  })

  test('getNextPageParam returns null when last page is shorter than page_size', () => {
    useCardsInDeckInfiniteQuery(ref(10))
    const [{ getNextPageParam }] = useInfiniteQueryMock.mock.calls[0]
    const short_page = new Array(10).fill({})
    expect(getNextPageParam(short_page, [short_page])).toBe(null)
  })

  test('getNextPageParam returns total loaded count when last page is full', () => {
    useCardsInDeckInfiniteQuery(ref(10))
    const [{ getNextPageParam }] = useInfiniteQueryMock.mock.calls[0]
    const full_page = new Array(CARDS_PAGE_SIZE).fill({})
    const all_pages = [full_page]
    expect(getNextPageParam(full_page, all_pages)).toBe(CARDS_PAGE_SIZE)
  })

  test('enabled fn returns false when deck_id is undefined', () => {
    useCardsInDeckInfiniteQuery(ref(undefined))
    const [{ enabled }] = useInfiniteQueryMock.mock.calls[0]
    expect(enabled()).toBe(false)
  })

  test('enabled fn returns true when deck_id is a positive number', () => {
    useCardsInDeckInfiniteQuery(ref(5))
    const [{ enabled }] = useInfiniteQueryMock.mock.calls[0]
    expect(enabled()).toBe(true)
  })

  test('passes sort_by to fetchCardsInDeck', () => {
    useCardsInDeckInfiniteQuery(ref(10), ref('difficulty'), ref(''))
    const [{ query }] = useInfiniteQueryMock.mock.calls[0]
    query({ pageParam: 0 })
    expect(fetchCardsInDeckMock).toHaveBeenCalledWith(
      expect.objectContaining({ sort_by: 'difficulty' })
    )
  })

  test('passes offset from pageParam to fetchCardsInDeck', () => {
    useCardsInDeckInfiniteQuery(ref(10))
    const [{ query }] = useInfiniteQueryMock.mock.calls[0]
    query({ pageParam: 100 })
    expect(fetchCardsInDeckMock).toHaveBeenCalledWith(expect.objectContaining({ offset: 100 }))
  })
})
