import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

const { coarseRef, mockUseMediaQuery, mockPlayButtonTap } = vi.hoisted(() => {
  const coarseRef = { value: true }
  return {
    coarseRef,
    mockUseMediaQuery: vi.fn(() => coarseRef),
    mockPlayButtonTap: vi.fn(() => ({
      peak: Promise.resolve(),
      done: Promise.resolve()
    }))
  }
})

vi.mock('@/composables/use-media-query', () => ({
  useMatchMedia: mockUseMediaQuery
}))

vi.mock('@/utils/animations/button-tap', () => ({
  BUTTON_TAP_DURATION: 0.1,
  playButtonTap: mockPlayButtonTap
}))

import { usePlayOnTap } from '@/composables/use-play-on-tap'

function makeEvent(target = document.createElement('div')) {
  const e = new MouseEvent('click', { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'currentTarget', { value: target, configurable: true })
  vi.spyOn(e, 'stopImmediatePropagation')
  vi.spyOn(e, 'preventDefault')
  return e
}

function resolvedHandles() {
  return { peak: Promise.resolve(), done: Promise.resolve() }
}

describe('usePlayOnTap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    coarseRef.value = true
    mockPlayButtonTap.mockImplementation(resolvedHandles)
  })

  describe('coarse-only gating (default)', () => {
    test('returns playing ref initialized to false', () => {
      const { playing } = usePlayOnTap()
      expect(playing.value).toBe(false)
    })

    test('runs animation when pointer is coarse and fires lifecycle hooks', async () => {
      const { interceptClick, playing } = usePlayOnTap()
      const hooks = {
        onTap: vi.fn(),
        beforePlay: vi.fn(),
        onPeak: vi.fn(),
        onAfter: vi.fn()
      }
      const e = makeEvent()

      await interceptClick(e, hooks)

      expect(mockPlayButtonTap).toHaveBeenCalled()
      expect(hooks.onTap).toHaveBeenCalledWith(e)
      expect(hooks.beforePlay).toHaveBeenCalledWith(e)
      expect(hooks.onPeak).toHaveBeenCalledWith(e)
      expect(hooks.onAfter).toHaveBeenCalledWith(e)
      expect(playing.value).toBe(false)
    })

    test('skips intercept on pointer:fine but still fires onTap', async () => {
      coarseRef.value = false
      const { interceptClick, playing } = usePlayOnTap()
      const hooks = {
        onTap: vi.fn(),
        beforePlay: vi.fn(),
        onPeak: vi.fn(),
        onAfter: vi.fn()
      }
      const e = makeEvent()

      await interceptClick(e, hooks)

      expect(hooks.onTap).toHaveBeenCalledWith(e)
      expect(hooks.beforePlay).not.toHaveBeenCalled()
      expect(hooks.onPeak).not.toHaveBeenCalled()
      expect(hooks.onAfter).not.toHaveBeenCalled()
      expect(e.stopImmediatePropagation).not.toHaveBeenCalled()
      expect(e.preventDefault).not.toHaveBeenCalled()
      expect(mockPlayButtonTap).not.toHaveBeenCalled()
      expect(playing.value).toBe(false)
    })
  })

  describe('activeOn: "always"', () => {
    test('runs the intercept on pointer:fine when activeOn=always', async () => {
      coarseRef.value = false
      const { interceptClick } = usePlayOnTap({ activeOn: 'always' })
      const onAfter = vi.fn()
      await interceptClick(makeEvent(), { onAfter })

      expect(mockPlayButtonTap).toHaveBeenCalled()
      expect(onAfter).toHaveBeenCalled()
    })
  })

  describe('event handling', () => {
    test('stops propagation and prevents default before animation', async () => {
      const { interceptClick } = usePlayOnTap()
      const e = makeEvent()
      await interceptClick(e, {})

      expect(e.stopImmediatePropagation).toHaveBeenCalled()
      expect(e.preventDefault).toHaveBeenCalled()
    })

    test('sets playing=true during animation, before onAfter runs', async () => {
      let playingDuringTween
      mockPlayButtonTap.mockImplementation(() => {
        playingDuringTween = playing.value
        return resolvedHandles()
      })
      const { interceptClick, playing } = usePlayOnTap()
      await interceptClick(makeEvent(), {})
      expect(playingDuringTween).toBe(true)
    })
  })

  describe('re-entrancy', () => {
    test('is a no-op while already playing (but still fires onTap)', async () => {
      let resolvePeak
      mockPlayButtonTap.mockImplementation(() => ({
        peak: new Promise((r) => (resolvePeak = r)),
        done: Promise.resolve()
      }))
      const { interceptClick, playing } = usePlayOnTap()
      const onAfter = vi.fn()
      const onTap = vi.fn()

      const first = interceptClick(makeEvent(), { onAfter, onTap })
      await nextTick()
      expect(playing.value).toBe(true)

      await interceptClick(makeEvent(), { onAfter, onTap })
      expect(mockPlayButtonTap).toHaveBeenCalledTimes(1)
      expect(onTap).toHaveBeenCalledTimes(2)

      resolvePeak()
      await first
      await flushPromises()
    })
  })

  describe('beforePlay hook', () => {
    test('fires before the animation, after stop/preventDefault', async () => {
      const beforePlay = vi.fn()
      mockPlayButtonTap.mockImplementation(() => {
        expect(beforePlay).toHaveBeenCalledTimes(1)
        return resolvedHandles()
      })
      const { interceptClick } = usePlayOnTap()
      const e = makeEvent()
      await interceptClick(e, { beforePlay })
      expect(beforePlay).toHaveBeenCalledWith(e)
    })

    test('is not called when intercept is skipped on fine pointer', async () => {
      coarseRef.value = false
      const beforePlay = vi.fn()
      const { interceptClick } = usePlayOnTap()
      await interceptClick(makeEvent(), { beforePlay })
      expect(beforePlay).not.toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    test('resets playing to false after onAfter when reset=true (default)', async () => {
      const { interceptClick, playing } = usePlayOnTap()
      await interceptClick(makeEvent(), {})
      expect(playing.value).toBe(false)
    })

    test('holds playing=true after onAfter when reset=false', async () => {
      const { interceptClick, playing } = usePlayOnTap({ reset: false })
      await interceptClick(makeEvent(), {})
      expect(playing.value).toBe(true)
    })
  })

  describe('animate option', () => {
    test('uses GSAP when animate is true (default)', async () => {
      const { interceptClick } = usePlayOnTap()
      await interceptClick(makeEvent(), {})
      expect(mockPlayButtonTap).toHaveBeenCalled()
    })

    test('uses setTimeout-based hold when animate=false', async () => {
      vi.useFakeTimers()
      const { interceptClick, playing } = usePlayOnTap({ animate: false, duration: 0.25 })
      const onAfter = vi.fn()

      const p = interceptClick(makeEvent(), { onAfter })
      await nextTick()
      expect(playing.value).toBe(true)
      expect(mockPlayButtonTap).not.toHaveBeenCalled()
      expect(onAfter).not.toHaveBeenCalled()

      vi.advanceTimersByTime(250)
      await p
      expect(onAfter).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })

  describe('duration / yoyo / hold options', () => {
    test('forwards duration to playButtonTap', async () => {
      const { interceptClick } = usePlayOnTap({ duration: 0.4 })
      await interceptClick(makeEvent(), {})
      expect(mockPlayButtonTap).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        0.4,
        expect.any(Object)
      )
    })

    test('passes yoyo and hold through to playButtonTap', async () => {
      const { interceptClick } = usePlayOnTap({ yoyo: true, hold: 0.2 })
      await interceptClick(makeEvent(), {})
      expect(mockPlayButtonTap).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.any(Number),
        expect.objectContaining({ yoyo: true, hold: 0.2 })
      )
    })
  })

  describe('blur', () => {
    test('blurs the target after the animation', async () => {
      const target = document.createElement('button')
      document.body.appendChild(target)
      target.focus()
      const blur = vi.spyOn(target, 'blur')

      const { interceptClick } = usePlayOnTap()
      await interceptClick(makeEvent(target), {})

      expect(blur).toHaveBeenCalled()
      document.body.removeChild(target)
    })
  })
})
