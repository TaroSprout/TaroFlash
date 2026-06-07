// Reading core for the interlinear reader, kept separate from the HTTP handler
// in index.ts so it can be unit-tested directly. Given the transcript's words
// grouped under the sentence they belong to, returns one phonetic reading per
// word — flat and aligned to the words in the order they were sent — using
// Claude Haiku with structured output.
//
// The sentence is passed only as context so the model can pick the reading that
// fits how a polyphonic character is actually used; the reading itself is for
// the source language's conventional system (hiragana furigana over Japanese
// kanji, pinyin over Mandarin, etc.). A word that needs none (pure punctuation,
// Arabic numerals, already-phonetic/Latin text) comes back empty.
//
// Words are batched so a long lesson can't blow max_tokens; numbering runs
// continuously across a batch so the output stays a single flat array.

import { requestStructured } from './anthropic.ts'

const MODEL = 'claude-haiku-4-5'

// Cap words per request so the readings array stays well under max_tokens.
const MAX_WORDS_PER_BATCH = 80

export type ReadingSentence = { text: string; words: string[] }

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
  'You provide pronunciation readings for language learners. You are given ' +
  'numbered word tokens, each grouped under the sentence it comes from; the ' +
  'sentence is context only, for choosing the reading that fits how the token is ' +
  'used. For each numbered token return its phonetic reading in the source ' +
  'language’s conventional system (hiragana for Japanese kanji, pinyin with tone ' +
  'marks for Mandarin, and so on). Every token containing logographic characters ' +
  'MUST get a reading — including numbers written as characters such as 一, 二, ' +
  '三, 十, 百. Return an empty string ONLY for a token that is purely punctuation, ' +
  'an Arabic numeral, whitespace, or already written in a phonetic or Latin ' +
  'script (kana, hangul, romaji, Latin letters). Return exactly one reading per ' +
  'numbered token, in number order, with no notes, numbering, or commentary.'

// Pack sentences into batches whose combined word count stays within the cap.
// Empty sentences carry no tokens to read, so they're dropped here (and on the
// caller's side), keeping the flat output aligned.
function batchSentences(sentences: ReadingSentence[]): ReadingSentence[][] {
  const batches: ReadingSentence[][] = []
  let current: ReadingSentence[] = []
  let count = 0

  for (const sentence of sentences) {
    if (sentence.words.length === 0) continue
    if (count > 0 && count + sentence.words.length > MAX_WORDS_PER_BATCH) {
      batches.push(current)
      current = []
      count = 0
    }
    current.push(sentence)
    count += sentence.words.length
  }

  if (current.length > 0) batches.push(current)
  return batches
}

// Render a batch as context-grouped, continuously-numbered tokens, and report
// how many tokens it holds so the response count can be verified.
function renderBatch(batch: ReadingSentence[]): { prompt: string; total: number } {
  const lines: string[] = []
  let n = 0

  for (const sentence of batch) {
    lines.push(`Context: ${sentence.text}`)
    for (const word of sentence.words) lines.push(`${++n}. ${word}`)
    lines.push('')
  }

  return { prompt: lines.join('\n'), total: n }
}

// Read one batch. Returns the aligned readings, or null on any failure (upstream
// error, refusal, truncation, or a count that doesn't match the input).
async function readBatch(batch: ReadingSentence[], lang: string): Promise<string[] | null> {
  const { prompt, total } = renderBatch(batch)
  const userPrompt =
    `Source language: ${lang}\n\n${prompt}\n` +
    `Return ${total} readings, one per numbered token, in order.`

  const raw = await requestStructured({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    schema: RESULT_SCHEMA
  })
  if (raw === null) return null

  let readings: unknown
  try {
    readings = (JSON.parse(raw) as { readings?: unknown }).readings
  } catch {
    console.error('Unparseable Claude response', raw)
    return null
  }

  if (!Array.isArray(readings) || readings.length !== total) return null
  return readings.map(String)
}

// Read every word, batching internally. Returns the full flat list aligned to
// the words in send order (skipping empty sentences). A batch that fails
// (upstream error, refusal, truncation, or a count mismatch) contributes blank
// readings for its own words rather than sinking the whole lesson — so a single
// hiccup costs that batch's furigana, not all of it.
export async function readSentences(sentences: ReadingSentence[], lang: string): Promise<string[]> {
  const readings: string[] = []

  for (const batch of batchSentences(sentences)) {
    const total = batch.reduce((sum, sentence) => sum + sentence.words.length, 0)
    const result = await readBatch(batch, lang)
    readings.push(...(result ?? new Array<string>(total).fill('')))
  }

  return readings
}
