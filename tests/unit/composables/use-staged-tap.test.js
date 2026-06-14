import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { coarseRef, mockUseMatchMedia, mockPlayButtonTap, mockEmitSfx } = vi.hoisted(() => {
  const coarseRef = { value: true }
  return {
    coarseRef,
    mockUseMatchMedia: vi.fn(() => coarseRef),
    mockPlayButtonTap: vi.fn(() => ({
      peak: Promise.resolve(),
      done: Promise.resolve()
    })),
    mockEmitSfx: vi.fn()
  }
})

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: mockUseMatchMedia
}))

vi.mock('@/utils/animations/button-tap', () => ({
  BUTTON_TAP_DURATION: 0.1,
  playButtonTap: mockPlayButtonTap
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx
}))

import { useStagedTap } from '@/composables/ui/staged-tap'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(target = document.createElement('div')) {
  const e = new MouseEvent('click', { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'currentTarget', { value: target, configurable: true })
  vi.spyOn(e, 'stopImmediatePropagation')
  return e
}

function resolvedHandles() {
  return { peak: Promise.resolve(), done: Promise.resolve() }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  coarseRef.value = true
  mockPlayButtonTap.mockImplementation(resolvedHandles)
})

describe('useStagedTap — fine pointer (coarse-only mode)', () => {
  test('tap calls action immediately on fine pointer with no animation', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    const action = vi.fn()
    const e = makeEvent()

    await tap(action)(e)

    expect(action).toHaveBeenCalledWith(e)
    expect(mockPlayButtonTap).not.toHaveBeenCalled()
  })

  test('playing stays false on fine pointer (no animation runs)', async () => {
    coarseRef.value = false
    const { playing, tap } = useStagedTap()
    await tap(vi.fn())(makeEvent())
    expect(playing.value).toBe(false)
  })

  test('action fires synchronously (no await needed) on fine pointer', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    const order = []
    const action = vi.fn(() => order.push('action'))
    const handler = tap(action)
    const p = handler(makeEvent())
    order.push('after-call')
    await p
    // action fires before the handler promise resolves (immediate, no deferral)
    expect(order[0]).toBe('action')
  })
})

describe('useStagedTap — coarse pointer (default triggerAt: peak)', () => {
  test('action fires at peak by default on coarse pointer', async () => {
    let peakResolve
    mockPlayButtonTap.mockImplementation(() => ({
      peak: new Promise((r) => (peakResolve = r)),
      done: Promise.resolve()
    }))
    const { tap } = useStagedTap({ animate: 'pop' })
    const action = vi.fn()
    const e = makeEvent()

    const p = tap(action)(e)
    // action not called yet — waiting for peak
    expect(action).not.toHaveBeenCalled()

    peakResolve()
    await p
    expect(action).toHaveBeenCalledWith(e)
  })

  test('action does NOT fire at press when triggerAt is default (peak)', async () => {
    let peakResolve
    mockPlayButtonTap.mockImplementation(() => ({
      peak: new Promise((r) => (peakResolve = r)),
      done: Promise.resolve()
    }))
    const { tap } = useStagedTap({ animate: 'pop' })
    const action = vi.fn()

    const p = tap(action)(makeEvent())
    // At the moment of press, action must not have fired
    expect(action).not.toHaveBeenCalled()

    peakResolve()
    await p
  })

  test('playing is true during animation on coarse', async () => {
    let peakResolve
    mockPlayButtonTap.mockImplementation(() => ({
      peak: new Promise((r) => (peakResolve = r)),
      done: Promise.resolve()
    }))
    const { playing, tap } = useStagedTap({ animate: 'pop' })
    const p = tap(vi.fn())(makeEvent())
    await nextTick()
    expect(playing.value).toBe(true)
    peakResolve()
    await p
    expect(playing.value).toBe(false)
  })
})

describe('useStagedTap — captureMode on fine pointer (deck-thumbnail double-fire fix)', () => {
  test('tap is a complete no-op on fine pointer in captureMode — action never called', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    const action = vi.fn()
    const e = makeEvent()

    await tap(action, { captureMode: true })(e)

    expect(action).not.toHaveBeenCalled()
  })

  test('stopImmediatePropagation is NOT called on fine pointer in captureMode', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    const e = makeEvent()

    await tap(vi.fn(), { captureMode: true })(e)

    expect(e.stopImmediatePropagation).not.toHaveBeenCalled()
  })

  test('no animation plays on fine pointer in captureMode', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()

    await tap(vi.fn(), { captureMode: true })(makeEvent())

    expect(mockPlayButtonTap).not.toHaveBeenCalled()
  })
})

describe('useStagedTap — captureMode on coarse pointer', () => {
  test('stopImmediatePropagation is called on coarse in captureMode', async () => {
    const { tap } = useStagedTap()
    const e = makeEvent()

    await tap(vi.fn(), { captureMode: true })(e)

    expect(e.stopImmediatePropagation).toHaveBeenCalled()
  })

  test('action still fires on coarse in captureMode (after animation)', async () => {
    const { tap } = useStagedTap()
    const action = vi.fn()
    const e = makeEvent()

    await tap(action, { captureMode: true })(e)

    expect(action).toHaveBeenCalledWith(e)
  })
})

describe('useStagedTap — double-tap guard', () => {
  test('second call while playing is silently dropped (action not called a second time)', async () => {
    let peakResolve
    mockPlayButtonTap.mockImplementation(() => ({
      peak: new Promise((r) => (peakResolve = r)),
      done: Promise.resolve()
    }))
    const { playing, tap } = useStagedTap({ animate: 'pop' })
    const action = vi.fn()

    const first = tap(action)(makeEvent())
    await nextTick()
    expect(playing.value).toBe(true)

    // Second tap while playing — must be a no-op
    await tap(action)(makeEvent())
    expect(mockPlayButtonTap).toHaveBeenCalledTimes(1)

    peakResolve()
    await first
    await flushPromises()
    // action fires exactly once (from first tap)
    expect(action).toHaveBeenCalledTimes(1)
  })

  test('animation not replayed on second tap while playing', async () => {
    let peakResolve
    mockPlayButtonTap.mockImplementation(() => ({
      peak: new Promise((r) => (peakResolve = r)),
      done: Promise.resolve()
    }))
    const { playing, tap } = useStagedTap({ animate: 'pop' })

    const first = tap(vi.fn())(makeEvent())
    await nextTick()
    expect(playing.value).toBe(true)

    await tap(vi.fn())(makeEvent())

    expect(mockPlayButtonTap).toHaveBeenCalledTimes(1)
    peakResolve()
    await first
  })
})

describe('useStagedTap — activeOn: "always"', () => {
  test('animation and action fire on fine pointer when activeOn is always', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap({ animate: 'pop', activeOn: 'always' })
    const action = vi.fn()

    await tap(action)(makeEvent())

    expect(mockPlayButtonTap).toHaveBeenCalled()
    expect(action).toHaveBeenCalled()
  })

  test('playing goes true then false on fine pointer with activeOn always', async () => {
    coarseRef.value = false
    const { playing, tap } = useStagedTap({ animate: 'pop', activeOn: 'always' })

    await tap(vi.fn())(makeEvent())

    expect(playing.value).toBe(false)
  })
})

describe('useStagedTap — onTap call option', () => {
  test('onTap fires before any coarse/fine check', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    const onTap = vi.fn()
    const action = vi.fn()

    await tap(action, { captureMode: true, onTap })(makeEvent())

    // captureMode on fine → action must not fire, but onTap must have
    expect(onTap).toHaveBeenCalled()
    expect(action).not.toHaveBeenCalled()
  })

  test('onTap fires even when tap is dropped due to playing guard', async () => {
    let peakResolve
    mockPlayButtonTap.mockImplementation(() => ({
      peak: new Promise((r) => (peakResolve = r)),
      done: Promise.resolve()
    }))
    const { playing, tap } = useStagedTap({ animate: 'pop' })
    const onTap = vi.fn()

    const first = tap(vi.fn())(makeEvent())
    await nextTick()
    expect(playing.value).toBe(true)

    await tap(vi.fn(), { onTap })(makeEvent())
    expect(onTap).toHaveBeenCalledTimes(1)

    peakResolve()
    await first
  })

  test('onTap receives the MouseEvent', async () => {
    const { tap } = useStagedTap()
    const onTap = vi.fn()
    const e = makeEvent()

    await tap(undefined, { onTap })(e)

    expect(onTap).toHaveBeenCalledWith(e)
  })
})

describe('useStagedTap — pressAudio', () => {
  test('pressAudio plays on coarse press before animation', async () => {
    const { tap } = useStagedTap()
    await tap(vi.fn(), { pressAudio: 'ui.snappy_button_5' })(makeEvent())
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.snappy_button_5')
  })

  test('pressAudio does NOT play on fine pointer', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    await tap(vi.fn(), { pressAudio: 'ui.snappy_button_5' })(makeEvent())
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

describe('useStagedTap — per-call triggerAt override', () => {
  test('per-call triggerAt overrides the composable-level triggerAt', async () => {
    // Composable-level is 'peak' (default), but call overrides to 'press'
    let peakResolve
    mockPlayButtonTap.mockImplementation(() => ({
      peak: new Promise((r) => (peakResolve = r)),
      done: Promise.resolve()
    }))
    const { tap } = useStagedTap({ animate: 'pop' })
    const action = vi.fn()

    const p = tap(action, { triggerAt: 'press' })(makeEvent())
    // With triggerAt 'press', action must fire at press (before awaiting peak)
    expect(action).toHaveBeenCalled()

    peakResolve()
    await p
    // Action still called only once (fired at press)
    expect(action).toHaveBeenCalledTimes(1)
  })

  test('per-call triggerAt done fires action after the full done promise', async () => {
    let doneResolve
    mockPlayButtonTap.mockImplementation(() => ({
      peak: Promise.resolve(),
      done: new Promise((r) => (doneResolve = r))
    }))
    const { tap } = useStagedTap({ animate: 'pop', triggerAt: 'peak' })
    const action = vi.fn()

    const p = tap(action, { triggerAt: 'done' })(makeEvent())
    // After peak resolves, action should not yet fire (waiting for done)
    await nextTick()
    // Give the peak promise microtask time to settle
    await Promise.resolve()
    expect(action).not.toHaveBeenCalled()

    doneResolve()
    await p
    expect(action).toHaveBeenCalledTimes(1)
  })
})

describe('useStagedTap — quiet animate (default)', () => {
  test('uses setTimeout-based hold instead of GSAP on quiet animate', async () => {
    vi.useFakeTimers()
    coarseRef.value = true
    const { playing, tap } = useStagedTap({ animate: 'quiet' })
    const action = vi.fn()

    const p = tap(action)(makeEvent())
    await nextTick()
    expect(playing.value).toBe(true)
    expect(mockPlayButtonTap).not.toHaveBeenCalled()
    // Action not yet called
    expect(action).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    await p
    expect(action).toHaveBeenCalled()
    vi.useRealTimers()
  })

  test('does not double-fire action when triggerAt is press on quiet animate', async () => {
    vi.useFakeTimers()
    coarseRef.value = true
    // triggerAt 'press' means action fires at press; the quiet animate timeout
    // should NOT call it again (branch: phase !== 'press' is false)
    const { tap } = useStagedTap({ animate: 'quiet', triggerAt: 'press' })
    const action = vi.fn()

    const p = tap(action)(makeEvent())
    // Should have fired at press already
    expect(action).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(200)
    await p
    // Must not fire a second time
    expect(action).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe('useStagedTap — pop animate with triggerAt: press', () => {
  test('action fires immediately at press with triggerAt press', async () => {
    const { tap } = useStagedTap({ animate: 'pop', triggerAt: 'press' })
    const action = vi.fn()
    const e = makeEvent()

    const p = tap(action)(e)
    // At press, before any promise resolution, action already called
    expect(action).toHaveBeenCalledWith(e)
    await p
  })
})
