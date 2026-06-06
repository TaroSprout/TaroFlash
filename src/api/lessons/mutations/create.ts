import { useMutation, useQueryCache } from '@pinia/colada'
import { useMemberStore } from '@/stores/member'
import uid from '@/utils/uid'
import { uploadLessonAudio, deleteLessonAudio } from '../db/audio'
import { startLessonTranscription } from '../db/ai'

export type StartLessonVars = {
  // The collection the new lesson is uploaded into.
  collection_id: number
  title: string
  file: File
  // Which Chinese script to convert the transcript to (Whisper tends to emit
  // Traditional). 'original' leaves Whisper's output untouched.
  script?: TranscriptScript
}

/**
 * Upload the audio and kick off async transcription. Returns as soon as the
 * `processing` lesson row exists — a background worker fills the transcript and
 * the collection view polls the row for the result. The heavy work no longer
 * blocks the upload request, so a long lesson can't time the modal out.
 */
export function useStartLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: async ({ collection_id, title, file, script }: StartLessonVars): Promise<Lesson> => {
      const ext = (file.name.split('.').pop() || 'mp3').toLowerCase()
      const path = `${useMemberStore().id}/${uid()}.${ext}`

      await uploadLessonAudio(path, file)

      try {
        return await startLessonTranscription({
          collection_id,
          title,
          audio_path: path,
          script: script ?? 'original'
        })
      } catch (error) {
        // Start failed before the lesson row (and its media row) was created, so
        // the uploaded audio is an orphan the cleanup cron won't reap — remove it.
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
