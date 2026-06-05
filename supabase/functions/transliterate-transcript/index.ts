// transliterate-transcript: produce per-word phonetic readings for a lesson's
// interlinear reader. Given the transcript's word tokens, return one reading per
// word, aligned by index (empty string where a word needs none).
//
// Request:  { words: string[], lang: string }
// Response: { readings: string[] }  // same length/order as `words`
//
// The Anthropic key never reaches the client — it lives in ANTHROPIC_API_KEY.
// Admin-only: requireAdmin() runs before any work.

import { cors, requireAdmin } from '../_shared/require-admin.ts'
import { readWords } from './transliterate.ts'

type TransliterateRequest = { words: string[]; lang: string }

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

  const { words, lang }: Partial<TransliterateRequest> = await req.json().catch(() => ({}))
  if (!Array.isArray(words) || words.length === 0 || !lang) {
    return jsonError('missing_fields', 400)
  }

  const readings = await readWords(words, lang)
  if (!readings) return jsonError('transliteration_failed', 502)

  return new Response(JSON.stringify({ readings }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
})
