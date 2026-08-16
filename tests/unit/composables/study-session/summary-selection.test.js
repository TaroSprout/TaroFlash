import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, nextTick } from 'vue'
import { useSummarySelection } from '@/views/study-session/composables/summary-selection'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// summary-selection.ts orchestrates useSummaryCardEdit + useSummaryCardActions
// (each unit-tested directly elsewhere) plus the real useCardSelection — only
// useSummaryCardActions is faked here, to observe what target cards it's
// invoked with without re-testing its own delete/move mechanics.

const { deleteCardsMock, moveCardsMock, emitSfxMock } = vi.hoisted(() => ({
  deleteCardsMock: vi.fn().mockResolvedValue(undefined),
  moveCardsMock: vi.fn().mockResolvedValue(undefined),
  emitSfxMock: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock
}))

vi.mock('@/views/study-session/composables/summary-card-actions', () => ({
  useSummaryCardActions: ({ onRemoved }) => ({
    deleteCards: (target) => deleteCardsMock(target, onRemoved),
    moveCards: (target) => moveCardsMock(target, onRemoved)
  })
}))

vi.mock('@/views/study-session/composables/summary-card-edit', () => ({
  useSummaryCardEdit: () => ({
    editing_card_id: ref(null),
    editing_card: ref(undefined),
    saving: ref(false),
    start: vi.fn(),
    stop: vi.fn(),
    update: vi.fn()
  })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 10, front_text: 'Q', back_text: 'A', state: 'passed', ...overrides }
}

function makeResult(overrides = {}) {
  return {
    card_id: 1,
    deck_id: 10,
    is_new: false,
    before_interval: 10,
    after_interval: 20,
    lapses: 0,
    passed: true,
    ...overrides
  }
}

function makeSetup({ cards = [], results = [], category = null, thresholdFor = () => 8 } = {}) {
  const cards_ref = ref(cards)
  const results_ref = ref(results)
  const category_ref = ref(category)
  const updateCard = vi.fn()
  const dropCard = vi.fn((id) => {
    cards_ref.value = cards_ref.value.filter((c) => c.id !== id)
  })
  const closeCategory = vi.fn(() => {
    category_ref.value = null
  })

  const result = useSummarySelection({
    cards: cards_ref,
    results: results_ref,
    category: category_ref,
    thresholdFor,
    updateCard,
    dropCard,
    closeCategory
  })

  return { result, cards_ref, results_ref, category_ref, updateCard, dropCard, closeCategory }
}

beforeEach(() => {
  deleteCardsMock.mockReset().mockResolvedValue(undefined)
  moveCardsMock.mockReset().mockResolvedValue(undefined)
  emitSfxMock.mockReset()
})

// ── category_cards resolution ────────────────────────────────────────────────

describe('useSummarySelection — category_cards [obligation]', () => {
  test('is empty when no category is open', () => {
    const { result } = makeSetup({ cards: [makeCard({ id: 1 })], results: [makeResult()] })
    expect(result.category_cards.value).toEqual([])
  })

  test('resolves to the cards backing the open category, non-correct category [obligation]', () => {
    const cards = [makeCard({ id: 5 }), makeCard({ id: 6 })]
    const results = [
      makeResult({ card_id: 5, is_new: true }),
      makeResult({ card_id: 6, is_new: true })
    ]
    const { result } = makeSetup({ cards, results, category: 'new' })

    expect(result.category_cards.value.map((c) => c.id)).toEqual([5, 6])
  })

  test('the "correct" category includes both the correct and incorrect groups [obligation]', () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    const results = [
      makeResult({ card_id: 1, passed: true }),
      makeResult({ card_id: 2, passed: false })
    ]
    const { result } = makeSetup({ cards, results, category: 'correct' })

    expect(result.category_cards.value.map((c) => c.id).sort()).toEqual([1, 2])
  })

  test('silently drops a result whose card is absent from the session cards [obligation]', () => {
    const cards = [makeCard({ id: 5 })]
    const results = [
      makeResult({ card_id: 5, is_new: true }),
      makeResult({ card_id: 999, is_new: true })
    ]
    const { result } = makeSetup({ cards, results, category: 'new' })

    expect(result.category_cards.value.map((c) => c.id)).toEqual([5])
  })
})

// ── selectAll — positive mode, no except_ids [obligation] ───────────────────

describe('useSummarySelection — selectAll [obligation]', () => {
  test('selects every currently loaded card on the open category page [obligation]', () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
    const results = cards.map((c) => makeResult({ card_id: c.id, is_new: true }))
    const { result } = makeSetup({ cards, results, category: 'new' })

    result.selectAll()

    expect(result.selection.selected_count.value).toBe(3)
    expect(result.selection.all_cards_selected.value).toBe(true)
  })

  test('does not switch into deck-wide select_all_mode — stays a positive id list [obligation]', () => {
    const cards = [makeCard({ id: 1 })]
    const results = [makeResult({ card_id: 1, is_new: true })]
    const { result } = makeSetup({ cards, results, category: 'new' })

    result.selectAll()

    expect(result.selection.select_all_mode.value).toBe(false)
    expect(result.selection.selected_card_ids.value).toEqual([1])
  })
})

// ── bulk delete/move resolve the selected cards from category_cards ─────────

describe('useSummarySelection — onDeleteSelected / onMoveSelected [obligation]', () => {
  test('onDeleteSelected passes only the selected cards to deleteCards [obligation]', async () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    const results = cards.map((c) => makeResult({ card_id: c.id, is_new: true }))
    const { result } = makeSetup({ cards, results, category: 'new' })

    result.selection.selectCard(2)
    await result.onDeleteSelected()

    expect(deleteCardsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 2 })],
      expect.any(Function)
    )
  })

  test('onMoveSelected passes only the selected cards to moveCards [obligation]', async () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    const results = cards.map((c) => makeResult({ card_id: c.id, is_new: true }))
    const { result } = makeSetup({ cards, results, category: 'new' })

    result.selection.selectCard(1)
    await result.onMoveSelected()

    expect(moveCardsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 1 })],
      expect.any(Function)
    )
  })
})

// ── per-card delete/move (⋯ menu) [obligation] ───────────────────────────────

describe('useSummarySelection — onDeleteCard / onMoveCard [obligation]', () => {
  test('onDeleteCard(id) resolves the card from category_cards and deletes just it [obligation]', async () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    const results = cards.map((c) => makeResult({ card_id: c.id, is_new: true }))
    const { result } = makeSetup({ cards, results, category: 'new' })

    await result.onDeleteCard(2)

    expect(deleteCardsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 2 })],
      expect.any(Function)
    )
  })

  test('onDeleteCard(id) is a no-op for an id not on the open category page [obligation]', async () => {
    const cards = [makeCard({ id: 1 })]
    const results = [makeResult({ card_id: 1, is_new: true })]
    const { result } = makeSetup({ cards, results, category: 'new' })

    await result.onDeleteCard(999)

    expect(deleteCardsMock).not.toHaveBeenCalled()
  })

  test('onMoveCard(id) resolves the card from category_cards and moves just it [obligation]', async () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    const results = cards.map((c) => makeResult({ card_id: c.id, is_new: true }))
    const { result } = makeSetup({ cards, results, category: 'new' })

    await result.onMoveCard(1)

    expect(moveCardsMock).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 1 })],
      expect.any(Function)
    )
  })
})

// ── onRemoved: deselects + drops from the session [obligation] ──────────────

describe('useSummarySelection — the shared onRemoved seam [obligation]', () => {
  test('a card removed via bulk delete is deselected and dropped from the session [obligation]', async () => {
    deleteCardsMock.mockImplementationOnce((_target, onRemoved) => onRemoved(2))
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
    const results = cards.map((c) => makeResult({ card_id: c.id, is_new: true }))
    const { result, dropCard } = makeSetup({ cards, results, category: 'new' })

    result.selection.selectCard(2)
    await result.onDeleteSelected()

    expect(dropCard).toHaveBeenCalledWith(2)
    expect(result.selection.isCardSelected(2)).toBe(false)
  })
})

// ── onSelectCard: the single selection-entry seam [obligation] ──────────────
// Mirrors deck-view's actions.ts onSelectCard — both entering selection and
// the sfx live here, centrally, so every entry point (card tap, item-options
// "select") gets the same behaviour for free.

describe('useSummarySelection — onSelectCard [obligation]', () => {
  test('toggles the given card id and enters selection mode [obligation]', () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    const results = cards.map((c) => makeResult({ card_id: c.id, is_new: true }))
    const { result } = makeSetup({ cards, results, category: 'new' })

    result.onSelectCard(1)

    expect(result.selection.is_selecting.value).toBe(true)
    expect(result.selection.isCardSelected(1)).toBe(true)
  })

  test('emits the select sfx [obligation]', () => {
    const cards = [makeCard({ id: 1 })]
    const results = [makeResult({ card_id: 1, is_new: true })]
    const { result } = makeSetup({ cards, results, category: 'new' })

    result.onSelectCard(1)

    expect(emitSfxMock).toHaveBeenCalledWith('ui.select')
  })

  test('enters selection mode without toggling any card when id is omitted [obligation]', () => {
    const cards = [makeCard({ id: 1 })]
    const results = [makeResult({ card_id: 1, is_new: true })]
    const { result } = makeSetup({ cards, results, category: 'new' })

    result.onSelectCard()

    expect(result.selection.is_selecting.value).toBe(true)
    expect(result.selection.selected_count.value).toBe(0)
    expect(emitSfxMock).toHaveBeenCalledWith('ui.select')
  })
})

// ── leaving the category exits selection + editing [obligation] ─────────────

describe('useSummarySelection — leaving the category resets state [obligation]', () => {
  test('changing category exits selection mode and clears the selection [obligation]', async () => {
    const cards = [makeCard({ id: 1 })]
    const results = [makeResult({ card_id: 1, is_new: true })]
    const { result, category_ref } = makeSetup({ cards, results, category: 'new' })

    result.selection.enterSelection()
    result.selection.selectCard(1)
    expect(result.selection.is_selecting.value).toBe(true)

    category_ref.value = 'stuck'
    await nextTick()

    expect(result.selection.is_selecting.value).toBe(false)
    expect(result.selection.selected_count.value).toBe(0)
  })
})

// ── auto-close when the open category empties out [obligation] ──────────────

describe('useSummarySelection — auto-close on an emptied category [obligation]', () => {
  test('calls closeCategory once the last card leaves the open category [obligation]', async () => {
    deleteCardsMock.mockImplementationOnce((_target, onRemoved) => onRemoved(1))
    const cards = [makeCard({ id: 1 })]
    const results = [makeResult({ card_id: 1, is_new: true })]
    const { result, closeCategory } = makeSetup({ cards, results, category: 'new' })

    await result.onDeleteCard(1)
    await nextTick()

    expect(closeCategory).toHaveBeenCalledOnce()
  })

  test('does NOT call closeCategory while cards remain on the page [obligation]', async () => {
    deleteCardsMock.mockImplementationOnce((_target, onRemoved) => onRemoved(1))
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    const results = cards.map((c) => makeResult({ card_id: c.id, is_new: true }))
    const { result, closeCategory } = makeSetup({ cards, results, category: 'new' })

    await result.onDeleteCard(1)
    await nextTick()

    expect(closeCategory).not.toHaveBeenCalled()
  })

  test('calls closeCategory once the last card is moved off the open category [obligation]', async () => {
    moveCardsMock.mockImplementationOnce((_target, onRemoved) => onRemoved(1))
    const cards = [makeCard({ id: 1 })]
    const results = [makeResult({ card_id: 1, is_new: true })]
    const { result, closeCategory } = makeSetup({ cards, results, category: 'new' })

    await result.onMoveCard(1)
    await nextTick()

    expect(closeCategory).toHaveBeenCalledOnce()
  })
})
