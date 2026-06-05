import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

const BUCKET = 'audio-lessons'

// The bucket is private, so playback uses a short-lived signed URL rather than a
// public URL (contrast with member-images). One hour is generous for a single
// listening session; the reader re-mints if it expires.
const SIGNED_URL_TTL_SECONDS = 60 * 60

export async function uploadLessonAudio(path: string, file: File): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })

  if (error) {
    logger.error(`Error uploading audio: ${error.message}`)
    throw new Error(error.message)
  }
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
