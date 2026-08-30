import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx, mockOpen, mockTrackSignupStarted } = vi.hoisted(() => ({
  mockEmitSfx: vi.fn(),
  mockOpen: vi.fn(),
  mockTrackSignupStarted: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  useModal: vi.fn(() => ({ open: mockOpen }))
}))

vi.mock('@/composables/tracking', () => ({
  useTracking: () => ({ trackSignupStarted: mockTrackSignupStarted })
}))

import { useSignupModal } from '@/views/welcome/signup/signup-modal'
import SignupDialog from '@/views/welcome/signup/index.vue'

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
  mockTrackSignupStarted.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useSignupModal', () => {
  test('emits snappy_button_3 immediately on open', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.open')
  })

  test('fires Signup Started on open', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockTrackSignupStarted).toHaveBeenCalledOnce()
  })

  test('fires Signup Started again on a second fresh open — no dedup', () => {
    const first = makeModalResult()
    const second = makeModalResult()
    mockOpen.mockReturnValueOnce(first.result).mockReturnValueOnce(second.result)

    useSignupModal().open()
    useSignupModal().open()

    expect(mockTrackSignupStarted).toHaveBeenCalledTimes(2)
  })

  test('emits snappy_button_3 before pop_up_close (ordering)', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()
    resolve(undefined)
    await flushPromises()

    const calls = mockEmitSfx.mock.calls.map((c) => c[0])
    expect(calls.indexOf('dialog.open')).toBeLessThan(calls.indexOf('dialog.close'))
  })

  test('opens modal with mode mobile-sheet', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      SignupDialog,
      expect.objectContaining({ mode: 'mobile-sheet' })
    )
  })

  test('opens modal with mobile_below_width sm', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      SignupDialog,
      expect.objectContaining({ mobile_below_width: 'sm' })
    )
  })

  test('opens modal with backdrop', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(SignupDialog, expect.objectContaining({ backdrop: true }))
  })

  test('passes payment prop through to the modal', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open(true)

    expect(mockOpen).toHaveBeenCalledWith(
      SignupDialog,
      expect.objectContaining({ props: { payment: true } })
    )
  })

  test('passes undefined payment when called without argument', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      SignupDialog,
      expect.objectContaining({ props: { payment: undefined } })
    )
  })

  test('emits pop_up_close when the modal response resolves', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useSignupModal().open()
    mockEmitSfx.mockClear()

    resolve(undefined)
    await flushPromises()

    expect(mockEmitSfx).toHaveBeenCalledWith('dialog.close')
  })

  test('returns the modal result from open', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    const returned = useSignupModal().open()

    expect(returned).toBe(result)
  })
})
