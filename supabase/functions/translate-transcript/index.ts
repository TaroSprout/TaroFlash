// translate-transcript: translate a lesson's sentences into the target language
// for the interlinear reader. Given the transcript's segment texts, return one
// translation per sentence, aligned by index.
//
// Request:  { sentences: string[], target_lang: string }
// Response: { translations: string[] }  // same length/order as `sentences`
//
// The Anthropic key never reaches the client — it lives in ANTHROPIC_API_KEY.
// Admin-only: requireAdmin() runs before any work.

import { cors, requireAdmin } from '../_shared/require-admin.ts'
import { translateSentences } from './translate.ts'

type TranslateRequest = { sentences: string[]; target_lang: string }

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

  const { sentences, target_lang }: Partial<TranslateRequest> = await req.json().catch(() => ({}))
  if (!Array.isArray(sentences) || sentences.length === 0 || !target_lang) {
    return jsonError('missing_fields', 400)
  }

  const translations = await translateSentences(sentences, target_lang)
  if (!translations) return jsonError('translation_failed', 502)

  return new Response(JSON.stringify({ translations }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
})
