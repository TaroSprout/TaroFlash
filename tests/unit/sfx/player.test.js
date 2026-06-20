import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// Bus defaults mirror BUS_DEFAULTS in config.ts (5 → 1.0× multiplier).
const BUS_DEFAULTS = { interface: 5, study: 5, hover: 5 }

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

function loadSound(key, { volume = 0.5, duration = 0.2, default_bus = 'interface' } = {}) {
  const buffer = { duration }
  audio_player.loaded_sounds.set(key, { buffer, base_volume: volume, default_bus })
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
    audio_player.volume_settings = { ...BUS_DEFAULTS }
    vi.useRealTimers()
  })

  test('plays through the engine when the context is running', async () => {
    loadSound('click_04')

    const promise = audio_player.play('click_04')
    await flush()
    expect(engineMock.play).toHaveBeenCalledTimes(1)

    playbacks[0].end()
    await promise

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
  })

  test('skips play when the context cannot be resumed', async () => {
    engineMock.resume.mockResolvedValue(false)
    loadSound('click_04')

    await audio_player.play('click_04')

    expect(engineMock.resume).toHaveBeenCalledTimes(1)
    expect(engineMock.play).not.toHaveBeenCalled()
  })

  test('resolves when the playback ends', async () => {
    loadSound('click_04')

    const promise = audio_player.play('click_04')
    await flush()
    playbacks[0].end()

    await expect(promise).resolves.toBeUndefined()
  })

  test('resolves via the duration timeout fallback when playback never ends', async () => {
    vi.useFakeTimers()
    loadSound('click_04', { duration: 0.1 })

    let settled = false
    const promise = audio_player.play('click_04').then(() => {
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
    loadSound('click_04')

    await audio_player.play('click_04')

    expect(engineMock.play).not.toHaveBeenCalled()
    expect(audio_player.queued_sound).toEqual({ key: 'click_04', options: {} })
  })

  test('throws when the sound is not loaded', async () => {
    await expect(audio_player.play('missing_sound')).rejects.toThrow(
      'Sound "missing_sound" not loaded.'
    )
  })

  test('passes the volume option through to the engine', async () => {
    const buffer = loadSound('click_04', { volume: 0.5 })

    const promise = audio_player.play('click_04', { volume: 0.9 })
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.9)

    playbacks[0].end()
    await promise
  })

  test('falls back to the loaded volume when no volume option is given', async () => {
    const buffer = loadSound('click_04', { volume: 0.3 })

    const promise = audio_player.play('click_04')
    await flush()

    // Default interface setting is 5; multiplier = 5/5 = 1.0, so volume is unchanged
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
    audio_player.volume_settings = { ...BUS_DEFAULTS }
    vi.useRealTimers()
  })

  test('default setting (5) yields 1.0× multiplier — interface bus passes sound volume unchanged', async () => {
    // base_volume = 0.4; default interface = 5; multiplier = 5/5 = 1.0
    const buffer = loadSound('select', { volume: 0.4 })

    const promise = audio_player.play('select')
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.4)
    playbacks[0].end()
    await promise
  })

  test('type_01 (defaultBus hover) routes to hover bus setting', async () => {
    // hover = 5 → multiplier = 1.0
    const buffer = loadSound('type_01', { volume: 0.2, default_bus: 'hover' })

    const promise = audio_player.play('type_01')
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.2)
    playbacks[0].end()
    await promise
  })

  test('transition_up with bus:study option routes to study bus setting', async () => {
    // study = 5 → multiplier = 1.0
    const buffer = loadSound('transition_up', { volume: 0.6 })

    const promise = audio_player.play('transition_up', { bus: 'study' })
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
    playbacks[0].end()
    await promise
  })

  test('select uses interface bus — not hover — because its default_bus is interface', async () => {
    // Override interface to 10; multiplier = 10/5 = 2.0
    audio_player.setVolumeConfig({ study: 5, interface: 10, hover: 5 })
    const buffer = loadSound('select', { volume: 0.3 })

    const promise = audio_player.play('select')
    await flush()

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
    playbacks[0].end()
    await promise
  })

  test('type_01 uses hover bus, not interface bus', async () => {
    // interface = 10 (2×), hover = 5 (1×) — type_01 must use hover
    audio_player.setVolumeConfig({ study: 5, interface: 10, hover: 5 })
    const buffer = loadSound('type_01', { volume: 0.2, default_bus: 'hover' })

    const promise = audio_player.play('type_01')
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
    audio_player.volume_settings = { ...BUS_DEFAULTS }
    vi.useRealTimers()
  })

  test('wires through: interface=10 doubles select volume', async () => {
    audio_player.setVolumeConfig({ study: 5, interface: 10, hover: 5 })
    const buffer = loadSound('select', { volume: 0.3 })

    const promise = audio_player.play('select')
    await flush()

    // multiplier = 10/5 = 2.0
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
    playbacks[0].end()
    await promise
  })
})

describe('audio_player.previewVolumeConfig / resetSettings', () => {
  beforeEach(() => {
    playbacks.length = 0
    engineMock.resume.mockReset().mockResolvedValue(true)
    engineMock.play.mockClear()
    audio_player.loaded_sounds.clear()
    audio_player.unlocked = true
    audio_player.queued_sound = undefined
    audio_player.volume_settings = { ...BUS_DEFAULTS }
    audio_player.committed_volume_settings = { ...BUS_DEFAULTS }
    vi.useRealTimers()
  })

  test('setVolumeConfig sets both volume_settings and committed_volume_settings [obligation]', () => {
    const cfg = { study: 3, interface: 7, hover: 2 }
    audio_player.setVolumeConfig(cfg)
    expect(audio_player.volume_settings).toEqual(cfg)
    expect(audio_player.committed_volume_settings).toEqual(cfg)
  })

  test('previewVolumeConfig sets volume_settings but leaves committed_volume_settings untouched [obligation]', () => {
    const committed = { study: 5, interface: 5, hover: 5 }
    audio_player.setVolumeConfig(committed)
    audio_player.previewVolumeConfig({ study: 2, interface: 2, hover: 2 })
    expect(audio_player.volume_settings).toEqual({ study: 2, interface: 2, hover: 2 })
    expect(audio_player.committed_volume_settings).toEqual(committed)
  })

  test('commit→preview→reset restores the committed value, not the preview [obligation]', () => {
    const committed = { study: 3, interface: 3, hover: 3 }
    audio_player.setVolumeConfig(committed)
    audio_player.previewVolumeConfig({ study: 9, interface: 9, hover: 9 })
    audio_player.resetSettings()
    expect(audio_player.volume_settings).toEqual(committed)
  })

  test('resetSettings uses committed baseline for volume multiplier after preview [obligation]', async () => {
    // commit interface=2 → multiplier 2/5=0.4; preview interface=10 → 2.0; reset → back to 0.4
    audio_player.setVolumeConfig({ study: 5, interface: 2, hover: 5 })
    audio_player.previewVolumeConfig({ study: 5, interface: 10, hover: 5 })
    audio_player.resetSettings()

    const buffer = loadSound('select', { volume: 0.5 })
    const promise = audio_player.play('select')
    await flush()
    // multiplier = 2/5 = 0.4; volume = 0.5 * 0.4 = 0.2
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.2)
    playbacks[0].end()
    await promise
  })

  test('previewVolumeConfig stores a copy — mutating the caller object does not change player state [obligation]', () => {
    const cfg = { study: 5, interface: 5, hover: 5 }
    audio_player.previewVolumeConfig(cfg)
    cfg.interface = 99
    expect(audio_player.volume_settings.interface).toBe(5)
  })

  test('setVolumeConfig stores a copy — mutating the caller object does not change committed baseline [obligation]', () => {
    const cfg = { study: 5, interface: 5, hover: 5 }
    audio_player.setVolumeConfig(cfg)
    cfg.study = 99
    expect(audio_player.committed_volume_settings.study).toBe(5)
  })

  test('volume multiplier uses live volume_settings (previewed value) during preview [obligation]', async () => {
    audio_player.setVolumeConfig({ study: 5, interface: 5, hover: 5 })
    audio_player.previewVolumeConfig({ study: 5, interface: 10, hover: 5 })

    const buffer = loadSound('select', { volume: 0.5 })
    const promise = audio_player.play('select')
    await flush()
    // multiplier = 10/5 = 2.0; volume = 0.5 * 2.0 = 1.0
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 1.0)
    playbacks[0].end()
    await promise
  })
})

describe('audio_player._enqueue timeout', () => {
  beforeEach(() => {
    audio_player.loaded_sounds.clear()
    audio_player.unlocked = false
    audio_player.queued_sound = undefined
    audio_player.volume_settings = { ...BUS_DEFAULTS }
  })

  test('queued sound is cleared after QUEUE_TIMEOUT when not consumed', async () => {
    vi.useFakeTimers()
    loadSound('click_04')

    await audio_player.play('click_04')
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
    audio_player.volume_settings = { ...BUS_DEFAULTS }
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
    loadSound('click_04')
    audio_player.queued_sound = { key: 'click_04', options: {} }

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

  test('setup loads sounds from SOUNDS into loaded_sounds', async () => {
    const fakeBuffer = { duration: 0.5 }
    engineMock.decode.mockResolvedValue(fakeBuffer)

    await audio_player.setup()

    // At minimum, some sounds should be loaded
    expect(audio_player.loaded_sounds.size).toBeGreaterThan(0)
    // 'select' is a known flat key in SOUNDS
    expect(audio_player.loaded_sounds.has('select')).toBe(true)
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
