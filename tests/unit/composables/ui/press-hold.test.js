import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { createApp } from 'vue'
import { usePressHold } from '@/composables/ui/press-hold'

// jsdom does not implement PointerEvent; shim it as a MouseEvent subclass so
// clientX/clientY/pointerType are readable.
if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init)
      this.pointerType = init.pointerType ?? 'touch'
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pointerEvent(type, opts = {}) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    ...opts
  })
}

function withSetup(composable) {
  let result
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  const el = document.createElement('div')
  document.body.appendChild(el)
  app.mount(el)
  return { result, app, el }
}

let app

afterEach(() => {
  app?.unmount()
  app = null
  // Flush any swallow listener a test left registered (e.g. a hold that
  // completed but whose resulting click was never dispatched) so it can't
  // eat the next test's first click.
  document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  vi.useRealTimers()
})

// ── arm / hold lifecycle ────────────────────────────────────────────────────

describe('usePressHold — arm/hold lifecycle', () => {
  test('onHold fires once the pointer holds past duration without drifting', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200, tolerance: 8 })))
    const onHold = vi.fn()

    hold.arm(pointerEvent('pointerdown'), onHold)
    vi.advanceTimersByTime(200)

    expect(onHold).toHaveBeenCalledTimes(1)
  })

  test('a quick release before duration cancels — onHold never fires [obligation]', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))
    const onHold = vi.fn()

    hold.arm(pointerEvent('pointerdown'), onHold)
    window.dispatchEvent(pointerEvent('pointerup'))
    vi.advanceTimersByTime(200)

    expect(onHold).not.toHaveBeenCalled()
  })

  test('the click following a cancelled (quick tap) hold is NOT swallowed — tap path regression-free [obligation]', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))

    hold.arm(pointerEvent('pointerdown'), vi.fn())
    window.dispatchEvent(pointerEvent('pointerup'))
    vi.advanceTimersByTime(200)

    const click_handler = vi.fn()
    document.addEventListener('click', click_handler)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(click_handler).toHaveBeenCalledTimes(1)
    document.removeEventListener('click', click_handler)
  })

  test('pointer movement beyond tolerance cancels the pending hold — scroll gestures win [obligation]', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200, tolerance: 8 })))
    const onHold = vi.fn()

    hold.arm(pointerEvent('pointerdown', { clientX: 0, clientY: 0 }), onHold)
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 20, clientY: 0 }))
    vi.advanceTimersByTime(200)

    expect(onHold).not.toHaveBeenCalled()
  })

  test('pointer movement within tolerance does not cancel the pending hold', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200, tolerance: 8 })))
    const onHold = vi.fn()

    hold.arm(pointerEvent('pointerdown', { clientX: 0, clientY: 0 }), onHold)
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 3, clientY: 0 }))
    vi.advanceTimersByTime(200)

    expect(onHold).toHaveBeenCalledTimes(1)
  })

  test('pointercancel aborts the pending hold', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))
    const onHold = vi.fn()

    hold.arm(pointerEvent('pointerdown'), onHold)
    window.dispatchEvent(pointerEvent('pointercancel'))
    vi.advanceTimersByTime(200)

    expect(onHold).not.toHaveBeenCalled()
  })

  test('cancel() aborts a pending hold and is idempotent', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))
    const onHold = vi.fn()

    hold.arm(pointerEvent('pointerdown'), onHold)
    hold.cancel()
    hold.cancel()
    vi.advanceTimersByTime(200)

    expect(onHold).not.toHaveBeenCalled()
  })

  test('arming again replaces any pending hold with a fresh origin/timer', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))
    const first = vi.fn()
    const second = vi.fn()

    hold.arm(pointerEvent('pointerdown'), first)
    hold.arm(pointerEvent('pointerdown'), second)
    vi.advanceTimersByTime(200)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  test('arming does not mutate the armed element touch-action — idle cards keep scrolling the page [obligation]', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold()))
    const el = document.createElement('div')
    document.body.appendChild(el)
    const event = pointerEvent('pointerdown')
    Object.defineProperty(event, 'target', { value: el })

    hold.arm(event, vi.fn())

    expect(el.style.getPropertyValue('touch-action')).toBe('')
    el.remove()
  })
})

// ── click-swallow contract after a completed hold ──────────────────────────

describe('usePressHold — click swallow after a completed hold [obligation]', () => {
  test('a completed hold swallows the very next click at document capture', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))

    hold.arm(pointerEvent('pointerdown'), vi.fn())
    vi.advanceTimersByTime(200)

    const click_handler = vi.fn()
    document.addEventListener('click', click_handler)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(click_handler).not.toHaveBeenCalled()
    document.removeEventListener('click', click_handler)
  })

  test('the swallow is one-shot — a second click passes through normally', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))

    hold.arm(pointerEvent('pointerdown'), vi.fn())
    vi.advanceTimersByTime(200)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    const click_handler = vi.fn()
    document.addEventListener('click', click_handler)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(click_handler).toHaveBeenCalledTimes(1)
    document.removeEventListener('click', click_handler)
  })

  test('a capture listener registered AFTER the hold completes does not see the swallowed click [obligation]', () => {
    // Regression: with plain stopPropagation, another document-capture
    // listener registered after this one (e.g. the popover's outside-click
    // close) still ran on the release click and closed the menu instantly.
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))

    hold.arm(pointerEvent('pointerdown'), vi.fn())
    vi.advanceTimersByTime(200)

    const late_listener = vi.fn()
    document.addEventListener('click', late_listener, { capture: true })
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(late_listener).not.toHaveBeenCalled()
    document.removeEventListener('click', late_listener, { capture: true })
  })

  test('the swallow expires on its own if no click ever arrives, so a later click passes through', () => {
    vi.useFakeTimers()
    let hold
    ;({ app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))

    hold.arm(pointerEvent('pointerdown'), vi.fn())
    vi.advanceTimersByTime(200)
    vi.advanceTimersByTime(350)

    const click_handler = vi.fn()
    document.addEventListener('click', click_handler)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(click_handler).toHaveBeenCalledTimes(1)
    document.removeEventListener('click', click_handler)
  })
})

// ── scope teardown ──────────────────────────────────────────────────────────

describe('usePressHold — scope teardown', () => {
  test('unmounting the owning scope cancels any pending hold', () => {
    vi.useFakeTimers()
    let hold
    let local_app
    ;({ app: local_app, result: hold } = withSetup(() => usePressHold({ duration: 200 })))
    const onHold = vi.fn()

    hold.arm(pointerEvent('pointerdown'), onHold)
    local_app.unmount()
    vi.advanceTimersByTime(200)

    expect(onHold).not.toHaveBeenCalled()
  })
})
