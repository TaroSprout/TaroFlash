// One-phase-per-invocation worker for async lesson transcription. The DB chain
// trigger (see migrations 20260606000003 + 20260627000000) fires this once per
// step via pg_net: each call runs EXACTLY ONE unit of work, persists its result,
// and advances a state-machine pointer — and that write fires the next call. The
// final step settles the row to 'ready'; any thrown error settles it to 'failed'
// with a machine-readable code.
//
// The phase order is:
//   transcribing (looped over the audio chunks) -> chaptering -> paragraphing
//   -> translating -> transliterating -> ready
// Paragraphing and every phase after it is best-effort enrichment, same as
// chaptering — a failure or an unscored sentence never fails the lesson.
// Full chain contract: corpus/media/audio-generation.md
//
// 'transcribing' is itself a LOOP: long audio is split client-side into ordered,
// overlapping chunks, and each invocation transcribes the chunk at `chunk_cursor`,
// appends its sentences to the lesson_sentences rows by their time offset, and
// advances the cursor (which re-fires the chain). Only the LAST chunk advances
// `phase`.
//
// Each sentence lives in its own lesson_sentences row rather than one accumulating
// transcript blob: transcription seeds a row's timing / text / words, and each
// later phase writes only its own column of that row through a targeted RPC, so a
// stage never rewrites another's slice and a replayed step is idempotent.
//
// Because every call returns after a single chunk/step, no isolate ever carries
// the whole pipeline's wall-clock (so we need no EdgeRuntime.waitUntil), and a row
// can only ever be 'processing' between two short, self-contained invocations —
// where the stall reaper can still rescue it if one is hard-killed.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { transcribeAudioFile, TranscribeError } from './transcribe.ts'
import { translateSentences } from '../_shared/transcription/translate.ts'
import { readSentences } from '../_shared/transcription/transliterate.ts'
import { detectChapters } from '../_shared/transcription/chapter.ts'
import { detectBreakStrengths } from '../_shared/transcription/paragraph.ts'
import { type TargetScript } from '../_shared/transcription/script.ts'
import type { SentenceRow } from '../_shared/transcription/transcript.ts'
import { sentenceRowsForChunk, type StoredSentence } from './transcript-shapers.ts'

// Interlinear translations are English-only in admin v1 (matches the term
// popover's target). A per-member target language can replace this later.
const TARGET_LANG = 'English'
const BUCKET = 'audio-lessons'

// Like transcription, the enrichment phases process the sentences a SLICE at a
// time per invocation (advancing chunk_cursor, which re-fires the chain) so a
// long book's hundreds of Claude calls never pile into one isolate — which would
// blow the edge wall-clock and the stall reaper's heartbeat. Transliteration is
// the heavier call per sentence (one reading per word), so it takes a smaller bite.
const TRANSLATE_SEG_BATCH = 80
const TRANSLITERATE_SEG_BATCH = 30

// Paragraph scoring returns just one number per sentence, so a slice can be
// larger than translation's — it batches internally to stay under max_tokens.
const PARAGRAPH_SEG_BATCH = 120

// Sentences either side of a translate slice handed to the translator as read-only
// context, so a sentence at the slice boundary isn't translated context-starved.
const TRANSLATE_CONTEXT_SEG = 5

// The same read-only neighbour context for a paragraph-scoring slice, so a break
// at the slice edge is judged against its surroundings.
const PARAGRAPH_CONTEXT_SEG = 5

// One audio slice in the lesson's chunk manifest (see migration 20260627000000).
type Chunk = { path: string; offset: number }

// The slice of the lesson row a phase needs. Sentences no longer live on the row —
// they're in lesson_sentences — so this carries only the state-machine fields plus
// the audio inputs transcription reads.
type LessonRow = {
  id: number
  status: string
  phase: string | null
  audio_path: string
  script: TargetScript
  lang: string | null
  chunks: Chunk[] | null
  chunk_cursor: number | null
}

// A stored sentence read back for an enrichment phase: its ordinal (the RPC key),
// its text (translate/chapter context), and its words (transliteration input).
type SentenceReadback = { ordinal: number; text: string; words: { word: string }[] }

// Service-role client for the internal `process` step. It bypasses RLS because
// the worker writes rows on behalf of the owner after the DB trigger (not a
// signed-in member) invoked it.
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

// Run the one phase the row is currently on, then return. On a handled error,
// settle the row to 'failed' so the FE shows it (rather than leaving it for the
// reaper). An unhandled crash leaves the row 'processing' for the reaper.
export async function processLessonPhase(admin: SupabaseClient, lessonId: number): Promise<void> {
  const lesson = await loadLesson(admin, lessonId)
  // Idempotency: a duplicate/late trigger delivery (or a reaper that already
  // settled the row) must never re-run a phase on a non-processing row.
  if (!lesson || lesson.status !== 'processing') return

  try {
    if (lesson.phase === 'transcribing') return await runTranscribe(admin, lesson)
    if (lesson.phase === 'chaptering') return await runChapter(admin, lesson)
    if (lesson.phase === 'paragraphing') return await runParagraph(admin, lesson)
    if (lesson.phase === 'translating') return await runTranslate(admin, lesson)
    if (lesson.phase === 'transliterating') return await runTransliterate(admin, lesson)
  } catch (error) {
    const code = error instanceof TranscribeError ? error.code : 'unknown'
    console.error(`Lesson ${lessonId} phase ${lesson.phase} failed:`, code, error)
    await settleFailed(admin, lessonId, code)
  }
}

async function loadLesson(admin: SupabaseClient, id: number): Promise<LessonRow | null> {
  const { data, error } = await admin
    .from('lessons')
    .select('id, status, phase, audio_path, script, lang, chunks, chunk_cursor')
    .eq('id', id)
    .single<LessonRow>()

  if (error) {
    console.error(`Lesson ${id} load failed:`, error.message)
    return null
  }
  return data
}

// The lesson's sentences in playback order. Every enrichment phase reloads them
// fresh — the same whole-transcript read the blob worker did, just relational.
async function loadSentences<T>(
  admin: SupabaseClient,
  lessonId: number,
  columns: string
): Promise<T[]> {
  const { data, error } = await admin
    .from('lesson_sentences')
    .select(columns)
    .eq('lesson_id', lessonId)
    .order('ordinal', { ascending: true })

  if (error) throw new Error(`lesson ${lessonId} sentences load failed: ${error.message}`)
  return (data ?? []) as T[]
}

// Phase 1 — Whisper, ONE chunk per invocation. Transcribes the chunk at
// `chunk_cursor`, shifts its local timestamps by the chunk's offset, appends its
// sentences after the ones already stored (dropping the overlap re-transcribed
// from the previous chunk), and either advances the cursor (more chunks left,
// re-firing the chain) or, on the last chunk, advances `phase` to chaptering.
async function runTranscribe(admin: SupabaseClient, lesson: LessonRow): Promise<void> {
  const chunks = lesson.chunks?.length ? lesson.chunks : [{ path: lesson.audio_path, offset: 0 }]
  const cursor = lesson.chunk_cursor ?? 0
  const chunk = chunks[cursor] ?? chunks[chunks.length - 1]

  const file = await downloadAudio(admin, chunk.path)
  const result = await transcribeAudioFile(file, lesson.script)

  const offset = chunk.offset ?? 0
  const incoming = {
    segments: result.segments.map((s) => ({
      start: s.start + offset,
      end: s.end + offset,
      text: s.text
    })),
    words: result.words.map((w) => ({ word: w.word, start: w.start + offset, end: w.end + offset }))
  }

  const existing = await loadSentences<StoredSentence>(
    admin,
    lesson.id,
    'start_seconds, end_seconds, text, words'
  )
  const rows = sentenceRowsForChunk(existing, incoming)
  if (rows.length) await upsertSentences(admin, lesson.id, rows)

  const isLast = cursor >= chunks.length - 1

  // Keep the FIRST chunk's detected language — it's the most representative and
  // a later chunk could mis-detect on a short or music-only slice.
  await update(admin, lesson.id, {
    lang: lesson.lang ?? result.lang ?? null,
    // Last chunk advances the phase and resets the cursor (the enrichment phases
    // reuse it as a per-phase sentence counter); earlier chunks just advance it.
    // Exactly one field changes per write, so the trigger fires exactly once.
    ...(isLast ? { phase: 'chaptering', chunk_cursor: 0 } : { chunk_cursor: cursor + 1 })
  })
}

// Phase 2 — split the stored sentences into titled chapters, then advance to
// paragraphing. Best-effort: a failure (or a single-chapter result) just leaves
// the lesson with no in-reader chapter list rather than failing it.
async function runChapter(admin: SupabaseClient, lesson: LessonRow): Promise<void> {
  const rows = await loadSentences<{ ordinal: number; start_seconds: number; text: string }>(
    admin,
    lesson.id,
    'ordinal, start_seconds, text'
  )
  const chapters = await detectChapters(rows.map((r) => ({ start: r.start_seconds, text: r.text })))

  const marks = chapterMarks(chapters ?? [], rows)
  await admin.rpc('set_lesson_chapters', { p_lesson_id: lesson.id, p_chapters: marks })

  await update(admin, lesson.id, { phase: 'paragraphing', chunk_cursor: 0 })
}

// Phase 3 — score a SLICE of sentences' paragraph-break strengths per invocation,
// advancing the cursor until every sentence is scored, then advance to translating.
// Best-effort: a failed slice leaves those sentences unscored (break_strength stays
// null) but still advances, so the pass never fails a lesson.
async function runParagraph(admin: SupabaseClient, lesson: LessonRow): Promise<void> {
  const rows = await loadSentences<{ ordinal: number; text: string }>(
    admin,
    lesson.id,
    'ordinal, text'
  )
  const cursor = lesson.chunk_cursor ?? 0
  const end = Math.min(cursor + PARAGRAPH_SEG_BATCH, rows.length)

  const slice = rows.slice(cursor, end)
  // Neighbour sentences just outside this slice, passed as read-only context so a
  // sentence at the slice edge is scored against its surroundings, not in isolation.
  const lead = rows.slice(Math.max(0, cursor - PARAGRAPH_CONTEXT_SEG), cursor)
  const tail = rows.slice(end, end + PARAGRAPH_CONTEXT_SEG)
  const strengths = await detectBreakStrengths(
    slice.map((s) => s.text),
    lead.map((s) => s.text),
    tail.map((s) => s.text)
  )

  if (strengths) {
    // Only sentences the model gave a usable score for are written; a null entry
    // is left out so its break_strength stays null — "scored later or not at all".
    const patch = slice
      .map((s, i) => ({ ordinal: s.ordinal, strength: strengths[i] }))
      .filter((p) => p.strength !== null)
    if (patch.length)
      await admin.rpc('set_lesson_break_strengths', { p_lesson_id: lesson.id, p_strengths: patch })
  }

  const done = end >= rows.length
  await update(
    admin,
    lesson.id,
    done ? { phase: 'translating', chunk_cursor: 0 } : { chunk_cursor: end }
  )
}

// Phase 4 — translate a SLICE of sentences per invocation, advancing the cursor
// until every sentence is done, then advance to transliterating. Best-effort: a
// failed batch leaves that slice untranslated but still advances. The per-slice
// write is also the reaper heartbeat.
async function runTranslate(admin: SupabaseClient, lesson: LessonRow): Promise<void> {
  const rows = await loadSentences<{ ordinal: number; text: string }>(
    admin,
    lesson.id,
    'ordinal, text'
  )
  const cursor = lesson.chunk_cursor ?? 0
  const end = Math.min(cursor + TRANSLATE_SEG_BATCH, rows.length)

  const slice = rows.slice(cursor, end)
  // Neighbour sentences just outside this slice, passed as read-only context so a
  // sentence at the slice edge is still translated with its surroundings in view.
  const lead = rows.slice(Math.max(0, cursor - TRANSLATE_CONTEXT_SEG), cursor)
  const tail = rows.slice(end, end + TRANSLATE_CONTEXT_SEG)
  const translations = await translateSentences(
    slice.map((s) => s.text),
    TARGET_LANG,
    lead.map((s) => s.text),
    tail.map((s) => s.text)
  )

  if (translations) {
    const patch = slice.map((s, i) => ({ ordinal: s.ordinal, translation: translations[i] }))
    await admin.rpc('set_lesson_translations', { p_lesson_id: lesson.id, p_translations: patch })
  }

  const done = end >= rows.length
  await update(
    admin,
    lesson.id,
    done ? { phase: 'transliterating', chunk_cursor: 0 } : { chunk_cursor: end }
  )
}

// Phase 5 — read the words of a SLICE of sentences per invocation, advancing the
// cursor until every sentence is done, then settle the row to 'ready'. Best-effort:
// a failed batch leaves that slice unread but still advances.
async function runTransliterate(admin: SupabaseClient, lesson: LessonRow): Promise<void> {
  const rows = await loadSentences<SentenceReadback>(admin, lesson.id, 'ordinal, text, words')
  const cursor = lesson.chunk_cursor ?? 0
  const end = Math.min(cursor + TRANSLITERATE_SEG_BATCH, rows.length)

  const patch = await readingsForSlice(rows.slice(cursor, end), lesson.lang ?? undefined)
  if (patch.length)
    await admin.rpc('set_lesson_readings', { p_lesson_id: lesson.id, p_readings: patch })

  const done = end >= rows.length
  await update(
    admin,
    lesson.id,
    done ? { status: 'ready', phase: null, error_code: null } : { chunk_cursor: end }
  )
}

async function upsertSentences(
  admin: SupabaseClient,
  lessonId: number,
  rows: SentenceRow[]
): Promise<void> {
  const { error } = await admin.rpc('upsert_lesson_sentences', {
    p_lesson_id: lessonId,
    p_sentences: rows
  })
  if (error) throw new Error(`lesson ${lessonId} sentence upsert failed: ${error.message}`)
}

// Every write stamps updated_at — that's the heartbeat the reaper reads to tell
// a live phase-in-progress from a dead one. Unlike the old worker, a failed
// write THROWS (caught by processLessonPhase → settleFailed) rather than being
// silently swallowed, so a row never advances on a write that didn't land.
// Trap: the reaper strands healthy slow jobs →[K:stall-reaper-strands-slow-jobs]
async function update(
  admin: SupabaseClient,
  id: number,
  patch: Record<string, unknown>
): Promise<void> {
  const { error } = await admin
    .from('lessons')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`lesson ${id} update failed: ${error.message}`)
}

// Best-effort terminal write. If even this fails there's nothing more to do —
// the row stays 'processing' and the reaper settles it later.
async function settleFailed(admin: SupabaseClient, id: number, code: string): Promise<void> {
  const { error } = await admin
    .from('lessons')
    .update({
      status: 'failed',
      phase: null,
      error_code: code,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) console.error(`Lesson ${id} settle-failed write failed:`, error.message)
}

async function downloadAudio(admin: SupabaseClient, path: string): Promise<File> {
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) throw new TranscribeError('audio_unavailable')

  // Whisper detects format from the filename extension, so preserve the stored
  // object's name (e.g. `<uid>.m4a`) rather than a generic blob name.
  const name = path.split('/').pop() ?? 'audio'
  return new File([data], name, { type: data.type })
}

// Map the chapter starts the model chose back to the ordinal of the sentence each
// opens on. The first chapter always covers from the very start (detectChapters
// forces its start to 0), so it lands on the first sentence; the rest match the
// exact start time they were derived from.
function chapterMarks(
  chapters: { title: string; start: number }[],
  rows: { ordinal: number; start_seconds: number }[]
): { ordinal: number; title: string }[] {
  const marks: { ordinal: number; title: string }[] = []

  chapters.forEach((chapter, i) => {
    const row = i === 0 ? rows[0] : rows.find((r) => r.start_seconds === chapter.start)
    if (row) marks.push({ ordinal: row.ordinal, title: chapter.title })
  })

  return marks
}

// Best-effort readings for a slice of sentences: group each sentence's own words
// under it so the model reads them in context, then split the flat send-order
// readings back per sentence, index-aligned to that sentence's words. A slice with
// no words (or no detected language) yields no patch, leaving those rows unread.
async function readingsForSlice(
  slice: SentenceReadback[],
  lang: string | undefined
): Promise<{ ordinal: number; readings: (string | null)[] }[]> {
  const sentences = slice
    .filter((s) => s.words.length > 0)
    .map((s) => ({ text: s.text, words: s.words.map((w) => w.word) }))
  if (!lang || sentences.length === 0) return []

  const readings = await readSentences(sentences, lang)

  let cursor = 0
  const patch: { ordinal: number; readings: (string | null)[] }[] = []
  for (const sentence of slice) {
    if (sentence.words.length === 0) continue
    const slot = readings.slice(cursor, cursor + sentence.words.length)
    cursor += sentence.words.length
    patch.push({ ordinal: sentence.ordinal, readings: slot.map((r) => r || null) })
  }

  return patch
}
