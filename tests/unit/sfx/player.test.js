import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

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

    expect(engineMock.play).toHaveBeenCalledWith(buffer, 0.3)

    playbacks[0].end()
    await promise
  })
})
