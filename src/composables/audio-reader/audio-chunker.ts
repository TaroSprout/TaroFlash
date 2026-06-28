// Client-side audio preprocessing for lesson uploads, powered by ffmpeg.wasm.
//
// Whisper caps at 25 MiB / one bounded request, so an arbitrary-length upload (a
// whole audiobook) can't be transcribed in one call. Here we:
//   1. transcode the original to a compact mono MP3 (speech needs no stereo/hi-fi
//      and Whisper downsamples to 16 kHz anyway) — this is the playback asset, and
//      for a short file it's also the single transcription input;
//   2. for a long file, slice that MP3 into ordered, overlapping windows the
//      worker transcribes one per invocation and stitches back by `offset`.
//
// The overlap means no word is cut at a window edge; the worker drops the
// re-transcribed lead (see appendChunk in the edge worker). ffmpeg is loaded
// lazily (a ~25 MiB wasm core) so it only costs anything on an actual upload.
//
// Single-threaded core on purpose: it needs no SharedArrayBuffer, so the app
// needs no COOP/COEP cross-origin-isolation headers. Not re-entrant — one upload
// at a time (the upload modal enforces this).

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
// Resolve the core/wasm through the package's exports map (`.` + `./wasm`); the
// ?url query makes Vite hand back a same-origin asset URL instead of executing
// the emscripten module.
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'
// @ffmpeg/ffmpeg runs ffmpeg in a Web Worker. Its built-in
// `new Worker(new URL('./worker.js', import.meta.url))` breaks once the dep is
// pre-bundled (import.meta.url no longer sits next to worker.js), so load() hangs
// forever. Hand it an explicit worker that Vite BUNDLES (its relative imports
// inlined) via ?worker&url, so it resolves in dev and prod alike.
import classWorkerURL from '@ffmpeg/ffmpeg/worker?worker&url'

// If ffmpeg.load() never resolves (worker that won't boot, blocked wasm), fail
// loudly instead of leaving the upload modal spinning forever.
const LOAD_TIMEOUT_MS = 60_000

// Transcription window length. Long enough to give Whisper context and keep the
// number of seams (and chunks) low; short enough that one chunk stays well under
// Whisper's per-call timeout and 25 MiB cap.
const WINDOW_SEC = 600

// Each window carries this much of the next window's audio as a tail, so a
// sentence straddling a boundary is fully transcribed in the earlier chunk.
const OVERLAP_SEC = 5

const OUTPUT_EXT = 'mp3'
const OUTPUT_MIME = 'audio/mpeg'

// Transcription encode: mono, 16 kHz (Whisper's internal rate), constant 48 kbps —
// ~7 MB for a 40-min book. CBR matters here too: it lets us recover duration from
// output size (see below), and it's what the chunks are sliced from.
const OUTPUT_BITRATE_BPS = 48_000
const ENCODE_ARGS = ['-ac', '1', '-ar', '16000', '-b:a', '48k']

// Playback encode: a constant-bitrate copy at ~source quality, kept SEPARATE from
// the transcription encode. CBR is the whole point — a VBR source seeks only as
// precisely as its ~100-point Xing TOC (tens of seconds off on a long file), which
// desyncs the word highlight after a skip; a CBR file seeks byte-accurately and
// shares the timeline the word timings were measured on. Channels and sample rate
// are left at the source's (no -ac/-ar).
const PLAYBACK_ARGS = ['-c:a', 'libmp3lame', '-b:a', '64k']

export type AudioChunk = { blob: Blob; offset: number }

export type ChunkedAudio = {
  // CBR MP3 at ~source quality: the lesson's stored audio_path, used only for
  // playback (byte-accurate seeking, unlike a VBR source).
  playback: Blob
  // Compact mono 16 kHz MP3 of the whole audio: the single transcription input when
  // `chunks` is empty (a short file), and what `chunks` are sliced from.
  full: Blob
  ext: string
  // Ordered transcription slices. Empty when `full` is short enough to transcribe
  // in one call — the worker then transcribes `full` directly.
  chunks: AudioChunk[]
}

export type ChunkStage = 'loading' | 'transcoding' | 'slicing'
export type ChunkProgress = { stage: ChunkStage; ratio?: number }

let ffmpegPromise: Promise<FFmpeg> | null = null

// Load (and memoise) a single ffmpeg.wasm instance. toBlobURL re-serves the
// Vite-bundled, same-origin core/wasm as blob URLs, which is how ffmpeg.wasm
// wants them handed in.
function loadFfmpeg(): Promise<FFmpeg> {
  ffmpegPromise ??= (async () => {
    const ffmpeg = new FFmpeg()
    const loaded = ffmpeg.load({
      classWorkerURL,
      coreURL: await toBlobURL(coreURL, 'text/javascript'),
      wasmURL: await toBlobURL(wasmURL, 'application/wasm')
    })
    await withTimeout(loaded, LOAD_TIMEOUT_MS, 'ffmpeg_load_timeout')
    return ffmpeg
  })().catch((error) => {
    // Don't cache a failed load — let the next upload retry from scratch.
    ffmpegPromise = null
    throw error
  })
  return ffmpegPromise
}

function withTimeout<T>(promise: Promise<T>, ms: number, code: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(code)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/**
 * Transcode an uploaded audio File to a compact mono MP3 and, when it's longer
 * than one transcription window, slice it into overlapping chunks. `onProgress`
 * reports the current stage (and a 0–1 ratio where ffmpeg exposes one).
 */
export async function chunkAudio(
  file: File,
  onProgress?: (progress: ChunkProgress) => void
): Promise<ChunkedAudio> {
  onProgress?.({ stage: 'loading' })
  const ffmpeg = await loadFfmpeg()

  const inputName = `input${extname(file.name)}`
  const fullName = `full.${OUTPUT_EXT}`
  const playbackName = `playback.${OUTPUT_EXT}`
  await ffmpeg.writeFile(inputName, await fetchFile(file))

  const {
    full,
    playback,
    duration: logDuration
  } = await transcode(ffmpeg, inputName, fullName, playbackName, onProgress)
  // ffmpeg's decoded duration is authoritative. If its log somehow didn't surface
  // one, recover it from the COMPACT output size — that encode is constant-bitrate,
  // so bytes map directly to seconds (no metadata needed, unlike a media element,
  // which reports Infinity for many MP3s).
  const duration = Number.isFinite(logDuration) ? logDuration : durationFromSize(full.size)
  const chunks = await sliceWindows(ffmpeg, fullName, duration, onProgress)

  await ffmpeg.deleteFile(inputName).catch(() => {})
  await ffmpeg.deleteFile(fullName).catch(() => {})
  await ffmpeg.deleteFile(playbackName).catch(() => {})

  return { playback, full, ext: OUTPUT_EXT, chunks }
}

// Decode the input ONCE and encode both outputs in a single pass — the CBR
// playback copy and the compact 16 kHz transcription master — forwarding ffmpeg's
// progress as the 'transcoding' ratio and capturing the true duration from its log
// (a media element reports `Infinity` for many MP3s — VBR / no Xing header — so
// ffmpeg's own decode is the reliable source for the slicing decision).
async function transcode(
  ffmpeg: FFmpeg,
  inputName: string,
  fullName: string,
  playbackName: string,
  onProgress?: (progress: ChunkProgress) => void
): Promise<{ full: Blob; playback: Blob; duration: number }> {
  onProgress?.({ stage: 'transcoding', ratio: 0 })
  const onTick = ({ progress }: { progress: number }) =>
    onProgress?.({ stage: 'transcoding', ratio: clamp01(progress) })

  let duration = NaN
  const onLog = ({ message }: { message: string }) => {
    // e.g. "  Duration: 00:40:12.34, start: 0.000000, bitrate: 128 kb/s"
    const m = message.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
    if (m) duration = Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3])
  }

  ffmpeg.on('progress', onTick)
  ffmpeg.on('log', onLog)
  try {
    await ffmpeg.exec([
      '-i',
      inputName,
      ...PLAYBACK_ARGS,
      playbackName,
      ...ENCODE_ARGS,
      '-f',
      OUTPUT_EXT,
      fullName
    ])
  } finally {
    ffmpeg.off('progress', onTick)
    ffmpeg.off('log', onLog)
  }

  const fullData = await ffmpeg.readFile(fullName)
  const playbackData = await ffmpeg.readFile(playbackName)
  return {
    full: new Blob([fullData], { type: OUTPUT_MIME }),
    playback: new Blob([playbackData], { type: OUTPUT_MIME }),
    duration
  }
}

// Slice the compact MP3 into overlapping windows. Returns [] when the audio fits
// in a single window (the worker transcribes `full` directly). The slice is a
// fast frame-copy (`-c copy`) off the already-compressed file — no re-encode.
async function sliceWindows(
  ffmpeg: FFmpeg,
  fullName: string,
  duration: number,
  onProgress?: (progress: ChunkProgress) => void
): Promise<AudioChunk[]> {
  if (!Number.isFinite(duration) || duration <= WINDOW_SEC) return []

  const count = Math.ceil(duration / WINDOW_SEC)
  const chunks: AudioChunk[] = []
  onProgress?.({ stage: 'slicing', ratio: 0 })

  for (let i = 0; i < count; i++) {
    const start = i * WINDOW_SEC
    const isLast = i === count - 1
    // Last window runs to the end; earlier ones carry the overlap tail.
    const length = isLast ? duration - start + 1 : WINDOW_SEC + OVERLAP_SEC
    const name = `chunk${i}.${OUTPUT_EXT}`

    await ffmpeg.exec([
      '-ss',
      String(start),
      '-t',
      String(length),
      '-i',
      fullName,
      '-c',
      'copy',
      name
    ])
    const data = await ffmpeg.readFile(name)
    chunks.push({ blob: new Blob([data], { type: OUTPUT_MIME }), offset: start })
    await ffmpeg.deleteFile(name).catch(() => {})
    onProgress?.({ stage: 'slicing', ratio: (i + 1) / count })
  }

  return chunks
}

// Recover duration from the constant-bitrate output size: seconds = bytes·8 /
// bitrate. ID3/frame overhead makes this a slight OVER-estimate, which at worst
// adds one short trailing chunk — never drops audio. A reliability backstop for
// when ffmpeg's log didn't yield a Duration line.
function durationFromSize(bytes: number): number {
  return (bytes * 8) / OUTPUT_BITRATE_BPS
}

function extname(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}
