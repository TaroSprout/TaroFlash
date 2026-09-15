import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@/composables/overlay/use-overlay', () => ({
  useOverlay: vi.fn(() => ({ open: mockOpen }))
}))

import { useLoginModal } from '@/views/welcome/login/login-modal'
import LoginSheet from '@/views/welcome/login/sheet.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeOverlayResult() {
  return { result: Promise.resolve(undefined) }
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockOpen.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useLoginModal', () => {
  test('opens with dialog presentation', () => {
    mockOpen.mockReturnValueOnce(makeOverlayResult())

    useLoginModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      LoginSheet,
      expect.objectContaining({ presentation: 'dialog' })
    )
  })

  test('opens with the open/close sfx roles', () => {
    mockOpen.mockReturnValueOnce(makeOverlayResult())

    useLoginModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      LoginSheet,
      expect.objectContaining({ open_sfx: 'dialog.open', close_sfx: 'dialog.close' })
    )
  })

  test('returns the overlay result from open', () => {
    const result = makeOverlayResult()
    mockOpen.mockReturnValueOnce(result)

    const returned = useLoginModal().open()

    expect(returned).toBe(result)
  })
})
