import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { useActiveCardActions } from '@/components/study-session/composables/card-actions'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { confirmDeleteMock, openMoveModalMock, deleteCardsMock, moveCardsMock } = vi.hoisted(() => ({
  confirmDeleteMock: vi.fn(),
  openMoveModalMock: vi.fn(),
  deleteCardsMock: vi.fn().mockResolvedValue(undefined),
  moveCardsMock: vi.fn().mockResolvedValue(undefined)
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
  return { id: 1, deck_id: 10, front_text: 'Q', back_text: 'A', state: 'unreviewed', ...overrides }
}

function makeSetup({ card = makeCard(), deck_id = 10 } = {}) {
  const active_card = ref(card ? card : undefined)
  const onRemoved = vi.fn()
  const result = useActiveCardActions({
    active_card,
    deck_id: () => deck_id,
    onRemoved
  })
  return { result, active_card, onRemoved }
}

beforeEach(() => {
  confirmDeleteMock.mockReset()
  openMoveModalMock.mockReset()
  deleteCardsMock.mockReset().mockResolvedValue(undefined)
  moveCardsMock.mockReset().mockResolvedValue(undefined)
})

// ── onDelete ──────────────────────────────────────────────────────────────────

describe('useActiveCardActions — onDelete', () => {
  test('is a no-op when active_card is undefined [obligation]', async () => {
    const active_card = ref(undefined)
    const onRemoved = vi.fn()
    const { onDelete } = useActiveCardActions({ active_card, deck_id: () => 10, onRemoved })

    await onDelete()

    expect(confirmDeleteMock).not.toHaveBeenCalled()
    expect(deleteCardsMock).not.toHaveBeenCalled()
    expect(onRemoved).not.toHaveBeenCalled()
  })

  test('does NOT call deleteCards when confirm is dismissed [obligation]', async () => {
    confirmDeleteMock.mockResolvedValueOnce(false)
    const { result } = makeSetup()

    await result.onDelete()

    expect(deleteCardsMock).not.toHaveBeenCalled()
  })

  test('does NOT call onRemoved when confirm is dismissed [obligation]', async () => {
    confirmDeleteMock.mockResolvedValueOnce(false)
    const { result, onRemoved } = makeSetup()

    await result.onDelete()

    expect(onRemoved).not.toHaveBeenCalled()
  })

  test('calls deleteCards({ cards: [card] }) on confirm [obligation]', async () => {
    confirmDeleteMock.mockResolvedValueOnce(true)
    const card = makeCard({ id: 42 })
    const { result } = makeSetup({ card })

    await result.onDelete()

    expect(deleteCardsMock).toHaveBeenCalledWith({ cards: [expect.objectContaining({ id: 42 })] })
  })

  test('calls onRemoved(card.id) after successful delete [obligation]', async () => {
    confirmDeleteMock.mockResolvedValueOnce(true)
    const card = makeCard({ id: 42 })
    const { result, onRemoved } = makeSetup({ card })

    await result.onDelete()

    expect(onRemoved).toHaveBeenCalledWith(42)
  })

  test('calls confirmDelete with count=1', async () => {
    confirmDeleteMock.mockResolvedValueOnce(true)
    const { result } = makeSetup()

    await result.onDelete()

    expect(confirmDeleteMock).toHaveBeenCalledWith(1)
  })
})

// ── onMove ────────────────────────────────────────────────────────────────────

describe('useActiveCardActions — onMove', () => {
  test('is a no-op when active_card is undefined [obligation]', async () => {
    const active_card = ref(undefined)
    const onRemoved = vi.fn()
    const { onMove } = useActiveCardActions({ active_card, deck_id: () => 10, onRemoved })

    await onMove()

    expect(openMoveModalMock).not.toHaveBeenCalled()
    expect(moveCardsMock).not.toHaveBeenCalled()
    expect(onRemoved).not.toHaveBeenCalled()
  })

  test('does NOT call moveCards when modal is dismissed (resolves undefined) [obligation]', async () => {
    openMoveModalMock.mockResolvedValueOnce(undefined)
    const { result } = makeSetup()

    await result.onMove()

    expect(moveCardsMock).not.toHaveBeenCalled()
  })

  test('does NOT call onRemoved when modal is dismissed [obligation]', async () => {
    openMoveModalMock.mockResolvedValueOnce(undefined)
    const { result, onRemoved } = makeSetup()

    await result.onMove()

    expect(onRemoved).not.toHaveBeenCalled()
  })

  test('calls moveCards with target_deck_id, card_ids, source_deck_ids on confirm [obligation]', async () => {
    openMoveModalMock.mockResolvedValueOnce({ deck_id: 99 })
    const card = makeCard({ id: 7 })
    const { result } = makeSetup({ card, deck_id: 10 })

    await result.onMove()

    expect(moveCardsMock).toHaveBeenCalledWith({
      target_deck_id: 99,
      card_ids: [7],
      source_deck_ids: [10]
    })
  })

  test('calls onRemoved(card.id) after successful move [obligation]', async () => {
    openMoveModalMock.mockResolvedValueOnce({ deck_id: 99 })
    const card = makeCard({ id: 7 })
    const { result, onRemoved } = makeSetup({ card })

    await result.onMove()

    expect(onRemoved).toHaveBeenCalledWith(7)
  })

  test('opens modal with [card], count=1, and current deck_id', async () => {
    openMoveModalMock.mockResolvedValueOnce(undefined)
    const card = makeCard({ id: 7 })
    const { result } = makeSetup({ card, deck_id: 10 })

    await result.onMove()

    expect(openMoveModalMock).toHaveBeenCalledWith([expect.objectContaining({ id: 7 })], 1, 10)
  })
})
