import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// Mirror AUDIO_VOLUME_DEFAULTS without importing from @/sfx/config (circular dep: config→player→config).
const AUDIO_VOLUME_DEFAULTS = { study_sounds: 5, interface_sounds: 5, hover_sounds: 5 }

// Each engine.play() returns a controllable handle so tests can fire 'ended'
// (or never fire it, to exercise the timeout fallback).
const playbacks = []

const engineMock = {
  resume: vi.fn().mockResolvedValue(true),
  play: vi.fn(() => {
    let resolve
    const ended = new Promise((r) => (resolve = r))
    playbacks.push({ ended, end: () => resolve() })
    return { ended }
  }),
  decode: vi.fn(),
  onStateChange: vi.fn(() => () => {}),
  onUnlock: vi.fn(),
  state: vi.fn(() => 'running')
}

vi.mock('@/sfx/engine', () => ({ default: engineMock }))

vi.mock('@/utils/debounce', () => ({
  debounce: (fn) => Promise.resolve(fn())
}))

const { default: audio_player } = await import('@/sfx/player')

// Two microtask turns: one for the awaited engine.resume(), one for the
// continuation that calls engine.play().
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

function loadSound(key, { volume = 0.5, duration = 0.2 } = {}) {
  const buffer = { duration }
  audio_player.loaded_sounds.set(key, { buffer, volume })
  return buffer
}

describe('audio_player._play', () => {
  beforeEach(() => {
    playbacks.length = 0
    engineMock.resume.mockReset().mockResolvedValue(true)
    engineMock.play.mockClear()
    audio_player.loaded_sounds.clear()
    audio_player.unlocked = true
    audio_player.queued_sound = undefined
    audio_player.blocking = false
    audio_player.volume_settings = { ...AUDIO_VOLUME_DEFAULTS }
    vi.useRealTimers()
  })

  test('plays through the engine when the context is running', async () => {
    loadSound('ui.click')

    const promise = audio_player.play('ui.click')
    await flush()
    expect(engineMock.play).toHaveBeenCalledTimes(1)

    playbacks[0].end()
    await promise

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('skips play when the context cannot be resumed', async () => {
    engineMock.resume.mockResolvedValue(false)
    loadSound('ui.click')

    await audio_player.play('ui.click')

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
    expect(engineMock.play).not.toHaveBeenCalled()
  })

  test('resolves when the playback ends', async () => {
    loadSound('ui.click')

    const promise = audio_player.play('ui.click')
    await flush()
    playbacks[0].end()

    await expect(promise).resolves.toBeUndefined()
  })

  test('resolves via the duration timeout fallback when playback never ends', async () => {
    vi.useFakeTimers()
    loadSound('ui.click', { duration: 0.1 })

    let settled = false
    const promise = audio_player.play('ui.click').then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(engineMock.play).toHaveBeenCalledTimes(1)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(700)
    await promise

    expect(settled).toBe(true)
  })

  test('enqueues when the audio system is not yet unlocked', async () => {
    audio_player.unlocked = false
    loadSound('ui.click')

    await audio_player.play('ui.click')

    expect(engineMock.play).not.toHaveBeenCalled()
    expect(audio_player.queued_sound).toEqual({ key: 'ui.click', options: {} })
  })

  test('throws when the sound is not loaded', async () => {
    await expect(audio_player.play('ui.missing')).rejects.toThrow('Sound "ui.missing" not loaded.')
  })

  test('sets the blocking flag synchronously when called with blocking', () => {
    loadSound('ui.select')

    audio_player.play('ui.select', { blocking: true })

    expect(audio_player.blocking).toBe(true)
  })

  test('drops a non-blocking sound while the blocking flag is set', async () => {
    loadSound('ui.select')
    loadSound('ui.click_07')

    const blocking_promise = audio_player.play('ui.select', { blocking: true })
    await audio_player.play('ui.click_07')
    await flush()

    expect(engineMock.play).toHaveBeenCalledTimes(1)

    playbacks[0].end()
    await blocking_promise
  })

  test('clears the blocking flag once the blocking sound ends', async () => {
    loadSound('ui.select')

    const promise = audio_player.play('ui.select', { blocking: true })
    expect(audio_player.blocking).toBe(true)

    await flush()
    playbacks[0].end()
    await promise

    expect(audio_player.blocking).toBe(false)
  })

  test('allows another blocking sound through while the flag is set (self-bypass)', async () => {
    loadSound('ui.select')
    loadSound('ui.click_07')

    const p1 = audio_player.play('ui.select', { blocking: true })
    const p2 = audio_player.play('ui.click_07', { blocking: true })
    await flush()

    expect(engineMock.play).toHaveBeenCalledTimes(2)

    playbacks[0].end()
    playbacks[1].end()
    await Promise.all([p1, p2])
  })

  test('clears the blocking flag when the context fails to resume', async () => {
    engineMock.resume.mockResolvedValue(false)
    loadSound('ui.select')

    await audio_player.play('ui.select', { blocking: true })

    expect(audio_player.blocking).toBe(false)
  })

  test('passes the volume option through to the engine', async () => {
    const buffer = loadSound('ui.click', { volume: 0.5 })

    const promise = audio_player.play('ui.click', { volume: 0.9 })
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.9)

    playbacks[0].end()
    await promise
  })

  test('falls back to the loaded volume when no volume option is given', async () => {
    const buffer = loadSound('ui.click', { volume: 0.3 })

    const promise = audio_player.play('ui.click')
    await flush()

    // Default setting is 5; multiplier = 5/5 = 1.0, so volume is unchanged
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.3)

    playbacks[0].end()
    await promise
  })
})

describe('audio_player._getVolumeMultiplier', () => {
  beforeEach(() => {
    playbacks.length = 0
    engineMock.resume.mockReset().mockResolvedValue(true)
    engineMock.play.mockClear()
    audio_player.loaded_sounds.clear()
    audio_player.unlocked = true
    audio_player.queued_sound = undefined
    audio_player.blocking = false
    audio_player.volume_settings = { ...AUDIO_VOLUME_DEFAULTS }
    vi.useRealTimers()
  })

  test('default setting (5) yields 1.0× multiplier — ui.* key passes sound volume unchanged', async () => {
    // sound.volume = 0.4; default interface_sounds = 5; multiplier = 5/5 = 1.0
    const buffer = loadSound('ui.select', { volume: 0.4 })

    const promise = audio_player.play('ui.select')
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.4)
    playbacks[0].end()
    await promise
  })

  test('hover key (ui.type_01, in HOVER_SFX_SET) routes to hover_sounds setting', async () => {
    // hover_sounds = 5 → multiplier = 1.0
    const buffer = loadSound('ui.type_01', { volume: 0.2 })

    const promise = audio_player.play('ui.type_01')
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.2)
    playbacks[0].end()
    await promise
  })

  test('study.* key routes to study_sounds setting', async () => {
    // study_sounds = 5 → multiplier = 1.0
    const buffer = loadSound('study.transition_up', { volume: 0.6 })

    const promise = audio_player.play('study.transition_up')
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
    playbacks[0].end()
    await promise
  })

  test('ui.select uses interface_sounds — not hover_sounds — because it is not in HOVER_SFX_SET', async () => {
    // Override interface_sounds to 10; multiplier = 10/5 = 2.0
    audio_player.setVolumeConfig({ study_sounds: 5, interface_sounds: 10, hover_sounds: 5 })
    const buffer = loadSound('ui.select', { volume: 0.3 })

    const promise = audio_player.play('ui.select')
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
    playbacks[0].end()
    await promise
  })

  test('ui.type_01 (TYPE_SFX member) uses hover_sounds, not interface_sounds', async () => {
    // interface_sounds = 10 (2×), hover_sounds = 5 (1×) — type_01 must use hover_sounds
    audio_player.setVolumeConfig({ study_sounds: 5, interface_sounds: 10, hover_sounds: 5 })
    const buffer = loadSound('ui.type_01', { volume: 0.2 })

    const promise = audio_player.play('ui.type_01')
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.2)
    playbacks[0].end()
    await promise
  })
})

describe('audio_player.setVolumeConfig', () => {
  beforeEach(() => {
    playbacks.length = 0
    engineMock.resume.mockReset().mockResolvedValue(true)
    engineMock.play.mockClear()
    audio_player.loaded_sounds.clear()
    audio_player.unlocked = true
    audio_player.queued_sound = undefined
    audio_player.blocking = false
    audio_player.volume_settings = { ...AUDIO_VOLUME_DEFAULTS }
    vi.useRealTimers()
  })

  test('wires through: interface_sounds=10 doubles ui.select volume', async () => {
    audio_player.setVolumeConfig({ study_sounds: 5, interface_sounds: 10, hover_sounds: 5 })
    const buffer = loadSound('ui.select', { volume: 0.3 })

    const promise = audio_player.play('ui.select')
    await flush()

    // multiplier = 10/5 = 2.0
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
    playbacks[0].end()
    await promise
  })
})

describe('audio_player._enqueue timeout', () => {
  beforeEach(() => {
    audio_player.loaded_sounds.clear()
    audio_player.unlocked = false
    audio_player.queued_sound = undefined
    audio_player.volume_settings = { ...AUDIO_VOLUME_DEFAULTS }
  })

  test('queued sound is cleared after QUEUE_TIMEOUT when not consumed', async () => {
    vi.useFakeTimers()
    loadSound('ui.click')

    await audio_player.play('ui.click')
    expect(audio_player.queued_sound).toBeDefined()

    await vi.advanceTimersByTimeAsync(20)

    expect(audio_player.queued_sound).toBeUndefined()
    vi.useRealTimers()
  })
})

describe('audio_player._onUnlock / _registerUnlock', () => {
  beforeEach(() => {
    playbacks.length = 0
    engineMock.resume.mockReset().mockResolvedValue(true)
    engineMock.play.mockClear()
    engineMock.onUnlock.mockClear()
    audio_player.loaded_sounds.clear()
    audio_player.unlocked = false
    audio_player.queued_sound = undefined
    audio_player.blocking = false
    audio_player.volume_settings = { ...AUDIO_VOLUME_DEFAULTS }
    vi.useRealTimers()
  })

  test('_registerUnlock calls engine.onUnlock exactly once even when setup is called twice', () => {
    audio_player.unlock_registered = false
    audio_player._registerUnlock()
    audio_player._registerUnlock()
    expect(engineMock.onUnlock).toHaveBeenCalledTimes(1)
    // clean up: reset so other tests don't see a double-registered state
    audio_player.unlock_registered = false
  })

  test('_onUnlock sets unlocked = true and plays any queued sound', async () => {
    loadSound('ui.click')
    audio_player.queued_sound = { key: 'ui.click', options: {} }

    // Manually fire the unlock callback
    audio_player._onUnlock()

    expect(audio_player.unlocked).toBe(true)
    expect(audio_player.queued_sound).toBeUndefined()

    // debounce mock resolves synchronously; let play settle
    await flush()
    expect(engineMock.play).toHaveBeenCalledTimes(1)
    playbacks[0]?.end()
  })

  test('_onUnlock with no queued sound just sets unlocked and does not throw', () => {
    audio_player.queued_sound = undefined
    audio_player._onUnlock()
    expect(audio_player.unlocked).toBe(true)
    expect(engineMock.play).not.toHaveBeenCalled()
  })
})

describe('audio_player.setup', () => {
  beforeEach(() => {
    engineMock.decode.mockReset()
    engineMock.onUnlock.mockClear()
    audio_player.loaded_sounds.clear()
    audio_player.initialized = false
    audio_player.unlock_registered = false
  })

  test('setup is idempotent — calling it twice does not double-load sounds', async () => {
    const fakeBuffer = { duration: 0.5 }
    engineMock.decode.mockResolvedValue(fakeBuffer)

    await audio_player.setup()
    const count_after_first = audio_player.loaded_sounds.size

    // Mark uninitialized to allow a second call, but the flag check prevents it
    // Reset initialized manually to confirm the guard
    audio_player.initialized = true
    await audio_player.setup()

    expect(audio_player.loaded_sounds.size).toBe(count_after_first)
  })

  test('setup loads sounds from AUDIO_CONFIG into loaded_sounds', async () => {
    const fakeBuffer = { duration: 0.5 }
    engineMock.decode.mockResolvedValue(fakeBuffer)

    await audio_player.setup()

    // At minimum, some sounds should be loaded
    expect(audio_player.loaded_sounds.size).toBeGreaterThan(0)
    // ui.select is a known key in AUDIO_CONFIG
    expect(audio_player.loaded_sounds.has('ui.select')).toBe(true)
  })

  test('setup registers the unlock callback via engine.onUnlock', async () => {
    const fakeBuffer = { duration: 0.5 }
    engineMock.decode.mockResolvedValue(fakeBuffer)

    await audio_player.setup()

    expect(engineMock.onUnlock).toHaveBeenCalledTimes(1)
  })

  test('_loadSound wraps decode rejection with a descriptive error', async () => {
    engineMock.decode.mockRejectedValue(new Error('network error'))

    await expect(audio_player.setup()).rejects.toThrow('Failed to load audio')
  })
})
