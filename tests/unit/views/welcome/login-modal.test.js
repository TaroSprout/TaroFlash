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

import { useLoginModal } from '@/views/welcome/login/login-modal'
import LoginSheet from '@/views/welcome/login/sheet.vue'

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

describe('useLoginModal', () => {
  test('emits snappy_button_3 immediately on open [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useLoginModal().open()

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_3')
  })

  test('emits snappy_button_5 when the modal response resolves [obligation]', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useLoginModal().open()
    mockEmitSfx.mockClear()

    resolve(undefined)
    await flushPromises()

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('emits snappy_button_3 before snappy_button_5 (ordering) [obligation]', async () => {
    const { result, resolve } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useLoginModal().open()
    resolve(undefined)
    await flushPromises()

    const calls = mockEmitSfx.mock.calls.map((c) => c[0])
    expect(calls.indexOf('snappy_button_3')).toBeLessThan(calls.indexOf('snappy_button_5'))
  })

  test('opens modal with mode mobile-sheet [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useLoginModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      LoginSheet,
      expect.objectContaining({ mode: 'mobile-sheet' })
    )
  })

  test('opens modal with mobile_below_width md [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useLoginModal().open()

    expect(mockOpen).toHaveBeenCalledWith(
      LoginSheet,
      expect.objectContaining({ mobile_below_width: 'md' })
    )
  })

  test('opens modal with backdrop [obligation]', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    useLoginModal().open()

    expect(mockOpen).toHaveBeenCalledWith(LoginSheet, expect.objectContaining({ backdrop: true }))
  })

  test('returns the modal result from open', () => {
    const { result } = makeModalResult()
    mockOpen.mockReturnValueOnce(result)

    const returned = useLoginModal().open()

    expect(returned).toBe(result)
  })
})
