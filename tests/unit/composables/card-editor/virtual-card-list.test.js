import { describe, test, expect } from 'vite-plus/test'
import { ref } from 'vue'
import { card } from '@tests/fixtures/card'
import { useVirtualCardList } from '@/composables/card/virtual-list'

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

function makeCardsQuery(persisted = []) {
  return {
    data: { value: { pages: [persisted], pageParams: [0] } },
    hasNextPage: { value: false },
    isLoading: { value: false },
    loadNextPage: () => {}
  }
}

function makeList(persisted = [], deck_id_n = 10) {
  return useVirtualCardList(makeCardsQuery(persisted), ref(deck_id_n))
}

describe('useVirtualCardList', () => {
  describe('persisted_cards', () => {
    test('flattens pages from the cards_query into a single array', () => {
      const cards_query = {
        data: {
          value: {
            pages: [[makeCard({ id: 1 })], [makeCard({ id: 2 }), makeCard({ id: 3 })]],
            pageParams: [0, 1]
          }
        },
        hasNextPage: { value: false },
        isLoading: { value: false },
        loadNextPage: () => {}
      }
      const list = useVirtualCardList(cards_query, ref(10))
      expect(list.persisted_cards.value.map((c) => c.id)).toEqual([1, 2, 3])
    })

    test('defaults to an empty array when the query has no data yet', () => {
      const cards_query = {
        data: { value: undefined },
        hasNextPage: { value: false },
        isLoading: { value: false },
        loadNextPage: () => {}
      }
      const list = useVirtualCardList(cards_query, ref(10))
      expect(list.persisted_cards.value).toEqual([])
    })
  })

  describe('all_cards stamps a client_id on every card', () => {
    test('persisted cards get a stable client_id across reads', () => {
      const list = makeList([makeCard({ id: 100 })])
      const first = list.all_cards.value[0].client_id
      const second = list.all_cards.value[0].client_id
      expect(typeof first).toBe('string')
      expect(first).toBe(second)
    })

    test('different persisted cards get distinct client_ids', () => {
      const list = makeList([makeCard({ id: 1 }), makeCard({ id: 2 })])
      const [a, b] = list.all_cards.value
      expect(a.client_id).not.toBe(b.client_id)
    })

    test('temp cards get a client_id from the staged entry', () => {
      const list = makeList()
      list.addCard()
      const wrapped = list.all_cards.value[0]
      expect(typeof wrapped.client_id).toBe('string')
      expect(wrapped.client_id).toBe(list.temp_entries.value[0].client_id)
    })
  })

  describe('addCard', () => {
    test('creates a temp entry whose card.id is a placeholder (negative)', () => {
      const list = makeList()
      list.addCard()
      expect(list.all_cards.value).toHaveLength(1)
      expect(list.all_cards.value[0].id).toBeLessThan(0)
    })

    test('successive adds yield distinct placeholder ids', () => {
      const list = makeList()
      list.addCard()
      list.addCard()
      const [a, b] = list.all_cards.value.map((c) => c.id)
      expect(a).not.toBe(b)
    })

    test('uses the left neighbor as anchor with side=after', () => {
      const list = makeList([makeCard({ id: 100 }), makeCard({ id: 200 })])
      list.addCard(100)
      const entry = list.temp_entries.value[0]
      expect(entry.anchor_id).toBe(100)
      expect(entry.side).toBe('after')
    })

    test('uses the right neighbor as anchor with side=before when only right is given', () => {
      const list = makeList([makeCard({ id: 200 })])
      list.addCard(undefined, 200)
      const entry = list.temp_entries.value[0]
      expect(entry.anchor_id).toBe(200)
      expect(entry.side).toBe('before')
    })

    test('anchors to the last persisted card when no neighbors are passed', () => {
      const list = makeList([makeCard({ id: 100 }), makeCard({ id: 200 })])
      list.addCard()
      const entry = list.temp_entries.value[0]
      expect(entry.anchor_id).toBe(200)
      expect(entry.side).toBe('after')
    })

    test('uses anchor=null when the deck is empty', () => {
      const list = makeList()
      list.addCard()
      const entry = list.temp_entries.value[0]
      expect(entry.anchor_id).toBeNull()
    })

    test('initializes new temp cards with empty text and the deck id', () => {
      const list = makeList([], 42)
      list.addCard()
      const entry = list.temp_entries.value[0]
      expect(entry.card.front_text).toBe('')
      expect(entry.card.back_text).toBe('')
      expect(entry.card.deck_id).toBe(42)
    })

    test('starts entries with real_id=null', () => {
      const list = makeList()
      list.addCard()
      expect(list.temp_entries.value[0].real_id).toBeNull()
    })
  })

  describe('appendCard / prependCard', () => {
    test('appendCard delegates to addCard with the id as left neighbor', () => {
      const list = makeList([makeCard({ id: 50 })])
      list.appendCard(50)
      expect(list.temp_entries.value[0].anchor_id).toBe(50)
      expect(list.temp_entries.value[0].side).toBe('after')
    })

    test('prependCard delegates to addCard with the id as right neighbor', () => {
      const list = makeList([makeCard({ id: 50 })])
      list.prependCard(50)
      expect(list.temp_entries.value[0].anchor_id).toBe(50)
      expect(list.temp_entries.value[0].side).toBe('before')
    })
  })

  describe('addCard / appendCard / prependCard return client_id', () => {
    test('addCard returns the client_id of the staged entry [obligation]', () => {
      const list = makeList()
      const client_id = list.addCard()
      expect(typeof client_id).toBe('string')
      expect(client_id).toBe(list.temp_entries.value[0].client_id)
    })

    test('appendCard propagates the client_id returned by addCard [obligation]', () => {
      const list = makeList([makeCard({ id: 50 })])
      const client_id = list.appendCard(50)
      expect(typeof client_id).toBe('string')
      expect(client_id).toBe(list.temp_entries.value[0].client_id)
    })

    test('prependCard propagates the client_id returned by addCard [obligation]', () => {
      const list = makeList([makeCard({ id: 50 })])
      const client_id = list.prependCard(50)
      expect(typeof client_id).toBe('string')
      expect(client_id).toBe(list.temp_entries.value[0].client_id)
    })
  })

  describe('addCardAtTop', () => {
    test('anchors before the first persisted card (side=before) [obligation]', () => {
      const list = makeList([makeCard({ id: 100 }), makeCard({ id: 200 })])
      list.addCardAtTop()
      const entry = list.temp_entries.value[0]
      expect(entry.anchor_id).toBe(100)
      expect(entry.side).toBe('before')
    })

    test('uses anchor=null and side=null on an empty deck [obligation]', () => {
      const list = makeList()
      list.addCardAtTop()
      const entry = list.temp_entries.value[0]
      expect(entry.anchor_id).toBeNull()
      expect(entry.side).toBeNull()
    })

    test('unshifts so the new card renders at index 0 above any existing temps [obligation]', () => {
      const list = makeList([makeCard({ id: 100 })])
      const id1 = list.addCardAtTop()
      const id2 = list.addCardAtTop()
      // Newest (id2) should be at position 0, older (id1) at position 1
      expect(list.temp_entries.value[0].client_id).toBe(id2)
      expect(list.temp_entries.value[1].client_id).toBe(id1)
    })

    test('renders the new card at index 0 in all_cards [obligation]', () => {
      const list = makeList([makeCard({ id: 100 })])
      list.addCardAtTop()
      expect(list.all_cards.value[0].id).toBeLessThan(0)
      expect(list.all_cards.value[1].id).toBe(100)
    })

    test('returns the stable client_id of the staged card [obligation]', () => {
      const list = makeList([makeCard({ id: 100 })])
      const client_id = list.addCardAtTop()
      expect(typeof client_id).toBe('string')
      expect(client_id).toBe(list.temp_entries.value[0].client_id)
    })

    test('anchors before the first persisted card, not a previously-staged temp [obligation]', () => {
      // A temp id is negative and would raise on the server — the anchor must be real
      const list = makeList([makeCard({ id: 100 })])
      list.addCardAtTop() // stages a temp at position 0
      list.addCardAtTop() // second call — first persisted is still id=100
      const latest_entry = list.temp_entries.value[0]
      expect(latest_entry.anchor_id).toBe(100) // real id, not negative temp placeholder
    })
  })

  describe('all_cards merging', () => {
    test('places a side=after temp immediately after its left anchor', () => {
      const list = makeList([makeCard({ id: 100 }), makeCard({ id: 200 })])
      list.addCard(100)
      const ids = list.all_cards.value.map((c) => c.id)
      expect(ids).toEqual([100, list.all_cards.value[1].id, 200])
      expect(list.all_cards.value[1].id).toBeLessThan(0)
    })

    test('places a side=before temp immediately before its right anchor', () => {
      const list = makeList([makeCard({ id: 100 })])
      list.addCard(undefined, 100)
      const ids = list.all_cards.value.map((c) => c.id)
      expect(ids).toEqual([list.all_cards.value[0].id, 100])
      expect(list.all_cards.value[0].id).toBeLessThan(0)
    })

    test('appends a temp whose anchor is not in loaded pages (visual fallback)', () => {
      const list = makeList([makeCard({ id: 100 })])
      list.addCard(999)
      expect(list.all_cards.value.at(-1).id).toBeLessThan(0)
    })
  })

  describe('promoteTemp — temp → persisted handoff', () => {
    test('sets real_id and rewrites card.id/rank/values on the entry', () => {
      const list = makeList()
      list.addCard()
      const entry = list.temp_entries.value[0]
      const placeholder = entry.card.id
      list.promoteTemp(placeholder, 5001, 1500, { front_text: 'Q' })
      expect(entry.real_id).toBe(5001)
      expect(entry.card.id).toBe(5001)
      expect(entry.card.rank).toBe(1500)
      expect(entry.card.front_text).toBe('Q')
    })

    test('client_id stays stable across promote', () => {
      const list = makeList()
      list.addCard()
      const entry = list.temp_entries.value[0]
      const before = list.all_cards.value[0].client_id
      list.promoteTemp(entry.card.id, 5002, 1600, {})
      const after = list.all_cards.value[0].client_id
      expect(after).toBe(before)
    })

    test('seeds the persisted client_id Map so refetched copy reuses the same client_id', () => {
      const cards_query = {
        data: { value: { pages: [[]], pageParams: [0] } },
        hasNextPage: { value: false },
        isLoading: { value: false },
        loadNextPage: () => {}
      }
      const list = useVirtualCardList(cards_query, ref(10))
      list.addCard()
      const entry = list.temp_entries.value[0]
      const placeholder = entry.card.id
      const original_client_id = entry.client_id
      list.promoteTemp(placeholder, 7000, 2000, { front_text: 'X' })

      cards_query.data.value = {
        pages: [[makeCard({ id: 7000, front_text: 'X' })]],
        pageParams: [0]
      }

      const merged = list.all_cards.value
      const persisted_view = merged.find((c) => c.id === 7000)
      expect(persisted_view?.client_id).toBe(original_client_id)
    })

    test('once persisted refetch lands, the entry is filtered from all_cards (no duplicate id)', () => {
      const cards_query = {
        data: { value: { pages: [[]], pageParams: [0] } },
        hasNextPage: { value: false },
        isLoading: { value: false },
        loadNextPage: () => {}
      }
      const list = useVirtualCardList(cards_query, ref(10))
      list.addCard()
      const placeholder = list.temp_entries.value[0].card.id
      list.promoteTemp(placeholder, 7100, 2100, {})

      cards_query.data.value = {
        pages: [[makeCard({ id: 7100 })]],
        pageParams: [0]
      }

      const ids = list.all_cards.value.map((c) => c.id)
      expect(ids.filter((id) => id === 7100)).toHaveLength(1)
    })

    test('is a no-op when no matching entry exists', () => {
      const list = makeList()
      expect(() => list.promoteTemp(-999, 1, 0, {})).not.toThrow()
    })
  })

  describe('findEntryByCardId / findCard', () => {
    test('findEntryByCardId returns the entry for a temp placeholder id', () => {
      const list = makeList()
      list.addCard()
      const id = list.temp_entries.value[0].card.id
      expect(list.findEntryByCardId(id)?.card.id).toBe(id)
    })

    test('findEntryByCardId returns the entry for a promoted real id', () => {
      const list = makeList()
      list.addCard()
      const placeholder = list.temp_entries.value[0].card.id
      list.promoteTemp(placeholder, 8000, 100, {})
      expect(list.findEntryByCardId(8000)?.real_id).toBe(8000)
    })

    test('findEntryByCardId returns undefined for unknown ids', () => {
      const list = makeList()
      expect(list.findEntryByCardId(-42)).toBeUndefined()
    })

    test('findCard returns persisted cards', () => {
      const list = makeList([makeCard({ id: 100 })])
      expect(list.findCard(100)?.id).toBe(100)
    })

    test('findCard returns the underlying card for a temp placeholder id', () => {
      const list = makeList()
      list.addCard()
      const id = list.temp_entries.value[0].card.id
      expect(list.findCard(id)?.id).toBe(id)
    })

    test('findCard returns undefined when the id is not in the merged list', () => {
      const list = makeList([makeCard({ id: 1 })])
      expect(list.findCard(999)).toBeUndefined()
    })
  })
})
