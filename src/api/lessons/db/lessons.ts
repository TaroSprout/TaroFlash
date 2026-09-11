import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'
import { sentencesToTranscript } from '@/utils/lesson/transcript'

export async function fetchLessonsByCollection(collection_id: number): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('collection_id', collection_id)
    .order('position', { ascending: true })

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

  // A lesson created before relational storage has no sentence rows, so its
  // transcript assembles empty and the reader renders nothing rather than erroring.
  const sentences = await fetchLessonSentences(id)
  return { ...(data as Lesson), transcript: sentencesToTranscript(sentences) }
}

async function fetchLessonSentences(lesson_id: number): Promise<LessonSentenceRow[]> {
  const { data, error } = await supabase
    .from('lesson_sentences')
    .select('*')
    .eq('lesson_id', lesson_id)
    .order('ordinal', { ascending: true })

  if (error) {
    logger.error(error.message)
    throw error
  }

  return (data ?? []) as LessonSentenceRow[]
}

export async function deleteLesson(id: number): Promise<void> {
  // The audio file is cleaned up on its own schedule — nothing to delete here.
  const { error } = await supabase.from('lessons').delete().eq('id', id)

  if (error) {
    logger.error(error.message)
    throw error
  }
}
