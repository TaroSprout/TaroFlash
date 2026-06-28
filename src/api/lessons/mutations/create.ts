import { useMutation, useQueryCache } from '@pinia/colada'
import { useMemberStore } from '@/stores/member'
import uid from '@/utils/uid'
import type { ChunkProgress } from '@/composables/audio-reader/audio-chunker'
import { uploadLessonAudio, deleteLessonAudioPaths } from '../db/audio'
import { startLessonTranscription } from '../db/ai'

// Progress surfaced to the upload modal: the chunker's own stages plus the upload
// stage this mutation owns. `ratio` is 0–1 where a stage can report one.
export type LessonUploadStage = ChunkProgress['stage'] | 'uploading'
export type LessonUploadProgress = { stage: LessonUploadStage; ratio?: number }

export type StartLessonVars = {
  // The collection the new lesson is uploaded into.
  collection_id: number
  title: string
  file: File
  // Which Chinese script to convert the transcript to (Whisper tends to emit
  // Traditional). 'original' leaves Whisper's output untouched.
  script?: TranscriptScript
  // Surfaces transcode/slice/upload progress for the modal's progress bar.
  onProgress?: (progress: LessonUploadProgress) => void
}

/**
 * Preprocess the audio (transcode to a compact mono MP3, slicing a long file into
 * overlapping chunks), upload the full file plus any chunks, and kick off async
 * transcription. Returns as soon as the `processing` lesson row exists — a
 * background worker transcribes chunk-by-chunk and the collection view polls the
 * row. Slicing client-side is what lets an arbitrary-length file be transcribed.
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
      // Lazy-load the chunker so ffmpeg.wasm (a heavy bundle) only enters the app
      // on an actual upload, not on every page that touches the lessons API.
      const { chunkAudio } = await import('@/composables/audio-reader/audio-chunker')
      const { full, ext, chunks } = await chunkAudio(file, onProgress)

      const base = `${useMemberStore().id}/${uid()}`
      const audio_path = `${base}.${ext}`
      const chunkPaths = chunks.map((_, i) => `${base}.chunk${i}.${ext}`)
      const uploaded: string[] = []

      try {
        // Full file first — it's the playback asset and the single-chunk source.
        onProgress?.({ stage: 'uploading', ratio: 0 })
        await uploadLessonAudio(audio_path, full)
        uploaded.push(audio_path)

        for (let i = 0; i < chunks.length; i++) {
          await uploadLessonAudio(chunkPaths[i], chunks[i].blob)
          uploaded.push(chunkPaths[i])
          onProgress?.({ stage: 'uploading', ratio: (i + 1) / chunks.length })
        }

        // Empty manifest for a short file → the RPC transcribes audio_path whole.
        const manifest = chunks.map((chunk, i) => ({ path: chunkPaths[i], offset: chunk.offset }))

        return await startLessonTranscription({
          collection_id,
          title,
          audio_path,
          script: script ?? 'original',
          chunks: manifest
        })
      } catch (error) {
        // Failed before the lesson row (and its media row) exist, so every object
        // uploaded so far is an orphan the cleanup cron won't reap — remove them.
        await deleteLessonAudioPaths(uploaded).catch(() => {})
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
