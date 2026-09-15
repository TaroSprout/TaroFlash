import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockOpen, mockTrackSignupStarted } = vi.hoisted(() => ({
  mockOpen: vi.fn(),
  mockTrackSignupStarted: vi.fn()
}))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

vi.mock('@/composables/tracking', () => ({
  useTracking: () => ({ trackSignupStarted: mockTrackSignupStarted })
}))

import { useSignupModal } from '@/views/welcome/signup/signup-modal'
import SignupDialog from '@/views/welcome/signup/index.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeOverlayResult() {
  let resolve
  const result = new Promise((res) => {
    resolve = res
  })
  return { result, resolve }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockOpen.mockReset()
  mockTrackSignupStarted.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useSignupModal', () => {
  test('fires Signup Started on open', () => {
    const { result } = makeOverlayResult()
    mockOpen.mockReturnValueOnce({ result })

    useSignupModal().open()

    expect(mockTrackSignupStarted).toHaveBeenCalledOnce()
  })

  test('fires Signup Started again on a second fresh open — no dedup', () => {
    const first = makeOverlayResult()
    const second = makeOverlayResult()
    mockOpen
      .mockReturnValueOnce({ result: first.result })
      .mockReturnValueOnce({ result: second.result })

    useSignupModal().open()
    useSignupModal().open()

    expect(mockTrackSignupStarted).toHaveBeenCalledTimes(2)
  })

  test('opens with dialog presentation', () => {
    const { result } = makeOverlayResult()
    mockOpen.mockReturnValueOnce({ result })

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      SignupDialog,
      expect.objectContaining({ presentation: 'dialog' })
    )
  })

  test('opens with the open/close sfx roles', () => {
    const { result } = makeOverlayResult()
    mockOpen.mockReturnValueOnce({ result })

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      SignupDialog,
      expect.objectContaining({ open_sfx: 'dialog.open', close_sfx: 'dialog.close' })
    )
  })

  test('passes payment prop through to the overlay', () => {
    const { result } = makeOverlayResult()
    mockOpen.mockReturnValueOnce({ result })

    useSignupModal().open(true)

    expect(mockOpen).toHaveBeenCalledWith(
      SignupDialog,
      expect.objectContaining({ props: { payment: true } })
    )
  })

  test('passes undefined payment when called without argument', () => {
    const { result } = makeOverlayResult()
    mockOpen.mockReturnValueOnce({ result })

    useSignupModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      SignupDialog,
      expect.objectContaining({ props: { payment: undefined } })
    )
  })

  test('returns the overlay result from open', () => {
    const { result } = makeOverlayResult()
    const returned_result = { result }
    mockOpen.mockReturnValueOnce(returned_result)

    const returned = useSignupModal().open()

    expect(returned).toBe(returned_result)
  })
})
