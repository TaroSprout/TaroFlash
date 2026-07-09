import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, nextTick } from 'vue'
import { useCardEdit } from '@/views/study-session/composables/card-edit'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { saveCardMock } = vi.hoisted(() => ({
  saveCardMock: vi.fn().mockResolvedValue(undefined)
}))

const { mockNotice } = vi.hoisted(() => ({
  mockNotice: { error: vi.fn(), success: vi.fn(), warn: vi.fn() }
}))

vi.mock('@/composables/card/mutations', () => ({
  useCardMutations: () => ({
    saveCard: saveCardMock,
    insertCard: vi.fn(),
    deleteCards: vi.fn(),
    moveCards: vi.fn(),
    setCardImage: vi.fn(),
    deleteCardImage: vi.fn()
  })
}))

vi.mock('@/stores/notice-store', () => ({
  useNoticeStore: () => mockNotice
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 10, front_text: 'Q', back_text: 'A', ...overrides }
}

function makeSetup({ card = makeCard(), deck_id = () => 10, updateCard = vi.fn() } = {}) {
  const active_card = ref(card ? { ...card, state: 'unreviewed', preview: undefined } : undefined)
  const result = useCardEdit(active_card, deck_id, updateCard)
  return { result, active_card, updateCard }
}

beforeEach(() => {
  saveCardMock.mockReset().mockResolvedValue(undefined)
  mockNotice.error.mockReset()
})

// ── editing flag ──────────────────────────────────────────────────────────────

describe('useCardEdit — editing flag', () => {
  test('editing is false initially', () => {
    const { result } = makeSetup()
    expect(result.editing.value).toBe(false)
  })

  test('start() sets editing to true when active card exists', () => {
    const { result } = makeSetup()
    result.start()
    expect(result.editing.value).toBe(true)
  })

  test('start() is a no-op when active_card is undefined', () => {
    const active_card = ref(undefined)
    const result = useCardEdit(active_card, () => 10, vi.fn())
    result.start()
    expect(result.editing.value).toBe(false)
  })

  test('stop() sets editing to false', () => {
    const { result } = makeSetup()
    result.start()
    result.stop()
    expect(result.editing.value).toBe(false)
  })
})

// ── editing resets on card change ─────────────────────────────────────────────

describe('useCardEdit — editing resets when active card id changes [obligation]', () => {
  test('editing resets to false when active_card.id changes [obligation]', async () => {
    const { result, active_card } = makeSetup()
    result.start()
    expect(result.editing.value).toBe(true)

    // Swap to a different card (id changes)
    active_card.value = { ...makeCard({ id: 2 }), state: 'unreviewed', preview: undefined }
    await nextTick()

    expect(result.editing.value).toBe(false)
  })

  test('editing stays true if card content changes but id stays the same', async () => {
    const { result, active_card } = makeSetup()
    result.start()

    active_card.value = {
      ...makeCard({ id: 1, front_text: 'Updated' }),
      state: 'unreviewed',
      preview: undefined
    }
    await nextTick()

    expect(result.editing.value).toBe(true)
  })
})

// ── saving flag ───────────────────────────────────────────────────────────────

describe('useCardEdit — saving flag [obligation]', () => {
  test('saving is false initially', () => {
    const { result } = makeSetup()
    expect(result.saving.value).toBe(false)
  })

  test('saving is true during the await [obligation]', async () => {
    let resolve
    saveCardMock.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    const { result } = makeSetup()

    const updatePromise = result.update('front', 'New text')
    expect(result.saving.value).toBe(true)

    resolve()
    await updatePromise
    expect(result.saving.value).toBe(false)
  })

  test('saving is false after update resolves [obligation]', async () => {
    const { result } = makeSetup()
    await result.update('front', 'New text')
    expect(result.saving.value).toBe(false)
  })

  test('saving resets to false after a failed save (finally), instead of getting stuck [obligation]', async () => {
    saveCardMock.mockRejectedValueOnce(new Error('boom'))
    const { result } = makeSetup()

    await result.update('front', 'New text')

    expect(result.saving.value).toBe(false)
  })

  test('shows an error notice when saveCard rejects [obligation]', async () => {
    saveCardMock.mockRejectedValueOnce(new Error('boom'))
    const { result } = makeSetup()

    await result.update('front', 'New text')

    expect(mockNotice.error).toHaveBeenCalledWith('toast.error.card-save-failed')
  })
})

// ── update() routes through useCardMutations.saveCard ─────────────────────────

describe('useCardEdit — update() calls saveCard [obligation]', () => {
  test('update(front, text) calls saveCard with front_text [obligation]', async () => {
    const card = makeCard({ id: 42 })
    const { result } = makeSetup({ card, deck_id: () => 10 })

    await result.update('front', 'Hello')

    expect(saveCardMock).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), {
      front_text: 'Hello'
    })
  })

  test('update(back, text) calls saveCard with back_text [obligation]', async () => {
    const card = makeCard({ id: 42 })
    const { result } = makeSetup({ card })

    await result.update('back', 'World')

    expect(saveCardMock).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), {
      back_text: 'World'
    })
  })

  test('update() is a no-op when active_card is undefined', async () => {
    const active_card = ref(undefined)
    const result = useCardEdit(active_card, () => 10, vi.fn())

    await result.update('front', 'noop')

    expect(saveCardMock).not.toHaveBeenCalled()
  })

  test('update() is a no-op when active_card has no id [obligation]', async () => {
    const { result, updateCard } = makeSetup({ card: { ...makeCard(), id: undefined } })

    await result.update('front', 'noop')

    expect(saveCardMock).not.toHaveBeenCalled()
    expect(updateCard).not.toHaveBeenCalled()
  })
})

// ── update() patches the session's own card copy via updateCard ───────────────

describe('useCardEdit — update() patches the session card via updateCard [obligation]', () => {
  test('calls updateCard with the card id and patched values after saveCard resolves [obligation]', async () => {
    const card = makeCard({ id: 42 })
    const { result, updateCard } = makeSetup({ card })

    await result.update('front', 'Hello')

    expect(updateCard).toHaveBeenCalledWith(42, { front_text: 'Hello' })
  })

  test('calls updateCard with back_text values [obligation]', async () => {
    const card = makeCard({ id: 42 })
    const { result, updateCard } = makeSetup({ card })

    await result.update('back', 'World')

    expect(updateCard).toHaveBeenCalledWith(42, { back_text: 'World' })
  })
})
