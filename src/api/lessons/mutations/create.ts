import { useMutation, useQueryCache } from '@pinia/colada'
import { useMemberStore } from '@/stores/member'
import uid from '@/utils/uid'
import { uploadLessonAudio, deleteLessonAudio } from '../db/audio'
import { transcribeAudio } from '../db/ai'
import { createLesson } from '../db/lessons'

export type CreateLessonVars = {
  title: string
  file: File
}

export function useCreateLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: async ({ title, file }: CreateLessonVars): Promise<Lesson> => {
      const ext = (file.name.split('.').pop() || 'mp3').toLowerCase()
      const path = `${useMemberStore().id}/${uid()}.${ext}`

      await uploadLessonAudio(path, file)

      try {
        const { text, segments, words, lang } = await transcribeAudio(file)
        return await createLesson({
          title,
          audio_path: path,
          transcript: { text, segments, words },
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
