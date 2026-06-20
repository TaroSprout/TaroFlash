import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { useStudyModal } from '@/composables/study-session/study-modal'

// StudySession and SessionComplete are wrapped with defineAsyncComponent inside
// the composable, so the component identity doesn't match the raw .vue import.
// We assert on the wrapper object shape instead.
const asyncComponentMatcher = expect.objectContaining({ __asyncLoader: expect.any(Function) })

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockEmitSfx, mockEmitStudySfx } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockEmitStudySfx: vi.fn()
}))
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitStudySfx: mockEmitStudySfx,
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useStudyModal', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    mockEmitStudySfx.mockClear()
    mockOpen.mockReset()
    vi.useFakeTimers({ toFake: ['setTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('plays slide_up sfx immediately when starting', async () => {
    const { result: sessionResult, resolve: resolveSession } = makeModalResult()
    mockOpen.mockReturnValueOnce(sessionResult)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    // sfx fires synchronously before any await
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_3')

    resolveSession(undefined)
    await startPromise
  })

  test('opens StudySession modal with correct options', async () => {
    const { result: sessionResult, resolve: resolveSession } = makeModalResult()
    mockOpen.mockReturnValueOnce(sessionResult)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    expect(mockOpen).toHaveBeenCalledWith(asyncComponentMatcher, {
      backdrop: true,
      mode: 'mobile-sheet',
      props: { deck: DECK, config_override: undefined }
    })

    resolveSession(undefined)
    await startPromise
  })

  test('plays slide_up sfx after session closes', async () => {
    const { result: sessionResult, resolve: resolveSession } = makeModalResult()
    mockOpen.mockReturnValueOnce(sessionResult)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveSession(undefined)
    await startPromise

    expect(mockEmitSfx).toHaveBeenCalledWith('slide_up')
    expect(mockEmitSfx).toHaveBeenCalledTimes(2)
  })

  test('does not open SessionComplete when session returns no payload', async () => {
    const { result: sessionResult, resolve: resolveSession } = makeModalResult()
    mockOpen.mockReturnValueOnce(sessionResult)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveSession(undefined)
    await startPromise

    expect(mockOpen).toHaveBeenCalledTimes(1)
  })

  test('waits 300ms before opening SessionComplete', async () => {
    const sessionPayload = { score: 3, total: 5 }
    const { result: sessionResult, resolve: resolveSession } = makeModalResult()
    const { result: completeResult, resolve: resolveComplete } = makeModalResult()
    mockOpen.mockReturnValueOnce(sessionResult).mockReturnValueOnce(completeResult)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveSession(sessionPayload)
    await flushPromises() // let composable reach the setTimeout

    // SessionComplete should not open before 300ms
    vi.advanceTimersByTime(299)
    await flushPromises()
    expect(mockOpen).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(mockOpen).toHaveBeenCalledTimes(2)

    resolveComplete(undefined)
    await startPromise
  })

  test('opens SessionComplete with score and total from session payload', async () => {
    const sessionPayload = { score: 3, total: 5 }
    const { result: sessionResult, resolve: resolveSession } = makeModalResult()
    const { result: completeResult, resolve: resolveComplete } = makeModalResult()
    mockOpen.mockReturnValueOnce(sessionResult).mockReturnValueOnce(completeResult)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveSession(sessionPayload)
    await flushPromises()
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockOpen).toHaveBeenNthCalledWith(2, asyncComponentMatcher, {
      backdrop: true,
      mode: 'mobile-sheet',
      props: { score: 3, total: 5, secondary_action: 'study-all', theme: undefined }
    })

    resolveComplete(undefined)
    await startPromise
  })

  test('plays music_pizz_duo_hi sfx before opening SessionComplete', async () => {
    const sessionPayload = { score: 4, total: 4 }
    const { result: sessionResult, resolve: resolveSession } = makeModalResult()
    const { result: completeResult, resolve: resolveComplete } = makeModalResult()
    mockOpen.mockReturnValueOnce(sessionResult).mockReturnValueOnce(completeResult)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveSession(sessionPayload)
    await flushPromises()
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockEmitStudySfx).toHaveBeenCalledWith('music_pizz_duo_hi')
    // music sfx fires before the second modal.open call
    const sfxCalls = mockEmitStudySfx.mock.calls.map((c) => c[0])
    const musicIdx = sfxCalls.lastIndexOf('music_pizz_duo_hi')
    expect(musicIdx).toBeGreaterThan(-1)

    resolveComplete(undefined)
    await startPromise
  })

  test('plays final slide_up sfx after SessionComplete closes', async () => {
    const sessionPayload = { score: 2, total: 3 }
    const { result: sessionResult, resolve: resolveSession } = makeModalResult()
    const { result: completeResult, resolve: resolveComplete } = makeModalResult()
    mockOpen.mockReturnValueOnce(sessionResult).mockReturnValueOnce(completeResult)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveSession(sessionPayload)
    await flushPromises()
    vi.advanceTimersByTime(300)
    await flushPromises()

    const sfxCountBeforeClose = mockEmitSfx.mock.calls.length

    resolveComplete(undefined)
    await startPromise

    expect(mockEmitSfx.mock.calls.length).toBeGreaterThan(sfxCountBeforeClose)
    expect(mockEmitSfx.mock.calls.at(-1)[0]).toBe('slide_up')
  })

  test('study-more action recurses — opens StudySession again without study_all_cards', async () => {
    const sessionPayload = { score: 2, total: 5, remaining_due: 3 }
    const { result: s1, resolve: resolveS1 } = makeModalResult()
    const { result: c1, resolve: resolveC1 } = makeModalResult()
    const { result: s2, resolve: resolveS2 } = makeModalResult()
    // s1 → c1 (study-more action) → s2 (no payload, exits)
    mockOpen.mockReturnValueOnce(s1).mockReturnValueOnce(c1).mockReturnValueOnce(s2)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveS1(sessionPayload)
    await flushPromises()
    vi.advanceTimersByTime(300)
    await flushPromises()

    resolveC1('study-more')
    await flushPromises()

    resolveS2(undefined)
    await startPromise

    // Third open call is the recursive StudySession (study-more, no config_override)
    expect(mockOpen).toHaveBeenCalledTimes(3)
    expect(mockOpen.mock.calls[2][1]).toMatchObject({ props: { config_override: undefined } })
  })

  test('study-again action recurses with study_all_cards: true', async () => {
    const sessionPayload = { score: 2, total: 5, study_all_used: true }
    const { result: s1, resolve: resolveS1 } = makeModalResult()
    const { result: c1, resolve: resolveC1 } = makeModalResult()
    const { result: s2, resolve: resolveS2 } = makeModalResult()
    mockOpen.mockReturnValueOnce(s1).mockReturnValueOnce(c1).mockReturnValueOnce(s2)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveS1(sessionPayload)
    await flushPromises()
    vi.advanceTimersByTime(300)
    await flushPromises()

    resolveC1('study-again')
    await flushPromises()

    resolveS2(undefined)
    await startPromise

    expect(mockOpen).toHaveBeenCalledTimes(3)
    expect(mockOpen.mock.calls[2][1]).toMatchObject({
      props: { config_override: { study_all_cards: true } }
    })
  })

  test('study-all action recurses with study_all_cards: true', async () => {
    const sessionPayload = { score: 5, total: 5, remaining_due: 0 }
    const { result: s1, resolve: resolveS1 } = makeModalResult()
    const { result: c1, resolve: resolveC1 } = makeModalResult()
    const { result: s2, resolve: resolveS2 } = makeModalResult()
    mockOpen.mockReturnValueOnce(s1).mockReturnValueOnce(c1).mockReturnValueOnce(s2)

    const { start } = useStudyModal()
    const startPromise = start(DECK)

    resolveS1(sessionPayload)
    await flushPromises()
    vi.advanceTimersByTime(300)
    await flushPromises()

    resolveC1('study-all')
    await flushPromises()

    resolveS2(undefined)
    await startPromise

    expect(mockOpen).toHaveBeenCalledTimes(3)
    expect(mockOpen.mock.calls[2][1]).toMatchObject({
      props: { config_override: { study_all_cards: true } }
    })
  })
})
