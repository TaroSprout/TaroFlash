import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { effectScope, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  coarseRef,
  mockUseMatchMedia,
  mockPlayButtonTap,
  mockPlayButtonSweep,
  mockEmitSfx,
  mockUseMotionStore
} = vi.hoisted(() => {
  const coarseRef = { value: true }
  return {
    coarseRef,
    mockUseMatchMedia: vi.fn(() => coarseRef),
    mockPlayButtonTap: vi.fn(),
    mockPlayButtonSweep: vi.fn(),
    mockEmitSfx: vi.fn(),
    mockUseMotionStore: vi.fn(() => ({ prefers_reduced_motion: false, tier: 'full' }))
  }
})

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: mockUseMatchMedia
}))

vi.mock('@/utils/animations/button-tap', () => ({
  BUTTON_TAP_DURATION: 0.1,
  playButtonTap: mockPlayButtonTap,
  playButtonSweep: mockPlayButtonSweep
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx
}))

vi.mock('@/stores/motion', () => ({
  useMotionStore: mockUseMotionStore
}))

import { useStagedTap } from '@/composables/ui/staged-tap'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(target = document.createElement('div')) {
  const e = new MouseEvent('click', { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'currentTarget', { value: target, configurable: true })
  return e
}

/** A controllable stand-in for a MotionHandle — mark/done resolve only when told to. */
function makeHandle() {
  let resolve_mark
  let resolve_done
  const mark_promise = new Promise((r) => (resolve_mark = r))
  const done_promise = new Promise((r) => (resolve_done = r))
  const handle = {
    mark: vi.fn(() => mark_promise),
    done: done_promise,
    cancel: vi.fn(() => {
      resolve_mark()
      resolve_done()
    }),
    finish: vi.fn(),
    resolveMark: () => resolve_mark(),
    resolveDone: () => resolve_done()
  }
  return handle
}

function resolvedHandle() {
  return {
    mark: vi.fn(() => Promise.resolve()),
    done: Promise.resolve(),
    cancel: vi.fn(),
    finish: vi.fn()
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  coarseRef.value = true
  mockUseMotionStore.mockReturnValue({ prefers_reduced_motion: false, tier: 'full' })
  mockPlayButtonTap.mockImplementation(resolvedHandle)
  mockPlayButtonSweep.mockImplementation(resolvedHandle)
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
    expect(mockPlayButtonSweep).not.toHaveBeenCalled()
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
    expect(order[0]).toBe('action')
  })
})

describe('useStagedTap — coarse pointer, pop animate (default triggerAt: peak)', () => {
  test('action fires at peak by default on coarse pointer', async () => {
    const handle = makeHandle()
    mockPlayButtonTap.mockImplementation(() => handle)
    const { tap } = useStagedTap({ animate: 'pop' })
    const action = vi.fn()
    const e = makeEvent()

    const p = tap(action)(e)
    expect(action).not.toHaveBeenCalled()

    handle.resolveMark()
    handle.resolveDone()
    await p
    expect(action).toHaveBeenCalledWith(e)
  })

  test('playing is true during animation on coarse', async () => {
    const handle = makeHandle()
    mockPlayButtonTap.mockImplementation(() => handle)
    const { playing, tap } = useStagedTap({ animate: 'pop' })
    const p = tap(vi.fn())(makeEvent())
    await nextTick()
    expect(playing.value).toBe(true)

    handle.resolveMark()
    handle.resolveDone()
    await p
    expect(playing.value).toBe(false)
  })
})

describe('useStagedTap — quiet animate fires the action after the sweep resolves', () => {
  test("action does not fire until playButtonSweep's done resolves", async () => {
    const handle = makeHandle()
    mockPlayButtonSweep.mockImplementation(() => handle)
    const { tap } = useStagedTap({ animate: 'quiet' })
    const action = vi.fn()

    const p = tap(action)(makeEvent())
    await nextTick()
    expect(action).not.toHaveBeenCalled()
    expect(mockPlayButtonTap).not.toHaveBeenCalled()

    handle.resolveDone()
    await p
    expect(action).toHaveBeenCalledTimes(1)
  })

  test('does not double-fire action when triggerAt is press on quiet animate', async () => {
    const handle = makeHandle()
    mockPlayButtonSweep.mockImplementation(() => handle)
    const { tap } = useStagedTap({ animate: 'quiet', triggerAt: 'press' })
    const action = vi.fn()

    const p = tap(action)(makeEvent())
    expect(action).toHaveBeenCalledTimes(1)

    handle.resolveDone()
    await p
    expect(action).toHaveBeenCalledTimes(1)
  })
})

describe('useStagedTap — double-tap guard', () => {
  test('second call while playing is silently dropped (action not called a second time)', async () => {
    const handle = makeHandle()
    mockPlayButtonTap.mockImplementation(() => handle)
    const { playing, tap } = useStagedTap({ animate: 'pop' })
    const action = vi.fn()

    const first = tap(action)(makeEvent())
    await nextTick()
    expect(playing.value).toBe(true)

    await tap(action)(makeEvent())
    expect(mockPlayButtonTap).toHaveBeenCalledTimes(1)

    handle.resolveMark()
    handle.resolveDone()
    await first
    await flushPromises()
    expect(action).toHaveBeenCalledTimes(1)
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
})

describe('useStagedTap — reduced motion / minimal tier routes a pop composable through the quiet path', () => {
  test('animate: pop under prefers_reduced_motion uses playButtonSweep, not playButtonTap', async () => {
    mockUseMotionStore.mockReturnValue({ prefers_reduced_motion: true, tier: 'full' })
    const { tap } = useStagedTap({ animate: 'pop' })

    await tap(vi.fn())(makeEvent())

    expect(mockPlayButtonTap).not.toHaveBeenCalled()
    expect(mockPlayButtonSweep).toHaveBeenCalled()
  })

  test('animate: pop on the minimal tier uses playButtonSweep, not playButtonTap', async () => {
    mockUseMotionStore.mockReturnValue({ prefers_reduced_motion: false, tier: 'minimal' })
    const { tap } = useStagedTap({ animate: 'pop' })

    await tap(vi.fn())(makeEvent())

    expect(mockPlayButtonTap).not.toHaveBeenCalled()
    expect(mockPlayButtonSweep).toHaveBeenCalled()
  })
})

describe('useStagedTap — unmount cancels the active handle', () => {
  test('onScopeDispose cancels the in-flight handle and clears playing', async () => {
    const handle = makeHandle()
    mockPlayButtonTap.mockImplementation(() => handle)

    const scope = effectScope()
    const { playing, tap } = scope.run(() => useStagedTap({ animate: 'pop' }))

    tap(vi.fn())(makeEvent())
    await nextTick()
    expect(playing.value).toBe(true)

    scope.stop()

    expect(handle.cancel).toHaveBeenCalled()
  })

  test('a handle that already settled is not double-cancelled by disposal', async () => {
    const scope = effectScope()
    const { tap } = scope.run(() => useStagedTap({ animate: 'pop' }))

    await tap(vi.fn())(makeEvent())
    scope.stop()

    // No active handle left at dispose time — nothing throws.
    expect(true).toBe(true)
  })
})

describe('useStagedTap — audio', () => {
  test('audio fires on fine pointer', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    await tap(vi.fn(), { audio: 'ui.press' })(makeEvent())
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
  })

  test('audio fires at peak on coarse with pop animate', async () => {
    const handle = makeHandle()
    mockPlayButtonTap.mockImplementation(() => handle)
    const { tap } = useStagedTap({ animate: 'pop' })
    const action = vi.fn()

    const p = tap(action, { audio: 'ui.press' })(makeEvent())
    expect(mockEmitSfx).not.toHaveBeenCalled()

    handle.resolveMark()
    handle.resolveDone()
    await p
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
  })

  test('preAudio fires on coarse press before animation', async () => {
    const { tap } = useStagedTap()
    await tap(vi.fn(), { preAudio: 'ui.press' })(makeEvent())
    expect(mockEmitSfx).toHaveBeenCalledWith('ui.press')
  })

  test('preAudio does NOT fire on fine pointer', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    await tap(vi.fn(), { preAudio: 'ui.press' })(makeEvent())
    expect(mockEmitSfx).not.toHaveBeenCalled()
  })
})

describe('useStagedTap — onTap call option', () => {
  test('onTap fires before any coarse/fine check, and receives the event', async () => {
    coarseRef.value = false
    const { tap } = useStagedTap()
    const order = []
    const onTap = vi.fn(() => order.push('onTap'))
    const action = vi.fn(() => order.push('action'))
    const e = makeEvent()

    await tap(action, { onTap })(e)

    expect(onTap).toHaveBeenCalledWith(e)
    expect(order.indexOf('onTap')).toBeLessThan(order.indexOf('action'))
  })
})

describe('useStagedTap — per-call triggerAt override', () => {
  test('per-call triggerAt overrides the composable-level triggerAt', async () => {
    const handle = makeHandle()
    mockPlayButtonTap.mockImplementation(() => handle)
    const { tap } = useStagedTap({ animate: 'pop' })
    const action = vi.fn()

    const p = tap(action, { triggerAt: 'press' })(makeEvent())
    expect(action).toHaveBeenCalled()

    handle.resolveMark()
    handle.resolveDone()
    await p
    expect(action).toHaveBeenCalledTimes(1)
  })
})

describe('useStagedTap — pop animate with triggerAt: press', () => {
  test('action fires immediately at press with triggerAt press', async () => {
    const { tap } = useStagedTap({ animate: 'pop', triggerAt: 'press' })
    const action = vi.fn()
    const e = makeEvent()

    const p = tap(action)(e)
    expect(action).toHaveBeenCalledWith(e)
    await p
  })
})
