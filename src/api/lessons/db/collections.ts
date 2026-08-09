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
  // Ownership is stamped by the database, never sent from here.
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

/** Bookmarks where the member got to — which chapter, and how far into it. */
export async function setCollectionProgress(
  collection_id: number,
  lesson_id: number,
  position_seconds = 0
): Promise<void> {
  const { error } = await supabase
    .from('lesson_collections')
    .update({ last_lesson_id: lesson_id, last_position_seconds: position_seconds })
    .eq('id', collection_id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}

/** Deletes a collection. Its chapters and their audio go with it, on their own. */
export async function deleteLessonCollection(id: number): Promise<void> {
  const { error } = await supabase.from('lesson_collections').delete().eq('id', id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
