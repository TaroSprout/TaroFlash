import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type TranslationResult = {
  translation: string
  reading: string
  pos: string
  description: string
  difficulty: number
}

export type TranslateTermArgs = {
  term: string
  sentence: string
  target_lang: string
}

export type StartLessonArgs = {
  collection_id: number
  title: string
  audio_path: string
  script: TranscriptScript
  // Slices of a long upload, in order. Omitted for a short file, which goes whole.
  chunks?: LessonChunk[]
}

// Carries the server's own name for what went wrong, so the screen can react to
// it rather than pick a message apart.
export class EdgeFunctionError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = 'EdgeFunctionError'
  }
}

async function readErrorCode(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context
  if (!context || typeof context.json !== 'function') return 'unknown'

  try {
    const body = await context.json()
    return typeof body?.code === 'string' ? body.code : 'unknown'
  } catch {
    return 'unknown'
  }
}

async function invokeEdge<T>(name: string, body: FormData | object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })

  if (error) {
    const code = await readErrorCode(error)
    logger.error(`${name} failed: ${code}`)
    throw new EdgeFunctionError(code)
  }
  if (!data) {
    logger.error(`${name} returned no data`)
    throw new EdgeFunctionError('no_data')
  }

  return data
}

export function translateTerm(args: TranslateTermArgs): Promise<TranslationResult> {
  return invokeEdge<TranslationResult>('translate-term', args)
}

/**
 * Starts transcribing an upload. Comes back with the lesson right away, still
 * empty — the transcript arrives later, and the screen watches for it.
 */
export function startLessonTranscription(args: StartLessonArgs): Promise<Lesson> {
  return invokeEdge<{ lesson: Lesson }>('transcribe-lesson', { action: 'start', ...args }).then(
    (data) => data.lesson
  )
}

/** Transcribes a failed lesson again. The audio is still stored, so nothing is re-uploaded. */
export function retryLessonTranscription(lesson_id: number): Promise<Lesson> {
  return invokeEdge<{ lesson: Lesson }>('transcribe-lesson', {
    action: 'retry',
    lesson_id
  }).then((data) => data.lesson)
}
