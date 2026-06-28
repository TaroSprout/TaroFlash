// One-phase-per-invocation worker for async lesson transcription. The DB chain
// trigger (see migrations 20260606000003 + 20260627000000) fires this once per
// step via pg_net: each call runs EXACTLY ONE unit of work, persists its result,
// and advances a state-machine pointer — and that write fires the next call. The
// final step settles the row to 'ready'; any thrown error settles it to 'failed'
// with a machine-readable code.
//
// The phase order is:
//   transcribing (looped over the audio chunks) -> chaptering -> translating
//   -> transliterating -> ready
//
// 'transcribing' is itself a LOOP: long audio is split client-side into ordered,
// overlapping chunks, and each invocation transcribes the chunk at `chunk_cursor`,
// stitches it onto the running transcript by its time offset, and advances the
// cursor (which re-fires the chain). Only the LAST chunk advances `phase`.
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
import { type TargetScript } from '../_shared/transcription/script.ts'

// Interlinear translations are English-only in admin v1 (matches the term
// popover's target). A per-member target language can replace this later.
const TARGET_LANG = 'English'
const BUCKET = 'audio-lessons'

type Segment = { start: number; end: number; text: string; translation?: string }
type Word = { word: string; start: number; end: number; reading?: string }
type Chapter = { title: string; start: number }
type Transcript = { text: string; segments: Segment[]; words: Word[]; chapters?: Chapter[] }

// One audio slice in the lesson's chunk manifest (see migration 20260627000000).
type Chunk = { path: string; offset: number }

// The slice of the lesson row a phase needs. `transcript` accumulates across
// phases: transcribe stitches the skeleton chunk by chunk, chaptering adds
// chapters, translate fills segment translations, transliterate fills readings.
type LessonRow = {
  id: number
  status: string
  phase: string | null
  audio_path: string
  script: TargetScript
  lang: string | null
  transcript: Transcript
  chunks: Chunk[] | null
  chunk_cursor: number | null
}

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
    .select('id, status, phase, audio_path, script, lang, transcript, chunks, chunk_cursor')
    .eq('id', id)
    .single<LessonRow>()

  if (error) {
    console.error(`Lesson ${id} load failed:`, error.message)
    return null
  }
  return data
}

// Phase 1 — Whisper, ONE chunk per invocation. Transcribes the chunk at
// `chunk_cursor`, shifts its local timestamps by the chunk's offset, stitches it
// onto the running transcript (dropping the overlap re-transcribed from the
// previous chunk), and either advances the cursor (more chunks left, re-firing
// the chain) or, on the last chunk, advances `phase` to chaptering.
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

  const stitched = appendChunk(normalizeTranscript(lesson.transcript), incoming)
  const isLast = cursor >= chunks.length - 1

  // Keep the FIRST chunk's detected language — it's the most representative and
  // a later chunk could mis-detect on a short or music-only slice.
  await update(admin, lesson.id, {
    transcript: stitched,
    lang: lesson.lang ?? result.lang ?? null,
    // Last chunk advances the phase; earlier chunks advance the cursor. Exactly
    // one of these changes per write, so the trigger fires exactly once.
    ...(isLast ? { phase: 'chaptering' } : { chunk_cursor: cursor + 1 })
  })
}

// Phase 2 — split the stitched transcript into titled chapters, then advance to
// translating. Best-effort: a failure (or a single-chapter result) just leaves
// the lesson with no in-reader chapter list rather than failing it.
async function runChapter(admin: SupabaseClient, lesson: LessonRow): Promise<void> {
  const t = normalizeTranscript(lesson.transcript)
  const chapters = await detectChapters(t.segments.map((s) => ({ start: s.start, text: s.text })))

  await update(admin, lesson.id, {
    phase: 'translating',
    transcript: { ...t, chapters: chapters ?? [] }
  })
}

// A lesson's transcript starts as `{}` (empty jsonb) and grows; coerce whatever
// is stored into the full shape so the stitch/append logic never guards nulls.
function normalizeTranscript(t: Partial<Transcript> | null | undefined): Transcript {
  return {
    text: t?.text ?? '',
    segments: t?.segments ?? [],
    words: t?.words ?? [],
    chapters: t?.chapters
  }
}

// Append one already-offset chunk onto the running transcript, dropping the lead
// that overlaps what we already have. Chunks overlap by design (so no word is cut
// at a window edge), so the new chunk re-transcribes the tail of the previous
// one; we keep only segments/words that start at or after the last accepted end.
// The boundary is data-driven (the previous content's own end time), so it's
// robust to the exact overlap and to Whisper's segment boundaries not aligning.
function appendChunk(
  acc: Transcript,
  incoming: { segments: Segment[]; words: Word[] }
): Transcript {
  const segBoundary = acc.segments.at(-1)?.end ?? -Infinity
  const wordBoundary = acc.words.at(-1)?.end ?? -Infinity

  const segments = acc.segments.concat(incoming.segments.filter((s) => s.start >= segBoundary))
  const words = acc.words.concat(incoming.words.filter((w) => w.start >= wordBoundary))

  return {
    ...acc,
    text: segments
      .map((s) => s.text)
      .join(' ')
      .trim(),
    segments,
    words
  }
}

// Phase 3 — translate the stored segments in place, then advance to
// transliterating. Best-effort: failure leaves the segments untranslated.
async function runTranslate(admin: SupabaseClient, lesson: LessonRow): Promise<void> {
  const segments = await translateSegments(lesson.transcript.segments ?? [])

  await update(admin, lesson.id, {
    phase: 'transliterating',
    transcript: { ...lesson.transcript, segments }
  })
}

// Phase 4 — read the stored words in place, then settle the row to 'ready'.
// Best-effort: failure leaves words unread rather than failing the lesson.
async function runTransliterate(admin: SupabaseClient, lesson: LessonRow): Promise<void> {
  const t = lesson.transcript
  const words = await transliterateWords(
    t.words ?? [],
    t.segments ?? [],
    t.text,
    lesson.lang ?? undefined
  )

  await update(admin, lesson.id, {
    status: 'ready',
    phase: null,
    error_code: null,
    transcript: { ...t, words }
  })
}

// Every write stamps updated_at — that's the heartbeat the reaper reads to tell
// a live phase-in-progress from a dead one. Unlike the old worker, a failed
// write THROWS (caught by processLessonPhase → settleFailed) rather than being
// silently swallowed, so a row never advances on a write that didn't land.
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

// Best-effort: enrich each segment with its translation for the interlinear
// reader. A failure must NOT sink the lesson — the transcript is already valid —
// so this returns the segments untranslated on any failure.
async function translateSegments(segments: Segment[]): Promise<Segment[]> {
  if (segments.length === 0) return segments

  const translations = await translateSentences(
    segments.map((s) => s.text),
    TARGET_LANG
  )
  if (!translations) return segments

  return segments.map((segment, i) => ({ ...segment, translation: translations[i] }))
}

// Best-effort: enrich each word with its phonetic reading for the furigana
// layer. Like translation, a failure leaves the words unread rather than failing
// the lesson. Empty readings are dropped so only words that need one carry it.
async function transliterateWords(
  words: Word[],
  segments: Segment[],
  _text: string,
  lang: string | undefined
): Promise<Word[]> {
  if (words.length === 0 || !lang) return words

  // Group word indices under their sentence (by timestamp) so the model reads
  // each in context, then scatter the flat, send-order readings back by index.
  const groups = groupWordIndicesBySegment(segments, words)
  const sentences = groups.map((indices, i) => ({
    text: segments[i].text,
    words: indices.map((index) => words[index].word)
  }))
  const ids = groups.flat()

  const readings = await readSentences(sentences, lang)

  const read = words.map((word) => ({ ...word }))
  ids.forEach((id, i) => (read[id].reading = readings[i] || undefined))
  return read
}

// A word belongs to segment `i` when its start falls in that segment's span. The
// first segment also claims words before it; the last claims words after it.
// Slim port of the FE's groupWordsBySentence (indices only — the worker doesn't
// need reconstructed display text).
function groupWordIndicesBySegment(segments: Segment[], words: Word[]): number[][] {
  return segments.map((_, i) => {
    const lower = i === 0 ? -Infinity : segments[i].start
    const upper = segments[i + 1]?.start ?? Infinity
    const indices: number[] = []
    words.forEach((word, index) => {
      if (word.start >= lower && word.start < upper) indices.push(index)
    })
    return indices
  })
}
