import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

let stateChangeCb
const offStateChange = vi.fn()

const engineMock = {
  resume: vi.fn().mockResolvedValue(true),
  unlock: vi.fn(),
  state: vi.fn(() => 'suspended'),
  onStateChange: vi.fn((cb) => {
    stateChangeCb = cb
    return offStateChange
  }),
  play: vi.fn(),
  decode: vi.fn(),
  onUnlock: vi.fn(),
  isUnlocked: vi.fn(() => true)
}

vi.mock('@/sfx/engine', () => ({ default: engineMock }))

async function loadLifecycle() {
  const mod = await import('@/sfx/lifecycle')
  return mod.installAudioLifecycle
}

function fireVisibility(state) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

function firePageShow(persisted = false) {
  const event = new Event('pageshow')
  Object.defineProperty(event, 'persisted', { value: persisted })
  window.dispatchEvent(event)
}

// Controls navigator.userActivation.hasBeenActive, the gate on speculative
// resume() calls. `undefined` simulates a browser/state where no gesture has
// been recorded yet (or the API is unsupported).
function setUserActivation(hasBeenActive) {
  Object.defineProperty(navigator, 'userActivation', {
    configurable: true,
    value: hasBeenActive === undefined ? undefined : { hasBeenActive }
  })
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('installAudioLifecycle', () => {
  let teardown

  beforeEach(() => {
    vi.resetModules()
    stateChangeCb = undefined
    offStateChange.mockClear()
    engineMock.resume.mockReset().mockResolvedValue(true)
    engineMock.unlock.mockClear()
    engineMock.state.mockReset().mockReturnValue('suspended')
    engineMock.onStateChange.mockClear()
    engineMock.isUnlocked.mockReset().mockReturnValue(true)
    // Existing tests below assert on the opportunistic resume() call itself,
    // not the userActivation gate — default to "gesture already happened" so
    // that behavior is unchanged. The gate gets its own describe block.
    setUserActivation(true)
  })

  afterEach(() => {
    setUserActivation(undefined)
  })

  afterEach(() => {
    teardown?.()
    teardown = undefined
  })

  test('resumes opportunistically at install when the context is suspended', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('does nothing at install when the context is already running', async () => {
    engineMock.state.mockReturnValue('running')
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    expect(engineMock.resume).not.toHaveBeenCalled()
  })

  test('resumes when the tab becomes visible', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('ignores the visibility change when the tab hides', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    fireVisibility('hidden')
    await flushMicrotasks()

    expect(engineMock.resume).not.toHaveBeenCalled()
  })

  test('resumes on pageshow', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    window.dispatchEvent(new Event('pageshow'))
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('resumes on window focus', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    window.dispatchEvent(new Event('focus'))
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('resumes when the engine reports a non-running statechange', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    stateChangeCb()
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('ignores statechange while the engine is running', async () => {
    engineMock.state.mockReturnValue('running')
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    stateChangeCb()
    await flushMicrotasks()

    expect(engineMock.resume).not.toHaveBeenCalled()
  })

  test('unlocks the engine on the next gesture', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    window.dispatchEvent(new Event('click'))
    await flushMicrotasks()

    expect(engineMock.unlock).toHaveBeenCalledTimes(1)
  })

  test('gesture unlock fires even when a bubble-phase stopPropagation blocks the event [obligation]', async () => {
    // Regression guard: the lifecycle listener must be in CAPTURE phase so that a
    // descendant's @click.stop (bubble-phase stopPropagation) cannot swallow the
    // event before window sees it. Capture runs window→target, ahead of any
    // descendant stopPropagation call.
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    // Simulate a descendant with @click.stop (e.g. the dropdown caret)
    const el = document.createElement('button')
    document.body.appendChild(el)
    el.addEventListener('click', (e) => e.stopPropagation()) // bubble-phase, blocks window

    // Dispatch a bubbling click from the child element. A bubble-phase window
    // listener would never receive this (stopPropagation blocks it), but a
    // capture-phase listener fires before stopPropagation has any effect.
    el.dispatchEvent(new Event('click', { bubbles: true }))
    await flushMicrotasks()

    expect(engineMock.unlock).toHaveBeenCalledTimes(1)

    document.body.removeChild(el)
  })

  test('the gesture unlock fires only once across event types', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    window.dispatchEvent(new Event('touchend'))
    window.dispatchEvent(new KeyboardEvent('keydown'))
    window.dispatchEvent(new Event('click'))
    await flushMicrotasks()

    expect(engineMock.unlock).toHaveBeenCalledTimes(1)
  })

  test('teardown removes every listener', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()

    teardown()
    teardown = undefined
    expect(offStateChange).toHaveBeenCalledTimes(1)

    engineMock.resume.mockClear()
    fireVisibility('visible')
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('focus'))
    await flushMicrotasks()

    expect(engineMock.resume).not.toHaveBeenCalled()
  })

  test('a second install without teardown is a noop', async () => {
    const install = await loadLifecycle()
    teardown = install()
    await flushMicrotasks()
    engineMock.resume.mockClear()

    const noopTeardown = install()

    fireVisibility('visible')
    await flushMicrotasks()

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
    expect(typeof noopTeardown).toBe('function')
    noopTeardown()
  })

  describe('background recovery (hidden→visible) — unconditional forced unlock [obligation]', () => {
    test('arms a forced gesture retry even when the engine reports running', async () => {
      engineMock.state.mockReturnValue('running')
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()

      fireVisibility('hidden')
      fireVisibility('visible')
      await flushMicrotasks()

      window.dispatchEvent(new Event('click'))
      await flushMicrotasks()

      expect(engineMock.unlock).toHaveBeenCalledWith(true)
    })

    test('a plain focus event (no prior hide) still takes the old running short-circuit', async () => {
      engineMock.state.mockReturnValue('running')
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()

      window.dispatchEvent(new Event('focus'))
      await flushMicrotasks()

      window.dispatchEvent(new Event('click'))
      await flushMicrotasks()

      expect(engineMock.unlock).not.toHaveBeenCalled()
    })

    test('pageshow with event.persisted true triggers the same unconditional forced recovery', async () => {
      engineMock.state.mockReturnValue('running')
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()

      firePageShow(true)
      await flushMicrotasks()

      window.dispatchEvent(new Event('click'))
      await flushMicrotasks()

      expect(engineMock.unlock).toHaveBeenCalledWith(true)
    })

    test('the forced flag resets after firing once — the next gesture-armed cycle unlocks unforced', async () => {
      engineMock.state.mockReturnValue('running')
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()

      fireVisibility('hidden')
      fireVisibility('visible')
      await flushMicrotasks()
      window.dispatchEvent(new Event('click'))
      await flushMicrotasks()

      expect(engineMock.unlock).toHaveBeenCalledWith(true)
      engineMock.unlock.mockClear()

      // A later recovery cycle where the engine is genuinely not running arms
      // the gesture retry unforced — the consumed flag must not leak forward.
      engineMock.state.mockReturnValue('suspended')
      window.dispatchEvent(new Event('focus'))
      await flushMicrotasks()
      window.dispatchEvent(new Event('click'))
      await flushMicrotasks()

      expect(engineMock.unlock).toHaveBeenCalledWith(false)
    })
  })

  describe('navigator.userActivation gate on opportunistic resume() [obligation]', () => {
    test('does not call resume() when hasBeenActive is false', async () => {
      setUserActivation(false)
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()

      expect(engineMock.resume).not.toHaveBeenCalled()
    })

    test('does not call resume() when userActivation is unsupported (undefined)', async () => {
      setUserActivation(undefined)
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()

      expect(engineMock.resume).not.toHaveBeenCalled()
    })

    test('still calls resume() when hasBeenActive is true', async () => {
      setUserActivation(true)
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()

      expect(engineMock.resume).toHaveBeenCalledTimes(1)
    })

    test('background recovery also skips resume() when hasBeenActive is false', async () => {
      setUserActivation(false)
      engineMock.state.mockReturnValue('running')
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()

      fireVisibility('hidden')
      fireVisibility('visible')
      await flushMicrotasks()

      expect(engineMock.resume).not.toHaveBeenCalled()
    })

    test('background recovery calls resume() when hasBeenActive is true', async () => {
      setUserActivation(true)
      engineMock.state.mockReturnValue('running')
      const install = await loadLifecycle()
      teardown = install()
      await flushMicrotasks()
      engineMock.resume.mockClear()

      fireVisibility('hidden')
      fireVisibility('visible')
      await flushMicrotasks()

      expect(engineMock.resume).toHaveBeenCalledTimes(1)
    })
  })

  describe('self-healing re-arm on a failed unlock attempt [obligation]', () => {
    // Fake timers here (rather than the file's real-time flushMicrotasks
    // helper) so the UNLOCK_CHECK_MS wait can't bleed into other tests' own
    // pending self-heal timeouts sharing the same real clock.
    test('re-arms the gesture retry when isUnlocked() is still false UNLOCK_CHECK_MS after a gesture unlock [obligation]', async () => {
      vi.useFakeTimers()
      engineMock.isUnlocked.mockReturnValue(false)
      const install = await loadLifecycle()
      teardown = install()
      await vi.advanceTimersByTimeAsync(0)

      window.dispatchEvent(new Event('click'))
      await vi.advanceTimersByTimeAsync(0)
      expect(engineMock.unlock).toHaveBeenCalledTimes(1)

      // Unlock never actually landed — advance past UNLOCK_CHECK_MS (300ms)
      // for the self-healing check to re-arm the gesture listeners.
      await vi.advanceTimersByTimeAsync(320)

      window.dispatchEvent(new Event('click'))
      await vi.advanceTimersByTimeAsync(0)

      expect(engineMock.unlock).toHaveBeenCalledTimes(2)
      vi.useRealTimers()
    })

    test('does NOT re-arm when isUnlocked() reports true within the check window [obligation]', async () => {
      vi.useFakeTimers()
      engineMock.isUnlocked.mockReturnValue(true)
      const install = await loadLifecycle()
      teardown = install()
      await vi.advanceTimersByTimeAsync(0)

      window.dispatchEvent(new Event('click'))
      await vi.advanceTimersByTimeAsync(0)
      expect(engineMock.unlock).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(320)

      window.dispatchEvent(new Event('click'))
      await vi.advanceTimersByTimeAsync(0)

      // No re-arm happened, so this second click has no listener to fire it again.
      expect(engineMock.unlock).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
    })
  })
})
