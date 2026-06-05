// Translation core for the interlinear reader, kept separate from the HTTP
// handler in index.ts so it can be unit-tested directly. Given source
// sentences, returns one translation per sentence (aligned by index) using
// Claude Haiku with structured output. Sentences are translated in batches so a
// long lesson can't blow max_tokens.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

// Few enough that a batch's translations comfortably fit under max_tokens, but
// large enough to keep the number of round-trips (and cost) low.
const BATCH_SIZE = 25

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
  'You translate transcript sentences for language learners. ' +
  'Translate each numbered source sentence into the requested target language. ' +
  'Return one translation per sentence, in the same order, with exactly as many ' +
  'translations as sentences given. Keep each translation faithful and natural, ' +
  'with no notes, numbering, or commentary.'

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  return batches
}

// Translate one batch. Returns the aligned translations, or null on any failure
// (upstream error, refusal, truncation, or a count that doesn't match the input).
async function translateBatch(sentences: string[], target_lang: string): Promise<string[] | null> {
  const numbered = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')
  const userPrompt = `Target language: ${target_lang}\nSentences (${sentences.length}):\n${numbered}`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: RESULT_SCHEMA } },
      messages: [{ role: 'user', content: userPrompt }]
    })
  })

  if (!res.ok) {
    console.error('Anthropic error', res.status, await res.text())
    return null
  }

  const data = await res.json()
  if (data?.stop_reason === 'max_tokens' || data?.stop_reason === 'refusal') return null

  const raw = data?.content?.[0]?.text ?? ''

  let translations: unknown
  try {
    translations = (JSON.parse(raw) as { translations?: unknown }).translations
  } catch {
    console.error('Unparseable Claude response', raw)
    return null
  }

  if (!Array.isArray(translations) || translations.length !== sentences.length) return null
  return translations.map(String)
}

// Translate every sentence, batching internally. Returns the full aligned list,
// or null if any batch fails — so callers treat it as all-or-nothing.
export async function translateSentences(
  sentences: string[],
  target_lang: string
): Promise<string[] | null> {
  const translations: string[] = []

  for (const batch of chunk(sentences, BATCH_SIZE)) {
    const result = await translateBatch(batch, target_lang)
    if (!result) return null
    translations.push(...result)
  }

  return translations
}
