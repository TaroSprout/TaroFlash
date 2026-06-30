import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// Bus defaults mirror BUS_DEFAULTS in config.ts (5 → 1.0× multiplier).
const BUS_DEFAULTS = { interface: 5, study: 5, hover: 5 }

// engine.play() is now async and returns Promise<void>.
const engineMock = {
  resume: vi.fn().mockResolvedValue(true),
  play: vi.fn().mockResolvedValue(undefined),
  decode: vi.fn(),
  onStateChange: vi.fn(() => () => {}),
  onUnlock: vi.fn(),
  isUnlocked: vi.fn().mockReturnValue(true),
  state: vi.fn(() => 'running')
}

vi.mock('@/sfx/engine', () => ({ default: engineMock }))

vi.mock('@/utils/debounce', () => ({
  debounce: (fn) => Promise.resolve(fn())
}))

const { default: audio_player } = await import('@/sfx/player')

function loadSound(key, { volume = 0.5, duration = 0.2, default_bus = 'interface' } = {}) {
  const buffer = { duration }
  audio_player.loaded_sounds.set(key, { buffer, base_volume: volume, default_bus })
  return buffer
}

describe('audio_player._play', () => {
  beforeEach(() => {
    engineMock.resume.mockReset().mockResolvedValue(true)
    engineMock.play.mockReset().mockResolvedValue(undefined)
    engineMock.isUnlocked.mockReturnValue(true)
    audio_player.loaded_sounds.clear()
    audio_player.queued_sound = undefined
    audio_player.volume_settings = { ...BUS_DEFAULTS }
    vi.useRealTimers()
  })

  test('plays through the engine when the context is running', async () => {
    loadSound('click_04')

    await audio_player.play('click_04')

    expect(engineMock.play).toHaveBeenCalledTimes(1)
  })

  test('resolves when engine.play resolves', async () => {
    loadSound('click_04')

    await expect(audio_player.play('click_04')).resolves.toBeUndefined()
  })

  test('awaits engine.play — does not resolve until engine.play resolves', async () => {
    loadSound('click_04')
    let outer_resolve
    engineMock.play.mockReturnValueOnce(new Promise((r) => (outer_resolve = r)))

    let settled = false
    const promise = audio_player.play('click_04').then(() => {
      settled = true
    })

    // engine.play has not resolved yet
    await Promise.resolve()
    expect(settled).toBe(false)

    outer_resolve()
    await promise
    expect(settled).toBe(true)
  })

  test('enqueues when the audio system is not yet unlocked [obligation]', async () => {
    engineMock.isUnlocked.mockReturnValue(false)
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

    await audio_player.play('click_04', { volume: 0.9 })

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.9)
  })

  test('falls back to the loaded volume when no volume option is given', async () => {
    const buffer = loadSound('click_04', { volume: 0.3 })

    await audio_player.play('click_04')

    // Default interface setting is 5; multiplier = 5/5 = 1.0, so volume is unchanged
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.3)
  })

  test('skips engine.play when effective volume is zero — hover bus muted [obligation]', async () => {
    audio_player.volume_settings = { ...BUS_DEFAULTS, hover: 0 }
    loadSound('tap_05', { volume: 0.1, default_bus: 'hover' })

    await audio_player.play('tap_05', { bus: 'hover' })

    expect(engineMock.play).not.toHaveBeenCalled()
  })

  test('skips engine.play when options.volume is explicitly 0 [obligation]', async () => {
    loadSound('click_04', { volume: 0.3, default_bus: 'interface' })

    await audio_player.play('click_04', { volume: 0 })

    expect(engineMock.play).not.toHaveBeenCalled()
  })

  test('skips engine.play for any bus muted to 0 — interface bus [obligation]', async () => {
    audio_player.volume_settings = { ...BUS_DEFAULTS, interface: 0 }
    loadSound('select', { volume: 0.3, default_bus: 'interface' })

    await audio_player.play('select')

    expect(engineMock.play).not.toHaveBeenCalled()
  })

  test('plays with volume = base_volume × (bus_setting / 5) for non-zero bus [obligation]', async () => {
    audio_player.volume_settings = { ...BUS_DEFAULTS, hover: 2 }
    const buffer = loadSound('type_01', { volume: 0.4, default_bus: 'hover' })

    await audio_player.play('type_01', { bus: 'hover' })

    // multiplier = 2/5 = 0.4; resolved volume = 0.4 × 0.4 = 0.16
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.4 * (2 / 5))
  })
})

describe('audio_player._getVolumeMultiplier', () => {
  beforeEach(() => {
    engineMock.play.mockReset().mockResolvedValue(undefined)
    engineMock.isUnlocked.mockReturnValue(true)
    audio_player.loaded_sounds.clear()
    audio_player.queued_sound = undefined
    audio_player.volume_settings = { ...BUS_DEFAULTS }
    vi.useRealTimers()
  })

  test('default setting (5) yields 1.0× multiplier — interface bus passes sound volume unchanged', async () => {
    // base_volume = 0.4; default interface = 5; multiplier = 5/5 = 1.0
    const buffer = loadSound('select', { volume: 0.4 })

    await audio_player.play('select')

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.4)
  })

  test('type_01 (defaultBus hover) routes to hover bus setting', async () => {
    // hover = 5 → multiplier = 1.0
    const buffer = loadSound('type_01', { volume: 0.2, default_bus: 'hover' })

    await audio_player.play('type_01')

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.2)
  })

  test('transition_up with bus:study option routes to study bus setting', async () => {
    // study = 5 → multiplier = 1.0
    const buffer = loadSound('transition_up', { volume: 0.6 })

    await audio_player.play('transition_up', { bus: 'study' })

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
  })

  test('select uses interface bus — not hover — because its default_bus is interface', async () => {
    // Override interface to 10; multiplier = 10/5 = 2.0
    audio_player.setVolumeConfig({ study: 5, interface: 10, hover: 5 })
    const buffer = loadSound('select', { volume: 0.3 })

    await audio_player.play('select')

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
  })

  test('type_01 uses hover bus, not interface bus', async () => {
    // interface = 10 (2×), hover = 5 (1×) — type_01 must use hover
    audio_player.setVolumeConfig({ study: 5, interface: 10, hover: 5 })
    const buffer = loadSound('type_01', { volume: 0.2, default_bus: 'hover' })

    await audio_player.play('type_01')

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.2)
  })
})

describe('audio_player.setVolumeConfig', () => {
  beforeEach(() => {
    engineMock.play.mockReset().mockResolvedValue(undefined)
    engineMock.isUnlocked.mockReturnValue(true)
    audio_player.loaded_sounds.clear()
    audio_player.queued_sound = undefined
    audio_player.volume_settings = { ...BUS_DEFAULTS }
    vi.useRealTimers()
  })

  test('wires through: interface=10 doubles select volume', async () => {
    audio_player.setVolumeConfig({ study: 5, interface: 10, hover: 5 })
    const buffer = loadSound('select', { volume: 0.3 })

    await audio_player.play('select')

    // multiplier = 10/5 = 2.0
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.6)
  })
})

describe('audio_player.previewVolumeConfig / resetSettings', () => {
  beforeEach(() => {
    engineMock.play.mockReset().mockResolvedValue(undefined)
    engineMock.isUnlocked.mockReturnValue(true)
    audio_player.loaded_sounds.clear()
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
    await audio_player.play('select')
    // multiplier = 2/5 = 0.4; volume = 0.5 * 0.4 = 0.2
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.2)
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
    await audio_player.play('select')
    // multiplier = 10/5 = 2.0; volume = 0.5 * 2.0 = 1.0
    expect(engineMock.play).toHaveBeenCalledWith(buffer, 1.0)
  })

  test('volume_settings and committed_volume_settings default to BUS_DEFAULTS, not hardcoded literals [obligation]', async () => {
    // Verify the bus keys match BUS_DEFAULTS — if a new bus is added to config the player
    // picks it up automatically because it spreads BUS_DEFAULTS rather than inlining values
    const { BUS_DEFAULTS: defaults } = await import('@/sfx/config')
    const expected_keys = Object.keys(defaults).sort()
    audio_player.setVolumeConfig({ ...defaults })
    audio_player.resetSettings()
    expect(Object.keys(audio_player.volume_settings).sort()).toEqual(expected_keys)
    expect(Object.keys(audio_player.committed_volume_settings).sort()).toEqual(expected_keys)
    expect(audio_player.volume_settings).toEqual(defaults)
    expect(audio_player.committed_volume_settings).toEqual(defaults)
  })
})

describe('audio_player._enqueue timeout', () => {
  beforeEach(() => {
    engineMock.isUnlocked.mockReturnValue(false)
    audio_player.loaded_sounds.clear()
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

describe('audio_player._onUnlock', () => {
  beforeEach(() => {
    engineMock.play.mockReset().mockResolvedValue(undefined)
    engineMock.isUnlocked.mockReturnValue(true)
    engineMock.onUnlock.mockClear()
    audio_player.loaded_sounds.clear()
    audio_player.queued_sound = undefined
    audio_player.volume_settings = { ...BUS_DEFAULTS }
    vi.useRealTimers()
  })

  test('plays queued sound by calling _play directly — engine.play fires synchronously [obligation]', () => {
    // _onUnlock calls this._play() (not this.play()), bypassing the 10ms debounce.
    // _play() itself has no awaits before calling engine.play(), so engine.play fires
    // within the same synchronous call stack as _onUnlock().
    loadSound('click_04')
    audio_player.queued_sound = { key: 'click_04', options: {} }

    audio_player._onUnlock()

    expect(audio_player.queued_sound).toBeUndefined()
    expect(engineMock.play).toHaveBeenCalledTimes(1)
  })

  test('does not play when there is no queued sound', () => {
    audio_player.queued_sound = undefined
    audio_player._onUnlock()
    expect(engineMock.play).not.toHaveBeenCalled()
  })
})

describe('audio_player.setup', () => {
  beforeEach(() => {
    engineMock.decode.mockReset()
    engineMock.onUnlock.mockClear()
    audio_player.loaded_sounds.clear()
    audio_player.initialized = false
  })

  test('setup is idempotent — calling it twice does not double-load sounds', async () => {
    const fakeBuffer = { duration: 0.5 }
    engineMock.decode.mockResolvedValue(fakeBuffer)

    await audio_player.setup()
    const count_after_first = audio_player.loaded_sounds.size

    audio_player.initialized = true
    await audio_player.setup()

    expect(audio_player.loaded_sounds.size).toBe(count_after_first)
  })

  test('setup loads sounds from SOUNDS into loaded_sounds', async () => {
    const fakeBuffer = { duration: 0.5 }
    engineMock.decode.mockResolvedValue(fakeBuffer)

    await audio_player.setup()

    expect(audio_player.loaded_sounds.size).toBeGreaterThan(0)
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

  test('_loadSound throws descriptive error when audio file is not in the glob [obligation]', async () => {
    // Temporarily add a key with an extension not captured by the glob (flac is excluded)
    // so that AUDIO_FILES[path] is undefined, triggering the new early-throw guard.
    const { SOUNDS } = await import('@/sfx/config')
    const test_key = '__test_missing_audio__'
    SOUNDS[test_key] = { ext: 'flac' }

    try {
      await audio_player['_loadSound'](test_key)
      expect.fail('expected _loadSound to throw')
    } catch (e) {
      expect(e.message).toMatch(/Audio file not found for "__test_missing_audio__"/)
      expect(e.message).toContain('/src/assets/audio/__test_missing_audio__.flac')
      // engine.decode must NOT be called with undefined
      expect(engineMock.decode).not.toHaveBeenCalledWith(undefined)
    } finally {
      delete SOUNDS[test_key]
    }
  })
})
