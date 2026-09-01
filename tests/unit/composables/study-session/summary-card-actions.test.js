import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { useSummaryCardActions } from '@/views/study-session/composables/summary-card-actions'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { confirmDeleteMock, openMoveModalMock, deleteCardsMock, moveCardsMock } = vi.hoisted(() => ({
  confirmDeleteMock: vi.fn(),
  openMoveModalMock: vi.fn(),
  deleteCardsMock: vi.fn().mockResolvedValue(undefined),
  moveCardsMock: vi.fn().mockResolvedValue(undefined)
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))
vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => mockNotice
}))
vi.mock('@/composables/card', () => ({
  useCardMutations: () => ({
    deleteCards: deleteCardsMock,
    moveCards: moveCardsMock,
    saveCard: vi.fn(),
    insertCard: vi.fn(),
    setCardImage: vi.fn(),
    deleteCardImage: vi.fn()
  }),
  useCardPrompts: () => ({
    confirmDelete: confirmDeleteMock,
    openMoveModal: openMoveModalMock
  })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 10, front_text: 'Q', back_text: 'A', state: 'passed', ...overrides }
}

function makeSetup() {
  const onRemoved = vi.fn()
  const result = useSummaryCardActions({ onRemoved })
  return { result, onRemoved }
}

beforeEach(() => {
  confirmDeleteMock.mockReset()
  openMoveModalMock.mockReset()
  deleteCardsMock.mockReset().mockResolvedValue(undefined)
  moveCardsMock.mockReset().mockResolvedValue(undefined)
  mockNotice.error.mockReset()
})

// ── deleteCards ───────────────────────────────────────────────────────────────

describe('useSummaryCardActions — deleteCards', () => {
  test('is a no-op for an empty list', async () => {
    const { result, onRemoved } = makeSetup()

    await result.deleteCards([])

    expect(confirmDeleteMock).not.toHaveBeenCalled()
    expect(deleteCardsMock).not.toHaveBeenCalled()
    expect(onRemoved).not.toHaveBeenCalled()
  })

  test('calls confirmDelete with the target count', async () => {
    confirmDeleteMock.mockResolvedValueOnce(true)
    const { result } = makeSetup()

    await result.deleteCards([makeCard({ id: 1 }), makeCard({ id: 2 })])

    expect(confirmDeleteMock).toHaveBeenCalledWith(2)
  })

  test('does NOT delete or call onRemoved when confirm is dismissed', async () => {
    confirmDeleteMock.mockResolvedValueOnce(false)
    const { result, onRemoved } = makeSetup()

    await result.deleteCards([makeCard({ id: 1 })])

    expect(deleteCardsMock).not.toHaveBeenCalled()
    expect(onRemoved).not.toHaveBeenCalled()
  })

  test('calls deleteCards({ cards: target }) with the full target list on confirm', async () => {
    confirmDeleteMock.mockResolvedValueOnce(true)
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 })]
    const { result } = makeSetup()

    await result.deleteCards(cards)

    expect(deleteCardsMock).toHaveBeenCalledWith({ cards })
  })

  test('calls onRemoved for every deleted card id on success', async () => {
    confirmDeleteMock.mockResolvedValueOnce(true)
    const { result, onRemoved } = makeSetup()

    await result.deleteCards([makeCard({ id: 1 }), makeCard({ id: 2 })])

    expect(onRemoved).toHaveBeenCalledWith(1)
    expect(onRemoved).toHaveBeenCalledWith(2)
    expect(onRemoved).toHaveBeenCalledTimes(2)
  })

  test('shows an error notice and does NOT call onRemoved when deleteCards rejects', async () => {
    confirmDeleteMock.mockResolvedValueOnce(true)
    deleteCardsMock.mockRejectedValueOnce(new Error('boom'))
    const { result, onRemoved } = makeSetup()

    await result.deleteCards([makeCard({ id: 1 })])

    expect(mockNotice.error).toHaveBeenCalledWith('toast.error.delete-cards-failed')
    expect(onRemoved).not.toHaveBeenCalled()
  })
})

// ── moveCards ─────────────────────────────────────────────────────────────────

describe('useSummaryCardActions — moveCards', () => {
  test('is a no-op for an empty list', async () => {
    const { result, onRemoved } = makeSetup()

    await result.moveCards([])

    expect(openMoveModalMock).not.toHaveBeenCalled()
    expect(onRemoved).not.toHaveBeenCalled()
  })

  test('opens the modal with a single current_deck_id when every card shares one deck', async () => {
    openMoveModalMock.mockResolvedValueOnce(undefined)
    const cards = [makeCard({ id: 1, deck_id: 10 }), makeCard({ id: 2, deck_id: 10 })]
    const { result } = makeSetup()

    await result.moveCards(cards)

    expect(openMoveModalMock).toHaveBeenCalledWith(cards, 2, 10, expect.any(Function))
  })

  test('opens the modal with current_deck_id undefined for a mixed-deck selection', async () => {
    openMoveModalMock.mockResolvedValueOnce(undefined)
    const cards = [makeCard({ id: 1, deck_id: 10 }), makeCard({ id: 2, deck_id: 20 })]
    const { result } = makeSetup()

    await result.moveCards(cards)

    expect(openMoveModalMock).toHaveBeenCalledWith(cards, 2, undefined, expect.any(Function))
  })

  test('does NOT call onRemoved when the modal is dismissed', async () => {
    openMoveModalMock.mockResolvedValueOnce(undefined)
    const { result, onRemoved } = makeSetup()

    await result.moveCards([makeCard({ id: 1 })])

    expect(onRemoved).not.toHaveBeenCalled()
  })

  test('the move closure calls moveCards with target_deck_id, card_ids, and every distinct source deck id', async () => {
    openMoveModalMock.mockImplementationOnce(async (_cards, _count, _current, move) => {
      await move(99)
      return { deck_id: 99 }
    })
    const cards = [makeCard({ id: 1, deck_id: 10 }), makeCard({ id: 2, deck_id: 20 })]
    const { result } = makeSetup()

    await result.moveCards(cards)

    expect(moveCardsMock).toHaveBeenCalledWith({
      target_deck_id: 99,
      card_ids: [1, 2],
      source_deck_ids: [10, 20]
    })
  })

  test('calls onRemoved only for cards that actually left their deck — a card already in the target deck is left untouched', async () => {
    openMoveModalMock.mockResolvedValueOnce({ deck_id: 20 })
    const already_home = makeCard({ id: 1, deck_id: 20 })
    const moving = makeCard({ id: 2, deck_id: 10 })
    const { result, onRemoved } = makeSetup()

    await result.moveCards([already_home, moving])

    expect(onRemoved).toHaveBeenCalledWith(2)
    expect(onRemoved).not.toHaveBeenCalledWith(1)
    expect(onRemoved).toHaveBeenCalledTimes(1)
  })

  test('the move closure passed to openMoveModal lets a rejected mutation propagate', async () => {
    openMoveModalMock.mockResolvedValueOnce(undefined)
    moveCardsMock.mockRejectedValueOnce(new Error('boom'))
    const { result } = makeSetup()

    await result.moveCards([makeCard({ id: 1, deck_id: 10 })])

    const move = openMoveModalMock.mock.calls[0][3]
    await expect(move(99)).rejects.toThrow('boom')
  })
})
