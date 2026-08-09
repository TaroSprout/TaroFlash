import * as tus from 'tus-js-client'
import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

const BUCKET = 'audio-lessons'

// Lesson audio is private, so playing it needs a temporary address. An hour
// covers a listening session; the reader asks again if it runs out.
export const SIGNED_URL_TTL_SECONDS = 60 * 60

// Uploads go up in pieces — a single request tops out at 100 MB, and an
// audiobook is far bigger than that.
const TUS_CHUNK_BYTES = 6 * 1024 * 1024

export async function uploadLessonAudio(path: string, file: File | Blob): Promise<void> {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) throw new Error('Not authenticated')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3_000, 5_000, 10_000, 20_000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'true'
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: file.type
      },
      chunkSize: TUS_CHUNK_BYTES,
      onError(err) {
        logger.error(`Error uploading audio: ${err.message}`)
        reject(err)
      },
      onSuccess() {
        resolve()
      }
    })

    upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0])
      upload.start()
    })
  })
}

/** Deletes several audio files at once, for cleaning up after a failed upload. */
export async function deleteLessonAudioPaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) logger.error(`Error deleting audio: ${error.message}`)
}

export async function getLessonAudioSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    logger.error(error?.message ?? 'Failed to sign audio url')
    throw error ?? new Error('Failed to sign audio url')
  }

  return data.signedUrl
}

export async function deleteLessonAudio(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])

  if (error) {
    logger.error(`Error deleting audio: ${error.message}`)
    throw new Error(error.message)
  }
}
