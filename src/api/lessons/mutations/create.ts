import { useMutation, useQueryCache } from '@pinia/colada'
import { useMemberStore } from '@/stores/member'
import uid from '@/utils/uid'
import type { ChunkProgress } from '@/composables/audio-reader/audio-chunker'
import { uploadLessonAudio, deleteLessonAudioPaths } from '../db/audio'
import { startLessonTranscription } from '../db/ai'

export type LessonUploadStage = ChunkProgress['stage'] | 'uploading'
// `ratio` is 0–1, on the stages that can report one.
export type LessonUploadProgress = { stage: LessonUploadStage; ratio?: number }

export type StartLessonVars = {
  collection_id: number
  title: string
  file: File
  // Which Chinese script the transcript is converted to. 'original' converts nothing.
  script?: TranscriptScript
  onProgress?: (progress: LessonUploadProgress) => void
}

/**
 * Turns a recording into a chapter: prepares the audio, uploads it, and sets
 * transcription going. Returns once the chapter exists, still being transcribed.
 *
 * Two different versions of the audio go up — one to listen to, one to
 * transcribe. Neither works in the other's place.
 */
export function useStartLessonMutation() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: async ({
      collection_id,
      title,
      file,
      script,
      onProgress
    }: StartLessonVars): Promise<Lesson> => {
      // Loaded here so the audio toolkit, which is large, downloads only on an upload.
      const { chunkAudio } = await import('@/composables/audio-reader/audio-chunker')
      const { playback, full, ext, chunks } = await chunkAudio(file, onProgress)

      // Slices for a long recording, the whole compact copy for a short one — never
      // the original, which can be too large to transcribe in one go.
      const sources = chunks.length ? chunks : [{ blob: full, offset: 0 }]

      const base = `${useMemberStore().id}/${uid()}`
      const audio_path = `${base}.${ext}`
      const uploaded: string[] = []

      try {
        onProgress?.({ stage: 'uploading', ratio: 0 })
        await uploadLessonAudio(audio_path, playback)
        uploaded.push(audio_path)

        const manifest: LessonChunk[] = []
        for (let i = 0; i < sources.length; i++) {
          const path = `${base}.chunk${i}.${ext}`
          await uploadLessonAudio(path, sources[i].blob)
          uploaded.push(path)
          manifest.push({ path, offset: sources[i].offset })
          onProgress?.({ stage: 'uploading', ratio: (i + 1) / sources.length })
        }

        return await startLessonTranscription({
          collection_id,
          title,
          audio_path,
          script: script ?? 'original',
          chunks: manifest
        })
      } catch (error) {
        // Nothing yet records these files, so nothing will ever clean them up but this.
        await deleteLessonAudioPaths(uploaded).catch(() => {})
        throw error
      }
    },
    onSettled: (_data, _error, { collection_id }) => {
      // The collection's chapter list and its chapter count both moved.
      queryCache.invalidateQueries({ key: ['lessons', collection_id] })
      queryCache.invalidateQueries({ key: ['lesson-collections'] })
    }
  })
}
