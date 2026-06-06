import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export async function fetchLessonsByCollection(collection_id: number): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('collection_id', collection_id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as Lesson[]
}

export async function fetchLesson(id: number): Promise<Lesson> {
  const { data, error } = await supabase.from('lessons').select('*').eq('id', id).single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as Lesson
}

export async function deleteLesson(id: number): Promise<void> {
  // Plain row delete. The lesson-delete trigger soft-deletes the audio media row,
  // and the cleanup-media cron reaps the storage object — no client-side
  // storage delete needed (and none possible for the member-cascade path anyway).
  const { error } = await supabase.from('lessons').delete().eq('id', id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
