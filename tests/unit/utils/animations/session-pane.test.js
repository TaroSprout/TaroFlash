import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockTo, mockFromTo } = vi.hoisted(() => ({
  mockTo: vi.fn(),
  mockFromTo: vi.fn()
}))

vi.mock('gsap', () => ({ gsap: { to: mockTo, fromTo: mockFromTo } }))

import { sessionPaneLeave, sessionPaneEnter } from '@/utils/animations/session-pane'

// ── Helpers ───────────────────────────────────────────────────────────────────

const el = document.createElement('div')

// ── sessionPaneLeave ──────────────────────────────────────────────────────────

describe('sessionPaneLeave', () => {
  beforeEach(() => vi.clearAllMocks())

  test('fades element to opacity 0 via gsap.to', () => {
    sessionPaneLeave(el, vi.fn())
    expect(mockTo).toHaveBeenCalledWith(el, expect.objectContaining({ opacity: 0 }))
  })

  test('calls done via onComplete', () => {
    const done = vi.fn()
    sessionPaneLeave(el, done)
    const opts = mockTo.mock.calls[0][1]
    expect(done).not.toHaveBeenCalled()
    opts.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('uses a positive LEAVE_DURATION', () => {
    sessionPaneLeave(el, vi.fn())
    expect(mockTo.mock.calls[0][1].duration).toBeGreaterThan(0)
  })
})

// ── sessionPaneEnter ──────────────────────────────────────────────────────────

describe('sessionPaneEnter', () => {
  beforeEach(() => vi.clearAllMocks())

  test('animates scale from 0.9 to 1 via gsap.fromTo', () => {
    sessionPaneEnter(el, vi.fn())
    const [, from, to] = mockFromTo.mock.calls[0]
    expect(from.scale).toBe(0.9)
    expect(to.scale).toBe(1)
  })

  test('animates opacity from 0 to 1', () => {
    sessionPaneEnter(el, vi.fn())
    const [, from, to] = mockFromTo.mock.calls[0]
    expect(from.opacity).toBe(0)
    expect(to.opacity).toBe(1)
  })

  test('calls done via onComplete', () => {
    const done = vi.fn()
    sessionPaneEnter(el, done)
    expect(done).not.toHaveBeenCalled()
    const [, , to] = mockFromTo.mock.calls[0]
    to.onComplete()
    expect(done).toHaveBeenCalledTimes(1)
  })

  test('uses a positive ENTER_DURATION', () => {
    sessionPaneEnter(el, vi.fn())
    const [, , to] = mockFromTo.mock.calls[0]
    expect(to.duration).toBeGreaterThan(0)
  })

  test('uses a positive delay before the scale-in', () => {
    sessionPaneEnter(el, vi.fn())
    const [, , to] = mockFromTo.mock.calls[0]
    expect(to.delay).toBeGreaterThan(0)
  })

  test('clears transform props after animation via clearProps', () => {
    sessionPaneEnter(el, vi.fn())
    const [, , to] = mockFromTo.mock.calls[0]
    expect(to.clearProps).toBe('transform')
  })

  // ── onStart callback [obligation] ─────────────────────────────────────────

  test('invokes onStart callback when the tween begins [obligation]', () => {
    const onStart = vi.fn()
    sessionPaneEnter(el, vi.fn(), onStart)
    // onStart is not called until GSAP fires it
    expect(onStart).not.toHaveBeenCalled()
    const [, , to] = mockFromTo.mock.calls[0]
    to.onStart()
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  test('works without onStart (optional parameter) [obligation]', () => {
    // No third arg — must not throw
    expect(() => {
      sessionPaneEnter(el, vi.fn())
      const [, , to] = mockFromTo.mock.calls[0]
      to.onStart?.()
    }).not.toThrow()
  })

  test('onStart is passed through to gsap.fromTo options', () => {
    const onStart = vi.fn()
    sessionPaneEnter(el, vi.fn(), onStart)
    const [, , to] = mockFromTo.mock.calls[0]
    expect(to.onStart).toBe(onStart)
  })
})
