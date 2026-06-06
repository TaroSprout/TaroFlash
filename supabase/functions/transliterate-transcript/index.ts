// transliterate-transcript: produce per-word phonetic readings for a lesson's
// interlinear reader. Given the transcript's words grouped under their sentence
// (context for disambiguating readings), return one reading per word, flat and
// aligned to the words in send order (empty string where a word needs none).
//
// Request:  { sentences: { text: string, words: string[] }[], lang: string }
// Response: { readings: string[] }  // flat, aligned to the sentences' words
//
// The Anthropic key never reaches the client — it lives in ANTHROPIC_API_KEY.
// Admin-only: requireAdmin() runs before any work.

import { cors, requireAdmin } from '../_shared/require-admin.ts'
import { readSentences, type ReadingSentence } from '../_shared/transcription/transliterate.ts'

type TransliterateRequest = { sentences: ReadingSentence[]; lang: string }

// Machine-readable failure codes the FE switches on (read from the error body).
function jsonError(code: string, status: number): Response {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
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

  const { sentences, lang }: Partial<TransliterateRequest> = await req.json().catch(() => ({}))
  if (!Array.isArray(sentences) || sentences.length === 0 || !lang) {
    return jsonError('missing_fields', 400)
  }

  // Resilient by design: failed batches come back as blank readings, so this
  // always returns a full aligned array rather than erroring the whole lesson.
  const readings = await readSentences(sentences, lang)

  return new Response(JSON.stringify({ readings }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
})
