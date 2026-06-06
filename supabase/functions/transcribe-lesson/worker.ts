// Background worker for async lesson transcription. Runs after the HTTP handler
// has already returned 202 (kept alive by EdgeRuntime.waitUntil), so it never
// blocks the caller. It always settles the lesson row to a terminal state —
// 'ready' with the transcript, or 'failed' with a machine-readable error_code —
// so the FE never sees a row stuck mid-flight from a handled error.

import { type SupabaseClient } from '@supabase/supabase-js'
import { transcribeAudioFile, TranscribeError } from './transcribe.ts'
import { translateSentences } from '../_shared/transcription/translate.ts'
import { readSentences } from '../_shared/transcription/transliterate.ts'
import { type TargetScript } from '../_shared/transcription/script.ts'

// Interlinear translations are English-only in admin v1 (matches the term
// popover's target). A per-member target language can replace this later.
const TARGET_LANG = 'English'
const BUCKET = 'audio-lessons'

export type LessonJob = {
  id: number
  audio_path: string
  script: TargetScript
}

type Segment = { start: number; end: number; text: string; translation?: string }
type Word = { word: string; start: number; end: number; reading?: string }

export async function runTranscription(admin: SupabaseClient, lesson: LessonJob): Promise<void> {
  try {
    await update(admin, lesson.id, { phase: 'transcribing' })
    const file = await downloadAudio(admin, lesson.audio_path)
    const transcript = await transcribeAudioFile(file, lesson.script)

    await update(admin, lesson.id, { phase: 'translating' })
    const segments = await translateSegments(transcript.segments)

    await update(admin, lesson.id, { phase: 'transliterating' })
    const words = await transliterateWords(
      transcript.words,
      transcript.segments,
      transcript.text,
      transcript.lang
    )

    await update(admin, lesson.id, {
      status: 'ready',
      phase: null,
      error_code: null,
      lang: transcript.lang ?? null,
      transcript: { text: transcript.text, segments, words }
    })
  } catch (error) {
    const code = error instanceof TranscribeError ? error.code : 'unknown'
    console.error(`Lesson ${lesson.id} transcription failed:`, code, error)
    await update(admin, lesson.id, { status: 'failed', phase: null, error_code: code })
  }
}

async function update(
  admin: SupabaseClient,
  id: number,
  patch: Record<string, unknown>
): Promise<void> {
  await admin.from('lessons').update(patch).eq('id', id)
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
