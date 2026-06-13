import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'

// ── Module-singleton reset ────────────────────────────────────────────────────
// use-window-refocus-guard keeps `pending` and `consumers` at module scope.
// We must re-import a fresh module between tests that mutate the singleton.
// The easiest approach: vi.resetModules() + dynamic re-import in each test.

// Shared window.addEventListener / removeEventListener spies
let addSpy
let removeSpy

beforeEach(() => {
  addSpy = vi.spyOn(window, 'addEventListener')
  removeSpy = vi.spyOn(window, 'removeEventListener')
  vi.useFakeTimers()
  vi.resetModules()
})

afterEach(() => {
  addSpy.mockRestore()
  removeSpy.mockRestore()
  vi.useRealTimers()
})

// ── Helper: mount a minimal Vue app that calls the composable ─────────────────
// Returns the composable result and an unmount fn (fires onScopeDispose).
async function withGuard(composableFn) {
  const { useWindowRefocusGuard } = await import('@/composables/use-window-refocus-guard')
  let result
  const app = createApp({
    setup() {
      result = composableFn ? composableFn(useWindowRefocusGuard) : useWindowRefocusGuard()
      return () => null
    }
  })
  app.mount(document.createElement('div'))
  return { result, unmount: () => app.unmount() }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWindowRefocusGuard — core flag semantics', () => {
  test('consumeWindowRefocus returns false when nothing is pending [obligation]', async () => {
    const { result, unmount } = await withGuard()
    expect(result.consumeWindowRefocus()).toBe(false)
    unmount()
  })

  test('flagWindowBlur then consumeWindowRefocus returns true once [obligation]', async () => {
    const { result, unmount } = await withGuard()

    result.flagWindowBlur()
    expect(result.consumeWindowRefocus()).toBe(true)
    unmount()
  })

  test('consumeWindowRefocus returns false after the flag has been consumed [obligation]', async () => {
    const { result, unmount } = await withGuard()

    result.flagWindowBlur()
    result.consumeWindowRefocus() // consume
    expect(result.consumeWindowRefocus()).toBe(false) // now empty
    unmount()
  })

  test('flagWindowBlur + consume can be cycled multiple times', async () => {
    const { result, unmount } = await withGuard()

    result.flagWindowBlur()
    expect(result.consumeWindowRefocus()).toBe(true)
    expect(result.consumeWindowRefocus()).toBe(false)

    result.flagWindowBlur()
    expect(result.consumeWindowRefocus()).toBe(true)

    unmount()
  })
})

describe('useWindowRefocusGuard — module singleton (shared pending flag) [obligation]', () => {
  test('flag set by one instance is consumable by another [obligation]', async () => {
    // Both instances share the same module-scope `pending` flag.
    const { useWindowRefocusGuard } = await import('@/composables/use-window-refocus-guard')
    const apps = []

    let guard1, guard2
    const app1 = createApp({
      setup() {
        guard1 = useWindowRefocusGuard()
        return () => null
      }
    })
    const app2 = createApp({
      setup() {
        guard2 = useWindowRefocusGuard()
        return () => null
      }
    })

    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    app1.mount(el1)
    app2.mount(el2)
    apps.push(app1, app2)

    // Guard1 sets the flag
    guard1.flagWindowBlur()

    // Guard2 can consume it — proves the flag is module-level, not instance-level
    expect(guard2.consumeWindowRefocus()).toBe(true)
    expect(guard1.consumeWindowRefocus()).toBe(false)

    apps.forEach((a) => a.unmount())
  })
})

describe('useWindowRefocusGuard — window focus listener lifecycle', () => {
  test('adds a focus listener when the first consumer mounts', async () => {
    const { unmount } = await withGuard()
    expect(addSpy).toHaveBeenCalledWith('focus', expect.any(Function))
    unmount()
  })

  test('removes the focus listener when the last consumer unmounts', async () => {
    const { unmount } = await withGuard()
    const addedHandler = addSpy.mock.calls.find(([event]) => event === 'focus')?.[1]
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('focus', addedHandler)
  })

  test('does NOT add a second listener when a second consumer mounts', async () => {
    const { useWindowRefocusGuard } = await import('@/composables/use-window-refocus-guard')
    const apps = []

    const app1 = createApp({
      setup() {
        useWindowRefocusGuard()
        return () => null
      }
    })
    const app2 = createApp({
      setup() {
        useWindowRefocusGuard()
        return () => null
      }
    })

    app1.mount(document.createElement('div'))
    const focusAddCallsAfterFirst = addSpy.mock.calls.filter(([e]) => e === 'focus').length
    app2.mount(document.createElement('div'))
    const focusAddCallsAfterSecond = addSpy.mock.calls.filter(([e]) => e === 'focus').length

    // Only 1 focus listener total across both mounts
    expect(focusAddCallsAfterFirst).toBe(1)
    expect(focusAddCallsAfterSecond).toBe(1)

    apps.push(app1, app2)
    apps.forEach((a) => a.unmount())
  })

  test('does NOT remove the listener when one of two consumers unmounts', async () => {
    const { useWindowRefocusGuard } = await import('@/composables/use-window-refocus-guard')

    const app1 = createApp({
      setup() {
        useWindowRefocusGuard()
        return () => null
      }
    })
    const app2 = createApp({
      setup() {
        useWindowRefocusGuard()
        return () => null
      }
    })

    app1.mount(document.createElement('div'))
    app2.mount(document.createElement('div'))
    removeSpy.mockClear()

    // Unmount only one — listener must stay
    app1.unmount()
    const focusRemoveCalls = removeSpy.mock.calls.filter(([e]) => e === 'focus').length
    expect(focusRemoveCalls).toBe(0)

    app2.unmount()
  })
})

describe('useWindowRefocusGuard — focus listener clears stale pending flag [obligation]', () => {
  test('window focus event clears a stale pending flag via requestAnimationFrame [obligation]', async () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      // Call the callback synchronously so we can assert immediately
      cb(0)
      return 0
    })

    const { result, unmount } = await withGuard()

    result.flagWindowBlur()
    // The focus event fires the clearPending rAF callback
    window.dispatchEvent(new Event('focus'))

    // After the rAF fires, pending should be cleared
    // consumeWindowRefocus returns false → pending was reset
    expect(result.consumeWindowRefocus()).toBe(false)

    rafSpy.mockRestore()
    unmount()
  })

  test('a consume before the rAF runs takes priority over the rAF clear', async () => {
    // The comment in source says: "The restoring focusin fires synchronously
    // when the window regains focus, before this rAF runs — so it consumes
    // `pending` first. This only sweeps up a stale flag."
    let rafCallback
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb // capture without running immediately
      return 0
    })

    const { result, unmount } = await withGuard()

    result.flagWindowBlur()
    window.dispatchEvent(new Event('focus')) // schedules rAF but does not run it yet

    // Simulate the focusin landing first (synchronously before rAF)
    const consumedBeforeRaf = result.consumeWindowRefocus()
    expect(consumedBeforeRaf).toBe(true) // was pending, consumed by focusin

    // Now the rAF fires — pending is already false, setting it false again is a no-op
    if (rafCallback) rafCallback(0)
    expect(result.consumeWindowRefocus()).toBe(false) // still empty

    rafSpy.mockRestore()
    unmount()
  })
})
