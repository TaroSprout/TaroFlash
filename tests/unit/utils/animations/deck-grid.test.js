import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const { mockFromTo, mockTo } = vi.hoisted(() => ({
  mockFromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
  mockTo: vi.fn((_el, opts) => opts?.onComplete?.())
}))

vi.mock('gsap', () => ({ gsap: { fromTo: mockFromTo, to: mockTo } }))

import { popDeckIn, popDeckOut, waitForDeckPopIn } from '@/utils/animations/deck-grid'

describe('deck-grid animations', () => {
  const el = document.createElement('div')

  beforeEach(() => {
    vi.clearAllMocks()
    mockFromTo.mockImplementation((_el, _from, to) => to?.onComplete?.())
    mockTo.mockImplementation((_el, opts) => opts?.onComplete?.())
  })

  describe('popDeckIn', () => {
    test('animates from scaled-down and invisible', () => {
      const done = vi.fn()
      popDeckIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        { scale: 0.5, opacity: 0 },
        expect.objectContaining({ scale: 1, opacity: 1, ease: 'back.out(2)' })
      )
    })

    test('clears inline props and calls done on complete', () => {
      const done = vi.fn()
      popDeckIn(el, done)

      expect(mockFromTo).toHaveBeenCalledWith(
        el,
        expect.anything(),
        expect.objectContaining({ clearProps: 'all' })
      )
      expect(done).toHaveBeenCalledTimes(1)
    })

    test('dispatches a bubbling deck-pop-in event with the id parsed as a Number [obligation]', () => {
      const grid_el = document.createElement('div')
      grid_el.setAttribute('data-deck-id', '42')
      document.body.appendChild(grid_el)

      let captured_event
      document.addEventListener('deck-pop-in', (e) => (captured_event = e), { once: true })

      popDeckIn(grid_el, vi.fn())

      expect(captured_event.detail.id).toBe(42)
      expect(typeof captured_event.detail.id).toBe('number')

      grid_el.remove()
    })
  })

  describe('popDeckOut', () => {
    test('shrinks and fades the element out', () => {
      const done = vi.fn()
      popDeckOut(el, done)

      expect(mockTo).toHaveBeenCalledWith(
        el,
        expect.objectContaining({ scale: 0.5, opacity: 0, ease: 'power2.in' })
      )
    })

    test('calls done on complete', () => {
      const done = vi.fn()
      popDeckOut(el, done)

      expect(done).toHaveBeenCalledTimes(1)
    })
  })

  describe('waitForDeckPopIn', () => {
    function dispatchPopIn(id) {
      document.dispatchEvent(new CustomEvent('deck-pop-in', { detail: { id } }))
    }

    test('resolves when a deck-pop-in event fires with a matching id [obligation]', async () => {
      let resolved = false
      waitForDeckPopIn(5).then(() => (resolved = true))

      dispatchPopIn(5)
      await Promise.resolve()

      expect(resolved).toBe(true)
    })

    test('does not resolve for a mismatched id; only the matching listener triggers cleanup [obligation]', async () => {
      let resolved = false
      waitForDeckPopIn(5).then(() => (resolved = true))

      dispatchPopIn(999)
      await Promise.resolve()
      expect(resolved).toBe(false)

      dispatchPopIn(5)
      await Promise.resolve()
      expect(resolved).toBe(true)
    })

    test('resolves via the timeout fallback when no matching event ever fires [obligation]', async () => {
      vi.useFakeTimers()
      let resolved = false
      waitForDeckPopIn(5).then(() => (resolved = true))

      await vi.advanceTimersByTimeAsync(999)
      expect(resolved).toBe(false)

      await vi.advanceTimersByTimeAsync(1)
      expect(resolved).toBe(true)

      vi.useRealTimers()
    })
  })
})
