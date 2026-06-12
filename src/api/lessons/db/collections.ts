import { supabase } from '@/supabase-client'
import { useMemberStore } from '@/stores/member'
import logger from '@/utils/logger'

export async function fetchMemberLessonCollections(): Promise<LessonCollectionWithCount[]> {
  const { data, error } = await supabase
    .from('lesson_collections_with_counts')
    .select('*')
    .eq('member_id', useMemberStore().id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as LessonCollectionWithCount[]
}

export async function fetchLessonCollection(id: number): Promise<LessonCollection> {
  const { data, error } = await supabase
    .from('lesson_collections')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as LessonCollection
}

export async function createLessonCollection(title: string): Promise<LessonCollection> {
  // member_id is stamped by the set_member_id trigger, so the client only sends
  // the title.
  const { data, error } = await supabase
    .from('lesson_collections')
    .insert({ title })
    .select()
    .single()

  if (error) {
    logger.error(error.message)
    throw error
  }

  return data as LessonCollection
}

export async function setCollectionProgress(
  collection_id: number,
  lesson_id: number,
  position_seconds = 0
): Promise<void> {
  // Bookmark the chapter the member is on plus the audio offset within it. The
  // owner-update RLS policy already scopes this to the caller's own collection,
  // so no RPC is needed.
  const { error } = await supabase
    .from('lesson_collections')
    .update({ last_lesson_id: lesson_id, last_position_seconds: position_seconds })
    .eq('id', collection_id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}

export async function deleteLessonCollection(id: number): Promise<void> {
  // FK is ON DELETE CASCADE, so removing the collection removes its lessons,
  // and each lesson-delete trigger soft-deletes its audio media row for the
  // cleanup cron — no client-side storage delete needed.
  const { error } = await supabase.from('lesson_collections').delete().eq('id', id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
