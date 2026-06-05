// Reading core for the interlinear reader, kept separate from the HTTP handler
// in index.ts so it can be unit-tested directly. Given the transcript's word
// tokens, returns one phonetic reading per word (aligned by index) using Claude
// Haiku with structured output. Words are processed in batches so a long lesson
// can't blow max_tokens.
//
// Readings are pronunciation aids in the conventional system for the source
// language — hiragana furigana over Japanese kanji, pinyin over Mandarin, etc.
// A word that needs none (punctuation, numbers, already-phonetic/Latin text)
// gets an empty string, so Latin-script lessons come back all-empty.
//
// Words are sent without surrounding sentence context, which is enough for most
// scripts; context-sensitive kanji readings may suffer and could be improved
// later by batching per sentence with the sentence text as context.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

// Readings are short, so a larger batch than translation still fits comfortably
// under max_tokens while keeping round-trips (and cost) low.
const BATCH_SIZE = 50

// Structured outputs constrain the body to a guaranteed-parseable array of
// strings. The schema can't pin the array length, so we instruct the count in
// the prompt and verify it per batch (count drift => failure).
const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    readings: { type: 'array', items: { type: 'string' } }
  },
  required: ['readings'],
  additionalProperties: false
}

const SYSTEM_PROMPT =
  'You provide pronunciation readings for language learners. ' +
  'For each numbered word in the given source language, return its phonetic ' +
  'reading in that language’s conventional system (hiragana for Japanese kanji, ' +
  'pinyin with tone marks for Mandarin, and so on). ' +
  'Return an empty string for any word that needs no reading: punctuation, ' +
  'numbers, or text already written in a phonetic or Latin script. ' +
  'Return one reading per word, in the same order, with exactly as many ' +
  'readings as words given, and no notes, numbering, or commentary.'

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  return batches
}

// Read one batch. Returns the aligned readings, or null on any failure (upstream
// error, refusal, truncation, or a count that doesn't match the input).
async function readBatch(words: string[], lang: string): Promise<string[] | null> {
  const numbered = words.map((w, i) => `${i + 1}. ${w}`).join('\n')
  const userPrompt = `Source language: ${lang}\nWords (${words.length}):\n${numbered}`

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

  let readings: unknown
  try {
    readings = (JSON.parse(raw) as { readings?: unknown }).readings
  } catch {
    console.error('Unparseable Claude response', raw)
    return null
  }

  if (!Array.isArray(readings) || readings.length !== words.length) return null
  return readings.map(String)
}

// Read every word, batching internally. Returns the full aligned list, or null
// if any batch fails — so callers treat it as all-or-nothing.
export async function readWords(words: string[], lang: string): Promise<string[] | null> {
  const readings: string[] = []

  for (const batch of chunk(words, BATCH_SIZE)) {
    const result = await readBatch(batch, lang)
    if (!result) return null
    readings.push(...result)
  }

  return readings
}
