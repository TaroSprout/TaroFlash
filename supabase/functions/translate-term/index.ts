// translate-term: given the learner's selected text and its surrounding sentence,
// ask Claude for a reading/part-of-speech faithful to exactly what was selected, a
// general translation reusable as a flashcard answer, and a description that
// situates the selection (the larger word it sits in, its sense here, other uses).
//
// Request:  { term: string, sentence: string, target_lang: string }
// Response: { translation, reading, pos, description }  // all strings
//
// The Anthropic key never reaches the client — it lives in ANTHROPIC_API_KEY.
// Admin-only: requireCapability() runs before any work.

import {
  cors,
  requireCapability as defaultRequireCapability
} from '../_shared/require-capability.ts'

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
  difficulty: number
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
    description: { type: 'string' },
    difficulty: { type: 'integer' }
  },
  required: ['translation', 'reading', 'pos', 'description', 'difficulty'],
  additionalProperties: false
}

// Not prompt-cached: Haiku's minimum cacheable prefix is 4096 tokens and this
// system prompt is far shorter, so cache_control would silently never engage —
// and call volume is low. Revisit if the prompt grows or volume spikes.
const SYSTEM_PROMPT =
  'You are a precise bilingual dictionary for a learner decoding a sentence one selection at a time. ' +
  'The learner selects an arbitrary span of the sentence — it may be a whole word, a single character that is only part of a word, or several characters. ' +
  'Treat the selection literally: every field is about exactly what was selected, no more and no less. ' +
  'When the sentence contains the selected term wrapped in square brackets like [term], those brackets mark the specific occurrence the learner tapped — focus your response on that occurrence only and ignore any other appearances of the same characters elsewhere in the sentence. ' +
  'translation: a general, reusable definition of the selected text — its most common, generally useful meaning(s), suitable on its own as a flashcard answer studied with no sentence around it. If the selection is only part of a larger word, define the selected characters on their own, not the whole word. ' +
  'reading: phonetic reading of exactly the selection (e.g. pinyin for Chinese, romaji for Japanese); empty string if not applicable. ' +
  'pos: part of speech of the selection as used here (noun, verb, particle, etc.). ' +
  'description: 1-3 short sentences. If the selection is only part of a larger word in this sentence, begin by naming that larger word (the word itself — do not gloss it). Then call out the specific meaning the selection carries in this sentence, and mention its other common meanings or uses when it has them. Whenever you name a character, word, or compound in the description — whether the selection itself or a related term — always append its phonetic reading in parentheses immediately after it, e.g. 日落(rìluò) or 落(luò). Never leave a character or compound unreadable. ' +
  'difficulty: integer 1-10 rating how advanced this term is for a learner of the target language. 1 = most basic vocabulary taught in the very first lessons; 10 = rare, literary, or highly specialised vocabulary. Base this on how commonly the term appears in everyday language and how early it would typically be introduced in a structured course.'

// Injectable gate for tests — real callers never pass this, so the shared
// requireCapability() (and its real network calls) is untouched in production.
export type Deps = { requireCapability?: typeof defaultRequireCapability }

export async function handler(req: Request, deps: Deps = {}): Promise<Response> {
  const requireCapability = deps.requireCapability ?? defaultRequireCapability

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  const auth = await requireCapability(req, 'can_read_lesson_audio')
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
      max_tokens: 450,
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
}

if (import.meta.main) {
  Deno.serve((req) => handler(req))
}
