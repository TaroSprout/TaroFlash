import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type TranslationResult = {
  translation: string
  reading: string
  pos: string
  description: string
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
}

// The edge functions return a JSON body `{ code }` on failure (e.g.
// 'output_truncated', 'file_too_large'). supabase-js surfaces non-2xx as a
// FunctionsHttpError carrying the Response on `.context`; this re-throws a typed
// error so the FE can switch on the code rather than parse a raw message.
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

// Kick off async transcription: the edge function creates the lesson row in a
// `processing` state and returns it immediately (202) while a background worker
// fills the transcript. The FE polls the row for the result.
export function startLessonTranscription(args: StartLessonArgs): Promise<Lesson> {
  return invokeEdge<{ lesson: Lesson }>('transcribe-lesson', { action: 'start', ...args }).then(
    (data) => data.lesson
  )
}

// Re-run transcription for a lesson that previously failed. The audio is still in
// storage, so this just resets the row to `processing` and restarts the worker.
export function retryLessonTranscription(lesson_id: number): Promise<Lesson> {
  return invokeEdge<{ lesson: Lesson }>('transcribe-lesson', {
    action: 'retry',
    lesson_id
  }).then((data) => data.lesson)
}
