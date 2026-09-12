// Paragraph-break scoring for the audio reader: how strongly a new paragraph
// should begin at each transcript sentence.

import { requestStructured } from './anthropic.ts'

const MODEL = 'claude-haiku-4-5'

// Few enough that a batch's scores comfortably fit under max_tokens, but large
// enough to keep the number of round-trips (and cost) low.
const BATCH_SIZE = 40

// Neighbouring sentences shown as read-only context on each side of a batch, so
// a sentence at a batch edge is scored against its surroundings, not in a vacuum.
const CONTEXT_WINDOW = 5

// Structured outputs constrain the body to a guaranteed-parseable array of
// numbers. The schema can't pin the array length or the 0–1 range, so we instruct
// both in the prompt and verify/clamp per batch.
const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    strengths: { type: 'array', items: { type: 'number' } }
  },
  required: ['strengths'],
  additionalProperties: false
}

const SYSTEM_PROMPT =
  'You analyse a transcript for language learners and decide where paragraph ' +
  'breaks belong. You are given ordered CONTEXT lines (already handled — do NOT ' +
  'score them) and numbered TARGET lines. For each TARGET line, judge how strongly ' +
  'a new paragraph should begin at that line: how far the meaning shifts into a new ' +
  'topic, scene, or turn compared with the line before it. Judge by meaning alone, ' +
  'the same way for every language — ignore punctuation and ignore whether the ' +
  "language's written form uses paragraphs at all. Return exactly one number per " +
  'TARGET line, in the same order, each between 0 and 1: 0 continues the same ' +
  'thought, 1 is a clear shift to something new. Return only the numbers.'

/** Clamp a model-returned score into [0, 1], or null when it isn't a usable number
 * (so that sentence is left unscored rather than stored with a bogus strength). */
function clampStrength(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(1, Math.max(0, n))
}

/** Score one batch of TARGET sentences, with `before`/`after` neighbours given as
 * context only. Returns the aligned scores, or null on any failure (upstream
 * error, refusal, truncation, or a count that doesn't match the input). */
async function scoreBatch(
  target: string[],
  before: string[],
  after: string[]
): Promise<(number | null)[] | null> {
  const numbered = target.map((s, i) => `${i + 1}. ${s}`).join('\n')
  const userPrompt =
    contextBlock('Context before', before) +
    `\n\nTARGET (${target.length} lines to score):\n${numbered}` +
    contextBlock('Context after', after)

  const raw = await requestStructured({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    schema: RESULT_SCHEMA
  })
  if (raw === null) return null

  let strengths: unknown
  try {
    strengths = (JSON.parse(raw) as { strengths?: unknown }).strengths
  } catch {
    console.error('Unparseable paragraph response', raw)
    return null
  }

  if (!Array.isArray(strengths) || strengths.length !== target.length) return null
  return strengths.map(clampStrength)
}

/** Render a labelled context block, or '' when there's nothing on that side (the
 * first/last batch of a lesson), so the model never sees a dangling header. */
function contextBlock(label: string, lines: string[]): string {
  if (lines.length === 0) return ''
  return `\n\n${label}:\n${lines.join('\n')}`
}

/** Score every sentence's paragraph-break strength, batching internally. `lead`/
 * `tail` are sentences adjacent to this slice but outside it (the caller processes
 * a lesson in slices), so even the first and last sentences of a slice get
 * neighbour context. Returns the full aligned list (each entry a 0–1 score or null
 * for a sentence the model gave no usable number), or null if any batch fails —
 * callers treat that as the whole slice left unscored. */
export async function detectBreakStrengths(
  sentences: string[],
  lead: string[] = [],
  tail: string[] = []
): Promise<(number | null)[] | null> {
  // One flat timeline (outside context + the slice) so a batch can pull neighbours
  // across batch boundaries and across the slice edges uniformly.
  const timeline = [...lead, ...sentences, ...tail]
  const offset = lead.length
  const strengths: (number | null)[] = []

  for (let start = 0; start < sentences.length; start += BATCH_SIZE) {
    const stop = Math.min(start + BATCH_SIZE, sentences.length)
    const target = sentences.slice(start, stop)
    const before = timeline.slice(Math.max(0, offset + start - CONTEXT_WINDOW), offset + start)
    const after = timeline.slice(offset + stop, offset + stop + CONTEXT_WINDOW)

    const result = await scoreBatch(target, before, after)
    if (!result) return null
    strengths.push(...result)
  }

  return strengths
}
