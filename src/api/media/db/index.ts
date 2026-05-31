import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export async function uploadImage(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })

  if (error) {
    logger.error(`Error uploading file: ${error.message}`)
    throw new Error(error.message)
  }

  return getImageUrl(bucket, path)
}

export async function deleteImage(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    logger.error(`Error deleting file: ${error.message}`)
    throw new Error(error.message)
  }
}

export function getImageUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

/** Public URL for a card-face image, which always lives in the `cards` bucket. */
export function cardImageUrl(path: string): string {
  return getImageUrl('cards', path)
}

export async function insertMedia(params: Media): Promise<void> {
  if (!params.card_id && !params.deck_id) {
    throw new Error('insertMedia requires either card_id or deck_id')
  }

  const { error } = await supabase.from('media').insert(params)

  if (error) {
    logger.error(`Failed to insert media: ${error}`)
    throw error
  }
}

export async function deleteMedia(id: string): Promise<void> {
  const { error } = await supabase.from('media').update({ deleted_at: new Date() }).eq('id', id)

  if (error) {
    logger.error(`Failed to delete media: ${error}`)
    throw error
  }
}
