import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type CreateLessonParams = {
  collection_id: number
  title: string
  audio_path: string
  transcript: LessonTranscript
  lang?: string
}

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

export async function createLesson(params: CreateLessonParams): Promise<Lesson> {
  // RPC inserts the lesson + its audio media row atomically (see the create_lesson
  // migration). transcript is jsonb-serialized by supabase-js.
  const { data, error } = await supabase
    .rpc('create_lesson', {
      p_collection_id: params.collection_id,
      p_title: params.title,
      p_audio_path: params.audio_path,
      p_transcript: params.transcript,
      p_lang: params.lang ?? null
    })
    .single()

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
