import { useMutation, useQueryCache } from '@pinia/colada'
import { useMemberStore } from '@/stores/member'
import uid from '@/utils/uid'
import logger from '@/utils/logger'
import { uploadLessonAudio, deleteLessonAudio } from '../db/audio'
import { transcribeAudio, translateTranscript, transliterateTranscript } from '../db/ai'
import { createLesson } from '../db/lessons'
import { groupWordsBySentence } from '@/utils/transcript'

// Interlinear translations are English-only in admin v1 (matches the term
// popover's target). A per-member target language can replace this later.
const TARGET_LANG = 'English'

export type CreateLessonPhase = 'transcribing' | 'translating' | 'transliterating'

export type CreateLessonVars = {
  // The collection the new lesson is uploaded into.
  collection_id: number
  title: string
  file: File
  // Which Chinese script to convert the transcript to (Whisper tends to emit
  // Traditional). 'original' leaves Whisper's output untouched.
  script?: TranscriptScript
  // Reports the long-running phase so the upload UI can label its progress.
  onPhase?: (phase: CreateLessonPhase) => void
}

export function useCreateLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: async ({
      collection_id,
      title,
      file,
      script,
      onPhase
    }: CreateLessonVars): Promise<Lesson> => {
      const ext = (file.name.split('.').pop() || 'mp3').toLowerCase()
      const path = `${useMemberStore().id}/${uid()}.${ext}`

      await uploadLessonAudio(path, file)

      try {
        const { text, segments, words, lang } = await transcribeAudio(file, script)
        const translated = await translateSegments(segments, onPhase)
        const read = await transliterateWords(words, segments, text, lang, onPhase)
        return await createLesson({
          collection_id,
          title,
          audio_path: path,
          transcript: { text, segments: translated, words: read },
          lang
        })
      } catch (error) {
        // Transcription or the create RPC failed after the upload — there's no
        // media row yet, so the cleanup cron won't reap it. Remove the orphan now.
        await deleteLessonAudio(path).catch(() => {})
        throw error
      }
    },
    onSettled: (_data, _error, { collection_id }) => {
      // The lesson list is keyed by collection; the collection's lesson_count
      // (read from the counts view) also changed.
      queryCache.invalidateQueries({ key: ['lessons', collection_id] })
      queryCache.invalidateQueries({ key: ['lesson-collections'] })
    }
  })
}

/**
 * Best-effort: enrich each segment with its translation for the interlinear
 * reader. A translation failure must NOT sink the upload — we already hold a
 * valid transcript — so this swallows errors and returns the segments
 * untranslated, leaving them for the backfill path.
 */
async function translateSegments(
  segments: TranscriptSegment[],
  onPhase?: (phase: CreateLessonPhase) => void
): Promise<TranscriptSegment[]> {
  if (segments.length === 0) return segments

  onPhase?.('translating')
  try {
    const { translations } = await translateTranscript({
      sentences: segments.map((s) => s.text),
      target_lang: TARGET_LANG
    })
    return segments.map((segment, i) => ({ ...segment, translation: translations[i] }))
  } catch (error) {
    logger.error(`Lesson translation failed: ${(error as Error).message}`)
    return segments
  }
}

/**
 * Best-effort: enrich each word with its phonetic reading for the furigana
 * layer. Like translation, a failure must NOT sink the upload — we already hold
 * a valid transcript — so this swallows errors and returns the words unread.
 * Empty readings are dropped so only words that need one carry it.
 */
async function transliterateWords(
  words: TranscriptWord[] | undefined,
  segments: TranscriptSegment[],
  text: string,
  lang: string | undefined,
  onPhase?: (phase: CreateLessonPhase) => void
): Promise<TranscriptWord[] | undefined> {
  if (!words || words.length === 0 || !lang) return words

  onPhase?.('transliterating')
  try {
    // Group words under their sentence so the model reads each in context, then
    // scatter the flat, send-order readings back onto the words by global index.
    const grouped = groupWordsBySentence(segments, words, text)
    const sentences = grouped.map((group) => ({
      text: group.sentence,
      words: group.words.map((word) => words[word.index].word)
    }))
    const ids = grouped.flatMap((group) => group.words.map((word) => word.index))

    const { readings } = await transliterateTranscript({ sentences, lang })

    const read = words.map((word) => ({ ...word }))
    ids.forEach((id, i) => (read[id].reading = readings[i] || undefined))
    return read
  } catch (error) {
    logger.error(`Lesson transliteration failed: ${(error as Error).message}`)
    return words
  }
}
