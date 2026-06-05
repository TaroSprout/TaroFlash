// transcribe-audio: proxy an uploaded audio file to OpenAI Whisper and return
// the transcript with sentence/segment-level timestamps.
//
// Request:  multipart/form-data with a single `file` field (the audio blob).
// Response: { text: string, segments: { start, end, text }[], lang?: string }
//
// The OpenAI key never reaches the client — it lives in OPENAI_API_KEY here.
// Admin-only: requireAdmin() runs before any work.

import { cors, requireAdmin } from '../_shared/require-admin.ts'
import { isTargetScript, scriptConverter } from './script.ts'

const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions'

// Machine-readable failure codes the FE switches on (read from the error body).
function jsonError(code: string, status: number): Response {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}

type WhisperSegment = { start: number; end: number; text: string }
type WhisperWord = { word: string; start: number; end: number }
type WhisperResponse = {
  text: string
  language?: string
  segments?: WhisperSegment[]
  words?: WhisperWord[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const inbound = await req.formData()
  const file = inbound.get('file')
  if (!(file instanceof File)) {
    return jsonError('missing_file', 400)
  }

  const requested = inbound.get('script')
  const script = isTargetScript(requested) ? requested : 'original'

  // Rebuild the multipart body for OpenAI. verbose_json gives us timestamps;
  // we request BOTH granularities — same price (Whisper bills per audio minute).
  // Segments drive the sentence-level highlight (robust); words give precise
  // boundaries for the click-to-select popover and future word-level features.
  const openaiForm = new FormData()
  openaiForm.append('file', file)
  openaiForm.append('model', 'whisper-1')
  openaiForm.append('response_format', 'verbose_json')
  openaiForm.append('timestamp_granularities[]', 'segment')
  openaiForm.append('timestamp_granularities[]', 'word')

  const res = await fetch(OPENAI_TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
    body: openaiForm
  })

  if (!res.ok) {
    console.error('Whisper error', res.status, await res.text())
    // 413 = file over Whisper's ~25 MB cap; 400 = unsupported/corrupt audio.
    // Both get their own code so the FE can tell the user what to fix.
    if (res.status === 413) return jsonError('file_too_large', 413)
    if (res.status === 400) return jsonError('invalid_audio', 422)
    return jsonError('upstream_error', 502)
  }

  const data: WhisperResponse = await res.json()

  // Convert to the requested script (no-op for 'original'). Applied to the full
  // text, each segment, and each word with the same character-level converter so
  // they stay mutually consistent and word timestamps remain aligned.
  const convert = scriptConverter(script) ?? ((text: string) => text)
  const text = convert(data.text)
  const segments = (data.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: convert(s.text.trim())
  }))
  const words = (data.words ?? []).map((w) => ({
    word: convert(w.word),
    start: w.start,
    end: w.end
  }))

  return new Response(JSON.stringify({ text, segments, words, lang: data.language }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
})
