import { describe, test, expect } from 'vite-plus/test'
import { card } from '@tests/fixtures/card'

import { useCardSelection } from '@/composables/card/selection'

function makeSelection(ids = []) {
  return useCardSelection(ids.length)
}

function makeCard(overrides = {}) {
  return card.one({ overrides })
}

describe('useCardSelection', () => {
  // ── initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    test('starts with empty selection and not in select-all mode', () => {
      const sel = makeSelection([])
      expect(sel.selected_card_ids.value).toEqual([])
      expect(sel.deselected_ids.value).toEqual([])
      expect(sel.select_all_mode.value).toBe(false)
      expect(sel.selected_count.value).toBe(0)
    })

    test('total_card_count tracks the supplied total', () => {
      const sel = makeSelection([1, 2, 3, 4])
      expect(sel.total_card_count.value).toBe(4)
    })

    test('total_card_count is 0 when the supplied total is undefined', () => {
      const sel = useCardSelection(undefined)
      expect(sel.total_card_count.value).toBe(0)
    })
  })

  // ── positive-selection mode ──────────────────────────────────────────────

  describe('positive selection', () => {
    test('selectCard adds an id once (no duplicates)', () => {
      const sel = makeSelection([1])
      sel.selectCard(1)
      sel.selectCard(1)
      expect(sel.selected_card_ids.value).toEqual([1])
    })

    test('deselectCard removes an id', () => {
      const sel = makeSelection([1, 2])
      sel.selectCard(1)
      sel.selectCard(2)
      sel.deselectCard(1)
      expect(sel.selected_card_ids.value).toEqual([2])
    })

    test('deselectCard is a no-op for an id not in the selection', () => {
      const sel = makeSelection([1])
      sel.deselectCard(99)
      expect(sel.selected_card_ids.value).toEqual([])
    })

    test('toggleSelectCard flips selection state', () => {
      const sel = makeSelection([1])
      sel.toggleSelectCard(1)
      expect(sel.isCardSelected(1)).toBe(true)
      sel.toggleSelectCard(1)
      expect(sel.isCardSelected(1)).toBe(false)
    })

    test('isCardSelected mirrors the positive list', () => {
      const sel = makeSelection([1, 2])
      sel.selectCard(1)
      expect(sel.isCardSelected(1)).toBe(true)
      expect(sel.isCardSelected(2)).toBe(false)
    })

    test('selected_count tracks the positive list length', () => {
      const sel = makeSelection([1, 2])
      sel.selectCard(1)
      sel.selectCard(2)
      expect(sel.selected_count.value).toBe(2)
    })

    test('all_cards_selected is true when the positive list matches the deck total', () => {
      const sel = makeSelection([1, 2])
      expect(sel.all_cards_selected.value).toBe(false)
      sel.selectCard(1)
      sel.selectCard(2)
      expect(sel.all_cards_selected.value).toBe(true)
    })

    test('all_cards_selected is false when the deck is empty (no vacuous true)', () => {
      const sel = makeSelection([])
      expect(sel.all_cards_selected.value).toBe(false)
    })
  })

  // ── select-all mode (A2) ─────────────────────────────────────────────────

  describe('select-all mode', () => {
    test('selectAllCards flips into select-all mode and clears the positive list', () => {
      const sel = makeSelection([1])
      sel.selectCard(1)
      sel.selectAllCards()
      expect(sel.select_all_mode.value).toBe(true)
      expect(sel.selected_card_ids.value).toEqual([])
    })

    test('isCardSelected is true for every id except those deselected', () => {
      const sel = makeSelection([1, 2])
      sel.selectAllCards()
      sel.deselectCard(1)
      expect(sel.isCardSelected(1)).toBe(false)
      expect(sel.isCardSelected(2)).toBe(true)
    })

    test('deselectCard accumulates ids once in the deselected list', () => {
      const sel = makeSelection([1, 2])
      sel.selectAllCards()
      sel.deselectCard(1)
      sel.deselectCard(1)
      expect(sel.deselected_ids.value).toEqual([1])
    })

    test('selectCard in select-all mode removes the id from the deselected list', () => {
      const sel = makeSelection([1])
      sel.selectAllCards()
      sel.deselectCard(1)
      sel.selectCard(1)
      expect(sel.deselected_ids.value).toEqual([])
    })

    test('selectCard in select-all mode is a no-op when the id is not in the deselected list', () => {
      const sel = makeSelection([1, 2])
      sel.selectAllCards()
      sel.deselectCard(1)
      sel.selectCard(2)
      expect(sel.deselected_ids.value).toEqual([1])
      expect(sel.selected_card_ids.value).toEqual([])
    })

    test('selected_count = total - deselected in select-all mode', () => {
      const sel = makeSelection([1, 2, 3])
      sel.selectAllCards()
      expect(sel.selected_count.value).toBe(3)
      sel.deselectCard(2)
      expect(sel.selected_count.value).toBe(2)
    })

    test('selected_count is clamped to zero if deselected exceeds total (defensive)', () => {
      const sel = makeSelection([1])
      sel.selectAllCards()
      sel.deselectCard(1)
      sel.deselectCard(99)
      expect(sel.selected_count.value).toBe(0)
    })

    test('all_cards_selected is true iff nothing has been deselected', () => {
      const sel = makeSelection([1, 2])
      sel.selectAllCards()
      expect(sel.all_cards_selected.value).toBe(true)
      sel.deselectCard(1)
      expect(sel.all_cards_selected.value).toBe(false)
    })

    test('clearSelectedCards exits select-all mode and empties both lists', () => {
      const sel = makeSelection([1])
      sel.selectAllCards()
      sel.deselectCard(1)
      sel.clearSelectedCards()
      expect(sel.select_all_mode.value).toBe(false)
      expect(sel.deselected_ids.value).toEqual([])
      expect(sel.selected_card_ids.value).toEqual([])
    })

    test('toggleSelectAll enters select-all when nothing is selected', () => {
      const sel = makeSelection([1, 2])
      sel.toggleSelectAll()
      expect(sel.select_all_mode.value).toBe(true)
    })

    test('toggleSelectAll exits when everything is already selected', () => {
      const sel = makeSelection([1])
      sel.toggleSelectAll() // enter select-all
      sel.toggleSelectAll() // back out
      expect(sel.select_all_mode.value).toBe(false)
      expect(sel.selected_card_ids.value).toEqual([])
    })
  })

  // ── filterSelected — the cross-cutting join with list data ───────────────

  describe('filterSelected', () => {
    test('returns only cards whose id is currently selected (positive mode)', () => {
      const cards = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
      const sel = makeSelection([1, 2, 3])
      sel.selectCard(1)
      sel.selectCard(3)
      expect(sel.filterSelected(cards).map((c) => c.id)).toEqual([1, 3])
    })

    test('returns all cards except deselected ids in select-all mode', () => {
      const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
      const sel = makeSelection([1, 2])
      sel.selectAllCards()
      sel.deselectCard(2)
      expect(sel.filterSelected(cards).map((c) => c.id)).toEqual([1])
    })

    test('skips cards with undefined id (defensive)', () => {
      const cards = [{ id: undefined }, makeCard({ id: 1 })]
      const sel = makeSelection([1])
      sel.selectCard(1)
      expect(sel.filterSelected(cards).map((c) => c.id)).toEqual([1])
    })
  })
})
