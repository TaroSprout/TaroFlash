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
 * Preprocess the audio (transcode a compact mono MP3 for transcription, slicing a
 * long file into overlapping chunks), upload the untouched original for playback
 * plus the compact transcription sources, and kick off async transcription.
 * Returns as soon as the `processing` lesson row exists — a background worker
 * transcribes chunk-by-chunk and the collection view polls the row. Slicing
 * client-side is what lets an arbitrary-length file be transcribed.
 *
 * Playback and transcription use DIFFERENT assets: `audio_path` is the original
 * file (true fidelity — the 16 kHz mono encode is unlistenable), while every
 * entry in the chunk manifest points at the compact encode Whisper wants.
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

      // Transcription sources: the overlapping slices for a long file, or the whole
      // compact MP3 as a single chunk for a short one. Never the original — it may
      // be stereo/hi-fi and blow Whisper's 25 MiB per-call cap.
      const sources = chunks.length ? chunks : [{ blob: full, offset: 0 }]

      const base = `${useMemberStore().id}/${uid()}`
      // Keep the original's extension so Storage gets the right content-type and
      // the player picks a matching decoder; fall back to mp3 if it's missing.
      const dot = file.name.lastIndexOf('.')
      const orig_ext = dot === -1 ? 'mp3' : file.name.slice(dot + 1).toLowerCase()
      const audio_path = `${base}.${orig_ext}`
      const uploaded: string[] = []

      try {
        // Original first — it's the playback asset, stored untouched.
        onProgress?.({ stage: 'uploading', ratio: 0 })
        await uploadLessonAudio(audio_path, file)
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
