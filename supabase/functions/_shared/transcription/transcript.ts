// The lesson transcript's shape as the worker's phases build it up: transcribe
// stitches the skeleton chunk by chunk, chaptering adds chapters, translate
// fills segment translations, transliterate fills word readings. Every phase
// file imports these instead of declaring its own copy.

export type Segment = { start: number; end: number; text: string; translation?: string }
export type Word = { word: string; start: number; end: number; reading?: string }
export type Chapter = { title: string; start: number }
export type Transcript = { text: string; segments: Segment[]; words: Word[]; chapters?: Chapter[] }

/**
 * One persisted transcript sentence — the relational replacement for the blob.
 *
 * Each phase owns a disjoint set of these columns: transcribe seeds ordinal /
 * timing / text / words / paragraph_gap; chaptering stamps chapter_title on the
 * sentence a chapter opens on; translating fills translation; transliterating
 * fills readings (one entry per word, index-aligned to `words`).
 */
export type SentenceRow = {
  ordinal: number
  start_seconds: number
  end_seconds: number
  text: string
  words: Word[]
  paragraph_gap: number
}
