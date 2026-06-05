import { useMutation, useQueryCache } from '@pinia/colada'
import { useMemberStore } from '@/stores/member'
import uid from '@/utils/uid'
import logger from '@/utils/logger'
import { uploadLessonAudio, deleteLessonAudio } from '../db/audio'
import { transcribeAudio, translateTranscript, transliterateTranscript } from '../db/ai'
import { createLesson } from '../db/lessons'

// Interlinear translations are English-only in admin v1 (matches the term
// popover's target). A per-member target language can replace this later.
const TARGET_LANG = 'English'

export type CreateLessonPhase = 'transcribing' | 'translating' | 'transliterating'

export type CreateLessonVars = {
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
    mutation: async ({ title, file, script, onPhase }: CreateLessonVars): Promise<Lesson> => {
      const ext = (file.name.split('.').pop() || 'mp3').toLowerCase()
      const path = `${useMemberStore().id}/${uid()}.${ext}`

      await uploadLessonAudio(path, file)

      try {
        const { text, segments, words, lang } = await transcribeAudio(file, script)
        const translated = await translateSegments(segments, onPhase)
        const read = await transliterateWords(words, lang, onPhase)
        return await createLesson({
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
    onSettled: () => {
      queryCache.invalidateQueries({ key: ['lessons'] })
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
  lang: string | undefined,
  onPhase?: (phase: CreateLessonPhase) => void
): Promise<TranscriptWord[] | undefined> {
  if (!words || words.length === 0 || !lang) return words

  onPhase?.('transliterating')
  try {
    const { readings } = await transliterateTranscript({ words: words.map((w) => w.word), lang })
    return words.map((word, i) => ({ ...word, reading: readings[i] || undefined }))
  } catch (error) {
    logger.error(`Lesson transliteration failed: ${(error as Error).message}`)
    return words
  }
}
