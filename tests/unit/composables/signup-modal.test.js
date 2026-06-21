import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockOpen } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockOpen: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

// SignupDialog is wrapped in defineAsyncComponent inside the composable —
// assert on the async component wrapper shape rather than the raw .vue import.
const asyncComponentMatcher = expect.objectContaining({ __asyncLoader: expect.any(Function) })

import { useSignupModal } from '@/views/welcome/sign-up/signup-modal'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeModalResult() {
  let resolve
  const response = new Promise((res) => {
    resolve = res
  })
  return { result: { response }, resolve }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockEmitSfx.mockReset()
  mockOpen.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useSignupModal', () => {
  test('emits snappy_button_3 immediately on open [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_3')
  })

  test('emits snappy_button_3 before snappy_button_5 (ordering) [obligation]', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()
    resolve(undefined)
    await flushPromises()

    const calls = mockEmitSfx.mock.calls.map((c) => c[0])
    expect(calls.indexOf('snappy_button_3')).toBeLessThan(calls.indexOf('snappy_button_5'))
  })

  test('opens modal with mode mobile-sheet [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ mode: 'mobile-sheet' })
    )
  })

  test('opens modal with mobile_below_width md [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ mobile_below_width: 'md' })
    )
  })

  test('opens modal with backdrop [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ backdrop: true })
    )
  })

  test('passes payment prop through to the modal [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open(true)

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ props: { payment: true } })
    )
  })

  test('passes undefined payment when called without argument', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      asyncComponentMatcher,
      expect.objectContaining({ props: { payment: undefined } })
    )
  })

  test('emits snappy_button_5 when the modal response resolves [obligation]', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()
    mockEmitSfx.mockClear()

    resolve(undefined)
    await flushPromises()

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('returns the modal result from open', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    const returned = useSignupModal().open()

    expect(returned).toBe(result)
  })
})
