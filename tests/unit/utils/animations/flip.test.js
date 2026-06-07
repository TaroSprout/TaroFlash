import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── gsap mock ─────────────────────────────────────────────────────────────────

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
  }
}))

import { flipEnter, flipLeave } from '@/utils/animations/flip'

describe('flip', () => {
  let fromTo
  let to
  let el
  let done

  beforeEach(async () => {
    const { gsap } = await import('gsap')
    fromTo = gsap.fromTo
    to = gsap.to
    fromTo.mockClear()
    to.mockClear()
    el = document.createElement('div')
    done = vi.fn()
  })

  // ── flipEnter ─────────────────────────────────────────────────────────────

  describe('flipEnter', () => {
    test("axis 'x' maps to rotateX in fromTo [obligation]", () => {
      flipEnter(el, 'x', done)
      expect(fromTo).toHaveBeenCalledTimes(1)
      const [, fromVars, toVars] = fromTo.mock.calls[0]
      expect(fromVars).toHaveProperty('rotateX')
      expect(toVars).toHaveProperty('rotateX', 0)
    })

    test("axis 'y' maps to rotateY in fromTo [obligation]", () => {
      flipEnter(el, 'y', done)
      const [, fromVars, toVars] = fromTo.mock.calls[0]
      expect(fromVars).toHaveProperty('rotateY')
      expect(toVars).toHaveProperty('rotateY', 0)
    })

    test("axis 'x' does NOT produce rotateY", () => {
      flipEnter(el, 'x', done)
      const [, fromVars] = fromTo.mock.calls[0]
      expect(fromVars).not.toHaveProperty('rotateY')
    })

    test('calls done via onComplete', () => {
      flipEnter(el, 'x', done)
      expect(done).toHaveBeenCalledTimes(1)
    })

    test('passes the element as the first argument', () => {
      flipEnter(el, 'x', done)
      expect(fromTo.mock.calls[0][0]).toBe(el)
    })
  })

  // ── flipLeave ─────────────────────────────────────────────────────────────

  describe('flipLeave', () => {
    test("axis 'x' maps to rotateX in to [obligation]", () => {
      flipLeave(el, 'x', done)
      expect(to).toHaveBeenCalledTimes(1)
      const [, opts] = to.mock.calls[0]
      expect(opts).toHaveProperty('rotateX', 60)
    })

    test("axis 'y' maps to rotateY in to [obligation]", () => {
      flipLeave(el, 'y', done)
      const [, opts] = to.mock.calls[0]
      expect(opts).toHaveProperty('rotateY', 60)
    })

    test("axis 'x' does NOT produce rotateY", () => {
      flipLeave(el, 'x', done)
      const [, opts] = to.mock.calls[0]
      expect(opts).not.toHaveProperty('rotateY')
    })

    test('calls done via onComplete', () => {
      flipLeave(el, 'x', done)
      expect(done).toHaveBeenCalledTimes(1)
    })

    test('passes the element as the first argument', () => {
      flipLeave(el, 'x', done)
      expect(to.mock.calls[0][0]).toBe(el)
    })
  })
})
