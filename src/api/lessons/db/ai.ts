import { supabase } from '@/supabase-client'
import logger from '@/utils/logger'

export type TranscribeResult = {
  text: string
  segments: TranscriptSegment[]
  words?: TranscriptWord[]
  lang?: string
}

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

export function transcribeAudio(file: File): Promise<TranscribeResult> {
  const form = new FormData()
  form.append('file', file)
  return invokeEdge<TranscribeResult>('transcribe-audio', form)
}

export function translateTerm(args: TranslateTermArgs): Promise<TranslationResult> {
  return invokeEdge<TranslationResult>('translate-term', args)
}
