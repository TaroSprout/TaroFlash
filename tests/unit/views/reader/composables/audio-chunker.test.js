import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'

const WINDOW_SEC = 600
const OUTPUT_BITRATE_BPS = 48_000

const { execImpl, readImpl, writeImpl, deleteImpl, loadImpl, instances } = vi.hoisted(() => ({
  execImpl: { fn: vi.fn(async () => {}) },
  readImpl: { fn: vi.fn(async () => new Uint8Array([1])) },
  writeImpl: { fn: vi.fn(async () => {}) },
  deleteImpl: { fn: vi.fn(async () => {}) },
  loadImpl: { fn: vi.fn(async () => {}) },
  instances: []
}))

vi.mock('@ffmpeg/ffmpeg', () => {
  class FFmpeg {
    listeners = {}

    constructor() {
      instances.push(this)
    }

    load(opts) {
      return loadImpl.fn(opts)
    }

    on(event, cb) {
      ;(this.listeners[event] ??= []).push(cb)
    }

    off(event, cb) {
      this.listeners[event] = (this.listeners[event] ?? []).filter((f) => f !== cb)
    }

    emit(event, payload) {
      for (const cb of this.listeners[event] ?? []) cb(payload)
    }

    exec(args) {
      return execImpl.fn(args, this)
    }

    readFile(name) {
      return readImpl.fn(name)
    }

    writeFile(...args) {
      return writeImpl.fn(...args)
    }

    deleteFile(...args) {
      return deleteImpl.fn(...args)
    }
  }

  return { FFmpeg }
})

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(async () => new Uint8Array([9])),
  toBlobURL: vi.fn(async (url) => url)
}))

vi.mock('@ffmpeg/core?url', () => ({ default: 'core.js' }))
vi.mock('@ffmpeg/core/wasm?url', () => ({ default: 'core.wasm' }))
vi.mock('@ffmpeg/ffmpeg/worker?worker&url', () => ({ default: 'worker.js' }))

// The transcode call carries no `-ss`; every slice call does — distinguishes
// which ffmpeg invocation a test's exec implementation is answering.
function isSliceCall(args) {
  return args.includes('-ss')
}

function durationLog(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = (seconds % 60).toFixed(2).padStart(5, '0')
  return `Duration: ${h}:${m}:${s}, start: 0.000000, bitrate: 64 kb/s`
}

function makeFile(name = 'input.wav') {
  return new File([new Uint8Array([1, 2, 3])], name)
}

async function loadChunkAudio() {
  vi.resetModules()
  const mod = await import('@/views/reader/composables/audio-chunker')
  return mod.chunkAudio
}

beforeEach(() => {
  instances.length = 0
  execImpl.fn = vi.fn(async () => {})
  readImpl.fn = vi.fn(async () => new Uint8Array([1]))
  writeImpl.fn = vi.fn(async () => {})
  deleteImpl.fn = vi.fn(async () => {})
  loadImpl.fn = vi.fn(async () => {})
  vi.useRealTimers()
})

describe('chunkAudio', () => {
  test('reports the loading stage first, then loads ffmpeg only once across repeated calls', async () => {
    const chunkAudio = await loadChunkAudio()
    const onProgress = vi.fn()

    await chunkAudio(makeFile(), onProgress)
    await chunkAudio(makeFile(), onProgress)

    expect(onProgress.mock.calls[0][0]).toEqual({ stage: 'loading' })
    expect(instances).toHaveLength(1)
    expect(loadImpl.fn).toHaveBeenCalledTimes(1)
  })

  test('a short file (duration under the window) produces no chunks', async () => {
    execImpl.fn = vi.fn(async (args, ffmpeg) => {
      if (!isSliceCall(args)) ffmpeg.emit('log', { message: durationLog(10.5) })
    })

    const chunkAudio = await loadChunkAudio()
    const result = await chunkAudio(makeFile())

    expect(result.chunks).toEqual([])
    expect(result.ext).toBe('mp3')
  })

  test('slices a long file into overlapping windows, the last one running to the true end', async () => {
    execImpl.fn = vi.fn(async (args, ffmpeg) => {
      if (!isSliceCall(args)) ffmpeg.emit('log', { message: durationLog(1300) })
    })

    const chunkAudio = await loadChunkAudio()
    const result = await chunkAudio(makeFile())

    expect(result.chunks.map((c) => c.offset)).toEqual([0, 600, 1200])

    const sliceCalls = execImpl.fn.mock.calls.filter((c) => isSliceCall(c[0]))
    expect(sliceCalls.map((c) => c[0][c[0].indexOf('-t') + 1])).toEqual([
      String(WINDOW_SEC + 5),
      String(WINDOW_SEC + 5),
      String(1300 - 1200 + 1)
    ])
  })

  test('falls back to the size-derived duration when ffmpeg logs no Duration line', async () => {
    const target_seconds = 700
    readImpl.fn = vi.fn(async (name) =>
      name.startsWith('full')
        ? new Uint8Array((target_seconds * OUTPUT_BITRATE_BPS) / 8)
        : new Uint8Array([1])
    )

    const chunkAudio = await loadChunkAudio()
    const result = await chunkAudio(makeFile())

    expect(result.chunks).toHaveLength(2)
    expect(result.chunks[0].offset).toBe(0)
    expect(result.chunks[1].offset).toBe(600)
  })

  test('clamps a transcoding progress ratio outside 0–1', async () => {
    execImpl.fn = vi.fn(async (args, ffmpeg) => {
      if (!isSliceCall(args)) {
        ffmpeg.emit('progress', { progress: 1.5 })
        ffmpeg.emit('progress', { progress: -0.2 })
      }
    })

    const chunkAudio = await loadChunkAudio()
    const onProgress = vi.fn()
    await chunkAudio(makeFile(), onProgress)

    const ratios = onProgress.mock.calls
      .filter((c) => c[0].stage === 'transcoding')
      .map((c) => c[0].ratio)

    expect(ratios).toContain(1)
    expect(ratios).toContain(0)
  })

  test('reports slicing progress across chunks, reaching 1 at the last one', async () => {
    execImpl.fn = vi.fn(async (args, ffmpeg) => {
      if (!isSliceCall(args)) ffmpeg.emit('log', { message: durationLog(1300) })
    })

    const chunkAudio = await loadChunkAudio()
    const onProgress = vi.fn()
    await chunkAudio(makeFile(), onProgress)

    const ratios = onProgress.mock.calls
      .filter((c) => c[0].stage === 'slicing')
      .map((c) => c[0].ratio)

    expect(ratios).toEqual([0, 1 / 3, 2 / 3, 1])
  })

  test('deletes the input, full, and playback scratch files even when a delete rejects', async () => {
    deleteImpl.fn = vi.fn().mockRejectedValueOnce(new Error('gone')).mockResolvedValue(undefined)

    const chunkAudio = await loadChunkAudio()
    await expect(chunkAudio(makeFile('input.wav'))).resolves.toBeDefined()

    expect(deleteImpl.fn.mock.calls.map((c) => c[0])).toEqual([
      'input.wav',
      'full.mp3',
      'playback.mp3'
    ])
  })

  test('a load that never resolves times out, and the next call retries a fresh load', async () => {
    vi.useFakeTimers()
    loadImpl.fn = vi.fn(() => new Promise(() => {}))

    const chunkAudio = await loadChunkAudio()
    const attempt = chunkAudio(makeFile())
    const assertion = expect(attempt).rejects.toThrow('ffmpeg_load_timeout')

    await vi.advanceTimersByTimeAsync(60_000)
    await assertion

    loadImpl.fn = vi.fn(async () => {})
    vi.useRealTimers()

    const result = await chunkAudio(makeFile())

    expect(result.chunks).toEqual([])
    expect(instances).toHaveLength(2)
  })
})
