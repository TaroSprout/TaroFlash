import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { useSummaryCardEdit } from '@/views/study-session/composables/summary-card-edit'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { saveCardMock, capturedDeckIdGetter } = vi.hoisted(() => ({
  saveCardMock: vi.fn().mockResolvedValue(undefined),
  capturedDeckIdGetter: { current: null }
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('@/composables/card', () => ({
  useCardMutations: (deck_id) => {
    capturedDeckIdGetter.current = deck_id
    return {
      saveCard: saveCardMock,
      insertCard: vi.fn(),
      deleteCards: vi.fn(),
      moveCards: vi.fn(),
      setCardImage: vi.fn(),
      deleteCardImage: vi.fn()
    }
  }
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => mockNotice
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 10, front_text: 'Q', back_text: 'A', state: 'unreviewed', ...overrides }
}

function makeSetup(cards = [makeCard()], updateCard = vi.fn()) {
  const cards_ref = ref(cards)
  const result = useSummaryCardEdit(cards_ref, updateCard)
  return { result, cards_ref, updateCard }
}

beforeEach(() => {
  saveCardMock.mockReset().mockResolvedValue(undefined)
  mockNotice.error.mockReset()
  capturedDeckIdGetter.current = null
})

// ── editing_card_id / editing_card ───────────────────────────────────────────

describe('useSummaryCardEdit — editing_card_id / editing_card', () => {
  test('editing_card_id starts null and editing_card is undefined', () => {
    const { result } = makeSetup()
    expect(result.editing_card_id.value).toBeNull()
    expect(result.editing_card.value).toBeUndefined()
  })

  test('start(id) sets editing_card_id and resolves editing_card from the cards list', () => {
    const card = makeCard({ id: 42 })
    const { result } = makeSetup([card])

    result.start(42)

    expect(result.editing_card_id.value).toBe(42)
    expect(result.editing_card.value).toEqual(card)
  })

  test('start(id) for an id not in the list resolves editing_card to undefined [obligation]', () => {
    const { result } = makeSetup([makeCard({ id: 1 })])

    result.start(999)

    expect(result.editing_card.value).toBeUndefined()
  })

  test('stop() resets editing_card_id to null', () => {
    const { result } = makeSetup([makeCard({ id: 42 })])
    result.start(42)

    result.stop()

    expect(result.editing_card_id.value).toBeNull()
    expect(result.editing_card.value).toBeUndefined()
  })

  test('editing_card tracks the cards list reactively — a card dropped from the list resolves to undefined [obligation]', () => {
    const { result, cards_ref } = makeSetup([makeCard({ id: 42 })])
    result.start(42)
    expect(result.editing_card.value).toBeDefined()

    cards_ref.value = []

    expect(result.editing_card.value).toBeUndefined()
  })
})

// ── useCardMutations deck_id getter reads the editing card's OWN deck_id ────

describe('useSummaryCardEdit — mutations deck_id getter [obligation]', () => {
  test('the deck_id getter passed to useCardMutations reads the currently-editing card own deck_id [obligation]', () => {
    const { result } = makeSetup([makeCard({ id: 42, deck_id: 77 })])
    result.start(42)

    expect(capturedDeckIdGetter.current()).toBe(77)
  })

  test('the deck_id getter resolves undefined when nothing is being edited', () => {
    makeSetup([makeCard({ id: 42, deck_id: 77 })])

    expect(capturedDeckIdGetter.current()).toBeUndefined()
  })
})

// ── update() ──────────────────────────────────────────────────────────────────

describe('useSummaryCardEdit — update() [obligation]', () => {
  test('is a no-op when nothing is being edited', async () => {
    const { result } = makeSetup()

    await result.update('front', 'noop')

    expect(saveCardMock).not.toHaveBeenCalled()
  })

  test('update(front, text) calls saveCard with front_text and patches via updateCard [obligation]', async () => {
    const card = makeCard({ id: 42 })
    const { result, updateCard } = makeSetup([card])
    result.start(42)

    await result.update('front', 'Hello')

    expect(saveCardMock).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), {
      front_text: 'Hello'
    })
    expect(updateCard).toHaveBeenCalledWith(42, { front_text: 'Hello' })
  })

  test('update(back, text) calls saveCard with back_text [obligation]', async () => {
    const card = makeCard({ id: 42 })
    const { result, updateCard } = makeSetup([card])
    result.start(42)

    await result.update('back', 'World')

    expect(updateCard).toHaveBeenCalledWith(42, { back_text: 'World' })
  })

  test('saving is true during the await and false after [obligation]', async () => {
    let resolve
    saveCardMock.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    const { result } = makeSetup([makeCard({ id: 42 })])
    result.start(42)

    const update_promise = result.update('front', 'x')
    expect(result.saving.value).toBe(true)

    resolve()
    await update_promise
    expect(result.saving.value).toBe(false)
  })

  test('shows an error notice and resets saving on a rejected save [obligation]', async () => {
    saveCardMock.mockRejectedValueOnce(new Error('boom'))
    const { result, updateCard } = makeSetup([makeCard({ id: 42 })])
    result.start(42)

    await result.update('front', 'x')

    expect(mockNotice.error).toHaveBeenCalledWith('toast.error.card-save-failed')
    expect(result.saving.value).toBe(false)
    expect(updateCard).not.toHaveBeenCalled()
  })
})
