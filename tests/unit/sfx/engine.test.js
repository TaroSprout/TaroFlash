/**
 * Unit tests for src/sfx/engine.ts
 *
 * Web Audio API is not implemented in jsdom. We install a fake AudioContext
 * constructor on `window` before each test module load. The constructor must
 * be a real `function` — arrow functions cannot be `new`-ed, even wrapped in
 * vi.fn(). A plain `function` constructor + vi.spyOn on the instances works.
 *
 * Because engine.ts keeps module-level mutable state (ctx, unlocked, listeners)
 * every describe block that needs a clean slate calls `vi.resetModules()` and
 * re-imports before running its tests.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

// ─── Fake AudioContext factory ────────────────────────────────────────────────

function makeFakeContext(initialState = 'suspended') {
  const listeners = []
  return {
    _state: initialState,
    get state() {
      return this._state
    },
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn().mockResolvedValue({}),
    addEventListener: vi.fn(function (event, cb) {
      if (event === 'statechange') listeners.push(cb)
    }),
    removeEventListener: vi.fn(function (event, cb) {
      const idx = listeners.indexOf(cb)
      if (idx !== -1) listeners.splice(idx, 1)
    }),
    createBufferSource: vi.fn(function () {
      return {
        buffer: null,
        onended: null,
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
        start: vi.fn()
      }
    }),
    createGain: vi.fn(function () {
      return {
        gain: { value: 1 },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn()
      }
    }),
    createBuffer: vi.fn().mockReturnValue({}),
    // helpers for tests
    _dispatchStateChange() {
      listeners.forEach((cb) => cb())
    },
    _setState(newState) {
      this._state = newState
      this._dispatchStateChange()
    }
  }
}

// ─── Ctor builder ─────────────────────────────────────────────────────────────
// Returns a real constructor function (not an arrow) so `new Ctor()` works.
// `contexts` is populated in order of creation for test assertions.

function makeCtorWithContexts(contexts, stateSequence = []) {
  let call_count = 0
  function FakeAudioContext() {
    const initial = stateSequence[call_count] ?? 'suspended'
    call_count++
    const ctx = makeFakeContext(initial)
    contexts.push(ctx)
    return ctx
  }
  return FakeAudioContext
}

// Install Ctor on window and return a teardown.
function installCtor(Ctor, { webkit = false } = {}) {
  const key = webkit ? 'webkitAudioContext' : 'AudioContext'
  Object.defineProperty(window, key, { configurable: true, writable: true, value: Ctor })
  return () => {
    delete window[key]
  }
}

// Load a fresh copy of engine with window.AudioContext already set.
async function loadFreshEngine() {
  vi.resetModules()
  return (await import('@/sfx/engine')).default
}

afterEach(() => {
  delete window.AudioContext
  delete window.webkitAudioContext
})

// ─── graceful degradation — no AudioContext ───────────────────────────────────

describe('graceful degradation — no AudioContext', () => {
  let engine

  beforeEach(async () => {
    delete window.AudioContext
    delete window.webkitAudioContext
    engine = await loadFreshEngine()
  })

  test('decode() rejects with "Web Audio is unavailable"', async () => {
    await expect(engine.decode('/sound.wav')).rejects.toThrow('Web Audio is unavailable')
  })

  test('resume() returns false', async () => {
    expect(await engine.resume()).toBe(false)
  })

  test('unlock() returns without throwing', () => {
    expect(() => engine.unlock()).not.toThrow()
  })
})

// ─── resolveCtor — webkitAudioContext fallback ────────────────────────────────

describe('resolveCtor — webkitAudioContext fallback', () => {
  test('falls back to webkitAudioContext when AudioContext is absent', async () => {
    const contexts = []
    delete window.AudioContext
    // Provide enough states for the rebuild path (ensureContext + createContext)
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']), { webkit: true })
    const engine = await loadFreshEngine()

    engine.unlock()

    // At least one context was created via the webkit ctor, proving the fallback ran
    expect(contexts.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── unlock() — context already running ──────────────────────────────────────

describe('unlock() when context is already running', () => {
  let engine
  let contexts

  beforeEach(async () => {
    contexts = []
    installCtor(makeCtorWithContexts(contexts, ['running']))
    engine = await loadFreshEngine()
  })

  test('does not close or rebuild the context [obligation]', () => {
    engine.unlock()

    expect(contexts.length).toBe(1)
    expect(contexts[0].close).not.toHaveBeenCalled()
  })

  test('fires the onUnlock callback immediately [obligation]', () => {
    const cb = vi.fn()
    engine.onUnlock(cb)

    engine.unlock()

    expect(cb).toHaveBeenCalledTimes(1)
  })
})

// ─── unlock(force) — bypasses the running-state shortcut [obligation] ────────

describe('unlock(force) when context is already running [obligation]', () => {
  let engine
  let contexts

  beforeEach(async () => {
    contexts = []
    // Both calls to the ctor return 'running' — the original + the forced rebuild.
    installCtor(makeCtorWithContexts(contexts, ['running', 'running']))
    engine = await loadFreshEngine()
  })

  test('unlock(true) closes and rebuilds even though state is running', () => {
    engine.unlock(true)

    const old_ctx = contexts[0]
    expect(old_ctx.close).toHaveBeenCalledTimes(1)
    expect(contexts.length).toBe(2)
  })

  test('unlock(false) (default) does not close or rebuild when running', () => {
    engine.unlock(false)

    expect(contexts.length).toBe(1)
    expect(contexts[0].close).not.toHaveBeenCalled()
  })
})

// ─── unlock() — rebuild path (context suspended) ─────────────────────────────

describe('unlock() when context is suspended — rebuild path', () => {
  let engine
  let contexts

  beforeEach(async () => {
    contexts = []
    // Both contexts start suspended — tests that need the fresh one running
    // use _setState to advance it manually.
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    engine = await loadFreshEngine()
  })

  test('removes statechange listener from old context and closes it [obligation]', () => {
    engine.unlock()

    const old_ctx = contexts[0]
    expect(old_ctx.removeEventListener).toHaveBeenCalledWith('statechange', expect.any(Function))
    expect(old_ctx.close).toHaveBeenCalledTimes(1)
  })

  test('creates a fresh AudioContext [obligation]', () => {
    engine.unlock()

    // ensureContext() creates context[0]; createContext() inside rebuild creates context[1]
    expect(contexts.length).toBe(2)
  })

  test('fires onUnlock via statechange once fresh context reaches running [obligation]', () => {
    const cb = vi.fn()
    engine.onUnlock(cb)

    engine.unlock()

    expect(cb).not.toHaveBeenCalled() // fresh context still suspended

    const fresh = contexts[1]
    fresh._setState('running')

    expect(cb).toHaveBeenCalledTimes(1)
  })

  test('marks unlocked synchronously when fresh context is born running [obligation]', async () => {
    const contexts2 = []
    // First call => suspended (ensureContext), second => running (fresh rebuild)
    installCtor(makeCtorWithContexts(contexts2, ['suspended', 'running']))
    const engine2 = await loadFreshEngine()

    const cb = vi.fn()
    engine2.onUnlock(cb)

    engine2.unlock()

    expect(cb).toHaveBeenCalledTimes(1)
  })
})

// ─── primeOutput guard ────────────────────────────────────────────────────────

describe('unlock() — primeOutput is fully guarded [obligation]', () => {
  test('unlock() does not throw and completes rebuild when priming calls throw', async () => {
    const contexts = []
    let call_count = 0

    function ThrowingPrimeCtor() {
      call_count++
      const ctx = makeFakeContext('suspended')
      if (call_count === 2) {
        ctx.createBufferSource = vi.fn(() => {
          throw new Error('priming exploded')
        })
      }
      contexts.push(ctx)
      return ctx
    }

    installCtor(ThrowingPrimeCtor)
    const engine = await loadFreshEngine()

    expect(() => engine.unlock()).not.toThrow()
    expect(contexts.length).toBe(2) // rebuild happened despite priming error
  })
})

// ─── markUnlocked — one-shot ──────────────────────────────────────────────────

describe('markUnlocked — one-shot [obligation]', () => {
  let engine
  let contexts

  beforeEach(async () => {
    contexts = []
    installCtor(makeCtorWithContexts(contexts, ['running']))
    engine = await loadFreshEngine()
  })

  test('onUnlock fires at most once even if statechange fires multiple times', () => {
    const cb = vi.fn()
    engine.onUnlock(cb)

    engine.unlock() // marks unlocked, fires cb once
    contexts[0]._dispatchStateChange() // spurious statechange
    contexts[0]._dispatchStateChange()

    expect(cb).toHaveBeenCalledTimes(1)
  })

  test('onUnlock fires at most once even if unlock() is called again', () => {
    const cb = vi.fn()
    engine.onUnlock(cb)

    engine.unlock()
    engine.unlock()

    expect(cb).toHaveBeenCalledTimes(1)
  })
})

// ─── onUnlock ────────────────────────────────────────────────────────────────

describe('onUnlock()', () => {
  test('invokes callback immediately if already unlocked [obligation]', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['running']))
    const engine = await loadFreshEngine()

    engine.unlock() // now unlocked

    const cb = vi.fn()
    engine.onUnlock(cb)

    expect(cb).toHaveBeenCalledTimes(1)
  })

  test('returns a working unsubscribe that prevents the callback from firing', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'running']))
    const engine = await loadFreshEngine()

    const cb = vi.fn()
    const unsub = engine.onUnlock(cb)

    unsub()

    engine.unlock() // would mark unlocked + fire unlock_listeners, but cb was removed

    expect(cb).not.toHaveBeenCalled()
  })
})

// ─── onStateChange ───────────────────────────────────────────────────────────

describe('onStateChange()', () => {
  let engine
  let contexts

  beforeEach(async () => {
    contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    engine = await loadFreshEngine()
  })

  test('notifies state listeners on statechange', () => {
    const cb = vi.fn()
    engine.onStateChange(cb)

    engine.unlock() // creates the initial + fresh context
    contexts[contexts.length - 1]._dispatchStateChange()

    expect(cb).toHaveBeenCalled()
  })

  test('returns a working unsubscribe function', () => {
    const cb = vi.fn()
    const unsub = engine.onStateChange(cb)

    unsub()

    engine.unlock()
    contexts[contexts.length - 1]._dispatchStateChange()

    expect(cb).not.toHaveBeenCalled()
  })
})

// ─── play() ──────────────────────────────────────────────────────────────────

describe('play()', () => {
  test('resolves without starting playback when context is not running [obligation]', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    const engine = await loadFreshEngine()

    engine.unlock() // creates contexts but both are suspended

    // primeOutput may have called createBufferSource during unlock — snapshot count now
    const fresh = contexts[contexts.length - 1]
    const calls_before = fresh.createBufferSource.mock.calls.length

    const fake_buffer = { duration: 0.5 }
    const result = engine.play(fake_buffer, 1.0)

    // play() is now async and returns Promise<void> (no longer { ended })
    await expect(result).resolves.toBeUndefined()
    // play() itself must NOT create a BufferSource when context isn't running
    expect(fresh.createBufferSource.mock.calls.length).toBe(calls_before)
  })

  test('wires BufferSource→GainNode(volume)→destination, calls start(), resolves on onended [obligation]', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['running']))
    const engine = await loadFreshEngine()

    engine.unlock() // creates context[0] which is already running (no rebuild)

    const fake_buffer = { duration: 0.3 }
    // play() is now async — flush the `await resume()` microtask before asserting
    const played = engine.play(fake_buffer, 0.75)
    await Promise.resolve()

    const ctx = contexts[0]
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1)
    expect(ctx.createGain).toHaveBeenCalledTimes(1)

    const source = ctx.createBufferSource.mock.results[0].value
    const gain_node = ctx.createGain.mock.results[0].value

    expect(source.buffer).toBe(fake_buffer)
    expect(gain_node.gain.value).toBe(0.75)
    expect(source.start).toHaveBeenCalledTimes(1)

    // Resolve by triggering onended; played settles when the inner Promise resolves
    let resolved = false
    const done = played.then(() => {
      resolved = true
    })

    source.onended()
    await done

    expect(resolved).toBe(true)
    expect(source.disconnect).toHaveBeenCalled()
    expect(gain_node.disconnect).toHaveBeenCalled()
  })

  test('disconnects both source and gain via the fallback timer when onended never fires [obligation]', async () => {
    vi.useFakeTimers()
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['running']))
    const engine = await loadFreshEngine()
    engine.unlock()

    const fake_buffer = { duration: 0.5 }
    const played = engine.play(fake_buffer, 0.75)

    // Flush the await resume() microtask — advanceByTime(0) also drains microtasks
    await vi.advanceTimersByTimeAsync(0)

    const ctx = contexts[0]
    const source = ctx.createBufferSource.mock.results[0].value
    const gain_node = ctx.createGain.mock.results[0].value

    // Don't fire onended; advance past fallback (Math.ceil(0.5*1000)+500 = 1000ms)
    await vi.advanceTimersByTimeAsync(1000)
    await played

    expect(source.disconnect).toHaveBeenCalled()
    expect(gain_node.disconnect).toHaveBeenCalled()
    vi.useRealTimers()
  })
})

// ─── resume() ────────────────────────────────────────────────────────────────

describe('resume()', () => {
  test('returns true immediately when already running — no context.resume() call [obligation]', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['running']))
    const engine = await loadFreshEngine()

    engine.unlock() // creates contexts[0] (running)

    const result = await engine.resume()

    expect(result).toBe(true)
    expect(contexts[0].resume).not.toHaveBeenCalled()
  })

  test('awaits context.resume() and returns true when state becomes running [obligation]', async () => {
    const contexts = []
    function ResumingCtor() {
      const ctx = makeFakeContext('suspended')
      ctx.resume = vi.fn(async () => {
        ctx._state = 'running'
      })
      contexts.push(ctx)
      return ctx
    }
    installCtor(ResumingCtor)
    const engine = await loadFreshEngine()

    const result = await engine.resume()

    expect(result).toBe(true)
    expect(contexts[0].resume).toHaveBeenCalledTimes(1)
  })

  test('returns false when context.resume() rejects [obligation]', async () => {
    const contexts = []
    function RejectingCtor() {
      const ctx = makeFakeContext('suspended')
      ctx.resume = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
      contexts.push(ctx)
      return ctx
    }
    installCtor(RejectingCtor)
    const engine = await loadFreshEngine()

    const result = await engine.resume()

    expect(result).toBe(false)
  })

  test('returns false when no AudioContext exists [obligation]', async () => {
    delete window.AudioContext
    delete window.webkitAudioContext
    const engine = await loadFreshEngine()

    expect(await engine.resume()).toBe(false)
  })
})

// ─── decode() ────────────────────────────────────────────────────────────────

describe('decode()', () => {
  test('fetches url, calls decodeAudioData on arraybuffer, returns AudioBuffer [obligation]', async () => {
    const fake_array_buffer = new ArrayBuffer(8)
    const fake_audio_buffer = { duration: 0.5, numberOfChannels: 1 }

    const contexts = []
    function DecodingCtor() {
      const ctx = makeFakeContext('suspended')
      ctx.decodeAudioData = vi.fn().mockResolvedValue(fake_audio_buffer)
      contexts.push(ctx)
      return ctx
    }
    installCtor(DecodingCtor)

    const mock_fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(fake_array_buffer)
    })
    vi.stubGlobal('fetch', mock_fetch)

    const engine = await loadFreshEngine()

    const result = await engine.decode('/sounds/ping.wav')

    expect(mock_fetch).toHaveBeenCalledWith('/sounds/ping.wav')
    expect(contexts[0].decodeAudioData).toHaveBeenCalledWith(fake_array_buffer)
    expect(result).toBe(fake_audio_buffer)

    vi.unstubAllGlobals()
  })

  test('rejects with "Web Audio is unavailable" when no AudioContext', async () => {
    delete window.AudioContext
    delete window.webkitAudioContext
    const engine = await loadFreshEngine()

    await expect(engine.decode('/sound.wav')).rejects.toThrow('Web Audio is unavailable')
  })
})

// ─── notifyState() — recovery cycle ──────────────────────────────────────────

describe('notifyState() recovery cycle [obligation]', () => {
  test('unlock listener fires twice across running→suspended→running', async () => {
    // Both suspended: unlock() creates ctx[0] (ensureContext) + ctx[1] (rebuild)
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    const engine = await loadFreshEngine()

    engine.unlock()

    const cb = vi.fn()
    engine.onUnlock(cb)

    const current = contexts[1] // the fresh context; notifyState is attached here

    current._setState('running') // notifyState → markUnlocked → cb fires (1)
    expect(cb).toHaveBeenCalledTimes(1)

    current._setState('suspended') // notifyState → unlocked = false (latch reset)
    expect(cb).toHaveBeenCalledTimes(1)

    current._setState('running') // notifyState → markUnlocked (latch was reset) → cb fires (2)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  test('cb registered while already unlocked still fires on the next recovery cycle [obligation]', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    const engine = await loadFreshEngine()

    engine.unlock()
    const current = contexts[1]

    // Drive the context to running to set the unlocked latch
    current._setState('running')
    expect(engine.isUnlocked()).toBe(true)

    // Register cb while already unlocked — fires immediately AND stays in unlock_listeners
    const cb = vi.fn()
    engine.onUnlock(cb)
    expect(cb).toHaveBeenCalledTimes(1)

    // Suspension resets the latch
    current._setState('suspended')

    // Next running transition re-fires cb because it is still in unlock_listeners
    current._setState('running')
    expect(cb).toHaveBeenCalledTimes(2)
  })
})

// ─── isUnlocked() ────────────────────────────────────────────────────────────

describe('isUnlocked() [obligation]', () => {
  test('returns false before context reaches running', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    const engine = await loadFreshEngine()

    engine.unlock() // both contexts suspended — never calls markUnlocked
    expect(engine.isUnlocked()).toBe(false)
  })

  test('returns true after context reaches running', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    const engine = await loadFreshEngine()

    engine.unlock()
    contexts[1]._setState('running')
    expect(engine.isUnlocked()).toBe(true)
  })

  test('returns false after suspend, true again after the next running transition', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    const engine = await loadFreshEngine()

    engine.unlock()
    const ctx = contexts[1]

    ctx._setState('running')
    expect(engine.isUnlocked()).toBe(true)

    ctx._setState('suspended')
    expect(engine.isUnlocked()).toBe(false)

    ctx._setState('running')
    expect(engine.isUnlocked()).toBe(true)
  })
})

// ─── resume() timeout & clearTimeout ─────────────────────────────────────────

describe('resume() — timeout & clearTimeout [obligation]', () => {
  test('returns false and does not hang when context.resume() never settles', async () => {
    vi.useFakeTimers()
    const contexts = []
    function NeverSettlingCtor() {
      const ctx = makeFakeContext('suspended')
      ctx.resume = vi.fn(() => new Promise(() => {})) // never resolves or rejects
      contexts.push(ctx)
      return ctx
    }
    installCtor(NeverSettlingCtor)
    const engine = await loadFreshEngine()

    const promise = engine.resume()

    // Just before the 2000ms threshold: still pending
    await vi.advanceTimersByTimeAsync(1999)

    // At 2000ms: timeout fires, race rejects, catch() returns false
    await vi.advanceTimersByTimeAsync(1)
    const result = await promise

    expect(result).toBe(false)
    vi.useRealTimers()
  })

  test('clears the timeout when context.resume() settles before RESUME_TIMEOUT_MS', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const contexts = []
    function QuickResumeCtor() {
      const ctx = makeFakeContext('suspended')
      ctx.resume = vi.fn(async () => {
        ctx._state = 'running'
      })
      contexts.push(ctx)
      return ctx
    }
    installCtor(QuickResumeCtor)
    const engine = await loadFreshEngine()

    await engine.resume()

    // context.resume().finally(() => clearTimeout(id)) must have run
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})

// ─── state() ─────────────────────────────────────────────────────────────────

describe('state()', () => {
  test('returns undefined when no context has been created', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended']))
    const engine = await loadFreshEngine()

    expect(engine.state()).toBeUndefined()
  })

  test('returns the current context state after context creation', async () => {
    const contexts = []
    installCtor(makeCtorWithContexts(contexts, ['suspended', 'suspended']))
    const engine = await loadFreshEngine()

    engine.unlock()

    expect(engine.state()).toBe('suspended')
  })
})
