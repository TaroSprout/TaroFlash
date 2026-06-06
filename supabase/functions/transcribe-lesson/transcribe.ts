// Whisper transcription core for the async lesson worker. Sends an audio file to
// OpenAI Whisper (verbose_json with segment + word timestamps), converts the
// result to the requested script, and returns the shaped transcript.
//
// Hardened for the background worker: each attempt has an AbortController timeout
// and transient failures (429, 5xx, network) are retried with backoff. Terminal
// failures (over-cap, unreadable audio) throw immediately with a typed code the
// worker writes onto the lesson row.

import { scriptConverter, type TargetScript } from '../_shared/transcription/script.ts'

const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions'

// A single Whisper call can legitimately run for a while on long audio; cap it so
// a hung upstream fails as a clean `timeout` instead of riding until the platform
// kills the whole worker.
const REQUEST_TIMEOUT_MS = 120_000
const MAX_ATTEMPTS = 3

// Codes the FE switches on (mirrored in the upload error taxonomy).
export class TranscribeError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = 'TranscribeError'
  }
}

type WhisperSegment = { start: number; end: number; text: string }
type WhisperWord = { word: string; start: number; end: number }
type WhisperResponse = {
  text: string
  language?: string
  segments?: WhisperSegment[]
  words?: WhisperWord[]
}

export type TranscribeResult = {
  text: string
  segments: WhisperSegment[]
  words: WhisperWord[]
  lang?: string
}

export async function transcribeAudioFile(
  file: File,
  script: TargetScript
): Promise<TranscribeResult> {
  const data = await callWhisper(file)

  // OpenCC maps character-for-character, so converting the full text, each
  // segment, and each word with the same converter keeps them mutually
  // consistent and word timestamps aligned. No-op for 'original'.
  const convert = scriptConverter(script) ?? ((text: string) => text)

  return {
    text: convert(data.text),
    segments: (data.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: convert(s.text.trim())
    })),
    words: (data.words ?? []).map((w) => ({
      word: convert(w.word),
      start: w.start,
      end: w.end
    })),
    lang: data.language
  }
}

async function callWhisper(file: File): Promise<WhisperResponse> {
  let transientCode = 'upstream_error'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await sendOnce(file)

    if (res === 'timeout') throw new TranscribeError('timeout')
    if (res === 'network') {
      transientCode = 'upstream_error'
      await maybeBackoff(attempt)
      continue
    }

    if (res.ok) return (await res.json()) as WhisperResponse

    const detail = await res.text().catch(() => '')
    console.error('Whisper error', res.status, detail)

    // Terminal — retrying won't help.
    if (res.status === 413) throw new TranscribeError('file_too_large')
    if (res.status === 400) throw new TranscribeError('invalid_audio')

    // Transient — back off and retry 429 / 5xx.
    if (res.status === 429 || res.status >= 500) {
      transientCode = res.status === 429 ? 'rate_limited' : 'upstream_error'
      await maybeBackoff(attempt)
      continue
    }

    throw new TranscribeError('upstream_error')
  }

  // Exhausted retries on a transient failure.
  throw new TranscribeError(transientCode)
}

// One Whisper request with a timeout. Returns the Response, or a sentinel for the
// two non-HTTP outcomes the caller treats differently (abort vs other network
// error) so it can decide retry-vs-fail without inspecting exceptions.
async function sendOnce(file: File): Promise<Response | 'timeout' | 'network'> {
  const form = new FormData()
  form.append('file', file)
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'segment')
  form.append('timestamp_granularities[]', 'word')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(OPENAI_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
      body: form,
      signal: controller.signal
    })
  } catch {
    return controller.signal.aborted ? 'timeout' : 'network'
  } finally {
    clearTimeout(timer)
  }
}

// Wait before the next attempt, scaling with the attempt number. No wait after
// the final attempt — there's no retry left to pace, so don't delay the failure.
function maybeBackoff(attempt: number): Promise<void> {
  if (attempt >= MAX_ATTEMPTS) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, attempt * 1000))
}
