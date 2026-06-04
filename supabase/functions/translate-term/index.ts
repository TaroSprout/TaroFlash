// translate-term: given a selected term and its surrounding sentence, ask Claude
// for a contextual translation plus reading, part of speech, and a short note.
//
// Request:  { term: string, sentence: string, target_lang: string }
// Response: { translation: string, reading: string, pos: string, description: string }
//
// The Anthropic key never reaches the client — it lives in ANTHROPIC_API_KEY.
// Admin-only: requireAdmin() runs before any work.

import { cors, requireAdmin } from '../_shared/require-admin.ts'

// Machine-readable failure codes the FE switches on (read from the error body).
// `output_truncated` is split out so the UI can say "selection too long" rather
// than a generic error.
function jsonError(code: string, status: number): Response {
  return new Response(JSON.stringify({ code }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

type TranslateRequest = { term: string; sentence: string; target_lang: string }
type TranslationResult = {
  translation: string
  reading: string
  pos: string
  description: string
}

// Structured outputs (Haiku 4.5 supports output_config.format) constrain the
// response to this exact schema, so the body is guaranteed-parseable JSON — far
// more reliable than asking for "JSON only" in the prompt. Note the structured-
// output constraints: every object needs additionalProperties:false, and string
// length / numeric bounds are unsupported.
const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    translation: { type: 'string' },
    reading: { type: 'string' },
    pos: { type: 'string' },
    description: { type: 'string' }
  },
  required: ['translation', 'reading', 'pos', 'description'],
  additionalProperties: false
}

// Not prompt-cached: Haiku's minimum cacheable prefix is 4096 tokens and this
// system prompt is far shorter, so cache_control would silently never engage —
// and call volume is low. Revisit if the prompt grows or volume spikes.
const SYSTEM_PROMPT =
  'You are a precise bilingual dictionary for language learners. ' +
  'Given a term and the sentence it appears in, return its meaning in the requested target language. ' +
  'translation: the meaning of the term in the target language, as used in this sentence. ' +
  'reading: phonetic reading of the term in its own language (e.g. pinyin for Chinese, romaji for Japanese); empty string if not applicable. ' +
  'pos: part of speech (noun, verb, etc.). ' +
  'description: one short sentence of extra nuance or usage context.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { term, sentence, target_lang }: Partial<TranslateRequest> = await req
    .json()
    .catch(() => ({}))
  if (!term || !target_lang) {
    return jsonError('missing_fields', 400)
  }

  const userPrompt =
    `Term: ${term}\n` + `Sentence: ${sentence ?? term}\n` + `Target language: ${target_lang}`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: RESULT_SCHEMA } },
      messages: [{ role: 'user', content: userPrompt }]
    })
  })

  if (!res.ok) {
    console.error('Anthropic error', res.status, await res.text())
    return jsonError('upstream_error', 502)
  }

  const data = await res.json()

  // max_tokens means the selection was too long to answer in full — its own code
  // so the FE can prompt for a shorter selection. A refusal won't match the
  // schema either; both are surfaced rather than half-parsed.
  if (data?.stop_reason === 'max_tokens') return jsonError('output_truncated', 422)
  if (data?.stop_reason === 'refusal') return jsonError('refused', 422)

  const raw = data?.content?.[0]?.text ?? ''

  let parsed: TranslationResult
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error('Unparseable Claude response', raw)
    return jsonError('unparseable', 502)
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
})
