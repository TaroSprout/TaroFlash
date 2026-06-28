// Translation core for the interlinear reader, kept separate from the HTTP
// handler in index.ts so it can be unit-tested directly. Given source
// sentences, returns one translation per sentence (aligned by index) using
// Claude Haiku with structured output. Sentences are translated in batches so a
// long lesson can't blow max_tokens.
//
// Each batch also carries its neighbouring sentences as read-only CONTEXT, so a
// short, isolated Whisper segment (a dropped-subject fragment, a bare pronoun)
// is translated with the surrounding flow in view rather than in a vacuum — the
// model still emits exactly one translation per target sentence.

import { requestStructured } from './anthropic.ts'

const MODEL = 'claude-haiku-4-5'

// Few enough that a batch's translations comfortably fit under max_tokens, but
// large enough to keep the number of round-trips (and cost) low.
const BATCH_SIZE = 25

// Neighbouring source sentences shown as read-only context on each side of a
// batch, so the sentences at a batch's edges aren't translated context-starved.
const CONTEXT_WINDOW = 5

// Structured outputs constrain the body to a guaranteed-parseable array of
// strings. The schema can't pin the array length, so we instruct the count in
// the prompt and verify it per batch (count drift => failure).
const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    translations: { type: 'array', items: { type: 'string' } }
  },
  required: ['translations'],
  additionalProperties: false
}

const SYSTEM_PROMPT =
  'You translate a transcript for language learners, using the surrounding lines ' +
  'for context. You are given ordered CONTEXT lines (already understood — do NOT ' +
  'translate them) and numbered TARGET lines. Use the context and the other ' +
  'target lines to resolve dropped subjects, pronouns, and sentence flow, then ' +
  'translate each TARGET line into the requested target language. Return exactly ' +
  'one translation per TARGET line, in the same order, each rendering only its ' +
  'own line — faithful and natural, with no notes, numbering, or commentary.'

// Render a labelled context block, or '' when there's nothing on that side (the
// first/last batch of a lesson). Kept out of the prompt entirely when empty so
// the model never sees a dangling "Context before:" header.
function contextBlock(label: string, lines: string[]): string {
  if (lines.length === 0) return ''
  return `\n\n${label}:\n${lines.join('\n')}`
}

// Translate one batch of TARGET sentences, with `before`/`after` neighbours given
// as context only. Returns the aligned translations, or null on any failure
// (upstream error, refusal, truncation, or a count that doesn't match the input).
async function translateBatch(
  target: string[],
  before: string[],
  after: string[],
  target_lang: string
): Promise<string[] | null> {
  const numbered = target.map((s, i) => `${i + 1}. ${s}`).join('\n')
  const userPrompt =
    `Target language: ${target_lang}` +
    contextBlock('Context before', before) +
    `\n\nTARGET (${target.length} lines to translate):\n${numbered}` +
    contextBlock('Context after', after)

  const raw = await requestStructured({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    schema: RESULT_SCHEMA
  })
  if (raw === null) return null

  let translations: unknown
  try {
    translations = (JSON.parse(raw) as { translations?: unknown }).translations
  } catch {
    console.error('Unparseable Claude response', raw)
    return null
  }

  if (!Array.isArray(translations) || translations.length !== target.length) return null
  return translations.map(String)
}

// Translate every sentence, batching internally. `lead`/`tail` are sentences
// adjacent to this slice but outside it (the caller processes a lesson in slices),
// so even the very first and last sentences of a slice get neighbour context.
// Returns the full aligned list, or null if any batch fails — callers treat it as
// all-or-nothing.
export async function translateSentences(
  sentences: string[],
  target_lang: string,
  lead: string[] = [],
  tail: string[] = []
): Promise<string[] | null> {
  // One flat timeline (outside context + the slice) so a batch can pull neighbours
  // across batch boundaries and across the slice edges uniformly.
  const timeline = [...lead, ...sentences, ...tail]
  const offset = lead.length
  const translations: string[] = []

  for (let start = 0; start < sentences.length; start += BATCH_SIZE) {
    const stop = Math.min(start + BATCH_SIZE, sentences.length)
    const target = sentences.slice(start, stop)
    const before = timeline.slice(Math.max(0, offset + start - CONTEXT_WINDOW), offset + start)
    const after = timeline.slice(offset + stop, offset + stop + CONTEXT_WINDOW)

    const result = await translateBatch(target, before, after, target_lang)
    if (!result) return null
    translations.push(...result)
  }

  return translations
}
