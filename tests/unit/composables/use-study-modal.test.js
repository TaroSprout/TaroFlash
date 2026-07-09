import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { useStudyModal } from '@/components/flashcard-session/composables/study-modal'
import StudySession from '@/components/flashcard-session/index.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a { result, resolve } pair — call resolve(value) to close the modal. */
function makeModalResult() {
  let resolve
  const response = new Promise((res) => {
    resolve = res
  })
  return { result: { response }, resolve }
}

const DECK = { id: 1, title: 'Test Deck' }
const DECK2 = { id: 2, title: 'Second Deck' }
const DECKS = [DECK]
const MULTI_DECKS = [DECK, DECK2]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useStudyModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockOpen.mockReset()
  })

  test('plays generic_notification_9 sfx synchronously when starting', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    const { start } = useStudyModal()
    const startPromise = start(DECKS)

    // sfx fires synchronously before any await
    expect(mockEmitSfx).toHaveBeenCalledWith('generic_notification_9')

    resolve(undefined)
    await startPromise
  })

  test('opens a StudySession popup modal with decks array + config_override [obligation]', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    const { start } = useStudyModal()
    const startPromise = start(DECKS)

    expect(mockOpen).toHaveBeenCalledWith(StudySession, {
      backdrop: true,
      mode: 'popup',
      props: { decks: DECKS, config_override: undefined }
    })

    resolve(undefined)
    await startPromise
  })

  test('passes multiple decks to the modal [obligation]', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    const { start } = useStudyModal()
    const startPromise = start(MULTI_DECKS)

    expect(mockOpen).toHaveBeenCalledWith(
      StudySession,
      expect.objectContaining({ props: { decks: MULTI_DECKS, config_override: undefined } })
    )

    resolve(undefined)
    await startPromise
  })

  test('does not re-open when the session resolves with no action', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    const { start } = useStudyModal()
    const startPromise = start(DECKS)

    resolve(undefined)
    await startPromise

    expect(mockOpen).toHaveBeenCalledTimes(1)
  })

  test('study-more action recurses — re-opens StudySession without study_all_cards', async () => {
    const { result: open1, resolve: resolve1 } = makeModalResult()
    const { result: open2, resolve: resolve2 } = makeModalResult()
    mockOpen.mockReturnValueOnce(open1).mockReturnValueOnce(open2)

    const { start } = useStudyModal()
    const startPromise = start(DECKS)

    resolve1('study-more')
    await flushPromises()

    resolve2(undefined)
    await startPromise

    expect(mockOpen).toHaveBeenCalledTimes(2)
    expect(mockOpen.mock.calls[1][1]).toMatchObject({ props: { config_override: undefined } })
  })

  test('study-again action recurses with study_all_cards: true', async () => {
    const { result: open1, resolve: resolve1 } = makeModalResult()
    const { result: open2, resolve: resolve2 } = makeModalResult()
    mockOpen.mockReturnValueOnce(open1).mockReturnValueOnce(open2)

    const { start } = useStudyModal()
    const startPromise = start(DECKS)

    resolve1('study-again')
    await flushPromises()

    resolve2(undefined)
    await startPromise

    expect(mockOpen).toHaveBeenCalledTimes(2)
    expect(mockOpen.mock.calls[1][1]).toMatchObject({
      props: { config_override: { study_all_cards: true } }
    })
  })

  test('study-all action recurses with study_all_cards: true', async () => {
    const { result: open1, resolve: resolve1 } = makeModalResult()
    const { result: open2, resolve: resolve2 } = makeModalResult()
    mockOpen.mockReturnValueOnce(open1).mockReturnValueOnce(open2)

    const { start } = useStudyModal()
    const startPromise = start(DECKS)

    resolve1('study-all')
    await flushPromises()

    resolve2(undefined)
    await startPromise

    expect(mockOpen).toHaveBeenCalledTimes(2)
    expect(mockOpen.mock.calls[1][1]).toMatchObject({
      props: { config_override: { study_all_cards: true } }
    })
  })

  test('study-more recursion preserves all decks [obligation]', async () => {
    const { result: open1, resolve: resolve1 } = makeModalResult()
    const { result: open2, resolve: resolve2 } = makeModalResult()
    mockOpen.mockReturnValueOnce(open1).mockReturnValueOnce(open2)

    const { start } = useStudyModal()
    const startPromise = start(MULTI_DECKS)

    resolve1('study-more')
    await flushPromises()

    resolve2(undefined)
    await startPromise

    expect(mockOpen.mock.calls[1][1]).toMatchObject({
      props: { decks: MULTI_DECKS, config_override: undefined }
    })
  })
})
